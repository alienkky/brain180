// ALI-70: tutor quality reviewer — flags low-rated responses + proposes improvements.

import { callTutorLLM } from "../../lib/llm.js";
import { anonymizeUserId } from "../../lib/anon.js";

export interface TutorQualityInput {
  messageId: string;
  userMessage: string;
  assistantResponse: string;
  rating: number;
  feedback?: string;
  canvasMode?: string;
  axisFocus?: string;
}

export interface TutorQualityResult {
  issue_category: "off_topic" | "too_vague" | "too_direct" | "wrong_axis" | "other";
  severity: "low" | "medium" | "high";
  prompt_suggestion: string;
  example_rewrite?: string;
}

export async function reviewTutorQuality(input: TutorQualityInput): Promise<TutorQualityResult> {
  const fallback: TutorQualityResult = {
    issue_category: "other",
    severity: input.rating <= 1 ? "high" : "medium",
    prompt_suggestion: "LLM 분석 실패 — 수동 검토 필요",
  };

  try {
    const result = await callTutorLLM({
      userId: anonymizeUserId(input.messageId),
      system: "Brain180 튜터 품질 검토기. JSON만 반환.",
      messages: [
        {
          role: "user" as const,
          content: [
            `별점: ${input.rating}/5`,
            `축: ${input.axisFocus ?? "미지정"} | 캔버스 모드: ${input.canvasMode ?? "미지정"}`,
            input.feedback ? `학습자 피드백: "${input.feedback}"` : "",
            `학습자 질문: "${input.userMessage.slice(0, 400)}"`,
            `튜터 응답: "${input.assistantResponse.slice(0, 600)}"`,
            "",
            "반환 JSON:",
            `{"issue_category":"off_topic|too_vague|too_direct|wrong_axis|other",`,
            `"severity":"low|medium|high",`,
            `"prompt_suggestion":"구체적인 프롬프트 수정 제안",`,
            `"example_rewrite":"이상적인 응답 예시 (선택적)"}`,
          ].filter(Boolean).join("\n"),
        },
      ],
      maxTokens: 300,
    });

    const match = result.text.match(/\{[\s\S]*?\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]) as Partial<TutorQualityResult>;

    return {
      issue_category: (parsed.issue_category ?? "other") as TutorQualityResult["issue_category"],
      severity: (parsed.severity ?? fallback.severity) as TutorQualityResult["severity"],
      prompt_suggestion: parsed.prompt_suggestion ?? fallback.prompt_suggestion,
      example_rewrite: parsed.example_rewrite,
    };
  } catch {
    return fallback;
  }
}

export async function batchReviewLowRatedMessages(
  messages: TutorQualityInput[],
): Promise<Map<string, TutorQualityResult>> {
  const results = new Map<string, TutorQualityResult>();
  for (const msg of messages) {
    results.set(msg.messageId, await reviewTutorQuality(msg));
  }
  return results;
}
