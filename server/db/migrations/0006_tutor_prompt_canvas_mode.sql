-- Migration 0006: add canvas_mode to tutor_system_prompts + seed 3 mode-specific prompts
-- ALI-81: canvas mode selection

ALTER TABLE "tutor_system_prompts" ADD COLUMN IF NOT EXISTS "mode" "canvas_mode";
CREATE INDEX IF NOT EXISTS "tutor_system_prompts_mode_idx" ON "tutor_system_prompts" ("mode");
