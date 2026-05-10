import { usePracticeStore } from "../../store/usePracticeStore"
import { useStore } from "../../store/useStore"
import type { NodeType } from "../../types/cognitive"

const NODE_COLORS: Record<NodeType, string> = {
  root: "#ff6b6b",
  anchor: "#4ecdc4",
  bridge: "#a78bfa",
  branch: "#60a5fa",
}

const NODE_TYPE_LABELS: Record<NodeType, { name: string; desc: string }> = {
  root: { name: "핵심", desc: "텍스트의 중심 사상" },
  anchor: { name: "기둥", desc: "핵심을 지탱하는 주요 개념" },
  bridge: { name: "다리", desc: "개념 간 논리적 연결" },
  branch: { name: "가지", desc: "파생/부수적 개념" },
}

export default function PracticeToolbar() {
  const { currentMap } = useStore()
  const connectives = currentMap.textSource.connectives
  const {
    activeTool,
    nextNodeType,
    nextEdgeLabel,
    connectSourceId,
    selectedUserNodeId,
    selectedEdgeId,
    userNodes,
    userEdges,
    showEvaluation,
    setTool,
    setNextNodeType,
    setNextEdgeLabel,
    updateNodeType,
    updateEdgeLabel,
    removeEdge,
    setShowEvaluation,
    clearCanvas,
  } = usePracticeStore()

  const selectedNode = userNodes.find((n) => n.id === selectedUserNodeId)
  const selectedEdge = userEdges.find((e) => e.id === selectedEdgeId)
  const isConnecting = activeTool === "connect"

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-brain-border">
        <h2 className="text-lg font-semibold" style={{ color: "#e0e0f0" }}>도구</h2>
      </div>

      <div className="p-3 space-y-3">

        {/* ─── STEP 1: 노드 만들기 ─── */}
        <div
          className="rounded-lg p-2.5"
          style={{
            backgroundColor: activeTool === "select" && !selectedNode && !selectedEdge
              ? "rgba(78,205,196,0.06)" : "transparent",
            border: "1px solid rgba(224,224,240,0.08)",
          }}
        >
          <label className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: "#4ecdc4" }}>
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
              style={{ backgroundColor: "#4ecdc4", color: "#0f0f1a", fontSize: "10px", fontWeight: "800" }}
            >
              1
            </span>
            노드 만들기
          </label>
          <p className="text-xs mb-2" style={{ color: "rgba(224,224,240,0.3)" }}>
            역할을 고르고, 텍스트에서 단어를 캔버스에 보내세요
          </p>
          <div className="space-y-1">
            {(Object.keys(NODE_COLORS) as NodeType[]).map((type) => (
              <button
                key={type}
                onClick={() => { setNextNodeType(type); setTool("select") }}
                className="w-full px-2.5 py-1.5 rounded text-xs cursor-pointer flex items-center gap-2 transition-all"
                style={{
                  backgroundColor: nextNodeType === type ? `${NODE_COLORS[type]}22` : "#0f0f1a",
                  border: `1px solid ${nextNodeType === type ? NODE_COLORS[type] : "#2a2a4a"}`,
                  color: nextNodeType === type ? NODE_COLORS[type] : "rgba(224,224,240,0.5)",
                }}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: NODE_COLORS[type] }} />
                <span className="flex flex-col items-start">
                  <span className="font-bold">{NODE_TYPE_LABELS[type].name}</span>
                  <span style={{ color: "rgba(224,224,240,0.25)", fontSize: "10px" }}>
                    {NODE_TYPE_LABELS[type].desc}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── STEP 2: 선 잇기 ─── */}
        <div
          className="rounded-lg p-2.5"
          style={{
            backgroundColor: isConnecting ? "rgba(255,217,61,0.06)" : "transparent",
            border: isConnecting ? "1px solid rgba(255,217,61,0.2)" : "1px solid rgba(224,224,240,0.08)",
          }}
        >
          <label className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: "#ffd93d" }}>
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
              style={{ backgroundColor: "#ffd93d", color: "#0f0f1a", fontSize: "10px", fontWeight: "800" }}
            >
              2
            </span>
            선 잇기
          </label>

          {/* 잇기 활성화 버튼 */}
          <button
            onClick={() => setTool(isConnecting ? "select" : "connect")}
            className="w-full px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all mb-2"
            style={{
              backgroundColor: isConnecting ? "#ffd93d" : "rgba(255,217,61,0.1)",
              color: isConnecting ? "#0f0f1a" : "#ffd93d",
              border: isConnecting ? "none" : "1px solid rgba(255,217,61,0.3)",
            }}
          >
            {isConnecting
              ? connectSourceId
                ? "→ 도착 노드를 클릭하세요"
                : "→ 시작 노드를 클릭하세요"
              : "↗ 두 노드 잇기 시작"}
          </button>

          {/* 연결어 선택 (잇기와 함께) */}
          <p className="text-xs mb-1.5" style={{ color: "rgba(224,224,240,0.3)" }}>
            선에 붙일 연결어를 고르세요
          </p>
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
          <div className="space-y-0.5" style={{ maxHeight: "140px", overflowY: "auto" }}>
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
                <span style={{ color: "rgba(224,224,240,0.2)", fontSize: "10px" }}>{role}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── 편집 도구 ─── */}
        <div className="flex gap-1">
          <button
            onClick={() => setTool("select")}
            className="flex-1 px-2 py-1.5 rounded text-xs cursor-pointer transition-all"
            style={{
              backgroundColor: activeTool === "select" ? "#2a2a4a" : "#0f0f1a",
              color: activeTool === "select" ? "#e0e0f0" : "rgba(224,224,240,0.4)",
              border: `1px solid ${activeTool === "select" ? "rgba(224,224,240,0.3)" : "#2a2a4a"}`,
            }}
          >
            ↖ 선택
          </button>
          <button
            onClick={() => setTool("delete")}
            className="flex-1 px-2 py-1.5 rounded text-xs cursor-pointer transition-all"
            style={{
              backgroundColor: activeTool === "delete" ? "#2a2a4a" : "#0f0f1a",
              color: activeTool === "delete" ? "#ff6b6b" : "rgba(224,224,240,0.4)",
              border: `1px solid ${activeTool === "delete" ? "#ff6b6b" : "#2a2a4a"}`,
            }}
          >
            ✕ 삭제
          </button>
        </div>

        {/* ─── 선택된 선 편집기 ─── */}
        {selectedEdge && (
          <div className="rounded-lg border p-2.5" style={{ borderColor: "#ffd93d", backgroundColor: "rgba(255,217,61,0.05)" }}>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#ffd93d" }}>
              {userNodes.find((n) => n.id === selectedEdge.from)?.concept} → {userNodes.find((n) => n.id === selectedEdge.to)?.concept}
            </label>
            <input
              type="text"
              value={selectedEdge.label}
              onChange={(e) => updateEdgeLabel(selectedEdge.id, e.target.value)}
              placeholder="연결어 입력..."
              className="w-full px-2 py-1.5 rounded text-xs mb-1.5"
              style={{
                backgroundColor: "#0f0f1a",
                color: "#ffd93d",
                border: "1px solid rgba(255,217,61,0.3)",
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
                    backgroundColor: selectedEdge.label === word ? "rgba(255,217,61,0.2)" : "transparent",
                    color: selectedEdge.label === word ? "#ffd93d" : "rgba(224,224,240,0.4)",
                    border: `1px solid ${selectedEdge.label === word ? "#ffd93d" : "transparent"}`,
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
              선 삭제
            </button>
          </div>
        )}

        {/* ─── 선택된 노드 편집기 ─── */}
        {selectedNode && (
          <div className="rounded-lg border p-2.5" style={{ borderColor: "#4ecdc4", backgroundColor: "rgba(78,205,196,0.05)" }}>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#4ecdc4" }}>
              노드: {selectedNode.concept}
            </label>
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
                  {NODE_TYPE_LABELS[type].name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── 평가 ─── */}
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
          {showEvaluation ? "평가 닫기" : "내 인지 구조 평가받기"}
        </button>

        {/* ─── 안내 + 초기화 ─── */}
        <div className="rounded border p-2.5" style={{ borderColor: "#2a2a4a", backgroundColor: "rgba(255,217,61,0.03)" }}>
          <p className="text-xs leading-relaxed mb-2" style={{ color: "rgba(224,224,240,0.35)" }}>
            인지 구조를 완성한 후 분석 모드에서 가치 구조와 시간축을 확인해 보세요.
          </p>
          <div className="flex justify-between text-xs mb-2" style={{ color: "rgba(224,224,240,0.5)" }}>
            <span>노드: {userNodes.length}</span>
            <span>선: {userEdges.length}</span>
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
