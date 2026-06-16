// Owner: ALI-62 차곡담[자료] (LearningSession/CanvasArtifact schema)
//        + ALI-63 류한길[흐름] (state machine: draft → submitted → reviewed)
//        + ALI-64 백그림[그림] (canvas viewport contract)
//
// MVP partial landing (ALI-67):
//   - POST /sessions — minimal session start so tutor §4 has a session row to chain.
//   - GET  /sessions/:id — owner-scoped read.
//
// Outstanding (handed back to ALI-62/63/64):
//   - learning_sessions has no status / submitted_at columns yet → contract §3-7
//     `status` is derived (`endedAt IS NULL` → "draft", else "submitted"). DTO emits
//     `submitted_at` from endedAt; revision/reviewed state needs migration 0004.
//   - self_evaluation shape (cognition/value/time/note) does not match the existing
//     session_evaluations table (single self_score + free_text). Returns null until
//     ALI-62 lands the 3-axis migration.
//   - artifact_id is the latest canvas_artifact for the session, or null.
//   - PATCH /sessions/:id, POST /sessions/:id/submit, PUT/GET /artifacts/:id stay 501
//     until the canvas state machine lands.

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { and, eq, desc, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { canvasArtifacts, learningSessions, lessons, modules } from "../db/schema.js";
import { ok, fail } from "../lib/envelope.js";
import {
  parseBody,
  PutArtifactBody,
  StartSessionBody,
} from "../lib/validators.js";
import {
  requireApprovedUser,
  requireAuth,
  requirePasswordFresh,
} from "../middleware/auth.js";
import { userRateLimit } from "../middleware/rate-limit.js";

export const practiceRouter = Router();
practiceRouter.use(requireAuth, requirePasswordFresh, requireApprovedUser);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

export interface LearningSessionDTO {
  id: string;
  user_id: string;
  lesson_id: string;
  mode: "analyze" | "reverse" | "practice";
  status: "draft" | "submitted" | "reviewed";
  artifact_id: string | null;
  self_evaluation: null;
  started_at: string;
  submitted_at: string | null;
}

async function latestArtifactId(sessionId: string): Promise<string | null> {
  const rows = await db
    .select({ id: canvasArtifacts.id })
    .from(canvasArtifacts)
    .where(and(eq(canvasArtifacts.sessionId, sessionId), isNull(canvasArtifacts.deletedAt)))
    .orderBy(desc(canvasArtifacts.savedAt))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function toSessionDTO(row: {
  id: string;
  userId: string;
  lessonId: string;
  mode: "analyze" | "reverse" | "practice";
  startedAt: Date;
  endedAt: Date | null;
}): Promise<LearningSessionDTO> {
  const artifactId = await latestArtifactId(row.id);
  return {
    id: row.id,
    user_id: row.userId,
    lesson_id: row.lessonId,
    mode: row.mode,
    status: row.endedAt ? "submitted" : "draft",
    artifact_id: artifactId,
    self_evaluation: null,
    started_at: row.startedAt.toISOString(),
    submitted_at: row.endedAt ? row.endedAt.toISOString() : null,
  };
}

// ── GET /api/practice/me/progress ───────────────────────────────────
//
// Per-lesson aggregate for the current user. Used by the v2 library shell
// to draw progress pills next to each lesson card. Intentionally minimal:
// count + last_started_at. Canvas node counts are a follow-up that needs a
// per-session latest-artifact join.

interface ProgressEntryDTO {
  lesson_id: string;
  session_count: number;
  last_started_at: string | null;
}

interface ArtifactGalleryDTO {
  artifact_id: string;
  session_id: string;
  saved_at: string;
  mode: "free" | "constrained" | "guided";
  node_count: number;
  edge_count: number;
  progress: { stage: number; s1: boolean; s2: boolean; s3: boolean } | null;
  lesson: {
    id: string;
    module_id: string;
    order: number;
    title: string;
    text_excerpt_id: string | null;
    tutor_system_prompt_id: string | null;
    objectives: string[];
    axis_focus: Record<string, unknown>;
  };
}

practiceRouter.get(
  "/me/progress",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const rows = await db
      .select({
        lessonId: learningSessions.lessonId,
        sessionCount: sql<number>`count(*)::int`,
        lastStartedAt: sql<Date | null>`max(${learningSessions.startedAt})`,
      })
      .from(learningSessions)
      .where(and(eq(learningSessions.userId, req.user!.id), isNull(learningSessions.deletedAt)))
      .groupBy(learningSessions.lessonId);
    const dto: ProgressEntryDTO[] = rows.map((r) => ({
      lesson_id: r.lessonId,
      session_count: Number(r.sessionCount),
      last_started_at: r.lastStartedAt ? new Date(r.lastStartedAt).toISOString() : null,
    }));
    ok(res, dto);
  }),
);

practiceRouter.get(
  "/me/artifacts",
  userRateLimit,
  asyncHandler(async (req, res) => {
    // Autosave on the practice page inserts a new canvas_artifacts row
    // every save (snapshot history). Surface only the latest non-deleted
    // snapshot per learning_sessions row so the dashboard shows one card
    // per session, not the same lesson over and over — and so soft-deleting
    // the visible card cannot be silently undone by a previous snapshot
    // bubbling up.
    // 세션(학습 시도)별 1장(최신 스냅샷). 빈 작업(노드·블록 모두 0)은 제외해
    // 새로 시작 직후의 빈 세션이 목록을 채우지 않도록 함. 최신순 정렬.
    const rows = await db.execute<{
      artifact_id: string;
      session_id: string;
      mode: "free" | "constrained" | "guided";
      payload: Record<string, unknown>;
      saved_at: Date;
      lesson_id: string;
      module_id: string;
      order: number;
      title: string;
      text_excerpt_id: string | null;
      tutor_system_prompt_id: string | null;
      objectives: string[];
      axis_focus: Record<string, unknown> | null;
    }>(sql`
      SELECT DISTINCT ON (ca.session_id)
        ca.id          AS artifact_id,
        ca.session_id  AS session_id,
        ca.mode        AS mode,
        ca.payload     AS payload,
        ca.saved_at    AS saved_at,
        l.id           AS lesson_id,
        l.module_id    AS module_id,
        l."order"      AS "order",
        l.title        AS title,
        (SELECT id FROM text_excerpts WHERE lesson_id = l.id ORDER BY "order" LIMIT 1) AS text_excerpt_id,
        l.tutor_system_prompt_id AS tutor_system_prompt_id,
        l.objectives   AS objectives,
        l.axis_focus   AS axis_focus
      FROM canvas_artifacts ca
      INNER JOIN learning_sessions ls ON ls.id = ca.session_id
      INNER JOIN lessons l ON l.id = ls.lesson_id
      WHERE ls.user_id = ${req.user!.id}
        AND ls.deleted_at IS NULL
        AND ca.deleted_at IS NULL
        AND l.deleted_at IS NULL
        AND (
          (jsonb_typeof(ca.payload->'nodes') = 'array' AND jsonb_array_length(ca.payload->'nodes') > 0)
          OR (jsonb_typeof(ca.payload->'blocks') = 'array' AND jsonb_array_length(ca.payload->'blocks') > 0)
        )
      ORDER BY ca.session_id, ca.saved_at DESC
      LIMIT 50
    `);
    // 최신순으로 정렬 (DISTINCT ON 은 session_id 순서라 재정렬)
    rows.rows.sort(
      (a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime(),
    );

    const dto: ArtifactGalleryDTO[] = rows.rows.map((row) => {
      const payload = row.payload as {
        nodes?: unknown[];
        edges?: unknown[];
        progress?: { stage?: number; s1?: boolean; s2?: boolean; s3?: boolean };
      };
      const savedAt = row.saved_at instanceof Date ? row.saved_at : new Date(row.saved_at);
      const p = payload?.progress;
      return {
        artifact_id: row.artifact_id,
        session_id: row.session_id,
        saved_at: savedAt.toISOString(),
        mode: row.mode,
        node_count: Array.isArray(payload?.nodes) ? payload.nodes.length : 0,
        edge_count: Array.isArray(payload?.edges) ? payload.edges.length : 0,
        progress: p
          ? { stage: Number(p.stage) || 1, s1: !!p.s1, s2: !!p.s2, s3: !!p.s3 }
          : null,
        lesson: {
          id: row.lesson_id,
          module_id: row.module_id,
          order: row.order,
          title: row.title,
          text_excerpt_id: row.text_excerpt_id,
          tutor_system_prompt_id: row.tutor_system_prompt_id,
          objectives: Array.isArray(row.objectives) ? row.objectives : [],
          axis_focus: (row.axis_focus ?? {}) as Record<string, unknown>,
        },
      };
    });
    ok(res, dto);
  }),
);

// DELETE /api/practice/me/artifacts/:id
//   Soft-deletes every snapshot of the learning session this artifact
//   belongs to. Autosave writes a fresh canvas_artifacts row per save,
//   so deleting just the targeted row would let the previous snapshot
//   bubble up to the dashboard and make the card look undeletable.
practiceRouter.delete(
  "/me/artifacts/:id",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const artifactId = req.params.id;
    if (typeof artifactId !== "string" || !UUID_RE.test(artifactId)) {
      fail(res, 422, "validation_error", { message: "invalid_artifact_id" });
      return;
    }

    const rows = await db
      .select({
        id: canvasArtifacts.id,
        sessionId: canvasArtifacts.sessionId,
      })
      .from(canvasArtifacts)
      .innerJoin(learningSessions, eq(canvasArtifacts.sessionId, learningSessions.id))
      .where(
        and(
          eq(canvasArtifacts.id, artifactId),
          eq(learningSessions.userId, req.user!.id),
          isNull(learningSessions.deletedAt),
          isNull(canvasArtifacts.deletedAt),
        ),
      )
      .limit(1);
    if (!rows[0]) {
      fail(res, 404, "not_found");
      return;
    }

    // 시도(세션)별 카드 → 그 세션의 모든 스냅샷만 소프트삭제
    // (자동저장이 세션당 여러 스냅샷 행을 남기므로 최신 1개만 지우면 안 됨)
    await db
      .update(canvasArtifacts)
      .set({ deletedAt: new Date() })
      .where(and(eq(canvasArtifacts.sessionId, rows[0].sessionId), isNull(canvasArtifacts.deletedAt)));

    ok(res, { id: artifactId });
  }),
);

// POST /api/practice/me/artifacts/bulk-delete
//   Body: { artifact_ids: string[] }
//   Soft-deletes every snapshot of the learning sessions the requested
//   artifact ids belong to (autosave keeps writing new canvas_artifacts
//   rows per save, so deleting just the latest snapshot lets the prior
//   one bubble up — the user perceives the card as "not deleted"). Ids
//   the caller does not own are silently skipped.
practiceRouter.post(
  "/me/artifacts/bulk-delete",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as { artifact_ids?: unknown };
    if (!Array.isArray(body.artifact_ids)) {
      fail(res, 422, "validation_error", { message: "artifact_ids_must_be_array" });
      return;
    }
    const ids = Array.from(
      new Set(
        body.artifact_ids
          .filter((v): v is string => typeof v === "string")
          .filter((v) => UUID_RE.test(v)),
      ),
    ).slice(0, 100);
    if (ids.length === 0) {
      ok(res, { deleted_count: 0, deleted_ids: [] });
      return;
    }

    const owned = await db
      .select({
        artifactId: canvasArtifacts.id,
        sessionId: canvasArtifacts.sessionId,
      })
      .from(canvasArtifacts)
      .innerJoin(learningSessions, eq(canvasArtifacts.sessionId, learningSessions.id))
      .where(
        and(
          inArray(canvasArtifacts.id, ids),
          eq(learningSessions.userId, req.user!.id),
          isNull(learningSessions.deletedAt),
          isNull(canvasArtifacts.deletedAt),
        ),
      );
    const sessionIds = Array.from(new Set(owned.map((r) => r.sessionId)));
    if (sessionIds.length === 0) {
      ok(res, { deleted_count: 0, deleted_ids: [] });
      return;
    }

    const cascaded = await db
      .update(canvasArtifacts)
      .set({ deletedAt: new Date() })
      .where(
        and(
          inArray(canvasArtifacts.sessionId, sessionIds),
          isNull(canvasArtifacts.deletedAt),
        ),
      )
      .returning({ id: canvasArtifacts.id });

    ok(res, {
      deleted_count: cascaded.length,
      // Return the artifact ids the client *asked* about so it can prune
      // the dashboard grid without a refetch. Cascading siblings are
      // already invisible because the GET handler returns only the
      // latest non-deleted snapshot per session.
      deleted_ids: owned.map((r) => r.artifactId),
    });
  }),
);

// ── POST /api/practice/sessions ─────────────────────────────────────
practiceRouter.post(
  "/sessions",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const body = parseBody(StartSessionBody, req, res);
    if (!body) return;

    const lessonRow = await db
      .select({ id: lessons.id })
      .from(lessons)
      .innerJoin(modules, eq(modules.id, lessons.moduleId))
      .where(and(eq(lessons.id, body.lesson_id), isNull(lessons.deletedAt), isNull(modules.deletedAt)))
      .limit(1);
    if (lessonRow.length === 0) {
      fail(res, 404, "not_found", { message: "lesson_not_found" });
      return;
    }

    const inserted = await db
      .insert(learningSessions)
      .values({
        userId: req.user!.id,
        lessonId: body.lesson_id,
        mode: body.mode ?? "analyze",
      })
      .returning({
        id: learningSessions.id,
        userId: learningSessions.userId,
        lessonId: learningSessions.lessonId,
        mode: learningSessions.mode,
        startedAt: learningSessions.startedAt,
        endedAt: learningSessions.endedAt,
      });

    const dto = await toSessionDTO(inserted[0]!);
    ok(res, dto);
  }),
);

// ── GET /api/practice/sessions/:id ──────────────────────────────────
practiceRouter.get(
  "/sessions/:id",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
      fail(res, 422, "validation_error", { message: "invalid_session_id" });
      return;
    }

    const rows = await db
      .select({
        id: learningSessions.id,
        userId: learningSessions.userId,
        lessonId: learningSessions.lessonId,
        mode: learningSessions.mode,
        startedAt: learningSessions.startedAt,
        endedAt: learningSessions.endedAt,
      })
      .from(learningSessions)
      .where(and(eq(learningSessions.id, sessionId)))
      .limit(1);
    const row = rows[0];
    if (!row) {
      fail(res, 404, "not_found");
      return;
    }
    if (row.userId !== req.user!.id) {
      fail(res, 403, "forbidden");
      return;
    }
    ok(res, await toSessionDTO(row));
  }),
);

// ── Session-scoped artifact endpoints (v2 shell seam) ──────────────
//
// We keep the artifact-id-scoped routes (`PUT /artifacts/:id`,
// `GET /artifacts/:id`) as 501 placeholders for ALI-64's full canvas state
// machine. The session-scoped pair below covers the MVP loop: the client
// always saves the *latest* snapshot for a session, and reads it back on
// resume. Each PUT inserts a new canvas_artifacts row (snapshot history)
// rather than UPDATE-in-place so we never destroy prior states.

interface ArtifactDTO {
  id: string;
  session_id: string;
  mode: "free" | "constrained" | "guided";
  canvas_json: unknown;
  saved_at: string;
}

async function ensureOwnedSession(
  req: Request,
  res: Response,
  sessionId: string,
): Promise<{ id: string } | null> {
  if (!UUID_RE.test(sessionId)) {
    fail(res, 422, "validation_error", { message: "invalid_session_id" });
    return null;
  }
  const rows = await db
    .select({ id: learningSessions.id, userId: learningSessions.userId })
    .from(learningSessions)
    .where(eq(learningSessions.id, sessionId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    fail(res, 404, "not_found");
    return null;
  }
  if (row.userId !== req.user!.id) {
    fail(res, 403, "forbidden");
    return null;
  }
  return { id: row.id };
}

practiceRouter.get(
  "/sessions/:id/artifact",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const rawId = req.params.id;
    const owned = await ensureOwnedSession(
      req,
      res,
      typeof rawId === "string" ? rawId : "",
    );
    if (!owned) return;
    const rows = await db
      .select({
        id: canvasArtifacts.id,
        sessionId: canvasArtifacts.sessionId,
        mode: canvasArtifacts.mode,
        payload: canvasArtifacts.payload,
        savedAt: canvasArtifacts.savedAt,
      })
      .from(canvasArtifacts)
      .where(and(eq(canvasArtifacts.sessionId, owned.id), isNull(canvasArtifacts.deletedAt)))
      .orderBy(desc(canvasArtifacts.savedAt))
      .limit(1);
    const row = rows[0];
    if (!row) {
      ok(res, null);
      return;
    }
    const dto: ArtifactDTO = {
      id: row.id,
      session_id: row.sessionId,
      mode: row.mode,
      canvas_json: row.payload,
      saved_at: row.savedAt.toISOString(),
    };
    ok(res, dto);
  }),
);

practiceRouter.put(
  "/sessions/:id/artifact",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const rawId = req.params.id;
    const owned = await ensureOwnedSession(
      req,
      res,
      typeof rawId === "string" ? rawId : "",
    );
    if (!owned) return;
    const body = parseBody(PutArtifactBody, req, res);
    if (!body) return;

    const inserted = await db
      .insert(canvasArtifacts)
      .values({
        sessionId: owned.id,
        mode: "free",
        payload: body.canvas_json as Record<string, unknown>,
      })
      .returning({
        id: canvasArtifacts.id,
        sessionId: canvasArtifacts.sessionId,
        mode: canvasArtifacts.mode,
        payload: canvasArtifacts.payload,
        savedAt: canvasArtifacts.savedAt,
      });
    const row = inserted[0]!;
    const dto: ArtifactDTO = {
      id: row.id,
      session_id: row.sessionId,
      mode: row.mode,
      canvas_json: row.payload,
      saved_at: row.savedAt.toISOString(),
    };
    ok(res, dto);
  }),
);

// ── 501 placeholders (ALI-62 / ALI-63 / ALI-64 ownership) ───────────
const NOT_IMPL = { error: "not_implemented", owner: "ALI-62 / ALI-63 / ALI-64" };
practiceRouter.patch("/sessions/:id", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);
practiceRouter.post("/sessions/:id/submit", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);
practiceRouter.put("/artifacts/:id", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);
practiceRouter.get("/artifacts/:id", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);

// ── Canvas export — client-side PNG download (ALI-83) ────────────────
// Server-side PDF/R2 upload deferred. Client uses CognitiveMap SVG → PNG directly.
// This endpoint records the export intent for analytics only.
practiceRouter.post(
  "/artifacts/:id/export",
  userRateLimit,
  asyncHandler(async (req, res) => {
    const id = String(req.params["id"] ?? "");
    if (!UUID_RE.test(id)) { fail(res, 400, "validation_error"); return; }
    const format = (req.body as { format?: string })?.format ?? "png";
    if (!["png", "pdf", "svg"].includes(format)) {
      fail(res, 400, "validation_error", { message: "format must be png|pdf|svg" });
      return;
    }
    // R2 server-side upload deferred to post-beta.
    // Client handles PNG export directly from SVG (see CognitiveMap ↓ PNG button).
    ok(res, { format, client_download: true }, 200);
  }),
);
