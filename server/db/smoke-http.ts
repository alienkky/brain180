// Owner: 연다리 [통합설계] / ALI-67 방연동[MCP] seam.
//
// HTTP-layer smoke for the tutor pipeline. Companion to smoke-tutor.ts:
//   - smoke-tutor.ts  → DB → callTutorLLM → api_usage_logs (bypasses HTTP)
//   - smoke-http.ts   → HTTP → Lucia → routes → DB → LLM → api_usage_logs
//
// This script verifies that everything between the wire and the LLM seam
// holds together: middleware ordering, cookie round-trip, Zod validation,
// session ownership, prompt resolution at the route layer.
//
// Pre-conditions:
//   1. `npm run db:seed` has run successfully (admin user + ≥1 lesson seeded)
//   2. `npm run dev:server` is running in another terminal, listening on
//      APP_BASE_URL (or SMOKE_BASE_URL override, default http://localhost:3001)
//   3. .env has ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD matching the seeded admin
//
// What it does:
//   1. GET  /healthz                            → server reachable
//   2. POST /api/auth/login                     → Lucia session cookie
//   3. GET  /api/auth/me                        → confirm cookie round-trip
//   4. Pick first lesson via direct DB read     (library DTO not under test)
//   5. POST /api/practice/sessions {lesson_id}  → session row
//   6. Snapshot api_usage_logs count            (DB read)
//   7. POST /api/tutor/chat {session, lesson, message} → assistant DTO
//   8. GET  /api/tutor/sessions/:id/messages    → expect exactly 2 rows
//   9. Snapshot api_usage_logs count again      → expect Δ=1
//
// Exits 0 on PASS, 1 on FAIL. Each run creates 1 session + 2 tutor_messages
// + 1 api_usage_logs (~1 Kimi call, ~₩0).

import { asc, count } from "drizzle-orm";
import { closeDb, db } from "./client.js";
import { apiUsageLogs, lessons } from "./schema.js";

interface CookieJar {
  cookie: string | null;
}

const jar: CookieJar = { cookie: null };

function baseUrl(): string {
  return (
    process.env.SMOKE_BASE_URL ??
    process.env.APP_BASE_URL ??
    "http://localhost:3001"
  );
}

async function call(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? {});
  if (jar.cookie) headers.set("Cookie", jar.cookie);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  // Node 22 fetch exposes getSetCookie() to read individual Set-Cookie headers.
  // Lucia returns one cookie per response; refresh always wins.
  const sc = res.headers.getSetCookie?.() ?? [];
  for (const raw of sc) {
    const pair = raw.split(";")[0]?.trim();
    if (pair) jar.cookie = pair;
  }
  return res;
}

interface Envelope<T> {
  data?: T;
  error?: string;
  message?: string;
  details?: unknown;
}

async function expectOk<T>(res: Response, ctx: string): Promise<T> {
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${ctx} ${res.status} ${txt.slice(0, 400)}`);
  }
  const json = (await res.json()) as Envelope<T> | T;
  // Routes use ok()/fail() envelope — data lives at .data when present;
  // some routes (logout, change-password) return bare {ok: true}.
  if (json && typeof json === "object" && "data" in json && json.data !== undefined) {
    return json.data as T;
  }
  return json as T;
}

interface UserDto {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  status: "pending_approval" | "approved" | "rejected" | "suspended";
  must_change_password: boolean;
}
interface LoginData {
  user: UserDto;
  session_expires_at: string;
}
interface SessionDto {
  id: string;
  user_id: string;
  lesson_id: string;
  status: "draft" | "submitted" | "reviewed";
}
interface AssistantDto {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}

async function main(): Promise<void> {
  const adminEmail = (process.env.ADMIN_SEED_EMAIL ?? "kky710@gmail.com").toLowerCase();
  const adminPwd = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPwd) {
    throw new Error(
      "ADMIN_SEED_PASSWORD missing from .env — same value used by db:seed",
    );
  }

  // 1. Health
  const health = await call("/healthz");
  if (!health.ok) {
    throw new Error(
      `/healthz ${health.status} — is dev:server running on ${baseUrl()}?`,
    );
  }
  console.log(`[smoke-http] /healthz ok @ ${baseUrl()}`);

  // 2. Login
  const loginRes = await call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: adminEmail, password: adminPwd }),
  });
  const ld = await expectOk<LoginData>(loginRes, "/api/auth/login");
  console.log(
    `[smoke-http] login ok user=${ld.user.id} role=${ld.user.role} status=${ld.user.status} must_change=${ld.user.must_change_password}`,
  );

  if (ld.user.role !== "admin") {
    throw new Error(`seeded user is not admin (role=${ld.user.role})`);
  }
  if (ld.user.must_change_password) {
    throw new Error(
      "admin.must_change_password=true — re-seed with the fixed seedAdmin (sets must_change_password=false explicitly)",
    );
  }
  if (ld.user.status !== "approved") {
    throw new Error(`admin status=${ld.user.status} (expected approved)`);
  }

  // 3. Cookie round-trip via /me
  const meRes = await call("/api/auth/me");
  const me = await expectOk<UserDto>(meRes, "/api/auth/me");
  if (me.id !== ld.user.id) {
    throw new Error(`/me id mismatch (${me.id} vs ${ld.user.id})`);
  }
  console.log(`[smoke-http] /me ok — Lucia cookie round-trip works`);

  // 4. First lesson via DB (library DTO not under test in this smoke)
  const lessonRows = await db
    .select({ id: lessons.id, title: lessons.title })
    .from(lessons)
    .orderBy(asc(lessons.createdAt))
    .limit(1);
  const lesson = lessonRows[0];
  if (!lesson) {
    throw new Error("no lessons in DB — run npm run db:seed first");
  }
  console.log(`[smoke-http] lesson id=${lesson.id} title="${lesson.title}"`);

  // 5. Start session
  const sessRes = await call("/api/practice/sessions", {
    method: "POST",
    body: JSON.stringify({ lesson_id: lesson.id }),
  });
  const sess = await expectOk<SessionDto>(sessRes, "/api/practice/sessions");
  if (sess.lesson_id !== lesson.id) {
    throw new Error(`session lesson_id mismatch (${sess.lesson_id})`);
  }
  console.log(`[smoke-http] session id=${sess.id} status=${sess.status}`);

  // 6. Pre-call usage log count
  const before = await db.select({ c: count() }).from(apiUsageLogs);
  const beforeCount = Number(before[0]?.c ?? 0);
  console.log(`[smoke-http] api_usage_logs before=${beforeCount}`);

  // 7. Tutor chat
  const message =
    "이 본문에서 가장 자주 반복되는 사고 패턴 하나만 골라 짧게 알려주세요.";
  const chatRes = await call("/api/tutor/chat", {
    method: "POST",
    body: JSON.stringify({
      session_id: sess.id,
      lesson_id: lesson.id,
      message,
    }),
  });
  const assistant = await expectOk<AssistantDto>(chatRes, "/api/tutor/chat");
  console.log(
    `[smoke-http] assistant id=${assistant.id} model=${assistant.model} in=${assistant.input_tokens} out=${assistant.output_tokens}`,
  );
  console.log(`[smoke-http] reply (200 chars): ${assistant.content.slice(0, 200)}`);

  // 8. List messages — expect [user, assistant] in chronological order
  const msgsRes = await call(`/api/tutor/sessions/${sess.id}/messages`);
  const msgs = await expectOk<AssistantDto[]>(
    msgsRes,
    "/api/tutor/sessions/:id/messages",
  );
  console.log(`[smoke-http] messages count=${msgs.length}`);

  // 9. Verify api_usage_logs Δ
  const after = await db.select({ c: count() }).from(apiUsageLogs);
  const afterCount = Number(after[0]?.c ?? 0);
  const delta = afterCount - beforeCount;
  console.log(`[smoke-http] api_usage_logs after=${afterCount} Δ=${delta}`);

  const pass =
    delta === 1 &&
    msgs.length === 2 &&
    msgs[0]?.role === "user" &&
    msgs[1]?.role === "assistant" &&
    msgs[1]?.content === assistant.content;

  console.log("");
  console.log(`[smoke-http] ===== ${pass ? "✅ PASS" : "❌ FAIL"} =====`);
  if (!pass) {
    console.error(`[smoke-http] expected Δ=1 + 2 messages (user, assistant)`);
    console.error(
      `[smoke-http] got Δ=${delta} roles=[${msgs.map((m) => m.role).join(", ")}]`,
    );
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error("[smoke-http] failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => void closeDb());
