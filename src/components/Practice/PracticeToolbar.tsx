import { usePracticeStore } from "../../store/usePracticeStore"
import { useStore } from "../../store/useStore"
import type { CanvasTool } from "../../store/usePracticeStore"
import type { NodeType, Dimensionality } from "../../types/cognitive"

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


const TOOLS: { key: CanvasTool; label: string; icon: string }[] = [
  { key: "select", label: "선택", icon: "↖" },
  { key: "connect", label: "연결", icon: "↗" },
  { key: "delete", label: "삭제", icon: "✕" },
]

export default function PracticeToolbar() {
  const { currentMap } = useStore()
  const connectives = currentMap.textSource.connectives
  const {
    activeTool,
    nextNodeType,
    nextDimensionality,
    nextEdgeLabel,
    selectedUserNodeId,
    selectedEdgeId,
    userNodes,
    userEdges,
    showEvaluation,
    setTool,
    setNextNodeType,
    setNextDimensionality,
    setNextEdgeLabel,
    updateNodeType,
    updateNodeDimensionality,
    updateEdgeLabel,
    removeEdge,
    setShowEvaluation,
    clearCanvas,
  } = usePracticeStore()

  const selectedNode = userNodes.find((n) => n.id === selectedUserNodeId)
  const selectedEdge = userEdges.find((e) => e.id === selectedEdgeId)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-brain-border">
        <h2 className="text-lg font-semibold" style={{ color: "#e0e0f0" }}>도구</h2>
      </div>

      <div className="p-3 space-y-4">
        {/* Tools */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(224,224,240,0.6)" }}>
            캔버스 도구
          </label>
          <div className="flex gap-1">
            {TOOLS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTool(key)}
                className="flex-1 px-2 py-1.5 rounded text-xs cursor-pointer transition-all"
                style={{
                  backgroundColor: activeTool === key ? "#2a2a4a" : "#0f0f1a",
                  color: activeTool === key ? "#e0e0f0" : "rgba(224,224,240,0.4)",
                  border: `1px solid ${activeTool === key ? "#ff6b6b" : "#2a2a4a"}`,
                }}
              >
                <span className="text-sm block">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Node type */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(224,224,240,0.6)" }}>
            노드 유형
          </label>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(NODE_COLORS) as NodeType[]).map((type) => (
              <button
                key={type}
                onClick={() => setNextNodeType(type)}
                className="px-2 py-1 rounded text-xs cursor-pointer flex items-center gap-1.5 transition-all"
                style={{
                  backgroundColor: nextNodeType === type ? `${NODE_COLORS[type]}22` : "#0f0f1a",
                  border: `1px solid ${nextNodeType === type ? NODE_COLORS[type] : "#2a2a4a"}`,
                  color: nextNodeType === type ? NODE_COLORS[type] : "rgba(224,224,240,0.5)",
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS[type] }} />
                {NODE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Dimensionality */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(224,224,240,0.6)" }}>
            차원
          </label>
          <div className="flex gap-1">
            {([1, 2, 3, 4] as Dimensionality[]).map((dim) => (
              <button
                key={dim}
                onClick={() => setNextDimensionality(dim)}
                className="flex-1 px-2 py-1.5 rounded text-xs cursor-pointer transition-all"
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

        {/* Connective words for edges */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(224,224,240,0.6)" }}>
            연결어 (접속사/접미사)
          </label>
          <input
            type="text"
            value={nextEdgeLabel}
            onChange={(e) => setNextEdgeLabel(e.target.value)}
            placeholder="직접 입력..."
            className="w-full px-2 py-1.5 rounded text-xs mb-1.5"
            style={{
              backgroundColor: "#0f0f1a",
              color: "#ffd93d",
              border: "1px solid #2a2a4a",
              outline: "none",
            }}
          />
          <div className="space-y-0.5">
            {connectives.map(({ word, role }) => (
              <button
                key={word}
                onClick={() => setNextEdgeLabel(word)}
                className="w-full text-left px-2 py-1 rounded text-xs cursor-pointer transition-all flex justify-between items-center"
                style={{
                  backgroundColor: nextEdgeLabel === word ? "#2a2a4a" : "transparent",
                  color: nextEdgeLabel === word ? "#ffd93d" : "rgba(224,224,240,0.4)",
                  border: `1px solid ${nextEdgeLabel === word ? "#ffd93d" : "transparent"}`,
                }}
              >
                <span className="font-medium">{word}</span>
                <span style={{ color: "rgba(224,224,240,0.25)", fontSize: "10px" }}>{role}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected edge editor */}
        {selectedEdge && (
          <div className="rounded-lg border p-2.5" style={{ borderColor: "#ff6b6b", backgroundColor: "rgba(255,107,107,0.05)" }}>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#ff6b6b" }}>
              연결: {userNodes.find((n) => n.id === selectedEdge.from)?.concept} → {userNodes.find((n) => n.id === selectedEdge.to)?.concept}
            </label>
            <input
              type="text"
              value={selectedEdge.label}
              onChange={(e) => updateEdgeLabel(selectedEdge.id, e.target.value)}
              placeholder="연결 특성 입력..."
              className="w-full px-2 py-1.5 rounded text-xs mb-1.5"
              style={{
                backgroundColor: "#0f0f1a",
                color: "#ff6b6b",
                border: "1px solid rgba(255,107,107,0.3)",
                outline: "none",
              }}
            />
            <div className="space-y-0.5 mb-1.5">
              {connectives.map(({ word }) => (
                <button
                  key={word}
                  onClick={() => updateEdgeLabel(selectedEdge.id, word)}
                  className="w-full text-left px-2 py-1 rounded text-xs cursor-pointer transition-all"
                  style={{
                    backgroundColor: selectedEdge.label === word ? "rgba(255,107,107,0.2)" : "transparent",
                    color: selectedEdge.label === word ? "#ff6b6b" : "rgba(224,224,240,0.4)",
                    border: `1px solid ${selectedEdge.label === word ? "#ff6b6b" : "transparent"}`,
                  }}
                >
                  {word}
                </button>
              ))}
            </div>
            <button
              onClick={() => removeEdge(selectedEdge.id)}
              className="w-full py-1 rounded text-xs cursor-pointer"
              style={{ backgroundColor: "#0f0f1a", color: "rgba(255,107,107,0.7)", border: "1px solid rgba(255,107,107,0.3)" }}
            >
              연결 삭제
            </button>
          </div>
        )}

        {/* Selected node editor */}
        {selectedNode && (
          <div className="rounded-lg border p-2.5" style={{ borderColor: "#ffd93d", backgroundColor: "rgba(255,217,61,0.05)" }}>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#ffd93d" }}>
              선택: {selectedNode.concept}
            </label>
            <div className="space-y-1.5">
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
        )}

        {/* Evaluate button */}
        <button
          onClick={() => setShowEvaluation(!showEvaluation)}
          disabled={userNodes.length < 2}
          className="w-full py-2 rounded-lg text-xs font-bold cursor-pointer transition-all"
          style={{
            backgroundColor: showEvaluation ? "#34d399" : userNodes.length < 2 ? "#1a1a2e" : "#ff6b6b",
            color: userNodes.length < 2 ? "rgba(224,224,240,0.2)" : "#0f0f1a",
            border: "none",
            opacity: userNodes.length < 2 ? 0.5 : 1,
          }}
        >
          {showEvaluation ? "평가 닫기" : "내 다이어그램 평가받기"}
        </button>

        {/* Stats & clear */}
        <div className="rounded border p-2.5" style={{ borderColor: "#2a2a4a", backgroundColor: "#1a1a2e" }}>
          <div className="flex justify-between text-xs mb-2" style={{ color: "rgba(224,224,240,0.5)" }}>
            <span>노드: {userNodes.length}</span>
            <span>연결: {userEdges.length}</span>
          </div>
          <button
            onClick={clearCanvas}
            className="w-full py-1.5 rounded text-xs cursor-pointer"
            style={{ backgroundColor: "#0f0f1a", color: "rgba(255,107,107,0.7)", border: "1px solid rgba(255,107,107,0.3)" }}
          >
            초기화
          </button>
        </div>
      </div>
    </div>
  )
}
