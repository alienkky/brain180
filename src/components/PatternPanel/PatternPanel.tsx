import { useStore } from "../../store/useStore"
import type { ValueType } from "../../types/cognitive"

const VALUE_COLORS: Record<ValueType, string> = {
  truth: "#6F8AA8",
  beauty: "#C49AA1",
  goodness: "#7E9F7B",
  freedom: "#C68A3D",
  love: "#B85C3F",
  power: "#8F857A",
  wisdom: "#8F7FA8",
  connection: "#7BA6A0",
}

const VALUE_LABELS: Record<ValueType, string> = {
  truth: "진리",
  beauty: "아름다움",
  goodness: "선",
  freedom: "자유",
  love: "사랑",
  power: "힘/권력",
  wisdom: "지혜",
  connection: "유대",
}

const TEMPORAL_PHASE_NAMES: Record<number, string> = {
  1: "전 (Before)",
  2: "촉매 (Catalyst)",
  3: "후 (After)",
}

const TEMPORAL_COLORS: Record<number, string> = {
  1: "#8F857A",
  2: "#C68A3D",
  3: "#7E9F7B",
}

const SectionHeader = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div className="mb-3">
    <p
      className="text-[10px] uppercase tracking-[0.18em] mb-1"
      style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
    >
      {eyebrow}
    </p>
    <h2
      className="text-[17px] tracking-[-0.01em]"
      style={{
        color: "var(--color-brain-text)",
        fontFamily: "var(--font-serif)",
        fontWeight: 500,
      }}
    >
      {title}
    </h2>
  </div>
)

export default function PatternPanel() {
  const {
    currentMap,
    perspective,
    selectedNodeIds,
    activeTemporalPhase,
    selectNode,
    setTemporalPhase,
  } = useStore()
  const { patterns, layers, nodes } = currentMap

  const filteredPatterns = patterns.filter(
    (p) => p.perspective === perspective
  )

  const isNodeActive = (nId: string) => selectedNodeIds.includes(nId)

  const sectionTitle =
    perspective === "cognitive" ? "사고 패턴"
    : perspective === "value" ? "가치 패턴"
    : "시간 패턴"

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 py-5 border-b border-brain-border">
        <SectionHeader eyebrow="패턴" title={sectionTitle} />
      </div>

      <div className="px-6 py-5 space-y-3">
        {filteredPatterns.map((pattern) => {
          const isActive = pattern.involvedNodes.some(isNodeActive)
          return (
            <div
              key={pattern.id}
              style={{
                borderColor: isActive ? "var(--color-brain-accent)" : "var(--color-brain-border)",
                backgroundColor: isActive
                  ? "rgba(184, 92, 63, 0.04)"
                  : "var(--color-brain-surface)",
                boxShadow: isActive
                  ? "0 2px 8px rgba(184,92,63,0.08)"
                  : "0 1px 2px rgba(42,36,29,0.04)",
              }}
              className="rounded-lg border p-4 transition-all duration-200"
            >
              <h3
                className="text-[14px] mb-1"
                style={{
                  color: "var(--color-brain-text)",
                  fontFamily: "var(--font-serif)",
                  fontWeight: 600,
                }}
              >
                {pattern.name}
              </h3>
              <p
                className="text-[12.5px] leading-relaxed"
                style={{
                  color: "var(--color-brain-text-muted)",
                  fontFamily: "var(--font-serif)",
                }}
              >
                {pattern.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {pattern.involvedNodes.map((nId) => {
                  const node = nodes.find((n) => n.id === nId)
                  if (!node) return null
                  const active = isNodeActive(nId)
                  return (
                    <button
                      key={nId}
                      onClick={() => selectNode(nId)}
                      style={{
                        minHeight: 24,
                        borderColor: active
                          ? "var(--color-brain-accent)"
                          : "var(--color-brain-border)",
                        backgroundColor: active
                          ? "rgba(184,92,63,0.10)"
                          : "var(--color-brain-surface-soft)",
                        color: active
                          ? "var(--color-brain-accent)"
                          : "var(--color-brain-text-muted)",
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors duration-150"
                    >
                      {node.concept}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {filteredPatterns.length === 0 && (
          <p
            className="text-[13px]"
            style={{
              color: "var(--color-brain-text-soft)",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
            }}
          >
            이 관점에 정의된 패턴이 없습니다.
          </p>
        )}
      </div>

      {perspective === "value" && (
        <ValueLegend nodes={nodes} selectNode={selectNode} />
      )}

      {perspective === "temporal" && (
        <TemporalTimeline
          nodes={nodes}
          activePhase={activeTemporalPhase}
          setPhase={setTemporalPhase}
          selectNode={selectNode}
        />
      )}

      {perspective === "cognitive" && (
        <div className="px-6 py-5 border-t border-brain-border">
          <SectionHeader eyebrow="구조" title="인지 레이어" />
          <div className="space-y-2">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className="rounded-lg border p-3"
                style={{
                  borderColor: "var(--color-brain-border)",
                  backgroundColor: "var(--color-brain-surface)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] tracking-[0.08em]"
                    style={{
                      color: "var(--color-brain-text-soft)",
                      fontWeight: 600,
                    }}
                  >
                    L{layer.depth}
                  </span>
                  <span
                    className="text-[13px]"
                    style={{
                      color: "var(--color-brain-text)",
                      fontFamily: "var(--font-serif)",
                      fontWeight: 500,
                    }}
                  >
                    {layer.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {layer.nodeIds.map((nId) => {
                    const node = nodes.find((n) => n.id === nId)
                    if (!node) return null
                    return (
                      <span
                        key={nId}
                        onClick={() => selectNode(nId)}
                        className="text-[11px] px-2 py-0.5 rounded-full cursor-pointer"
                        style={{
                          backgroundColor: "var(--color-brain-surface-soft)",
                          color: "var(--color-brain-text-muted)",
                        }}
                      >
                        {node.concept}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ValueLegend({
  nodes,
  selectNode,
}: {
  nodes: { id: string; concept: string; valueType?: ValueType; valueDescription?: string }[]
  selectNode: (id: string) => void
}) {
  const valueGroups = new Map<ValueType, typeof nodes>()
  for (const node of nodes) {
    if (!node.valueType) continue
    const group = valueGroups.get(node.valueType) ?? []
    group.push(node)
    valueGroups.set(node.valueType, group)
  }

  return (
    <div className="px-6 py-5 border-t border-brain-border">
      <SectionHeader eyebrow="범례" title="가치 유형" />
      <div className="space-y-2">
        {Array.from(valueGroups.entries()).map(([vt, groupNodes]) => (
          <div
            key={vt}
            className="rounded-lg border p-3"
            style={{
              borderColor: "var(--color-brain-border)",
              backgroundColor: "var(--color-brain-surface)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: VALUE_COLORS[vt] }}
              />
              <span
                className="text-[13px]"
                style={{
                  color: VALUE_COLORS[vt],
                  fontFamily: "var(--font-serif)",
                  fontWeight: 500,
                }}
              >
                {VALUE_LABELS[vt]}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {groupNodes.map((node) => (
                <span
                  key={node.id}
                  onClick={() => selectNode(node.id)}
                  className="text-[11px] px-2 py-0.5 rounded-full cursor-pointer"
                  style={{
                    backgroundColor: "var(--color-brain-surface-soft)",
                    color: "var(--color-brain-text-muted)",
                  }}
                  title={node.valueDescription}
                >
                  {node.concept}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TemporalTimeline({
  nodes,
  activePhase,
  setPhase,
  selectNode,
}: {
  nodes: { id: string; concept: string; temporalPhase?: number }[]
  activePhase: number | null
  setPhase: (p: number | null) => void
  selectNode: (id: string) => void
}) {
  const phases = [1, 2, 3]

  return (
    <div className="px-6 py-5 border-t border-brain-border">
      <SectionHeader eyebrow="흐름" title="시간 흐름" />
      <div className="space-y-4">
        {phases.map((phase) => {
          const phaseNodes = nodes.filter((n) => n.temporalPhase === phase)
          const isActive = activePhase === phase
          return (
            <div key={phase} className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <button
                  onClick={() => setPhase(isActive ? null : phase)}
                  className="w-7 h-7 rounded-full border cursor-pointer flex items-center justify-center text-[12px] transition-all"
                  style={{
                    borderColor: TEMPORAL_COLORS[phase],
                    backgroundColor: isActive ? TEMPORAL_COLORS[phase] : "var(--color-brain-surface)",
                    color: isActive ? "#FFFFFF" : TEMPORAL_COLORS[phase],
                    fontWeight: 600,
                  }}
                >
                  {phase}
                </button>
                {phase < 3 && (
                  <div
                    className="w-px h-7 mt-1"
                    style={{ backgroundColor: "var(--color-brain-border)" }}
                  />
                )}
              </div>
              <div className="flex-1">
                <p
                  className="text-[12px] mb-1.5"
                  style={{
                    color: TEMPORAL_COLORS[phase],
                    fontFamily: "var(--font-serif)",
                    fontWeight: 500,
                  }}
                >
                  {TEMPORAL_PHASE_NAMES[phase]}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {phaseNodes.map((node) => (
                    <span
                      key={node.id}
                      onClick={() => selectNode(node.id)}
                      className="text-[11px] px-2 py-0.5 rounded-full cursor-pointer"
                      style={{
                        backgroundColor: isActive
                          ? `${TEMPORAL_COLORS[phase]}1A`
                          : "var(--color-brain-surface-soft)",
                        color: isActive
                          ? TEMPORAL_COLORS[phase]
                          : "var(--color-brain-text-muted)",
                        border: `1px solid ${isActive ? TEMPORAL_COLORS[phase] : "transparent"}`,
                      }}
                    >
                      {node.concept}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
