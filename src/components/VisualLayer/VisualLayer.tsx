import { useEffect, useRef } from "react"
import cytoscape from "cytoscape"
import type { Core } from "cytoscape"
import { useStore } from "../../store/useStore"
import type { NodeType, EdgeRelation, ValueType, Perspective } from "../../types/cognitive"

const NODE_COLORS: Record<NodeType, string> = {
  root: "#B85C3F",
  anchor: "#6E8F82",
  bridge: "#8F7FA8",
  branch: "#6F8AA8",
}

// One-step-darker variants used for the selected/highlighted ring
const NODE_COLORS_DARK: Record<NodeType, string> = {
  root: "#8A4530",
  anchor: "#4F6B61",
  bridge: "#6A5E80",
  branch: "#4F6680",
}

const VALUE_COLORS: Record<ValueType, string> = {
  truth: "#6F8AA8",
  beauty: "#C49AA1",
  goodness: "#7E9F7B",
  freedom: "#C68A3D",
  love: "#B85C3F",
  power: "#8F857A",
  wisdom: "#8F7FA8",
  connection: "#7BA6A0",
}

const VALUE_COLORS_DARK: Record<ValueType, string> = {
  truth: "#4F6680",
  beauty: "#94707A",
  goodness: "#5C7959",
  freedom: "#94642A",
  love: "#8A4530",
  power: "#6A6258",
  wisdom: "#6A5E80",
  connection: "#577D78",
}

const TEMPORAL_COLORS: Record<number, string> = {
  1: "#8F857A",
  2: "#C68A3D",
  3: "#7E9F7B",
}

const TEMPORAL_COLORS_DARK: Record<number, string> = {
  1: "#6A6258",
  2: "#94642A",
  3: "#5C7959",
}

const EDGE_COLORS: Record<EdgeRelation, string> = {
  causes: "#C68A3D",
  supports: "#6E8F82",
  contrasts: "#B85C3F",
  transforms: "#8F7FA8",
  contains: "#6F8AA8",
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
    return vt ? VALUE_COLORS[vt] ?? "#8F857A" : "#8F857A"
  }
  if (perspective === "temporal") {
    const tp = ele.data("temporalPhase") as number | undefined
    return tp ? TEMPORAL_COLORS[tp] ?? "#8F857A" : "#8F857A"
  }
  return NODE_COLORS[ele.data("nodeType") as NodeType] ?? "#6F8AA8"
}

function getNodeRingColor(ele: cytoscape.NodeSingular, perspective: Perspective): string {
  if (perspective === "value") {
    const vt = ele.data("valueType") as ValueType | undefined
    return vt ? VALUE_COLORS_DARK[vt] ?? "#6A6258" : "#6A6258"
  }
  if (perspective === "temporal") {
    const tp = ele.data("temporalPhase") as number | undefined
    return tp ? TEMPORAL_COLORS_DARK[tp] ?? "#6A6258" : "#6A6258"
  }
  return NODE_COLORS_DARK[ele.data("nodeType") as NodeType] ?? "#4F6680"
}

function getNodeTextColor(_ele: cytoscape.NodeSingular, _perspective: Perspective): string {
  // All node bg colors are mid-tone earth — white text reads cleanly
  return "#FFFFFF"
}

function getNodeLabel(ele: cytoscape.NodeSingular, _perspective: Perspective): string {
  const concept = ele.data("label") as string
  return concept
}

function nodeSize(label: string, dim: number): number {
  const len = (label || "").length
  const base = Math.max(58, Math.min(105, len * 14))
  return base + dim * 6
}

const PERSPECTIVE_LABELS: Record<Perspective, string> = {
  cognitive: "인지 구조",
  value: "가치 구조",
  temporal: "시간축",
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
            animate: "end" as const,
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
              return len > 5 ? "11px" : "13px"
            },
            "font-family": "Noto Serif KR, Fraunces, Georgia, serif",
            "font-weight": 500,
            color: (ele: cytoscape.NodeSingular) =>
              getNodeTextColor(ele, perspective),
            "text-valign": "center",
            "text-halign": "center",
            "background-color": (ele: cytoscape.NodeSingular) =>
              getNodeColor(ele, perspective),
            "background-opacity": 0.95,
            width: (ele: cytoscape.NodeSingular) =>
              nodeSize(ele.data("label"), ele.data("dim")),
            height: (ele: cytoscape.NodeSingular) =>
              nodeSize(ele.data("label"), ele.data("dim")),
            "border-width": 1,
            "border-color": "#FFFFFF",
            "border-opacity": 0.5,
            "overlay-opacity": 0,
            "overlay-color": "transparent",
            "overlay-padding": 0,
            "transition-property":
              "background-color, border-color, border-width, width, height, opacity",
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
          selector: "node:selected, node.highlighted",
          style: {
            "border-width": 2.5,
            "border-color": (ele: cytoscape.NodeSingular) =>
              getNodeRingColor(ele, perspective),
            "border-opacity": 1,
            "background-opacity": 1,
          },
        },
        {
          selector: "node.dimmed",
          style: { opacity: 0.25 },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": (ele: cytoscape.EdgeSingular) =>
              EDGE_COLORS[ele.data("relation") as EdgeRelation] ?? "#A09684",
            "line-style": (ele: cytoscape.EdgeSingular) =>
              EDGE_STYLES[ele.data("relation") as EdgeRelation] ?? "solid",
            "line-opacity": 0.6,
            "target-arrow-shape": "triangle",
            "target-arrow-color": (ele: cytoscape.EdgeSingular) =>
              EDGE_COLORS[ele.data("relation") as EdgeRelation] ?? "#A09684",
            "arrow-scale": 0.9,
            "curve-style": "bezier",
            "control-point-step-size": 55,
            label: "data(label)",
            "font-family": "Noto Serif KR, Fraunces, Georgia, serif",
            "font-style": "italic",
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
          selector: "edge.dimmed",
          style: { opacity: 0.12 },
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

    // Edge label font-size and text-max-width depend on rendered distance.
    // Cytoscape doesn't auto re-evaluate style functions on position changes,
    // so retrigger manually when nodes move or viewport changes.
    const recomputeEdgeStyles = () => {
      try { cy.style().update() } catch {}
    }
    cy.on("position", "node", recomputeEdgeStyles)
    cy.on("zoom pan", recomputeEdgeStyles)

    cyRef.current = cy
    return () => {
      try { cy.stop() } catch {}
      setTimeout(() => {
        try { cy.destroy() } catch {}
      }, 0)
    }
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
      <div className="px-8 py-5 border-b border-brain-border flex items-center justify-between">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.18em] mb-1.5"
            style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
          >
            관점
          </p>
          <h2
            className="text-[20px] tracking-[-0.01em]"
            style={{
              color: "var(--color-brain-text)",
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
            }}
          >
            {PERSPECTIVE_LABELS[perspective]}
          </h2>
          <p
            className="text-[12px] mt-1"
            style={{
              color: "var(--color-brain-text-muted)",
            }}
          >
            {PERSPECTIVE_DESCRIPTIONS[perspective]}
          </p>
        </div>
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
      </div>
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  )
}
