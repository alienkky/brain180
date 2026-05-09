import type { CSSProperties } from "react"
import { useStore } from "../../store/useStore"
import type { NodeType, ValueType, Perspective } from "../../types/cognitive"

const NODE_BORDER_COLORS: Record<NodeType, string> = {
  root: "#ff6b6b",
  anchor: "#4ecdc4",
  bridge: "#a78bfa",
  branch: "#60a5fa",
}

const VALUE_BORDER_COLORS: Record<ValueType, string> = {
  truth: "#60a5fa",
  beauty: "#f472b6",
  goodness: "#34d399",
  freedom: "#fbbf24",
  love: "#ff6b6b",
  power: "#94a3b8",
  wisdom: "#c084fc",
  connection: "#2dd4bf",
}

const TEMPORAL_BORDER_COLORS: Record<number, string> = {
  1: "#94a3b8",
  2: "#fbbf24",
  3: "#34d399",
}

export default function TextLayer() {
  const {
    currentMap,
    perspective,
    selectedSegmentIds,
    hoveredSegmentId,
    selectSegment,
    hoverSegment,
  } = useStore()

  const { textSource, nodes } = currentMap

  function getBorderColor(segmentId: string, p: Perspective): string {
    const segment = textSource.segments.find((s) => s.id === segmentId)
    if (!segment) return "transparent"
    const node = nodes.find((n) => n.id === segment.nodeIds[0])
    if (!node) return "transparent"

    if (p === "value" && node.valueType) return VALUE_BORDER_COLORS[node.valueType]
    if (p === "temporal" && node.temporalPhase) return TEMPORAL_BORDER_COLORS[node.temporalPhase]
    return NODE_BORDER_COLORS[node.type]
  }

  function getSegmentStyle(segmentId: string): CSSProperties {
    const isSelected = selectedSegmentIds.includes(segmentId)
    const isHovered = hoveredSegmentId === segmentId
    const borderColor = getBorderColor(segmentId, perspective)

    if (isSelected) {
      return {
        backgroundColor: "rgba(255, 107, 107, 0.2)",
        borderBottomColor: borderColor,
        boxShadow: "0 0 8px rgba(255, 107, 107, 0.3)",
      }
    }
    if (isHovered) {
      return {
        backgroundColor: "rgba(255, 217, 61, 0.1)",
        borderBottomColor: borderColor,
      }
    }
    return { borderBottomColor: "transparent" }
  }

  function getNodeInfo(segmentId: string): string | undefined {
    const segment = textSource.segments.find((s) => s.id === segmentId)
    if (!segment) return undefined
    const node = nodes.find((n) => n.id === segment.nodeIds[0])
    if (!node) return undefined

    if (perspective === "value" && node.valueDescription) return node.valueDescription
    if (perspective === "temporal" && node.temporalPhase) {
      const names: Record<number, string> = { 1: "전(Before)", 2: "촉매(Catalyst)", 3: "후(After)" }
      return names[node.temporalPhase]
    }
    return node.description
  }

  const legendItems =
    perspective === "cognitive"
      ? [
          { color: "#ff6b6b", label: "핵심(root)" },
          { color: "#4ecdc4", label: "기둥(anchor)" },
          { color: "#a78bfa", label: "연결(bridge)" },
          { color: "#60a5fa", label: "가지(branch)" },
        ]
      : perspective === "value"
        ? [
            { color: "#ff6b6b", label: "사랑" },
            { color: "#94a3b8", label: "힘" },
            { color: "#fbbf24", label: "자유" },
            { color: "#2dd4bf", label: "유대" },
          ]
        : [
            { color: "#94a3b8", label: "전(Before)" },
            { color: "#fbbf24", label: "촉매(Catalyst)" },
            { color: "#34d399", label: "후(After)" },
          ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-brain-border">
        <h2 className="text-lg font-semibold" style={{ color: "#e0e0f0" }}>
          {textSource.title}
        </h2>
        <p className="text-sm" style={{ color: "rgba(224,224,240,0.6)" }}>
          {textSource.author}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-base leading-8">
          {textSource.segments.map((segment) => (
            <span
              key={segment.id}
              className="inline border-b-2 cursor-pointer px-0.5 py-0.5 rounded-sm"
              style={{
                transition: "all 0.2s ease",
                ...getSegmentStyle(segment.id),
              }}
              title={getNodeInfo(segment.id)}
              onClick={() => selectSegment(segment.id)}
              onMouseEnter={() => hoverSegment(segment.id)}
              onMouseLeave={() => hoverSegment(null)}
            >
              {segment.text}
            </span>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-brain-border">
        <div className="flex gap-4 text-xs" style={{ color: "rgba(224,224,240,0.5)" }}>
          {legendItems.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
