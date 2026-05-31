// Owner: ALI-67 방연동[MCP] — wires register/login/logout/me on top of
// Lucia session + argon2id password hashing per api-contracts §1.
//
// Schema drift note: api-contracts §1-6 declares UserDTO.role as
// "user" | "admin" and includes status / must_change_password /
// onboarded_at; the landed ALI-62 schema models role as
// "student" | "admin" with no status / must_change_password column.
// DTO emits schema truth (role: "student"|"admin") and synthesizes
// status="approved", must_change_password=false, onboarded_at=null
// to keep the frontend contract honored under MVP simulation stage.
// Reconciliation handed to ALI-62 follow-up.

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { lucia } from "../lib/lucia.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { ok, fail } from "../lib/envelope.js";
import { parseBody, RegisterBody, LoginBody, ChangePasswordBody } from "../lib/validators.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rate-limit.js";

export const authRouter = Router();

interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: "student" | "admin";
  status: "approved";
  must_change_password: false;
  onboarded_at: null;
  created_at: string;
}

function toUserDTO(row: {
  id: string;
  email: string;
  name: string;
  role: "student" | "admin";
  createdAt: Date;
}): UserDTO {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: "approved",
    must_change_password: false,
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
    const inserted = await db
      .insert(users)
      .values({
        email,
        name: body.name,
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
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
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, row.id));

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
