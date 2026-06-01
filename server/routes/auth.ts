// Owner: ALI-67 방연동[MCP] — wires register/login/logout/me on top of
// Lucia session + argon2id password hashing per api-contracts §1.
//
// Schema drift reconciled in migration 0003_user_status_approval:
// users now carries status / must_change_password / approved_at /
// approved_by_id / rejected_reason. Role enum still uses "student"
// internally; DTO maps to the contracts vocabulary "user" | "admin".
// onboarded_at stays null until onboarding flow ships (cut per MVP §1).

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { lucia } from "../lib/lucia.js";
import { loadEnv } from "../lib/env.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { ok, fail } from "../lib/envelope.js";
import { parseBody, RegisterBody, LoginBody, ChangePasswordBody } from "../lib/validators.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rate-limit.js";

export const authRouter = Router();

export type DtoRole = "user" | "admin";
export type DtoStatus = "pending_approval" | "approved" | "rejected" | "suspended";

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: DtoRole;
  status: DtoStatus;
  must_change_password: boolean;
  onboarded_at: string | null;
  created_at: string;
}

function mapRole(internal: "student" | "admin"): DtoRole {
  return internal === "admin" ? "admin" : "user";
}

export function toUserDTO(row: {
  id: string;
  email: string;
  name: string;
  role: "student" | "admin";
  status: DtoStatus;
  mustChangePassword: boolean;
  createdAt: Date;
}): UserDTO {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: mapRole(row.role),
    status: row.status,
    must_change_password: row.mustChangePassword,
    onboarded_at: null,
    created_at: row.createdAt.toISOString(),
  };
}

async function issueSessionCookie(res: Response, userId: string): Promise<Date> {
  const session = await lucia.createSession(userId, {});
  res.appendHeader("Set-Cookie", lucia.createSessionCookie(session.id).serialize());
  return session.expiresAt;
}

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

// ── POST /api/auth/register ─────────────────────────────────────────
authRouter.post(
  "/register",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const body = parseBody(RegisterBody, req, res);
    if (!body) return;

    const email = body.email.toLowerCase();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) {
      fail(res, 409, "email_taken");
      return;
    }

    const passwordHash = await hashPassword(body.password);
    // Beta-open default: env.AUTO_APPROVE_STUDENTS="true" lets the new student
    // skip the pending_approval queue and start learning immediately. Flip to
    // "false" to force admin approval (e.g. paid B2B course).
    const autoApprove = loadEnv().AUTO_APPROVE_STUDENTS === "true";
    const approvedFields = autoApprove
      ? { status: "approved" as const, approvedAt: new Date() }
      : {};
    const inserted = await db
      .insert(users)
      .values({
        email,
        name: body.name,
        passwordHash,
        ...approvedFields,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        mustChangePassword: users.mustChangePassword,
        createdAt: users.createdAt,
      });

    const row = inserted[0]!;
    const expiresAt = await issueSessionCookie(res, row.id);

    ok(res, {
      user: toUserDTO(row),
      session_expires_at: expiresAt.toISOString(),
    });
  }),
);

// ── POST /api/auth/login ────────────────────────────────────────────
authRouter.post(
  "/login",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const body = parseBody(LoginBody, req, res);
    if (!body) return;

    const email = body.email.toLowerCase();
    const found = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        mustChangePassword: users.mustChangePassword,
        passwordHash: users.passwordHash,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const row = found[0];
    // Same response shape for "no user" and "wrong password" to avoid email enumeration.
    if (!row || !row.passwordHash) {
      fail(res, 401, "invalid_credentials");
      return;
    }
    const okPwd = await verifyPassword(row.passwordHash, body.password);
    if (!okPwd) {
      fail(res, 401, "invalid_credentials");
      return;
    }

    if (row.status === "rejected" || row.status === "suspended") {
      fail(res, 403, "account_blocked", { message: row.status });
      return;
    }

    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, row.id));

    const expiresAt = await issueSessionCookie(res, row.id);

    ok(res, {
      user: toUserDTO(row),
      session_expires_at: expiresAt.toISOString(),
    });
  }),
);

// ── POST /api/auth/logout ───────────────────────────────────────────
authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const sid = req.sessionId;
    if (sid) {
      await lucia.invalidateSession(sid);
    }
    res.appendHeader("Set-Cookie", lucia.createBlankSessionCookie().serialize());
    ok(res, { ok: true });
  }),
);

// ── GET /api/auth/me ────────────────────────────────────────────────
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const u = req.user!;
    const found = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        mustChangePassword: users.mustChangePassword,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, u.id))
      .limit(1);
    const row = found[0];
    if (!row) {
      fail(res, 401, "auth_required");
      return;
    }
    ok(res, toUserDTO(row));
  }),
);

// ── POST /api/auth/change-password ──────────────────────────────────
// Rotates argon2id hash, invalidates ALL existing sessions, issues a
// fresh session cookie for the active client per api-contracts §1-5.
authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = parseBody(ChangePasswordBody, req, res);
    if (!body) return;

    const u = req.user!;
    const found = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, u.id))
      .limit(1);

    const row = found[0];
    if (!row || !row.passwordHash) {
      fail(res, 401, "invalid_credentials");
      return;
    }
    const okCurrent = await verifyPassword(row.passwordHash, body.current_password);
    if (!okCurrent) {
      fail(res, 401, "invalid_credentials");
      return;
    }

    const newHash = await hashPassword(body.new_password);
    await db
      .update(users)
      .set({ passwordHash: newHash, mustChangePassword: false })
      .where(eq(users.id, row.id));

    // Invalidate every existing session (including the one in this request)
    // then issue a brand-new session cookie for the active client so the
    // user doesn't get logged out on success.
    await lucia.invalidateUserSessions(row.id);
    await issueSessionCookie(res, row.id);

    ok(res, { ok: true });
  }),
);

// ── 503 mvp_cut stubs (no infra) ────────────────────────────────────
const NOT_AVAIL = { error: "service_unavailable", reason: "mvp_cut" };
authRouter.get("/oauth/google", (_req, res) => res.status(503).json(NOT_AVAIL));
authRouter.get("/oauth/google/callback", (_req, res) =>
  res.status(503).json(NOT_AVAIL),
);
authRouter.post("/email/verify", (_req, res) => res.status(503).json(NOT_AVAIL));
authRouter.post("/password/reset", (_req, res) =>
  res.status(503).json(NOT_AVAIL),
);
