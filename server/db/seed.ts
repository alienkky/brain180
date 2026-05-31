// Admin idempotent seeder per decisions.md §3.
// Owner: ALI-67 방연동[MCP].
//
// Usage:
//   node --experimental-strip-types server/db/seed.ts
//   or via build: node dist/server/db/seed.js
//
// Reads ADMIN_SEED_EMAIL (default kky710@gmail.com) and ADMIN_SEED_PASSWORD (required to set hash).
// - Creates admin user if email not present.
// - If present with role!=admin, promotes to admin.
// - Sets passwordHash + emailVerifiedAt only on initial insert (never overwrites
//   existing hash; rotation must use a deliberate update path, not seed re-run).

import { eq } from "drizzle-orm";
import { db, closeDb } from "./client.js";
import { users } from "./schema.js";
import { loadEnv } from "../lib/env.js";
import { hashPassword } from "../lib/password.js";

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

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedAdmin()
    .then((r) => {
      console.log(`[seed] admin ${r.outcome} id=${r.userId} email=${r.email}`);
    })
    .catch((e) => {
      console.error("[seed] failed:", e);
      process.exitCode = 1;
    })
    .finally(() => void closeDb());
}
