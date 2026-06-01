// Owner: ALI-67 방연동[MCP] — wires §5 Admin per api-contracts.
//        Approval audit columns landed via migration 0003.
// MVP scope: list pending / approve / reject. Suspend + audit + content
// management stay 503 mvp_cut.

import { randomBytes } from "node:crypto";
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { and, eq, isNull, asc, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { lessons, modules, textExcerpts, users } from "../db/schema.js";
import { ok, fail } from "../lib/envelope.js";
import { hashPassword } from "../lib/password.js";
import { lucia } from "../lib/lucia.js";
import {
  AdminLessonCreateBody,
  AdminLessonUpdateBody,
  AdminModuleCreateBody,
  AdminModuleUpdateBody,
  RejectUserBody,
  parseBody,
} from "../lib/validators.js";
import { requireAdmin } from "../middleware/auth.js";
import { userRateLimit } from "../middleware/rate-limit.js";
import { toUserDTO } from "./auth.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.use(userRateLimit);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

const baseUserSelect = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  status: users.status,
  mustChangePassword: users.mustChangePassword,
  createdAt: users.createdAt,
} as const;

// ── GET /api/admin/users/pending ────────────────────────────────────
adminRouter.get(
  "/users/pending",
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select(baseUserSelect)
      .from(users)
      .where(and(eq(users.status, "pending_approval"), isNull(users.deletedAt)))
      .orderBy(asc(users.createdAt));
    ok(res, rows.map(toUserDTO));
  }),
);

// ── POST /api/admin/users/:id/approve ───────────────────────────────
adminRouter.post(
  "/users/:id/approve",
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    if (typeof targetId !== "string" || !UUID_RE.test(targetId)) {
      fail(res, 422, "validation_error", { message: "invalid_user_id" });
      return;
    }

    const adminId = req.user!.id;
    const updated = await db
      .update(users)
      .set({
        status: "approved",
        approvedAt: new Date(),
        approvedById: adminId,
        rejectedReason: null,
      })
      .where(eq(users.id, targetId))
      .returning(baseUserSelect);

    const row = updated[0];
    if (!row) {
      fail(res, 404, "not_found");
      return;
    }
    ok(res, toUserDTO(row));
  }),
);

// ── POST /api/admin/users/:id/reject ────────────────────────────────
adminRouter.post(
  "/users/:id/reject",
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    if (typeof targetId !== "string" || !UUID_RE.test(targetId)) {
      fail(res, 422, "validation_error", { message: "invalid_user_id" });
      return;
    }

    const body = parseBody(RejectUserBody, req, res);
    if (!body) return;

    const updated = await db
      .update(users)
      .set({
        status: "rejected",
        rejectedReason: body.reason ?? null,
        approvedAt: null,
        approvedById: null,
      })
      .where(eq(users.id, targetId))
      .returning(baseUserSelect);

    const row = updated[0];
    if (!row) {
      fail(res, 404, "not_found");
      return;
    }
    ok(res, toUserDTO(row));
  }),
);

// ── POST /api/admin/users/:id/reset-password ────────────────────────
// Generates a 16-byte url-safe temp password, hashes argon2id, sets
// mustChangePassword=true, invalidates target's existing sessions.
// Returns the plaintext temp password ONCE in the response — admin
// must deliver it out-of-band (no email yet under MVP).
adminRouter.post(
  "/users/:id/reset-password",
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    if (typeof targetId !== "string" || !UUID_RE.test(targetId)) {
      fail(res, 422, "validation_error", { message: "invalid_user_id" });
      return;
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, targetId), isNull(users.deletedAt)))
      .limit(1);
    if (existing.length === 0) {
      fail(res, 404, "not_found");
      return;
    }

    const tempPassword = randomBytes(16).toString("base64url");
    const passwordHash = await hashPassword(tempPassword);

    await db
      .update(users)
      .set({ passwordHash, mustChangePassword: true })
      .where(eq(users.id, targetId));

    await lucia.invalidateUserSessions(targetId);

    ok(res, { user_id: targetId, temp_password: tempPassword });
  }),
);

// ── Module CRUD ─────────────────────────────────────────────────────

interface AdminModuleDTO {
  id: string;
  slug: string;
  title: string;
  axis: "cognitive" | "value" | "time";
  field: string;
  order: number;
  difficulty: number;
  description: string | null;
  axis_focus: Record<string, unknown>;
  lesson_count: number;
}

async function moduleDTO(id: string): Promise<AdminModuleDTO | null> {
  const rows = await db
    .select({
      id: modules.id,
      slug: modules.slug,
      title: modules.title,
      axis: modules.axis,
      field: modules.field,
      order: modules.order,
      difficulty: modules.difficulty,
      description: modules.description,
      axisFocus: modules.axisFocus,
      lessonCount: sql<number>`(SELECT COUNT(*)::int FROM ${lessons} WHERE ${lessons.moduleId} = ${modules.id})`,
    })
    .from(modules)
    .where(eq(modules.id, id))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    axis: r.axis,
    field: r.field,
    order: r.order,
    difficulty: r.difficulty,
    description: r.description ?? null,
    axis_focus: (r.axisFocus ?? {}) as Record<string, unknown>,
    lesson_count: Number(r.lessonCount ?? 0),
  };
}

adminRouter.get(
  "/modules",
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: modules.id,
        slug: modules.slug,
        title: modules.title,
        axis: modules.axis,
        field: modules.field,
        order: modules.order,
        difficulty: modules.difficulty,
        description: modules.description,
        axisFocus: modules.axisFocus,
        lessonCount: sql<number>`(SELECT COUNT(*)::int FROM ${lessons} WHERE ${lessons.moduleId} = ${modules.id})`,
      })
      .from(modules)
      .orderBy(asc(modules.axis), asc(modules.order));
    const data: AdminModuleDTO[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      axis: r.axis,
      field: r.field,
      order: r.order,
      difficulty: r.difficulty,
      description: r.description ?? null,
      axis_focus: (r.axisFocus ?? {}) as Record<string, unknown>,
      lesson_count: Number(r.lessonCount ?? 0),
    }));
    ok(res, data);
  }),
);

adminRouter.post(
  "/modules",
  asyncHandler(async (req, res) => {
    const body = parseBody(AdminModuleCreateBody, req, res);
    if (!body) return;
    try {
      const [row] = await db
        .insert(modules)
        .values({
          title: body.title,
          slug: body.slug,
          axis: body.axis,
          field: body.field,
          order: body.order,
          difficulty: body.difficulty,
          description: body.description ?? null,
          axisFocus: (body.axis_focus ?? {}) as Record<string, never>,
        })
        .returning({ id: modules.id });
      if (!row) {
        fail(res, 500, "internal_error");
        return;
      }
      const dto = await moduleDTO(row.id);
      if (!dto) {
        fail(res, 500, "internal_error");
        return;
      }
      res.status(201).json({ data: dto });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? "");
      if (msg.includes("modules_slug_idx") || msg.includes("modules_axis_order_idx")) {
        fail(res, 409, "conflict", { message: "duplicate_slug_or_order" });
        return;
      }
      throw e;
    }
  }),
);

adminRouter.patch(
  "/modules/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== "string" || !UUID_RE.test(id)) {
      fail(res, 422, "validation_error", { message: "invalid_module_id" });
      return;
    }
    const body = parseBody(AdminModuleUpdateBody, req, res);
    if (!body) return;
    const patch: Record<string, unknown> = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.slug !== undefined) patch.slug = body.slug;
    if (body.axis !== undefined) patch.axis = body.axis;
    if (body.field !== undefined) patch.field = body.field;
    if (body.order !== undefined) patch.order = body.order;
    if (body.difficulty !== undefined) patch.difficulty = body.difficulty;
    if (body.description !== undefined) patch.description = body.description;
    if (body.axis_focus !== undefined) patch.axisFocus = body.axis_focus;
    patch.updatedAt = new Date();
    try {
      const updated = await db
        .update(modules)
        .set(patch)
        .where(eq(modules.id, id))
        .returning({ id: modules.id });
      if (updated.length === 0) {
        fail(res, 404, "not_found");
        return;
      }
      const dto = await moduleDTO(id);
      ok(res, dto);
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? "");
      if (msg.includes("modules_slug_idx") || msg.includes("modules_axis_order_idx")) {
        fail(res, 409, "conflict", { message: "duplicate_slug_or_order" });
        return;
      }
      throw e;
    }
  }),
);

adminRouter.delete(
  "/modules/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== "string" || !UUID_RE.test(id)) {
      fail(res, 422, "validation_error", { message: "invalid_module_id" });
      return;
    }
    const childCount = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(lessons)
      .where(eq(lessons.moduleId, id));
    if ((childCount[0]?.c ?? 0) > 0) {
      fail(res, 409, "conflict", { message: "module_has_lessons" });
      return;
    }
    const deleted = await db
      .delete(modules)
      .where(eq(modules.id, id))
      .returning({ id: modules.id });
    if (deleted.length === 0) {
      fail(res, 404, "not_found");
      return;
    }
    res.status(204).end();
  }),
);

// ── Lesson CRUD ─────────────────────────────────────────────────────

interface AdminLessonDTO {
  id: string;
  module_id: string;
  title: string;
  order: number;
  objectives: string[];
  axis_focus: Record<string, unknown>;
  text_excerpt_id: string | null;
  body: string;
  author: string;
  source: string;
  language: string;
}

async function lessonDTO(id: string): Promise<AdminLessonDTO | null> {
  const lessonRows = await db
    .select({
      id: lessons.id,
      moduleId: lessons.moduleId,
      title: lessons.title,
      order: lessons.order,
      objectives: lessons.objectives,
      axisFocus: lessons.axisFocus,
    })
    .from(lessons)
    .where(eq(lessons.id, id))
    .limit(1);
  const l = lessonRows[0];
  if (!l) return null;
  const excerptRows = await db
    .select({
      id: textExcerpts.id,
      content: textExcerpts.content,
      author: textExcerpts.author,
      source: textExcerpts.source,
      language: textExcerpts.language,
    })
    .from(textExcerpts)
    .where(eq(textExcerpts.lessonId, l.id))
    .orderBy(asc(textExcerpts.order))
    .limit(1);
  const e = excerptRows[0];
  return {
    id: l.id,
    module_id: l.moduleId,
    title: l.title,
    order: l.order,
    objectives: Array.isArray(l.objectives) ? (l.objectives as string[]) : [],
    axis_focus: (l.axisFocus ?? {}) as Record<string, unknown>,
    text_excerpt_id: e?.id ?? null,
    body: e?.content ?? "",
    author: e?.author ?? "",
    source: e?.source ?? "",
    language: e?.language ?? "ko",
  };
}

adminRouter.get(
  "/lessons",
  asyncHandler(async (req, res) => {
    const moduleId = typeof req.query.module_id === "string" ? req.query.module_id : null;
    if (moduleId && !UUID_RE.test(moduleId)) {
      fail(res, 422, "validation_error", { message: "invalid_module_id" });
      return;
    }
    const rows = await db
      .select({
        id: lessons.id,
        moduleId: lessons.moduleId,
        title: lessons.title,
        order: lessons.order,
        objectives: lessons.objectives,
        axisFocus: lessons.axisFocus,
      })
      .from(lessons)
      .where(moduleId ? eq(lessons.moduleId, moduleId) : sql`true`)
      .orderBy(asc(lessons.moduleId), asc(lessons.order));
    const data: AdminLessonDTO[] = [];
    for (const r of rows) {
      const d = await lessonDTO(r.id);
      if (d) data.push(d);
    }
    ok(res, data);
  }),
);

adminRouter.post(
  "/lessons",
  asyncHandler(async (req, res) => {
    const body = parseBody(AdminLessonCreateBody, req, res);
    if (!body) return;

    const moduleRow = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.id, body.module_id))
      .limit(1);
    if (moduleRow.length === 0) {
      fail(res, 404, "not_found", { message: "module_not_found" });
      return;
    }

    try {
      const inserted = await db.transaction(async (tx) => {
        const [lessonRow] = await tx
          .insert(lessons)
          .values({
            moduleId: body.module_id,
            title: body.title,
            order: body.order,
            textSource: body.source ?? "",
            objectives: body.objectives ?? [],
            axisFocus: (body.axis_focus ?? {}) as Record<string, never>,
          })
          .returning({ id: lessons.id });
        if (!lessonRow) throw new Error("lesson_insert_failed");
        await tx.insert(textExcerpts).values({
          lessonId: lessonRow.id,
          content: body.body,
          order: 0,
          title: body.title,
          author: body.author ?? "",
          source: body.source ?? "",
          language: body.language ?? "ko",
        });
        return lessonRow;
      });
      const dto = await lessonDTO(inserted.id);
      if (!dto) {
        fail(res, 500, "internal_error");
        return;
      }
      res.status(201).json({ data: dto });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? "");
      if (msg.includes("lessons_module_order_idx")) {
        fail(res, 409, "conflict", { message: "duplicate_order_in_module" });
        return;
      }
      throw e;
    }
  }),
);

adminRouter.patch(
  "/lessons/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== "string" || !UUID_RE.test(id)) {
      fail(res, 422, "validation_error", { message: "invalid_lesson_id" });
      return;
    }
    const body = parseBody(AdminLessonUpdateBody, req, res);
    if (!body) return;

    try {
      await db.transaction(async (tx) => {
        const lessonPatch: Record<string, unknown> = { updatedAt: new Date() };
        if (body.title !== undefined) lessonPatch.title = body.title;
        if (body.order !== undefined) lessonPatch.order = body.order;
        if (body.objectives !== undefined) lessonPatch.objectives = body.objectives;
        if (body.axis_focus !== undefined) lessonPatch.axisFocus = body.axis_focus;
        if (body.source !== undefined) lessonPatch.textSource = body.source;
        const updated = await tx
          .update(lessons)
          .set(lessonPatch)
          .where(eq(lessons.id, id))
          .returning({ id: lessons.id });
        if (updated.length === 0) throw new Error("not_found");

        const excerptPatch: Record<string, unknown> = {};
        if (body.body !== undefined) excerptPatch.content = body.body;
        if (body.author !== undefined) excerptPatch.author = body.author;
        if (body.source !== undefined) excerptPatch.source = body.source;
        if (body.language !== undefined) excerptPatch.language = body.language;
        if (body.title !== undefined) excerptPatch.title = body.title;
        if (Object.keys(excerptPatch).length > 0) {
          const existing = await tx
            .select({ id: textExcerpts.id })
            .from(textExcerpts)
            .where(eq(textExcerpts.lessonId, id))
            .orderBy(asc(textExcerpts.order))
            .limit(1);
          if (existing.length > 0) {
            await tx
              .update(textExcerpts)
              .set(excerptPatch)
              .where(eq(textExcerpts.id, existing[0]!.id));
          } else if (body.body !== undefined) {
            await tx.insert(textExcerpts).values({
              lessonId: id,
              content: body.body,
              order: 0,
              title: body.title ?? "",
              author: body.author ?? "",
              source: body.source ?? "",
              language: body.language ?? "ko",
            });
          }
        }
      });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? "");
      if (msg === "not_found") {
        fail(res, 404, "not_found");
        return;
      }
      if (msg.includes("lessons_module_order_idx")) {
        fail(res, 409, "conflict", { message: "duplicate_order_in_module" });
        return;
      }
      throw e;
    }
    const dto = await lessonDTO(id);
    ok(res, dto);
  }),
);

adminRouter.delete(
  "/lessons/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== "string" || !UUID_RE.test(id)) {
      fail(res, 422, "validation_error", { message: "invalid_lesson_id" });
      return;
    }
    const deleted = await db
      .delete(lessons)
      .where(eq(lessons.id, id))
      .returning({ id: lessons.id });
    if (deleted.length === 0) {
      fail(res, 404, "not_found");
      return;
    }
    res.status(204).end();
  }),
);

// ── 503 mvp_cut stubs ───────────────────────────────────────────────
const NOT_AVAIL = { error: "service_unavailable", reason: "mvp_cut" };
adminRouter.get("/users", (_req, res) => res.status(503).json(NOT_AVAIL));
adminRouter.post("/users/:id/suspend", (_req, res) =>
  res.status(503).json(NOT_AVAIL),
);
adminRouter.get("/api-usage", (_req, res) => res.status(503).json(NOT_AVAIL));
