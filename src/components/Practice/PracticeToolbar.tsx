import { usePracticeStore } from "../../store/usePracticeStore"
import type { CanvasTool } from "../../store/usePracticeStore"
import type { NodeType, Dimensionality, EdgeRelation } from "../../types/cognitive"

const NODE_COLORS: Record<NodeType, string> = {
  root: "#ff6b6b",
  anchor: "#4ecdc4",
  bridge: "#a78bfa",
  branch: "#60a5fa",
}

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  root: "핵심",
  anchor: "기둥",
  bridge: "연결",
  branch: "가지",
}

const EDGE_LABELS: Record<EdgeRelation, string> = {
  causes: "원인→결과",
  supports: "뒷받침",
  contrasts: "대비",
  transforms: "변환",
  contains: "포함",
}

const TOOLS: { key: CanvasTool; label: string; icon: string }[] = [
  { key: "select", label: "선택/이동", icon: "↖" },
  { key: "connect", label: "연결", icon: "↗" },
  { key: "delete", label: "삭제", icon: "✕" },
]

export default function PracticeToolbar() {
  const {
    activeTool,
    nextNodeType,
    nextDimensionality,
    nextEdgeRelation,
    selectedUserNodeId,
    userNodes,
    userEdges,
    setTool,
    setNextNodeType,
    setNextDimensionality,
    setNextEdgeRelation,
    updateNodeType,
    updateNodeDimensionality,
    clearCanvas,
  } = usePracticeStore()

  const selectedNode = userNodes.find((n) => n.id === selectedUserNodeId)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-brain-border">
        <h2 className="text-lg font-semibold" style={{ color: "#e0e0f0" }}>
          도구
        </h2>
      </div>

      <div className="p-4 space-y-5">
        {/* Tool selection */}
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(224,224,240,0.6)" }}>
            캔버스 도구
          </label>
          <div className="flex gap-1">
            {TOOLS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTool(key)}
                className="flex-1 px-2 py-2 rounded text-xs cursor-pointer transition-all"
                style={{
                  backgroundColor: activeTool === key ? "#2a2a4a" : "#0f0f1a",
                  color: activeTool === key ? "#e0e0f0" : "rgba(224,224,240,0.4)",
                  border: `1px solid ${activeTool === key ? "#ff6b6b" : "#2a2a4a"}`,
                }}
              >
                <span className="text-base block">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Next node type */}
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(224,224,240,0.6)" }}>
            새 노드 유형
          </label>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(NODE_COLORS) as NodeType[]).map((type) => (
              <button
                key={type}
                onClick={() => setNextNodeType(type)}
                className="px-2 py-1.5 rounded text-xs cursor-pointer flex items-center gap-1.5 transition-all"
                style={{
                  backgroundColor: nextNodeType === type ? `${NODE_COLORS[type]}22` : "#0f0f1a",
                  border: `1px solid ${nextNodeType === type ? NODE_COLORS[type] : "#2a2a4a"}`,
                  color: nextNodeType === type ? NODE_COLORS[type] : "rgba(224,224,240,0.5)",
                }}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: NODE_COLORS[type] }}
                />
                {NODE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Next dimensionality */}
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(224,224,240,0.6)" }}>
            새 노드 차원
          </label>
          <div className="flex gap-1">
            {([1, 2, 3, 4] as Dimensionality[]).map((dim) => (
              <button
                key={dim}
                onClick={() => setNextDimensionality(dim)}
                className="flex-1 px-2 py-2 rounded text-xs cursor-pointer transition-all"
                style={{
                  backgroundColor: nextDimensionality === dim ? "#2a2a4a" : "#0f0f1a",
                  color: nextDimensionality === dim ? "#ffd93d" : "rgba(224,224,240,0.4)",
                  border: `1px solid ${nextDimensionality === dim ? "#ffd93d" : "#2a2a4a"}`,
                }}
              >
                {dim}D
              </button>
            ))}
          </div>
        </div>

        {/* Edge relation */}
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(224,224,240,0.6)" }}>
            연결 관계
          </label>
          <div className="space-y-1">
            {(Object.keys(EDGE_LABELS) as EdgeRelation[]).map((rel) => (
              <button
                key={rel}
                onClick={() => setNextEdgeRelation(rel)}
                className="w-full text-left px-2 py-1 rounded text-xs cursor-pointer transition-all"
                style={{
                  backgroundColor: nextEdgeRelation === rel ? "#2a2a4a" : "transparent",
                  color: nextEdgeRelation === rel ? "#e0e0f0" : "rgba(224,224,240,0.4)",
                  border: `1px solid ${nextEdgeRelation === rel ? "#a78bfa" : "transparent"}`,
                }}
              >
                {EDGE_LABELS[rel]}
              </button>
            ))}
          </div>
        </div>

        {/* Selected node editor */}
        {selectedNode && (
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: "#ffd93d", backgroundColor: "rgba(255,217,61,0.05)" }}
          >
            <label className="text-xs font-semibold mb-2 block" style={{ color: "#ffd93d" }}>
              선택된 노드: {selectedNode.concept}
            </label>
            <div className="space-y-2">
              <div>
                <span className="text-xs block mb-1" style={{ color: "rgba(224,224,240,0.5)" }}>
                  유형 변경
                </span>
                <div className="flex gap-1">
                  {(Object.keys(NODE_COLORS) as NodeType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => updateNodeType(selectedNode.id, type)}
                      className="flex-1 px-1 py-1 rounded text-xs cursor-pointer"
                      style={{
                        backgroundColor: selectedNode.type === type ? NODE_COLORS[type] : "#0f0f1a",
                        color: selectedNode.type === type ? "#0f0f1a" : "rgba(224,224,240,0.4)",
                        border: `1px solid ${selectedNode.type === type ? NODE_COLORS[type] : "#2a2a4a"}`,
                        fontWeight: selectedNode.type === type ? "bold" : "normal",
                      }}
                    >
                      {NODE_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs block mb-1" style={{ color: "rgba(224,224,240,0.5)" }}>
                  차원 변경
                </span>
                <div className="flex gap-1">
                  {([1, 2, 3, 4] as Dimensionality[]).map((dim) => (
                    <button
                      key={dim}
                      onClick={() => updateNodeDimensionality(selectedNode.id, dim)}
                      className="flex-1 px-1 py-1 rounded text-xs cursor-pointer"
                      style={{
                        backgroundColor: selectedNode.dimensionality === dim ? "#ffd93d" : "#0f0f1a",
                        color: selectedNode.dimensionality === dim ? "#0f0f1a" : "rgba(224,224,240,0.4)",
                        border: `1px solid ${selectedNode.dimensionality === dim ? "#ffd93d" : "#2a2a4a"}`,
                        fontWeight: selectedNode.dimensionality === dim ? "bold" : "normal",
                      }}
                    >
                      {dim}D
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats & clear */}
        <div
          className="rounded border p-3"
          style={{ borderColor: "#2a2a4a", backgroundColor: "#1a1a2e" }}
        >
          <div className="flex justify-between text-xs mb-2" style={{ color: "rgba(224,224,240,0.5)" }}>
            <span>노드: {userNodes.length}개</span>
            <span>연결: {userEdges.length}개</span>
          </div>
          <button
            onClick={clearCanvas}
            className="w-full py-1.5 rounded text-xs cursor-pointer transition-all"
            style={{
              backgroundColor: "#0f0f1a",
              color: "rgba(255,107,107,0.7)",
              border: "1px solid rgba(255,107,107,0.3)",
            }}
          >
            캔버스 초기화
          </button>
        </div>
      </div>
    </div>
  )
}
