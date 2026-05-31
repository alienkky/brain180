import { defineConfig } from "drizzle-kit";

// drizzle-kit invokes this config as a standalone Node process, so it never
// inherits the `--env-file=.env` flag we set on dev:server. Pull .env in
// ourselves via Node 22's native loader; ignore failures so Railway / CI
// (where platform env vars are already injected and no .env exists) still works.
try {
  process.loadEnvFile(".env");
} catch {
  // .env absent — assume platform env (prod) populated DATABASE_URL.
}

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://brain180:brain180@localhost:5432/brain180",
  },
  strict: true,
  verbose: true,
});
