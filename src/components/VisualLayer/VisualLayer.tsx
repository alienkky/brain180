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

function getNodeLabel(ele: cytoscape.NodeSingular, perspective: Perspective): string {
  const concept = ele.data("label") as string
  if (perspective === "value") {
    const vt = ele.data("valueType") as string | undefined
    return vt ? `${concept}\n[${vt}]` : concept
  }
  if (perspective === "temporal") {
    const tp = ele.data("temporalPhase") as number | undefined
    const phaseNames: Record<number, string> = { 1: "전", 2: "촉매", 3: "후" }
    return tp ? `${concept}\n〈${phaseNames[tp] ?? tp}〉` : concept
  }
  return concept
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

    const layoutName = perspective === "temporal" ? "grid" : "cose"

    const layoutOptions =
      perspective === "temporal"
        ? {
            name: "grid" as const,
            animate: true,
            animationDuration: 600,
            padding: 50,
            rows: 1,
            sort: (a: cytoscape.NodeSingular, b: cytoscape.NodeSingular) =>
              (a.data("temporalPhase") ?? 0) - (b.data("temporalPhase") ?? 0),
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
            "text-max-width": "120px",
            "font-size": "12px",
            color: "#e0e0f0",
            "text-valign": "bottom",
            "text-margin-y": 8,
            "background-color": (ele: cytoscape.NodeSingular) =>
              getNodeColor(ele, perspective),
            width: (ele: cytoscape.NodeSingular) => 20 + ele.data("dim") * 12,
            height: (ele: cytoscape.NodeSingular) => 20 + ele.data("dim") * 12,
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

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-brain-border">
        <h2 className="text-lg font-semibold text-brain-text">
          {PERSPECTIVE_LABELS[perspective]}
        </h2>
        <p className="text-sm text-brain-text/60">
          노드를 클릭하면 텍스트가 연동됩니다
        </p>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  )
}
