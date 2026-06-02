// Three-axis (cognitive / value / time) score extractor.
// Hybrid approach: rule-based structural score + LLM qualitative refinement.
// Rule score weights:
//   - cognitive: node type diversity + edge relation diversity
//   - value: anchor node ratio + "contrasts" / "transforms" relation ratio
//   - time: "causes" / "supports" temporal chain depth + session time spent
//
// LLM refinement runs only when at least 3 nodes exist (enough structure to
// be meaningful). Fallback: return rule-only scores if LLM is unavailable.

import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { db } from "../../db/client.js";
import { canvasArtifacts, learningSessions, tutorMessages } from "../../db/schema.js";
import { callTutorLLM } from "../../lib/llm.js";
import { anonymizeUserId } from "../../lib/anon.js";

export interface ThreeAxisScores {
  cognitive: number; // 0–100
  value: number;
  time: number;
}

interface CanvasPayload {
  nodes?: { type: string }[];
  edges?: { relation: string }[];
}

function ruleScore(payload: CanvasPayload): ThreeAxisScores {
  const nodes = payload.nodes ?? [];
  const edges = payload.edges ?? [];
  if (nodes.length === 0) return { cognitive: 0, value: 0, time: 0 };

  const typeSet = new Set(nodes.map((n) => n.type));
  const relSet = new Set(edges.map((e) => e.relation));

  // Cognitive: node type diversity × relation diversity.
  const cognitive = Math.min(100, Math.round((typeSet.size / 4) * 50 + (relSet.size / 5) * 50));

  // Value: anchor + bridge nodes emphasise value axis; contrasts/transforms relations.
  const valueNodes = nodes.filter((n) => n.type === "anchor" || n.type === "bridge").length;
  const valueEdges = edges.filter((e) => e.relation === "contrasts" || e.relation === "transforms").length;
  const value = Math.min(100, Math.round((valueNodes / Math.max(nodes.length, 1)) * 60 + (valueEdges / Math.max(edges.length, 1)) * 40));

  // Time: causal chains (causes/supports) suggest temporal thinking.
  const causalEdges = edges.filter((e) => e.relation === "causes" || e.relation === "supports").length;
  const time = Math.min(100, Math.round((causalEdges / Math.max(edges.length, 1)) * 100));

  return { cognitive, value, time };
}

export async function computeThreeAxisScores(
  userId: string,
  from: Date,
  to: Date,
): Promise<ThreeAxisScores> {
  // Gather latest artifact per session in window.
  const rows = await db
    .select({
      payload: canvasArtifacts.payload,
      sessionId: canvasArtifacts.sessionId,
    })
    .from(canvasArtifacts)
    .innerJoin(learningSessions, eq(canvasArtifacts.sessionId, learningSessions.id))
    .where(
      and(
        eq(learningSessions.userId, userId),
        isNull(canvasArtifacts.deletedAt),
        gte(learningSessions.startedAt, from),
        lt(learningSessions.startedAt, to),
      ),
    )
    .orderBy(desc(canvasArtifacts.savedAt));

  if (rows.length === 0) return { cognitive: 0, value: 0, time: 0 };

  // Aggregate rule scores across all sessions.
  const scores = rows.map((r) => ruleScore(r.payload as CanvasPayload));
  const avg = (arr: number[]) => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
  const ruleResult: ThreeAxisScores = {
    cognitive: avg(scores.map((s) => s.cognitive)),
    value: avg(scores.map((s) => s.value)),
    time: avg(scores.map((s) => s.time)),
  };

  // LLM refinement: only if there's enough data.
  const totalNodes = rows.reduce((s, r) => s + ((r.payload as CanvasPayload).nodes?.length ?? 0), 0);
  if (totalNodes < 3) return ruleResult;

  try {
    const recentMessages = await db
      .select({ role: tutorMessages.role, content: tutorMessages.content })
      .from(tutorMessages)
      .innerJoin(learningSessions, eq(tutorMessages.sessionId, learningSessions.id))
      .where(
        and(
          eq(learningSessions.userId, userId),
          gte(learningSessions.startedAt, from),
          lt(learningSessions.startedAt, to),
        ),
      )
      .orderBy(desc(tutorMessages.createdAt))
      .limit(20);

    const convoSnippet = recentMessages
      .filter((m): m is { role: "user" | "assistant"; content: string } =>
        m.role === "user" || m.role === "assistant",
      )
      .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join("\n");

    const prompt = [
      `규칙 기반 3축 점수 (0-100): 인지=${ruleResult.cognitive} 가치=${ruleResult.value} 시간=${ruleResult.time}`,
      `학습 대화 샘플:\n${convoSnippet}`,
      `위 대화와 점수를 참고해 최종 3축 점수를 JSON으로만 반환하세요.`,
      `형식: {"cognitive":숫자,"value":숫자,"time":숫자} — 0-100 정수`,
    ].join("\n");

    const result = await callTutorLLM({
      userId: anonymizeUserId(userId),
      system: "학습 진도 분석기. JSON만 반환.",
      messages: [{ role: "user" as const, content: prompt }],
      maxTokens: 64,
    });

    const match = result.text.match(/\{[^}]+\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as Partial<ThreeAxisScores>;
      return {
        cognitive: typeof parsed.cognitive === "number" ? Math.min(100, Math.max(0, parsed.cognitive)) : ruleResult.cognitive,
        value: typeof parsed.value === "number" ? Math.min(100, Math.max(0, parsed.value)) : ruleResult.value,
        time: typeof parsed.time === "number" ? Math.min(100, Math.max(0, parsed.time)) : ruleResult.time,
      };
    }
  } catch {
    // LLM unavailable — fall back to rule score.
  }

  return ruleResult;
}
