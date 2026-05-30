import { Router } from "express";

// Owner: ALI-66 남말씨[글말] (system prompts) + ALI-67 방연동[MCP] (Anthropic wrapper)
// Day-1: basic tutor chat + 5-star rating. Streaming + caching → Day-2+.

export const tutorRouter = Router();

const NOT_IMPL = { error: "not_implemented", owner: "ALI-66 / ALI-67" };

tutorRouter.post("/chat", (_req, res) => res.status(501).json(NOT_IMPL));
tutorRouter.get("/sessions/:id/messages", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);
tutorRouter.post("/messages/:id/rate", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);
