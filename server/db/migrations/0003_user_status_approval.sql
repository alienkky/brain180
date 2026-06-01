-- api-contracts §1-6 + §5 (Admin) — user status + approval audit columns.
-- Two-phase pattern (NOT NULL + DEFAULT) so existing rows backfill in place.
-- Existing admin seed inserts with raw NOT NULL fields then the seed script
-- promotes status to 'approved' explicitly (idempotent).

CREATE TYPE "user_status" AS ENUM (
  'pending_approval',
  'approved',
  'rejected',
  'suspended'
);

ALTER TABLE "users"
  ADD COLUMN "status" "user_status" NOT NULL DEFAULT 'pending_approval',
  ADD COLUMN "approved_at" timestamp with time zone,
  ADD COLUMN "approved_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN "rejected_reason" text,
  ADD COLUMN "must_change_password" boolean NOT NULL DEFAULT false;

-- Existing rows (e.g. the admin seed inserted before this migration) move
-- to 'approved' so we don't surface ourselves on the pending list.
UPDATE "users" SET "status" = 'approved' WHERE "role" = 'admin';

CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users" ("status");
CREATE INDEX IF NOT EXISTS "users_approved_by_idx" ON "users" ("approved_by_id");
