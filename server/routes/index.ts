import { Router } from "express";
import { healthRouter } from "./health.js";
import { authRouter } from "./auth.js";
import { libraryRouter } from "./library.js";
import { practiceRouter } from "./practice.js";
import { tutorRouter } from "./tutor.js";
import { robotRouter } from "./robot.js";
import { adminRouter } from "./admin.js";
import { billingRouter } from "./billing.js";
import { webhookRouter } from "./webhooks.js";
import { settingsRouter } from "./settings.js";

export function mountRoutes(): Router {
  const r = Router();
  r.use("/", healthRouter);
  r.use("/api/auth", authRouter);
  r.use("/api/library", libraryRouter);
  r.use("/api/practice", practiceRouter);
  r.use("/api/tutor", tutorRouter);
  r.use("/api/robot", robotRouter);
  r.use("/api/settings", settingsRouter);
  r.use("/api/admin", adminRouter);
  r.use("/api/billing", billingRouter);
  r.use("/webhooks", webhookRouter);
  return r;
}
