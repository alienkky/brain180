-- Admin moderation for learner lesson feedback.
ALTER TABLE "lesson_feedback"
  ADD COLUMN IF NOT EXISTS "is_hidden" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hidden_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "admin_reply" text,
  ADD COLUMN IF NOT EXISTS "admin_replied_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "admin_replied_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "lesson_feedback_moderation_idx"
  ON "lesson_feedback" ("deleted_at", "is_hidden", "created_at" DESC);
