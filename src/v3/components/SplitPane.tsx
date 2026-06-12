// 좌/우 패널 분할 레이아웃 — 가운데 선을 드래그해 비율 조절 (v2 PracticeScreen 포팅).
// 비율은 localStorage 에 저장되어 다음 방문에도 유지.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface Props {
  left: ReactNode;
  right: ReactNode;
  /** 첫 번째 패널(왼쪽/위) 초기 비율 (%) */
  initial?: number;
  min?: number;
  max?: number;
  /** localStorage 저장 키 — 없으면 저장 안 함 */
  storageKey?: string;
  /** vertical = 상하 분할 (left=위, right=아래) */
  direction?: "horizontal" | "vertical";
}

export function SplitPane({
  left,
  right,
  initial = 45,
  min = 25,
  max = 70,
  storageKey,
  direction = "horizontal",
}: Props) {
  const isVertical = direction === "vertical";
  const [pct, setPct] = useState<number>(() => {
    if (storageKey) {
      const saved = Number(localStorage.getItem(storageKey));
      if (saved >= min && saved <= max) return saved;
    }
    return initial;
  });
  const layoutRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);
  const pctRef = useRef(pct);
  pctRef.current = pct;

  const onSplitPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = isVertical ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";
  }, [isVertical]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!resizingRef.current || !layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      const size = isVertical ? rect.height : rect.width;
      if (size <= 0) return;
      const offset = isVertical ? e.clientY - rect.top : e.clientX - rect.left;
      const next = (offset / size) * 100;
      setPct(Math.min(max, Math.max(min, next)));
    };
    const onPointerUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (storageKey) localStorage.setItem(storageKey, String(Math.round(pctRef.current)));
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [min, max, storageKey, isVertical]);

  return (
    <div
      ref={layoutRef}
      className="grid flex-1 overflow-hidden"
      style={
        isVertical
          ? { gridTemplateRows: `${pct}% 10px minmax(0, 1fr)` }
          : { gridTemplateColumns: `${pct}% 10px minmax(0, 1fr)` }
      }
    >
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">{left}</div>
      <div
        className={
          isVertical
            ? "flex cursor-row-resize items-center justify-center border-y border-brain-border bg-brain-surface-soft transition-colors hover:bg-brain-accent-soft/60"
            : "flex cursor-col-resize items-center justify-center border-x border-brain-border bg-brain-surface-soft transition-colors hover:bg-brain-accent-soft/60"
        }
        style={{ touchAction: "none" }}
        onPointerDown={onSplitPointerDown}
        role="separator"
        aria-orientation={isVertical ? "horizontal" : "vertical"}
        aria-label={isVertical ? "상하 패널 높이 조절" : "좌우 패널 너비 조절"}
        title={isVertical ? "드래그해서 높이 조절" : "드래그해서 너비 조절"}
      >
        <div className={isVertical ? "h-1 w-12 rounded-full bg-brain-border" : "h-12 w-1 rounded-full bg-brain-border"} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">{right}</div>
    </div>
  );
}
