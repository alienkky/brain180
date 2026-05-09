import { useCallback, useRef, useState, useEffect } from "react"
import { usePracticeStore } from "../../store/usePracticeStore"
import type { NodeType } from "../../types/cognitive"

const NODE_COLORS: Record<NodeType, string> = {
  root: "#ff6b6b",
  anchor: "#4ecdc4",
  bridge: "#a78bfa",
  branch: "#60a5fa",
}

const DIM_SIZES: Record<number, number> = { 1: 36, 2: 48, 3: 60, 4: 76 }

const EDGE_COLORS: Record<string, string> = {
  causes: "#ffd93d",
  supports: "#4ecdc4",
  contrasts: "#ff6b6b",
  transforms: "#a78bfa",
  contains: "#60a5fa",
}

export default function PracticeCanvas() {
  const {
    userNodes,
    userEdges,
    activeTool,
    selectedUserNodeId,
    connectSourceId,
    addNode,
    removeNode,
    moveNode,
    selectUserNode,
    startConnect,
    finishConnect,
  } = usePracticeStore()

  const svgRef = useRef<SVGSVGElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragOver, setIsDragOver] = useState(false)

  const getSvgPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    },
    []
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const word = e.dataTransfer.getData("text/plain")
      if (!word) return
      const { x, y } = getSvgPoint(e.clientX, e.clientY)
      addNode(word, x, y)
    },
    [addNode, getSvgPoint]
  )

  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (activeTool === "connect") {
        if (!connectSourceId) startConnect(nodeId)
        else finishConnect(nodeId)
        return
      }
      if (activeTool === "delete") {
        removeNode(nodeId)
        return
      }
      selectUserNode(nodeId)
      const node = usePracticeStore.getState().userNodes.find((n) => n.id === nodeId)
      if (!node) return
      const { x, y } = getSvgPoint(e.clientX, e.clientY)
      setDragOffset({ x: x - node.x, y: y - node.y })
      setDragId(nodeId)
    },
    [activeTool, connectSourceId, startConnect, finishConnect, removeNode, selectUserNode, getSvgPoint]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragId) return
      const { x, y } = getSvgPoint(e.clientX, e.clientY)
      moveNode(dragId, x - dragOffset.x, y - dragOffset.y)
    },
    [dragId, dragOffset, moveNode, getSvgPoint]
  )

  const handleMouseUp = useCallback(() => {
    setDragId(null)
  }, [])

  const handleSvgClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === svgRef.current) {
        selectUserNode(null)
        usePracticeStore.setState({ connectSourceId: null })
      }
    },
    [selectUserNode]
  )

  const [size, setSize] = useState({ w: 800, h: 600 })
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-brain-border">
        <h2 className="text-lg font-semibold" style={{ color: "#e0e0f0" }}>
          나의 인지 구조
        </h2>
        <p className="text-xs" style={{ color: "rgba(224,224,240,0.5)" }}>
          {activeTool === "select" && "노드를 드래그하여 배치하세요"}
          {activeTool === "connect" && (connectSourceId ? "연결할 대상 노드를 클릭하세요" : "시작 노드를 클릭하세요")}
          {activeTool === "delete" && "삭제할 노드를 클릭하세요"}
        </p>
      </div>
      <div
        ref={containerRef}
        className="flex-1 min-h-0 relative"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        style={{
          backgroundColor: isDragOver ? "rgba(255,107,107,0.05)" : "transparent",
          transition: "background-color 0.2s",
        }}
      >
        {userNodes.length === 0 && !isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center" style={{ color: "rgba(224,224,240,0.2)" }}>
              <p className="text-4xl mb-3">↓</p>
              <p className="text-sm">왼쪽 텍스트에서 단어를 동그라미 친 후</p>
              <p className="text-sm">이 캔버스로 드래그하세요</p>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          width={size.w}
          height={size.h}
          className="absolute inset-0"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleSvgClick}
          style={{ cursor: activeTool === "connect" ? "crosshair" : activeTool === "delete" ? "not-allowed" : "default" }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#9090b0" />
            </marker>
          </defs>

          {userEdges.map((edge, i) => {
            const from = userNodes.find((n) => n.id === edge.from)
            const to = userNodes.find((n) => n.id === edge.to)
            if (!from || !to) return null
            const color = EDGE_COLORS[edge.relation] ?? "#9090b0"
            const midX = (from.x + to.x) / 2
            const midY = (from.y + to.y) / 2
            return (
              <g key={`edge-${i}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={color}
                  strokeWidth={2}
                  markerEnd="url(#arrowhead)"
                  opacity={0.7}
                />
                <text
                  x={midX}
                  y={midY - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#9090b0"
                >
                  {edge.relation}
                </text>
              </g>
            )
          })}

          {connectSourceId && (() => {
            const src = userNodes.find((n) => n.id === connectSourceId)
            if (!src) return null
            return (
              <circle
                cx={src.x}
                cy={src.y}
                r={DIM_SIZES[src.dimensionality] / 2 + 8}
                fill="none"
                stroke="#ffd93d"
                strokeWidth={2}
                strokeDasharray="4 4"
                className="animate-pulse"
              >
                <animate attributeName="stroke-dashoffset" values="0;8" dur="0.6s" repeatCount="indefinite" />
              </circle>
            )
          })()}

          {userNodes.map((node) => {
            const r = DIM_SIZES[node.dimensionality] / 2
            const isSelected = selectedUserNodeId === node.id
            const color = NODE_COLORS[node.type]
            return (
              <g
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                style={{ cursor: activeTool === "select" ? "grab" : "pointer" }}
              >
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r + 6}
                    fill="none"
                    stroke="#ffd93d"
                    strokeWidth={2}
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={color}
                  stroke="#2a2a4a"
                  strokeWidth={2}
                  opacity={0.9}
                />
                <text
                  x={node.x}
                  y={node.y + r + 16}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#e0e0f0"
                >
                  {node.concept}
                </text>
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill="rgba(255,255,255,0.7)"
                  fontWeight="bold"
                >
                  {node.dimensionality}D
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
