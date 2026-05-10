import { useRef, useMemo, useCallback, useState } from "react"
import { useStore } from "../../store/useStore"
import { usePracticeStore } from "../../store/usePracticeStore"
import type { CircledPhrase } from "../../store/usePracticeStore"
import type { Connective } from "../../types/cognitive"

interface WordInfo {
  key: string
  text: string
  isSpace: boolean
  charStart: number
}

interface ConnectiveRegion {
  charStart: number
  charEnd: number
  connective: Connective
}

type GroupType =
  | { kind: "phrase"; phrase: CircledPhrase; items: WordInfo[] }
  | { kind: "connective"; region: ConnectiveRegion; items: WordInfo[] }
  | { kind: "plain"; items: WordInfo[] }

export default function PracticeTextLayer() {
  const { currentMap } = useStore()
  const { circledPhrases, addPhrase, removePhrase, addNode } =
    usePracticeStore()

  const anchorKeyRef = useRef<string | null>(null)
  const [rangeMode, setRangeMode] = useState(false)
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPressRef = useRef(false)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  // Defer phrase-pill single-click action so a follow-up dblclick can override
  const phraseClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { textSource } = currentMap

  const words = useMemo<WordInfo[]>(() => {
    let charPos = 0
    return textSource.fullText.split(/(\s+)/).flatMap((chunk, ci) => {
      const startPos = charPos
      charPos += chunk.length
      if (/^\s+$/.test(chunk))
        return [{ key: `ws-${ci}`, text: chunk, isSpace: true, charStart: startPos }]
      const tokens: WordInfo[] = []
      let localPos = startPos
      const parts =
        chunk.match(/[가-힣A-Za-z0-9]+|[^\s가-힣A-Za-z0-9]+/g) ?? [chunk]
      parts.forEach((part, pi) => {
        tokens.push({ key: `w-${ci}-${pi}`, text: part, isSpace: false, charStart: localPos })
        localPos += part.length
      })
      return tokens
    })
  }, [textSource.fullText])

  const connectiveRegions = useMemo<ConnectiveRegion[]>(() => {
    const regions: ConnectiveRegion[] = []
    for (const conn of textSource.connectives) {
      const searchText = conn.word.replace(/^~/, "")
      if (searchText.length <= 1) continue
      const idx = textSource.fullText.indexOf(searchText)
      if (idx >= 0) {
        regions.push({ charStart: idx, charEnd: idx + searchText.length, connective: conn })
      }
    }
    regions.sort((a, b) => a.charStart - b.charStart)
    return regions
  }, [textSource])

  const tokenConnectiveMap = useMemo(() => {
    const map = new Map<string, ConnectiveRegion>()
    for (const w of words) {
      if (w.isSpace) continue
      const tokenEnd = w.charStart + w.text.length
      for (const region of connectiveRegions) {
        if (w.charStart < region.charEnd && tokenEnd > region.charStart) {
          map.set(w.key, region)
          break
        }
      }
    }
    return map
  }, [words, connectiveRegions])

  const tokenToPhraseMap = useMemo(() => {
    const map = new Map<string, CircledPhrase>()
    for (const phrase of circledPhrases) {
      const firstIdx = words.findIndex((w) => w.key === phrase.wordKeys[0])
      const lastIdx = words.findIndex(
        (w) => w.key === phrase.wordKeys[phrase.wordKeys.length - 1]
      )
      if (firstIdx >= 0 && lastIdx >= 0) {
        for (let i = firstIdx; i <= lastIdx; i++) {
          map.set(words[i].key, phrase)
        }
      }
    }
    return map
  }, [circledPhrases, words])

  const renderGroups = useMemo<GroupType[]>(() => {
    const groups: GroupType[] = []
    let currentPhrase: CircledPhrase | null = null
    let currentConn: ConnectiveRegion | null = null
    let currentItems: WordInfo[] = []

    const flush = () => {
      if (currentItems.length === 0) return
      if (currentPhrase) groups.push({ kind: "phrase", phrase: currentPhrase, items: [...currentItems] })
      else if (currentConn) groups.push({ kind: "connective", region: currentConn, items: [...currentItems] })
      else groups.push({ kind: "plain", items: [...currentItems] })
    }

    for (const w of words) {
      const phrase = tokenToPhraseMap.get(w.key) ?? null
      const conn = (!phrase ? tokenConnectiveMap.get(w.key) : null) ?? null

      if (phrase === currentPhrase && conn === currentConn) {
        currentItems.push(w)
      } else {
        flush()
        currentPhrase = phrase
        currentConn = conn
        currentItems = [w]
      }
    }
    flush()
    return groups
  }, [words, tokenToPhraseMap, tokenConnectiveMap])

  const makePhrase = useCallback(
    (fromKey: string, toKey: string) => {
      const a = words.findIndex((w) => w.key === fromKey)
      const b = words.findIndex((w) => w.key === toKey)
      if (a < 0 || b < 0) return
      const lo = Math.min(a, b)
      const hi = Math.max(a, b)
      const range = words.slice(lo, hi + 1)
      const wk = range
        .filter((w) => !w.isSpace && !/^[^\w가-힣]+$/.test(w.text))
        .map((w) => w.key)
      const text = range.map((w) => w.text).join("").trim()
      if (wk.length > 0) addPhrase(wk, text)
    },
    [words, addPhrase]
  )

  const handlePointerDown = useCallback(
    (wordKey: string, e: React.PointerEvent) => {
      pointerStartRef.current = { x: e.clientX, y: e.clientY }
      didLongPressRef.current = false
      longPressTimerRef.current = setTimeout(() => {
        didLongPressRef.current = true
        setRangeMode(true)
        setRangeAnchor(wordKey)
        longPressTimerRef.current = null
        if (navigator.vibrate) navigator.vibrate(30)
      }, 500)
    },
    []
  )

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (longPressTimerRef.current && pointerStartRef.current) {
      const dx = e.clientX - pointerStartRef.current.x
      const dy = e.clientY - pointerStartRef.current.y
      if (dx * dx + dy * dy > 100) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }
  }, [])

  const handleWordClick = useCallback(
    (wordKey: string, wordText: string, e: React.MouseEvent) => {
      if (didLongPressRef.current) {
        didLongPressRef.current = false
        return
      }

      if (rangeMode && rangeAnchor) {
        if (wordKey === rangeAnchor) {
          addPhrase([wordKey], wordText)
        } else {
          makePhrase(rangeAnchor, wordKey)
        }
        setRangeAnchor(null)
        setRangeMode(false)
        return
      }

      if (e.shiftKey && anchorKeyRef.current) {
        makePhrase(anchorKeyRef.current, wordKey)
        anchorKeyRef.current = wordKey
        return
      }

      const existing = circledPhrases.find((p) =>
        p.wordKeys.includes(wordKey)
      )
      if (existing) {
        removePhrase(existing.id)
      } else {
        addPhrase([wordKey], wordText)
      }
      anchorKeyRef.current = wordKey
    },
    [rangeMode, rangeAnchor, circledPhrases, makePhrase, addPhrase, removePhrase]
  )

  const handlePhraseClick = useCallback(
    (phraseId: string) => {
      // Wait briefly to see if a dblclick is coming. If yes, dblclick clears this.
      if (phraseClickTimerRef.current) {
        clearTimeout(phraseClickTimerRef.current)
      }
      phraseClickTimerRef.current = setTimeout(() => {
        removePhrase(phraseId)
        phraseClickTimerRef.current = null
      }, 220)
    },
    [removePhrase]
  )

  const handlePhraseDoubleClick = useCallback(
    (phrase: CircledPhrase) => {
      if (phraseClickTimerRef.current) {
        clearTimeout(phraseClickTimerRef.current)
        phraseClickTimerRef.current = null
      }
      addNode(phrase.text)
    },
    [addNode]
  )

  const totalCircled = circledPhrases.reduce(
    (sum, p) => sum + p.wordKeys.length,
    0
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-brain-border">
        <p
          className="text-[10px] uppercase tracking-[0.18em] mb-2"
          style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
        >
          텍스트
        </p>
        <h2
          className="text-[22px] leading-tight tracking-[-0.01em]"
          style={{ color: "var(--color-brain-text)", fontFamily: "var(--font-serif)", fontWeight: 500 }}
        >
          {textSource.title}
        </h2>
        <p
          className="text-[12px] mt-2"
          style={{ color: "var(--color-brain-text-soft)" }}
        >
          탭 = 동그라미  ·  더블탭 = 캔버스 추가  ·  꾹 누르기 = 묶기
        </p>
      </div>

      <div
        className="flex-1 overflow-y-auto px-6 py-6"
        onPointerMove={handlePointerMove}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="text-[15px] leading-[2.2] select-none"
          style={{ color: "var(--color-brain-text)", fontFamily: "var(--font-serif)" }}
        >
          {renderGroups.map((group, gi) => {
            if (group.kind === "phrase") {
              return (
                <span
                  key={group.phrase.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", group.phrase.text)
                    e.dataTransfer.effectAllowed = "copy"
                  }}
                  onClick={() => handlePhraseClick(group.phrase.id)}
                  onDoubleClick={() => handlePhraseDoubleClick(group.phrase)}
                  className="inline-flex items-center"
                  style={{
                    border: "1.5px solid var(--color-brain-accent)",
                    borderRadius: "9999px",
                    backgroundColor: "rgba(184, 92, 63, 0.08)",
                    padding: "2px 10px",
                    color: "var(--color-brain-accent)",
                    cursor: "grab",
                    transition: "all 0.15s ease",
                    fontWeight: 500,
                    userSelect: "none",
                  }}
                  title="더블클릭 = 캔버스 추가, 클릭 = 동그라미 해제"
                >
                  {group.items.map((w) => w.text).join("")}
                </span>
              )
            }

            if (group.kind === "connective") {
              return (
                <span key={`conn-${gi}`}>
                  {group.items.map((w) => {
                    if (w.isSpace) return <span key={w.key}>{w.text}</span>
                    const isPunct = /^[^\w가-힣]+$/.test(w.text)
                    if (isPunct) return <span key={w.key}>{w.text}</span>

                    const isAnchor = rangeAnchor === w.key

                    return (
                      <span
                        key={w.key}
                        onPointerDown={(e) => handlePointerDown(w.key, e)}
                        onPointerUp={handlePointerUp}
                        onClick={(e) => handleWordClick(w.key, w.text, e)}
                        className="cursor-pointer px-0.5 inline-block"
                        style={{
                          transition: "all 0.15s ease",
                          border: isAnchor ? "1.5px dashed var(--color-brain-highlight)" : "1.5px solid transparent",
                          borderRadius: isAnchor ? "9999px" : "2px",
                          backgroundColor: isAnchor ? "rgba(198, 138, 61, 0.10)" : "transparent",
                          padding: isAnchor ? "1px 7px" : "1px 2px",
                          color: isAnchor ? "var(--color-brain-highlight)" : "var(--color-brain-text)",
                        }}
                      >
                        {w.text}
                      </span>
                    )
                  })}
                </span>
              )
            }

            return (
              <span key={`g-${gi}`}>
                {group.items.map((w) => {
                  if (w.isSpace) return <span key={w.key}>{w.text}</span>
                  const isPunct = /^[^\w가-힣]+$/.test(w.text)
                  if (isPunct) return <span key={w.key}>{w.text}</span>

                  const isAnchor = rangeAnchor === w.key

                  return (
                    <span
                      key={w.key}
                      onPointerDown={(e) => handlePointerDown(w.key, e)}
                      onPointerUp={handlePointerUp}
                      onClick={(e) => handleWordClick(w.key, w.text, e)}
                      className="cursor-pointer px-0.5 inline-block"
                      style={{
                        transition: "all 0.15s ease",
                        border: isAnchor
                          ? "1.5px dashed var(--color-brain-highlight)"
                          : "1.5px solid transparent",
                        borderRadius: isAnchor ? "9999px" : "2px",
                        backgroundColor: isAnchor
                          ? "rgba(198, 138, 61, 0.10)"
                          : "transparent",
                        padding: isAnchor ? "1px 7px" : "1px 2px",
                        color: isAnchor ? "var(--color-brain-highlight)" : "var(--color-brain-text)",
                      }}
                    >
                      {w.text}
                    </span>
                  )
                })}
              </span>
            )
          })}
        </div>
      </div>

      <div className="px-6 py-3 border-t border-brain-border flex items-center justify-between">
        {rangeMode ? (
          <span
            className="text-[12px]"
            style={{ color: "var(--color-brain-highlight)", fontWeight: 500 }}
          >
            {rangeAnchor ? "끝 단어를 탭하세요" : "시작 단어를 탭하세요"}
          </span>
        ) : (
          <div
            className="flex items-center gap-2 text-[11.5px]"
            style={{ color: "var(--color-brain-text-muted)" }}
          >
            <span
              className="inline-block w-3 h-3 rounded-full border-[1.5px]"
              style={{
                borderColor: "var(--color-brain-accent)",
                backgroundColor: "rgba(184, 92, 63, 0.10)",
              }}
            />
            <span>구 {circledPhrases.length}  ·  단어 {totalCircled}</span>
          </div>
        )}
        <button
          onClick={() => {
            setRangeMode(!rangeMode)
            setRangeAnchor(null)
          }}
          className="px-3.5 py-1.5 rounded-full text-[12px] cursor-pointer transition-all"
          style={{
            backgroundColor: rangeMode ? "var(--color-brain-highlight)" : "transparent",
            color: rangeMode ? "#FFFFFF" : "var(--color-brain-highlight)",
            border: rangeMode ? "1px solid var(--color-brain-highlight)" : "1px solid rgba(198,138,61,0.4)",
            fontWeight: 500,
          }}
        >
          {rangeMode ? "묶기 완료" : "묶기"}
        </button>
      </div>
    </div>
  )
}
