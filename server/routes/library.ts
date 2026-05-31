import { Router } from "express";

// Owner: ALI-62 차곡담[자료] (Module/Lesson/TextExcerpt schema + 3 seed rows)
// MVP seeds: little-prince-fox (가치 ★★★), popper-positivism (인지 ★★★),
//             tao-te-ching-01 (시간 ★★★ + 인지 ★★★)

export const libraryRouter = Router();

const NOT_IMPL = { error: "not_implemented", owner: "ALI-62" };

libraryRouter.get("/modules", (_req, res) => res.status(501).json(NOT_IMPL));
libraryRouter.get("/modules/:id", (_req, res) => res.status(501).json(NOT_IMPL));
libraryRouter.get("/modules/:id/lessons", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);
libraryRouter.get("/lessons/:id", (_req, res) => res.status(501).json(NOT_IMPL));
libraryRouter.get("/texts/:id", (_req, res) => res.status(501).json(NOT_IMPL));
