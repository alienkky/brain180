// Owner: ALI-67 방연동[MCP] — landed per api-contracts.md §2.
// Reads modules / lessons / text_excerpts. Mutation lives behind admin.
//
// Auth: requireAuth + userRateLimit (60 req/min/user) per §0-5.
// Envelope: ok() / fail() with structured error codes from §0-1.

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { eq, asc, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { lessons, modules, textExcerpts } from "../db/schema.js";
import { ok, fail } from "../lib/envelope.js";
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
}): Promise<LessonDTO> {
  const textExcerptId = await firstExcerptIdForLesson(row.id);
  return {
    id: row.id,
    module_id: row.moduleId,
    order: row.order,
    title: row.title,
    text_excerpt_id: textExcerptId,
    tutor_system_prompt_id: row.tutorSystemPromptId,
    objectives: Array.isArray(row.objectives) ? (row.objectives as string[]) : [],
    axis_focus: (row.axisFocus ?? {}) as Record<string, unknown>,
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
      fail(res, 400, "validation_error", { message: "invalid_module_id" });
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
      fail(res, 400, "validation_error", { message: "invalid_lesson_id" });
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
      fail(res, 400, "validation_error", { message: "invalid_text_id" });
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
