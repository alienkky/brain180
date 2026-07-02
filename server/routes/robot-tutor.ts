// Owner: alien_robot/infra-engineer (남기준), ALI-23.
//
// Browser "로봇 튜터" — a second tutor persona for logged-in Brain180 students.
// Stands in for 안진훈 박사: the robot reads the STRUCTURE the learner drew
// (칠판/캔버스 구조도) together with the learner's written explanation (설명내용)
// and advises through the 3-stage author-lens frame (3단계 저자의 렌즈):
//   1부 — 글의 내용/인지구조 이해
//   2부 — 저자의 대상과 렌즈 파악 (저자가 무엇을 어떤 관점으로 보았나)
//   3부 — 렌즈 내재화 (학생이 그 렌즈로 스스로 사고를 재구성)
// The writer's *intent* seen through the author's lens comes first — the earlier
// 인지/가치/시간 3축 score was only the initial AI proposal, not the advice frame.
//
// Unlike the device-token bridge in robot.ts, this route:
//   - is authed by the student's Lucia session (cookie), so it knows WHO is asking.
//   - "sees" the drawn structure: when image_base64 is present it routes to a
//     vision provider (the existing Anthropic/OpenAI providers — 이전 프로바이더 —
//     not the future 4090 vLLM). Kimi (default text provider) cannot see images.
//   - injects the student's studied lessons so advice is grounded in what they did.
//   - is stateless: the client owns conversation memory and passes `history`.
//     No DB rows are written (the LLM wrapper still logs 1 api_usage_log row).
//
// Same structure image → same author-lens advice whether the frame was captured
// from the Brain180 canvas or photographed off an MSC offline blackboard.

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { learningSessions, lessons, modules } from "../db/schema.js";
import { ok, fail } from "../lib/envelope.js";
import {
  UpstreamError,
  callAnthropic,
  type AnthropicMessageContent,
} from "../lib/anthropic.js";
import { callTutorLLM } from "../lib/llm.js";
import { callOpenAIVision } from "../lib/openai-vision.js";
import { hasFeature } from "../lib/env.js";
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

// The 안진훈-박사식 advice frame. Instructs the model to read the learner's
// structure diagram + explanation through the 3-stage author-lens, prioritising
// the writer's intent over surface content, and to guide rather than hand answers.
const AUTHOR_LENS_FRAME = [
  "## 조언 방식 — 안진훈 박사식 '3단계 저자의 렌즈'",
  "너는 안진훈 박사를 대신해 학생에게 조언하는 튜터다. 학생이 그린 구조도(노드·연결)와",
  "학생이 쓴 설명을 함께 읽고, 아래 순서로 '저자의 렌즈'를 적용해 조언한다.",
  "- 1부(내용·인지구조): 학생 구조도가 글의 핵심 개념과 그 사이 관계를 제대로 잡았는지 본다.",
  "- 2부(저자의 대상과 렌즈): 저자가 '무엇을' '어떤 관점(렌즈)'으로 보았는지, 학생 구조가",
  "  그 저자의 의도를 향하고 있는지 짚는다. 내용 요약이 아니라 '저자가 어떻게 생각했는가'를 본다.",
  "- 3부(렌즈 내재화): 학생이 그 렌즈로 스스로 사고를 재구성하도록 다음 한 걸음을 제안한다.",
  "규칙:",
  "- 정답을 그대로 주지 말고, 학생이 스스로 도달하도록 질문과 힌트로 유도한다.",
  "- 구조도에서 실제로 보이는 것(노드/연결/빠진 고리)을 근거로 구체적으로 말한다.",
  "- 글쓴이의 의도를 보는 것이 먼저다. 표면 내용 지적에 머물지 않는다.",
].join("\n");

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

// Fetch and format THIS lesson's admin-authored 1/2/3부 조언 원칙 from
// lessons.source_meta. These are per-text (각 글마다 다름), so the robot must
// pull the specific lesson's principles rather than advise generically.
async function buildLessonPrinciples(lessonId: string): Promise<string> {
  const rows = await db
    .select({ sourceMeta: lessons.sourceMeta })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);
  const meta =
    rows[0]?.sourceMeta && typeof rows[0].sourceMeta === "object"
      ? (rows[0].sourceMeta as Record<string, unknown>)
      : {};
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const part1 = str(meta.cognitive_structure_analysis);
  const part2 = str(meta.learner_questions);
  const part3 = str(meta.tutor_reference_notes);
  const sections: string[] = [];
  if (part1) sections.push(`[1부 · 글의 인지구조 원칙]\n${part1}`);
  if (part2) sections.push(`[2부 · 저자의 대상과 렌즈 원칙]\n${part2}`);
  if (part3) sections.push(`[3부 · 종합·내재화 원칙]\n${part3}`);
  if (sections.length === 0) return "";
  return [
    "## 이 글(레슨)의 관리자 조언 원칙 (각 글마다 다름 — 이 원칙을 우선 근거로 삼아 조언)",
    ...sections,
  ].join("\n\n");
}

// Fold the learner's structure + written explanation + this turn's message into
// one text block, so the model always sees the structure and its explanation.
function composeLearnerTurn(
  message: string,
  explanation?: string,
  structureText?: string,
): string {
  const parts: string[] = [];
  if (structureText && structureText.trim().length > 0) {
    parts.push(`[학생이 그린 구조 (노드·연결)]\n${structureText.trim()}`);
  }
  if (explanation && explanation.trim().length > 0) {
    parts.push(`[학생이 쓴 구조 설명]\n${explanation.trim()}`);
  }
  parts.push(`[학생의 말]\n${message}`);
  return parts.join("\n\n");
}

// ── POST /api/robot-tutor/chat ──────────────────────────────────────
// Body: { message, image_base64?, explanation?, history? }
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
    const lessonPrinciples = body.lesson_id
      ? await buildLessonPrinciples(body.lesson_id)
      : "";
    const systemMessage = [
      robotPersona(),
      "",
      AUTHOR_LENS_FRAME,
      ...(lessonPrinciples ? ["", lessonPrinciples] : []),
      "",
      `학생 이름: ${userName}`,
      "",
      learnedContext,
    ].join("\n");

    // Prior turns supplied by the client (it owns memory; this route is stateless).
    const messages: Array<{ role: "user" | "assistant"; content: AnthropicMessageContent }> =
      (body.history ?? []).map((m) => ({ role: m.role, content: m.content }));

    const learnerTurn = composeLearnerTurn(
      body.message,
      body.explanation,
      body.structure_text,
    );

    // Route to a vision provider only when a structure image is attached AND a
    // vision-capable key exists. Mirrors robot.ts. Kimi cannot see images.
    const imageB64 = body.image_base64;
    const visionProvider = imageB64
      ? hasFeature("anthropic")
        ? "anthropic"
        : hasFeature("openai")
        ? "openai"
        : null
      : null;

    if (imageB64 && visionProvider) {
      messages.push({
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: imageB64 },
          },
          { type: "text", text: learnerTurn },
        ],
      });
    } else if (imageB64) {
      // No vision key — keep the turn alive but tell the model it is blind.
      messages.push({
        role: "user",
        content: `[학생이 그린 구조 이미지가 첨부됐지만 현재 비전 모델이 설정되지 않아 볼 수 없습니다. 설명 텍스트만으로 조언하세요.]\n\n${learnerTurn}`,
      });
    } else {
      messages.push({ role: "user", content: learnerTurn });
    }

    try {
      let result;
      if (visionProvider === "anthropic") {
        result = await callAnthropic({ userId, system: systemMessage, messages });
      } else if (visionProvider === "openai") {
        result = await callOpenAIVision({ userId, system: systemMessage, messages });
      } else {
        result = await callTutorLLM({ userId, system: systemMessage, messages });
      }
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
