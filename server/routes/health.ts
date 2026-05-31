import { Router } from "express";
import { loadEnv, hasFeature } from "../lib/env.js";

export const healthRouter = Router();

healthRouter.get("/healthz", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

healthRouter.get("/readyz", (_req, res) => {
  const env = loadEnv();
  res.json({
    ok: true,
    env: env.NODE_ENV,
    features: {
      anthropic: true,
      openai: hasFeature("openai"),
      gemini: hasFeature("gemini"),
      resend: hasFeature("resend"),
      toss: hasFeature("toss"),
      r2: hasFeature("r2"),
      push: hasFeature("push"),
    },
  });
});
