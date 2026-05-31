-- api-contracts §2 (Library) DTO fields not present in 0001_init.
-- Two-phase pattern: add NOT NULL columns with DEFAULT so existing rows
-- backfill instantly, then later migrations can tighten constraints
-- (e.g. drop default once content pipeline always populates them).

-- ── modules ─────────────────────────────────────────────────────────
ALTER TABLE "modules"
  ADD COLUMN "slug" varchar(80) NOT NULL DEFAULT '',
  ADD COLUMN "field" varchar(40) NOT NULL DEFAULT 'literature',
  ADD COLUMN "difficulty" smallint NOT NULL DEFAULT 3,
  ADD COLUMN "axis_focus" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Empty-string slug collides if multiple modules pre-existed without a
-- slug. With zero existing rows in MVP simulation this is safe; on
-- production rollback path the unique index goes in only after backfill.
CREATE UNIQUE INDEX IF NOT EXISTS "modules_slug_idx" ON "modules" ("slug");
ALTER TABLE "modules"
  ADD CONSTRAINT "modules_difficulty_check"
  CHECK ("difficulty" >= 1 AND "difficulty" <= 5);

-- ── lessons ─────────────────────────────────────────────────────────
ALTER TABLE "lessons"
  ADD COLUMN "objectives" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "tutor_system_prompt_id" uuid
    REFERENCES "tutor_system_prompts"("id") ON DELETE SET NULL,
  ADD COLUMN "axis_focus" jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS "lessons_tutor_prompt_idx"
  ON "lessons" ("tutor_system_prompt_id");

-- ── text_excerpts ───────────────────────────────────────────────────
ALTER TABLE "text_excerpts"
  ADD COLUMN "title" varchar(200) NOT NULL DEFAULT '',
  ADD COLUMN "author" varchar(120) NOT NULL DEFAULT '',
  ADD COLUMN "source" varchar(200) NOT NULL DEFAULT '',
  ADD COLUMN "language" varchar(8) NOT NULL DEFAULT 'ko';

ALTER TABLE "text_excerpts"
  ADD CONSTRAINT "text_excerpts_language_check"
  CHECK ("language" IN ('ko', 'en'));
