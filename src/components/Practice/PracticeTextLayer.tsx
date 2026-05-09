import { useRef, useMemo, useCallback, useState } from "react"
import { useStore } from "../../store/useStore"
import { usePracticeStore } from "../../store/usePracticeStore"
import type { CircledPhrase } from "../../store/usePracticeStore"

interface WordInfo {
  key: string
  text: string
  isSpace: boolean
}

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

  const { textSource } = currentMap

  const words = useMemo<WordInfo[]>(() => {
    return textSource.fullText.split(/(\s+)/).flatMap((chunk, ci) => {
      if (/^\s+$/.test(chunk))
        return [{ key: `ws-${ci}`, text: chunk, isSpace: true }]
      const tokens: WordInfo[] = []
      const parts =
        chunk.match(/[가-힣A-Za-z0-9]+|[^\s가-힣A-Za-z0-9]+/g) ?? [chunk]
      parts.forEach((part, pi) => {
        tokens.push({ key: `w-${ci}-${pi}`, text: part, isSpace: false })
      })
      return tokens
    })
  }, [textSource.fullText])

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

  const renderGroups = useMemo(() => {
    const groups: { phrase: CircledPhrase | null; items: WordInfo[] }[] = []
    let currentPhrase: CircledPhrase | null = null
    let currentItems: WordInfo[] = []

    for (const w of words) {
      const phrase = tokenToPhraseMap.get(w.key) ?? null
      if (phrase === currentPhrase) {
        currentItems.push(w)
      } else {
        if (currentItems.length > 0) {
          groups.push({ phrase: currentPhrase, items: [...currentItems] })
        }
        currentPhrase = phrase
        currentItems = [w]
      }
    }
    if (currentItems.length > 0) {
      groups.push({ phrase: currentPhrase, items: currentItems })
    }
    return groups
  }, [words, tokenToPhraseMap])

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
      if (rangeMode) return
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
    [rangeMode]
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

      // Range mode: first tap = anchor, second tap = create phrase immediately
      if (rangeMode) {
        if (!rangeAnchor) {
          setRangeAnchor(wordKey)
        } else {
          if (wordKey !== rangeAnchor) makePhrase(rangeAnchor, wordKey)
          setRangeAnchor(null)
        }
        return
      }

      // Shift+click quick range (desktop)
      if (e.shiftKey && anchorKeyRef.current) {
        makePhrase(anchorKeyRef.current, wordKey)
        anchorKeyRef.current = wordKey
        return
      }

      // Normal: toggle circle
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

  const handleSendToCanvas = useCallback(
    (phrase: CircledPhrase, e: React.MouseEvent | React.PointerEvent) => {
      e.stopPropagation()
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
      <div className="px-4 py-3 border-b border-brain-border">
        <h2 className="text-lg font-semibold" style={{ color: "#e0e0f0" }}>
          {textSource.title}
        </h2>
        <p className="text-xs mt-1" style={{ color: "rgba(224,224,240,0.5)" }}>
          탭 = 동그라미 | 꾹 누르기/묶기 = 구 선택 | Shift = 묶기
        </p>
      </div>

      {rangeMode && (
        <div
          className="px-4 py-2"
          style={{
            backgroundColor: "rgba(255,217,61,0.1)",
            borderBottom: "1px solid rgba(255,217,61,0.2)",
          }}
        >
          <span className="text-xs font-medium" style={{ color: "#ffd93d" }}>
            {rangeAnchor ? "끝 단어를 탭하세요" : "시작 단어를 탭하세요"}
          </span>
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto p-4"
        onPointerMove={handlePointerMove}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: "pan-y" }}
      >
        <div className="text-base leading-10 select-none">
          {renderGroups.map((group, gi) => {
            if (group.phrase) {
              return (
                <span
                  key={group.phrase.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", group.phrase!.text)
                    e.dataTransfer.effectAllowed = "copy"
                  }}
                  onClick={() => removePhrase(group.phrase!.id)}
                  className="inline-flex items-center gap-1"
                  style={{
                    border: "2px solid #ff6b6b",
                    borderRadius: "9999px",
                    backgroundColor: "rgba(255,107,107,0.15)",
                    padding: "1px 4px 1px 8px",
                    color: "#ffd93d",
                    cursor: "grab",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{group.items.map((w) => w.text).join("")}</span>
                  <button
                    onClick={(e) => handleSendToCanvas(group.phrase!, e)}
                    className="rounded-full flex items-center justify-center cursor-pointer"
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: "rgba(255,107,107,0.4)",
                      color: "#fff",
                      border: "none",
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                    title="캔버스에 추가"
                  >
                    ↗
                  </button>
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
                          ? "2px dashed #ffd93d"
                          : "2px solid transparent",
                        borderRadius: isAnchor ? "9999px" : "2px",
                        backgroundColor: isAnchor
                          ? "rgba(255,217,61,0.2)"
                          : "transparent",
                        padding: isAnchor ? "1px 6px" : "1px 2px",
                        color: isAnchor ? "#ffd93d" : "#e0e0f0",
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

      <div className="px-4 py-2 border-t border-brain-border flex items-center justify-between">
        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: "rgba(224,224,240,0.5)" }}
        >
          <span
            className="inline-block w-3.5 h-3.5 rounded-full border-2"
            style={{
              borderColor: "#ff6b6b",
              backgroundColor: "rgba(255,107,107,0.15)",
            }}
          />
          <span>구: {circledPhrases.length} | 단어: {totalCircled}</span>
        </div>
        <button
          onClick={() => {
            setRangeMode(!rangeMode)
            setRangeAnchor(null)
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
          style={{
            backgroundColor: rangeMode ? "#ffd93d" : "rgba(255,217,61,0.1)",
            color: rangeMode ? "#0f0f1a" : "#ffd93d",
            border: rangeMode ? "none" : "1px solid rgba(255,217,61,0.3)",
          }}
        >
          {rangeMode ? "묶기 완료" : "묶기"}
        </button>
      </div>
    </div>
  )
}
