// ALI-71 E2E 02: Admin creates module + lesson + publishes for student to see.
// Prerequisite: dev server running + AUTO_APPROVE_STUDENTS=true + ADMIN_SEED done.

import { describe, it, expect, beforeAll } from "vitest";
import { apiFetch, session, extractSetCookie } from "./helpers";

const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL ?? "kky710@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? "admin-dev-pass";
const STUDENT_EMAIL = `student-e2e-${Date.now()}@test.local`;
const STUDENT_PASS = "e2eStudent99";

let adminCookie = "";
let studentCookie = "";
let createdModuleId = "";
let createdLessonId = "";

describe("02-admin-content-publish", () => {
  beforeAll(async () => {
    // Admin login.
    const res = await session.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    adminCookie = res.headers ? extractSetCookie(res.headers) : "";

    // Student register.
    const sreg = await session.register(STUDENT_EMAIL, STUDENT_PASS, "E2E Student");
    studentCookie = sreg.headers ? extractSetCookie(sreg.headers) : "";
  });

  it("admin can create a module", async () => {
    const res = await apiFetch<{ data: { id: string } }>(
      "/api/admin/modules",
      { method: "POST", json: { name: "E2E Test Module", axis: "cognitive", order: 99 } },
      adminCookie,
    );
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty("data.id");
    createdModuleId = (res.data as { data: { id: string } }).data.id;
  });

  it("admin can create a lesson in the module", async () => {
    expect(createdModuleId).toBeTruthy();
    const res = await apiFetch<{ data: { id: string } }>(
      "/api/admin/lessons",
      {
        method: "POST",
        json: {
          module_id: createdModuleId,
          title: "E2E Test Lesson",
          order: 1,
          objectives: ["테스트 목표"],
          axis_focus: { cognitive: 1 },
        },
      },
      adminCookie,
    );
    expect(res.status).toBe(201);
    createdLessonId = (res.data as { data: { id: string } }).data.id;
  });

  it("student can see the module in library", async () => {
    expect(createdModuleId).toBeTruthy();
    const res = await apiFetch<{ data: unknown[] }>("/api/library/modules", {}, studentCookie);
    expect(res.status).toBe(200);
    const modules = (res.data as { data: { id: string }[] }).data;
    const found = modules.some((m) => m.id === createdModuleId);
    expect(found).toBe(true);
  });

  it("student can fetch lessons in the module", async () => {
    expect(createdModuleId).toBeTruthy();
    const res = await apiFetch<{ data: unknown[] }>(
      `/api/library/modules/${createdModuleId}/lessons`,
      {},
      studentCookie,
    );
    expect(res.status).toBe(200);
    const lessons = (res.data as { data: { id: string }[] }).data;
    expect(lessons.some((l) => l.id === createdLessonId)).toBe(true);
  });

  it("student can start a session for the lesson", async () => {
    expect(createdLessonId).toBeTruthy();
    const res = await apiFetch<{ data: { id: string } }>(
      "/api/practice/sessions",
      { method: "POST", json: { lesson_id: createdLessonId, mode: "analyze" } },
      studentCookie,
    );
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty("data.id");
  });
});
