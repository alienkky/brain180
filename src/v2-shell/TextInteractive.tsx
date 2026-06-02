// Owner: 연다리 [통합설계].
//
// v1 PracticeTextLayer 의 어휘 수준 상호작용을 v2 셸로 복원한 컴포넌트.
//
// 가져온 동작:
//   - 단어 클릭 = 동그라미 (Phrase) 토글
//   - 동그라미 클릭 = 동그라미 해제
//   - 동그라미 더블클릭 = 캔버스로 cite 노드 즉시 생성 (onSendToCanvas)
//   - 동그라미 드래그 = 텍스트 데이터로 캔버스에 drop 가능 (HTML5 DnD)
//   - Shift+클릭 = 직전 앵커부터 현재 단어까지 범위로 확장
//   - 롱프레스(500ms) = 범위 모드 anchor 설정, 다음 클릭으로 범위 확정
//   - 접속사/논리 연결어 자동 강조 (CONNECTIVE_POOL 사전)
//   - focusCite 가 들어오면 해당 글자 구간 하이라이트 (캔버스 → 텍스트 방향)
//
// 의도적 절제:
//   - v1 의 connectives 는 텍스트별로 작성자가 직접 박았지만, v2 의
//     text_excerpts 스키마에는 아직 connectives 컬럼이 없다. 한국어 공통
//     접속사 사전을 임시로 박아 사용; ALI-62 차곡담의 후속 매듭에서
//     스키마에 connectives 가 들어오면 prop 으로 받도록 전환한다.
//   - Phrase 상태는 *세션 메모리* 만으로 유지 (v1 동일). 저장이 필요한
//     본문 근거는 캔버스 노드의 cite 필드로 보내야 한다.

import { useCallback, useMemo, useRef, useState } from "react";
import type { CanvasCite } from "./api";

interface WordInfo {
  key: string;
  text: string;
  isSpace: boolean;
  charStart: number;
}

interface ConnectiveRegion {
  charStart: number;
  charEnd: number;
  word: string;
}

export interface CircledPhrase {
  id: string;
  wordKeys: string[];
  text: string;
  charStart: number;
  charEnd: number;
}

type RenderGroup =
  | { kind: "phrase"; phrase: CircledPhrase; items: WordInfo[] }
  | { kind: "connective"; region: ConnectiveRegion; items: WordInfo[] }
  | { kind: "plain"; items: WordInfo[] };

// 한국어 공통 논리 접속사 사전. 텍스트별 connectives 가 스키마에 들어오기
// 전까지의 휴리스틱.
const CONNECTIVE_POOL: string[] = [
  "그러나",
  "하지만",
  "그런데",
  "그렇지만",
  "그럼에도",
  "따라서",
  "그러므로",
  "그래서",
  "그러니",
  "그리하여",
  "즉",
  "다시 말해",
  "곧",
  "만약",
  "만일",
  "그리고",
  "또한",
  "또",
  "왜냐하면",
  "예를 들어",
  "예컨대",
  "특히",
  "마침내",
  "결국",
  "마찬가지로",
  "반면",
  "한편",
  "비록",
];

interface Props {
  body: string;
  phrases: CircledPhrase[];
  onAddPhrase: (phrase: CircledPhrase) => void;
  onRemovePhrase: (id: string) => void;
  onSendToCanvas: (cite: CanvasCite) => void;
  focusCite: CanvasCite | null;
  onClearFocus?: () => void;
  connectives?: string[];
}

let phraseCounter = 0;

export function TextInteractive({
  body,
  phrases,
  onAddPhrase,
  onRemovePhrase,
  onSendToCanvas,
  focusCite,
  onClearFocus,
  connectives,
}: Props) {
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);
  const shiftAnchorRef = useRef<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const phraseClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const words = useMemo<WordInfo[]>(() => {
    let charPos = 0;
    return body.split(/(\s+)/).flatMap((chunk, ci) => {
      const startPos = charPos;
      charPos += chunk.length;
      if (/^\s+$/.test(chunk)) {
        return [
          {
            key: `ws-${ci}`,
            text: chunk,
            isSpace: true,
            charStart: startPos,
          },
        ];
      }
      const tokens: WordInfo[] = [];
      let localPos = startPos;
      const parts =
        chunk.match(/[가-힣A-Za-z0-9]+|[^\s가-힣A-Za-z0-9]+/g) ?? [chunk];
      parts.forEach((part, pi) => {
        tokens.push({
          key: `w-${ci}-${pi}`,
          text: part,
          isSpace: false,
          charStart: localPos,
        });
        localPos += part.length;
      });
      return tokens;
    });
  }, [body]);

  const wordIndex = useMemo(() => {
    const m = new Map<string, number>();
    words.forEach((w, i) => m.set(w.key, i));
    return m;
  }, [words]);

  const pool = useMemo(
    () => (connectives && connectives.length > 0 ? connectives : CONNECTIVE_POOL),
    [connectives],
  );

  const connectiveRegions = useMemo<ConnectiveRegion[]>(() => {
    const regions: ConnectiveRegion[] = [];
    for (const word of pool) {
      let from = 0;
      while (from < body.length) {
        const idx = body.indexOf(word, from);
        if (idx < 0) break;
        regions.push({ charStart: idx, charEnd: idx + word.length, word });
        from = idx + word.length;
      }
    }
    regions.sort((a, b) => a.charStart - b.charStart);
    // 겹침 제거 — 앞 매치가 뒷 매치를 덮으면 뒷 매치 폐기.
    const dedup: ConnectiveRegion[] = [];
    for (const r of regions) {
      const prev = dedup[dedup.length - 1];
      if (prev && r.charStart < prev.charEnd) continue;
      dedup.push(r);
    }
    return dedup;
  }, [body, pool]);

  const tokenConnectiveMap = useMemo(() => {
    const map = new Map<string, ConnectiveRegion>();
    for (const w of words) {
      if (w.isSpace) continue;
      const tokenEnd = w.charStart + w.text.length;
      for (const region of connectiveRegions) {
        if (w.charStart < region.charEnd && tokenEnd > region.charStart) {
          map.set(w.key, region);
          break;
        }
      }
    }
    return map;
  }, [words, connectiveRegions]);

  const tokenToPhraseMap = useMemo(() => {
    const map = new Map<string, CircledPhrase>();
    for (const phrase of phrases) {
      const firstIdx = phrase.wordKeys
        .map((k) => wordIndex.get(k) ?? -1)
        .filter((i) => i >= 0)
        .sort((a, b) => a - b)[0];
      const lastIdx = phrase.wordKeys
        .map((k) => wordIndex.get(k) ?? -1)
        .filter((i) => i >= 0)
        .sort((a, b) => b - a)[0];
      if (firstIdx === undefined || lastIdx === undefined) continue;
      for (let i = firstIdx; i <= lastIdx; i++) {
        const w = words[i];
        if (w) map.set(w.key, phrase);
      }
    }
    return map;
  }, [phrases, words, wordIndex]);

  const renderGroups = useMemo<RenderGroup[]>(() => {
    const groups: RenderGroup[] = [];
    let currentPhrase: CircledPhrase | null = null;
    let currentConn: ConnectiveRegion | null = null;
    let currentItems: WordInfo[] = [];

    const flush = () => {
      if (currentItems.length === 0) return;
      if (currentPhrase) {
        groups.push({
          kind: "phrase",
          phrase: currentPhrase,
          items: [...currentItems],
        });
      } else if (currentConn) {
        groups.push({
          kind: "connective",
          region: currentConn,
          items: [...currentItems],
        });
      } else {
        groups.push({ kind: "plain", items: [...currentItems] });
      }
    };

    for (const w of words) {
      const phrase = tokenToPhraseMap.get(w.key) ?? null;
      const conn = !phrase ? tokenConnectiveMap.get(w.key) ?? null : null;
      if (phrase === currentPhrase && conn === currentConn) {
        currentItems.push(w);
      } else {
        flush();
        currentPhrase = phrase;
        currentConn = conn;
        currentItems = [w];
      }
    }
    flush();
    return groups;
  }, [words, tokenToPhraseMap, tokenConnectiveMap]);

  const makePhrase = useCallback(
    (fromKey: string, toKey: string) => {
      const a = wordIndex.get(fromKey);
      const b = wordIndex.get(toKey);
      if (a === undefined || b === undefined) return;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const range = words.slice(lo, hi + 1);
      const wk = range
        .filter((w) => !w.isSpace && !/^[^\w가-힣]+$/.test(w.text))
        .map((w) => w.key);
      const text = range.map((w) => w.text).join("").trim();
      if (wk.length === 0 || !text) return;
      const charStart = range[0]?.charStart ?? 0;
      const last = range[range.length - 1];
      const charEnd = last ? last.charStart + last.text.length : charStart;
      onAddPhrase({
        id: `phrase-${++phraseCounter}`,
        wordKeys: wk,
        text,
        charStart,
        charEnd,
      });
    },
    [wordIndex, words, onAddPhrase],
  );

  const handlePointerDown = useCallback((wordKey: string) => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setRangeAnchor(wordKey);
      longPressTimer.current = null;
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleWordClick = useCallback(
    (w: WordInfo, e: React.MouseEvent) => {
      if (didLongPress.current) {
        didLongPress.current = false;
        return;
      }
      if (rangeAnchor) {
        if (w.key === rangeAnchor) {
          onAddPhrase({
            id: `phrase-${++phraseCounter}`,
            wordKeys: [w.key],
            text: w.text,
            charStart: w.charStart,
            charEnd: w.charStart + w.text.length,
          });
        } else {
          makePhrase(rangeAnchor, w.key);
        }
        setRangeAnchor(null);
        return;
      }
      if (e.shiftKey && shiftAnchorRef.current) {
        makePhrase(shiftAnchorRef.current, w.key);
        shiftAnchorRef.current = w.key;
        return;
      }
      onAddPhrase({
        id: `phrase-${++phraseCounter}`,
        wordKeys: [w.key],
        text: w.text,
        charStart: w.charStart,
        charEnd: w.charStart + w.text.length,
      });
      shiftAnchorRef.current = w.key;
    },
    [rangeAnchor, makePhrase, onAddPhrase],
  );

  const handlePhraseClick = useCallback(
    (phrase: CircledPhrase) => {
      if (phraseClickTimer.current) {
        clearTimeout(phraseClickTimer.current);
      }
      phraseClickTimer.current = setTimeout(() => {
        onRemovePhrase(phrase.id);
        phraseClickTimer.current = null;
      }, 220);
    },
    [onRemovePhrase],
  );

  const handlePhraseDoubleClick = useCallback(
    (phrase: CircledPhrase) => {
      if (phraseClickTimer.current) {
        clearTimeout(phraseClickTimer.current);
        phraseClickTimer.current = null;
      }
      onSendToCanvas({
        start: phrase.charStart,
        end: phrase.charEnd,
        quote: phrase.text,
      });
    },
    [onSendToCanvas],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-brain-border bg-brain-surface px-6 py-3 text-[11px] text-brain-text-muted">
        <span>
          탭 = 동그라미 · 더블탭 = 캔버스 노드 · Shift+클릭 = 범위 확장 · 꾹 누르기 = 묶기 모드
          {rangeAnchor && (
            <span className="ml-2 rounded bg-brain-accent-soft px-2 py-0.5 text-brain-accent">
              묶기 모드: 마지막 단어를 클릭하세요
            </span>
          )}
        </span>
        {focusCite && onClearFocus && (
          <button
            onClick={onClearFocus}
            className="rounded border border-brain-accent/40 px-2 py-0.5 text-brain-accent hover:bg-brain-accent-soft/50"
            title="캔버스 노드에서 비춰진 본문 강조 해제"
          >
            강조 해제
          </button>
        )}
      </div>
      <div
        className="flex-1 overflow-y-auto px-6 py-6"
        onPointerMove={cancelLongPress}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="select-none text-[15px] leading-[2.4]"
          style={{
            color: "var(--color-brain-text)",
            fontFamily: "var(--font-serif)",
            whiteSpace: "pre-wrap",
          }}
        >
          {renderGroups.map((group, gi) => {
            if (group.kind === "phrase") {
              const fc = focusCite;
              const focused =
                !!fc &&
                fc.start === group.phrase.charStart &&
                fc.end === group.phrase.charEnd;
              return (
                <span
                  key={group.phrase.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", group.phrase.text);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => handlePhraseClick(group.phrase)}
                  onDoubleClick={() =>
                    handlePhraseDoubleClick(group.phrase)
                  }
                  className="inline"
                  style={{
                    borderBottom: `2px solid var(--color-brain-accent)`,
                    backgroundColor: focused
                      ? "rgba(184,92,63,0.30)"
                      : "rgba(184,92,63,0.08)",
                    boxShadow: focused
                      ? "0 3px 0 rgba(184,92,63,0.30), 0 5px 10px rgba(184,92,63,0.20)"
                      : undefined,
                    padding: "0 2px 2px",
                    margin: "0 1px",
                    verticalAlign: "baseline",
                    color: "var(--color-brain-accent)",
                    cursor: "grab",
                    transition: "background-color 0.2s ease, box-shadow 0.2s ease",
                    fontWeight: focused ? 600 : 500,
                    userSelect: "none",
                  }}
                  title="더블클릭 = 캔버스 노드 · 클릭 = 접선 표시 해제 · 드래그 = 캔버스로 드롭"
                >
                  {group.items.map((w) => w.text).join("")}
                </span>
              );
            }
            if (group.kind === "connective") {
              return (
                <span
                  key={`conn-${gi}`}
                  style={{
                    backgroundColor: "rgba(198,138,61,0.18)",
                    borderRadius: "4px",
                    padding: "0 2px",
                  }}
                  title={`접속사: ${group.region.word}`}
                >
                  {group.items.map((w) => {
                    if (w.isSpace) {
                      return <span key={w.key}>{w.text}</span>;
                    }
                    const isAnchor = rangeAnchor === w.key;
                    return (
                      <span
                        key={w.key}
                        onPointerDown={() => handlePointerDown(w.key)}
                        onPointerUp={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        onClick={(e) => handleWordClick(w, e)}
                        style={{
                          cursor: "pointer",
                          outline: isAnchor
                            ? "2px solid var(--color-brain-accent)"
                            : undefined,
                          borderRadius: isAnchor ? "3px" : undefined,
                        }}
                      >
                        {w.text}
                      </span>
                    );
                  })}
                </span>
              );
            }
            // plain
            return (
              <span key={`p-${gi}`}>
                {group.items.map((w) => {
                  if (w.isSpace) return <span key={w.key}>{w.text}</span>;
                  const isPunct = /^[^\w가-힣]+$/.test(w.text);
                  if (isPunct) return <span key={w.key}>{w.text}</span>;
                  const isAnchor = rangeAnchor === w.key;
                  // focusCite 가 이 토큰을 덮으면 하이라이트
                  const tokenEnd = w.charStart + w.text.length;
                  const inFocus =
                    !!focusCite &&
                    w.charStart < focusCite.end &&
                    tokenEnd > focusCite.start;
                  return (
                    <span
                      key={w.key}
                      onPointerDown={() => handlePointerDown(w.key)}
                      onPointerUp={cancelLongPress}
                      onPointerCancel={cancelLongPress}
                      onClick={(e) => handleWordClick(w, e)}
                      data-cite-highlight={inFocus ? "true" : undefined}
                      style={{
                        cursor: "pointer",
                        outline: isAnchor
                          ? "2px solid var(--color-brain-accent)"
                          : undefined,
                        backgroundColor: inFocus
                          ? "rgba(198,138,61,0.55)"
                          : undefined,
                        boxShadow: inFocus
                          ? "0 0 0 1px rgba(198,138,61,0.7)"
                          : undefined,
                        borderRadius: isAnchor || inFocus ? "3px" : undefined,
                        padding: "0 1px",
                        fontWeight: inFocus ? 600 : undefined,
                        transition: "all 0.2s ease",
                      }}
                    >
                      {w.text}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
