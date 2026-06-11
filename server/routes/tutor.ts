// Owner: ALI-66 남말씨[글말] (system prompts) + ALI-67 방연동[MCP] (LLM wrappers).
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
// LLM provider chosen by env.AI_PROVIDER ("kimi" | "anthropic"). Dispatcher
// lives in server/lib/llm.ts and falls back to whichever provider has a key
// configured.
//
// Side effects:
//   - 2 tutor_messages rows per /chat (user + assistant)
//   - 1 api_usage_log via callTutorLLM seam (anonymized user_id)
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
import { UpstreamError, callAnthropic, type AnthropicMessageContent } from "../lib/anthropic.js";
import { hasFeature } from "../lib/env.js";
import { callTutorLLM, resolveTutorProvider } from "../lib/llm.js";
import { callOpenAIVision } from "../lib/openai-vision.js";
import { parseBody, TutorChatBody, RateTutorBody } from "../lib/validators.js";
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
  "현재 학습 모드: {{mode_label}}",
  "{{mode_guidance}}",
  "학생이 텍스트 '{{lesson_title}}'의 사고구조를 추출하도록 돕습니다.",
  "원문: {{text_body}}",
  "레슨별 튜터 참고자료:",
  "{{lesson_tutor_notes}}",
  "축 가중치: {{axis_focus}}",
  "학생: {{user_name}}",
  "현재 인지 캔버스 상태:",
  "{{canvas_state}}",
].join("\n");

const MODE_LABEL: Record<string, string> = {
  analyze: "분석 모드",
  reverse: "역해석 모드",
  practice: "연습 모드",
};

const MODE_GUIDANCE: Record<string, string> = {
  analyze:
    "학생이 본문을 읽고 그 뒤에 숨은 *사고 구조*를 추출하도록 돕습니다. " +
    "내용 요약이 아니라 *저자가 어떻게 생각했는지* 의 패턴을 짚어 주세요.",
  reverse:
    "학생은 *캔버스를 먼저 본 뒤* 원문을 재구성/추측합니다. 본문을 직접 인용하지 말고, " +
    "캔버스의 노드와 관계만으로 학생이 본문의 구조를 *역으로* 떠올릴 수 있도록 질문을 던지세요.",
  practice:
    "학생은 자신만의 사고 구조를 자유롭게 시각화 중입니다. 본문은 참고만, " +
    "학생의 *현재 캔버스* 자체에 대해 패턴을 코칭해 주세요.",
};

const CANVAS_STATE_EMPTY = "(아직 비어 있음 — 학생이 첫 노드를 놓기 전입니다)";

const NODE_TYPE_KO: Record<string, string> = {
  concept: "개념",
  anchor: "정박",
  bridge: "연결",
  branch: "분기",
};

const RELATION_KO: Record<string, string> = {
  causes: "원인",
  supports: "지지",
  contrasts: "대비",
  transforms: "변형",
  contains: "포함",
};

interface CanvasSnapshotShape {
  nodes: { id: string; type: string; label: string }[];
  edges: { from: string; to: string; relation: string; label?: string }[];
}

function formatCanvasState(snap: CanvasSnapshotShape | undefined): string {
  if (!snap || snap.nodes.length === 0) return CANVAS_STATE_EMPTY;
  const labelOf = new Map(snap.nodes.map((n) => [n.id, n.label]));
  const nodeLines = snap.nodes
    .map((n) => `- [${NODE_TYPE_KO[n.type] ?? n.type}] ${n.label}`)
    .join("\n");
  const edgeLines = snap.edges.length
    ? snap.edges
        .map((e) => {
          const from = labelOf.get(e.from) ?? e.from;
          const to = labelOf.get(e.to) ?? e.to;
          // v3 자유 관계("other")는 학생이 붙인 라벨이 의미 — 라벨 우선
          const rel =
            e.relation === "other" && e.label
              ? e.label
              : RELATION_KO[e.relation] ?? e.relation;
          return `- ${from} → (${rel}) → ${to}`;
        })
        .join("\n")
    : "- (관계 아직 없음)";
  return [
    `노드 ${snap.nodes.length}개:`,
    nodeLines,
    `관계 ${snap.edges.length}개:`,
    edgeLines,
  ].join("\n");
}

function formatNodeCanvasPromptContext(snapshot: CanvasSnapshotShape | undefined): string | null {
  if (!snapshot || snapshot.nodes.length === 0) return null;
  return [
    "## 현재 일반 노드 캔버스 구조",
    formatCanvasState(snapshot),
    "",
    "위 노드와 관계 목록은 학생이 현재 캔버스에 직접 만든 구조입니다.",
    "이미지를 볼 수 없다고 답하지 말고, 이 구조 데이터를 기준으로 다음에 추가하면 좋을 노드와 연결 관계를 제안하세요.",
  ].join("\n");
}

function formatFreeCanvasPathContext(snapshot: unknown): string | null {
  const paths = snapshot && typeof snapshot === "object"
    ? (snapshot as { paths?: unknown }).paths
    : null;
  if (!Array.isArray(paths) || paths.length === 0) return null;

  let pointCount = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const colors = new Set<string>();
  const widths = new Set<number>();

  const compact = paths.slice(0, 40).map((rawPath, pathIndex) => {
    const path = rawPath && typeof rawPath === "object"
      ? rawPath as { color?: unknown; width?: unknown; points?: unknown }
      : {};
    const color = typeof path.color === "string" ? path.color : "unknown";
    const width = typeof path.width === "number" ? path.width : 0;
    const points = Array.isArray(path.points) ? path.points : [];
    colors.add(color);
    widths.add(width);
    pointCount += points.length;

    const numericPoints = points
      .map((rawPoint) => {
        const point = rawPoint && typeof rawPoint === "object"
          ? rawPoint as { x?: unknown; y?: unknown }
          : {};
        return typeof point.x === "number" && typeof point.y === "number"
          ? { x: point.x, y: point.y }
          : null;
      })
      .filter((point): point is { x: number; y: number } => point !== null);

    for (const point of numericPoints) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    const step = Math.max(1, Math.ceil(numericPoints.length / 24));
    const sampled = numericPoints
      .filter((_, index) => index % step === 0 || index === numericPoints.length - 1)
      .map((point) => [Math.round(point.x), Math.round(point.y)]);

    return {
      index: pathIndex + 1,
      color,
      width,
      points: numericPoints.length,
      sampled,
    };
  });

  const bounds = Number.isFinite(minX)
    ? `bounds: x ${Math.round(minX)}-${Math.round(maxX)}, y ${Math.round(minY)}-${Math.round(maxY)}`
    : "bounds: none";

  return [
    "[free-form canvas path data]",
    `strokes: ${paths.length}, total_points: ${pointCount}`,
    bounds,
    `colors: ${Array.from(colors).join(", ") || "none"}`,
    `widths: ${Array.from(widths).join(", ") || "none"}`,
    `sampled_paths_json: ${JSON.stringify(compact)}`,
  ].join("\n");
}

function formatLessonTutorNotes(sourceMeta: unknown): string {
  const meta =
    sourceMeta && typeof sourceMeta === "object"
      ? (sourceMeta as Record<string, unknown>)
      : {};
  const cognitive =
    typeof meta.cognitive_structure_analysis === "string"
      ? meta.cognitive_structure_analysis.trim()
      : "";
  const questions =
    typeof meta.learner_questions === "string"
      ? meta.learner_questions.trim()
      : "";
  const notes =
    typeof meta.tutor_reference_notes === "string"
      ? meta.tutor_reference_notes.trim()
      : "";
  const sections: string[] = [];
  if (cognitive) sections.push(`인지구조 분석:\n${cognitive}`);
  if (questions) sections.push(`학습자에게 던질 질문:\n${questions}`);
  if (notes) sections.push(`AI 튜터 참고 메모:\n${notes}`);
  return sections.length > 0
    ? sections.join("\n\n")
    : "(관리자가 입력한 레슨별 참고자료 없음)";
}

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
  my_rating: TutorRatingDTO | null;
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
  ratingId?: string | null;
  ratingStars?: number | null;
  ratingComment?: string | null;
  ratingCreatedAt?: Date | null;
}): TutorMessageDTO {
  return {
    id: row.id,
    session_id: row.sessionId,
    role: row.role,
    content: row.content,
    model: row.model,
    input_tokens: row.tokensIn,
    output_tokens: row.tokensOut,
    my_rating: row.ratingId
      ? {
          id: row.ratingId,
          message_id: row.id,
          rating: row.ratingStars ?? 0,
          feedback: row.ratingComment ?? null,
          created_at: (row.ratingCreatedAt ?? row.createdAt).toISOString(),
        }
      : null,
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
  canvasMode?: string;
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
  // Prefer mode-specific active prompt, fall back to any active prompt.
  const activeRows = await db
    .select({
      content: tutorSystemPrompts.content,
      version: tutorSystemPrompts.version,
      mode: tutorSystemPrompts.mode,
    })
    .from(tutorSystemPrompts)
    .where(eq(tutorSystemPrompts.isActive, true))
    .orderBy(desc(tutorSystemPrompts.updatedAt));
  if (activeRows.length > 0) {
    const modeMatch = activeRows.find((r) => r.mode === lessonRow.canvasMode);
    const fallbackRow = modeMatch ?? activeRows[0];
    if (fallbackRow) {
      return { content: fallbackRow.content, version: fallbackRow.version, source: "active" };
    }
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
        mode: learningSessions.mode,
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
      fail(res, 422, "validation_error", { message: "lesson_mismatch" });
      return;
    }

    // Lesson + excerpt for variable substitution.
    const lessonRows = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        textSource: lessons.textSource,
        sourceMeta: lessons.sourceMeta,
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
    const canvasMode = body.canvas_mode ?? "constrained";
    const prompt = await resolveSystemPrompt({
      id: lesson.id,
      tutorSystemPromptId: lesson.tutorSystemPromptId,
      canvasMode,
    });
    const mode = session.mode;
    const lessonTutorNotes = formatLessonTutorNotes(lesson.sourceMeta);
    const systemMessageBase = substitute(prompt.content, {
      lesson_title: lesson.title,
      text_body: textBody,
      lesson_tutor_notes: lessonTutorNotes,
      axis_focus: JSON.stringify(lesson.axisFocus ?? {}),
      user_name: userName,
      canvas_state: formatCanvasState(body.canvas_snapshot),
      mode: mode,
      mode_label: MODE_LABEL[mode] ?? mode,
      mode_guidance: MODE_GUIDANCE[mode] ?? "",
      canvas_mode: canvasMode,
    });
    const systemMessage = systemMessageBase.includes(lessonTutorNotes)
      ? systemMessageBase
      : [
          systemMessageBase,
          "",
          "## 레슨별 튜터 참고자료",
          lessonTutorNotes,
        ].join("\n");

    // Conversation history (chronological), excluding system rows.
    const history = await db
      .select({
        role: tutorMessages.role,
        content: tutorMessages.content,
      })
      .from(tutorMessages)
      .where(eq(tutorMessages.sessionId, session.id))
      .orderBy(asc(tutorMessages.createdAt));

    const messages: Array<{ role: "user" | "assistant"; content: AnthropicMessageContent }> = history
      .filter((m): m is { role: "user" | "assistant"; content: string } =>
        m.role === "user" || m.role === "assistant",
      )
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content as AnthropicMessageContent }));

    // Build last user message — include canvas image for free-draw mode vision.
    // If Kimi is the default provider but Anthropic is configured, build the
    // image message now and route this turn to Claude vision below.
    const canvasImageB64 = body.canvas_image_base64;
    const freeCanvasPathContext = body.canvas_mode === "free"
      ? formatFreeCanvasPathContext(body.canvas_snapshot)
      : null;
    const nodeCanvasContext = body.canvas_mode === "free"
      ? null
      : formatNodeCanvasPromptContext(body.canvas_snapshot);
    const canvasPromptContext = freeCanvasPathContext ?? nodeCanvasContext;
    const messageWithCanvasContext = canvasPromptContext
      ? `${body.message}\n\n${canvasPromptContext}\n\n캔버스 구조 데이터가 첨부되어 있습니다. 이 데이터를 직접 참고해서 답하세요.`
      : body.message;
    const provider = resolveTutorProvider();
    const visionProvider = canvasImageB64
      ? hasFeature("anthropic")
        ? "anthropic"
        : hasFeature("openai")
        ? "openai"
        : null
      : null;
    if (canvasImageB64 && visionProvider) {
      // Vision message: image + text
      messages.push({
        role: "user" as const,
        content: [
          {
            type: "image" as const,
            source: { type: "base64" as const, media_type: "image/png" as const, data: canvasImageB64 },
          },
          { type: "text" as const, text: messageWithCanvasContext },
        ],
      });
    } else if (canvasImageB64) {
      // Provider doesn't support vision — note the image and pass text
      messages.push({
        role: "user" as const,
        content: `[자유형 캔버스 이미지 첨부됨 — 현재 튜터가 이미지를 직접 볼 수 없습니다]\n\n${messageWithCanvasContext}`,
      });
    } else {
      messages.push({ role: "user" as const, content: messageWithCanvasContext });
    }

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
      if (visionProvider === "anthropic" && provider !== "anthropic") {
        result = await callAnthropic({ userId, system: systemMessage, messages });
      } else if (visionProvider === "openai") {
        result = await callOpenAIVision({ userId, system: systemMessage, messages });
      } else {
        result = await callTutorLLM({ userId, system: systemMessage, messages });
      }
    } catch (err) {
      if (err instanceof UpstreamError) {
        fail(res, 502, "upstream_error", {
          message: `${err.provider}_${err.code}`,
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
      fail(res, 422, "validation_error", { message: "invalid_session_id" });
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
        ratingId: tutorRatings.id,
        ratingStars: tutorRatings.stars,
        ratingComment: tutorRatings.comment,
        ratingCreatedAt: tutorRatings.createdAt,
        createdAt: tutorMessages.createdAt,
      })
      .from(tutorMessages)
      .leftJoin(
        tutorRatings,
        and(
          eq(tutorRatings.messageId, tutorMessages.id),
          eq(tutorRatings.userId, req.user!.id),
        ),
      )
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
      fail(res, 422, "validation_error", { message: "invalid_message_id" });
      return;
    }

    const body = parseBody(RateTutorBody, req, res);
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

    const upserted = await db
      .insert(tutorRatings)
      .values({
        messageId: msg.id,
        userId: req.user!.id,
        stars: body.rating,
        comment: body.feedback ?? null,
      })
      .onConflictDoUpdate({
        target: [tutorRatings.messageId, tutorRatings.userId],
        set: {
          stars: body.rating,
          comment: body.feedback ?? null,
        },
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

    const row = upserted[0]!;
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
