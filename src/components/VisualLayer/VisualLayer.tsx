import { useEffect, useRef } from "react"
import cytoscape from "cytoscape"
import type { Core } from "cytoscape"
import { useStore } from "../../store/useStore"
import type { NodeType, EdgeRelation, ValueType, Perspective } from "../../types/cognitive"

const NODE_COLORS: Record<NodeType, string> = {
  root: "#ff6b6b",
  anchor: "#4ecdc4",
  bridge: "#a78bfa",
  branch: "#60a5fa",
}

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

const TEMPORAL_COLORS: Record<number, string> = {
  1: "#94a3b8",
  2: "#fbbf24",
  3: "#34d399",
}

const EDGE_COLORS: Record<EdgeRelation, string> = {
  causes: "#ffd93d",
  supports: "#4ecdc4",
  contrasts: "#ff6b6b",
  transforms: "#a78bfa",
  contains: "#60a5fa",
}

const EDGE_STYLES: Record<EdgeRelation, string> = {
  causes: "solid",
  supports: "dashed",
  contrasts: "dotted",
  transforms: "solid",
  contains: "dashed",
}

function getNodeColor(ele: cytoscape.NodeSingular, perspective: Perspective): string {
  if (perspective === "value") {
    const vt = ele.data("valueType") as ValueType | undefined
    return vt ? VALUE_COLORS[vt] ?? "#94a3b8" : "#94a3b8"
  }
  if (perspective === "temporal") {
    const tp = ele.data("temporalPhase") as number | undefined
    return tp ? TEMPORAL_COLORS[tp] ?? "#94a3b8" : "#94a3b8"
  }
  return NODE_COLORS[ele.data("nodeType") as NodeType] ?? "#60a5fa"
}

const NODE_TEXT_COLORS: Record<NodeType, string> = {
  root: "#fff",
  anchor: "#0f0f1a",
  bridge: "#fff",
  branch: "#0f0f1a",
}

function getNodeTextColor(ele: cytoscape.NodeSingular, perspective: Perspective): string {
  if (perspective === "cognitive") {
    return NODE_TEXT_COLORS[ele.data("nodeType") as NodeType] ?? "#0f0f1a"
  }
  const bg = getNodeColor(ele, perspective)
  const dark = ["#94a3b8", "#fbbf24", "#34d399", "#2dd4bf", "#f472b6"]
  return dark.includes(bg) ? "#0f0f1a" : "#fff"
}

function getNodeLabel(ele: cytoscape.NodeSingular, _perspective: Perspective): string {
  const concept = ele.data("label") as string
  return concept
}

function nodeSize(label: string, dim: number): number {
  const len = (label || "").length
  const base = Math.max(55, Math.min(100, len * 14))
  return base + dim * 6
}

const PERSPECTIVE_LABELS: Record<Perspective, string> = {
  cognitive: "인지 구조 관점",
  value: "가치 구조 관점",
  temporal: "시간축 관점",
}

export default function VisualLayer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const {
    currentMap,
    perspective,
    selectedNodeIds,
    hoveredNodeId,
    selectNode,
    hoverNode,
  } = useStore()

  useEffect(() => {
    if (!containerRef.current) return

    const temporalPositions: Record<string, { x: number; y: number }> = {}
    if (perspective === "temporal") {
      const phases = [1, 2, 3]
      const phaseSpacing = 220
      phases.forEach((phase) => {
        const phaseNodes = currentMap.nodes.filter((n) => n.temporalPhase === phase)
        const nodeSpacing = 120
        const totalHeight = (phaseNodes.length - 1) * nodeSpacing
        phaseNodes.forEach((node, idx) => {
          temporalPositions[node.id] = {
            x: (phase - 1) * phaseSpacing,
            y: idx * nodeSpacing - totalHeight / 2,
          }
        })
      })
    }

    const layoutOptions =
      perspective === "temporal"
        ? {
            name: "preset" as const,
            positions: (node: cytoscape.NodeSingular) =>
              temporalPositions[node.id()] ?? { x: 0, y: 0 },
            fit: true,
            padding: 50,
            animate: true,
            animationDuration: 600,
          }
        : {
            name: "cose" as const,
            animate: true,
            animationDuration: 800,
            nodeRepulsion: () => 8000,
            idealEdgeLength: () => 150,
            gravity: 0.3,
            padding: 40,
          }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...currentMap.nodes.map((node) => ({
          data: {
            id: node.id,
            label: node.concept,
            nodeType: node.type,
            dim: node.dimensionality,
            description: node.description,
            valueType: node.valueType,
            valueDescription: node.valueDescription,
            temporalPhase: node.temporalPhase,
          },
        })),
        ...currentMap.edges.map((edge, i) => ({
          data: {
            id: `e-${i}`,
            source: edge.from,
            target: edge.to,
            label: edge.label ?? "",
            relation: edge.relation,
            temporalOrder: edge.temporalOrder,
          },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            label: (ele: cytoscape.NodeSingular) => getNodeLabel(ele, perspective),
            "text-wrap": "wrap",
            "text-max-width": (ele: cytoscape.NodeSingular) =>
              `${nodeSize(ele.data("label"), ele.data("dim")) * 0.8}px`,
            "font-size": (ele: cytoscape.NodeSingular) => {
              const len = (ele.data("label") || "").length
              return len > 5 ? "10px" : "12px"
            },
            "font-weight": "bold",
            color: (ele: cytoscape.NodeSingular) =>
              getNodeTextColor(ele, perspective),
            "text-valign": "center",
            "text-halign": "center",
            "background-color": (ele: cytoscape.NodeSingular) =>
              getNodeColor(ele, perspective),
            width: (ele: cytoscape.NodeSingular) =>
              nodeSize(ele.data("label"), ele.data("dim")),
            height: (ele: cytoscape.NodeSingular) =>
              nodeSize(ele.data("label"), ele.data("dim")),
            "border-width": 2,
            "border-color": "#2a2a4a",
            "transition-property":
              "background-color, border-color, width, height, opacity",
            "transition-duration": 200,
          } as cytoscape.Css.Node,
        },
        {
          selector: "node:selected, node.highlighted",
          style: {
            "border-width": 4,
            "border-color": "#ffd93d",
            "background-opacity": 1,
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
            "line-color": (ele: cytoscape.EdgeSingular) =>
              EDGE_COLORS[ele.data("relation") as EdgeRelation] ?? "#4a4a6a",
            "line-style": (ele: cytoscape.EdgeSingular) =>
              EDGE_STYLES[ele.data("relation") as EdgeRelation] ?? "solid",
            "target-arrow-shape": "triangle",
            "target-arrow-color": (ele: cytoscape.EdgeSingular) =>
              EDGE_COLORS[ele.data("relation") as EdgeRelation] ?? "#4a4a6a",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "10px",
            color: "#9090b0",
            "text-rotation": "autorotate",
            "text-margin-y": -10,
          } as cytoscape.Css.Edge,
        },
        {
          selector: "edge.dimmed",
          style: { opacity: 0.1 },
        },
      ],
      layout: layoutOptions as cytoscape.LayoutOptions,
    })

    cy.on("tap", "node", (evt) => selectNode(evt.target.id()))
    cy.on("mouseover", "node", (evt) => hoverNode(evt.target.id()))
    cy.on("mouseout", "node", () => hoverNode(null))
    cy.on("tap", (evt) => {
      if (evt.target === cy) useStore.getState().clearSelection()
    })

    cyRef.current = cy
    return () => { cy.destroy() }
  }, [currentMap, perspective])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.nodes().removeClass("highlighted dimmed")
    cy.edges().removeClass("dimmed")

    const activeIds = selectedNodeIds.length > 0 ? selectedNodeIds : (hoveredNodeId ? [hoveredNodeId] : [])

    if (activeIds.length > 0) {
      const activeNodes = cy.collection()
      activeIds.forEach((id) => {
        const n = cy.getElementById(id)
        if (n.length) {
          n.addClass("highlighted")
          activeNodes.merge(n)
        }
      })
      const connected = activeNodes.neighborhood()
      cy.nodes().not(activeNodes).not(connected.nodes()).addClass("dimmed")
      cy.edges().not(connected.edges()).addClass("dimmed")
    }
  }, [selectedNodeIds, hoveredNodeId])

  const handleFit = () => {
    const cy = cyRef.current
    if (!cy || cy.nodes().length === 0) return
    cy.animate({ fit: { eles: cy.elements(), padding: 40 }, duration: 300 })
  }

  const PERSPECTIVE_DESCRIPTIONS: Record<Perspective, string> = {
    cognitive: "저자가 어떻게 생각하는가 — 개념 간 논리적 관계망",
    value: "저자가 무엇을 중시하는가 — 개념에 담긴 가치의 흐름",
    temporal: "사고가 어떤 순서로 전개되는가 — 시간축 변환",
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-brain-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-brain-text">
            {PERSPECTIVE_LABELS[perspective]}
          </h2>
          <p className="text-xs" style={{ color: "rgba(224,224,240,0.4)" }}>
            {PERSPECTIVE_DESCRIPTIONS[perspective]}
          </p>
        </div>
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
      </div>
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  )
}
