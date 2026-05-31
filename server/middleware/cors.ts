// Owner: ALI-67 방연동[MCP] — minimal CORS for cookie-based auth.
//
// Why hand-rolled (vs `cors` package): credentials + dynamic origin echo is
// the only behavior we need, and rolling it keeps the dependency tree thin
// and the allowlist enforcement obvious at review time.
//
// Allowlist source: CORS_ALLOWED_ORIGINS (comma-separated). Dev default is
// localhost:5173 (Vite). Requests from unlisted origins get no ACAO header —
// the browser will block the response. Same-origin and curl requests pass
// through unchanged (no Origin header → no CORS headers needed).
//
// Credentials are enabled (Set-Cookie must work across origins), which means
// the spec forbids `*` as origin — we always echo the matched origin verbatim.

import type { Request, Response, NextFunction } from "express";
import { loadEnv } from "../lib/env.js";

const DEV_DEFAULT_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

function parseAllowlist(): Set<string> {
  const env = loadEnv();
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (raw) {
    return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  }
  if (env.NODE_ENV !== "production") {
    return new Set(DEV_DEFAULT_ORIGINS);
  }
  return new Set();
}

let cachedAllowlist: Set<string> | null = null;
function allowlist(): Set<string> {
  if (!cachedAllowlist) cachedAllowlist = parseAllowlist();
  return cachedAllowlist;
}

const ALLOWED_METHODS = "GET,POST,PATCH,PUT,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Accept";

export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const origin = req.headers.origin;
  if (typeof origin === "string" && allowlist().has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
    res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
    res.setHeader("Access-Control-Max-Age", "600");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}

// Test seam.
export function _resetCorsAllowlist(): void {
  cachedAllowlist = null;
}
