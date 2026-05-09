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

const PERSPECTIVES: { key: Perspective; label: string; icon: string }[] = [
  { key: "cognitive", label: "인지 구조", icon: "🧠" },
  { key: "value", label: "가치 구조", icon: "💎" },
  { key: "temporal", label: "시간축", icon: "⏳" },
]

export default function App() {
  const { currentMap, perspective, setPerspective } = useStore()
  const showEvaluation = usePracticeStore((s) => s.showEvaluation)
  const [mode, setMode] = useState<AppMode>("practice")

  return (
    <div className="flex flex-col h-screen">
      <header
        className="flex items-center justify-between px-6 py-3 border-b border-brain-border"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight">
            <span style={{ color: "#ff6b6b" }}>Brain</span>
            <span style={{ color: "#e0e0f0" }}>180</span>
          </h1>

          {/* Mode toggle */}
          <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ backgroundColor: "#0f0f1a" }}>
            <button
              onClick={() => setMode("practice")}
              className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all"
              style={{
                backgroundColor: mode === "practice" ? "#ff6b6b" : "transparent",
                color: mode === "practice" ? "#0f0f1a" : "rgba(224,224,240,0.4)",
                fontWeight: mode === "practice" ? "bold" : "normal",
              }}
            >
              ✏️ 연습
            </button>
            <button
              onClick={() => setMode("analysis")}
              className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all"
              style={{
                backgroundColor: mode === "analysis" ? "#2a2a4a" : "transparent",
                color: mode === "analysis" ? "#e0e0f0" : "rgba(224,224,240,0.4)",
              }}
            >
              📊 분석
            </button>
          </div>

          {/* Perspective toggle (analysis mode only) */}
          {mode === "analysis" && (
            <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ backgroundColor: "#0f0f1a" }}>
              {PERSPECTIVES.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setPerspective(key)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all duration-200"
                  style={{
                    backgroundColor: perspective === key ? "#2a2a4a" : "transparent",
                    color: perspective === key ? "#e0e0f0" : "rgba(224,224,240,0.4)",
                    boxShadow: perspective === key ? "0 0 8px rgba(255,107,107,0.2)" : "none",
                  }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-sm" style={{ color: "rgba(224,224,240,0.5)" }}>
          {currentMap.textSource.author} —{" "}
          <span style={{ color: "rgba(224,224,240,0.7)" }}>
            {currentMap.textSource.title}
          </span>
        </div>
      </header>

      {mode === "practice" ? (
        <main className="flex flex-1 min-h-0">
          <section
            className="w-[32%] border-r border-brain-border"
            style={{ backgroundColor: "rgba(26,26,46,0.5)" }}
          >
            <PracticeTextLayer />
          </section>
          <section className="flex-1 flex flex-col" style={{ backgroundColor: "#0f0f1a" }}>
            <div className="flex-1 min-h-0">
              <PracticeCanvas />
            </div>
            {showEvaluation && <EvaluationPanel />}
          </section>
          <section
            className="w-[22%] border-l border-brain-border"
            style={{ backgroundColor: "rgba(26,26,46,0.5)" }}
          >
            <PracticeToolbar />
          </section>
        </main>
      ) : (
        <main className="flex flex-1 min-h-0">
          <section
            className="w-[32%] border-r border-brain-border"
            style={{ backgroundColor: "rgba(26,26,46,0.5)" }}
          >
            <TextLayer />
          </section>
          <section className="flex-1" style={{ backgroundColor: "#0f0f1a" }}>
            <VisualLayer />
          </section>
          <section
            className="w-[26%] border-l border-brain-border"
            style={{ backgroundColor: "rgba(26,26,46,0.5)" }}
          >
            <PatternPanel />
          </section>
        </main>
      )}
    </div>
  )
}
