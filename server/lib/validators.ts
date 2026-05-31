// Zod validators for v2 API contracts (docs/modules/api-contracts.md)
// Single source of truth for request validation. Routes import these.
// Owner: 연다리 [통합설계]. Implementation seam: ALI-67.

import { z } from "zod";

// ─── Primitives ──────────────────────────────────────────────────────

export const Uuid = z.string().uuid();
export const Iso = z.string().datetime({ offset: true });

export const Email = z.string().email().max(254);

export const Password = z
  .string()
  .min(12, "weak_password")
  .max(128, "weak_password")
  .refine((s) => {
    let cats = 0;
    if (/[A-Za-z]/.test(s)) cats++;
    if (/[0-9]/.test(s)) cats++;
    if (/[^A-Za-z0-9]/.test(s)) cats++;
    return cats >= 2;
  }, "weak_password");

export const Name = z.string().min(1).max(40);

export const Axis = z.object({
  cognition: z.number().int().min(1).max(5),
  value: z.number().int().min(1).max(5),
  time: z.number().int().min(1).max(5),
});

// ─── Auth ────────────────────────────────────────────────────────────

export const RegisterBody = z.object({
  email: Email,
  password: Password,
  name: Name,
});

export const LoginBody = z.object({
  email: Email,
  password: z.string().min(1).max(128),
});

export const ChangePasswordBody = z.object({
  current_password: z.string().min(1).max(128),
  new_password: Password,
});

// ─── Practice ────────────────────────────────────────────────────────

export const SessionMode = z.enum(["analyze", "reverse", "practice"]);

export const StartSessionBody = z.object({
  lesson_id: Uuid,
  mode: SessionMode.optional(),
});

export const PatchSessionBody = z.object({
  self_evaluation: Axis.extend({ note: z.string().max(2000) }).optional(),
});

// CanvasJSON v1 (free-form mode — MVP)
export const CanvasCite = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  quote: z.string().min(1).max(400),
});

export const CanvasNode = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(["concept", "anchor", "bridge", "branch"]),
  label: z.string().min(1).max(120),
  x: z.number().finite(),
  y: z.number().finite(),
  axis_tag: z.enum(["cognition", "value", "time"]).optional(),
  cite: CanvasCite.optional(),
});

export const CanvasEdge = z.object({
  id: z.string().min(1).max(64),
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  relation: z.enum(["causes", "supports", "contrasts", "transforms", "contains"]),
  temporal_order: z.number().int().min(0).max(10_000).optional(),
});

export const CanvasJson = z.object({
  version: z.literal(1),
  viewport: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    zoom: z.number().positive().finite(),
  }),
  nodes: z.array(CanvasNode).max(500),
  edges: z.array(CanvasEdge).max(1000),
});

export const PutArtifactBody = z.object({
  canvas_json: CanvasJson,
  client_revision: z.number().int().min(0),
});

// ─── Tutor ───────────────────────────────────────────────────────────

export const TutorChatBody = z.object({
  session_id: Uuid,
  lesson_id: Uuid,
  message: z.string().min(1).max(4000),
  canvas_snapshot: CanvasJson.optional(),
});

export const RateMessageBody = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
});

// ─── Admin ───────────────────────────────────────────────────────────

export const RejectUserBody = z.object({
  reason: z.string().max(500).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────

import type { Request, Response } from "express";
import type { ZodTypeAny, z as ZodNamespace } from "zod";

export function parseBody<S extends ZodTypeAny>(
  schema: S,
  req: Request,
  res: Response,
): ZodNamespace.infer<S> | null {
  const r = schema.safeParse(req.body);
  if (!r.success) {
    const firstMsg = r.error.issues[0]?.message ?? "validation_error";
    const code = firstMsg === "weak_password" ? "weak_password" : "validation_error";
    res.status(422).json({
      error: code,
      details: r.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
    return null;
  }
  return r.data;
}
