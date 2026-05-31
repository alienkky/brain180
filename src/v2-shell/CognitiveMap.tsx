// Owner: 연다리 [통합설계].
// Minimal SVG-based CognitiveMap canvas for v2 shell. Pure React + SVG so we
// can ship the visualization seam without pulling in cytoscape yet — the v1
// app already proved cytoscape feels heavy and we want the *data path*
// (browser ↔ canvas_artifacts) validated first. Cytoscape (or three.js for
// 4D layer view) can replace the SVG render later behind the same data shape.
//
// Interactions:
//   - Palette: pick a node type, then click empty canvas to place a labelled node.
//   - Drag node to reposition.
//   - Click node A, then click node B → opens edge dialog (relation enum).
//   - Click edge label → delete (after confirm).
//   - Auto-save debounced ~700ms after last change.

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CanvasCite,
  CanvasEdge,
  CanvasJson,
  CanvasNode,
} from "./api";

export type NodeType = CanvasNode["type"];
export type Relation = CanvasEdge["relation"];

const NODE_TYPES: { value: NodeType; label: string; color: string }[] = [
  { value: "concept", label: "개념", color: "var(--color-brain-node-root)" },
  { value: "anchor", label: "정박", color: "var(--color-brain-node-anchor)" },
  { value: "bridge", label: "연결", color: "var(--color-brain-node-bridge)" },
  { value: "branch", label: "분기", color: "var(--color-brain-node-branch)" },
];

const RELATIONS: { value: Relation; label: string }[] = [
  { value: "causes", label: "원인 →" },
  { value: "supports", label: "지지 →" },
  { value: "contrasts", label: "대비 ↔" },
  { value: "transforms", label: "변형 →" },
  { value: "contains", label: "포함 ⊃" },
];

interface PendingEdge {
  fromId: string;
  toId: string;
}

interface Props {
  initial: CanvasJson | null;
  onSave: (next: CanvasJson) => Promise<void> | void;
  onChange?: (next: CanvasJson) => void;
  onAskTutor?: (snapshot: CanvasJson) => void;
  onNodeFocus?: (node: CanvasNode) => void;
  // When this prop transitions from null → cite, the canvas auto-creates an
  // anchor node carrying that cite and then calls onCiteConsumed so the
  // parent can clear the slot.
  injectCite?: CanvasCite | null;
  onCiteConsumed?: () => void;
  disabled?: boolean;
}

const EMPTY: CanvasJson = {
  version: 1,
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [],
  edges: [],
};

export function CognitiveMap({
  initial,
  onSave,
  onChange,
  onAskTutor,
  onNodeFocus,
  injectCite,
  onCiteConsumed,
  disabled,
}: Props) {
  const [canvas, setCanvas] = useState<CanvasJson>(initial ?? EMPTY);
  const [paletteType, setPaletteType] = useState<NodeType | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingEdge, setPendingEdge] = useState<PendingEdge | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const saveTimer = useRef<number | null>(null);
  const isFirstLoad = useRef(true);

  // Reload when the parent swaps in a different initial (e.g. session change).
  useEffect(() => {
    setCanvas(initial ?? EMPTY);
    setSelectedNodeId(null);
    setPendingEdge(null);
    isFirstLoad.current = true;
  }, [initial]);

  // Consume a cite injection from the text panel: place an anchor node at
  // a fresh-ish position so the student doesn't have to find the click
  // target. Parent is expected to null out the prop after onCiteConsumed.
  useEffect(() => {
    if (!injectCite) return;
    const node: CanvasNode = {
      id: cryptoRandomId(),
      type: "anchor",
      label: injectCite.quote.slice(0, 24),
      x: 80 + Math.random() * 120,
      y: 80 + Math.random() * 120,
      cite: injectCite,
    };
    setCanvas((c) => ({ ...c, nodes: [...c.nodes, node] }));
    onCiteConsumed?.();
  }, [injectCite, onCiteConsumed]);

  // Debounced auto-save. Parent gets a synchronous mirror via onChange so
  // sibling features (tutor hint button) can read the current canvas without
  // waiting for the save round-trip.
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    onChange?.(canvas);
    if (disabled) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        await onSave(canvas);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 700);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [canvas, onSave, onChange, disabled]);

  const screenToCanvas = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const rect = svg.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled) return;
    if (e.target !== svgRef.current && e.target !== e.currentTarget) {
      // Click hit a node/edge — those handlers run instead.
      return;
    }
    if (!paletteType) {
      setSelectedNodeId(null);
      return;
    }
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const label = window.prompt("개념(라벨)을 입력하세요");
    if (!label) return;
    const node: CanvasNode = {
      id: cryptoRandomId(),
      type: paletteType,
      label: label.slice(0, 120),
      x,
      y,
    };
    setCanvas((c) => ({ ...c, nodes: [...c.nodes, node] }));
    setPaletteType(null);
  };

  const onNodeMouseDown = (e: React.MouseEvent, n: CanvasNode) => {
    if (disabled) return;
    e.stopPropagation();
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    dragRef.current = { id: n.id, dx: x - n.x, dy: y - n.y };
  };

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const { id, dx, dy } = dragRef.current;
    setCanvas((c) => ({
      ...c,
      nodes: c.nodes.map((n) =>
        n.id === id ? { ...n, x: x - dx, y: y - dy } : n,
      ),
    }));
  };

  const onMouseUp = () => {
    dragRef.current = null;
  };

  const onNodeClick = (e: React.MouseEvent, n: CanvasNode) => {
    if (disabled) return;
    e.stopPropagation();
    // If a node is already selected and it's not this one, propose an edge.
    if (selectedNodeId && selectedNodeId !== n.id) {
      setPendingEdge({ fromId: selectedNodeId, toId: n.id });
      setSelectedNodeId(null);
      return;
    }
    const next = n.id === selectedNodeId ? null : n.id;
    setSelectedNodeId(next);
    // When selecting a cite-bearing node, give the parent a chance to scroll
    // the text panel to that quote.
    if (next && n.cite) onNodeFocus?.(n);
  };

  const onEdgeClick = (edgeId: string) => {
    if (disabled) return;
    if (!window.confirm("이 엣지를 삭제할까요?")) return;
    setCanvas((c) => ({ ...c, edges: c.edges.filter((e) => e.id !== edgeId) }));
  };

  const onConfirmEdge = (relation: Relation) => {
    if (!pendingEdge) return;
    const edge: CanvasEdge = {
      id: cryptoRandomId(),
      from: pendingEdge.fromId,
      to: pendingEdge.toId,
      relation,
    };
    setCanvas((c) => ({ ...c, edges: [...c.edges, edge] }));
    setPendingEdge(null);
  };

  const deleteSelected = () => {
    if (!selectedNodeId) return;
    setCanvas((c) => ({
      ...c,
      nodes: c.nodes.filter((n) => n.id !== selectedNodeId),
      edges: c.edges.filter(
        (e) => e.from !== selectedNodeId && e.to !== selectedNodeId,
      ),
    }));
    setSelectedNodeId(null);
  };

  const nodeIndex = useMemo(() => {
    const m = new Map<string, CanvasNode>();
    canvas.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [canvas.nodes]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-brain-border bg-brain-surface px-3 py-2">
        <span className="mr-2 text-xs font-medium uppercase tracking-wider text-brain-text-muted">
          노드 추가
        </span>
        {NODE_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() =>
              setPaletteType(paletteType === t.value ? null : t.value)
            }
            disabled={disabled}
            className={
              "rounded-full border px-3 py-1 text-xs transition " +
              (paletteType === t.value
                ? "border-brain-accent bg-brain-accent text-white"
                : "border-brain-border bg-brain-bg text-brain-text hover:border-brain-accent")
            }
            style={
              paletteType === t.value
                ? undefined
                : { borderLeftColor: t.color, borderLeftWidth: 4 }
            }
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-brain-text-muted">
          {onAskTutor && (
            <button
              onClick={() => onAskTutor(canvas)}
              disabled={disabled}
              className="rounded border border-brain-accent/60 px-2 py-1 text-brain-accent hover:bg-brain-accent-soft/50 disabled:opacity-50"
              title="현재 캔버스 스냅샷을 튜터에게 보내 다음 노드를 제안받습니다"
            >
              튜터에게 패턴 제안
            </button>
          )}
          {selectedNodeId && (
            <button
              onClick={deleteSelected}
              className="rounded border border-brain-danger/40 px-2 py-1 text-brain-danger hover:bg-brain-accent-soft/50"
            >
              선택 노드 삭제
            </button>
          )}
          <SaveBadge state={saveState} />
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden bg-brain-bg">
        <svg
          ref={svgRef}
          onClick={onCanvasClick}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          className="h-full w-full"
          style={{ cursor: paletteType ? "crosshair" : "default" }}
        >
          <defs>
            <marker
              id="b180-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-brain-text-muted)" />
            </marker>
          </defs>
          {canvas.edges.map((e) => {
            const from = nodeIndex.get(e.from);
            const to = nodeIndex.get(e.to);
            if (!from || !to) return null;
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const dashed = e.relation === "contrasts";
            return (
              <g key={e.id} onClick={() => onEdgeClick(e.id)} style={{ cursor: "pointer" }}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="var(--color-brain-text-muted)"
                  strokeWidth={1.5}
                  strokeDasharray={dashed ? "5 4" : undefined}
                  markerEnd="url(#b180-arrow)"
                />
                <rect
                  x={midX - 28}
                  y={midY - 9}
                  width={56}
                  height={18}
                  rx={9}
                  fill="var(--color-brain-surface)"
                  stroke="var(--color-brain-border)"
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--color-brain-text-muted)"
                >
                  {relationLabel(e.relation)}
                </text>
              </g>
            );
          })}
          {canvas.nodes.map((n) => {
            const color = NODE_TYPES.find((t) => t.value === n.type)?.color
              ?? "var(--color-brain-text)";
            const selected = n.id === selectedNodeId;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                onMouseDown={(e) => onNodeMouseDown(e, n)}
                onClick={(e) => onNodeClick(e, n)}
                style={{ cursor: "grab" }}
              >
                <circle
                  r={28}
                  fill="var(--color-brain-surface)"
                  stroke={color}
                  strokeWidth={selected ? 4 : 2}
                />
                <text
                  textAnchor="middle"
                  y={4}
                  fontSize={11}
                  fill="var(--color-brain-text)"
                  pointerEvents="none"
                >
                  {n.label.slice(0, 8)}
                </text>
                {n.cite && (
                  <g pointerEvents="none">
                    <circle
                      cx={20}
                      cy={-20}
                      r={8}
                      fill="var(--color-brain-accent)"
                    />
                    <text
                      x={20}
                      y={-17}
                      textAnchor="middle"
                      fontSize={10}
                      fill="white"
                    >
                      ¶
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        {canvas.nodes.length === 0 && !paletteType && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-brain-text-soft">
            상단에서 노드 유형을 고른 뒤 캔버스를 클릭하면 노드가 생깁니다.
          </div>
        )}
        {pendingEdge && (
          <EdgeDialog
            onPick={onConfirmEdge}
            onCancel={() => setPendingEdge(null)}
          />
        )}
      </div>
    </div>
  );
}

function EdgeDialog({
  onPick,
  onCancel,
}: {
  onPick: (r: Relation) => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
      <div className="rounded-2xl border border-brain-border bg-brain-surface p-5 shadow-soft-3">
        <h3 className="mb-3 font-display text-lg">관계 선택</h3>
        <div className="grid grid-cols-2 gap-2">
          {RELATIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => onPick(r.value)}
              className="rounded border border-brain-border bg-brain-bg px-3 py-2 text-sm hover:border-brain-accent"
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-3 w-full text-xs text-brain-text-muted hover:text-brain-text"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const text =
    state === "saving" ? "저장 중…" : state === "saved" ? "저장됨" : "저장 실패";
  const color =
    state === "error" ? "text-brain-danger" : "text-brain-text-muted";
  return <span className={"text-xs " + color}>{text}</span>;
}

function relationLabel(r: Relation): string {
  switch (r) {
    case "causes":
      return "원인";
    case "supports":
      return "지지";
    case "contrasts":
      return "대비";
    case "transforms":
      return "변형";
    case "contains":
      return "포함";
  }
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 12);
}
