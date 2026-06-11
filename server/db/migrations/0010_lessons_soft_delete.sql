-- 0010_lessons_soft_delete.sql
-- 레슨 소프트 삭제. learning_sessions.lesson_id 가 onDelete:restrict 라
-- 학습 이력이 있는 레슨은 하드 삭제가 불가능 — deleted_at 으로 숨김 처리하고
-- 학생 학습 기록은 보존한다.
-- (module_id, order) 유니크 인덱스는 살아있는 레슨에만 적용되도록 부분 인덱스로
-- 교체 — 숨긴 레슨이 순서 자리를 계속 차지하면 새 레슨 생성이 막힌다.

ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
DROP INDEX IF EXISTS "lessons_module_order_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lessons_module_order_idx" ON "lessons" ("module_id", "order") WHERE "deleted_at" IS NULL;
