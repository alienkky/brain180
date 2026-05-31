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

import { eq } from "drizzle-orm";
import { db, closeDb } from "./client.js";
import { lessons, modules, textExcerpts, users } from "./schema.js";
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
    .select({ id: users.id, role: users.role })
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
        passwordHash,
        emailVerifiedAt: new Date(),
      })
      .returning({ id: users.id });
    return { outcome: "created", userId: inserted[0]!.id, email };
  }

  const row = existing[0]!;
  if (row.role !== "admin") {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, row.id));
    return { outcome: "promoted", userId: row.id, email };
  }

  return { outcome: "noop", userId: row.id, email };
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
    const library = await seedLibraryContent();
    console.log(
      `[seed] library processed=${library.modulesProcessed} modules+=${library.modulesCreated} lessons+=${library.lessonsCreated} excerpts+=${library.textExcerptsCreated}`,
    );
  })()
    .catch((e) => {
      console.error("[seed] failed:", e);
      process.exitCode = 1;
    })
    .finally(() => void closeDb());
}
