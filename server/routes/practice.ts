import { Router } from "express";

// Owner: ALI-62 차곡담[자료] (LearningSession/CanvasArtifact schema)
//        + ALI-63 류한길[흐름] (state machine: draft → submitted → reviewed)
//        + ALI-64 백그림[그림] (canvas viewport contract)
// MVP mode: free-form canvas only (n262/n263/n274 cut).

export const practiceRouter = Router();

const NOT_IMPL = { error: "not_implemented", owner: "ALI-62 / ALI-63 / ALI-64" };

practiceRouter.post("/sessions", (_req, res) => res.status(501).json(NOT_IMPL));
practiceRouter.get("/sessions/:id", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);
practiceRouter.patch("/sessions/:id", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);
practiceRouter.post("/sessions/:id/submit", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);

practiceRouter.put("/artifacts/:id", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);
practiceRouter.get("/artifacts/:id", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);

const NOT_AVAIL = { error: "service_unavailable", reason: "mvp_cut" };
practiceRouter.post("/artifacts/:id/export", (_req, res) =>
  res.status(503).json(NOT_AVAIL),
);
