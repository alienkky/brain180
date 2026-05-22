import { useState, useRef, useEffect } from "react"
import TextLayer from "./components/TextLayer/TextLayer"
import VisualLayer from "./components/VisualLayer/VisualLayer"
import PatternPanel from "./components/PatternPanel/PatternPanel"
import PracticeTextLayer from "./components/Practice/PracticeTextLayer"
import PracticeCanvas from "./components/Practice/PracticeCanvas"
import PracticeToolbar from "./components/Practice/PracticeToolbar"
import EvaluationPanel from "./components/Practice/EvaluationPanel"
import Library from "./components/Library/Library"
import ChatPanel from "./components/Chat/ChatPanel"
import FeedbackPanel from "./components/Feedback/FeedbackPanel"
import { useStore } from "./store/useStore"
import { usePracticeStore } from "./store/usePracticeStore"
import { TEXT_LIBRARY, FIELD_COLORS } from "./data/texts"
import type { Perspective } from "./types/cognitive"

type AppMode = "practice" | "analysis"

const PERSPECTIVES: { key: Perspective; label: string }[] = [
  { key: "cognitive", label: "인지" },
  { key: "value", label: "가치" },
  { key: "temporal", label: "시간" },
]

function ResizeHandle({
  onMouseDown,
}: {
  onMouseDown: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="shrink-0 cursor-col-resize"
      style={{
        width: 5,
        backgroundColor: "var(--color-brain-border)",
        transition: "background-color 0.15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = "var(--color-brain-accent)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = "var(--color-brain-border)")
      }
      title="드래그하여 패널 너비 조절"
    />
  )
}

export default function App() {
  const {
    currentMap,
    currentMapId,
    showLibrary,
    perspective,
    setPerspective,
    setCurrentMap,
    setShowLibrary,
  } = useStore()
  const showEvaluation = usePracticeStore((s) => s.showEvaluation)
  const [mode, setMode] = useState<AppMode>("practice")
  const [textMenuOpen, setTextMenuOpen] = useState(false)
  const textMenuRef = useRef<HTMLDivElement>(null)
  const [leftWidth, setLeftWidth] = useState(440)
  const [rightWidth, setRightWidth] = useState(300)

  const startPanelResize = (e: React.MouseEvent, which: "left" | "right") => {
    e.preventDefault()
    const startX = e.clientX
    const startLeft = leftWidth
    const startRight = rightWidth
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      if (which === "left") {
        setLeftWidth(Math.max(260, Math.min(720, startLeft + dx)))
      } else {
        setRightWidth(Math.max(220, Math.min(560, startRight - dx)))
      }
    }
    const onUp = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  useEffect(() => {
    if (!textMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (!textMenuRef.current?.contains(e.target as Node)) {
        setTextMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [textMenuOpen])

  const fieldColor = FIELD_COLORS[currentMap.textSource.field]

  return (
    <div className="flex flex-col h-screen">
      <header
        className="flex items-center justify-between px-8 py-4 border-b border-brain-border"
        style={{ backgroundColor: "var(--color-brain-surface)" }}
      >
        <div className="flex items-center gap-6">
          {/* Wordmark */}
          <h1
            className="text-[22px] tracking-[-0.02em] leading-none"
            style={{ fontFamily: "var(--font-sans)", fontWeight: 700 }}
          >
            <span style={{ color: "var(--color-brain-accent)" }}>Brain</span>
            <span style={{ color: "var(--color-brain-text)", fontWeight: 500 }}>
              180
            </span>
          </h1>

          {/* Library button */}
          <button
            onClick={() => setShowLibrary(true)}
            className="px-3 py-1.5 rounded-full text-[13px] cursor-pointer transition-all border"
            style={{
              backgroundColor: showLibrary
                ? "var(--color-brain-surface-soft)"
                : "transparent",
              color: showLibrary
                ? "var(--color-brain-text)"
                : "var(--color-brain-text-muted)",
              borderColor: showLibrary
                ? "var(--color-brain-border-strong)"
                : "var(--color-brain-border)",
              fontWeight: showLibrary ? 500 : 400,
              fontFamily: "var(--font-serif)",
            }}
            title="텍스트 라이브러리로 이동"
          >
            라이브러리
          </button>

          {!showLibrary && (
            <>
              {/* Mode toggle — segmented */}
              <div
                className="flex p-0.5 rounded-full border"
                style={{
                  backgroundColor: "var(--color-brain-surface-soft)",
                  borderColor: "var(--color-brain-border)",
                }}
              >
                {(["practice", "analysis"] as AppMode[]).map((m) => {
                  const active = mode === m
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className="px-4 py-1.5 rounded-full text-[13px] cursor-pointer transition-all"
                      style={{
                        backgroundColor: active
                          ? "var(--color-brain-surface)"
                          : "transparent",
                        color: active
                          ? "var(--color-brain-text)"
                          : "var(--color-brain-text-soft)",
                        fontWeight: active ? 500 : 400,
                        boxShadow: active
                          ? "0 1px 3px rgba(42,36,29,0.08)"
                          : "none",
                      }}
                    >
                      {m === "practice" ? "연습" : "분석"}
                    </button>
                  )
                })}
              </div>

              {/* Perspective toggle (analysis only) */}
              {mode === "analysis" && (
                <div className="flex items-center gap-1">
                  <span
                    className="text-[11px] uppercase tracking-[0.18em] mr-2"
                    style={{
                      color: "var(--color-brain-text-soft)",
                      fontWeight: 500,
                    }}
                  >
                    관점
                  </span>
                  {PERSPECTIVES.map(({ key, label }) => {
                    const active = perspective === key
                    return (
                      <button
                        key={key}
                        onClick={() => setPerspective(key)}
                        className="px-3 py-1 text-[13px] cursor-pointer transition-all border-b-2"
                        style={{
                          borderBottomColor: active
                            ? "var(--color-brain-accent)"
                            : "transparent",
                          color: active
                            ? "var(--color-brain-text)"
                            : "var(--color-brain-text-soft)",
                          fontWeight: active ? 500 : 400,
                          fontFamily: "var(--font-serif)",
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Text selector dropdown */}
        {!showLibrary && (
          <div ref={textMenuRef} className="relative">
            <button
              onClick={() => setTextMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] cursor-pointer transition-all border"
              style={{
                backgroundColor: textMenuOpen
                  ? "var(--color-brain-surface-soft)"
                  : "transparent",
                borderColor: textMenuOpen
                  ? "var(--color-brain-border-strong)"
                  : "var(--color-brain-border)",
                fontFamily: "var(--font-serif)",
              }}
              title="다른 텍스트로 전환"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: fieldColor }}
              />
              <span
                style={{
                  color: "var(--color-brain-text-muted)",
                  fontStyle: "italic",
                }}
              >
                {currentMap.textSource.author}
              </span>
              <span style={{ color: "var(--color-brain-border-strong)" }}>·</span>
              <span style={{ color: "var(--color-brain-text)" }}>
                {currentMap.textSource.title}
              </span>
              <span
                style={{
                  color: "var(--color-brain-text-soft)",
                  fontSize: 9,
                  marginLeft: 2,
                }}
              >
                ▼
              </span>
            </button>

            {textMenuOpen && (
              <div
                className="absolute right-0 mt-2 rounded-xl border shadow-soft-3 z-50 min-w-[320px] max-h-[60vh] overflow-y-auto"
                style={{
                  backgroundColor: "var(--color-brain-surface)",
                  borderColor: "var(--color-brain-border)",
                }}
              >
                {TEXT_LIBRARY.map((meta) => {
                  const isCurrent = meta.id === currentMapId
                  const color = FIELD_COLORS[meta.field]
                  return (
                    <button
                      key={meta.id}
                      onClick={() => {
                        setCurrentMap(meta.id)
                        setTextMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-3 cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isCurrent
                          ? "var(--color-brain-surface-soft)"
                          : "transparent",
                        borderLeft: `3px solid ${
                          isCurrent ? color : "transparent"
                        }`,
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent)
                          e.currentTarget.style.backgroundColor =
                            "var(--color-brain-surface-soft)"
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent)
                          e.currentTarget.style.backgroundColor = "transparent"
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span
                          className="text-[12px]"
                          style={{
                            color: "var(--color-brain-text-soft)",
                            fontFamily: "var(--font-serif)",
                            fontStyle: "italic",
                          }}
                        >
                          {meta.author}
                        </span>
                      </div>
                      <div
                        className="text-[14px]"
                        style={{
                          color: "var(--color-brain-text)",
                          fontFamily: "var(--font-display)",
                          fontWeight: isCurrent ? 500 : 400,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {meta.title}
                      </div>
                    </button>
                  )
                })}
                <div
                  className="border-t px-3 py-2"
                  style={{ borderColor: "var(--color-brain-border)" }}
                >
                  <button
                    onClick={() => {
                      setShowLibrary(true)
                      setTextMenuOpen(false)
                    }}
                    className="w-full text-[12px] cursor-pointer text-center py-1.5 rounded-md transition-colors"
                    style={{
                      color: "var(--color-brain-accent)",
                      fontFamily: "var(--font-serif)",
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "var(--color-brain-surface-soft)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    전체 라이브러리 보기 →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {showLibrary ? (
        <Library />
      ) : mode === "practice" ? (
        <main className="flex flex-1 min-h-0">
          <section
            className="shrink-0"
            style={{
              width: leftWidth,
              backgroundColor: "var(--color-brain-surface)",
            }}
          >
            <PracticeTextLayer />
          </section>
          <ResizeHandle onMouseDown={(e) => startPanelResize(e, "left")} />
          <section
            className="flex-1 flex flex-col min-w-0"
            style={{ backgroundColor: "var(--color-brain-bg)" }}
          >
            <div className="flex-1 min-h-0">
              <PracticeCanvas />
            </div>
            {showEvaluation && <EvaluationPanel />}
          </section>
          <ResizeHandle onMouseDown={(e) => startPanelResize(e, "right")} />
          <section
            className="shrink-0"
            style={{
              width: rightWidth,
              backgroundColor: "var(--color-brain-surface)",
            }}
          >
            <PracticeToolbar />
          </section>
        </main>
      ) : (
        <main className="flex flex-1 min-h-0">
          <section
            className="w-[32%] border-r border-brain-border"
            style={{ backgroundColor: "var(--color-brain-surface)" }}
          >
            <TextLayer />
          </section>
          <section
            className="flex-1"
            style={{ backgroundColor: "var(--color-brain-bg)" }}
          >
            <VisualLayer />
          </section>
          <section
            className="w-[26%] border-l border-brain-border"
            style={{ backgroundColor: "var(--color-brain-surface)" }}
          >
            <PatternPanel />
          </section>
        </main>
      )}

      {!showLibrary && mode === "practice" && (
        <>
          <FeedbackPanel />
          <ChatPanel />
        </>
      )}
    </div>
  )
}
