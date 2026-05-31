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

export interface SessionDto {
  id: string;
  user_id: string;
  lesson_id: string;
  status: "draft" | "submitted" | "reviewed";
  artifact_id: string | null;
  started_at: string;
  submitted_at: string | null;
}

export interface CanvasNode {
  id: string;
  type: "concept" | "anchor" | "bridge" | "branch";
  label: string;
  x: number;
  y: number;
  axis_tag?: "cognition" | "value" | "time";
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  relation: "causes" | "supports" | "contrasts" | "transforms" | "contains";
  temporal_order?: number;
}

export interface CanvasJson {
  version: 1;
  viewport: { x: number; y: number; zoom: number };
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface ArtifactDto {
  id: string;
  session_id: string;
  mode: "free" | "constrained" | "guided";
  canvas_json: CanvasJson;
  saved_at: string;
}

export interface TutorMessageDto {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
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
  me: () => call<UserDto>("/api/auth/me"),
  logout: () => call<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  modules: () => call<ModuleDto[]>("/api/library/modules"),
  moduleLessons: (moduleId: string) =>
    call<LessonDto[]>(`/api/library/modules/${moduleId}/lessons`),
  text: (textId: string) => call<TextExcerptDto>(`/api/library/texts/${textId}`),
  startSession: (lessonId: string) =>
    call<SessionDto>("/api/practice/sessions", {
      method: "POST",
      body: JSON.stringify({ lesson_id: lessonId }),
    }),
  messages: (sessionId: string) =>
    call<TutorMessageDto[]>(`/api/tutor/sessions/${sessionId}/messages`),
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
  chat: (
    sessionId: string,
    lessonId: string,
    message: string,
    canvasSnapshot?: CanvasJson | null,
  ) =>
    call<TutorMessageDto>("/api/tutor/chat", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        lesson_id: lessonId,
        message,
        ...(canvasSnapshot ? { canvas_snapshot: canvasSnapshot } : {}),
      }),
    }),
};
