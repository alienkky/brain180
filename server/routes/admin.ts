// Owner: ALI-67 방연동[MCP] — wires §5 Admin per api-contracts.
//        Approval audit columns landed via migration 0003.
// MVP scope: list pending / approve / reject. Suspend + audit + content
// management stay 503 mvp_cut.

import { randomBytes } from "node:crypto";
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { and, eq, isNull, asc } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { ok, fail } from "../lib/envelope.js";
import { hashPassword } from "../lib/password.js";
import { lucia } from "../lib/lucia.js";
import { parseBody, RejectUserBody } from "../lib/validators.js";
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

// ── 503 mvp_cut stubs ───────────────────────────────────────────────
const NOT_AVAIL = { error: "service_unavailable", reason: "mvp_cut" };
adminRouter.get("/users", (_req, res) => res.status(503).json(NOT_AVAIL));
adminRouter.post("/users/:id/suspend", (_req, res) =>
  res.status(503).json(NOT_AVAIL),
);
adminRouter.get("/api-usage", (_req, res) => res.status(503).json(NOT_AVAIL));
