// Converts a CanvasArtifact payload into a natural-language summary.
// Used by: session-recall.ts (inject into tutor context), growth-report job.
// Falls back to a structured text description if LLM is unavailable.

import { callTutorLLM } from "../../lib/llm.js";
import { anonymizeUserId } from "../../lib/anon.js";

export interface CanvasPayload {
  nodes?: { id: string; type: string; label: string }[];
  edges?: { from: string; to: string; relation: string }[];
}

const TYPE_KO: Record<string, string> = {
  concept: "핵심",
  anchor: "기둥",
  bridge: "다리",
  branch: "가지",
};

const REL_KO: Record<string, string> = {
  causes: "원인",
  supports: "지지",
  contrasts: "대비",
  transforms: "변형",
  contains: "포함",
};

function structuredText(payload: CanvasPayload): string {
  const nodes = payload.nodes ?? [];
  const edges = payload.edges ?? [];
  if (nodes.length === 0) return "(빈 캔버스)";
  const labelOf = new Map(nodes.map((n) => [n.id, n.label]));
  const nodeParts = nodes.map((n) => `${TYPE_KO[n.type] ?? n.type}:"${n.label}"`).join(", ");
  const edgeParts = edges
    .map((e) => `${labelOf.get(e.from) ?? e.from} →(${REL_KO[e.relation] ?? e.relation})→ ${labelOf.get(e.to) ?? e.to}`)
    .join(" / ");
  return `노드: ${nodeParts}${edgeParts ? ` | 관계: ${edgeParts}` : ""}`;
}

export async function summarizeCanvas(
  userId: string,
  payload: CanvasPayload,
  lessonTitle: string,
): Promise<string> {
  const nodes = payload.nodes ?? [];
  if (nodes.length === 0) return "(아직 그린 내용 없음)";
  if (nodes.length < 3) return structuredText(payload);

  try {
    const input = structuredText(payload);
    const result = await callTutorLLM({
      userId: anonymizeUserId(userId),
      system: "학습 캔버스 요약기. 2–3문장 한국어로만 응답.",
      messages: [
        {
          role: "user" as const,
          content: `레슨: "${lessonTitle}"\n캔버스 구조:\n${input}\n\n학습자의 사고 구조를 2–3문장으로 요약하세요.`,
        },
      ],
      maxTokens: 160,
    });
    return result.text.trim();
  } catch {
    return structuredText(payload);
  }
}
