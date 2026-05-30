import type { Request, Response, NextFunction } from "express";
import { loadEnv } from "../lib/env.js";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "not_found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const env = loadEnv();
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }
  const message =
    env.NODE_ENV === "production"
      ? "internal_error"
      : err instanceof Error
        ? err.message
        : String(err);
  console.error("[error]", err);
  res.status(500).json({ error: "internal_error", message });
}
