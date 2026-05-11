import { useStore } from "../../store/useStore"
import {
  TEXT_LIBRARY,
  FIELD_LABELS,
  FIELD_COLORS,
  type TextMeta,
} from "../../data/texts"
import type { Field } from "../../types/cognitive"

const FIELD_ORDER: Field[] = [
  "literature",
  "philosophy",
  "science",
  "art",
  "economics",
  "eastern",
]

const DIFFICULTY_LABELS: Record<1 | 2 | 3, string> = {
  1: "쉬움",
  2: "보통",
  3: "어려움",
}

function difficultyMarks(level: 1 | 2 | 3) {
  return [1, 2, 3].map((i) => (i <= level ? "●" : "○")).join(" ")
}

export default function Library() {
  const { currentMapId, setCurrentMap } = useStore()

  const grouped = new Map<Field, TextMeta[]>()
  for (const meta of TEXT_LIBRARY) {
    const arr = grouped.get(meta.field) ?? []
    arr.push(meta)
    grouped.set(meta.field, arr)
  }
  const orderedFields = FIELD_ORDER.filter((f) => grouped.has(f))

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ backgroundColor: "var(--color-brain-bg)" }}
    >
      <div className="max-w-5xl mx-auto px-10 py-12">
        {/* Hero */}
        <div className="mb-12">
          <p
            className="text-[11px] uppercase tracking-[0.22em] mb-3"
            style={{
              color: "var(--color-brain-text-soft)",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
            }}
          >
            텍스트 라이브러리
          </p>
          <h1
            className="text-4xl mb-4"
            style={{
              color: "var(--color-brain-text)",
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            천재의 뇌로 읽는다
          </h1>
          <p
            className="text-[15px] leading-relaxed max-w-2xl"
            style={{
              color: "var(--color-brain-text-muted)",
              fontFamily: "var(--font-serif)",
            }}
          >
            텍스트의 내용이 아니라 저자의 사고 구조를 추출하는 4차원 독해 훈련.
            연습 모드에서 직접 노드를 만들고, 평가에서 시스템 정답과 비교한 뒤,
            분석 모드에서 가치·시간축 관점으로 깊이를 더해갑니다.
          </p>
        </div>

        {/* Field-grouped collections */}
        {orderedFields.map((field) => {
          const items = grouped.get(field)!
          const color = FIELD_COLORS[field]
          return (
            <section key={field} className="mb-10">
              <div className="flex items-baseline gap-3 mb-4">
                <span
                  className="w-1 h-5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <h2
                  className="text-[18px]"
                  style={{
                    color: "var(--color-brain-text)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {FIELD_LABELS[field]}
                </h2>
                <span
                  className="text-[11px] uppercase tracking-[0.18em]"
                  style={{
                    color: "var(--color-brain-text-soft)",
                    fontWeight: 500,
                  }}
                >
                  {items.length}편
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {items.map((meta) => {
                  const isCurrent = meta.id === currentMapId
                  return (
                    <button
                      key={meta.id}
                      onClick={() => setCurrentMap(meta.id)}
                      className="text-left rounded-xl p-6 border cursor-pointer transition-all shadow-soft-1 hover:shadow-soft-2"
                      style={{
                        backgroundColor: "var(--color-brain-surface)",
                        borderColor: isCurrent
                          ? color
                          : "var(--color-brain-border)",
                        boxShadow: isCurrent
                          ? `0 0 0 1px ${color}, 0 2px 8px rgba(42,36,29,0.06)`
                          : undefined,
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span
                          className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded"
                          style={{
                            backgroundColor: "var(--color-brain-surface-soft)",
                            color: color,
                            fontWeight: 600,
                            fontFamily: "var(--font-sans)",
                          }}
                          title={`난이도: ${DIFFICULTY_LABELS[meta.difficulty]}`}
                        >
                          <span className="mr-1.5" style={{ letterSpacing: 0 }}>
                            {difficultyMarks(meta.difficulty)}
                          </span>
                          {DIFFICULTY_LABELS[meta.difficulty]}
                        </span>
                        {isCurrent && (
                          <span
                            className="text-[10px] uppercase tracking-[0.18em]"
                            style={{ color: color, fontWeight: 600 }}
                          >
                            현재
                          </span>
                        )}
                      </div>

                      <h3
                        className="text-[20px] mb-1.5"
                        style={{
                          color: "var(--color-brain-text)",
                          fontFamily: "var(--font-display)",
                          fontWeight: 500,
                          letterSpacing: "-0.015em",
                          lineHeight: 1.25,
                        }}
                      >
                        {meta.title}
                      </h3>
                      <p
                        className="text-[13px] mb-3"
                        style={{
                          color: color,
                          fontFamily: "var(--font-serif)",
                          fontStyle: "italic",
                        }}
                      >
                        {meta.author}
                      </p>
                      <p
                        className="text-[14px] leading-relaxed mb-5"
                        style={{
                          color: "var(--color-brain-text-muted)",
                          fontFamily: "var(--font-serif)",
                        }}
                      >
                        {meta.description}
                      </p>

                      <div
                        className="pt-4 border-t flex items-center justify-between"
                        style={{ borderColor: "var(--color-brain-border)" }}
                      >
                        <span
                          className="text-[11px] uppercase tracking-[0.16em]"
                          style={{
                            color: "var(--color-brain-text-soft)",
                            fontFamily: "var(--font-mono)",
                            fontWeight: 500,
                          }}
                        >
                          노드 {meta.map.nodes.length} · 패턴{" "}
                          {meta.map.patterns.length}
                        </span>
                        <span
                          className="text-[12px]"
                          style={{
                            color: color,
                            fontFamily: "var(--font-serif)",
                            fontWeight: 500,
                          }}
                        >
                          학습 시작 →
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* Footer hint */}
        <div
          className="mt-12 px-6 py-5 rounded-xl border"
          style={{
            backgroundColor: "var(--color-brain-surface-soft)",
            borderColor: "var(--color-brain-border)",
          }}
        >
          <p
            className="text-[13px] leading-relaxed"
            style={{
              color: "var(--color-brain-text-muted)",
              fontFamily: "var(--font-serif)",
            }}
          >
            <span
              style={{
                color: "var(--color-brain-accent)",
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginRight: 8,
              }}
            >
              학습 흐름
            </span>
            ① 연습 모드에서 텍스트의 핵심 개념을 직접 노드로 만들고 선으로 잇기 →
            ② 평가에서 시스템 정답과 비교 → ③ 분석 모드에서 가치 구조와 시간축
            관점 확인.
          </p>
        </div>
      </div>
    </div>
  )
}
