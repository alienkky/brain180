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
  disabled?: boolean;
}

const COLORS = ["#2A241D", "#B85C3F", "#C68A3D", "#6E8F82", "#6F8AA8", "#8F7FA8"];
const WIDTHS = [2, 4, 8, 16];

function FreeCanvasBase({ initial, onSave, onChange, onCanvasRef, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pathCount, setPathCount] = useState(0);
  const [dirty, setDirty] = useState(false); // unsaved changes indicator
  const isDrawing = useRef(false);
  const paths = useRef<DrawPath[]>((initial?.paths ?? []).map((p) => ({ ...p })));
  const currentPath = useRef<DrawPath | null>(null);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: DrawPath) => {
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
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const path of paths.current) drawPath(ctx, path);
    if (currentPath.current) drawPath(ctx, currentPath.current);
  }, [drawPath]);

  useEffect(() => {
    paths.current = (initial?.paths ?? []).map((p) => ({ ...p }));
    setPathCount(paths.current.length);
    setDirty(false);
    redraw();
  }, [initial, redraw]);

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

  function buildSnapshot(): FreeCanvasJson {
    return {
      version: 1,
      viewport: initial?.viewport ?? { x: 0, y: 0, zoom: 1 },
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
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
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
    if (!isDrawing.current || !currentPath.current) return;
    e.preventDefault();
    const pt = getPoint(e.clientX, e.clientY);
    if (!pt) return;
    currentPath.current.points.push(pt);
    const ctx = getCtx();
    if (!ctx || currentPath.current.points.length < 2) return;
    const pts = currentPath.current.points;
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
    if (!isDrawing.current || !currentPath.current) return;
    e?.preventDefault();
    if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
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
      <div className="flex flex-wrap items-center gap-2 border-b border-brain-border bg-brain-surface px-4 py-2">
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
        <div className="ml-auto flex items-center gap-3">
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
      />
    </div>
  );
}

export function FreeDrawCanvas(props: Props) {
  return <FreeCanvasBase {...props} />;
}

export type FreeDrawCanvasGetBase64 = () => string | null;
