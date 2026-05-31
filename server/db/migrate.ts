// Programmatic migration runner — bypasses drizzle-kit CLI.
//
// drizzle-kit migrate has a known habit of swallowing errors on Windows when
// stderr noise (e.g. pg's verify-full SSL deprecation warning) interleaves
// with its spinner, leaving the operator unsure whether migrations actually
// applied. Calling drizzle-orm's migrate() directly gives us a normal Node
// process: real stack traces on failure, a clear "✅ done" on success.
//
// Run via: `npm run db:migrate:run`

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const { Pool } = pg;

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL missing. Did you forget --env-file=.env? Re-run via npm run db:migrate:run.",
    );
  }

  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 10_000,
  });

  const db = drizzle(pool);

  console.log("[migrate] connecting…");
  await pool.query("SELECT 1");
  console.log("[migrate] connection OK, applying migrations from server/db/migrations …");

  await migrate(db, { migrationsFolder: "./server/db/migrations" });

  console.log("[migrate] ✅ all migrations applied");
  await pool.end();
}

main().catch((err) => {
  console.error("[migrate] ❌ failed:");
  console.error(err);
  process.exit(1);
});
