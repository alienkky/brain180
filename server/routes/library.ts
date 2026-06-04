// Owner: ALI-67 방연동[MCP] — landed per api-contracts.md §2.
// Reads modules / lessons / text_excerpts. Mutation lives behind admin.
//
// Auth: requireAuth + userRateLimit (60 req/min/user) per §0-5.
// Envelope: ok() / fail() with structured error codes from §0-1.

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { and, eq, asc, desc, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  lessonFeedback,
  lessons,
  modules,
  textExcerpts,
  users,
} from "../db/schema.js";
import { ok, fail } from "../lib/envelope.js";
import { parseBody, LessonFeedbackBody } from "../lib/validators.js";
import {
  requireApprovedUser,
  requireAuth,
  requirePasswordFresh,
} from "../middleware/auth.js";
import { userRateLimit } from "../middleware/rate-limit.js";

export const libraryRouter = Router();
libraryRouter.use(requireAuth, requirePasswordFresh, requireApprovedUser);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

interface ModuleListDTO {
  id: string;
  slug: string;
  title: string;
  field: string;
  difficulty: number;
  axis_focus: Record<string, unknown>;
  lesson_count: number;
}

interface LessonDTO {
  id: string;
  module_id: string;
  order: number;
  title: string;
  text_excerpt_id: string | null;
  tutor_system_prompt_id: string | null;
  objectives: string[];
  axis_focus: Record<string, unknown>;
  cognitive_structure_analysis: string;
  learner_questions: string;
  tutor_reference_notes: string;
}

interface TextExcerptDTO {
  id: string;
  lesson_id: string;
  title: string;
  author: string;
  source: string;
  body: string;
  language: string;
}

async function firstExcerptIdForLesson(lessonId: string): Promise<string | null> {
  const rows = await db
    .select({ id: textExcerpts.id })
    .from(textExcerpts)
    .where(eq(textExcerpts.lessonId, lessonId))
    .orderBy(asc(textExcerpts.order))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function lessonToDTO(row: {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  tutorSystemPromptId: string | null;
  objectives: unknown;
  axisFocus: unknown;
  sourceMeta: unknown;
}): Promise<LessonDTO> {
  const textExcerptId = await firstExcerptIdForLesson(row.id);
  const sourceMeta =
    row.sourceMeta && typeof row.sourceMeta === "object"
      ? (row.sourceMeta as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    module_id: row.moduleId,
    order: row.order,
    title: row.title,
    text_excerpt_id: textExcerptId,
    tutor_system_prompt_id: row.tutorSystemPromptId,
    objectives: Array.isArray(row.objectives) ? (row.objectives as string[]) : [],
    axis_focus: (row.axisFocus ?? {}) as Record<string, unknown>,
    cognitive_structure_analysis:
      typeof sourceMeta.cognitive_structure_analysis === "string"
        ? sourceMeta.cognitive_structure_analysis
        : "",
    learner_questions:
      typeof sourceMeta.learner_questions === "string"
        ? sourceMeta.learner_questions
        : "",
    tutor_reference_notes:
      typeof sourceMeta.tutor_reference_notes === "string"
        ? sourceMeta.tutor_reference_notes
        : "",
  };
}

// ── GET /api/library/modules ────────────────────────────────────────
libraryRouter.get(
  "/modules",
  userRateLimit,
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: modules.id,
        slug: modules.slug,
        title: modules.title,
        field: modules.field,
        difficulty: modules.difficulty,
        axisFocus: modules.axisFocus,
        lessonCount: sql<number>`(SELECT COUNT(*)::int FROM ${lessons} WHERE ${lessons.moduleId} = ${modules.id})`,
      })
      .from(modules)
      .orderBy(asc(modules.axis), asc(modules.order));

    const data: ModuleListDTO[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      field: r.field,
      difficulty: r.difficulty,
      axis_focus: (r.axisFocus ?? {}) as Record<string, unknown>,
      lesson_count: Number(r.lessonCount ?? 0),
    }));

    ok(res, data);
  }),
);

// ── GET /api/library/modules/:id/lessons ────────────────────────────
libraryRouter.get(
  "/modules/:id/lessons",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const moduleId = req.params.id;
    if (typeof moduleId !== "string" || !UUID_RE.test(moduleId)) {
      fail(res, 422, "validation_error", { message: "invalid_module_id" });
      return;
    }

    const moduleRow = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.id, moduleId))
      .limit(1);
    if (moduleRow.length === 0) {
      fail(res, 404, "not_found");
      return;
    }

    const rows = await db
      .select({
        id: lessons.id,
        moduleId: lessons.moduleId,
        order: lessons.order,
        title: lessons.title,
        tutorSystemPromptId: lessons.tutorSystemPromptId,
        objectives: lessons.objectives,
        axisFocus: lessons.axisFocus,
        sourceMeta: lessons.sourceMeta,
      })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .orderBy(asc(lessons.order));

    const data: LessonDTO[] = [];
    for (const r of rows) data.push(await lessonToDTO(r));
    ok(res, data);
  }),
);

// ── GET /api/library/lessons/:id ────────────────────────────────────
libraryRouter.get(
  "/lessons/:id",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const lessonId = req.params.id;
    if (typeof lessonId !== "string" || !UUID_RE.test(lessonId)) {
      fail(res, 422, "validation_error", { message: "invalid_lesson_id" });
      return;
    }

    const rows = await db
      .select({
        id: lessons.id,
        moduleId: lessons.moduleId,
        order: lessons.order,
        title: lessons.title,
        tutorSystemPromptId: lessons.tutorSystemPromptId,
        objectives: lessons.objectives,
        axisFocus: lessons.axisFocus,
        sourceMeta: lessons.sourceMeta,
      })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);
    const row = rows[0];
    if (!row) {
      fail(res, 404, "not_found");
      return;
    }
    ok(res, await lessonToDTO(row));
  }),
);

// ── GET /api/library/texts/:id ──────────────────────────────────────
libraryRouter.get(
  "/texts/:id",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const textId = req.params.id;
    if (typeof textId !== "string" || !UUID_RE.test(textId)) {
      fail(res, 422, "validation_error", { message: "invalid_text_id" });
      return;
    }

    const rows = await db
      .select({
        id: textExcerpts.id,
        lessonId: textExcerpts.lessonId,
        title: textExcerpts.title,
        author: textExcerpts.author,
        source: textExcerpts.source,
        content: textExcerpts.content,
        language: textExcerpts.language,
      })
      .from(textExcerpts)
      .where(eq(textExcerpts.id, textId))
      .limit(1);
    const row = rows[0];
    if (!row) {
      fail(res, 404, "not_found");
      return;
    }

    const dto: TextExcerptDTO = {
      id: row.id,
      lesson_id: row.lessonId,
      title: row.title,
      author: row.author,
      source: row.source,
      body: row.content,
      language: row.language,
    };
    ok(res, dto);
  }),
);

// ── Lesson Feedback (v1 FeedbackPanel 부활) ─────────────────────────
//
// 익명 옵션: 클라이언트가 `display_name` 을 빈 문자열로 보내면 "익명".
// 그렇지 않으면 user.name 또는 사용자가 입력한 표시명을 그대로 저장.
// 평점은 0–5 (0 = 미평가).

interface LessonFeedbackDTO {
  id: string;
  lesson_id: string;
  display_name: string;
  content: string;
  rating: number;
  admin_reply: string | null;
  admin_replied_at: string | null;
  created_at: string;
  // 본인이 작성한 글에만 true — 클라이언트가 *삭제* UI 분기에 사용 가능.
  is_mine: boolean;
}

libraryRouter.get(
  "/lessons/:id/feedback",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const lessonId = req.params.id;
    if (typeof lessonId !== "string" || !UUID_RE.test(lessonId)) {
      fail(res, 422, "validation_error", { message: "invalid_lesson_id" });
      return;
    }
    const rows = await db
      .select({
        id: lessonFeedback.id,
        lessonId: lessonFeedback.lessonId,
        userId: lessonFeedback.userId,
        displayName: lessonFeedback.displayName,
        content: lessonFeedback.content,
        rating: lessonFeedback.rating,
        adminReply: lessonFeedback.adminReply,
        adminRepliedAt: lessonFeedback.adminRepliedAt,
        createdAt: lessonFeedback.createdAt,
      })
      .from(lessonFeedback)
      .where(
        and(
          eq(lessonFeedback.lessonId, lessonId),
          eq(lessonFeedback.isHidden, false),
          isNull(lessonFeedback.deletedAt),
        ),
      )
      .orderBy(desc(lessonFeedback.createdAt))
      .limit(100);
    const dto: LessonFeedbackDTO[] = rows.map((r) => ({
      id: r.id,
      lesson_id: r.lessonId,
      display_name: r.displayName || "익명",
      content: r.content,
      rating: r.rating,
      admin_reply: r.adminReply,
      admin_replied_at: r.adminRepliedAt ? r.adminRepliedAt.toISOString() : null,
      created_at: r.createdAt.toISOString(),
      is_mine: r.userId === req.user!.id,
    }));
    ok(res, dto);
  }),
);

libraryRouter.post(
  "/lessons/:id/feedback",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const lessonId = req.params.id;
    if (typeof lessonId !== "string" || !UUID_RE.test(lessonId)) {
      fail(res, 422, "validation_error", { message: "invalid_lesson_id" });
      return;
    }
    const body = parseBody(LessonFeedbackBody, req, res);
    if (!body) return;

    const lessonRow = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);
    if (lessonRow.length === 0) {
      fail(res, 404, "not_found", { message: "lesson_not_found" });
      return;
    }

    // displayName 빈 문자열이면 user.name 채워서 저장 — 표시 시 "익명" 으로 fallback.
    const userRow = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);
    const fallbackName = userRow[0]?.name ?? "";

    const inserted = await db
      .insert(lessonFeedback)
      .values({
        lessonId,
        userId: req.user!.id,
        displayName: body.display_name || fallbackName,
        content: body.content,
        rating: body.rating,
      })
      .returning({
        id: lessonFeedback.id,
        lessonId: lessonFeedback.lessonId,
        displayName: lessonFeedback.displayName,
        content: lessonFeedback.content,
        rating: lessonFeedback.rating,
        adminReply: lessonFeedback.adminReply,
        adminRepliedAt: lessonFeedback.adminRepliedAt,
        createdAt: lessonFeedback.createdAt,
      });
    const row = inserted[0]!;
    const dto: LessonFeedbackDTO = {
      id: row.id,
      lesson_id: row.lessonId,
      display_name: row.displayName || "익명",
      content: row.content,
      rating: row.rating,
      admin_reply: row.adminReply,
      admin_replied_at: row.adminRepliedAt ? row.adminRepliedAt.toISOString() : null,
      created_at: row.createdAt.toISOString(),
      is_mine: true,
    };
    ok(res, dto);
  }),
);

libraryRouter.delete(
  "/lessons/:lessonId/feedback/:feedbackId",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const feedbackId = req.params.feedbackId;
    if (typeof feedbackId !== "string" || !UUID_RE.test(feedbackId)) {
      fail(res, 422, "validation_error", { message: "invalid_feedback_id" });
      return;
    }
    const rows = await db
      .select({
        id: lessonFeedback.id,
        userId: lessonFeedback.userId,
      })
      .from(lessonFeedback)
      .where(eq(lessonFeedback.id, feedbackId))
      .limit(1);
    const row = rows[0];
    if (!row) {
      fail(res, 404, "not_found");
      return;
    }
    if (row.userId !== req.user!.id && req.user!.role !== "admin") {
      fail(res, 403, "forbidden");
      return;
    }
    await db.delete(lessonFeedback).where(eq(lessonFeedback.id, feedbackId));
    ok(res, { id: feedbackId });
  }),
);
