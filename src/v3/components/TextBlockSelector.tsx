// v3 1부 블록 추출용 텍스트 인터랙션.
//
// v2 TextInteractive 에서 포팅한 동작 (iPad 개선판 포함):
//   - 단어 탭 = 블록(동그라미) 토글
//   - 동그라미 탭 = 해제
//   - Shift+클릭 = 직전 앵커부터 현재 단어까지 범위 블록
//   - 롱프레스(500ms) = 묶기 모드 anchor, 다음 탭으로 범위 확정
//   - 토큰 분할: 한글/영문/숫자 vs 구두점 분리 — "단어," 통째 선택 방지
//   - 접속사/논리 연결어 자동 강조 (CONNECTIVE_POOL)
//
// iPad/Apple Pencil 수정사항 (v2 fc858ab, fbb8d40 포팅):
//   - pointerup 기반 탭 처리 — Pencil 의 trailing click 누락 대응
//   - pointerTapHandledKey 로 synthetic click 중복 추가 방지
//   - 롱프레스 10px 흔들림 허용 — 펜 미세 떨림에도 묶기 모드 진입
//   - touchAction: pan-y + contextmenu 차단
//
// charStart 기반 식별 — 같은 단어가 본문에 여러 번 나와도 개별 선택.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BlockWord } from "../types";

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

type RenderGroup =
  | { kind: "block"; block: BlockWord; items: WordInfo[] }
  | { kind: "connective"; region: ConnectiveRegion; items: WordInfo[] }
  | { kind: "plain"; items: WordInfo[] };

// 한국어 공통 논리 접속사 사전 (v2 와 동일)
const CONNECTIVE_POOL: string[] = [
  "그러나", "하지만", "그런데", "그렇지만", "그럼에도",
  "따라서", "그러므로", "그래서", "그러니", "그리하여",
  "즉", "다시 말해", "곧", "만약", "만일",
  "그리고", "또한", "또", "왜냐하면", "예를 들어",
  "예컨대", "특히", "마침내", "결국", "마찬가지로",
  "반면", "한편", "비록",
];

interface Props {
  body: string;
  blocks: BlockWord[];
  onAddBlock: (block: BlockWord) => void;
  onRemoveBlock: (id: string) => void;
  /** 우측 칩 클릭 시 본문에서 강조·스크롤할 블록 id */
  highlightedBlockId?: string | null;
}

let blockCounter = 0;

export function TextBlockSelector({ body, blocks, onAddBlock, onRemoveBlock, highlightedBlockId }: Props) {
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);
  // 강조 대상 블록 span — 칩 클릭 시 본문 위치로 스크롤
  const highlightRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (highlightedBlockId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedBlockId]);
  const shiftAnchorRef = useRef<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  // 포인터 최초 접촉 위치 — 롱프레스 10px 흔들림 허용용
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  // v1/v2 방식 토큰 분할: 공백 분리 후 한글/영문/숫자 run vs 구두점 분리
  const words = useMemo<WordInfo[]>(() => {
    let charPos = 0;
    return body.split(/(\s+)/).flatMap((chunk, ci) => {
      const startPos = charPos;
      charPos += chunk.length;
      if (/^\s+$/.test(chunk)) {
        return [{ key: `ws-${ci}`, text: chunk, isSpace: true, charStart: startPos }];
      }
      const tokens: WordInfo[] = [];
      let localPos = startPos;
      const parts = chunk.match(/[가-힣A-Za-z0-9]+|[^\s가-힣A-Za-z0-9]+/g) ?? [chunk];
      parts.forEach((part, pi) => {
        tokens.push({ key: `w-${ci}-${pi}`, text: part, isSpace: false, charStart: localPos });
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

  const connectiveRegions = useMemo<ConnectiveRegion[]>(() => {
    const regions: ConnectiveRegion[] = [];
    for (const word of CONNECTIVE_POOL) {
      let from = 0;
      while (from < body.length) {
        const idx = body.indexOf(word, from);
        if (idx < 0) break;
        regions.push({ charStart: idx, charEnd: idx + word.length, word });
        from = idx + word.length;
      }
    }
    regions.sort((a, b) => a.charStart - b.charStart);
    const dedup: ConnectiveRegion[] = [];
    for (const r of regions) {
      const prev = dedup[dedup.length - 1];
      if (prev && r.charStart < prev.charEnd) continue;
      dedup.push(r);
    }
    return dedup;
  }, [body]);

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

  // 블록 ↔ 토큰 매핑 (v1 PracticeTextLayer 방식).
  // wordKeys 의 첫/끝 토큰 인덱스 사이를 공백 포함 전부 매핑 → 범위(묶기)
  // 블록이 본문에서 끊김 없이 하나의 알약으로 렌더됨.
  // wordKeys 가 없는 구형 블록은 charStart/charEnd 범위로 폴백.
  const tokenToBlockMap = useMemo(() => {
    const map = new Map<string, BlockWord>();
    for (const block of blocks) {
      const keys = block.wordKeys;
      if (keys && keys.length > 0) {
        const firstIdx = wordIndex.get(keys[0]);
        const lastIdx = wordIndex.get(keys[keys.length - 1]);
        if (firstIdx !== undefined && lastIdx !== undefined) {
          const lo = Math.min(firstIdx, lastIdx);
          const hi = Math.max(firstIdx, lastIdx);
          for (let i = lo; i <= hi; i++) map.set(words[i].key, block);
          continue;
        }
      }
      // 폴백: charStart/charEnd 위치 기반
      if (block.charStart === undefined || block.charEnd === undefined) continue;
      for (const w of words) {
        const tokenEnd = w.charStart + w.text.length;
        const inside = w.isSpace
          ? w.charStart >= block.charStart && tokenEnd <= block.charEnd
          : w.charStart < block.charEnd && tokenEnd > block.charStart;
        if (inside) map.set(w.key, block);
      }
    }
    return map;
  }, [blocks, words, wordIndex]);

  // 선택된 블록과 같은 텍스트 — 본문 내 동일 단어 연한 표시용 (v1/v2 동작)
  const blockTexts = useMemo(() => {
    const s = new Set<string>();
    for (const b of blocks) s.add(b.text);
    return s;
  }, [blocks]);

  const renderGroups = useMemo<RenderGroup[]>(() => {
    const groups: RenderGroup[] = [];
    let currentBlock: BlockWord | null = null;
    let currentConn: ConnectiveRegion | null = null;
    let currentItems: WordInfo[] = [];

    const flush = () => {
      if (currentItems.length === 0) return;
      if (currentBlock) {
        groups.push({ kind: "block", block: currentBlock, items: [...currentItems] });
      } else if (currentConn) {
        groups.push({ kind: "connective", region: currentConn, items: [...currentItems] });
      } else {
        groups.push({ kind: "plain", items: [...currentItems] });
      }
    };

    for (const w of words) {
      const block = tokenToBlockMap.get(w.key) ?? null;
      const conn = !block ? tokenConnectiveMap.get(w.key) ?? null : null;
      if (block === currentBlock && conn === currentConn) {
        currentItems.push(w);
      } else {
        flush();
        currentBlock = block;
        currentConn = conn;
        currentItems = [w];
      }
    }
    flush();
    return groups;
  }, [words, tokenToBlockMap, tokenConnectiveMap]);

  const addBlockFromRange = useCallback(
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
      onAddBlock({
        id: `blk-${++blockCounter}-${charStart}`,
        text,
        type: "other",
        selected: true,
        charStart,
        charEnd,
        wordKeys: wk,
      });
    },
    [wordIndex, words, onAddBlock],
  );

  const addBlockFromWord = useCallback(
    (w: WordInfo) => {
      onAddBlock({
        id: `blk-${++blockCounter}-${w.charStart}`,
        text: w.text,
        type: "other",
        selected: true,
        charStart: w.charStart,
        charEnd: w.charStart + w.text.length,
        wordKeys: [w.key],
      });
    },
    [onAddBlock],
  );

  const handlePointerDown = useCallback((wordKey: string, e: React.PointerEvent) => {
    didLongPress.current = false;
    pointerStart.current = { x: e.clientX, y: e.clientY };
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
    pointerStart.current = null;
  }, []);

  // 컨테이너 pointermove: 10px 이상 이동 시에만 롱프레스 취소 (펜 떨림 허용)
  const handleContainerPointerMove = useCallback((e: React.PointerEvent) => {
    if (!longPressTimer.current || !pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (dx * dx + dy * dy > 100) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      pointerStart.current = null;
    }
  }, []);

  // Apple Pencil: PointerEvent 는 확실하지만 trailing click 은 누락될 수 있음.
  // pointerup 에서 탭 처리하고, 뒤따르는 synthetic click 은 키 매칭으로 무시.
  const pointerTapHandledKey = useRef<string | null>(null);

  const executeWordTap = useCallback(
    (w: WordInfo, shiftKey: boolean) => {
      if (rangeAnchor) {
        if (w.key === rangeAnchor) {
          addBlockFromWord(w);
        } else {
          addBlockFromRange(rangeAnchor, w.key);
        }
        setRangeAnchor(null);
        return;
      }
      if (shiftKey && shiftAnchorRef.current) {
        addBlockFromRange(shiftAnchorRef.current, w.key);
        shiftAnchorRef.current = w.key;
        return;
      }
      addBlockFromWord(w);
      shiftAnchorRef.current = w.key;
    },
    [rangeAnchor, addBlockFromRange, addBlockFromWord],
  );

  const handleWordPointerUp = useCallback(
    (w: WordInfo, e: React.PointerEvent) => {
      cancelLongPress();
      if (didLongPress.current) {
        didLongPress.current = false;
        return;
      }
      pointerTapHandledKey.current = w.key;
      window.setTimeout(() => {
        if (pointerTapHandledKey.current === w.key) {
          pointerTapHandledKey.current = null;
        }
      }, 300);
      executeWordTap(w, e.shiftKey);
    },
    [cancelLongPress, executeWordTap],
  );

  const handleWordClick = useCallback(
    (w: WordInfo, e: React.MouseEvent) => {
      if (pointerTapHandledKey.current === w.key) {
        pointerTapHandledKey.current = null;
        return;
      }
      if (didLongPress.current) {
        didLongPress.current = false;
        return;
      }
      executeWordTap(w, e.shiftKey);
    },
    [executeWordTap],
  );

  return (
    <div className="flex h-full flex-col">
      {/* 고정 높이 한 줄 — 묶기 모드 배지가 힌트를 대체. 높이가 변하면 본문이
          밀려 롱프레스 중 탭 좌표가 어긋남(폴드 등 좁은 화면). */}
      <div className="h-8 shrink-0 flex items-center overflow-hidden whitespace-nowrap border-b border-brain-border bg-brain-surface px-4 text-[11px] text-brain-text-muted">
        {rangeAnchor ? (
          <span className="rounded bg-brain-accent-soft px-2 py-0.5 text-brain-accent font-medium">
            묶기 모드: 마지막 단어를 탭하세요
          </span>
        ) : (
          <span className="truncate">
            탭 = 블록 선택 · 블록 탭 = 해제 · Shift+클릭 = 범위 · 꾹 누르기 = 묶기 모드
          </span>
        )}
      </div>
      <div
        className="flex-1 overflow-y-auto px-5 py-4"
        onPointerMove={handleContainerPointerMove}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="select-none text-[15px] leading-[2.4] text-brain-text"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {renderGroups.map((group, gi) => {
            if (group.kind === "block") {
              const isHighlighted = group.block.id === highlightedBlockId;
              return (
                <span
                  key={`${group.block.id}-${gi}`}
                  ref={isHighlighted ? highlightRef : undefined}
                  onClick={() => onRemoveBlock(group.block.id)}
                  className="inline-flex items-center cursor-pointer"
                  style={{
                    border: "1.5px solid var(--color-brain-accent)",
                    borderRadius: "9999px",
                    backgroundColor: isHighlighted
                      ? "rgba(184,92,63,0.22)"
                      : "rgba(184,92,63,0.08)",
                    padding: "1px 10px",
                    margin: "0 2px",
                    verticalAlign: "middle",
                    color: "var(--color-brain-accent)",
                    transition: "all 0.2s ease",
                    fontWeight: 500,
                    userSelect: "none",
                    lineHeight: 1.6,
                    boxShadow: isHighlighted
                      ? "0 0 0 3px var(--color-brain-highlight, rgba(198,138,61,0.5))"
                      : "none",
                  }}
                  title="탭 = 블록 해제"
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
                    if (w.isSpace) return <span key={w.key}>{w.text}</span>;
                    const isAnchor = rangeAnchor === w.key;
                    return (
                      <span
                        key={w.key}
                        onPointerDown={(e) => handlePointerDown(w.key, e)}
                        onPointerUp={(e) => handleWordPointerUp(w, e)}
                        onPointerCancel={cancelLongPress}
                        onClick={(e) => handleWordClick(w, e)}
                        className="inline-block"
                        style={{
                          cursor: "pointer",
                          border: isAnchor
                            ? "1.5px dashed var(--color-brain-highlight)"
                            : "1.5px solid transparent",
                          borderRadius: "6px",
                          backgroundColor: isAnchor ? "rgba(198,138,61,0.10)" : "transparent",
                          color: isAnchor ? "var(--color-brain-highlight)" : undefined,
                          padding: "1px 2px",
                          userSelect: "none",
                          transition: "color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease",
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
                  // 선택된 블록과 같은 단어 — 본문 내 다른 등장 위치 연한 표시
                  const isSameAsBlock = !isAnchor && blockTexts.has(w.text);
                  // 주의: padding/border 두께를 상태별로 바꾸면 본문이 reflow 되어
                  // 롱프레스 도중 탭 좌표가 어긋남(iPad). 레이아웃 불변 스타일만 사용.
                  return (
                    <span
                      key={w.key}
                      onPointerDown={(e) => handlePointerDown(w.key, e)}
                      onPointerUp={(e) => handleWordPointerUp(w, e)}
                      onPointerCancel={cancelLongPress}
                      onClick={(e) => handleWordClick(w, e)}
                      className="inline-block"
                      style={{
                        cursor: "pointer",
                        border: isAnchor
                          ? "1.5px dashed var(--color-brain-highlight)"
                          : isSameAsBlock
                          ? "1.5px dashed rgba(184,92,63,0.45)"
                          : "1.5px solid transparent",
                        backgroundColor: isAnchor
                          ? "rgba(198,138,61,0.10)"
                          : isSameAsBlock
                          ? "rgba(184,92,63,0.06)"
                          : "transparent",
                        borderRadius: "6px",
                        padding: "1px 2px",
                        color: isAnchor
                          ? "var(--color-brain-highlight)"
                          : isSameAsBlock
                          ? "var(--color-brain-accent)"
                          : undefined,
                        userSelect: "none",
                        transition: "color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease",
                      }}
                      title={isSameAsBlock ? "선택된 블록과 같은 단어" : undefined}
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
