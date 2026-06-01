// Owner: 연다리 [통합설계].
//
// v1 EvaluationPanel 의 자기평가 흐름을 v2 셸로 복원한 패널.
//
// v1 의 평가는 *시스템 저자가 박은 reference CognitiveMap* 과 비교했지만,
// v2 의 lessons 는 아직 reference map 컬럼이 없다 (admin-authored map 은
// ALI-62 차곡담의 후속 매듭). 그래서 본 패널은 *휴리스틱-전용* 모드로 시작
// — 사용자의 현재 캔버스만 보고 구조적 신호로 점수/조언을 만든다.
//
// 후속 (reference map 가능해진 시점):
//   - lesson.reference_canvas 필드를 받아 v1 evaluate() 의 매칭 로직을
//     이 파일에 그대로 이식.
//   - 이 파일의 `evaluate` 시그니처를 reference 옵셔널로 확장.

import { useMemo } from "react";
import type { CanvasJson, CanvasNode } from "./api";

export interface EvalResult {
  score: number;
  grade: "뛰어남" | "양호" | "발전 중" | "시작 단계";
  gradeColor: string;
  metrics: {
    nodeCount: number;
    edgeCount: number;
    typeDiversity: number;
    orphanCount: number;
    citedNodes: number;
    edgeDensity: number;
  };
  strengths: string[];
  advice: string[];
}

const COLOR_OK = "#6B8B6E";
const COLOR_WARN = "#C68A3D";
const COLOR_LOW = "#B85C3F";

export function evaluateCanvas(canvas: CanvasJson | null): EvalResult {
  const nodes = canvas?.nodes ?? [];
  const edges = canvas?.edges ?? [];

  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const typeSet = new Set<CanvasNode["type"]>();
  nodes.forEach((n) => typeSet.add(n.type));
  const typeDiversity = typeSet.size;
  const citedNodes = nodes.filter((n) => !!n.cite).length;
  const connected = new Set<string>();
  edges.forEach((e) => {
    connected.add(e.from);
    connected.add(e.to);
  });
  const orphanCount = nodes.filter((n) => !connected.has(n.id)).length;
  const edgeDensity = nodeCount > 0 ? edgeCount / nodeCount : 0;

  // 점수 합산 (0–100). 항목별 가중치는 v1 의 nodeScore/edgeScore 비례 (≈70/30)
  // 를 휴리스틱 5축으로 분해.
  let score = 0;
  const strengths: string[] = [];
  const advice: string[] = [];

  // 1) 노드 수 (max 25)
  if (nodeCount === 0) {
    advice.push("아직 노드가 없습니다. 본문에서 핵심 단어를 골라 노드를 만들어 보세요.");
  } else if (nodeCount < 3) {
    score += 10;
    advice.push(`노드가 ${nodeCount}개로 부족합니다. 최소 3-5개 핵심 개념을 잡아보세요.`);
  } else if (nodeCount <= 5) {
    score += 18;
    strengths.push(`${nodeCount}개의 노드로 핵심 구조를 잡았습니다.`);
  } else if (nodeCount <= 12) {
    score += 25;
    strengths.push(`${nodeCount}개의 풍부한 노드로 사고 지도를 그렸습니다.`);
  } else {
    score += 18;
    advice.push(`노드가 ${nodeCount}개로 많습니다 — 부수 개념은 통합/제거를 고려하세요.`);
  }

  // 2) 타입 다양성 (max 20) — 핵심/기둥/다리/가지 중 몇 종을 썼나
  if (typeDiversity === 0) {
    // no-op
  } else if (typeDiversity === 1) {
    score += 5;
    advice.push("노드 역할이 한 종류뿐입니다 — 핵심/기둥/다리/가지를 섞어 구조를 입체적으로 만들어 보세요.");
  } else if (typeDiversity === 2) {
    score += 10;
    advice.push("두 가지 역할만 사용 중 — 다리/가지로 부수 관계까지 표현해 보세요.");
  } else if (typeDiversity === 3) {
    score += 16;
    strengths.push("세 가지 역할로 구조의 층위를 표현했습니다.");
  } else {
    score += 20;
    strengths.push("네 가지 역할 (핵심/기둥/다리/가지) 모두 사용 — 4차원 해석의 기본기.");
  }

  // 3) 엣지 밀도 (max 25) — 0.5 ~ 2.0 사이가 이상적
  if (edgeCount === 0 && nodeCount >= 2) {
    advice.push("노드 간 관계(엣지)가 없습니다 — 개념끼리 어떻게 연결되는지 표현해 보세요.");
  } else if (edgeDensity < 0.4 && nodeCount >= 3) {
    score += 8;
    advice.push(`엣지 밀도 ${edgeDensity.toFixed(1)} 로 낮음 — 더 많은 관계를 그어 보세요.`);
  } else if (edgeDensity >= 0.4 && edgeDensity <= 2.0) {
    score += 25;
    strengths.push(`엣지 밀도 ${edgeDensity.toFixed(1)} — 적정 수준의 연결성.`);
  } else if (edgeDensity > 2.0) {
    score += 15;
    advice.push(`엣지 밀도 ${edgeDensity.toFixed(1)} 로 과밀 — 핵심 관계만 남기면 가독성이 올라갑니다.`);
  }

  // 4) 고아 노드 (max 15) — 어디에도 연결되지 않은 노드 패널티
  if (nodeCount === 0) {
    // no-op
  } else if (orphanCount === 0) {
    score += 15;
    strengths.push("모든 노드가 연결됨 — 사고 지도가 끊김 없이 흐릅니다.");
  } else if (orphanCount === 1) {
    score += 10;
    advice.push("고립된 노드 1개 — 다른 개념과의 관계를 한 줄 더 그어 보세요.");
  } else {
    score += 5;
    advice.push(`고립 노드 ${orphanCount}개 — 모두 끌어들이거나 제거하세요.`);
  }

  // 5) 인용 (cite) 비율 (max 15) — 본문 근거를 캔버스에 가져온 비율
  if (nodeCount === 0) {
    // no-op
  } else {
    const ratio = citedNodes / nodeCount;
    if (ratio >= 0.5) {
      score += 15;
      strengths.push(`노드의 ${Math.round(ratio * 100)}% 가 본문 인용을 가짐 — 근거 기반 사고.`);
    } else if (ratio >= 0.25) {
      score += 9;
      advice.push("절반 이상의 노드에 본문 근거를 붙이면 사고가 더 단단해집니다.");
    } else if (citedNodes === 0 && nodeCount >= 3) {
      advice.push("본문 인용이 0개 — 텍스트 패널에서 구절을 드래그해 캔버스로 가져와 보세요.");
    } else {
      score += 3;
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (strengths.length === 0) {
    strengths.push("캔버스를 만들기 시작한 것 자체가 좋은 출발입니다.");
  }
  if (advice.length === 0) {
    advice.push("훌륭합니다 — 분석 모드에서 가치/시간 축까지 표현해 보세요.");
  }

  let grade: EvalResult["grade"];
  let gradeColor: string;
  if (score >= 80) {
    grade = "뛰어남";
    gradeColor = COLOR_OK;
  } else if (score >= 60) {
    grade = "양호";
    gradeColor = COLOR_OK;
  } else if (score >= 35) {
    grade = "발전 중";
    gradeColor = COLOR_WARN;
  } else {
    grade = "시작 단계";
    gradeColor = COLOR_LOW;
  }

  return {
    score,
    grade,
    gradeColor,
    metrics: {
      nodeCount,
      edgeCount,
      typeDiversity,
      orphanCount,
      citedNodes,
      edgeDensity,
    },
    strengths,
    advice,
  };
}

interface Props {
  canvas: CanvasJson | null;
  onAskTutor?: (snapshot: CanvasJson) => void;
}

export function EvaluationPanel({ canvas, onAskTutor }: Props) {
  const result = useMemo(() => evaluateCanvas(canvas), [canvas]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-brain-surface-soft">
      <div className="border-b border-brain-border bg-brain-surface px-6 py-3">
        <p
          className="mb-1 text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
        >
          자기평가
        </p>
        <h3
          className="text-[16px]"
          style={{
            color: "var(--color-brain-text)",
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
          }}
        >
          현재 캔버스의 구조 진단
        </h3>
      </div>

      <div className="space-y-6 px-6 py-5">
        <div className="flex items-center gap-5">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              border: `1.5px solid ${result.gradeColor}`,
              color: result.gradeColor,
              backgroundColor: `${result.gradeColor}10`,
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: "26px",
              letterSpacing: "-0.02em",
            }}
          >
            {result.score}
            <span style={{ fontSize: "14px", marginLeft: "1px" }}>%</span>
          </div>
          <div>
            <p
              className="mb-1 text-[10px] uppercase tracking-[0.18em]"
              style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
            >
              평가 결과
            </p>
            <p
              className="text-[18px] tracking-[-0.01em]"
              style={{
                color: result.gradeColor,
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
              }}
            >
              {result.grade}
            </p>
            <p
              className="mt-1 text-[12px]"
              style={{ color: "var(--color-brain-text-muted)" }}
            >
              노드 {result.metrics.nodeCount} · 엣지 {result.metrics.edgeCount} ·{" "}
              역할 {result.metrics.typeDiversity}/4 · 인용 {result.metrics.citedNodes}
            </p>
          </div>
        </div>

        <section>
          <p
            className="mb-2 text-[10px] uppercase tracking-[0.18em]"
            style={{ color: "var(--color-brain-success)", fontWeight: 500 }}
          >
            잘한 점
          </p>
          <div className="space-y-1.5">
            {result.strengths.map((s, i) => (
              <p
                key={i}
                className="text-[13px] leading-relaxed"
                style={{
                  color: "var(--color-brain-text)",
                  fontFamily: "var(--font-serif)",
                }}
              >
                <span
                  style={{
                    color: "var(--color-brain-success)",
                    marginRight: "8px",
                  }}
                >
                  +
                </span>
                {s}
              </p>
            ))}
          </div>
        </section>

        <section>
          <p
            className="mb-2 text-[10px] uppercase tracking-[0.18em]"
            style={{ color: "var(--color-brain-warn)", fontWeight: 500 }}
          >
            조언
          </p>
          <div className="space-y-2">
            {result.advice.map((a, i) => (
              <p
                key={i}
                className="text-[13px] leading-relaxed"
                style={{
                  color: "var(--color-brain-text)",
                  fontFamily: "var(--font-serif)",
                }}
              >
                <span
                  style={{
                    color: "var(--color-brain-warn)",
                    marginRight: "8px",
                  }}
                >
                  →
                </span>
                {a}
              </p>
            ))}
          </div>
        </section>

        <section>
          <p
            className="mb-2 text-[10px] uppercase tracking-[0.18em]"
            style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
          >
            지표 상세
          </p>
          <div className="grid grid-cols-2 gap-2 text-[12.5px]">
            <Metric
              label="노드 수"
              value={String(result.metrics.nodeCount)}
            />
            <Metric
              label="엣지 수"
              value={String(result.metrics.edgeCount)}
            />
            <Metric
              label="역할 다양성"
              value={`${result.metrics.typeDiversity}/4`}
            />
            <Metric
              label="고립 노드"
              value={String(result.metrics.orphanCount)}
              warn={result.metrics.orphanCount > 0}
            />
            <Metric
              label="인용 노드"
              value={String(result.metrics.citedNodes)}
            />
            <Metric
              label="엣지 밀도"
              value={result.metrics.edgeDensity.toFixed(2)}
            />
          </div>
        </section>

        {onAskTutor && canvas && (
          <button
            onClick={() => onAskTutor(canvas)}
            className="w-full rounded-lg border border-brain-accent/60 bg-brain-surface px-3 py-2 text-[13px] text-brain-accent hover:bg-brain-accent-soft/40"
          >
            튜터에게 이 평가에 대한 의견을 묻기
          </button>
        )}

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
            이 평가는 *구조적 휴리스틱*입니다 (노드 수 / 역할 다양성 / 엣지 밀도 / 고립 / 인용 비율).
            정답이 있는 시스템 기준 비교가 아니라, 사고 지도가 *읽힐 만큼 짜여 있는가*를 봅니다.
            저자의 인지 구조와의 정합성은 튜터 채팅에서 짚어 보세요.
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg px-3 py-2"
      style={{ backgroundColor: "var(--color-brain-surface)" }}
    >
      <span style={{ color: "var(--color-brain-text-muted)" }}>{label}</span>
      <span
        style={{
          color: warn ? COLOR_WARN : "var(--color-brain-text)",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
