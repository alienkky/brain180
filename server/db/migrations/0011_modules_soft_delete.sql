-- 0011_modules_soft_delete.sql
-- 모듈 소프트 삭제. 학습 자료(레슨/세션/아티팩트)를 보존하면서 모듈을 숨기고
-- 필요 시 복원할 수 있게 한다. 기존에는 레슨(숨김 포함)이 하나라도 있으면
-- 모듈 삭제가 영구 차단됐다.
-- axis/order, slug 유니크 인덱스는 살아있는 모듈에만 적용되도록 부분 인덱스로
-- 교체 — 숨긴 모듈이 순서/슬러그 자리를 막아 새 모듈 생성이 실패하는 것 방지.

ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
DROP INDEX IF EXISTS "modules_axis_order_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "modules_axis_order_idx" ON "modules" ("axis", "order") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "modules_slug_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "modules_slug_idx" ON "modules" ("slug") WHERE "deleted_at" IS NULL;
