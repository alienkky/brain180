// Response envelope helpers per api-contracts.md §0-1.
// Routes import ok() / fail() to enforce success/error shape.

import type { Response } from "express";
import { randomUUID } from "node:crypto";

export interface SuccessMeta {
  ts: string;
  request_id: string;
}

function meta(): SuccessMeta {
  return { ts: new Date().toISOString(), request_id: randomUUID() };
}

export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ data, meta: meta() });
}

export function created<T>(res: Response, data: T): Response {
  return ok(res, data, 201);
}

export interface FailOptions {
  message?: string;
  details?: unknown;
}

export function fail(
  res: Response,
  status: number,
  code: string,
  opts: FailOptions = {},
): Response {
  const body: Record<string, unknown> = { error: code };
  if (opts.message !== undefined) body.message = opts.message;
  if (opts.details !== undefined) body.details = opts.details;
  return res.status(status).json(body);
}
