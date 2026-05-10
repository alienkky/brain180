import { usePracticeStore } from "../../store/usePracticeStore"
import { useStore } from "../../store/useStore"
import type { NodeType } from "../../types/cognitive"

const NODE_COLORS: Record<NodeType, string> = {
  root: "#B85C3F",
  anchor: "#6E8F82",
  bridge: "#8F7FA8",
  branch: "#6F8AA8",
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
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <div className="px-6 py-5 border-b border-brain-border">
        <p
          className="text-[10px] uppercase tracking-[0.18em] mb-1"
          style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
        >
          작업
        </p>
        <h2
          className="text-[17px] tracking-[-0.01em]"
          style={{
            color: "var(--color-brain-text)",
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
          }}
        >
          도구
        </h2>
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* ─── STEP 1: 노드 만들기 / 편집 (context-aware) ─── */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10.5px]"
              style={{
                backgroundColor: "var(--color-brain-sage)",
                color: "#FFFFFF",
                fontWeight: 700,
              }}
            >
              1
            </span>
            <span
              className="text-[13.5px]"
              style={{
                color: "var(--color-brain-text)",
                fontWeight: 600,
              }}
            >
              {selectedNode ? "노드 편집" : "노드 만들기"}
            </span>
          </div>

          {selectedNode ? (
            <p
              className="text-[12px] mb-3 leading-relaxed"
              style={{ color: "var(--color-brain-text-muted)" }}
            >
              <span style={{ color: "var(--color-brain-text)", fontWeight: 500 }}>
                {selectedNode.concept}
              </span>
              <span> 의 역할을 변경합니다</span>
            </p>
          ) : (
            <p
              className="text-[12px] mb-3 leading-relaxed"
              style={{ color: "var(--color-brain-text-muted)" }}
            >
              역할을 고르고, 텍스트에서 단어를 캔버스에 보내세요
            </p>
          )}

          <div className="space-y-1.5">
            {(Object.keys(NODE_COLORS) as NodeType[]).map((type) => {
              const active = selectedNode
                ? selectedNode.type === type
                : nextNodeType === type
              return (
                <button
                  key={type}
                  onClick={() => {
                    if (selectedNode) {
                      updateNodeType(selectedNode.id, type)
                    } else {
                      setNextNodeType(type)
                      setTool("select")
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg text-[12.5px] cursor-pointer flex items-center gap-2.5 transition-all"
                  style={{
                    backgroundColor: active ? `${NODE_COLORS[type]}10` : "var(--color-brain-surface)",
                    border: `1px solid ${active ? NODE_COLORS[type] : "var(--color-brain-border)"}`,
                    color: active ? NODE_COLORS[type] : "var(--color-brain-text)",
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: NODE_COLORS[type] }} />
                  <span className="flex flex-col items-start">
                    <span style={{ fontWeight: 600 }}>
                      {NODE_TYPE_LABELS[type].name}
                    </span>
                    <span
                      style={{
                        color: "var(--color-brain-text-soft)",
                        fontSize: "11px",
                      }}
                    >
                      {NODE_TYPE_LABELS[type].desc}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ─── STEP 2: 선 잇기 / 선 편집 (context-aware) ─── */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10.5px]"
              style={{
                backgroundColor: "var(--color-brain-highlight)",
                color: "#FFFFFF",
                fontWeight: 700,
              }}
            >
              2
            </span>
            <span
              className="text-[13.5px]"
              style={{
                color: "var(--color-brain-text)",
                fontWeight: 600,
              }}
            >
              {selectedEdge ? "선 편집" : "선 잇기"}
            </span>
          </div>

          {selectedEdge ? (
            <p
              className="text-[12px] mb-3 leading-relaxed"
              style={{ color: "var(--color-brain-text-muted)" }}
            >
              <span style={{ color: "var(--color-brain-text)", fontWeight: 500 }}>
                {userNodes.find((n) => n.id === selectedEdge.from)?.concept}
              </span>
              <span style={{ color: "var(--color-brain-text-soft)" }}> → </span>
              <span style={{ color: "var(--color-brain-text)", fontWeight: 500 }}>
                {userNodes.find((n) => n.id === selectedEdge.to)?.concept}
              </span>
              <span> 의 연결어</span>
            </p>
          ) : (
            <button
              onClick={() => setTool(isConnecting ? "select" : "connect")}
              className="w-full px-4 py-2.5 rounded-lg text-[13px] cursor-pointer transition-all mb-3"
              style={{
                backgroundColor: isConnecting ? "var(--color-brain-highlight)" : "transparent",
                color: isConnecting ? "#FFFFFF" : "var(--color-brain-highlight)",
                border: `1px solid var(--color-brain-highlight)`,
                fontWeight: 500,
              }}
            >
              {isConnecting
                ? connectSourceId
                  ? "도착 노드를 클릭하세요"
                  : "시작 노드를 클릭하세요"
                : "두 노드 잇기 시작"}
            </button>
          )}

          <p
            className="text-[12px] mb-2"
            style={{ color: "var(--color-brain-text-muted)" }}
          >
            {selectedEdge
              ? "연결어를 선택하거나 입력하세요"
              : "선에 붙일 연결어를 고르세요"}
          </p>
          <input
            type="text"
            value={selectedEdge ? selectedEdge.label : nextEdgeLabel}
            onChange={(e) =>
              selectedEdge
                ? updateEdgeLabel(selectedEdge.id, e.target.value)
                : setNextEdgeLabel(e.target.value)
            }
            placeholder="직접 입력..."
            className="w-full px-3 py-2 rounded-lg text-[12.5px] mb-2"
            style={{
              backgroundColor: "var(--color-brain-surface)",
              color: "var(--color-brain-text)",
              border: "1px solid var(--color-brain-border)",
              outline: "none",
              fontFamily: "var(--font-sans)",
            }}
          />
          <div className="space-y-0.5" style={{ maxHeight: "150px", overflowY: "auto" }}>
            {connectives.map(({ word, role }) => {
              const currentLabel = selectedEdge ? selectedEdge.label : nextEdgeLabel
              const active = currentLabel === word
              return (
                <button
                  key={word}
                  onClick={() =>
                    selectedEdge
                      ? updateEdgeLabel(selectedEdge.id, word)
                      : setNextEdgeLabel(word)
                  }
                  className="w-full text-left px-2.5 py-1.5 rounded text-[12.5px] cursor-pointer transition-all flex justify-between items-center"
                  style={{
                    backgroundColor: active ? "rgba(198,138,61,0.08)" : "transparent",
                    color: active ? "var(--color-brain-highlight)" : "var(--color-brain-text-muted)",
                    border: `1px solid ${active ? "var(--color-brain-highlight)" : "transparent"}`,
                  }}
                >
                  <span style={{ fontWeight: active ? 500 : 400 }}>{word}</span>
                  <span
                    style={{
                      color: "var(--color-brain-text-soft)",
                      fontSize: "10.5px",
                      fontWeight: 500,
                    }}
                  >
                    {role}
                  </span>
                </button>
              )
            })}
          </div>

          {selectedEdge && (
            <button
              onClick={() => removeEdge(selectedEdge.id)}
              className="w-full mt-3 py-1.5 rounded-lg text-[12px] cursor-pointer transition-all"
              style={{
                backgroundColor: "transparent",
                color: "var(--color-brain-danger)",
                border: "1px solid rgba(160,83,63,0.3)",
              }}
            >
              선 삭제
            </button>
          )}
        </section>

        {/* ─── 평가 ─── */}
        <button
          onClick={() => setShowEvaluation(!showEvaluation)}
          disabled={userNodes.length < 2}
          className="w-full py-2.5 rounded-lg text-[13px] cursor-pointer transition-all"
          style={{
            backgroundColor: showEvaluation
              ? "var(--color-brain-success)"
              : userNodes.length < 2
                ? "var(--color-brain-surface-soft)"
                : "var(--color-brain-accent)",
            color: userNodes.length < 2
              ? "var(--color-brain-text-soft)"
              : "#FFFFFF",
            border: "none",
            opacity: userNodes.length < 2 ? 0.7 : 1,
            fontWeight: 500,
          }}
        >
          {showEvaluation ? "평가 닫기" : "내 인지 구조 평가받기"}
        </button>

        {/* ─── 안내 + 초기화 ─── */}
        <div
          className="rounded-lg border p-3.5"
          style={{
            borderColor: "var(--color-brain-border)",
            backgroundColor: "var(--color-brain-surface-soft)",
          }}
        >
          <p
            className="text-[12px] leading-relaxed mb-3"
            style={{
              color: "var(--color-brain-text-muted)",
            }}
          >
            인지 구조를 완성한 후, 분석 모드에서 가치 구조와 시간축을 확인해 보세요.
          </p>
          <div
            className="flex justify-between text-[11.5px] mb-3"
            style={{
              color: "var(--color-brain-text-muted)",
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span>노드 {userNodes.length}</span>
            <span>선 {userEdges.length}</span>
          </div>
          <button
            onClick={clearCanvas}
            className="w-full py-1.5 rounded-lg text-[12px] cursor-pointer transition-all"
            style={{
              backgroundColor: "transparent",
              color: "var(--color-brain-danger)",
              border: "1px solid rgba(160,83,63,0.3)",
            }}
          >
            초기화
          </button>
        </div>
      </div>
    </div>
  )
}
