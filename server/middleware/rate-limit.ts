// In-memory sliding window rate limit per api-contracts.md §0-5.
//
// MVP tiers:
//   auth   — IP per minute (20)
//   tutor  — user per minute (30) + per day (200)
//   user   — user per minute (60)
//
// MVP cut: single-instance Railway only. Production sharding moves to Redis.
//
// Response headers (IETF draft-ietf-httpapi-ratelimit-headers):
//   RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset — set on every
//   pass-through and on 429. Tutor reports the tightest of minute/day so the
//   client can surface whichever boundary is closer.

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

interface LimitStatus {
  limit: number;
  remaining: number;
  resetSec: number;
}

interface CheckResult {
  ok: boolean;
  status: LimitStatus;
  retryAfterSec: number;
}

function check(key: string, spec: LimitSpec): CheckResult {
  const now = Date.now();
  const b = bucket(key);
  b.minute = prune(b.minute, MIN_MS, now);
  if (spec.perDay !== undefined) {
    b.day = prune(b.day, DAY_MS, now);
  }

  const minuteRemaining = spec.perMinute - b.minute.length;
  const minuteOldest = b.minute[0];
  const minuteResetSec = minuteOldest
    ? Math.max(1, Math.ceil((MIN_MS - (now - minuteOldest)) / 1000))
    : Math.ceil(MIN_MS / 1000);

  let status: LimitStatus = {
    limit: spec.perMinute,
    remaining: Math.max(0, minuteRemaining),
    resetSec: minuteResetSec,
  };

  if (spec.perDay !== undefined) {
    const dayRemaining = spec.perDay - b.day.length;
    const dayOldest = b.day[0];
    const dayResetSec = dayOldest
      ? Math.max(1, Math.ceil((DAY_MS - (now - dayOldest)) / 1000))
      : Math.ceil(DAY_MS / 1000);
    if (dayRemaining < status.remaining) {
      status = { limit: spec.perDay, remaining: Math.max(0, dayRemaining), resetSec: dayResetSec };
    }
  }

  if (b.minute.length >= spec.perMinute) {
    return { ok: false, status, retryAfterSec: minuteResetSec };
  }
  if (spec.perDay !== undefined && b.day.length >= spec.perDay) {
    return { ok: false, status, retryAfterSec: status.resetSec };
  }

  b.minute.push(now);
  if (spec.perDay !== undefined) b.day.push(now);
  // Decrement remaining now that this request is admitted so headers reflect
  // post-admission state (matches what clients expect for "tokens left").
  status = { ...status, remaining: Math.max(0, status.remaining - 1) };
  return { ok: true, status, retryAfterSec: 0 };
}

function applyHeaders(res: Response, status: LimitStatus): void {
  res.setHeader("RateLimit-Limit", String(status.limit));
  res.setHeader("RateLimit-Remaining", String(status.remaining));
  res.setHeader("RateLimit-Reset", String(status.resetSec));
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
  applyHeaders(res, r.status);
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
  applyHeaders(res, r.status);
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
  applyHeaders(res, r.status);
  if (r.ok) return next();
  send429(res, r.retryAfterSec);
}

// Test seam — production code never calls.
export function _resetRateLimitStore(): void {
  store.clear();
}
