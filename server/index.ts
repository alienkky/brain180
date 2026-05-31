import express from "express";
import { loadEnv } from "./lib/env.js";
import { sessionMiddleware } from "./middleware/auth.js";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { mountRoutes } from "./routes/index.js";
import { closeDb } from "./db/client.js";
import { installUsageLogWriter } from "./lib/usage-log.js";

const env = loadEnv();

installUsageLogWriter();

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
app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(
    `[brain180 v2] listening on :${env.PORT} (env=${env.NODE_ENV})`,
  );
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
