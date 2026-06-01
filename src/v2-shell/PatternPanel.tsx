// Owner: 연다리 [통합설계].
//
// v1 PatternPanel 의 *사고/가치/시간* 패턴 카드를 v2 셸로 복원한 패널.
//
// v1 PatternPanel 은 *작가가 박은* patterns 배열을 그대로 그렸다 (예: "수만 명
// → 하나밖에 없는 존재", "대칭적 변환"). v2 lessons / text_excerpts 스키마는
// patterns 컬럼이 아직 없다 (ALI-62 차곡담 후속). 그래서 본 패널은 사용자의
// 현재 캔버스에서 *구조 패턴*을 휴리스틱으로 추출해 카드로 보여준다.
//
// 작가 큐레이션 패턴이 들어오면:
//   - lesson.patterns 를 prop 으로 받아 휴리스틱 카드와 *함께* 그린다
//   - 두 영역을 시각적으로 분리 ("작가의 패턴" / "내 캔버스의 패턴")

import { useMemo } from "react";
import type { CanvasJson, CanvasNode } from "./api";

interface DetectedPattern {
  id: string;
  kind:
    | "hub"
    | "triangle"
    | "chain"
    | "bridge"
    | "axis-spread"
    | "type-trio";
  name: string;
  description: string;
  nodes: CanvasNode[];
}

const TYPE_LABEL: Record<CanvasNode["type"], string> = {
  concept: "핵심",
  anchor: "기둥",
  bridge: "다리",
  branch: "가지",
};

const TYPE_COLOR: Record<CanvasNode["type"], string> = {
  concept: "var(--color-brain-node-root)",
  anchor: "var(--color-brain-node-anchor)",
  bridge: "var(--color-brain-node-bridge)",
  branch: "var(--color-brain-node-branch)",
};

export function extractPatterns(canvas: CanvasJson | null): DetectedPattern[] {
  if (!canvas || canvas.nodes.length === 0) return [];
  const out: DetectedPattern[] = [];
  const nodes = canvas.nodes;
  const edges = canvas.edges;
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const adj = new Map<string, Set<string>>();
  nodes.forEach((n) => adj.set(n.id, new Set()));
  edges.forEach((e) => {
    adj.get(e.from)?.add(e.to);
    adj.get(e.to)?.add(e.from);
  });

  // 1) Hub — degree >= 3
  for (const n of nodes) {
    const degree = adj.get(n.id)?.size ?? 0;
    if (degree >= 3) {
      out.push({
        id: `hub-${n.id}`,
        kind: "hub",
        name: `"${n.label}" 중심 구조`,
        description: `${degree}개의 노드가 "${n.label}" 에 연결됩니다. 저자의 사고가 이 한 지점으로 수렴 또는 발산하는 패턴.`,
        nodes: [n, ...Array.from(adj.get(n.id) ?? []).map((id) => byId.get(id)!).filter(Boolean)],
      });
    }
  }

  // 2) Triangle — 3 nodes mutually connected
  const seenTri = new Set<string>();
  for (const a of nodes) {
    const na = adj.get(a.id);
    if (!na) continue;
    for (const bId of na) {
      const nb = adj.get(bId);
      if (!nb) continue;
      for (const cId of nb) {
        if (cId === a.id) continue;
        if (!na.has(cId)) continue;
        const key = [a.id, bId, cId].sort().join("|");
        if (seenTri.has(key)) continue;
        seenTri.add(key);
        const b = byId.get(bId);
        const c = byId.get(cId);
        if (!b || !c) continue;
        out.push({
          id: `tri-${key}`,
          kind: "triangle",
          name: `삼각 관계: ${a.label} · ${b.label} · ${c.label}`,
          description: "세 개념이 서로 모두 연결됨 — 상호 보강 또는 긴장의 삼각 구조.",
          nodes: [a, b, c],
        });
      }
    }
  }

  // 3) Chain — linear path of 3+ where intermediate degree == 2
  const visited = new Set<string>();
  for (const start of nodes) {
    if (visited.has(start.id)) continue;
    const startDeg = adj.get(start.id)?.size ?? 0;
    if (startDeg !== 1) continue; // chain endpoint
    const path = [start];
    let prev = "";
    let curr = start.id;
    while (true) {
      const neigh = Array.from(adj.get(curr) ?? []).filter((n) => n !== prev);
      if (neigh.length !== 1) break;
      const next = neigh[0]!;
      const nextDeg = adj.get(next)?.size ?? 0;
      const nextNode = byId.get(next);
      if (!nextNode) break;
      path.push(nextNode);
      visited.add(curr);
      prev = curr;
      curr = next;
      if (nextDeg !== 2) break;
    }
    if (path.length >= 3) {
      visited.add(curr);
      out.push({
        id: `chain-${path[0]!.id}-${path[path.length - 1]!.id}`,
        kind: "chain",
        name: `전개 사슬: ${path.map((p) => p.label).join(" → ")}`,
        description: `${path.length}단계 선형 전개 — 저자의 사유가 시간/논리 순서대로 일렬로 흐르는 패턴.`,
        nodes: path,
      });
    }
  }

  // 4) Type trio — 핵심 + 기둥 + 다리 가 함께 연결된 부분 구조
  for (const tri of out.filter((p) => p.kind === "triangle")) {
    const types = new Set(tri.nodes.map((n) => n.type));
    if (
      types.has("concept") &&
      types.has("anchor") &&
      types.has("bridge")
    ) {
      out.push({
        id: `trio-${tri.id}`,
        kind: "type-trio",
        name: "기본 사고 구조 (핵심+기둥+다리)",
        description: "핵심을 기둥이 떠받치고 다리가 연결하는, 사고 지도의 기본 골격이 완성된 자리.",
        nodes: tri.nodes,
      });
    }
  }

  // 5) Axis spread — axis_tag 다양성
  const axisCount = new Map<string, number>();
  for (const n of nodes) {
    if (n.axis_tag) {
      axisCount.set(n.axis_tag, (axisCount.get(n.axis_tag) ?? 0) + 1);
    }
  }
  if (axisCount.size >= 2) {
    out.push({
      id: "axis-spread",
      kind: "axis-spread",
      name: `다축 사유: ${Array.from(axisCount.keys()).join(" · ")}`,
      description: `${axisCount.size} 가지 축 (cognition/value/time) 에 걸쳐 사고가 분포 — 4차원 해석의 기본 신호.`,
      nodes: nodes.filter((n) => !!n.axis_tag),
    });
  }

  return out;
}

interface Props {
  canvas: CanvasJson | null;
}

export function PatternPanel({ canvas }: Props) {
  const patterns = useMemo(() => extractPatterns(canvas), [canvas]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-brain-surface-soft">
      <div className="border-b border-brain-border bg-brain-surface px-6 py-3">
        <p
          className="mb-1 text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
        >
          사고 패턴
        </p>
        <h3
          className="text-[16px]"
          style={{
            color: "var(--color-brain-text)",
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
          }}
        >
          내 캔버스에서 발견된 구조
        </h3>
      </div>

      <div className="space-y-3 px-6 py-5">
        {patterns.length === 0 && (
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: "rgba(111, 138, 168, 0.06)",
              border: "1px solid rgba(111, 138, 168, 0.18)",
            }}
          >
            <p
              className="text-[13px] leading-relaxed"
              style={{
                color: "var(--color-brain-text-muted)",
                fontFamily: "var(--font-serif)",
              }}
            >
              아직 추출할 패턴이 없습니다. 캔버스에 노드 3개 이상 + 엣지 몇 개가
              있으면 *허브 / 삼각관계 / 전개 사슬 / 다축 사유* 등 구조 신호가
              여기에 카드로 보입니다.
            </p>
          </div>
        )}
        {patterns.map((p) => (
          <article
            key={p.id}
            className="rounded-lg border border-brain-border bg-brain-surface px-4 py-3"
          >
            <p
              className="mb-1 text-[10px] uppercase tracking-[0.18em]"
              style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
            >
              {kindLabel(p.kind)}
            </p>
            <h4
              className="mb-2 text-[14.5px]"
              style={{
                color: "var(--color-brain-text)",
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
              }}
            >
              {p.name}
            </h4>
            <p
              className="mb-3 text-[12.5px] leading-relaxed"
              style={{ color: "var(--color-brain-text-muted)" }}
            >
              {p.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {p.nodes.map((n) => (
                <span
                  key={n.id}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px]"
                  style={{
                    borderColor: TYPE_COLOR[n.type],
                    color: TYPE_COLOR[n.type],
                    background: `${TYPE_COLOR[n.type]}10`,
                  }}
                  title={TYPE_LABEL[n.type]}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: TYPE_COLOR[n.type] }}
                  />
                  {n.label}
                </span>
              ))}
            </div>
          </article>
        ))}

        <div
          className="rounded-lg p-3.5"
          style={{
            backgroundColor: "rgba(111, 138, 168, 0.06)",
            border: "1px solid rgba(111, 138, 168, 0.18)",
          }}
        >
          <p
            className="text-[12px] leading-relaxed"
            style={{
              color: "var(--color-brain-text-muted)",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
            }}
          >
            이 패턴은 *내 캔버스의 그래프 구조*에서만 추출됩니다. 저자가 박은
            "수만 명 → 하나밖에 없는 존재" 같은 *내용 패턴*은 작가 큐레이션이
            들어와야 보입니다 (text_excerpts.patterns 컬럼이 ALI-62 매듭에서
            열리면 함께 표시).
          </p>
        </div>
      </div>
    </div>
  );
}

function kindLabel(k: DetectedPattern["kind"]): string {
  switch (k) {
    case "hub":
      return "허브";
    case "triangle":
      return "삼각관계";
    case "chain":
      return "전개 사슬";
    case "bridge":
      return "다리";
    case "axis-spread":
      return "다축 사유";
    case "type-trio":
      return "기본 골격";
  }
}
