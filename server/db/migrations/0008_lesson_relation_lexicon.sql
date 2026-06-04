-- 0008_lesson_relation_lexicon.sql
-- Adds per-lesson relation lexicon so the canvas relation buttons can show
-- the author's own connective vocabulary instead of a fixed 5-button enum.
-- See: docs/decisions.md → "Lesson-bound relation lexicon" decision.

DO $$ BEGIN
  CREATE TYPE "lexicon_source" AS ENUM ('manual', 'kimi', 'claude');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "lessons"
  ADD COLUMN IF NOT EXISTS "relation_lexicon" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "lessons"
  ADD COLUMN IF NOT EXISTS "lexicon_extracted_at" timestamptz NULL;

ALTER TABLE "lessons"
  ADD COLUMN IF NOT EXISTS "lexicon_source" "lexicon_source" NULL;
