import { z } from "zod";

const Schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL required"),

  ANON_SALT: z.string().min(16, "ANON_SALT must be >= 16 chars"),

  ADMIN_SEED_EMAIL: z.string().email().default("kky710@gmail.com"),
  ADMIN_SEED_PASSWORD: z.string().optional(),

  // Run drizzle migrations + seedAdmin + seedLibraryContent on each container
  // boot. Idempotent — re-running on an already-seeded DB is a noop. Set to
  // "false" only for CI smoke tests where the DB is preloaded.
  AUTO_BOOTSTRAP: z.enum(["true", "false"]).default("true"),

  // Beta-open mode: /api/auth/register marks the new student as approved
  // immediately so they can use the app without admin intervention. Flip to
  // "false" when manual approval is required (e.g. paid B2B course).
  AUTO_APPROVE_STUDENTS: z.enum(["true", "false"]).default("true"),

  // Tutor LLM provider selection. Defaults to "kimi" because v1 brain180 already
  // ran on Moonshot/Kimi and our local-dev path reuses that key. Switch via env.
  AI_PROVIDER: z.enum(["anthropic", "kimi"]).default("kimi"),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-4-7"),

  // Kimi / Moonshot (OpenAI-compatible). KIMI_API_KEY is honored as an alias of
  // MOONSHOT_API_KEY to stay backwards-compatible with v1 server.js env names.
  MOONSHOT_API_KEY: z.string().optional(),
  KIMI_API_KEY: z.string().optional(),
  MOONSHOT_BASE_URL: z.string().default("https://api.moonshot.ai/v1"),
  MOONSHOT_MODEL: z.string().default("kimi-k2.6"),
  MOONSHOT_FALLBACK_MODEL: z.string().default("moonshot-v1-8k"),
  MOONSHOT_MAX_TOKENS: z.coerce.number().int().positive().default(1024),
  MOONSHOT_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
  MOONSHOT_THINKING: z.enum(["enabled", "disabled"]).default("disabled"),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_VISION_MODEL: z.string().default("gpt-4.1-mini"),
  GEMINI_API_KEY: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Brain180 <no-reply@brain180.app>"),

  TOSS_CLIENT_KEY: z.string().optional(),
  TOSS_SECRET_KEY: z.string().optional(),
  TOSS_WEBHOOK_SECRET: z.string().optional(),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default("brain180-artifacts"),
  R2_PUBLIC_BASE_URL: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:no-reply@brain180.app"),

  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be >= 16 chars"),
  SESSION_COOKIE_NAME: z.string().default("b180_session"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(720),
});

export type Env = z.infer<typeof Schema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = Schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function moonshotApiKey(): string | undefined {
  const e = loadEnv();
  return e.MOONSHOT_API_KEY ?? e.KIMI_API_KEY;
}

export function hasFeature(
  feature: "anthropic" | "kimi" | "openai" | "gemini" | "resend" | "toss" | "r2" | "push",
): boolean {
  const e = loadEnv();
  switch (feature) {
    case "anthropic":
      return Boolean(e.ANTHROPIC_API_KEY);
    case "kimi":
      return Boolean(e.MOONSHOT_API_KEY ?? e.KIMI_API_KEY);
    case "openai":
      return Boolean(e.OPENAI_API_KEY);
    case "gemini":
      return Boolean(e.GEMINI_API_KEY);
    case "resend":
      return Boolean(e.RESEND_API_KEY);
    case "toss":
      return Boolean(e.TOSS_SECRET_KEY && e.TOSS_CLIENT_KEY && e.TOSS_WEBHOOK_SECRET);
    case "r2":
      return Boolean(
        e.R2_ACCOUNT_ID && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY,
      );
    case "push":
      return Boolean(e.VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY);
  }
}
