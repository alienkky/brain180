// Owner: alien_robot/infra-engineer (남기준), ALI-23.
//
// Browser "로봇 튜터" — a second tutor persona for logged-in Brain180 students.
// It reuses the Alien Robot persona (server/lib/robot-persona.ts) but, unlike the
// device-token bridge in robot.ts, this route:
//   - is authed by the student's Lucia session (cookie), so it knows WHO is asking.
//   - injects the student's "학습된 노드" (v1 = the lessons they have practiced,
//     grouped by module) into the system prompt so the robot can confirm what the
//     student has learned and advise on what to do next.
//   - is stateless: the client owns conversation memory and passes `history`.
//     No DB rows are written (the LLM wrapper still logs 1 api_usage_log row).
//
// v1 note on "학습된 노드": Brain180 has no single "completed curriculum node"
// table. The practical proxy is learning_sessions → lessons → modules (the topics
// the student has actually worked on). This is the concept-of-proof source; a
// richer signal (canvas node mastery, per-stage completion) is a follow-up.

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { learningSessions, lessons, modules } from "../db/schema.js";
import { ok, fail } from "../lib/envelope.js";
import { UpstreamError, type AnthropicMessageContent } from "../lib/anthropic.js";
import { callTutorLLM } from "../lib/llm.js";
import { parseBody, RobotTutorChatBody } from "../lib/validators.js";
import { robotPersona } from "../lib/robot-persona.js";
import {
  requireApprovedUser,
  requireAuth,
  requirePasswordFresh,
} from "../middleware/auth.js";
import { tutorRateLimit } from "../middleware/rate-limit.js";

export const robotTutorRouter = Router();
robotTutorRouter.use(requireAuth, requirePasswordFresh, requireApprovedUser);

// Cap the number of studied lessons folded into the prompt so a heavy user does
// not blow the context. Most recent first.
const MAX_LEARNED_LESSONS = 40;

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

// Build the "학습된 노드" context block from the student's practice history.
async function buildLearnedContext(userId: string): Promise<string> {
  const rows = await db
    .select({
      lessonTitle: lessons.title,
      moduleTitle: modules.title,
      sessionCount: sql<number>`count(*)::int`,
      lastStartedAt: sql<Date | null>`max(${learningSessions.startedAt})`,
    })
    .from(learningSessions)
    .innerJoin(lessons, eq(learningSessions.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(and(eq(learningSessions.userId, userId), isNull(learningSessions.deletedAt)))
    .groupBy(learningSessions.lessonId, lessons.title, modules.title)
    .orderBy(desc(sql`max(${learningSessions.startedAt})`))
    .limit(MAX_LEARNED_LESSONS);

  if (rows.length === 0) {
    return [
      "## 이 학생의 학습 기록",
      "아직 학습한 레슨이 없습니다.",
      "학생에게 첫 레슨을 어떻게 시작하면 좋을지 짧게 안내해 주세요.",
    ].join("\n");
  }

  const lines = rows.map(
    (r) => `- [${r.moduleTitle}] ${r.lessonTitle} — ${Number(r.sessionCount)}회 학습`,
  );
  return [
    "## 이 학생이 지금까지 학습한 레슨 (최근순)",
    ...lines,
    "",
    "위 목록이 학생이 Brain180에서 실제로 다룬 내용입니다.",
    "학생의 질문에 답할 때 이 학습 이력을 근거로 삼아,",
    "무엇을 배웠는지 짚어 주고 다음에 무엇을 해보면 좋을지 한두 문장으로 조언하세요.",
    "학생이 아직 다루지 않은 주제를 이미 배운 것처럼 단정하지 마세요.",
  ].join("\n");
}

// ── POST /api/robot-tutor/chat ──────────────────────────────────────
// Body: { message, history? }
// Returns: { text, model, input_tokens, output_tokens, latency_ms }
robotTutorRouter.post(
  "/chat",
  tutorRateLimit,
  asyncHandler(async (req, res) => {
    const body = parseBody(RobotTutorChatBody, req, res);
    if (!body) return;

    const userId = req.user!.id;
    const userName = req.user!.name;

    const learnedContext = await buildLearnedContext(userId);
    const systemMessage = [
      robotPersona(),
      "",
      `학생 이름: ${userName}`,
      "",
      learnedContext,
    ].join("\n");

    // Prior turns supplied by the client (it owns memory; this route is stateless).
    const messages: Array<{ role: "user" | "assistant"; content: AnthropicMessageContent }> =
      (body.history ?? []).map((m) => ({ role: m.role, content: m.content }));
    messages.push({ role: "user", content: body.message });

    try {
      const result = await callTutorLLM({ userId, system: systemMessage, messages });
      ok(res, {
        text: result.text,
        model: result.model,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        latency_ms: result.latencyMs,
      });
    } catch (err) {
      if (err instanceof UpstreamError) {
        fail(res, 502, "upstream_error", { message: `${err.provider}_${err.code}` });
        return;
      }
      throw err;
    }
  }),
);
