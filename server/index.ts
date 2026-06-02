import express from "express";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { loadEnv } from "./lib/env.js";
import { sessionMiddleware } from "./middleware/auth.js";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { mountRoutes } from "./routes/index.js";
import { closeDb, db } from "./db/client.js";
import { installUsageLogWriter } from "./lib/usage-log.js";
import { startScheduler } from "./jobs/index.js";
import {
  attachTutorPromptToLessons,
  seedActiveTutorPrompt,
  seedAdmin,
  seedLibraryContent,
} from "./db/seed.js";

const env = loadEnv();

installUsageLogWriter();

// Auto-bootstrap on Railway: apply migrations + seed admin/content idempotently
// before serving traffic. Disable via AUTO_BOOTSTRAP=false (e.g. CI smoke). Any
// failure aborts startup so health checks fail loud instead of serving a half-
// initialised DB. Idempotent: re-running on existing data is a noop.
async function bootstrapDb(): Promise<void> {
  if (env.AUTO_BOOTSTRAP === "false") {
    console.log("[bootstrap] skipped (AUTO_BOOTSTRAP=false)");
    return;
  }
  const here = dirname(fileURLToPath(import.meta.url));
  // dist-server/index.js → ../server/db/migrations (copied alongside in Dockerfile)
  // dev (tsx server/index.ts) → ./db/migrations relative to server/
  const candidates = [
    resolve(here, "..", "server", "db", "migrations"),
    resolve(here, "db", "migrations"),
    resolve(process.cwd(), "server", "db", "migrations"),
  ];
  const migrationsFolder = candidates.find(existsSync);
  if (!migrationsFolder) {
    throw new Error(
      `[bootstrap] migrations folder not found. Tried: ${candidates.join(", ")}`,
    );
  }
  console.log(`[bootstrap] migrate from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });

  console.log("[bootstrap] seed admin + tutor prompt + library content");
  const admin = await seedAdmin();
  console.log(`[bootstrap] admin ${admin.outcome} id=${admin.userId}`);
  const prompt = await seedActiveTutorPrompt();
  console.log(`[bootstrap] tutor_prompt ${prompt.outcome} id=${prompt.id}`);
  const library = await seedLibraryContent();
  console.log(
    `[bootstrap] library modules+=${library.modulesCreated} lessons+=${library.lessonsCreated} excerpts+=${library.textExcerptsCreated}`,
  );
  const attached = await attachTutorPromptToLessons(prompt.id);
  console.log(`[bootstrap] tutor_prompt attached to ${attached} lessons`);
}

const app = express();

app.disable("x-powered-by");
// CORS runs before json parsing so OPTIONS preflights short-circuit fast
// and never touch the body parser.
app.use(corsMiddleware);
// Stash raw body on the request so /webhooks/toss can HMAC-verify before trusting
// the parsed JSON. Cheap copy; only fires for routes that send a body.
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      (req as { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  }),
);
app.use(sessionMiddleware);
app.use(mountRoutes());

// Production: serve the Vite-built SPA. dist/ sits next to dist-server/ inside
// the Docker image (Dockerfile copies it there). When the bundle is missing
// (e.g. local `npm run dev:server` with Vite running separately on :5173) we
// just skip the static layer and fall through to notFound.
const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "..", "dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: "1d" }));
  app.get(/^(?!\/api|\/webhooks|\/healthz|\/readyz).*/, (_req, res) => {
    res.sendFile(join(distDir, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

const server = await bootstrapDb()
  .then(() => {
    startScheduler();
    return app.listen(env.PORT, () => {
      console.log(
        `[brain180 v2] listening on :${env.PORT} (env=${env.NODE_ENV})`,
      );
    });
  })
  .catch((err) => {
    console.error("[brain180 v2] bootstrap failed — aborting startup");
    console.error(err);
    process.exit(1);
  });

async function shutdown(signal: string): Promise<void> {
  console.log(`[brain180 v2] ${signal} received, draining`);
  server.close(() => {
    void closeDb().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
