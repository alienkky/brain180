import { useEffect, useRef, useCallback, useState } from "react"
import cytoscape from "cytoscape"
import type { Core } from "cytoscape"
import { usePracticeStore } from "../../store/usePracticeStore"
import type { NodeType } from "../../types/cognitive"

const NODE_COLORS: Record<NodeType, string> = {
  root: "#B85C3F",
  anchor: "#6E8F82",
  bridge: "#8F7FA8",
  branch: "#6F8AA8",
}

// One-step-darker variants for the selected/highlighted ring
const NODE_COLORS_DARK: Record<NodeType, string> = {
  root: "#8A4530",
  anchor: "#4F6B61",
  bridge: "#6A5E80",
  branch: "#4F6680",
}

function nodeSize(label: string): number {
  const len = (label || "").length
  return Math.max(58, Math.min(105, len * 14))
}

// 2D point-to-segment distance, used for edge hit-testing
function pointToSegmentDistance(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

const EDGE_HIT_TOLERANCE = 16  // px from line in rendered coords

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
    setTool,
    updateNodeConcept,
    updateEdgeLabel,
  } = usePracticeStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const prevTopologyRef = useRef<string>("")
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFit = useCallback(() => {
    const cy = cyRef.current
    if (!cy || cy.nodes().length === 0) return
    cy.animate({ fit: { eles: cy.elements(), padding: 40 }, duration: 300 })
  }, [])

  const rebuildGraph = useCallback(() => {
    const cy = cyRef.current
    if (!cy) return

    // Topology = which nodes/edges exist + edge endpoints. If unchanged,
    // skip layout re-run so manual positions and dragged-in labels persist.
    const topology = JSON.stringify({
      n: userNodes.map((n) => n.id).sort(),
      e: userEdges.map((e) => `${e.id}:${e.from}-${e.to}`).sort(),
    })
    const topologyChanged = topology !== prevTopologyRef.current
    prevTopologyRef.current = topology

    if (!topologyChanged) {
      // Pure data update — labels, concepts, types
      userNodes.forEach((n) => {
        const ele = cy.getElementById(n.id)
        if (ele.length) {
          ele.data("label", n.concept)
          ele.data("nodeType", n.type)
        }
      })
      userEdges.forEach((e) => {
        const ele = cy.getElementById(e.id)
        if (ele.length) ele.data("label", e.label)
      })
      return
    }

    // Diff: snapshot existing ids before any mutation
    const existingNodeIds = new Set<string>()
    cy.nodes().forEach((n) => { existingNodeIds.add(n.id()) })
    const existingEdgeIds = new Set<string>()
    cy.edges().forEach((e) => { existingEdgeIds.add(e.id()) })

    const keepNodeIds = new Set(userNodes.map((n) => n.id))
    const keepEdgeIds = new Set(userEdges.map((e) => e.id))

    // Remove deleted elements (preserves positions of surviving nodes)
    cy.nodes().forEach((n) => { if (!keepNodeIds.has(n.id())) n.remove() })
    cy.edges().forEach((e) => { if (!keepEdgeIds.has(e.id())) e.remove() })

    // Update surviving nodes' data
    userNodes.forEach((node) => {
      const ele = cy.getElementById(node.id)
      if (ele.length) {
        ele.data("label", node.concept)
        ele.data("nodeType", node.type)
      }
    })

    // New nodes → place at viewport center with small scatter
    const pan = cy.pan()
    const zoom = cy.zoom()
    const vcx = (cy.width() / 2 - pan.x) / zoom
    const vcy = (cy.height() / 2 - pan.y) / zoom

    userNodes.forEach((node) => {
      if (!existingNodeIds.has(node.id)) {
        const angle = Math.random() * 2 * Math.PI
        const radius = 30 + Math.random() * 50
        cy.add({
          data: { id: node.id, label: node.concept, nodeType: node.type },
          position: { x: vcx + Math.cos(angle) * radius, y: vcy + Math.sin(angle) * radius },
        })
      }
    })

    // New edges
    userEdges.forEach((edge) => {
      if (!existingEdgeIds.has(edge.id)) {
        cy.add({
          data: { id: edge.id, source: edge.from, target: edge.to, label: edge.label },
        })
      } else {
        const ele = cy.getElementById(edge.id)
        if (ele.length) ele.data("label", edge.label)
      }
    })
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
              return len > 5 ? "11px" : "13px"
            },
            "font-family": "Noto Serif KR, Fraunces, Georgia, serif",
            "font-weight": 500,
            color: "#FFFFFF",
            "text-valign": "center",
            "text-halign": "center",
            "background-color": (ele: cytoscape.NodeSingular) =>
              NODE_COLORS[ele.data("nodeType") as NodeType] ?? "#6F8AA8",
            "background-opacity": 0.95,
            width: (ele: cytoscape.NodeSingular) =>
              nodeSize(ele.data("label")),
            height: (ele: cytoscape.NodeSingular) =>
              nodeSize(ele.data("label")),
            "border-width": 1,
            "border-color": "#FFFFFF",
            "border-opacity": 0.5,
            "overlay-opacity": 0,
            "overlay-color": "transparent",
            "overlay-padding": 0,
            "transition-property": "background-color, border-color, border-width, width, height",
            "transition-duration": 200,
          } as cytoscape.Css.Node,
        },
        {
          selector: "node:active",
          style: {
            "overlay-opacity": 0,
          },
        },
        {
          selector: "node.highlighted",
          style: {
            "border-width": 2.5,
            "border-color": (ele: cytoscape.NodeSingular) =>
              NODE_COLORS_DARK[ele.data("nodeType") as NodeType] ?? "#4F6680",
            "border-opacity": 1,
          },
        },
        {
          selector: "node.connect-source",
          style: {
            "border-width": 2.5,
            "border-color": (ele: cytoscape.NodeSingular) =>
              NODE_COLORS_DARK[ele.data("nodeType") as NodeType] ?? "#4F6680",
            "border-style": "dashed",
            "border-opacity": 1,
          },
        },
        {
          selector: "node.dimmed",
          style: { opacity: 0.25 },
        },
        {
          selector: "node.drop-target",
          style: {
            "border-width": 4,
            "border-color": "#B85C3F",
            "border-opacity": 1,
            "border-style": "dashed",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#C68A3D",
            "line-opacity": 0.7,
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#C68A3D",
            "arrow-scale": 0.9,
            "curve-style": "bezier",
            // Spread parallel edges so 3-4 edges between same pair don't stack
            "control-point-step-size": 55,
            label: "data(label)",
            "font-family": "Noto Serif KR, Fraunces, Georgia, serif",
            "font-style": "italic",
            // Shrink label font when edge is too short for the text.
            // Korean glyphs are ~1em wide so multiplier 0.9 gives a small
            // safety margin while still shrinking aggressively when nodes
            // get pushed close together.
            "font-size": (ele: cytoscape.EdgeSingular) => {
              const src = ele.source().renderedPosition()
              const tgt = ele.target().renderedPosition()
              const dist = Math.hypot(tgt.x - src.x, tgt.y - src.y)
              const len = ((ele.data("label") || "") as string).length
              if (len === 0) return "9px"
              const srcW = ele.source().renderedWidth()
              const tgtW = ele.target().renderedWidth()
              const usable = Math.max(15, dist - (srcW + tgtW) / 2)
              const maxFont = Math.floor((usable / len) * 0.9)
              return `${Math.max(7, Math.min(10, maxFont))}px`
            },
            "text-wrap": "wrap",
            "text-max-width": (ele: cytoscape.EdgeSingular) => {
              const src = ele.source().renderedPosition()
              const tgt = ele.target().renderedPosition()
              const dist = Math.hypot(tgt.x - src.x, tgt.y - src.y)
              const srcW = ele.source().renderedWidth()
              const tgtW = ele.target().renderedWidth()
              const usable = Math.max(28, dist - (srcW + tgtW) / 2)
              return `${usable}px`
            },
            color: "#6E6557",
            "text-rotation": "autorotate",
            "text-margin-y": -9,
            "text-background-opacity": 0,
          } as cytoscape.Css.Edge,
        },
        {
          selector: "edge.selected-edge",
          style: {
            width: 2.5,
            "line-color": "#B85C3F",
            "line-opacity": 1,
            "target-arrow-color": "#B85C3F",
            color: "#B85C3F",
          },
        },
        {
          selector: "edge.drop-target",
          style: {
            width: 4,
            "line-color": "#B85C3F",
            "line-opacity": 1,
            "line-style": "dashed",
            "target-arrow-color": "#B85C3F",
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

    // Edge label font-size/text-max-width are functions of rendered node
    // distance. Cytoscape doesn't re-evaluate style functions on position
    // changes by default, so trigger a manual style update whenever a node
    // moves or the viewport pans/zooms.
    const recomputeEdgeStyles = () => {
      try { cy.style().update() } catch {}
    }
    cy.on("position", "node", recomputeEdgeStyles)
    cy.on("zoom pan", recomputeEdgeStyles)

    cyRef.current = cy
    return () => {
      try { cy.stop() } catch {}
      // Defer destroy past the current rAF loop so any pending layout
      // animation frames don't fire on a null renderer.
      setTimeout(() => {
        try { cy.destroy() } catch {}
      }, 0)
    }
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

  // Returns the cytoscape element under the given container-relative point,
  // preferring nodes (rendered bounding box) over edges (within tolerance).
  const elementAt = useCallback(
    (x: number, y: number): cytoscape.NodeSingular | cytoscape.EdgeSingular | null => {
      const cy = cyRef.current
      if (!cy) return null

      let hitNode: cytoscape.NodeSingular | null = null
      cy.nodes().forEach((n) => {
        if (hitNode) return
        const bb = n.renderedBoundingBox()
        if (x >= bb.x1 && x <= bb.x2 && y >= bb.y1 && y <= bb.y2) {
          hitNode = n
        }
      })
      if (hitNode) return hitNode

      let hitEdge: cytoscape.EdgeSingular | null = null
      let bestDist = Infinity
      cy.edges().forEach((eEle) => {
        const src = eEle.source().renderedPosition()
        const tgt = eEle.target().renderedPosition()
        const d = pointToSegmentDistance(x, y, src.x, src.y, tgt.x, tgt.y)
        if (d < EDGE_HIT_TOLERANCE && d < bestDist) {
          hitEdge = eEle
          bestDist = d
        }
      })
      return hitEdge
    },
    []
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)

    const cy = cyRef.current
    if (!cy) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const target = elementAt(x, y)

    cy.elements(".drop-target").removeClass("drop-target")
    if (target) target.addClass("drop-target")
  }, [elementAt])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
    const cy = cyRef.current
    if (cy) cy.elements(".drop-target").removeClass("drop-target")
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const word = e.dataTransfer.getData("text/plain")

    const cy = cyRef.current
    if (cy) cy.elements(".drop-target").removeClass("drop-target")
    if (!word) return

    if (cy) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const target = elementAt(x, y)
      if (target) {
        if (target.isNode()) {
          updateNodeConcept(target.id(), word)
        } else if (target.isEdge()) {
          updateEdgeLabel(target.id(), word)
        }
        return
      }
    }
    addNode(word)
  }, [addNode, elementAt, updateNodeConcept, updateEdgeLabel])

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-4 border-b border-brain-border flex items-center justify-between">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.18em] mb-1.5"
            style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
          >
            캔버스
          </p>
          <h2
            className="text-[20px] tracking-[-0.01em]"
            style={{
              color: "var(--color-brain-text)",
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
            }}
          >
            나의 인지 구조
          </h2>
          <p
            className="text-[12px] mt-1"
            style={{
              color: "var(--color-brain-text-muted)",
            }}
          >
            {activeTool === "select" && "노드 드래그로 배치 · 핀치로 확대/축소"}
            {activeTool === "connect" && (connectSourceId ? "도착 노드를 클릭하세요" : "시작 노드를 클릭하세요")}
            {activeTool === "delete" && "삭제할 노드 또는 선을 클릭"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {([
            { tool: "select", icon: "↖", label: "선택" },
            { tool: "delete", icon: "✕", label: "삭제" },
          ] as const).map(({ tool, icon, label }) => {
            const active = activeTool === tool
            const isDelete = tool === "delete"
            return (
              <button
                key={tool}
                onClick={() => setTool(tool)}
                className="px-3 h-8 rounded-full text-[12px] cursor-pointer flex items-center gap-1.5 transition-all"
                style={{
                  backgroundColor: active
                    ? isDelete ? "rgba(184,92,63,0.10)" : "var(--color-brain-surface-soft)"
                    : "transparent",
                  color: active
                    ? isDelete ? "var(--color-brain-accent)" : "var(--color-brain-text)"
                    : "var(--color-brain-text-soft)",
                  border: `1px solid ${active
                    ? isDelete ? "var(--color-brain-accent)" : "var(--color-brain-border-strong)"
                    : "var(--color-brain-border)"}`,
                  fontWeight: 500,
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>
                <span>{label}</span>
              </button>
            )
          })}
          {userNodes.length > 0 && (
            <button
              onClick={handleFit}
              className="px-3 h-8 rounded-full text-[12px] cursor-pointer flex items-center gap-1.5 transition-all"
              style={{
                backgroundColor: "transparent",
                color: "var(--color-brain-text-muted)",
                border: "1px solid var(--color-brain-border-strong)",
                fontWeight: 500,
              }}
              title="다이어그램을 화면에 맞춤"
            >
              <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>⤢</span>
              <span>맞춤</span>
            </button>
          )}
        </div>
      </div>
      <div
        className="flex-1 min-h-0 relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          backgroundColor: isDragOver ? "rgba(184,92,63,0.04)" : "transparent",
          transition: "background-color 0.2s",
          cursor: activeTool === "connect" ? "crosshair" : activeTool === "delete" ? "not-allowed" : "default",
        }}
      >
        {userNodes.length === 0 && !isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-center" style={{ color: "var(--color-brain-text-soft)" }}>
              <p
                className="text-[40px] mb-4 leading-none"
                style={{ color: "var(--color-brain-border-strong)" }}
              >
                ↓
              </p>
              <p className="text-[13.5px]">
                왼쪽 텍스트에서 단어를 동그라미 친 후
              </p>
              <p className="text-[13.5px] mt-1">
                더블탭 또는 드래그로 캔버스에 추가
              </p>
              <p
                className="text-[12px] mt-3"
                style={{ color: "var(--color-brain-text-soft)" }}
              >
                노드 위에 드롭 = 텍스트 교체  ·  선 위에 드롭 = 연결어 변경
              </p>
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
