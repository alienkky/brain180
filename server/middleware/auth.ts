import type { Request, Response, NextFunction } from "express";

// Lucia v3 session middleware — owner: ALI-62 차곡담[자료] (schema) + ALI-67 방연동[MCP] (wire-up)
// Day-1: pass-through. ALI-62 lands users/sessions schema, then this reads
// session cookie (b180_session) → validates via Lucia → attaches req.user.

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: "admin" | "user" } | undefined;
      sessionId?: string | undefined;
    }
  }
}

export function sessionMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next();
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
