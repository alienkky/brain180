// ALI-71 E2E 01: Student signup → library → session → canvas → tutor.
// Billing step is EXCLUDED per 기영님 지시 (ALI-60 comment 2026-06-02).

import { describe, it, expect, beforeAll } from "vitest";
import { apiFetch, session, extractSetCookie } from "./helpers";

const EMAIL = `e2e-${Date.now()}@test.local`;
const PASS = "e2ePassword1";
const NAME = "E2E 학습자";

let cookie = "";
let sessionId = "";
let lessonId = "";
let moduleId = "";

describe("01-signup-to-first-session", () => {
  it("student registers successfully", async () => {
    const res = await session.register(EMAIL, PASS, NAME);
    cookie = res.headers ? extractSetCookie(res.headers) : "";
    expect([200, 201]).toContain(res.status);
    expect(res.data).toHaveProperty("data.user");
  });

  it("registered user is immediately authenticated", async () => {
    const me = await apiFetch<{ data: { email: string } }>("/api/auth/me", {}, cookie);
    expect(me.status).toBe(200);
    expect((me.data as { data: { email: string } }).data.email).toBe(EMAIL);
  });

  it("student fetches library modules", async () => {
    const res = await apiFetch<{ data: { id: string }[] }>("/api/library/modules", {}, cookie);
    expect(res.status).toBe(200);
    const mods = (res.data as { data: { id: string }[] }).data;
    expect(mods.length).toBeGreaterThan(0);
    moduleId = mods[0].id;
  });

  it("student fetches lessons in first module", async () => {
    expect(moduleId).toBeTruthy();
    const res = await apiFetch<{ data: { id: string }[] }>(
      `/api/library/modules/${moduleId}/lessons`,
      {},
      cookie,
    );
    expect(res.status).toBe(200);
    const lessons = (res.data as { data: { id: string }[] }).data;
    expect(lessons.length).toBeGreaterThan(0);
    lessonId = lessons[0].id;
  });

  it("student starts a practice session", async () => {
    expect(lessonId).toBeTruthy();
    const res = await apiFetch<{ data: { id: string } }>(
      "/api/practice/sessions",
      { method: "POST", json: { lesson_id: lessonId, mode: "analyze" } },
      cookie,
    );
    expect(res.status).toBe(201);
    sessionId = (res.data as { data: { id: string } }).data.id;
  });

  it("student saves a canvas artifact", async () => {
    expect(sessionId).toBeTruthy();
    const canvas = {
      version: 1,
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [{ id: "n1", type: "concept", label: "핵심 아이디어", x: 100, y: 100 }],
      edges: [],
    };
    const res = await apiFetch<{ data: unknown }>(
      `/api/practice/sessions/${sessionId}/artifact`,
      { method: "PUT", json: { canvas_json: canvas, client_revision: 1 } },
      cookie,
    );
    expect([200, 201]).toContain(res.status);
  });

  it("student fetches saved artifact", async () => {
    expect(sessionId).toBeTruthy();
    const res = await apiFetch<{ data: unknown }>(
      `/api/practice/sessions/${sessionId}/artifact`,
      {},
      cookie,
    );
    expect(res.status).toBe(200);
  });

  it("student asks tutor (may return 502 in CI without LLM key)", async () => {
    expect(sessionId && lessonId).toBeTruthy();
    const res = await apiFetch<{ data: unknown }>(
      "/api/tutor/chat",
      {
        method: "POST",
        json: {
          session_id: sessionId,
          lesson_id: lessonId,
          message: "이 개념이 맞나요?",
          canvas_mode: "constrained",
        },
      },
      cookie,
    );
    expect([200, 201, 502]).toContain(res.status);
  });

  it("student logs out successfully", async () => {
    const res = await apiFetch<unknown>("/api/auth/logout", { method: "POST" }, cookie);
    expect(res.status).toBe(200);
  });

  it("after logout, /api/auth/me returns 401", async () => {
    const res = await apiFetch<unknown>("/api/auth/me", {}, cookie);
    expect(res.status).toBe(401);
  });
});
