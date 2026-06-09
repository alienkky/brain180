// FreeDrawCanvas — ALI-81 자유형 캔버스 모드.
// HTML Canvas 기반 자유 드로잉. 저장은 수동 버튼으로만 (자동 저장 제거 — 아이패드 드래그 간섭 방지).
// onChange 는 즉시 호출 (튜터 비전용). onSave 는 "저장" 버튼 클릭 시만.

import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasJson } from "./api";

export interface DrawPath {
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export interface FreeCanvasJson extends CanvasJson {
  paths?: DrawPath[];
}

type Tool = "pen" | "eraser";

interface Props {
  initial: FreeCanvasJson | null;
  onSave: (next: FreeCanvasJson) => Promise<void> | void;
  onChange?: (next: FreeCanvasJson) => void;
  onCanvasRef?: (getBase64: () => string | null) => void;
  onAskTutor?: (snapshot: FreeCanvasJson) => void;
  disabled?: boolean;
}

const COLORS = ["#2A241D", "#B85C3F", "#C68A3D", "#6E8F82", "#6F8AA8", "#8F7FA8"];
const WIDTHS = [2, 4, 8, 16];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function drawFreePath(ctx: CanvasRenderingContext2D, path: DrawPath) {
  if (path.points.length < 2) return;
  ctx.beginPath();
  ctx.strokeStyle = path.color;
  ctx.lineWidth = path.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.moveTo(path.points[0].x, path.points[0].y);
  for (let i = 1; i < path.points.length; i++) {
    ctx.lineTo(path.points[i].x, path.points[i].y);
  }
  ctx.stroke();
}

export function freeCanvasToBase64(snapshot: FreeCanvasJson | null | undefined): string | null {
  const paths = snapshot?.paths ?? [];
  if (paths.length === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#FAF7F2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const path of paths) {
    drawFreePath(ctx, path);
  }
  return canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
}

function FreeCanvasBase({ initial, onSave, onChange, onCanvasRef, onAskTutor, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pathCount, setPathCount] = useState(0);
  const [dirty, setDirty] = useState(false); // unsaved changes indicator
  const [viewport, setViewport] = useState(() => ({
    x: initial?.viewport?.x ?? 0,
    y: initial?.viewport?.y ?? 0,
    zoom: clampZoom(initial?.viewport?.zoom ?? 1),
  }));
  const isDrawing = useRef(false);
  const paths = useRef<DrawPath[]>((initial?.paths ?? []).map((p) => ({ ...p })));
  const currentPath = useRef<DrawPath | null>(null);
  const pointerCache = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);
  const zoom = viewport.zoom;

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: DrawPath) => {
    drawFreePath(ctx, path);
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(viewport.zoom, 0, 0, viewport.zoom, viewport.x, viewport.y);
    for (const path of paths.current) drawPath(ctx, path);
    if (currentPath.current) drawPath(ctx, currentPath.current);
  }, [drawPath, viewport]);

  useEffect(() => {
    paths.current = (initial?.paths ?? []).map((p) => ({ ...p }));
    setPathCount(paths.current.length);
    setViewport({
      x: initial?.viewport?.x ?? 0,
      y: initial?.viewport?.y ?? 0,
      zoom: clampZoom(initial?.viewport?.zoom ?? 1),
    });
    setDirty(false);
  }, [initial]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    if (!onCanvasRef) return;
    onCanvasRef(() => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
    });
  }, [onCanvasRef]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void performSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const newW = canvas.offsetWidth;
      const newH = canvas.offsetHeight;
      if (canvas.width === newW && canvas.height === newH) return;
      canvas.width = newW;
      canvas.height = newH;
      redraw();
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    redraw();
    return () => ro.disconnect();
  }, [redraw]);

  // iOS Safari ignores preventDefault() called from a React synthetic
  // pointer/touch handler because the underlying listener is registered
  // as passive. The page therefore scrolls while the learner is drawing
  // with Apple Pencil even though our React onPointerMove blocks default
  // synthetically. Attach native non-passive listeners on the canvas so
  // preventDefault() truly suppresses the browser's pan / scroll.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const block = (e: Event) => {
      e.preventDefault();
    };
    const opts: AddEventListenerOptions = { passive: false };
    canvas.addEventListener("touchstart", block, opts);
    canvas.addEventListener("touchmove", block, opts);
    canvas.addEventListener("touchend", block, opts);
    canvas.addEventListener("touchcancel", block, opts);
    canvas.addEventListener("gesturestart", block, opts);
    canvas.addEventListener("gesturechange", block, opts);
    canvas.addEventListener("gestureend", block, opts);
    return () => {
      canvas.removeEventListener("touchstart", block, opts);
      canvas.removeEventListener("touchmove", block, opts);
      canvas.removeEventListener("touchend", block, opts);
      canvas.removeEventListener("touchcancel", block, opts);
      canvas.removeEventListener("gesturestart", block, opts);
      canvas.removeEventListener("gesturechange", block, opts);
      canvas.removeEventListener("gestureend", block, opts);
    };
  }, []);

  function buildSnapshot(): FreeCanvasJson {
    return {
      version: 1,
      viewport,
      nodes: [],
      edges: [],
      paths: paths.current.map((p) => ({ ...p, points: [...p.points] })),
    };
  }

  async function performSave() {
    setSaveState("saving");
    const next = buildSnapshot();
    try {
      await onSave(next);
      onChange?.(next);
      setSaveState("saved");
      setDirty(false);
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  }

  function notifyChange() {
    // Notify parent of current canvas state (for tutor vision) without saving to DB
    const next = buildSnapshot();
    onChange?.(next);
  }

  function getPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.x) / viewport.zoom,
      y: (clientY - rect.top - viewport.y) / viewport.zoom,
    };
  }

  function setZoom(nextZoom: number, anchor?: { clientX: number; clientY: number }) {
    const next = clampZoom(nextZoom);
    setViewport((current) => {
      const canvas = canvasRef.current;
      if (!canvas) return { ...current, zoom: next };
      const rect = canvas.getBoundingClientRect();
      const screenX = anchor ? anchor.clientX - rect.left : rect.width / 2;
      const screenY = anchor ? anchor.clientY - rect.top : rect.height / 2;
      const canvasX = (screenX - current.x) / current.zoom;
      const canvasY = (screenY - current.y) / current.zoom;
      return {
        x: screenX - canvasX * next,
        y: screenY - canvasY * next,
        zoom: next,
      };
    });
    setDirty(true);
  }

  function pointerDistance() {
    const points = Array.from(pointerCache.current.values());
    const a = points[0];
    const b = points[1];
    if (!a || !b) return null;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function updatePointer(e: React.PointerEvent<HTMLCanvasElement>) {
    pointerCache.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.preventDefault();
    updatePointer(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointerCache.current.size >= 2) {
      isDrawing.current = false;
      currentPath.current = null;
      pinchDistance.current = pointerDistance();
      return;
    }
    const pt = getPoint(e.clientX, e.clientY);
    if (!pt) return;
    isDrawing.current = true;
    if (tool === "eraser") {
      currentPath.current = { color: "#FAF7F2", width: width * 6, points: [pt] };
    } else {
      currentPath.current = { color, width, points: [pt] };
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    updatePointer(e);
    if (pointerCache.current.size >= 2) {
      e.preventDefault();
      isDrawing.current = false;
      currentPath.current = null;
      const distance = pointerDistance();
      if (!distance) return;
      if (pinchDistance.current) {
        const points = Array.from(pointerCache.current.values());
        const [a, b] = points;
        setZoom(zoom * (distance / pinchDistance.current), {
          clientX: (a.x + b.x) / 2,
          clientY: (a.y + b.y) / 2,
        });
      }
      pinchDistance.current = distance;
      return;
    }
    if (!isDrawing.current || !currentPath.current) return;
    e.preventDefault();
    const pt = getPoint(e.clientX, e.clientY);
    if (!pt) return;
    currentPath.current.points.push(pt);
    const ctx = getCtx();
    if (!ctx || currentPath.current.points.length < 2) return;
    const pts = currentPath.current.points;
    ctx.setTransform(viewport.zoom, 0, 0, viewport.zoom, viewport.x, viewport.y);
    ctx.beginPath();
    ctx.strokeStyle = currentPath.current.color;
    ctx.lineWidth = currentPath.current.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const prev = pts[pts.length - 2];
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  }

  function onPointerUp(e?: React.PointerEvent<HTMLCanvasElement>) {
    if (e) {
      pointerCache.current.delete(e.pointerId);
      if (pointerCache.current.size < 2) pinchDistance.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
    if (!isDrawing.current || !currentPath.current) return;
    e?.preventDefault();
    isDrawing.current = false;
    if (currentPath.current.points.length >= 2) {
      paths.current.push(currentPath.current);
      setPathCount(paths.current.length);
      setDirty(true);
      // Notify parent immediately (for tutor vision) without triggering DB save
      notifyChange();
    }
    currentPath.current = null;
  }

  function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    if (disabled) return;
    if (!e.ctrlKey && Math.abs(e.deltaY) < 50) return;
    e.preventDefault();
    setZoom(zoom + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), e);
  }

  function onUndo() {
    if (paths.current.length === 0) return;
    paths.current.pop();
    setPathCount(paths.current.length);
    setDirty(true);
    redraw();
    notifyChange();
  }

  function onClear() {
    paths.current = [];
    setPathCount(0);
    setDirty(true);
    redraw();
    notifyChange();
  }

  const saveLabel = {
    idle: dirty ? "● 미저장" : "",
    saving: "저장 중…",
    saved: "저장됨",
    error: "저장 실패",
  }[saveState];

  const saveLabelColor = saveState === "error" ? "text-brain-danger"
    : saveState === "saved" ? "text-brain-sage"
    : dirty ? "text-brain-highlight"
    : "text-brain-text-muted";

  return (
    <div className="flex h-full flex-col bg-brain-bg">
      <div className="flex flex-wrap items-center gap-2 border-b border-brain-border bg-brain-surface px-4 py-2 max-md:order-last max-md:max-h-36 max-md:overflow-y-auto max-md:border-b-0 max-md:border-t max-md:px-3">
        <button
          className={`rounded px-3 py-1.5 text-xs font-medium ${tool === "pen" ? "bg-brain-accent text-white" : "bg-brain-surface-soft text-brain-text"}`}
          onClick={() => setTool("pen")}
          disabled={disabled}
        >
          펜
        </button>
        <button
          className={`rounded px-3 py-1.5 text-xs font-medium ${tool === "eraser" ? "bg-brain-accent text-white" : "bg-brain-surface-soft text-brain-text"}`}
          onClick={() => setTool("eraser")}
          disabled={disabled}
        >
          지우개
        </button>
        <div className="mx-1 h-5 w-px bg-brain-border" />
        {COLORS.map((c) => (
          <button
            key={c}
            className={`h-5 w-5 rounded-full border-2 transition-transform ${color === c && tool === "pen" ? "scale-125 border-brain-text" : "border-transparent"}`}
            style={{ backgroundColor: c }}
            onClick={() => { setColor(c); setTool("pen"); }}
            disabled={disabled}
          />
        ))}
        <div className="mx-1 h-5 w-px bg-brain-border" />
        {WIDTHS.map((w) => (
          <button
            key={w}
            className={`flex h-6 w-6 items-center justify-center rounded ${width === w ? "bg-brain-surface-soft ring-1 ring-brain-accent" : ""}`}
            onClick={() => setWidth(w)}
            disabled={disabled}
            title={`굵기 ${w}`}
          >
            <span
              className="rounded-full bg-brain-text"
              style={{ width: Math.min(w * 1.5, 20), height: Math.min(w * 1.5, 20) }}
            />
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-brain-border" />
        <button
          className="rounded px-3 py-1.5 text-xs text-brain-text-muted hover:bg-brain-surface-soft disabled:opacity-40"
          onClick={onUndo}
          disabled={disabled || pathCount === 0}
          title="마지막 획 되돌리기 (Ctrl+Z)"
        >
          ↩ 되돌리기
        </button>
        <button
          className="rounded px-3 py-1.5 text-xs text-brain-danger hover:bg-red-50"
          onClick={onClear}
          disabled={disabled}
        >
          전체 지우기
        </button>
        <div className="mx-1 h-5 w-px bg-brain-border" />
        <button
          className="rounded border border-brain-border px-2 py-1 text-xs text-brain-text-muted hover:bg-brain-surface-soft disabled:opacity-40"
          onClick={() => setZoom(zoom - ZOOM_STEP)}
          disabled={disabled || zoom <= MIN_ZOOM}
          title="Zoom out"
        >
          -
        </button>
        <span className="min-w-10 text-center text-xs tabular-nums text-brain-text-muted">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="rounded border border-brain-border px-2 py-1 text-xs text-brain-text-muted hover:bg-brain-surface-soft disabled:opacity-40"
          onClick={() => setZoom(zoom + ZOOM_STEP)}
          disabled={disabled || zoom >= MAX_ZOOM}
          title="Zoom in"
        >
          +
        </button>
        <div className="ml-auto flex items-center gap-2">
          {onAskTutor && (
            <button
              className="rounded border border-brain-accent/60 px-2 py-1 text-xs text-brain-accent hover:bg-brain-accent-soft/50 disabled:opacity-50"
              onClick={() => onAskTutor(buildSnapshot())}
              disabled={disabled}
              title="현재 자유형 캔버스 전체를 튜터에게 보내 제안을 받습니다"
            >
              튜터 제안
            </button>
          )}
          {saveLabel ? (
            <span className={`text-xs ${saveLabelColor}`}>{saveLabel}</span>
          ) : null}
          <button
            className="rounded bg-brain-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            onClick={() => void performSave()}
            disabled={disabled || saveState === "saving"}
            title="캔버스 저장 (Ctrl+S)"
          >
            {saveState === "saving" ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="flex-1 cursor-crosshair touch-none"
        style={{
          display: "block",
          touchAction: "none",
          overscrollBehavior: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      />
    </div>
  );
}

export function FreeDrawCanvas(props: Props) {
  return <FreeCanvasBase {...props} />;
}

export type FreeDrawCanvasGetBase64 = () => string | null;
