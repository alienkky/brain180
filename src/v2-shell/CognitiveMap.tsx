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
  RelationLexiconEntry,
} from "./api";

export type NodeType = CanvasNode["type"];
export type Relation = CanvasEdge["relation"];

// v1 의 도메인 라벨 복원. "concept" 는 v2 스키마 호환을 위해 그대로 유지하되
// 사용자 노출 라벨은 v1 의 "핵심/기둥/다리/가지" 4종 + 짧은 설명.
const NODE_TYPES: {
  value: NodeType;
  label: string;
  desc: string;
  color: string;
}[] = [
  {
    value: "concept",
    label: "핵심",
    desc: "텍스트의 중심 사상",
    color: "var(--color-brain-node-root)",
  },
  {
    value: "anchor",
    label: "기둥",
    desc: "핵심을 지탱하는 주요 개념",
    color: "var(--color-brain-node-anchor)",
  },
  {
    value: "bridge",
    label: "다리",
    desc: "개념 간 논리적 연결",
    color: "var(--color-brain-node-bridge)",
  },
  {
    value: "branch",
    label: "가지",
    desc: "파생/부수적 개념",
    color: "var(--color-brain-node-branch)",
  },
];

// One entry in the dialog's button row. Carries both the canonical enum
// (persisted as edge.relation) and the author-token label (persisted as
// edge.label) so the edge dialog can write both with one click.
interface RelationChoice {
  value: Relation;
  label: string;
  token?: string;
  example?: string;
}

type AxisTag = NonNullable<CanvasNode["axis_tag"]>;

const AXIS_TAGS: { value: AxisTag; label: string; color: string }[] = [
  { value: "cognition", label: "인지", color: "#4A87C2" },
  { value: "value",     label: "가치", color: "#D88254" },
  { value: "time",      label: "시간", color: "#6FA56D" },
];

// Fallback relation set used when the lesson does not (yet) carry a
// curated relation lexicon. Once `relationLexicon` is provided by the
// parent (Lesson DTO), the button row is regenerated from the author's
// own connectives — see lexiconToRelationChoices() below.
//
// Labels switched from the original logic-theory vocabulary
// (원인/지지/대비/변형/포함) to plain-Korean verbs that middle- and
// high-school readers can map without prior training. Each entry also
// ships a universal example sentence; the EdgeDialog surfaces it as the
// button's hover tooltip so the meaning is reinforced at pick time.
// `token` is the bare verb that lands on the saved edge label so the
// canvas keeps showing the friendly word the student picked, not the
// canonical enum.
const DEFAULT_RELATIONS: RelationChoice[] = [
  { value: "causes",     label: "때문에 →",   token: "때문에",   example: "비 → 길이 젖었다" },
  { value: "supports",   label: "맞아 ↑",     token: "맞아",     example: "증거 → 주장이 맞아" },
  { value: "contrasts",  label: "반대 ↔",     token: "반대",     example: "낮 ↔ 밤" },
  { value: "transforms", label: "바뀌어 ⇒",   token: "바뀌어",   example: "물 → 얼음" },
  { value: "contains",   label: "안에 ⊂",     token: "안에",     example: "사과 ⊂ 과일" },
];

function lexiconToRelationChoices(
  lex: RelationLexiconEntry[] | undefined,
): RelationChoice[] {
  if (!lex || lex.length === 0) return DEFAULT_RELATIONS;
  return lex.map((e) => ({
    value: e.canonical,
    label: e.glyph ?? e.token,
    token: e.token,
    example: e.example,
  }));
}

// v1-matching edge colors and styles
const EDGE_COLORS: { relation: Relation; color: string; style: "solid" | "dashed" | "dotted" }[] = [
  { relation: "causes",    color: "#C68A3D", style: "solid" },
  { relation: "supports",  color: "#6E8F82", style: "dashed" },
  { relation: "contrasts", color: "#B85C3F", style: "dotted" },
  { relation: "transforms",color: "#8F7FA8", style: "solid" },
  { relation: "contains",  color: "#6F8AA8", style: "dashed" },
  { relation: "other",     color: "#9B8A7A", style: "dotted" },
];

interface PendingEdge {
  fromId: string;
  toId: string;
}

export type CanvasMode = "constrained" | "guided";

const GUIDED_STEPS: { type: NodeType; label: string; hint: string }[] = [
  { type: "concept", label: "1단계: 핵심 노드", hint: "텍스트의 중심 사상을 '핵심' 노드로 1개 만드세요." },
  { type: "anchor", label: "2단계: 기둥 노드", hint: "핵심을 지탱하는 주요 개념을 '기둥' 노드로 추가하세요." },
  { type: "bridge", label: "3단계: 다리 노드", hint: "개념들을 연결하는 '다리' 노드를 추가하세요." },
  { type: "branch", label: "4단계: 가지 노드", hint: "파생 개념을 '가지' 노드로 추가하고 관계를 연결하세요." },
];

function guidedStep(canvas: CanvasJson): number {
  const has = (t: NodeType) => canvas.nodes.some((n) => n.type === t);
  if (!has("concept")) return 0;
  if (!has("anchor")) return 1;
  if (!has("bridge")) return 2;
  return 3;
}

interface Props {
  initial: CanvasJson | null;
  onSave: (next: CanvasJson) => Promise<void> | void;
  onChange?: (next: CanvasJson) => void;
  onAskTutor?: (snapshot: CanvasJson) => void;
  onNodeFocus?: (node: CanvasNode) => void;
  canvasMode?: CanvasMode;
  // When this prop transitions from null → cite, the canvas auto-creates an
  // anchor node carrying that cite and then calls onCiteConsumed so the
  // parent can clear the slot.
  injectCite?: CanvasCite | null;
  onCiteConsumed?: () => void;
  disabled?: boolean;
  // Author-bound relation vocabulary for the currently loaded lesson. When
  // present, the edge dialog renders one button per entry; when undefined
  // or empty, falls back to DEFAULT_RELATIONS (5 generic logic terms).
  relationLexicon?: RelationLexiconEntry[];
}

const EMPTY: CanvasJson = {
  version: 1,
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [],
  edges: [],
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;
const INJECTED_NODE_GAP = 28;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function nodeRadius(label: string): number {
  return Math.max(30, Math.min(48, 28 + label.length * 1.5));
}

function findOpenNodePosition(
  nodes: CanvasNode[],
  viewport: CanvasJson["viewport"] | undefined,
  svg: SVGSVGElement | null,
  label: string,
): { x: number; y: number } {
  const rect = svg?.getBoundingClientRect();
  const width = rect?.width && rect.width > 0 ? rect.width : 900;
  const height = rect?.height && rect.height > 0 ? rect.height : 600;
  const vp = {
    x: viewport?.x ?? 0,
    y: viewport?.y ?? 0,
    zoom: clampZoom(viewport?.zoom ?? 1),
  };
  const centerX = (width / 2 - vp.x) / vp.zoom;
  const centerY = (height / 2 - vp.y) / vp.zoom;
  const candidateRadius = nodeRadius(label);

  const isClear = (x: number, y: number) =>
    nodes.every((n) => {
      const minDistance = candidateRadius + nodeRadius(n.label) + INJECTED_NODE_GAP;
      return Math.hypot(n.x - x, n.y - y) >= minDistance;
    });

  if (nodes.length === 0 || isClear(centerX, centerY)) {
    return { x: centerX, y: centerY };
  }

  const step = candidateRadius * 2 + INJECTED_NODE_GAP;
  for (let ring = 1; ring <= 12; ring++) {
    const radius = ring * step;
    const steps = Math.max(8, ring * 8);
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (isClear(x, y)) return { x, y };
    }
  }

  return {
    x: centerX + (nodes.length % 5) * step,
    y: centerY + Math.floor(nodes.length / 5) * step,
  };
}

export function CognitiveMap({
  initial,
  onSave,
  onChange,
  onAskTutor,
  onNodeFocus,
  canvasMode = "constrained",
  injectCite,
  onCiteConsumed,
  disabled,
  relationLexicon,
}: Props) {
  const relationChoices = useMemo(
    () => lexiconToRelationChoices(relationLexicon),
    [relationLexicon],
  );
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
  const pinchDistance = useRef<number | null>(null);
  const viewport = {
    x: canvas.viewport?.x ?? 0,
    y: canvas.viewport?.y ?? 0,
    zoom: clampZoom(canvas.viewport?.zoom ?? 1),
  };
  const zoom = viewport.zoom;

  const setZoom = (nextZoom: number, anchor?: { clientX: number; clientY: number }) => {
    const next = clampZoom(nextZoom);
    setCanvas((c) => ({
      ...c,
      viewport: (() => {
        const current = {
          x: c.viewport?.x ?? 0,
          y: c.viewport?.y ?? 0,
          zoom: clampZoom(c.viewport?.zoom ?? 1),
        };
        const svg = svgRef.current;
        if (!svg) return { ...current, zoom: next };
        const rect = svg.getBoundingClientRect();
        const screenX = anchor ? anchor.clientX - rect.left : rect.width / 2;
        const screenY = anchor ? anchor.clientY - rect.top : rect.height / 2;
        const canvasX = (screenX - current.x) / current.zoom;
        const canvasY = (screenY - current.y) / current.zoom;
        return {
          x: screenX - canvasX * next,
          y: screenY - canvasY * next,
          zoom: next,
        };
      })(),
    }));
  };

  const changeZoom = (delta: number) => {
    setZoom(zoom + delta);
  };

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
    setCanvas((c) => {
      const label = injectCite.quote.slice(0, 24);
      const position = findOpenNodePosition(c.nodes, c.viewport, svgRef.current, label);
      const node: CanvasNode = {
        id: cryptoRandomId(),
        type: "anchor",
        label,
        x: position.x,
        y: position.y,
        cite: injectCite,
      };
      return { ...c, nodes: [...c.nodes, node] };
    });
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

  // Delete/Backspace removes the selected node (and its incident edges).
  // Ignored while typing in form fields so label editing via window.prompt
  // and any future inline inputs are not hijacked.
  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) {
          return;
        }
      }
      if (!selectedNodeId) return;
      e.preventDefault();
      setCanvas((c) => ({
        ...c,
        nodes: c.nodes.filter((n) => n.id !== selectedNodeId),
        edges: c.edges.filter(
          (eg) => eg.from !== selectedNodeId && eg.to !== selectedNodeId,
        ),
      }));
      setSelectedNodeId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNodeId, disabled]);

  const screenToCanvas = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.x) / viewport.zoom,
      y: (clientY - rect.top - viewport.y) / viewport.zoom,
    };
  };

  const touchDistance = (touches: React.TouchList) => {
    const a = touches[0];
    const b = touches[1];
    if (!a || !b) return null;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
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

  const onNodeTouchStart = (e: React.TouchEvent, n: CanvasNode) => {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const { x, y } = screenToCanvas(touch.clientX, touch.clientY);
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

  const onTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length >= 2) {
      e.preventDefault();
      dragRef.current = null;
      const distance = touchDistance(e.touches);
      if (!distance) return;
      if (pinchDistance.current) {
        const a = e.touches[0];
        const b = e.touches[1];
        setZoom(zoom * (distance / pinchDistance.current), {
          clientX: (a.clientX + b.clientX) / 2,
          clientY: (a.clientY + b.clientY) / 2,
        });
      }
      pinchDistance.current = distance;
      return;
    }
    if (!dragRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const { x, y } = screenToCanvas(touch.clientX, touch.clientY);
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
    pinchDistance.current = null;
  };

  const onTouchStartCanvas = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length >= 2) {
      e.preventDefault();
      dragRef.current = null;
      pinchDistance.current = touchDistance(e.touches);
    }
  };

  const onWheelCanvas = (e: React.WheelEvent<SVGSVGElement>) => {
    if (disabled) return;
    if (!e.ctrlKey && Math.abs(e.deltaY) < 50) return;
    e.preventDefault();
    setZoom(zoom + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), e);
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

  const onConfirmEdge = (choice: RelationChoice) => {
    if (!pendingEdge) return;
    const edge: CanvasEdge = {
      id: cryptoRandomId(),
      from: pendingEdge.fromId,
      to: pendingEdge.toId,
      relation: choice.value,
      ...(choice.token ? { label: choice.token } : {}),
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

  // 더블클릭으로 라벨 즉시 수정. v1 PracticeToolbar 의 "노드 편집" 흐름 대체.
  const onNodeDoubleClick = (e: React.MouseEvent, n: CanvasNode) => {
    if (disabled) return;
    e.stopPropagation();
    const next = window.prompt("라벨을 수정하세요", n.label);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    setCanvas((c) => ({
      ...c,
      nodes: c.nodes.map((m) =>
        m.id === n.id ? { ...m, label: trimmed.slice(0, 120) } : m,
      ),
    }));
  };

  // 선택된 노드의 type 변경 — v1 toolbar 의 "역할 다시 고르기" 와 동등.
  const reassignSelectedType = (type: NodeType) => {
    if (!selectedNodeId) return;
    setCanvas((c) => ({
      ...c,
      nodes: c.nodes.map((n) =>
        n.id === selectedNodeId ? { ...n, type } : n,
      ),
    }));
  };

  // 선택된 노드의 axis_tag 토글 — 3축 분석 패널에서 노드가 인지/가치/시간 중
  // 어느 축에 묶일지 결정한다. 같은 축을 다시 누르면 해제.
  const toggleSelectedAxisTag = (tag: AxisTag) => {
    if (!selectedNodeId) return;
    setCanvas((c) => ({
      ...c,
      nodes: c.nodes.map((n) =>
        n.id === selectedNodeId
          ? { ...n, axis_tag: n.axis_tag === tag ? undefined : tag }
          : n,
      ),
    }));
  };

  const clearCanvas = () => {
    if (!window.confirm("캔버스를 비울까요? 모든 노드와 엣지가 삭제됩니다.")) {
      return;
    }
    setCanvas((c) => ({ ...c, nodes: [], edges: [] }));
    setSelectedNodeId(null);
    setPendingEdge(null);
    setPaletteType(null);
  };

  const selectedNode = useMemo(
    () => canvas.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [canvas.nodes, selectedNodeId],
  );

  const nodeIndex = useMemo(() => {
    const m = new Map<string, CanvasNode>();
    canvas.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [canvas.nodes]);

  const step = canvasMode === "guided" ? guidedStep(canvas) : null;

  return (
    <div className="flex h-full flex-col">
      {step !== null && (
        <div className="border-b border-brain-accent/30 bg-brain-accent/5 px-4 py-2">
          <p className="text-[11px] font-semibold text-brain-accent">
            {GUIDED_STEPS[step]?.label ?? "완성"}{" "}
            <span className="text-brain-text-muted font-normal">
              — {GUIDED_STEPS[step]?.hint ?? "모든 단계 완료! 관계를 자유롭게 연결하세요."}
            </span>
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2 border-b border-brain-border bg-brain-surface px-3 py-2 max-md:order-last max-md:max-h-36 max-md:overflow-y-auto max-md:border-b-0 max-md:border-t">
        <div className="flex items-center gap-2">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brain-text-soft">
            {selectedNode ? "역할 다시" : "노드 만들기"}
          </span>
          {NODE_TYPES.map((t, idx) => {
            const active = selectedNode
              ? selectedNode.type === t.value
              : paletteType === t.value;
            const guidedLocked = step !== null && idx > step;
            return (
              <button
                key={t.value}
                onClick={() => {
                  if (guidedLocked) return;
                  if (selectedNode) {
                    reassignSelectedType(t.value);
                  } else {
                    setPaletteType(paletteType === t.value ? null : t.value);
                  }
                }}
                disabled={disabled || guidedLocked}
                title={guidedLocked ? `${t.label}: 이전 단계를 먼저 완성하세요` : t.desc}
                className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] transition disabled:opacity-50"
                style={{
                  borderColor: active ? t.color : "var(--color-brain-border)",
                  background: active
                    ? `${t.color}14`
                    : "var(--color-brain-bg)",
                  color: active ? t.color : "var(--color-brain-text)",
                  fontWeight: active ? 600 : 500,
                }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: t.color }}
                />
                {t.label}
              </button>
            );
          })}
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
                선택 삭제
              </button>
            )}
            {canvas.nodes.length > 0 && (
              <button
                onClick={clearCanvas}
                disabled={disabled}
                className="rounded border border-brain-border px-2 py-1 hover:border-brain-danger hover:text-brain-danger disabled:opacity-50"
                title="모든 노드와 엣지를 삭제합니다"
              >
                비우기
              </button>
            )}
            {canvas.nodes.length > 0 && (
              <button
                onClick={() => svgRef.current && downloadSvgAsPng(svgRef.current)}
                className="rounded border border-brain-border px-2 py-1 hover:bg-brain-surface-soft"
                title="PNG로 다운로드"
              >
                ↓ PNG
              </button>
            )}
            <button
              onClick={() => changeZoom(-ZOOM_STEP)}
              disabled={disabled || zoom <= MIN_ZOOM}
              className="rounded border border-brain-border px-2 py-1 hover:bg-brain-surface-soft disabled:opacity-40"
              title="Zoom out"
            >
              -
            </button>
            <span className="min-w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => changeZoom(ZOOM_STEP)}
              disabled={disabled || zoom >= MAX_ZOOM}
              className="rounded border border-brain-border px-2 py-1 hover:bg-brain-surface-soft disabled:opacity-40"
              title="Zoom in"
            >
              +
            </button>
            <SaveBadge state={saveState} />
          </div>
        </div>
        {paletteType && !selectedNode && (
          <p className="text-[11px] text-brain-text-muted">
            <strong style={{ color: "var(--color-brain-text)" }}>
              {NODE_TYPES.find((t) => t.value === paletteType)?.label}
            </strong>
            {" — "}
            {NODE_TYPES.find((t) => t.value === paletteType)?.desc}
            {" · 빈 공간 클릭으로 노드 생성, 노드 더블클릭으로 라벨 수정."}
          </p>
        )}
        {selectedNode && (
          <>
            <div className="flex items-center gap-2">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brain-text-soft">
                축 지정
              </span>
              {AXIS_TAGS.map((a) => {
                const active = selectedNode.axis_tag === a.value;
                return (
                  <button
                    key={a.value}
                    onClick={() => toggleSelectedAxisTag(a.value)}
                    disabled={disabled}
                    title={`이 노드를 ${a.label} 축에 묶기 — 3축 분석 패널에서 ${a.label} 칸으로 분류됩니다. 다시 누르면 해제.`}
                    className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] transition disabled:opacity-50"
                    style={{
                      borderColor: active ? a.color : "var(--color-brain-border)",
                      background: active ? `${a.color}14` : "var(--color-brain-bg)",
                      color: active ? a.color : "var(--color-brain-text)",
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: a.color }}
                    />
                    {a.label}
                  </button>
                );
              })}
              <span className="ml-auto text-[10px] text-brain-text-muted">
                {selectedNode.axis_tag
                  ? "선택 해제하려면 같은 칩을 다시 누르세요"
                  : "축을 지정해야 3축 분석 패널에서 보입니다"}
              </span>
            </div>
            <p className="text-[11px] text-brain-text-muted">
              <strong style={{ color: "var(--color-brain-text)" }}>
                {selectedNode.label}
              </strong>
              {" — 역할 버튼을 다시 누르면 type 이 바뀝니다. 더블클릭으로 라벨 수정. 다른 노드 클릭 시 엣지 생성."}
            </p>
          </>
        )}
      </div>
      <div className="relative flex-1 overflow-hidden bg-brain-bg">
        <svg
          ref={svgRef}
          onClick={onCanvasClick}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStartCanvas}
          onTouchMove={onTouchMove}
          onTouchEnd={onMouseUp}
          onWheel={onWheelCanvas}
          className="h-full w-full"
          style={{ cursor: paletteType ? "crosshair" : "default", touchAction: "none" }}
        >
          {/* Per-relation arrow markers — v1 style colored arrows */}
          <defs>
            {EDGE_COLORS.map(({ relation, color }) => (
              <marker
                key={relation}
                id={`b180-arrow-${relation}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
              </marker>
            ))}
          </defs>
          <g transform={`translate(${viewport.x},${viewport.y}) scale(${zoom})`}>
          {canvas.edges.map((e) => {
            const from = nodeIndex.get(e.from);
            const to = nodeIndex.get(e.to);
            if (!from || !to) return null;
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const ec = EDGE_COLORS.find((c) => c.relation === e.relation);
            const edgeColor = ec?.color ?? "#A09684";
            const edgeStyle = ec?.style ?? "solid";
            const dashArray = edgeStyle === "dashed" ? "6 4" : edgeStyle === "dotted" ? "2 4" : undefined;
            return (
              <g key={e.id} onClick={() => onEdgeClick(e.id)} style={{ cursor: "pointer" }}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={edgeColor}
                  strokeWidth={1.5}
                  strokeDasharray={dashArray}
                  markerEnd={`url(#b180-arrow-${e.relation})`}
                  strokeOpacity={0.8}
                />
                <rect
                  x={midX - 26}
                  y={midY - 9}
                  width={52}
                  height={17}
                  rx={8}
                  fill="var(--color-brain-surface)"
                  stroke={edgeColor}
                  strokeOpacity={0.4}
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fontSize={9.5}
                  fill={edgeColor}
                >
                  {e.label ?? relationLabel(e.relation)}
                </text>
              </g>
            );
          })}
          {canvas.nodes.map((n) => {
            const nt = NODE_TYPES.find((t) => t.value === n.type);
            const color = nt?.color ?? "#8F857A";
            const selected = n.id === selectedNodeId;
            // Dynamic radius: wider for longer labels (like v1 nodeSize)
            const labelLen = n.label.length;
            const r = nodeRadius(n.label);
            // Split label into up to 2 lines for long text
            const words = n.label.split(/\s+/);
            const mid = Math.ceil(words.length / 2);
            const line1 = words.slice(0, mid).join(" ");
            const line2 = words.length > 1 ? words.slice(mid).join(" ") : null;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                onMouseDown={(e) => onNodeMouseDown(e, n)}
                onTouchStart={(e) => onNodeTouchStart(e, n)}
                onClick={(e) => onNodeClick(e, n)}
                onDoubleClick={(e) => onNodeDoubleClick(e, n)}
                style={{ cursor: "grab", touchAction: "none" }}
              >
                {/* Solid filled circle — v1 style */}
                <circle
                  r={r}
                  fill={color}
                  fillOpacity={0.92}
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth={selected ? 3 : 1}
                />
                {/* Selection ring */}
                {selected && (
                  <circle r={r + 4} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.5} />
                )}
                {/* Label — white text like v1 */}
                {line2 ? (
                  <>
                    <text
                      textAnchor="middle"
                      y={-5}
                      fontSize={labelLen > 6 ? 10 : 12}
                      fill="white"
                      fontFamily="var(--font-serif)"
                      fontWeight={500}
                      pointerEvents="none"
                    >
                      {line1}
                    </text>
                    <text
                      textAnchor="middle"
                      y={10}
                      fontSize={labelLen > 6 ? 10 : 12}
                      fill="white"
                      fontFamily="var(--font-serif)"
                      fontWeight={500}
                      pointerEvents="none"
                    >
                      {line2}
                    </text>
                  </>
                ) : (
                  <text
                    textAnchor="middle"
                    y={4}
                    fontSize={labelLen > 6 ? 10 : 12}
                    fill="white"
                    fontFamily="var(--font-serif)"
                    fontWeight={500}
                    pointerEvents="none"
                  >
                    {n.label}
                  </text>
                )}
              </g>
            );
          })}
          </g>
        </svg>
        {canvas.nodes.length === 0 && !paletteType && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-brain-text-soft">
            상단에서 노드 유형을 고른 뒤 캔버스를 클릭하면 노드가 생깁니다.
          </div>
        )}
        {pendingEdge && (
          <EdgeDialog
            choices={relationChoices}
            onPick={onConfirmEdge}
            onCancel={() => setPendingEdge(null)}
          />
        )}
      </div>
    </div>
  );
}

function EdgeDialog({
  choices,
  onPick,
  onCancel,
}: {
  choices: RelationChoice[];
  onPick: (choice: RelationChoice) => void;
  onCancel: () => void;
}) {
  const cols = choices.length > 6 ? 3 : 2;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
      <div className="rounded-2xl border border-brain-border bg-brain-surface p-5 shadow-soft-3 max-w-md">
        <h3 className="mb-3 font-display text-lg">관계 선택</h3>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {choices.map((c, i) => (
            <button
              key={`${c.value}:${c.token ?? c.label}:${i}`}
              onClick={() => onPick(c)}
              title={c.example ?? ""}
              className="rounded border border-brain-border bg-brain-bg px-3 py-2 text-sm hover:border-brain-accent"
            >
              {c.label}
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

function downloadSvgAsPng(svgEl: SVGSVGElement, filename = "brain180-canvas.png") {
  const rect = svgEl.getBoundingClientRect();
  const w = Math.max(rect.width, 800);
  const h = Math.max(rect.height, 600);
  const serialized = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w * 2;
    canvas.height = h * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FAF7F2";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = filename;
    a.click();
  };
  img.src = url;
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
    case "other":
      return "관계";
  }
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 12);
}
