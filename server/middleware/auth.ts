// Lucia v3 session middleware — owner: ALI-67 방연동[MCP].
// Reads SESSION_COOKIE_NAME (default b180_session), validates via Lucia,
// attaches req.user / req.sessionId. Refreshes cookie when fresh; blanks on null.

import type { Request, Response, NextFunction } from "express";
import { lucia } from "../lib/lucia.js";

export type UserStatus = "pending_approval" | "approved" | "rejected" | "suspended";

declare global {
  namespace Express {
    interface Request {
      user?:
        | {
            id: string;
            email: string;
            name: string;
            role: "student" | "admin";
            status: UserStatus;
            mustChangePassword: boolean;
          }
        | undefined;
      sessionId?: string | undefined;
    }
  }
}

export async function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const cookieHeader = req.headers.cookie ?? "";
  const sessionId = lucia.readSessionCookie(cookieHeader);

  if (!sessionId) {
    next();
    return;
  }

  try {
    const { session, user } = await lucia.validateSession(sessionId);

    if (session && session.fresh) {
      res.appendHeader("Set-Cookie", lucia.createSessionCookie(session.id).serialize());
    }
    if (!session) {
      res.appendHeader("Set-Cookie", lucia.createBlankSessionCookie().serialize());
    }

    if (user && session) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
      };
      req.sessionId = session.id;
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "auth_required" });
    return;
  }
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "auth_required" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "admin_required" });
    return;
  }
  next();
}

// Forces password rotation before any feature route fires.
// Mount AFTER requireAuth. Apply on routes that should not be reachable
// while mustChangePassword=true. Exempt: change-password, logout, me.
export function requirePasswordFresh(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "auth_required" });
    return;
  }
  if (req.user.mustChangePassword) {
    res.status(403).json({ error: "password_change_required" });
    return;
  }
  next();
}

// Blocks pending_approval / rejected / suspended from feature routes.
// Mount AFTER requireAuth + requirePasswordFresh.
// Exempt: change-password, logout, me (same as password gate).
export function requireApprovedUser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "auth_required" });
    return;
  }
  if (req.user.status !== "approved") {
    res.status(403).json({
      error: "account_not_approved",
      message: req.user.status,
    });
    return;
  }
  next();
}
