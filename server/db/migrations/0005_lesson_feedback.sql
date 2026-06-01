-- v1 FeedbackPanel 부활 — 학습자가 레슨에 대해 짧은 피드백 + 1~5점을 남김.
-- 익명 옵션은 client name 필드를 빈 문자열로 보내는 식으로 처리 (DB 자체는
-- 항상 작성자 user_id 를 보관, 표시 시점에 익명화 가능).
CREATE TABLE IF NOT EXISTS "lesson_feedback" (
  "id" uuid PRIMARY KEY DEFAULT uuid_v7(),
  "lesson_id" uuid NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "display_name" varchar(80) NOT NULL DEFAULT '',
  "content" text NOT NULL,
  "rating" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "lesson_feedback_rating_check"
    CHECK ("rating" >= 0 AND "rating" <= 5)
);

CREATE INDEX IF NOT EXISTS "lesson_feedback_lesson_created_idx"
  ON "lesson_feedback" ("lesson_id", "created_at" DESC);

-- 한 유저가 한 레슨에 *여러* 피드백 쓸 수 있는가? v1 동작은 다중 허용.
-- 도배 방지는 서버 레벨 rate-limit + 콘텐츠 길이 검증으로.
