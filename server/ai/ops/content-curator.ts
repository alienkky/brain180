// ALI-70: content curator — validates text excerpt 3-axis fit before publishing.

import { callTutorLLM } from "../../lib/llm.js";
import { anonymizeUserId } from "../../lib/anon.js";

export interface ContentCurationInput {
  lessonId: string;
  textBody: string;
  axisFocus: string;
}

export interface ContentCurationResult {
  cognitive_fit: number;
  value_fit: number;
  time_fit: number;
  primary_axis: "cognition" | "value" | "time";
  concerns: string[];
  recommendation: "approve" | "review" | "reject";
  note: string;
}

export async function curateContent(input: ContentCurationInput): Promise<ContentCurationResult> {
  const preview = input.textBody.slice(0, 2000);
  const concerns: string[] = [];

  if (input.textBody.length > 8000) concerns.push("원문 8000자 초과 — 발췌 권장");
  if (input.textBody.length < 100) concerns.push("원문 너무 짧음 (100자 미만)");

  const fallback: ContentCurationResult = {
    cognitive_fit: 50,
    value_fit: 50,
    time_fit: 50,
    primary_axis: input.axisFocus as "cognition" | "value" | "time" ?? "cognition",
    concerns,
    recommendation: "review",
    note: "LLM 분석 실패 — 수동 검토 권장",
  };

  try {
    const result = await callTutorLLM({
      userId: anonymizeUserId(input.lessonId),
      system: "Brain180 콘텐츠 검증기. JSON만 반환.",
      messages: [
        {
          role: "user" as const,
          content: [
            `레슨 ID: ${input.lessonId}`,
            `선언된 축: ${input.axisFocus}`,
            `텍스트 (앞 2000자):\n${preview}`,
            "",
            "다음 JSON을 반환하세요:",
            `{"cognitive_fit":0-100,"value_fit":0-100,"time_fit":0-100,`,
            `"primary_axis":"cognition|value|time",`,
            `"concerns":["우려사항 문자열 배열"],`,
            `"recommendation":"approve|review|reject",`,
            `"note":"판단 근거 1-2문장"}`,
          ].join("\n"),
        },
      ],
      maxTokens: 256,
    });

    const match = result.text.match(/\{[\s\S]*?\}/);
    if (!match) return { ...fallback, note: "응답 파싱 실패" };
    const parsed = JSON.parse(match[0]) as Partial<ContentCurationResult>;

    return {
      cognitive_fit: typeof parsed.cognitive_fit === "number" ? Math.min(100, Math.max(0, parsed.cognitive_fit)) : 50,
      value_fit: typeof parsed.value_fit === "number" ? Math.min(100, Math.max(0, parsed.value_fit)) : 50,
      time_fit: typeof parsed.time_fit === "number" ? Math.min(100, Math.max(0, parsed.time_fit)) : 50,
      primary_axis: (parsed.primary_axis ?? fallback.primary_axis) as ContentCurationResult["primary_axis"],
      concerns: [...concerns, ...(Array.isArray(parsed.concerns) ? parsed.concerns : [])],
      recommendation: (parsed.recommendation ?? "review") as ContentCurationResult["recommendation"],
      note: parsed.note ?? "",
    };
  } catch {
    return fallback;
  }
}
