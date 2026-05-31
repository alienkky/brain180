// Owner: ALI-66 남말씨[글말] (system prompts) + ALI-67 방연동[MCP] (Anthropic wrapper).
// Wires §4 Tutor per api-contracts.md.
//
// Prompt source of truth:
//   1. lessons.tutor_system_prompt_id → tutor_system_prompts.content
//   2. else: most recent is_active=true row in tutor_system_prompts
//   3. else: FALLBACK_PROMPT (hardcoded — surfaces ALI-66 dependency in logs).
//
// Variable substitution per §4-6: {{lesson_title}} / {{text_body}} /
// {{axis_focus}} / {{user_name}}.
//
// Side effects:
//   - 2 tutor_messages rows per /chat (user + assistant)
//   - 1 api_usage_log via callAnthropic seam (anonymized user_id)
//   - tutor_ratings upsert (1 per user per message) via /rate

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { and, asc, eq, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  learningSessions,
  lessons,
  textExcerpts,
  tutorMessages,
  tutorRatings,
  tutorSystemPrompts,
} from "../db/schema.js";
import { ok, fail } from "../lib/envelope.js";
import { callAnthropic, UpstreamError } from "../lib/anthropic.js";
import { parseBody, TutorChatBody, RateMessageBody } from "../lib/validators.js";
import {
  requireApprovedUser,
  requireAuth,
  requirePasswordFresh,
} from "../middleware/auth.js";
import { tutorRateLimit, userRateLimit } from "../middleware/rate-limit.js";

export const tutorRouter = Router();
tutorRouter.use(requireAuth, requirePasswordFresh, requireApprovedUser);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Surfaces missing ALI-66 artifact in logs without blocking the route.
const FALLBACK_PROMPT = [
  "당신은 Brain180의 사고구조 튜터입니다.",
  "학생이 텍스트 '{{lesson_title}}'의 사고구조를 추출하도록 돕습니다.",
  "원문: {{text_body}}",
  "축 가중치: {{axis_focus}}",
  "학생: {{user_name}}",
].join("\n");

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

interface TutorMessageDTO {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}

function toMessageDTO(row: {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  createdAt: Date;
}): TutorMessageDTO {
  return {
    id: row.id,
    session_id: row.sessionId,
    role: row.role,
    content: row.content,
    model: row.model,
    input_tokens: row.tokensIn,
    output_tokens: row.tokensOut,
    created_at: row.createdAt.toISOString(),
  };
}

interface TutorRatingDTO {
  id: string;
  message_id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
}

function substitute(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => vars[key] ?? "");
}

interface ResolvedPrompt {
  content: string;
  version: string;
  source: "lesson" | "active" | "fallback";
}

async function resolveSystemPrompt(lessonRow: {
  id: string;
  tutorSystemPromptId: string | null;
}): Promise<ResolvedPrompt> {
  if (lessonRow.tutorSystemPromptId) {
    const rows = await db
      .select({
        content: tutorSystemPrompts.content,
        version: tutorSystemPrompts.version,
      })
      .from(tutorSystemPrompts)
      .where(eq(tutorSystemPrompts.id, lessonRow.tutorSystemPromptId))
      .limit(1);
    if (rows[0]) {
      return { content: rows[0].content, version: rows[0].version, source: "lesson" };
    }
  }
  const active = await db
    .select({
      content: tutorSystemPrompts.content,
      version: tutorSystemPrompts.version,
    })
    .from(tutorSystemPrompts)
    .where(eq(tutorSystemPrompts.isActive, true))
    .orderBy(desc(tutorSystemPrompts.updatedAt))
    .limit(1);
  if (active[0]) {
    return { content: active[0].content, version: active[0].version, source: "active" };
  }
  return { content: FALLBACK_PROMPT, version: "fallback-0", source: "fallback" };
}

// ── POST /api/tutor/chat ────────────────────────────────────────────
tutorRouter.post(
  "/chat",
  tutorRateLimit,
  asyncHandler(async (req, res) => {
    const body = parseBody(TutorChatBody, req, res);
    if (!body) return;

    const userId = req.user!.id;
    const userName = req.user!.name;

    // Session: must belong to user, must not have ended.
    const sessionRows = await db
      .select({
        id: learningSessions.id,
        userId: learningSessions.userId,
        lessonId: learningSessions.lessonId,
        endedAt: learningSessions.endedAt,
      })
      .from(learningSessions)
      .where(eq(learningSessions.id, body.session_id))
      .limit(1);
    const session = sessionRows[0];
    if (!session) {
      fail(res, 404, "not_found", { message: "session_not_found" });
      return;
    }
    if (session.userId !== userId) {
      fail(res, 403, "forbidden");
      return;
    }
    if (session.endedAt) {
      fail(res, 409, "session_ended");
      return;
    }
    if (session.lessonId !== body.lesson_id) {
      fail(res, 400, "validation_error", { message: "lesson_mismatch" });
      return;
    }

    // Lesson + excerpt for variable substitution.
    const lessonRows = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        textSource: lessons.textSource,
        axisFocus: lessons.axisFocus,
        tutorSystemPromptId: lessons.tutorSystemPromptId,
      })
      .from(lessons)
      .where(eq(lessons.id, session.lessonId))
      .limit(1);
    const lesson = lessonRows[0];
    if (!lesson) {
      fail(res, 404, "not_found", { message: "lesson_not_found" });
      return;
    }

    // text_body: prefer first text_excerpt content; fall back to lesson.textSource.
    const excerptRows = await db
      .select({ content: textExcerpts.content })
      .from(textExcerpts)
      .where(eq(textExcerpts.lessonId, lesson.id))
      .orderBy(asc(textExcerpts.order))
      .limit(1);
    const textBody = excerptRows[0]?.content ?? lesson.textSource;

    // Resolve + substitute system prompt.
    const prompt = await resolveSystemPrompt({
      id: lesson.id,
      tutorSystemPromptId: lesson.tutorSystemPromptId,
    });
    const systemMessage = substitute(prompt.content, {
      lesson_title: lesson.title,
      text_body: textBody,
      axis_focus: JSON.stringify(lesson.axisFocus ?? {}),
      user_name: userName,
    });

    // Conversation history (chronological), excluding system rows.
    const history = await db
      .select({
        role: tutorMessages.role,
        content: tutorMessages.content,
      })
      .from(tutorMessages)
      .where(eq(tutorMessages.sessionId, session.id))
      .orderBy(asc(tutorMessages.createdAt));

    const messages = history
      .filter((m): m is { role: "user" | "assistant"; content: string } =>
        m.role === "user" || m.role === "assistant",
      )
      .map((m) => ({ role: m.role, content: m.content }));
    messages.push({ role: "user" as const, content: body.message });

    // Persist user row immediately so it survives upstream failure mid-call.
    const userInserted = await db
      .insert(tutorMessages)
      .values({
        sessionId: session.id,
        role: "user",
        content: body.message,
        promptVersion: prompt.version,
      })
      .returning({ id: tutorMessages.id, createdAt: tutorMessages.createdAt });

    let result;
    try {
      result = await callAnthropic({
        userId,
        system: systemMessage,
        messages,
      });
    } catch (err) {
      if (err instanceof UpstreamError) {
        fail(res, 502, "upstream_error", {
          message: `anthropic_${err.code}`,
        });
        return;
      }
      throw err;
    }

    const assistantInserted = await db
      .insert(tutorMessages)
      .values({
        sessionId: session.id,
        role: "assistant",
        content: result.text,
        model: result.model,
        promptVersion: prompt.version,
        tokensIn: result.inputTokens,
        tokensOut: result.outputTokens,
        tokens: result.inputTokens + result.outputTokens,
        latencyMs: result.latencyMs,
      })
      .returning({
        id: tutorMessages.id,
        sessionId: tutorMessages.sessionId,
        role: tutorMessages.role,
        content: tutorMessages.content,
        model: tutorMessages.model,
        tokensIn: tutorMessages.tokensIn,
        tokensOut: tutorMessages.tokensOut,
        createdAt: tutorMessages.createdAt,
      });

    const assistantRow = assistantInserted[0]!;
    void userInserted;
    ok(res, toMessageDTO({
      id: assistantRow.id,
      sessionId: assistantRow.sessionId,
      role: assistantRow.role,
      content: assistantRow.content,
      model: assistantRow.model,
      tokensIn: assistantRow.tokensIn,
      tokensOut: assistantRow.tokensOut,
      createdAt: assistantRow.createdAt,
    }));
  }),
);

// ── GET /api/tutor/sessions/:id/messages ────────────────────────────
tutorRouter.get(
  "/sessions/:id/messages",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
      fail(res, 400, "validation_error", { message: "invalid_session_id" });
      return;
    }

    const sessionRows = await db
      .select({ id: learningSessions.id, userId: learningSessions.userId })
      .from(learningSessions)
      .where(eq(learningSessions.id, sessionId))
      .limit(1);
    const session = sessionRows[0];
    if (!session) {
      fail(res, 404, "not_found");
      return;
    }
    if (session.userId !== req.user!.id) {
      fail(res, 403, "forbidden");
      return;
    }

    const rows = await db
      .select({
        id: tutorMessages.id,
        sessionId: tutorMessages.sessionId,
        role: tutorMessages.role,
        content: tutorMessages.content,
        model: tutorMessages.model,
        tokensIn: tutorMessages.tokensIn,
        tokensOut: tutorMessages.tokensOut,
        createdAt: tutorMessages.createdAt,
      })
      .from(tutorMessages)
      .where(eq(tutorMessages.sessionId, session.id))
      .orderBy(asc(tutorMessages.createdAt));

    ok(res, rows.map(toMessageDTO));
  }),
);

// ── POST /api/tutor/messages/:id/rate ───────────────────────────────
tutorRouter.post(
  "/messages/:id/rate",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const messageId = req.params.id;
    if (typeof messageId !== "string" || !UUID_RE.test(messageId)) {
      fail(res, 400, "validation_error", { message: "invalid_message_id" });
      return;
    }

    const body = parseBody(RateMessageBody, req, res);
    if (!body) return;

    // Message must exist, be assistant role, belong to user's session.
    const msgRows = await db
      .select({
        id: tutorMessages.id,
        sessionId: tutorMessages.sessionId,
        role: tutorMessages.role,
      })
      .from(tutorMessages)
      .where(eq(tutorMessages.id, messageId))
      .limit(1);
    const msg = msgRows[0];
    if (!msg) {
      fail(res, 404, "not_found");
      return;
    }
    if (msg.role !== "assistant") {
      fail(res, 422, "validation_error", { message: "not_assistant_message" });
      return;
    }

    const sessRows = await db
      .select({ userId: learningSessions.userId })
      .from(learningSessions)
      .where(eq(learningSessions.id, msg.sessionId))
      .limit(1);
    if (!sessRows[0] || sessRows[0].userId !== req.user!.id) {
      fail(res, 403, "forbidden");
      return;
    }

    const existing = await db
      .select({ id: tutorRatings.id })
      .from(tutorRatings)
      .where(and(eq(tutorRatings.messageId, msg.id), eq(tutorRatings.userId, req.user!.id)))
      .limit(1);
    if (existing[0]) {
      fail(res, 409, "already_rated");
      return;
    }

    const inserted = await db
      .insert(tutorRatings)
      .values({
        messageId: msg.id,
        userId: req.user!.id,
        stars: body.rating,
        comment: body.feedback ?? null,
      })
      .returning({
        id: tutorRatings.id,
        messageId: tutorRatings.messageId,
        stars: tutorRatings.stars,
        comment: tutorRatings.comment,
        createdAt: tutorRatings.createdAt,
      });

    // Mirror rating onto tutor_messages for legacy column convenience.
    await db
      .update(tutorMessages)
      .set({ rating: body.rating })
      .where(eq(tutorMessages.id, msg.id));

    const row = inserted[0]!;
    const dto: TutorRatingDTO = {
      id: row.id,
      message_id: row.messageId,
      rating: row.stars,
      feedback: row.comment,
      created_at: row.createdAt.toISOString(),
    };
    ok(res, dto);
  }),
);
