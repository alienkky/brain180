// 좌/우 패널 분할 레이아웃 — 가운데 선을 드래그해 비율 조절 (v2 PracticeScreen 포팅).
// 비율은 localStorage 에 저장되어 다음 방문에도 유지.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface Props {
  left: ReactNode;
  right: ReactNode;
  /** 왼쪽 패널 초기 비율 (%) */
  initial?: number;
  min?: number;
  max?: number;
  /** localStorage 저장 키 — 없으면 저장 안 함 */
  storageKey?: string;
}

export function SplitPane({ left, right, initial = 45, min = 25, max = 70, storageKey }: Props) {
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
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!resizingRef.current || !layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const next = ((e.clientX - rect.left) / rect.width) * 100;
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
  }, [min, max, storageKey]);

  return (
    <div
      ref={layoutRef}
      className="grid flex-1 overflow-hidden"
      style={{ gridTemplateColumns: `${pct}% 10px minmax(0, 1fr)` }}
    >
      <div className="flex min-h-0 flex-col overflow-hidden">{left}</div>
      <div
        className="flex cursor-col-resize items-center justify-center border-x border-brain-border bg-brain-surface-soft transition-colors hover:bg-brain-accent-soft/60"
        style={{ touchAction: "none" }}
        onPointerDown={onSplitPointerDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="좌우 패널 너비 조절"
        title="드래그해서 너비 조절"
      >
        <div className="h-12 w-1 rounded-full bg-brain-border" />
      </div>
      <div className="flex min-h-0 flex-col overflow-hidden">{right}</div>
    </div>
  );
}
