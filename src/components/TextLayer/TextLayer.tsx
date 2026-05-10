import type { CSSProperties } from "react"
import { useStore } from "../../store/useStore"
import type { NodeType, ValueType, Perspective } from "../../types/cognitive"

const NODE_BORDER_COLORS: Record<NodeType, string> = {
  root: "#B85C3F",
  anchor: "#6E8F82",
  bridge: "#8F7FA8",
  branch: "#6F8AA8",
}

const VALUE_BORDER_COLORS: Record<ValueType, string> = {
  truth: "#6F8AA8",
  beauty: "#C49AA1",
  goodness: "#7E9F7B",
  freedom: "#C68A3D",
  love: "#B85C3F",
  power: "#8F857A",
  wisdom: "#8F7FA8",
  connection: "#7BA6A0",
}

const TEMPORAL_BORDER_COLORS: Record<number, string> = {
  1: "#8F857A",
  2: "#C68A3D",
  3: "#7E9F7B",
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
        backgroundColor: "rgba(184, 92, 63, 0.10)",
        borderBottomColor: borderColor,
        boxShadow: "inset 0 -2px 0 rgba(184, 92, 63, 0.15)",
      }
    }
    if (isHovered) {
      return {
        backgroundColor: "rgba(198, 138, 61, 0.08)",
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
          { color: "#B85C3F", label: "핵심" },
          { color: "#6E8F82", label: "기둥" },
          { color: "#8F7FA8", label: "연결" },
          { color: "#6F8AA8", label: "가지" },
        ]
      : perspective === "value"
        ? [
            { color: "#B85C3F", label: "사랑" },
            { color: "#8F857A", label: "힘" },
            { color: "#C68A3D", label: "자유" },
            { color: "#7BA6A0", label: "유대" },
          ]
        : [
            { color: "#8F857A", label: "전" },
            { color: "#C68A3D", label: "촉매" },
            { color: "#7E9F7B", label: "후" },
          ]

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
          className="text-[12.5px] mt-1.5"
          style={{ color: "var(--color-brain-text-muted)" }}
        >
          {textSource.author}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div
          className="text-[15px] leading-[2]"
          style={{ color: "var(--color-brain-text)", fontFamily: "var(--font-serif)" }}
        >
          {textSource.segments.map((segment) => (
            <span
              key={segment.id}
              className="inline border-b cursor-pointer px-0.5 py-0.5"
              style={{
                borderBottomWidth: "2px",
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

      <div className="px-6 py-3 border-t border-brain-border">
        <div className="flex gap-4 text-[11px]" style={{ color: "var(--color-brain-text-muted)" }}>
          {legendItems.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
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
