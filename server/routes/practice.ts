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
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { canvasArtifacts, learningSessions, lessons } from "../db/schema.js";
import { ok, fail } from "../lib/envelope.js";
import { parseBody, StartSessionBody } from "../lib/validators.js";
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
    .where(eq(canvasArtifacts.sessionId, sessionId))
    .orderBy(desc(canvasArtifacts.savedAt))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function toSessionDTO(row: {
  id: string;
  userId: string;
  lessonId: string;
  startedAt: Date;
  endedAt: Date | null;
}): Promise<LearningSessionDTO> {
  const artifactId = await latestArtifactId(row.id);
  return {
    id: row.id,
    user_id: row.userId,
    lesson_id: row.lessonId,
    status: row.endedAt ? "submitted" : "draft",
    artifact_id: artifactId,
    self_evaluation: null,
    started_at: row.startedAt.toISOString(),
    submitted_at: row.endedAt ? row.endedAt.toISOString() : null,
  };
}

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
      .where(eq(lessons.id, body.lesson_id))
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
        mode: "analyze",
      })
      .returning({
        id: learningSessions.id,
        userId: learningSessions.userId,
        lessonId: learningSessions.lessonId,
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
      fail(res, 400, "validation_error", { message: "invalid_session_id" });
      return;
    }

    const rows = await db
      .select({
        id: learningSessions.id,
        userId: learningSessions.userId,
        lessonId: learningSessions.lessonId,
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

// ── 503 mvp_cut ─────────────────────────────────────────────────────
const NOT_AVAIL = { error: "service_unavailable", reason: "mvp_cut" };
practiceRouter.post("/artifacts/:id/export", (_req, res) =>
  res.status(503).json(NOT_AVAIL),
);
