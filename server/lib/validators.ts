// Zod validators for v2 API contracts (docs/modules/api-contracts.md)
// Single source of truth for request validation. Routes import these.
// Owner: 연다리 [통합설계]. Implementation seam: ALI-67.

import { z } from "zod";

// ─── Primitives ──────────────────────────────────────────────────────

export const Uuid = z.string().uuid();
export const Iso = z.string().datetime({ offset: true });

export const Email = z.string().email().max(254);

// Beta open: 8자 + 2종 (영문/숫자/특수문자 중 2종 이상). 일반 학생 진입
// 마찰을 낮추기 위해 12자에서 8자로 완화. 결제 도입 시점에서 12자로 회귀 검토.
export const Password = z
  .string()
  .min(8, "weak_password")
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

export const VerifyEmailBody = z.object({
  token: z.string().min(20).max(255),
});

export const ForgotPasswordBody = z.object({
  email: Email,
});

export const ResetPasswordBody = z.object({
  token: z.string().min(20).max(255),
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
  // "other" = v3 자유 관계 (라벨로 의미 전달)
  relation: z.enum(["causes", "supports", "contrasts", "transforms", "contains", "other"]),
  label: z.string().max(120).optional(),
  temporal_order: z.number().int().min(0).max(10_000).optional(),
});

export const CanvasPath = z.object({
  color: z.string().min(1).max(40),
  width: z.number().positive().finite().max(100),
  points: z
    .array(
      z.object({
        x: z.number().finite(),
        y: z.number().finite(),
      }),
    )
    .max(10_000),
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
  paths: z.array(CanvasPath).max(1000).optional(),
  // v3 1부 블록 추출 보존용 — 검증은 느슨하게, payload 에 그대로 저장/복원
  blocks: z.array(z.record(z.unknown())).max(500).optional(),
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
  canvas_mode: z.enum(["free", "constrained", "guided"]).optional(),
  // base64-encoded PNG from FreeDrawCanvas (自由형 mode vision)
  canvas_image_base64: z.string().max(5_000_000).optional(),
});

export const RateTutorBody = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().trim().max(500).optional(),
});

export const RateMessageBody = RateTutorBody;

// ─── Lesson Feedback (v1 FeedbackPanel 부활) ─────────────────────────

export const LessonFeedbackBody = z.object({
  display_name: z.string().trim().max(80).default(""),
  content: z.string().trim().min(1).max(2000),
  rating: z.number().int().min(0).max(5).default(0),
});

export const AdminLessonFeedbackUpdateBody = z
  .object({
    hidden: z.boolean().optional(),
    deleted: z.boolean().optional(),
    admin_reply: z.string().trim().max(1000).nullable().optional(),
  })
  .refine(
    (body) =>
      body.hidden !== undefined ||
      body.deleted !== undefined ||
      body.admin_reply !== undefined,
    { message: "empty_update" },
  );

// ─── Admin ───────────────────────────────────────────────────────────

export const RejectUserBody = z.object({
  reason: z.string().max(500).optional(),
});

export const AdminUserUpdateBody = z
  .object({
    role: z.enum(["student", "admin"]).optional(),
    status: z
      .enum(["pending_approval", "approved", "rejected", "suspended"])
      .optional(),
  })
  .refine((body) => body.role !== undefined || body.status !== undefined, {
    message: "empty_update",
  });

const ModuleAxis = z.enum(["cognitive", "value", "time"]);
const AxisFocus = z
  .object({
    cognition: z.number().int().min(0).max(5).optional(),
    value: z.number().int().min(0).max(5).optional(),
    time: z.number().int().min(0).max(5).optional(),
  })
  .partial()
  .optional();

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

export const AdminModuleCreateBody = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(80).regex(SLUG_RE, "invalid_slug"),
  axis: ModuleAxis,
  field: z.string().min(1).max(40),
  order: z.number().int().min(0).max(10_000),
  difficulty: z.number().int().min(1).max(5),
  description: z.string().max(2000).optional(),
  axis_focus: AxisFocus,
});

export const AdminModuleUpdateBody = AdminModuleCreateBody.partial();

export const AdminLessonCreateBody = z.object({
  module_id: Uuid,
  title: z.string().min(1).max(200),
  order: z.number().int().min(0).max(10_000),
  body: z.string().min(1).max(20_000),
  author: z.string().max(120).optional(),
  source: z.string().max(200).optional(),
  language: z.enum(["ko", "en"]).optional(),
  objectives: z.array(z.string().min(1).max(200)).max(10).optional(),
  cognitive_structure_analysis: z.string().max(10_000).optional(),
  learner_questions: z.string().max(10_000).optional(),
  tutor_reference_notes: z.string().max(10_000).optional(),
  axis_focus: AxisFocus,
});

export const AdminLessonUpdateBody = z.object({
  title: z.string().min(1).max(200).optional(),
  order: z.number().int().min(0).max(10_000).optional(),
  body: z.string().min(1).max(20_000).optional(),
  author: z.string().max(120).optional(),
  source: z.string().max(200).optional(),
  language: z.enum(["ko", "en"]).optional(),
  objectives: z.array(z.string().min(1).max(200)).max(10).optional(),
  cognitive_structure_analysis: z.string().max(10_000).optional(),
  learner_questions: z.string().max(10_000).optional(),
  tutor_reference_notes: z.string().max(10_000).optional(),
  axis_focus: AxisFocus,
});

// ─── Helpers ─────────────────────────────────────────────────────────

const LogoDataUrl = z
  .string()
  .max(1_000_000)
  .refine(
    (value) => /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value),
    "invalid_logo_image",
  );

export const BrandingSettingsBody = z.object({
  logo_data_url: LogoDataUrl.nullable(),
});

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
