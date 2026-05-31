// Admin + library content idempotent seeder per decisions.md §3.
// Owner: ALI-67 방연동[MCP].
//
// Usage:
//   node --experimental-strip-types server/db/seed.ts
//   or via build: node dist/server/db/seed.js
//
// Admin seed:
//   Reads ADMIN_SEED_EMAIL (default kky710@gmail.com) and ADMIN_SEED_PASSWORD (required to set hash).
//   - Creates admin user if email not present.
//   - If present with role!=admin, promotes to admin.
//   - Sets passwordHash + emailVerifiedAt only on initial insert (never overwrites
//     existing hash; rotation must use a deliberate update path, not seed re-run).
//
// Library seed:
//   Parses seeds/*.md (3 MVP cold-start docs) and upserts 1 module + 1 lesson +
//   1 text_excerpt per file. Idempotency hinge is `modules.slug` (unique idx).

import { and, eq, isNull } from "drizzle-orm";
import { db, closeDb } from "./client.js";
import {
  lessons,
  modules,
  textExcerpts,
  tutorSystemPrompts,
  users,
} from "./schema.js";
import { loadEnv } from "../lib/env.js";
import { hashPassword } from "../lib/password.js";
import { loadAllSeeds, type SeedRecord } from "../lib/seed-content.js";

export interface SeedAdminResult {
  outcome: "created" | "promoted" | "noop";
  userId: string;
  email: string;
}

export async function seedAdmin(): Promise<SeedAdminResult> {
  const env = loadEnv();
  const email = env.ADMIN_SEED_EMAIL.toLowerCase();

  const existing = await db
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length === 0) {
    if (!env.ADMIN_SEED_PASSWORD) {
      throw new Error(
        "ADMIN_SEED_PASSWORD required to create admin user on first seed",
      );
    }
    const passwordHash = await hashPassword(env.ADMIN_SEED_PASSWORD);
    const inserted = await db
      .insert(users)
      .values({
        email,
        name: "Brain180 Admin",
        role: "admin",
        status: "approved",
        approvedAt: new Date(),
        passwordHash,
        emailVerifiedAt: new Date(),
      })
      .returning({ id: users.id });
    return { outcome: "created", userId: inserted[0]!.id, email };
  }

  const row = existing[0]!;
  if (row.role !== "admin" || row.status !== "approved") {
    await db
      .update(users)
      .set({ role: "admin", status: "approved", approvedAt: new Date() })
      .where(eq(users.id, row.id));
    return { outcome: "promoted", userId: row.id, email };
  }

  return { outcome: "noop", userId: row.id, email };
}

// Tutor system prompt v1.0 — bootstrap content so /api/tutor/chat works
// before ALI-66 남말씨[글말] publishes the canonical prompt. Idempotency hinge:
// (name, version) unique idx. Re-running seed with the same (name, version)
// is a noop; bumping VERSION below creates a fresh row and toggles is_active.
//
// Substitution vars expected by tutor.ts substitute(): {{lesson_title}},
// {{text_body}}, {{axis_focus}}, {{user_name}}. Do NOT introduce new vars
// here without first widening the substitute() map in routes/tutor.ts.
const TUTOR_PROMPT_V1_NAME = "brain180-tutor-v1";
const TUTOR_PROMPT_V1_VERSION = "1.0.0";
const TUTOR_PROMPT_V1_CONTENT = [
  "당신은 Brain180 의 사고구조 시각화 튜터다.",
  "",
  "학생: {{user_name}}",
  "원전 제목: {{lesson_title}}",
  "축 가중치: {{axis_focus}}",
  "",
  "원전 본문:",
  '"""',
  "{{text_body}}",
  '"""',
  "",
  "당신의 역할:",
  "- 학생이 위 원전을 읽어 저자의 사고구조(노드-엣지-층위)를 *학생 자신이* 끄집어내도록 돕는다.",
  "- 정답을 통째로 주지 마라. 학생의 가설을 받아 더 깊은 질문으로 되돌려준다.",
  "- 핵심 개념(node), 그 사이의 관계(edge), 시간순서, 저자가 반복 사용하는 패턴(pattern) 을 한 번에 한 단계씩 명명하도록 안내한다.",
  "",
  "대화 규칙:",
  "- 한 응답은 짧게: 핵심 질문 1개 + 작은 힌트 1개. 설교 금지.",
  "- 학생이 잘못된 가설을 내놓으면 반박 대신 *그 가설이 맞다면 본문 어디서 그 흔적이 더 나와야 하는가* 를 묻는다.",
  "- 학생이 막히면 본문의 한 구절을 그대로 인용해 다시 던진다. 새 내용을 발명하지 마라.",
  "",
  "금지:",
  "- 4차원 해석을 정답의 형태로 통째로 주는 것",
  "- 본문에 없는 외부 지식으로 자기 권위를 세우는 것",
  "- 칭찬으로만 대화를 끝내는 것 — 마지막 응답에도 다음 가설을 위한 질문 한 줄을 남긴다",
].join("\n");

export interface SeedTutorPromptResult {
  outcome: "created" | "activated" | "noop";
  id: string;
  version: string;
}

export async function seedActiveTutorPrompt(): Promise<SeedTutorPromptResult> {
  const existing = await db
    .select({ id: tutorSystemPrompts.id, isActive: tutorSystemPrompts.isActive })
    .from(tutorSystemPrompts)
    .where(
      and(
        eq(tutorSystemPrompts.name, TUTOR_PROMPT_V1_NAME),
        eq(tutorSystemPrompts.version, TUTOR_PROMPT_V1_VERSION),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    const inserted = await db
      .insert(tutorSystemPrompts)
      .values({
        name: TUTOR_PROMPT_V1_NAME,
        version: TUTOR_PROMPT_V1_VERSION,
        content: TUTOR_PROMPT_V1_CONTENT,
        isActive: true,
      })
      .returning({ id: tutorSystemPrompts.id });
    return { outcome: "created", id: inserted[0]!.id, version: TUTOR_PROMPT_V1_VERSION };
  }

  const row = existing[0]!;
  if (!row.isActive) {
    await db
      .update(tutorSystemPrompts)
      .set({ isActive: true })
      .where(eq(tutorSystemPrompts.id, row.id));
    return { outcome: "activated", id: row.id, version: TUTOR_PROMPT_V1_VERSION };
  }
  return { outcome: "noop", id: row.id, version: TUTOR_PROMPT_V1_VERSION };
}

// Backfill: any lesson with NULL tutor_system_prompt_id gets the active prompt.
// Called after seedLibraryContent so newly inserted *and* legacy null rows
// converge on the same default. Lessons that already point to a (different)
// prompt are left alone — explicit assignment wins.
export async function attachTutorPromptToLessons(promptId: string): Promise<number> {
  const updated = await db
    .update(lessons)
    .set({ tutorSystemPromptId: promptId })
    .where(isNull(lessons.tutorSystemPromptId))
    .returning({ id: lessons.id });
  return updated.length;
}

export interface SeedLibraryResult {
  modulesProcessed: number;
  modulesCreated: number;
  lessonsCreated: number;
  textExcerptsCreated: number;
}

// MVP axis_focus ↔ moduleAxisEnum mapping.
// Seed `axis_focus` is already normalized to "cognitive" | "value" | "time"
// by loadAllSeeds (see seed-content.ts AXIS_FOCUS_MAP), so we can use it
// directly as both `modules.axis` and `modules.field` is a separate enum.
function axisOrder(axis: "cognitive" | "value" | "time"): number {
  return axis === "cognitive" ? 0 : axis === "value" ? 1 : 2;
}

async function upsertModuleLessonExcerpt(seed: SeedRecord): Promise<{
  moduleCreated: boolean;
  lessonCreated: boolean;
  excerptCreated: boolean;
}> {
  // Module is the idempotency root via unique slug.
  const existingModule = await db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.slug, seed.slug))
    .limit(1);

  let moduleId: string;
  let moduleCreated = false;
  if (existingModule.length === 0) {
    // `order` is unique-with-axis; derive from current max within axis
    // to avoid clashes when seeds add new modules over time.
    const peers = await db
      .select({ order: modules.order })
      .from(modules)
      .where(eq(modules.axis, seed.axisFocus));
    const nextOrder = peers.length === 0 ? axisOrder(seed.axisFocus) * 100 : Math.max(...peers.map((p) => p.order)) + 1;

    const inserted = await db
      .insert(modules)
      .values({
        title: seed.title,
        axis: seed.axisFocus,
        order: nextOrder,
        slug: seed.slug,
        field: seed.field,
        difficulty: 3,
        axisFocus: seed.axisWeights,
      })
      .returning({ id: modules.id });
    moduleId = inserted[0]!.id;
    moduleCreated = true;
  } else {
    moduleId = existingModule[0]!.id;
  }

  // Lesson: 1 per module (order=0). Identity hinge = (moduleId, order=0).
  const existingLesson = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId))
    .limit(1);

  let lessonId: string;
  let lessonCreated = false;
  if (existingLesson.length === 0) {
    const inserted = await db
      .insert(lessons)
      .values({
        moduleId,
        title: seed.title,
        textSource: seed.body,
        sourceMeta: {
          era: seed.era,
          target_nodes: seed.targetNodes,
          trap_concepts: seed.trapConcepts,
        },
        order: 0,
        objectives: seed.targetNodes,
        axisFocus: seed.axisWeights,
      })
      .returning({ id: lessons.id });
    lessonId = inserted[0]!.id;
    lessonCreated = true;
  } else {
    lessonId = existingLesson[0]!.id;
  }

  // Text excerpt: 1 per lesson (order=0). Identity hinge = (lessonId, order=0).
  const existingExcerpt = await db
    .select({ id: textExcerpts.id })
    .from(textExcerpts)
    .where(eq(textExcerpts.lessonId, lessonId))
    .limit(1);

  let excerptCreated = false;
  if (existingExcerpt.length === 0) {
    await db.insert(textExcerpts).values({
      lessonId,
      content: seed.body,
      highlights: [],
      order: 0,
      title: seed.title,
      author: seed.author,
      source: seed.era,
      language: "ko",
    });
    excerptCreated = true;
  }

  return { moduleCreated, lessonCreated, excerptCreated };
}

export async function seedLibraryContent(): Promise<SeedLibraryResult> {
  const seeds = await loadAllSeeds();
  let modulesCreated = 0;
  let lessonsCreated = 0;
  let textExcerptsCreated = 0;
  for (const seed of seeds) {
    const r = await upsertModuleLessonExcerpt(seed);
    if (r.moduleCreated) modulesCreated++;
    if (r.lessonCreated) lessonsCreated++;
    if (r.excerptCreated) textExcerptsCreated++;
  }
  return {
    modulesProcessed: seeds.length,
    modulesCreated,
    lessonsCreated,
    textExcerptsCreated,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  (async () => {
    const admin = await seedAdmin();
    console.log(`[seed] admin ${admin.outcome} id=${admin.userId} email=${admin.email}`);
    const prompt = await seedActiveTutorPrompt();
    console.log(`[seed] tutor_prompt ${prompt.outcome} id=${prompt.id} version=${prompt.version}`);
    const library = await seedLibraryContent();
    console.log(
      `[seed] library processed=${library.modulesProcessed} modules+=${library.modulesCreated} lessons+=${library.lessonsCreated} excerpts+=${library.textExcerptsCreated}`,
    );
    const attached = await attachTutorPromptToLessons(prompt.id);
    console.log(`[seed] tutor_prompt attached to ${attached} lessons (null→${prompt.id})`);
  })()
    .catch((e) => {
      console.error("[seed] failed:", e);
      process.exitCode = 1;
    })
    .finally(() => void closeDb());
}
