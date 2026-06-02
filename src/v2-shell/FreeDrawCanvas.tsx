// FreeDrawCanvas — ALI-81 자유형 캔버스 모드.
// HTML Canvas 기반 자유 드로잉. 저장은 CanvasJson 의 paths 확장 필드로.
// 제약형/단계형과 동일한 onSave / onChange 시그니처를 사용하여 PracticeScreen 이 통일된 방식으로 핸들링.

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
  disabled?: boolean;
}

const COLORS = ["#2A241D", "#B85C3F", "#C68A3D", "#6E8F82", "#6F8AA8", "#8F7FA8"];
const WIDTHS = [2, 4, 8, 16];

function FreeCanvasBase({ initial, onSave, onChange, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const isDrawing = useRef(false);
  const paths = useRef<DrawPath[]>((initial?.paths ?? []).map((p) => ({ ...p })));
  const currentPath = useRef<DrawPath | null>(null);
  const saveTimer = useRef<number | null>(null);

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
    // Also draw the in-progress stroke so it survives re-renders
    if (currentPath.current) drawPath(ctx, currentPath.current);
  }, [drawPath]);

  useEffect(() => {
    paths.current = (initial?.paths ?? []).map((p) => ({ ...p }));
    redraw();
  }, [initial, redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const newW = canvas.offsetWidth;
      const newH = canvas.offsetHeight;
      // Only reset canvas (which clears it) if size actually changed
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

  function scheduleSave() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaveState("saving");
      const next: FreeCanvasJson = {
        version: 1,
        viewport: initial?.viewport ?? { x: 0, y: 0, zoom: 1 },
        nodes: [],
        edges: [],
        paths: paths.current.map((p) => ({ ...p, points: [...p.points] })),
      };
      try {
        await onSave(next);
        setSaveState("saved");
        onChange?.(next);
        setTimeout(() => setSaveState("idle"), 1500);
      } catch {
        setSaveState("error");
      }
    }, 2000);
  }

  function getPoint(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function onPointerDown(e: React.MouseEvent | React.TouchEvent) {
    if (disabled) return;
    const pt = getPoint(e);
    if (!pt) return;
    isDrawing.current = true;
    if (tool === "eraser") {
      currentPath.current = { color: "#FAF7F2", width: width * 6, points: [pt] };
    } else {
      currentPath.current = { color, width, points: [pt] };
    }
  }

  function onPointerMove(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing.current || !currentPath.current) return;
    const pt = getPoint(e);
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

  function onPointerUp() {
    if (!isDrawing.current || !currentPath.current) return;
    isDrawing.current = false;
    if (currentPath.current.points.length >= 2) {
      paths.current.push(currentPath.current);
      scheduleSave();
    }
    currentPath.current = null;
  }

  function onClear() {
    paths.current = [];
    redraw();
    scheduleSave();
  }

  const saveLabel = { idle: "", saving: "저장 중…", saved: "저장됨", error: "저장 실패" }[saveState];

  return (
    <div className="flex h-full flex-col bg-brain-bg">
      <div className="flex items-center gap-2 border-b border-brain-border bg-brain-surface px-4 py-2">
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
          className="rounded px-3 py-1.5 text-xs text-brain-danger hover:bg-red-50"
          onClick={onClear}
          disabled={disabled}
        >
          전체 지우기
        </button>
        {saveLabel ? (
          <span className="ml-auto text-xs text-brain-text-muted">{saveLabel}</span>
        ) : null}
      </div>
      <canvas
        ref={canvasRef}
        className="flex-1 cursor-crosshair touch-none"
        style={{ display: "block" }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      />
    </div>
  );
}

export function FreeDrawCanvas(props: Props) {
  return <FreeCanvasBase {...props} />;
}
