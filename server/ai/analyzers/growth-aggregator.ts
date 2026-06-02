// Generates the weekly growth report summary text from aggregated scores.
// Called by the growth-report background job.

import type { ThreeAxisScores } from "./three-axis.js";
import { callTutorLLM } from "../../lib/llm.js";
import { anonymizeUserId } from "../../lib/anon.js";

function scoreLabel(score: number): string {
  if (score >= 80) return "우수";
  if (score >= 60) return "양호";
  if (score >= 40) return "보통";
  return "발전 필요";
}

export async function generateGrowthSummary(
  userId: string,
  userName: string,
  scores: ThreeAxisScores,
  from: Date,
  to: Date,
): Promise<string> {
  const period = `${from.toISOString().slice(0, 10)} ~ ${to.toISOString().slice(0, 10)}`;
  const fallback = [
    `${userName}님의 ${period} 학습 리포트.`,
    `인지 축: ${scores.cognitive}점 (${scoreLabel(scores.cognitive)}),`,
    `가치 축: ${scores.value}점 (${scoreLabel(scores.value)}),`,
    `시간 축: ${scores.time}점 (${scoreLabel(scores.time)}).`,
    scores.cognitive >= scores.value && scores.cognitive >= scores.time
      ? "논리적 구조 분석 능력이 돋보이는 주였습니다."
      : scores.value >= scores.time
        ? "텍스트의 가치 판단 흐름을 잘 포착하는 주였습니다."
        : "인과·시간 흐름에 집중한 주였습니다.",
  ].join(" ");

  try {
    const result = await callTutorLLM({
      userId: anonymizeUserId(userId),
      system: "학습 성장 리포트 작성기. 3–5문장 한국어, 따뜻하고 구체적인 피드백.",
      messages: [
        {
          role: "user" as const,
          content: [
            `학습자: ${userName}`,
            `기간: ${period}`,
            `인지 축 ${scores.cognitive}점, 가치 축 ${scores.value}점, 시간 축 ${scores.time}점.`,
            "위 점수를 바탕으로 이번 주 학습 패턴을 3–5문장으로 요약하고, 다음 주 집중 방향을 한 가지 제안하세요.",
          ].join("\n"),
        },
      ],
      maxTokens: 300,
    });
    return result.text.trim() || fallback;
  } catch {
    return fallback;
  }
}
