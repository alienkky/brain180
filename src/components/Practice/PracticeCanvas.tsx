import { useEffect, useRef, useCallback, useState } from "react"
import cytoscape from "cytoscape"
import type { Core } from "cytoscape"
import { usePracticeStore } from "../../store/usePracticeStore"
import type { NodeType } from "../../types/cognitive"

const NODE_COLORS: Record<NodeType, string> = {
  root: "#ff6b6b",
  anchor: "#4ecdc4",
  bridge: "#a78bfa",
  branch: "#60a5fa",
}

const NODE_TEXT_COLORS: Record<NodeType, string> = {
  root: "#fff",
  anchor: "#0f0f1a",
  bridge: "#fff",
  branch: "#0f0f1a",
}

function nodeSize(label: string): number {
  const len = (label || "").length
  return Math.max(55, Math.min(100, len * 14))
}

export default function PracticeCanvas() {
  const {
    userNodes,
    userEdges,
    activeTool,
    connectSourceId,
    selectedUserNodeId,
    selectedEdgeId,
    addNode,
    removeNode,
    removeEdge,
    selectUserNode,
    selectEdge,
    startConnect,
    finishConnect,
  } = usePracticeStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFit = useCallback(() => {
    const cy = cyRef.current
    if (!cy || cy.nodes().length === 0) return
    cy.animate({ fit: { eles: cy.elements(), padding: 40 }, duration: 300 })
  }, [])

  const rebuildGraph = useCallback(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.elements().remove()

    userNodes.forEach((node) => {
      cy.add({
        data: {
          id: node.id,
          label: node.concept,
          nodeType: node.type,
        },
      })
    })

    userEdges.forEach((edge) => {
      cy.add({
        data: {
          id: edge.id,
          source: edge.from,
          target: edge.to,
          label: edge.label,
        },
      })
    })

    if (userNodes.length > 0) {
      cy.layout({
        name: "cose",
        animate: true,
        animationDuration: 500,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 180,
        gravity: 0.3,
        padding: 40,
        fit: true,
      } as cytoscape.CoseLayoutOptions).run()
    }
  }, [userNodes, userEdges])

  useEffect(() => {
    if (!containerRef.current) return

    const cy = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-wrap": "wrap",
            "text-max-width": (ele: cytoscape.NodeSingular) =>
              `${nodeSize(ele.data("label")) * 0.8}px`,
            "font-size": (ele: cytoscape.NodeSingular) => {
              const len = (ele.data("label") || "").length
              return len > 5 ? "10px" : "12px"
            },
            "font-weight": "bold",
            color: (ele: cytoscape.NodeSingular) =>
              NODE_TEXT_COLORS[ele.data("nodeType") as NodeType] ?? "#0f0f1a",
            "text-valign": "center",
            "text-halign": "center",
            "background-color": (ele: cytoscape.NodeSingular) =>
              NODE_COLORS[ele.data("nodeType") as NodeType] ?? "#60a5fa",
            width: (ele: cytoscape.NodeSingular) =>
              nodeSize(ele.data("label")),
            height: (ele: cytoscape.NodeSingular) =>
              nodeSize(ele.data("label")),
            "border-width": 2,
            "border-color": "#2a2a4a",
            "transition-property": "background-color, border-color, width, height",
            "transition-duration": 200,
          } as cytoscape.Css.Node,
        },
        {
          selector: "node.highlighted",
          style: {
            "border-width": 4,
            "border-color": "#ffd93d",
          },
        },
        {
          selector: "node.connect-source",
          style: {
            "border-width": 4,
            "border-color": "#ffd93d",
            "border-style": "dashed",
          },
        },
        {
          selector: "node.dimmed",
          style: { opacity: 0.2 },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#ffd93d",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#ffd93d",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "11px",
            color: "#ffd93d",
            "text-rotation": "autorotate",
            "text-margin-y": -12,
            "font-weight": "bold",
            "text-background-color": "#0f0f1a",
            "text-background-opacity": 0.8,
            "text-background-padding": 3,
          } as cytoscape.Css.Edge,
        },
        {
          selector: "edge.selected-edge",
          style: {
            width: 4,
            "line-color": "#ff6b6b",
            "target-arrow-color": "#ff6b6b",
            color: "#ff6b6b",
          },
        },
      ],
      layout: { name: "preset" },
      minZoom: 0.3,
      maxZoom: 3,
      userPanningEnabled: true,
      userZoomingEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false,
    })

    cy.on("tap", "node", (evt) => {
      const nodeId = evt.target.id()
      const tool = usePracticeStore.getState().activeTool
      const srcId = usePracticeStore.getState().connectSourceId

      if (tool === "delete") {
        removeNode(nodeId)
        return
      }
      if (tool === "connect") {
        if (!srcId) startConnect(nodeId)
        else finishConnect(nodeId)
        return
      }
      selectUserNode(nodeId)
    })

    cy.on("tap", "edge", (evt) => {
      const edgeId = evt.target.id()
      const tool = usePracticeStore.getState().activeTool
      if (tool === "delete") {
        removeEdge(edgeId)
        return
      }
      selectEdge(edgeId)
    })

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        selectUserNode(null)
        selectEdge(null)
        usePracticeStore.setState({ connectSourceId: null })
      }
    })

    cyRef.current = cy
    return () => { cy.destroy() }
  }, [])

  useEffect(() => { rebuildGraph() }, [rebuildGraph])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.nodes().removeClass("highlighted connect-source dimmed")
    cy.edges().removeClass("selected-edge")

    if (connectSourceId) {
      const src = cy.getElementById(connectSourceId)
      if (src.length) src.addClass("connect-source")
    }
    if (selectedUserNodeId) {
      const sel = cy.getElementById(selectedUserNodeId)
      if (sel.length) {
        sel.addClass("highlighted")
        const connected = sel.neighborhood()
        cy.nodes().not(sel).not(connected.nodes()).addClass("dimmed")
      }
    }
    if (selectedEdgeId) {
      const edge = cy.getElementById(selectedEdgeId)
      if (edge.length) edge.addClass("selected-edge")
    }
  }, [selectedUserNodeId, selectedEdgeId, connectSourceId, userNodes, userEdges])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const word = e.dataTransfer.getData("text/plain")
    if (!word) return
    addNode(word)
  }, [addNode])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-brain-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "#e0e0f0" }}>
            나의 인지 구조
          </h2>
          <p className="text-xs" style={{ color: "rgba(224,224,240,0.5)" }}>
            {activeTool === "select" && "노드 드래그 = 배치 | 핀치 = 확대/축소"}
            {activeTool === "connect" && (connectSourceId ? "도착 노드를 클릭하세요" : "시작 노드를 클릭하세요")}
            {activeTool === "delete" && "삭제할 노드 또는 선을 클릭"}
          </p>
        </div>
        {userNodes.length > 0 && (
          <button
            onClick={handleFit}
            className="px-2.5 py-1.5 rounded text-xs font-medium cursor-pointer"
            style={{
              backgroundColor: "rgba(224,224,240,0.08)",
              color: "rgba(224,224,240,0.6)",
              border: "1px solid rgba(224,224,240,0.15)",
            }}
            title="다이어그램을 화면에 맞춤"
          >
            ⊞ 맞춤
          </button>
        )}
      </div>
      <div
        className="flex-1 min-h-0 relative"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        style={{
          backgroundColor: isDragOver ? "rgba(255,107,107,0.05)" : "transparent",
          transition: "background-color 0.2s",
          cursor: activeTool === "connect" ? "crosshair" : activeTool === "delete" ? "not-allowed" : "default",
        }}
      >
        {userNodes.length === 0 && !isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-center" style={{ color: "rgba(224,224,240,0.2)" }}>
              <p className="text-4xl mb-3">↓</p>
              <p className="text-sm">왼쪽 텍스트에서 단어를 동그라미 친 후</p>
              <p className="text-sm">↗ 버튼 또는 드래그로 캔버스에 추가</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0">
          <div ref={containerRef} style={{ width: "100%", height: "100%", touchAction: "none" }} />
        </div>
      </div>
    </div>
  )
}
