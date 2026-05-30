import { Router } from "express";

// Owner: ALI-62 차곡담[자료] (User/Session schema) + ALI-67 방연동[MCP] (argon2 + Lucia wiring)
// Day-1: register/login/logout + must_change_password gate.
// Day-2+: OAuth (Google), email verify, password reset via Resend.

export const authRouter = Router();

const NOT_IMPL = {
  error: "not_implemented",
  owner: "ALI-62 / ALI-67",
  day1: true,
};

authRouter.post("/register", (_req, res) => res.status(501).json(NOT_IMPL));
authRouter.post("/login", (_req, res) => res.status(501).json(NOT_IMPL));
authRouter.post("/logout", (_req, res) => res.status(501).json(NOT_IMPL));
authRouter.get("/me", (_req, res) => res.status(501).json(NOT_IMPL));
authRouter.post("/change-password", (_req, res) => res.status(501).json(NOT_IMPL));

// Day-2+ stubs (503 — infrastructure pending)
const NOT_AVAIL = { error: "service_unavailable", reason: "day1_cut" };
authRouter.get("/oauth/google", (_req, res) => res.status(503).json(NOT_AVAIL));
authRouter.get("/oauth/google/callback", (_req, res) =>
  res.status(503).json(NOT_AVAIL),
);
authRouter.post("/email/verify", (_req, res) => res.status(503).json(NOT_AVAIL));
authRouter.post("/password/reset", (_req, res) =>
  res.status(503).json(NOT_AVAIL),
);
