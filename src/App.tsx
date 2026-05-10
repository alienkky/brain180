import { useState } from "react"
import TextLayer from "./components/TextLayer/TextLayer"
import VisualLayer from "./components/VisualLayer/VisualLayer"
import PatternPanel from "./components/PatternPanel/PatternPanel"
import PracticeTextLayer from "./components/Practice/PracticeTextLayer"
import PracticeCanvas from "./components/Practice/PracticeCanvas"
import PracticeToolbar from "./components/Practice/PracticeToolbar"
import EvaluationPanel from "./components/Practice/EvaluationPanel"
import { useStore } from "./store/useStore"
import { usePracticeStore } from "./store/usePracticeStore"
import type { Perspective } from "./types/cognitive"

type AppMode = "practice" | "analysis"

const PERSPECTIVES: { key: Perspective; label: string }[] = [
  { key: "cognitive", label: "인지" },
  { key: "value", label: "가치" },
  { key: "temporal", label: "시간" },
]

export default function App() {
  const { currentMap, perspective, setPerspective } = useStore()
  const showEvaluation = usePracticeStore((s) => s.showEvaluation)
  const [mode, setMode] = useState<AppMode>("practice")

  return (
    <div className="flex flex-col h-screen">
      <header
        className="flex items-center justify-between px-8 py-4 border-b border-brain-border"
        style={{ backgroundColor: "var(--color-brain-surface)" }}
      >
        <div className="flex items-center gap-8">
          {/* Wordmark */}
          <h1
            className="text-[22px] tracking-[-0.02em] leading-none"
            style={{ fontFamily: "var(--font-sans)", fontWeight: 700 }}
          >
            <span style={{ color: "var(--color-brain-accent)" }}>
              Brain
            </span>
            <span style={{ color: "var(--color-brain-text)", fontWeight: 500 }}>
              180
            </span>
          </h1>

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
                    backgroundColor: active ? "var(--color-brain-surface)" : "transparent",
                    color: active ? "var(--color-brain-text)" : "var(--color-brain-text-soft)",
                    fontWeight: active ? 500 : 400,
                    boxShadow: active ? "0 1px 3px rgba(42,36,29,0.08)" : "none",
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
                style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
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
                      borderBottomColor: active ? "var(--color-brain-accent)" : "transparent",
                      color: active ? "var(--color-brain-text)" : "var(--color-brain-text-soft)",
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
        </div>

        <div
          className="text-[13px]"
          style={{ color: "var(--color-brain-text-soft)", fontFamily: "var(--font-serif)" }}
        >
          <span style={{ fontStyle: "italic" }}>{currentMap.textSource.author}</span>
          <span className="mx-2" style={{ color: "var(--color-brain-border-strong)" }}>·</span>
          <span style={{ color: "var(--color-brain-text-muted)" }}>
            {currentMap.textSource.title}
          </span>
        </div>
      </header>

      {mode === "practice" ? (
        <main className="flex flex-1 min-h-0">
          <section
            className="w-[32%] border-r border-brain-border"
            style={{ backgroundColor: "var(--color-brain-surface)" }}
          >
            <PracticeTextLayer />
          </section>
          <section
            className="flex-1 flex flex-col"
            style={{ backgroundColor: "var(--color-brain-bg)" }}
          >
            <div className="flex-1 min-h-0">
              <PracticeCanvas />
            </div>
            {showEvaluation && <EvaluationPanel />}
          </section>
          <section
            className="w-[22%] border-l border-brain-border"
            style={{ backgroundColor: "var(--color-brain-surface)" }}
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
    </div>
  )
}
