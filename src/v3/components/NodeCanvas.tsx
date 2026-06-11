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

// 노드 겹침 판정 간격 (모델 좌표) — 라벨 노드 평균 크기 기준
const CLEAR_X = 110;
const CLEAR_Y = 48;

// 기존 노드와 겹치지 않는 위치 탐색 — 원하는 지점부터 나선형으로 확장
function findFreePosition(cy: Core, desiredX: number, desiredY: number): { x: number; y: number } {
  const positions = cy.nodes().map((n) => n.position());
  const isFree = (x: number, y: number) =>
    positions.every((p) => Math.abs(p.x - x) > CLEAR_X || Math.abs(p.y - y) > CLEAR_Y);
  if (isFree(desiredX, desiredY)) return { x: desiredX, y: desiredY };
  for (let ring = 1; ring <= 8; ring++) {
    const steps = ring * 8;
    for (let k = 0; k < steps; k++) {
      const ang = (2 * Math.PI * k) / steps;
      const tx = desiredX + Math.cos(ang) * ring * (CLEAR_X + 20);
      const ty = desiredY + Math.sin(ang) * ring * (CLEAR_Y + 16);
      if (isFree(tx, ty)) return { x: tx, y: ty };
    }
  }
  return { x: desiredX, y: desiredY };
}

export function NodeCanvas({ nodes, edges, onChange, wordBank, readOnly }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
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
        const pos = findFreePosition(cy, evt.position.x, evt.position.y);
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

      // 스마트 가이드: 드래그 중 다른 노드와 X/Y 중심 정렬 시 스냅 + 가이드라인
      const clearGuides = () => {
        const canvas = guideRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      };

      const drawGuides = (snapX: number | null, snapY: number | null) => {
        const canvas = guideRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        // 컨테이너 크기와 동기화 (리사이즈 대응)
        if (canvas.width !== container.clientWidth) canvas.width = container.clientWidth;
        if (canvas.height !== container.clientHeight) canvas.height = container.clientHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (snapX === null && snapY === null) return;
        const zoom = cy.zoom();
        const pan = cy.pan();
        ctx.strokeStyle = "#e879a0";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        if (snapX !== null) {
          const rx = snapX * zoom + pan.x;
          ctx.beginPath();
          ctx.moveTo(rx, 0);
          ctx.lineTo(rx, canvas.height);
          ctx.stroke();
        }
        if (snapY !== null) {
          const ry = snapY * zoom + pan.y;
          ctx.beginPath();
          ctx.moveTo(0, ry);
          ctx.lineTo(canvas.width, ry);
          ctx.stroke();
        }
      };

      // 좌/중/우 · 상/중/하 — 끝과 끝, 끝과 중심 모든 조합 정렬 (포토샵 스마트 가이드)
      cy.on("drag", "node", (evt) => {
        const node = evt.target;
        const thresh = 8 / cy.zoom(); // 화면 기준 8px
        const bb = node.boundingBox({ includeLabels: false, includeOverlays: false });
        const dragXs = [bb.x1, (bb.x1 + bb.x2) / 2, bb.x2];
        const dragYs = [bb.y1, (bb.y1 + bb.y2) / 2, bb.y2];
        let shiftX: number | null = null;
        let shiftY: number | null = null;
        let guideX: number | null = null;
        let guideY: number | null = null;
        let bestDx = thresh;
        let bestDy = thresh;
        cy.nodes().forEach((o) => {
          if (o.id() === node.id()) return;
          const ob = o.boundingBox({ includeLabels: false, includeOverlays: false });
          const otherXs = [ob.x1, (ob.x1 + ob.x2) / 2, ob.x2];
          const otherYs = [ob.y1, (ob.y1 + ob.y2) / 2, ob.y2];
          for (const dx of dragXs) {
            for (const ox of otherXs) {
              const d = Math.abs(ox - dx);
              if (d <= bestDx) { bestDx = d; shiftX = ox - dx; guideX = ox; }
            }
          }
          for (const dy of dragYs) {
            for (const oy of otherYs) {
              const d = Math.abs(oy - dy);
              if (d <= bestDy) { bestDy = d; shiftY = oy - dy; guideY = oy; }
            }
          }
        });
        if (shiftX !== null || shiftY !== null) {
          const pos = node.position();
          node.position({ x: pos.x + (shiftX ?? 0), y: pos.y + (shiftY ?? 0) });
        }
        drawGuides(guideX, guideY);
      });

      cy.on("free", "node", clearGuides);

      // Drag end: sync positions
      cy.on("dragfree", "node", () => {
        clearGuides();
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
      const { x, y } = findFreePosition(
        cy,
        (viewport.x1 + viewport.x2) / 2,
        (viewport.y1 + viewport.y2) / 2
      );
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
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="h-full rounded-lg border border-brain-border bg-brain-surface" />
        {/* 스마트 가이드 오버레이 — 드래그 정렬선 */}
        <canvas
          ref={guideRef}
          className="pointer-events-none absolute inset-0 rounded-lg"
        />
      </div>
    </div>
  );
}
