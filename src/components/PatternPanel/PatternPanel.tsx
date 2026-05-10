import { useStore } from "../../store/useStore"
import type { ValueType } from "../../types/cognitive"

const VALUE_COLORS: Record<ValueType, string> = {
  truth: "#60a5fa",
  beauty: "#f472b6",
  goodness: "#34d399",
  freedom: "#fbbf24",
  love: "#ff6b6b",
  power: "#94a3b8",
  wisdom: "#c084fc",
  connection: "#2dd4bf",
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
  1: "#94a3b8",
  2: "#fbbf24",
  3: "#34d399",
}

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

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-brain-border">
        <h2 className="text-lg font-semibold text-brain-text">
          {perspective === "cognitive" && "사고 패턴"}
          {perspective === "value" && "가치 패턴"}
          {perspective === "temporal" && "시간 패턴"}
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {filteredPatterns.map((pattern) => {
          const isActive = pattern.involvedNodes.some(isNodeActive)
          return (
            <div
              key={pattern.id}
              style={{
                borderColor: isActive ? "#ff6b6b" : "#2a2a4a",
                backgroundColor: isActive
                  ? "rgba(255, 107, 107, 0.1)"
                  : "#1a1a2e",
              }}
              className="rounded-lg border p-3 transition-colors duration-200"
            >
              <h3
                className="text-sm font-bold mb-1"
                style={{ color: "#ffd93d" }}
              >
                {pattern.name}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(224,224,240,0.7)" }}>
                {pattern.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {pattern.involvedNodes.map((nId) => {
                  const node = nodes.find((n) => n.id === nId)
                  if (!node) return null
                  const active = isNodeActive(nId)
                  return (
                    <button
                      key={nId}
                      onClick={() => selectNode(nId)}
                      style={{
                        borderColor: active ? "#ff6b6b" : "#2a2a4a",
                        backgroundColor: active
                          ? "rgba(255,107,107,0.3)"
                          : "transparent",
                        color: active
                          ? "#e0e0f0"
                          : "rgba(224,224,240,0.5)",
                      }}
                      className="text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-colors duration-150"
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
          <p className="text-sm" style={{ color: "rgba(224,224,240,0.4)" }}>
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
        <div className="px-4 py-3 border-t border-brain-border">
          <h2 className="text-base font-semibold mb-3" style={{ color: "#e0e0f0" }}>
            인지 레이어
          </h2>
          <div className="space-y-2">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className="rounded border p-2"
                style={{ borderColor: "#2a2a4a", backgroundColor: "#1a1a2e" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono" style={{ color: "rgba(224,224,240,0.4)" }}>
                    L{layer.depth}
                  </span>
                  <span className="text-sm font-medium" style={{ color: "rgba(224,224,240,0.8)" }}>
                    {layer.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {layer.nodeIds.map((nId) => {
                    const node = nodes.find((n) => n.id === nId)
                    if (!node) return null
                    return (
                      <span
                        key={nId}
                        onClick={() => selectNode(nId)}
                        className="text-xs px-1.5 py-0.5 rounded cursor-pointer"
                        style={{
                          backgroundColor: "#0f0f1a",
                          color: "rgba(224,224,240,0.6)",
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
    <div className="px-4 py-3 border-t border-brain-border">
      <h2 className="text-base font-semibold mb-3" style={{ color: "#e0e0f0" }}>
        가치 유형
      </h2>
      <div className="space-y-2">
        {Array.from(valueGroups.entries()).map(([vt, groupNodes]) => (
          <div
            key={vt}
            className="rounded border p-2"
            style={{ borderColor: "#2a2a4a", backgroundColor: "#1a1a2e" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: VALUE_COLORS[vt] }}
              />
              <span className="text-sm font-medium" style={{ color: VALUE_COLORS[vt] }}>
                {VALUE_LABELS[vt]}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {groupNodes.map((node) => (
                <span
                  key={node.id}
                  onClick={() => selectNode(node.id)}
                  className="text-xs px-1.5 py-0.5 rounded cursor-pointer"
                  style={{
                    backgroundColor: "#0f0f1a",
                    color: "rgba(224,224,240,0.6)",
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
    <div className="px-4 py-3 border-t border-brain-border">
      <h2 className="text-base font-semibold mb-3" style={{ color: "#e0e0f0" }}>
        시간 흐름
      </h2>
      <div className="space-y-3">
        {phases.map((phase) => {
          const phaseNodes = nodes.filter((n) => n.temporalPhase === phase)
          const isActive = activePhase === phase
          return (
            <div key={phase} className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <button
                  onClick={() => setPhase(isActive ? null : phase)}
                  className="w-6 h-6 rounded-full border-2 cursor-pointer flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    borderColor: TEMPORAL_COLORS[phase],
                    backgroundColor: isActive ? TEMPORAL_COLORS[phase] : "transparent",
                    color: isActive ? "#0f0f1a" : TEMPORAL_COLORS[phase],
                  }}
                >
                  {phase}
                </button>
                {phase < 3 && (
                  <div
                    className="w-0.5 h-6 mt-1"
                    style={{ backgroundColor: "#2a2a4a" }}
                  />
                )}
              </div>
              <div className="flex-1">
                <p
                  className="text-xs font-semibold mb-1"
                  style={{ color: TEMPORAL_COLORS[phase] }}
                >
                  {TEMPORAL_PHASE_NAMES[phase]}
                </p>
                <div className="flex flex-wrap gap-1">
                  {phaseNodes.map((node) => (
                    <span
                      key={node.id}
                      onClick={() => selectNode(node.id)}
                      className="text-xs px-1.5 py-0.5 rounded cursor-pointer"
                      style={{
                        backgroundColor: isActive
                          ? `${TEMPORAL_COLORS[phase]}22`
                          : "#0f0f1a",
                        color: isActive
                          ? TEMPORAL_COLORS[phase]
                          : "rgba(224,224,240,0.6)",
                        borderWidth: isActive ? 1 : 0,
                        borderColor: TEMPORAL_COLORS[phase],
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
