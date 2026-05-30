import { Router } from "express";
import { hasFeature } from "../lib/env.js";

// Owner: ALI-67 방연동[MCP] (Toss HMAC verify + idempotent dedupe)
// MVP cut: 503 until billing activates.

export const webhookRouter = Router();

webhookRouter.post("/toss", (_req, res) => {
  if (!hasFeature("toss")) {
    res.status(503).json({ error: "service_unavailable", reason: "mvp_cut" });
    return;
  }
  res.status(501).json({ error: "not_implemented", owner: "ALI-67" });
});

webhookRouter.post("/resend", (_req, res) => {
  if (!hasFeature("resend")) {
    res.status(503).json({ error: "service_unavailable", reason: "mvp_cut" });
    return;
  }
  res.status(501).json({ error: "not_implemented", owner: "ALI-67" });
});
