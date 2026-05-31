import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";

// Owner: ALI-62 차곡담[자료] (User.approved + admin queries)
//        + ALI-71 하검수[검수] (smoke: admin login → must_change_password → approve flow)
// MVP scope: approve-only. User mgmt extras (suspend/role-change/audit) → MVP 이후.

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const NOT_IMPL = { error: "not_implemented", owner: "ALI-62 / ALI-71" };

adminRouter.get("/users/pending", (_req, res) => res.status(501).json(NOT_IMPL));
adminRouter.post("/users/:id/approve", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);
adminRouter.post("/users/:id/reject", (_req, res) =>
  res.status(501).json(NOT_IMPL),
);

const NOT_AVAIL = { error: "service_unavailable", reason: "mvp_cut" };
adminRouter.get("/users", (_req, res) => res.status(503).json(NOT_AVAIL));
adminRouter.post("/users/:id/suspend", (_req, res) =>
  res.status(503).json(NOT_AVAIL),
);
adminRouter.get("/api-usage", (_req, res) => res.status(503).json(NOT_AVAIL));
