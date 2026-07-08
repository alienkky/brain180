// Owner: 연다리 [통합설계].
// Minimal fetch wrapper for the v2 browser shell. Uses Vite's /api proxy
// (vite.config.ts) so cookies are same-origin against the Express server
// running on :3001. All calls include credentials so Lucia's session
// cookie round-trips automatically.

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  status: "pending_approval" | "approved" | "rejected" | "suspended";
  must_change_password: boolean;
  created_at: string;
}

export type AdminUserRole = "user" | "admin";
export type AdminUserStatus = UserDto["status"];

export interface AdminUserUpdateInput {
  role?: AdminUserRole;
  status?: AdminUserStatus;
}

export interface LoginData {
  user: UserDto;
  session_expires_at: string;
}

export interface ModuleDto {
  id: string;
  slug: string;
  title: string;
  field: string;
  difficulty: number;
  axis_focus: Record<string, unknown>;
  lesson_count: number;
}

export interface LessonDto {
  id: string;
  module_id: string;
  order: number;
  title: string;
  text_excerpt_id: string | null;
  tutor_system_prompt_id: string | null;
  objectives: string[];
  axis_focus: Record<string, unknown>;
  cognitive_structure_analysis: string;
  learner_questions: string;
  tutor_reference_notes: string;
}

export interface TextExcerptDto {
  id: string;
  lesson_id: string;
  title: string;
  author: string;
  source: string;
  body: string;
  language: string;
}

export interface LessonFeedbackDto {
  id: string;
  lesson_id: string;
  display_name: string;
  content: string;
  rating: number;
  admin_reply: string | null;
  admin_replied_at: string | null;
  created_at: string;
  is_mine: boolean;
}

export interface LessonFeedbackInput {
  display_name?: string;
  content: string;
  rating?: number;
}

export type SessionMode = "analyze" | "reverse" | "practice";

export interface SessionDto {
  id: string;
  user_id: string;
  lesson_id: string;
  mode: SessionMode;
  status: "draft" | "submitted" | "reviewed";
  artifact_id: string | null;
  started_at: string;
  submitted_at: string | null;
}

export interface CanvasCite {
  start: number;
  end: number;
  quote: string;
}

export interface CanvasNode {
  id: string;
  type: "concept" | "anchor" | "bridge" | "branch";
  label: string;
  x: number;
  y: number;
  axis_tag?: "cognition" | "value" | "time";
  cite?: CanvasCite;
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  relation: "causes" | "supports" | "contrasts" | "transforms" | "contains" | "other";
  // Author's actual connector word, shown in the canvas instead of the
  // generic relation label. Filled from Lesson.relationLexicon when the
  // student picks a token; null when the relation came from the legacy
  // 5-button fallback.
  label?: string;
  temporal_order?: number;
}

export interface RelationLexiconEntry {
  token: string;
  canonical: CanvasEdge["relation"];
  example?: string;
  glyph?: string;
}

export interface CanvasPath {
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export interface CanvasJson {
  version: 1;
  viewport: { x: number; y: number; zoom: number };
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  paths?: CanvasPath[];
  /** v3 1부 블록 추출 보존용 (서버는 payload 에 그대로 저장) */
  blocks?: Record<string, unknown>[];
  /** v3 원본 노드/엣지 — group·parent·dir 보존용 (toCanvasJson 손실 복구) */
  v3nodes?: Record<string, unknown>[];
  v3edges?: Record<string, unknown>[];
  /** 진행도 — 현재 부 + 각 부 완료 (대시보드 단계 표시) */
  progress?: { stage: number; s1: boolean; s2: boolean; s3: boolean };
  /** AI 코치 단계별 대화 — 불러오기 복원 */
  messages?: { s1?: unknown[]; s2?: unknown[]; s3?: unknown[] };
}

export interface ArtifactDto {
  id: string;
  session_id: string;
  mode: "free" | "constrained" | "guided";
  canvas_json: CanvasJson;
  saved_at: string;
}

export interface ArtifactGalleryDto {
  artifact_id: string;
  session_id: string;
  saved_at: string;
  mode: "free" | "constrained" | "guided";
  node_count: number;
  edge_count: number;
  /** 진행도 — 현재 부 + 각 부 완료 (서버 payload.progress) */
  progress: { stage: number; s1: boolean; s2: boolean; s3: boolean } | null;
  lesson: LessonDto;
}

export interface ProgressEntryDto {
  lesson_id: string;
  session_count: number;
  last_started_at: string | null;
}

export interface AdminUserProgressDto {
  user: UserDto;
  summary: {
    session_count: number;
    lesson_count: number;
    artifact_count: number;
    last_started_at: string | null;
  };
  lessons: {
    lesson_id: string;
    lesson_title: string;
    module_title: string;
    session_count: number;
    last_started_at: string | null;
  }[];
  recent_sessions: {
    session_id: string;
    lesson_id: string;
    lesson_title: string;
    module_title: string;
    mode: SessionMode;
    started_at: string;
    ended_at: string | null;
    artifact_count: number;
  }[];
}

export interface AdminResetPasswordDto {
  user_id: string;
  temp_password: string;
}

export interface AdminSessionMessageDto {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}

export interface AdminSessionDetailDto {
  session: {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    lesson_id: string;
    lesson_title: string;
    module_title: string;
    mode: SessionMode;
    started_at: string;
    ended_at: string | null;
    author: string;
    source: string;
    text_body: string;
  };
  messages: AdminSessionMessageDto[];
  artifact: {
    id: string;
    mode: "free" | "constrained" | "guided";
    payload: Record<string, unknown>;
    saved_at: string;
  } | null;
}

export interface TutorMessageDto {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  my_rating: TutorRatingDto | null;
  created_at: string;
}

export interface TutorRatingDto {
  id: string;
  message_id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
}

export interface RateTutorInput {
  rating: number;
  feedback?: string;
}

export type ModuleAxis = "cognitive" | "value" | "time";

export interface AdminModuleDto {
  id: string;
  slug: string;
  title: string;
  axis: ModuleAxis;
  field: string;
  order: number;
  difficulty: number;
  description: string | null;
  axis_focus: Record<string, unknown>;
  lesson_count: number;
  deleted?: boolean;
}

export interface AdminModuleCreateInput {
  title: string;
  slug: string;
  axis: ModuleAxis;
  field: string;
  order: number;
  difficulty: number;
  description?: string;
  axis_focus?: Record<string, number>;
}

export type AdminModuleUpdateInput = Partial<AdminModuleCreateInput>;

export interface AdminLessonDto {
  id: string;
  module_id: string;
  title: string;
  order: number;
  objectives: string[];
  axis_focus: Record<string, unknown>;
  cognitive_structure_analysis: string;
  learner_questions: string;
  tutor_reference_notes: string;
  text_excerpt_id: string | null;
  body: string;
  author: string;
  source: string;
  language: string;
}

export interface AdminLessonCreateInput {
  module_id: string;
  title: string;
  order: number;
  body: string;
  author?: string;
  source?: string;
  language?: "ko" | "en";
  objectives?: string[];
  cognitive_structure_analysis?: string;
  learner_questions?: string;
  tutor_reference_notes?: string;
  axis_focus?: Record<string, number>;
}

export type AdminLessonUpdateInput = Partial<Omit<AdminLessonCreateInput, "module_id">>;

export interface AdminTutorRatingRecentDto {
  id: string;
  message_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  feedback: string | null;
  created_at: string;
  message_content: string;
  model: string | null;
  prompt_version: string | null;
  input_tokens: number;
  output_tokens: number;
  session_id: string;
  lesson_id: string;
}

export interface AdminTutorRatingAggregateDto {
  key: string;
  count: number;
  average: number;
}

export interface AdminTutorRatingsDto {
  recent: AdminTutorRatingRecentDto[];
  summary: {
    count: number;
    average: number | null;
    by_model: AdminTutorRatingAggregateDto[];
    by_prompt_version: AdminTutorRatingAggregateDto[];
    distribution: { rating: number; count: number }[];
  };
}

export type AdminLessonFeedbackStatus = "all" | "visible" | "hidden" | "deleted";

export interface AdminLessonFeedbackDto {
  id: string;
  lesson_id: string;
  lesson_title: string;
  user_id: string;
  user_name: string;
  user_email: string;
  display_name: string;
  content: string;
  rating: number;
  is_hidden: boolean;
  hidden_at: string | null;
  deleted_at: string | null;
  admin_reply: string | null;
  admin_replied_at: string | null;
  admin_replied_by: string | null;
  created_at: string;
}

export interface AdminLessonFeedbackListDto {
  items: AdminLessonFeedbackDto[];
}

export interface AdminLessonFeedbackUpdateInput {
  hidden?: boolean;
  deleted?: boolean;
  admin_reply?: string | null;
}

export interface BrandingSettingsDto {
  logo_data_url: string | null;
}

export type PlanName = "free" | "standard" | "premium";

export interface PlanDto {
  name: PlanName;
  title: string;
  price_krw: number;
  features: Record<string, unknown>;
}

export interface SubscriptionDto {
  id: string;
  plan_name: PlanName | null;
  status: "trialing" | "active" | "past_due" | "canceled" | "expired";
  started_at: string;
  ends_at: string | null;
}

export interface CheckoutPayload {
  order_id: string;
  amount: number;
  plan_name: PlanName;
  order_name: string;
  client_key: string;
  customer_email: string;
  success_url: string;
  fail_url: string;
}

export interface ConfirmResult {
  payment_id: string;
  subscription_id: string | null;
  plan_name: PlanName;
  ends_at: string;
}

export interface RobotTutorTurn {
  role: "user" | "assistant";
  content: string;
}

export interface RobotTutorReply {
  text: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
}

export interface RobotStatus {
  online: boolean;
  last_seen_ms_ago: number | null;
  source: string | null;
  has_frame: boolean;
  frame_ms_ago: number | null;
}

export interface RobotFrame {
  image_base64: string;
  media_type: string;
  frame_ms_ago: number;
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface Envelope<T> {
  data?: T;
  error?: string;
  message?: string;
  details?: unknown;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });
  let body: Envelope<T> | T | undefined;
  try {
    body = (await res.json()) as Envelope<T> | T;
  } catch {
    body = undefined;
  }
  if (!res.ok) {
    const env = body as Envelope<T> | undefined;
    throw new ApiError(
      env?.message ?? env?.error ?? `HTTP ${res.status}`,
      res.status,
      env?.error ?? "unknown",
    );
  }
  if (body && typeof body === "object" && "data" in body && body.data !== undefined) {
    return body.data as T;
  }
  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    call<LoginData>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, name: string) =>
    call<LoginData>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  verifyEmail: (token: string) =>
    call<LoginData>("/api/auth/email/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  forgotPassword: (email: string) =>
    call<{ ok: true; sent: boolean; token?: string; url?: string; reason?: string }>(
      "/api/auth/password/forgot",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    ),
  resetPassword: (token: string, newPassword: string) =>
    call<{ ok: true }>("/api/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    }),
  me: () => call<UserDto>("/api/auth/me"),
  logout: () => call<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  modules: () => call<ModuleDto[]>("/api/library/modules"),
  moduleLessons: (moduleId: string) =>
    call<LessonDto[]>(`/api/library/modules/${moduleId}/lessons`),
  text: (textId: string) => call<TextExcerptDto>(`/api/library/texts/${textId}`),
  lessonFeedback: (lessonId: string) =>
    call<LessonFeedbackDto[]>(`/api/library/lessons/${lessonId}/feedback`),
  addLessonFeedback: (lessonId: string, body: LessonFeedbackInput) =>
    call<LessonFeedbackDto>(`/api/library/lessons/${lessonId}/feedback`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteLessonFeedback: (lessonId: string, feedbackId: string) =>
    call<{ id: string }>(
      `/api/library/lessons/${lessonId}/feedback/${feedbackId}`,
      { method: "DELETE" },
    ),
  progress: () => call<ProgressEntryDto[]>("/api/practice/me/progress"),
  artifacts: () => call<ArtifactGalleryDto[]>("/api/practice/me/artifacts"),
  deleteArtifact: (artifactId: string) =>
    call<{ id: string }>(`/api/practice/me/artifacts/${artifactId}`, {
      method: "DELETE",
    }),
  deleteArtifacts: (ids: string[]) =>
    call<{ deleted_count: number; deleted_ids: string[] }>(
      "/api/practice/me/artifacts/bulk-delete",
      {
        method: "POST",
        body: JSON.stringify({ artifact_ids: ids }),
      },
    ),
  startSession: (lessonId: string, mode?: SessionMode) =>
    call<SessionDto>("/api/practice/sessions", {
      method: "POST",
      body: JSON.stringify({
        lesson_id: lessonId,
        ...(mode ? { mode } : {}),
      }),
    }),
  session: (sessionId: string) =>
    call<SessionDto>(`/api/practice/sessions/${sessionId}`),
  messages: (sessionId: string) =>
    call<TutorMessageDto[]>(`/api/tutor/sessions/${sessionId}/messages`),
  rateTutorMessage: (messageId: string, input: RateTutorInput) =>
    call<TutorRatingDto>(`/api/tutor/messages/${messageId}/rate`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getArtifact: (sessionId: string) =>
    call<ArtifactDto | null>(`/api/practice/sessions/${sessionId}/artifact`),
  putArtifact: (sessionId: string, canvas: CanvasJson, clientRevision: number) =>
    call<ArtifactDto>(`/api/practice/sessions/${sessionId}/artifact`, {
      method: "PUT",
      body: JSON.stringify({
        canvas_json: canvas,
        client_revision: clientRevision,
      }),
    }),
  putV3Snapshot: (sessionId: string, snapshot: Record<string, unknown>) =>
    call<{ id: string; session_id: string; saved_at: string }>(
      `/api/practice/sessions/${sessionId}/v3-snapshot`,
      {
        method: "PUT",
        body: JSON.stringify({ snapshot }),
      },
    ),
  adminPending: () => call<UserDto[]>("/api/admin/users/pending"),
  adminUsers: () => call<UserDto[]>("/api/admin/users"),
  adminApprove: (userId: string) =>
    call<UserDto>(`/api/admin/users/${userId}/approve`, { method: "POST" }),
  adminReject: (userId: string, reason?: string) =>
    call<UserDto>(`/api/admin/users/${userId}/reject`, {
      method: "POST",
      body: JSON.stringify({ ...(reason ? { reason } : {}) }),
    }),
  adminUpdateUser: (userId: string, input: AdminUserUpdateInput) =>
    call<UserDto>(`/api/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(input.role ? { role: input.role === "admin" ? "admin" : "student" } : {}),
        ...(input.status ? { status: input.status } : {}),
      }),
    }),
  adminUserProgress: (userId: string) =>
    call<AdminUserProgressDto>(`/api/admin/users/${userId}/progress`),
  adminSuspendUser: (userId: string) =>
    call<UserDto>(`/api/admin/users/${userId}/suspend`, { method: "POST" }),
  adminDeleteUser: (userId: string) =>
    call<void>(`/api/admin/users/${userId}`, { method: "DELETE" }),
  adminSessionDetail: (sessionId: string) =>
    call<AdminSessionDetailDto>(`/api/admin/sessions/${sessionId}`),
  adminResetUserPassword: (userId: string) =>
    call<AdminResetPasswordDto>(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
    }),
  adminModules: (includeDeleted = false) =>
    call<AdminModuleDto[]>(`/api/admin/modules${includeDeleted ? "?include_deleted=1" : ""}`),
  adminRestoreModule: (moduleId: string) =>
    call<AdminModuleDto>(`/api/admin/modules/${moduleId}/restore`, { method: "POST" }),
  adminCreateModule: (input: AdminModuleCreateInput) =>
    call<AdminModuleDto>("/api/admin/modules", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  adminUpdateModule: (moduleId: string, input: AdminModuleUpdateInput) =>
    call<AdminModuleDto>(`/api/admin/modules/${moduleId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  adminDeleteModule: (moduleId: string) =>
    call<void>(`/api/admin/modules/${moduleId}`, { method: "DELETE" }),
  adminLessons: (moduleId?: string) =>
    call<AdminLessonDto[]>(
      moduleId ? `/api/admin/lessons?module_id=${moduleId}` : "/api/admin/lessons",
    ),
  adminCreateLesson: (input: AdminLessonCreateInput) =>
    call<AdminLessonDto>("/api/admin/lessons", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  adminUpdateLesson: (lessonId: string, input: AdminLessonUpdateInput) =>
    call<AdminLessonDto>(`/api/admin/lessons/${lessonId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  adminDeleteLesson: (lessonId: string) =>
    call<void>(`/api/admin/lessons/${lessonId}`, { method: "DELETE" }),
  adminTutorRatings: (limit = 50) =>
    call<AdminTutorRatingsDto>(`/api/admin/tutor/ratings?limit=${limit}`),
  adminLessonFeedback: (status: AdminLessonFeedbackStatus = "all", limit = 100) =>
    call<AdminLessonFeedbackListDto>(
      `/api/admin/lesson-feedback?status=${status}&limit=${limit}`,
    ),
  adminUpdateLessonFeedback: (
    feedbackId: string,
    input: AdminLessonFeedbackUpdateInput,
  ) =>
    call<AdminLessonFeedbackDto>(`/api/admin/lesson-feedback/${feedbackId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  brandingSettings: () => call<BrandingSettingsDto>("/api/settings/branding"),
  adminBrandingSettings: () =>
    call<BrandingSettingsDto>("/api/admin/settings/branding"),
  adminUpdateBrandingSettings: (input: BrandingSettingsDto) =>
    call<BrandingSettingsDto>("/api/admin/settings/branding", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  chat: (
    sessionId: string,
    lessonId: string,
    message: string,
    canvasSnapshot?: CanvasJson | null,
    canvasMode?: "free" | "constrained" | "guided" | null,
    canvasImageBase64?: string | null,
  ) =>
    call<TutorMessageDto>("/api/tutor/chat", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        lesson_id: lessonId,
        message,
        ...(canvasSnapshot ? { canvas_snapshot: canvasSnapshot } : {}),
        ...(canvasMode ? { canvas_mode: canvasMode } : {}),
        ...(canvasImageBase64 ? { canvas_image_base64: canvasImageBase64 } : {}),
      }),
    }),
  // 로봇 튜터 (ALI-23) — 세션 인증, 무상태. 대화 이력은 클라이언트가 보관해 전달.
  robotTutorChat: (
    message: string,
    history: RobotTutorTurn[],
    opts?: {
      imageBase64?: string;
      explanation?: string;
      structureText?: string;
      lessonId?: string;
    },
  ) =>
    call<RobotTutorReply>("/api/robot-tutor/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        history,
        image_base64: opts?.imageBase64,
        explanation: opts?.explanation,
        structure_text: opts?.structureText,
        lesson_id: opts?.lessonId,
      }),
    }),
  // 로봇 단말 연결 상태 — 최근 브리지 활동 기반 (온라인/마지막 접속).
  robotStatus: () => call<RobotStatus>("/api/robot-tutor/robot-status"),
  // 로봇이 게이트웨이로 올려둔 최신 카메라/화면 프레임 (없으면 404).
  robotFrame: () => call<RobotFrame>("/api/robot-tutor/robot-frame"),
  // 물리 로봇에게 "지금 캡처해" 명령을 큐잉 (로봇이 ~5초 내 폴링해 실행).
  robotTriggerCapture: () =>
    call<{ queued: boolean }>("/api/robot-tutor/trigger-capture", { method: "POST" }),
  billingPlans: () => call<PlanDto[]>("/api/billing/plans"),
  billingMeSubscription: () =>
    call<SubscriptionDto | null>("/api/billing/me/subscription"),
  billingCheckout: (planName: Exclude<PlanName, "free">) =>
    call<CheckoutPayload>("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan_name: planName }),
    }),
  billingConfirm: (paymentKey: string, orderId: string, amount: number) =>
    call<ConfirmResult>("/api/billing/confirm", {
      method: "POST",
      body: JSON.stringify({
        payment_key: paymentKey,
        order_id: orderId,
        amount,
      }),
    }),
};
