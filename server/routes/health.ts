// Owner: ALI-67 방연동[MCP] — api-contracts §7.
//
// §7-1 /healthz — liveness only (no DB). Process is up = ok.
// §7-2 /readyz  — readiness: process up AND DB reachable. 503 on DB miss.

import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { loadEnv, hasFeature } from "../lib/env.js";

export const healthRouter = Router();

healthRouter.get("/healthz", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

healthRouter.get("/readyz", async (_req, res) => {
  const env = loadEnv();
  const features = {
    anthropic: true,
    openai: hasFeature("openai"),
    gemini: hasFeature("gemini"),
    resend: hasFeature("resend"),
    toss: hasFeature("toss"),
    r2: hasFeature("r2"),
    push: hasFeature("push"),
  };

  try {
    await db.execute(sql`SELECT 1`);
  } catch (err) {
    res.status(503).json({
      ok: false,
      env: env.NODE_ENV,
      features,
      error: "db_unreachable",
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  res.json({ ok: true, env: env.NODE_ENV, features });
});
