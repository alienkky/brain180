CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE OR REPLACE FUNCTION uuid_v7()
RETURNS uuid
LANGUAGE sql
VOLATILE
AS $$
  SELECT encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(gen_random_uuid())
          placing substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
          from 1 for 6
        ),
        52,
        1
      ),
      53,
      1
    ),
    'hex'
  )::uuid;
$$;--> statement-breakpoint
CREATE TYPE "public"."api_provider" AS ENUM('claude', 'openai', 'kimi', 'gemini', 'ollama');--> statement-breakpoint
CREATE TYPE "public"."canvas_mode" AS ENUM('free', 'constrained', 'guided');--> statement-breakpoint
CREATE TYPE "public"."email_token_purpose" AS ENUM('verify', 'reset');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('not_started', 'active', 'completed', 'paused');--> statement-breakpoint
CREATE TYPE "public"."export_format" AS ENUM('pdf', 'png');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('female', 'male', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TYPE "public"."module_axis" AS ENUM('cognitive', 'value', 'time');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('card', 'kakao_pay', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'paid', 'failed', 'refunded', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."plan_name" AS ENUM('free', 'standard', 'premium');--> statement-breakpoint
CREATE TYPE "public"."reminder_channel" AS ENUM('push', 'email');--> statement-breakpoint
CREATE TYPE "public"."reminder_frequency" AS ENUM('daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."session_mode" AS ENUM('analyze', 'reverse', 'practice');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."tutor_message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'admin');--> statement-breakpoint
CREATE TABLE "api_costs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"provider" "api_provider" NOT NULL,
	"cost_usd" numeric(10, 6) NOT NULL,
	"tokens_used" integer,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_costs_tokens_used_check" CHECK ("api_costs"."tokens_used" IS NULL OR "api_costs"."tokens_used" >= 0)
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"user_id" uuid,
	"model" varchar(120) NOT NULL,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cost_krw" numeric(12, 4) DEFAULT '0' NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"session_id" uuid NOT NULL,
	"mode" "canvas_mode" NOT NULL,
	"payload" jsonb NOT NULL,
	"thumbnail_url" text,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "canvas_exports" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"format" "export_format" NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_tokens" (
	"token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "email_token_purpose" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"user_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'not_started' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "enrollments_user_id_module_id_pk" PRIMARY KEY("user_id","module_id"),
	CONSTRAINT "enrollments_progress_check" CHECK ("enrollments"."progress" >= 0 AND "enrollments"."progress" <= 100)
);
--> statement-breakpoint
CREATE TABLE "group_classes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"name" varchar(160) NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "growth_reports" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"user_id" uuid,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"axis_cognitive_score" numeric(5, 2) NOT NULL,
	"axis_value_score" numeric(5, 2) NOT NULL,
	"axis_time_score" numeric(5, 2) NOT NULL,
	"summary" text NOT NULL,
	"is_anonymized" boolean DEFAULT false NOT NULL,
	"anonymized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "growth_reports_period_check" CHECK ("growth_reports"."period_start" <= "growth_reports"."period_end"),
	CONSTRAINT "growth_reports_cognitive_score_check" CHECK ("growth_reports"."axis_cognitive_score" >= 0 AND "growth_reports"."axis_cognitive_score" <= 100),
	CONSTRAINT "growth_reports_value_score_check" CHECK ("growth_reports"."axis_value_score" >= 0 AND "growth_reports"."axis_value_score" <= 100),
	CONSTRAINT "growth_reports_time_score_check" CHECK ("growth_reports"."axis_time_score" >= 0 AND "growth_reports"."axis_time_score" <= 100)
);
--> statement-breakpoint
CREATE TABLE "learning_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"perspective" "module_axis",
	"mode" "session_mode" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"text_source" text NOT NULL,
	"source_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_prerequisites" (
	"module_id" uuid NOT NULL,
	"prerequisite_module_id" uuid NOT NULL,
	CONSTRAINT "module_prerequisites_module_id_prerequisite_module_id_pk" PRIMARY KEY("module_id","prerequisite_module_id"),
	CONSTRAINT "module_prerequisites_no_self_check" CHECK ("module_prerequisites"."module_id" <> "module_prerequisites"."prerequisite_module_id")
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"title" varchar(200) NOT NULL,
	"axis" "module_axis" NOT NULL,
	"order" integer NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(80) NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"user_id" uuid NOT NULL,
	"provider" varchar(40) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_accounts_provider_provider_user_id_pk" PRIMARY KEY("provider","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"plan_name" "plan_name",
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'KRW' NOT NULL,
	"method" "payment_method" NOT NULL,
	"toss_payment_key" text,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"name" "plan_name" NOT NULL,
	"price_krw" integer DEFAULT 0 NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_rule_channels" (
	"reminder_rule_id" uuid NOT NULL,
	"channel" "reminder_channel" NOT NULL,
	CONSTRAINT "reminder_rule_channels_reminder_rule_id_channel_pk" PRIMARY KEY("reminder_rule_id","channel")
);
--> statement-breakpoint
CREATE TABLE "reminder_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"frequency" "reminder_frequency" NOT NULL,
	"time_of_day" time NOT NULL,
	"timezone" varchar(80) DEFAULT 'Asia/Seoul' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"self_score" integer NOT NULL,
	"score" integer,
	"node_count" integer,
	"edge_count" integer,
	"free_text" text,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_evaluations_self_score_check" CHECK ("session_evaluations"."self_score" >= 1 AND "session_evaluations"."self_score" <= 5),
	CONSTRAINT "session_evaluations_score_check" CHECK ("session_evaluations"."score" IS NULL OR ("session_evaluations"."score" >= 0 AND "session_evaluations"."score" <= 100)),
	CONSTRAINT "session_evaluations_node_count_check" CHECK ("session_evaluations"."node_count" IS NULL OR "session_evaluations"."node_count" >= 0),
	CONSTRAINT "session_evaluations_edge_count_check" CHECK ("session_evaluations"."edge_count" IS NULL OR "session_evaluations"."edge_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"toss_billing_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "text_excerpts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"content" text NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_messages" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "tutor_message_role" NOT NULL,
	"content" text NOT NULL,
	"model" varchar(120),
	"prompt_version" varchar(80),
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer,
	"rating" integer,
	"rejected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutor_messages_rating_check" CHECK ("tutor_messages"."rating" IS NULL OR ("tutor_messages"."rating" >= 1 AND "tutor_messages"."rating" <= 5)),
	CONSTRAINT "tutor_messages_latency_ms_check" CHECK ("tutor_messages"."latency_ms" IS NULL OR "tutor_messages"."latency_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tutor_ratings" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"stars" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutor_ratings_stars_check" CHECK ("tutor_ratings"."stars" >= 1 AND "tutor_ratings"."stars" <= 5)
);
--> statement-breakpoint
CREATE TABLE "tutor_system_prompts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"name" varchar(160) NOT NULL,
	"version" varchar(40) NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_v7() NOT NULL,
	"email" varchar(320) NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_hash" text,
	"name" varchar(120) NOT NULL,
	"gender" "gender",
	"age" integer,
	"occupation" varchar(160),
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_age_check" CHECK ("users"."age" IS NULL OR ("users"."age" >= 0 AND "users"."age" <= 120))
);
--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_artifacts" ADD CONSTRAINT "canvas_artifacts_session_id_learning_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_exports" ADD CONSTRAINT "canvas_exports_artifact_id_canvas_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."canvas_artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_classes" ADD CONSTRAINT "group_classes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_group_classes_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_reports" ADD CONSTRAINT "growth_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_prerequisites" ADD CONSTRAINT "module_prerequisites_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_prerequisites" ADD CONSTRAINT "module_prerequisites_prerequisite_module_id_modules_id_fk" FOREIGN KEY ("prerequisite_module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_rule_channels" ADD CONSTRAINT "reminder_rule_channels_reminder_rule_id_reminder_rules_id_fk" FOREIGN KEY ("reminder_rule_id") REFERENCES "public"."reminder_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_rules" ADD CONSTRAINT "reminder_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_evaluations" ADD CONSTRAINT "session_evaluations_session_id_learning_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_evaluations" ADD CONSTRAINT "session_evaluations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_excerpts" ADD CONSTRAINT "text_excerpts_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_messages" ADD CONSTRAINT "tutor_messages_session_id_learning_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_ratings" ADD CONSTRAINT "tutor_ratings_message_id_tutor_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."tutor_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_ratings" ADD CONSTRAINT "tutor_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_costs_recorded_at_idx" ON "api_costs" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "api_costs_provider_recorded_at_idx" ON "api_costs" USING btree ("provider","recorded_at");--> statement-breakpoint
CREATE INDEX "api_usage_logs_user_ts_idx" ON "api_usage_logs" USING btree ("user_id","ts");--> statement-breakpoint
CREATE INDEX "api_usage_logs_model_ts_idx" ON "api_usage_logs" USING btree ("model","ts");--> statement-breakpoint
CREATE INDEX "canvas_artifacts_session_saved_idx" ON "canvas_artifacts" USING btree ("session_id","saved_at");--> statement-breakpoint
CREATE INDEX "canvas_exports_artifact_format_idx" ON "canvas_exports" USING btree ("artifact_id","format");--> statement-breakpoint
CREATE INDEX "email_tokens_user_purpose_idx" ON "email_tokens" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "email_tokens_expires_at_idx" ON "email_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "enrollments_module_status_idx" ON "enrollments" USING btree ("module_id","status");--> statement-breakpoint
CREATE INDEX "group_classes_owner_idx" ON "group_classes" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "group_members_user_idx" ON "group_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "growth_reports_user_period_idx" ON "growth_reports" USING btree ("user_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "growth_reports_anonymized_idx" ON "growth_reports" USING btree ("is_anonymized");--> statement-breakpoint
CREATE INDEX "learning_sessions_started_at_idx" ON "learning_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "learning_sessions_user_started_idx" ON "learning_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "learning_sessions_lesson_mode_idx" ON "learning_sessions" USING btree ("lesson_id","mode");--> statement-breakpoint
CREATE INDEX "learning_sessions_lesson_id_idx" ON "learning_sessions" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "learning_sessions_perspective_idx" ON "learning_sessions" USING btree ("perspective");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_module_order_idx" ON "lessons" USING btree ("module_id","order");--> statement-breakpoint
CREATE INDEX "module_prerequisites_prerequisite_idx" ON "module_prerequisites" USING btree ("prerequisite_module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "modules_axis_order_idx" ON "modules" USING btree ("axis","order");--> statement-breakpoint
CREATE INDEX "modules_is_locked_idx" ON "modules" USING btree ("is_locked");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_user_paid_at_idx" ON "payments" USING btree ("user_id","paid_at");--> statement-breakpoint
CREATE INDEX "payments_status_created_idx" ON "payments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "payments_plan_name_idx" ON "payments" USING btree ("plan_name");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_toss_payment_key_idx" ON "payments" USING btree ("toss_payment_key");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_name_idx" ON "plans" USING btree ("name");--> statement-breakpoint
CREATE INDEX "reminder_rules_user_active_idx" ON "reminder_rules" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "session_evaluations_session_idx" ON "session_evaluations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_evaluations_score_idx" ON "session_evaluations" USING btree ("score");--> statement-breakpoint
CREATE INDEX "session_evaluations_created_at_idx" ON "session_evaluations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "session_evaluations_user_saved_idx" ON "session_evaluations" USING btree ("user_id","saved_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "subscriptions_user_status_idx" ON "subscriptions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "text_excerpts_lesson_order_idx" ON "text_excerpts" USING btree ("lesson_id","order");--> statement-breakpoint
CREATE INDEX "tutor_messages_session_created_idx" ON "tutor_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "tutor_messages_role_created_idx" ON "tutor_messages" USING btree ("role","created_at");--> statement-breakpoint
CREATE INDEX "tutor_messages_prompt_version_idx" ON "tutor_messages" USING btree ("prompt_version");--> statement-breakpoint
CREATE INDEX "tutor_messages_assistant_latency_idx" ON "tutor_messages" USING btree ("latency_ms") WHERE "tutor_messages"."role" = 'assistant';--> statement-breakpoint
CREATE INDEX "tutor_messages_assistant_rejected_idx" ON "tutor_messages" USING btree ("created_at") WHERE "tutor_messages"."role" = 'assistant' AND "tutor_messages"."rejected" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "tutor_ratings_message_user_idx" ON "tutor_ratings" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX "tutor_ratings_user_created_idx" ON "tutor_ratings" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tutor_system_prompts_name_version_idx" ON "tutor_system_prompts" USING btree ("name","version");--> statement-breakpoint
CREATE INDEX "tutor_system_prompts_active_idx" ON "tutor_system_prompts" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_verified_at_idx" ON "users" USING btree ("email_verified_at");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");
