import { useEffect, useState } from "react";

// 모바일(좁은 화면) 여부 — 레이아웃을 세로 적층으로 전환하는 데 사용.
// 기본 breakpoint 768px (Tailwind md 미만).
export function useIsMobile(maxWidth = 768): boolean {
  const [mobile, setMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth <= maxWidth : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [maxWidth]);
  return mobile;
}
