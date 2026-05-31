// In-memory sliding window rate limit per api-contracts.md §0-5.
//
// MVP tiers:
//   auth   — IP per minute (20)
//   tutor  — user per minute (30) + per day (200)
//   user   — user per minute (60)
//
// MVP cut: single-instance Railway only. Production sharding moves to Redis.

import type { Request, Response, NextFunction } from "express";
import { fail } from "../lib/envelope.js";

interface Bucket {
  minute: number[];
  day: number[];
}

const store = new Map<string, Bucket>();

const MIN_MS = 60_000;
const DAY_MS = 86_400_000;

function prune(timestamps: number[], windowMs: number, now: number): number[] {
  const cutoff = now - windowMs;
  let i = 0;
  while (i < timestamps.length && timestamps[i]! < cutoff) i++;
  return i === 0 ? timestamps : timestamps.slice(i);
}

function bucket(key: string): Bucket {
  let b = store.get(key);
  if (!b) {
    b = { minute: [], day: [] };
    store.set(key, b);
  }
  return b;
}

interface LimitSpec {
  perMinute: number;
  perDay?: number;
}

function check(key: string, spec: LimitSpec): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const b = bucket(key);
  b.minute = prune(b.minute, MIN_MS, now);
  if (spec.perDay !== undefined) {
    b.day = prune(b.day, DAY_MS, now);
  }

  if (b.minute.length >= spec.perMinute) {
    const oldest = b.minute[0]!;
    return { ok: false, retryAfterSec: Math.ceil((MIN_MS - (now - oldest)) / 1000) };
  }
  if (spec.perDay !== undefined && b.day.length >= spec.perDay) {
    const oldest = b.day[0]!;
    return { ok: false, retryAfterSec: Math.ceil((DAY_MS - (now - oldest)) / 1000) };
  }

  b.minute.push(now);
  if (spec.perDay !== undefined) b.day.push(now);
  return { ok: true };
}

function send429(res: Response, retryAfterSec: number): void {
  res.setHeader("Retry-After", String(retryAfterSec));
  fail(res, 429, "rate_limited");
}

function ipKey(req: Request): string {
  return `ip:${req.ip ?? "unknown"}`;
}

function userKey(req: Request): string | null {
  return req.user ? `user:${req.user.id}` : null;
}

export function authRateLimit(req: Request, res: Response, next: NextFunction): void {
  const r = check(`auth:${ipKey(req)}`, { perMinute: 20 });
  if (r.ok) return next();
  send429(res, r.retryAfterSec);
}

export function tutorRateLimit(req: Request, res: Response, next: NextFunction): void {
  const uk = userKey(req);
  if (!uk) {
    fail(res, 401, "auth_required");
    return;
  }
  const r = check(`tutor:${uk}`, { perMinute: 30, perDay: 200 });
  if (r.ok) return next();
  send429(res, r.retryAfterSec);
}

export function userRateLimit(req: Request, res: Response, next: NextFunction): void {
  const uk = userKey(req);
  if (!uk) {
    fail(res, 401, "auth_required");
    return;
  }
  const r = check(`user:${uk}`, { perMinute: 60 });
  if (r.ok) return next();
  send429(res, r.retryAfterSec);
}

// Test seam — production code never calls.
export function _resetRateLimitStore(): void {
  store.clear();
}
