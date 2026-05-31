-- api-contracts §8-2 — APIUsageLog audit shape.
-- Drops plaintext user_id (privacy), adds provider / anonymized_user_id /
-- latency_ms / status / error_code, renames ts → created_at.
-- cost_krw kept for ops reporting (not in contracts §8-2 but useful).
-- Indexes rebuilt around new columns.

-- Drop FK + plaintext column (replaced by anonymized_user_id per §8-2).
ALTER TABLE "api_usage_logs"
  DROP CONSTRAINT IF EXISTS "api_usage_logs_user_id_users_id_fk";
ALTER TABLE "api_usage_logs" DROP COLUMN IF EXISTS "user_id";

-- Rename ts → created_at per contracts §8-2.
ALTER TABLE "api_usage_logs" RENAME COLUMN "ts" TO "created_at";

-- New audit columns.
ALTER TABLE "api_usage_logs"
  ADD COLUMN "provider" varchar(32) NOT NULL DEFAULT 'anthropic',
  ADD COLUMN "anonymized_user_id" varchar(128),
  ADD COLUMN "latency_ms" integer NOT NULL DEFAULT 0,
  ADD COLUMN "status" varchar(16) NOT NULL DEFAULT 'ok',
  ADD COLUMN "error_code" varchar(64);

-- Drop old indexes that referenced ts / user_id.
DROP INDEX IF EXISTS "api_usage_logs_user_ts_idx";
DROP INDEX IF EXISTS "api_usage_logs_model_ts_idx";

-- New indexes per §8-2 read patterns: per-user telemetry + per-model rollups
-- + error triage.
CREATE INDEX IF NOT EXISTS "api_usage_logs_anon_user_created_idx"
  ON "api_usage_logs" ("anonymized_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "api_usage_logs_provider_model_created_idx"
  ON "api_usage_logs" ("provider", "model", "created_at");
CREATE INDEX IF NOT EXISTS "api_usage_logs_status_created_idx"
  ON "api_usage_logs" ("status", "created_at");
