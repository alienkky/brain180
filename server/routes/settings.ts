import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { ok } from "../lib/envelope.js";
import { getBrandingSettings } from "../lib/branding.js";

export const settingsRouter = Router();

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

settingsRouter.get(
  "/branding",
  asyncHandler(async (_req, res) => {
    ok(res, await getBrandingSettings());
  }),
);
