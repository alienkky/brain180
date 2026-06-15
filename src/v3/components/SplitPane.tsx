// 좌/우(또는 상/하) 패널 분할 — 가운데 선을 드래그해 비율 조절 (v2 PracticeScreen 포팅).
// 모바일에서는 항상 상하 적층. 핸들의 ▲/▼ 버튼으로 한쪽 패널을 접었다 펼 수 있음.
// 비율은 localStorage 에 저장되어 다음 방문에도 유지.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIsMobile } from "../hooks/useIsMobile";

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

type Collapsed = "none" | "first" | "second";

export function SplitPane({
  left,
  right,
  initial = 45,
  min = 25,
  max = 70,
  storageKey,
  direction = "horizontal",
}: Props) {
  // 모바일에서는 좌우 분할을 항상 상하 적층으로 전환 (좁은 폭 대응)
  const isMobile = useIsMobile();
  const isVertical = isMobile ? true : direction === "vertical";
  const [pct, setPct] = useState<number>(() => {
    if (storageKey) {
      const saved = Number(localStorage.getItem(storageKey));
      if (saved >= min && saved <= max) return saved;
    }
    return initial;
  });
  const [collapsed, setCollapsed] = useState<Collapsed>("none");
  const layoutRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);
  const pctRef = useRef(pct);
  pctRef.current = pct;

  const HANDLE = 16; // 핸들 두께(px) — 터치 타겟 확보

  const onSplitPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (collapsed !== "none") return; // 접힌 상태에선 드래그 비활성
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      resizingRef.current = true;
      document.body.style.cursor = isVertical ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
    },
    [isVertical, collapsed],
  );

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

  // 접힘 상태에 따른 grid 비율
  const firstSize = collapsed === "first" ? "0%" : collapsed === "second" ? "minmax(0, 1fr)" : `${pct}%`;
  const lastSize = collapsed === "second" ? "0%" : collapsed === "first" ? "minmax(0, 1fr)" : "minmax(0, 1fr)";
  const template = `${firstSize} ${HANDLE}px ${lastSize}`;

  const stop = (e: React.PointerEvent) => e.stopPropagation();

  // 가장자리 접기/펼치기 영역 — 라인 안에 묻히는 글리프(테두리·배경 없음)
  const zoneClass =
    "flex items-center justify-center text-[9px] leading-none text-brain-text-soft hover:text-brain-accent transition-colors cursor-pointer select-none";

  // 첫 패널(위/왼쪽) 글리프
  const firstGlyph = isVertical ? (collapsed === "first" ? "▼" : "▲") : collapsed === "first" ? "▶" : "◀";
  // 둘째 패널(아래/오른쪽) 글리프
  const secondGlyph = isVertical ? (collapsed === "second" ? "▲" : "▼") : collapsed === "second" ? "◀" : "▶";

  return (
    <div
      ref={layoutRef}
      className="grid flex-1 overflow-hidden"
      style={isVertical ? { gridTemplateRows: template } : { gridTemplateColumns: template }}
    >
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">{left}</div>
      {/* 핸들 — 3등분: [위/왼 접기] · [드래그] · [아래/오른 접기] */}
      <div
        className={
          (isVertical ? "grid-cols-3 border-y " : "grid-rows-3 border-x ") +
          "grid border-brain-border bg-brain-surface-soft"
        }
        style={{ touchAction: "none" }}
        role="separator"
        aria-orientation={isVertical ? "horizontal" : "vertical"}
      >
        {/* 1구간: 첫 패널 접기/펼치기 */}
        <div
          onClick={() => setCollapsed((c) => (c === "first" ? "none" : "first"))}
          onPointerDown={stop}
          className={zoneClass}
          title={collapsed === "first" ? "펼치기" : isVertical ? "본문 접기" : "왼쪽 접기"}
        >
          {firstGlyph}
        </div>
        {/* 2구간: 드래그(양쪽 다 보임) — 이동 그립 */}
        <div
          onPointerDown={collapsed === "none" ? onSplitPointerDown : undefined}
          style={{ touchAction: "none" }}
          className={
            "flex items-center justify-center transition-colors hover:bg-brain-accent-soft/50 " +
            (collapsed === "none"
              ? isVertical
                ? "cursor-row-resize"
                : "cursor-col-resize"
              : "cursor-default opacity-40")
          }
          title={collapsed === "none" ? "드래그해서 크기 조절" : undefined}
        >
          <div className={"pointer-events-none " + (isVertical ? "flex gap-[3px]" : "flex flex-col gap-[3px]")}>
            <span className="block h-[3px] w-[3px] rounded-full bg-brain-text-soft" />
            <span className="block h-[3px] w-[3px] rounded-full bg-brain-text-soft" />
            <span className="block h-[3px] w-[3px] rounded-full bg-brain-text-soft" />
          </div>
        </div>
        {/* 3구간: 둘째 패널 접기/펼치기 */}
        <div
          onClick={() => setCollapsed((c) => (c === "second" ? "none" : "second"))}
          onPointerDown={stop}
          className={zoneClass}
          title={collapsed === "second" ? "펼치기" : isVertical ? "하단 접기" : "오른쪽 접기"}
        >
          {secondGlyph}
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">{right}</div>
    </div>
  );
}
