import { useEffect, useRef, useCallback } from "react";
import cytoscape from "cytoscape";
import type { Core } from "cytoscape";
import type { V3Node, V3Edge } from "../types";

interface Props {
  nodes: V3Node[];
  edges: V3Edge[];
  onChange?: (nodes: V3Node[], edges: V3Edge[]) => void;
  wordBank?: string[];
  readOnly?: boolean;
}

let nodeCounter = 0;
const newId = () => `n${++nodeCounter}_${Date.now()}`;
const newEdgeId = () => `e${++nodeCounter}_${Date.now()}`;

export function NodeCanvas({ nodes, edges, onChange, wordBank, readOnly }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const selectedRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Build cytoscape elements
  const buildElements = useCallback(
    (ns: V3Node[], es: V3Edge[]) => [
      ...ns.map((n) => ({
        data: { id: n.id, label: n.label, kind: n.kind ?? "concept" },
        position: { x: n.x, y: n.y },
      })),
      ...es.map((e) => ({
        data: { id: e.id, source: e.from, target: e.to, label: e.label ?? "" },
      })),
    ],
    []
  );

  // Sync state → cytoscape (diff-based)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const existingNodeIds = new Set(cy.nodes().map((n) => n.id()));
    const existingEdgeIds = new Set(cy.edges().map((e) => e.id()));
    const newNodeIds = new Set(nodes.map((n) => n.id));
    const newEdgeIds = new Set(edges.map((e) => e.id));

    // Remove deleted
    cy.nodes().forEach((n) => {
      if (!newNodeIds.has(n.id())) cy.remove(n);
    });
    cy.edges().forEach((e) => {
      if (!newEdgeIds.has(e.id())) cy.remove(e);
    });

    // Add new
    nodes.forEach((n) => {
      if (!existingNodeIds.has(n.id)) {
        cy.add({
          data: { id: n.id, label: n.label, kind: n.kind ?? "concept" },
          position: { x: n.x, y: n.y },
        });
      } else {
        const node = cy.getElementById(n.id);
        if (node.data("label") !== n.label) node.data("label", n.label);
      }
    });
    edges.forEach((e) => {
      if (!existingEdgeIds.has(e.id)) {
        cy.add({
          data: { id: e.id, source: e.from, target: e.to, label: e.label ?? "" },
        });
      }
    });
  }, [nodes, edges]);

  // Init cytoscape once
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(nodes, edges),
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#B85C3F",
            "background-opacity": 0.12,
            "border-color": "#B85C3F",
            "border-width": 2,
            label: "data(label)",
            color: "#1a1a1a",
            "font-size": "13px",
            "text-valign": "center",
            "text-halign": "center",
            "min-zoomed-font-size": 8,
            width: "label",
            height: "label",
            padding: "10px",
            shape: "roundrectangle",
          },
        },
        {
          selector: 'node[kind="target"]',
          style: {
            "background-color": "#4f7942",
            "background-opacity": 0.12,
            "border-color": "#4f7942",
          },
        },
        {
          selector: 'node[kind="lens"]',
          style: {
            "background-color": "#4a6fa5",
            "background-opacity": 0.12,
            "border-color": "#4a6fa5",
          },
        },
        {
          selector: "node.selected-source",
          style: {
            "border-color": "#f59e0b",
            "border-width": 3,
            "background-opacity": 0.25,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#9ca3af",
            "target-arrow-color": "#9ca3af",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "11px",
            color: "#6b7280",
            "text-background-opacity": 1,
            "text-background-color": "#ffffff",
            "text-background-padding": "2px",
          },
        },
      ],
      layout: { name: "preset" },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    cyRef.current = cy;

    if (!readOnly) {
      // Node click: edge creation via two-click
      cy.on("tap", "node", (evt) => {
        const tappedId = evt.target.id();
        if (selectedRef.current && selectedRef.current !== tappedId) {
          // Create edge
          const src = selectedRef.current;
          const edgeLabel = "";
          const newEdge: V3Edge = { id: newEdgeId(), from: src, to: tappedId, label: edgeLabel };
          cy.getElementById(src).removeClass("selected-source");
          selectedRef.current = null;
          const currentNodes: V3Node[] = [];
          cy.nodes().forEach((n) => {
            currentNodes.push({
              id: n.id(),
              label: n.data("label") as string,
              x: n.position("x"),
              y: n.position("y"),
              kind: n.data("kind") as V3Node["kind"],
            });
          });
          const currentEdges: V3Edge[] = [];
          cy.edges().forEach((e) => {
            currentEdges.push({
              id: e.id(),
              from: e.data("source") as string,
              to: e.data("target") as string,
              label: e.data("label") as string,
            });
          });
          onChangeRef.current?.(currentNodes, [...currentEdges, newEdge]);
        } else {
          if (selectedRef.current) {
            cy.getElementById(selectedRef.current).removeClass("selected-source");
          }
          selectedRef.current = tappedId;
          evt.target.addClass("selected-source");
        }
      });

      // Double-click on background: add node
      cy.on("dbltap", (evt) => {
        if (evt.target !== cy) return;
        const label = window.prompt("노드 이름 입력:");
        if (!label?.trim()) return;
        const pos = evt.position;
        const newNode: V3Node = {
          id: newId(),
          label: label.trim(),
          x: pos.x,
          y: pos.y,
          kind: "concept",
        };
        const currentNodes: V3Node[] = [];
        cy.nodes().forEach((n) => {
          currentNodes.push({
            id: n.id(),
            label: n.data("label") as string,
            x: n.position("x"),
            y: n.position("y"),
            kind: n.data("kind") as V3Node["kind"],
          });
        });
        const currentEdges: V3Edge[] = [];
        cy.edges().forEach((e) => {
          currentEdges.push({
            id: e.id(),
            from: e.data("source") as string,
            to: e.data("target") as string,
            label: e.data("label") as string,
          });
        });
        onChangeRef.current?.([...currentNodes, newNode], currentEdges);
      });

      // Right-click: delete node
      cy.on("cxttap", "node", (evt) => {
        const id = evt.target.id();
        if (selectedRef.current === id) selectedRef.current = null;
        const currentNodes: V3Node[] = [];
        cy.nodes().forEach((n) => {
          if (n.id() !== id) currentNodes.push({
            id: n.id(),
            label: n.data("label") as string,
            x: n.position("x"),
            y: n.position("y"),
            kind: n.data("kind") as V3Node["kind"],
          });
        });
        const currentEdges: V3Edge[] = [];
        cy.edges().forEach((e) => {
          if (e.data("source") !== id && e.data("target") !== id) currentEdges.push({
            id: e.id(),
            from: e.data("source") as string,
            to: e.data("target") as string,
            label: e.data("label") as string,
          });
        });
        onChangeRef.current?.(currentNodes, currentEdges);
      });

      // Drag end: sync positions
      cy.on("dragfree", "node", () => {
        const currentNodes: V3Node[] = [];
        cy.nodes().forEach((n) => {
          currentNodes.push({
            id: n.id(),
            label: n.data("label") as string,
            x: n.position("x"),
            y: n.position("y"),
            kind: n.data("kind") as V3Node["kind"],
          });
        });
        const currentEdges: V3Edge[] = [];
        cy.edges().forEach((e) => {
          currentEdges.push({
            id: e.id(),
            from: e.data("source") as string,
            to: e.data("target") as string,
            label: e.data("label") as string,
          });
        });
        onChangeRef.current?.(currentNodes, currentEdges);
      });
    }

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add node from word bank drop
  const handleWordClick = useCallback(
    (word: string) => {
      const cy = cyRef.current;
      if (!cy) return;
      const viewport = cy.extent();
      const x = (viewport.x1 + viewport.x2) / 2 + (Math.random() - 0.5) * 100;
      const y = (viewport.y1 + viewport.y2) / 2 + (Math.random() - 0.5) * 100;
      const newNode: V3Node = { id: newId(), label: word, x, y, kind: "concept" };
      const currentNodes: V3Node[] = [];
      cy.nodes().forEach((n) => {
        currentNodes.push({
          id: n.id(),
          label: n.data("label") as string,
          x: n.position("x"),
          y: n.position("y"),
          kind: n.data("kind") as V3Node["kind"],
        });
      });
      const currentEdges: V3Edge[] = [];
      cy.edges().forEach((e) => {
        currentEdges.push({
          id: e.id(),
          from: e.data("source") as string,
          to: e.data("target") as string,
          label: e.data("label") as string,
        });
      });
      onChangeRef.current?.([...currentNodes, newNode], currentEdges);
    },
    []
  );

  return (
    <div className="flex flex-col h-full gap-2">
      {wordBank && wordBank.length > 0 && !readOnly && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-brain-surface-soft rounded-lg border border-brain-border">
          <span className="text-xs text-brain-text-muted self-center mr-1">단어뱅크:</span>
          {wordBank.map((w) => (
            <button
              key={w}
              onClick={() => handleWordClick(w)}
              className="px-2 py-0.5 text-xs rounded-full bg-brain-surface border border-brain-border hover:border-brain-accent hover:bg-brain-accent-soft transition-colors"
            >
              {w}
            </button>
          ))}
        </div>
      )}
      {!readOnly && (
        <p className="text-[11px] text-brain-text-soft px-1">
          더블클릭 → 노드 추가 · 노드 클릭 후 다른 노드 클릭 → 연결 · 우클릭 → 삭제
        </p>
      )}
      <div ref={containerRef} className="flex-1 rounded-lg border border-brain-border bg-brain-surface min-h-0" />
    </div>
  );
}
