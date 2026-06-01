import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const id = (name = "id") => uuid(name).primaryKey().default(sql`uuid_v7()`);
const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const deletedAt = timestamp("deleted_at", { withTimezone: true });

export const userRoleEnum = pgEnum("user_role", ["student", "admin"]);
export const userStatusEnum = pgEnum("user_status", [
  "pending_approval",
  "approved",
  "rejected",
  "suspended",
]);
export const genderEnum = pgEnum("gender", ["female", "male", "other", "prefer_not_to_say"]);
export const emailTokenPurposeEnum = pgEnum("email_token_purpose", ["verify", "reset"]);
export const planNameEnum = pgEnum("plan_name", ["free", "standard", "premium"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["card", "kakao_pay", "bank_transfer"]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "success",
  "paid",
  "failed",
  "refunded",
  "canceled",
]);
export const moduleAxisEnum = pgEnum("module_axis", ["cognitive", "value", "time"]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", ["not_started", "active", "completed", "paused"]);
export const sessionModeEnum = pgEnum("session_mode", ["analyze", "reverse", "practice"]);
export const canvasModeEnum = pgEnum("canvas_mode", ["free", "constrained", "guided"]);
export const exportFormatEnum = pgEnum("export_format", ["pdf", "png"]);
export const tutorMessageRoleEnum = pgEnum("tutor_message_role", ["user", "assistant", "system"]);
export const reminderFrequencyEnum = pgEnum("reminder_frequency", ["daily", "weekly"]);
export const reminderChannelEnum = pgEnum("reminder_channel", ["push", "email"]);
export const apiProviderEnum = pgEnum("api_provider", ["claude", "openai", "kimi", "gemini", "ollama"]);

export const users = pgTable(
  "users",
  {
    id: id(),
    email: varchar("email", { length: 320 }).notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    passwordHash: text("password_hash"),
    name: varchar("name", { length: 120 }).notNull(),
    gender: genderEnum("gender"),
    age: integer("age"),
    occupation: varchar("occupation", { length: 160 }),
    role: userRoleEnum("role").notNull().default("student"),
    status: userStatusEnum("status").notNull().default("pending_approval"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedById: uuid("approved_by_id").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    rejectedReason: text("rejected_reason"),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt),
    verifiedAtIdx: index("users_verified_at_idx").on(table.emailVerifiedAt),
    roleIdx: index("users_role_idx").on(table.role),
    statusIdx: index("users_status_idx").on(table.status),
    approvedByIdx: index("users_approved_by_idx").on(table.approvedById),
    deletedAtIdx: index("users_deleted_at_idx").on(table.deletedAt),
    ageCheck: check("users_age_check", sql`${table.age} IS NULL OR (${table.age} >= 0 AND ${table.age} <= 120)`),
  }),
);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 40 }).notNull(),
    providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
    createdAt,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerUserId] }),
    userIdx: index("oauth_accounts_user_id_idx").on(table.userId),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt,
  },
  (table) => ({
    userIdx: index("sessions_user_id_idx").on(table.userId),
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
  }),
);

export const emailTokens = pgTable(
  "email_tokens",
  {
    token: varchar("token", { length: 255 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: emailTokenPurposeEnum("purpose").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt,
  },
  (table) => ({
    userPurposeIdx: index("email_tokens_user_purpose_idx").on(table.userId, table.purpose),
    expiresAtIdx: index("email_tokens_expires_at_idx").on(table.expiresAt),
  }),
);

export const plans = pgTable(
  "plans",
  {
    id: id(),
    name: planNameEnum("name").notNull(),
    priceKrw: integer("price_krw").notNull().default(0),
    features: jsonb("features").$type<Record<string, unknown>>().notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => ({
    nameIdx: uniqueIndex("plans_name_idx").on(table.name),
  }),
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    tossBillingKey: text("toss_billing_key"),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => ({
    userStatusIdx: index("subscriptions_user_status_idx").on(table.userId, table.status),
    planIdx: index("subscriptions_plan_id_idx").on(table.planId),
  }),
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    planName: planNameEnum("plan_name"),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("KRW"),
    method: paymentMethodEnum("method").notNull(),
    tossPaymentKey: text("toss_payment_key"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt,
  },
  (table) => ({
    userIdx: index("payments_user_id_idx").on(table.userId),
    userPaidAtIdx: index("payments_user_paid_at_idx").on(table.userId, table.paidAt),
    statusCreatedIdx: index("payments_status_created_idx").on(table.status, table.createdAt),
    planNameIdx: index("payments_plan_name_idx").on(table.planName),
    tossPaymentKeyIdx: uniqueIndex("payments_toss_payment_key_idx").on(table.tossPaymentKey),
  }),
);

export interface AxisWeights {
  cognition: number;
  value: number;
  time: number;
}

export const modules = pgTable(
  "modules",
  {
    id: id(),
    title: varchar("title", { length: 200 }).notNull(),
    axis: moduleAxisEnum("axis").notNull(),
    order: integer("order").notNull(),
    isLocked: boolean("is_locked").notNull().default(false),
    description: text("description"),
    slug: varchar("slug", { length: 80 }).notNull().default(""),
    field: varchar("field", { length: 40 }).notNull().default("literature"),
    difficulty: integer("difficulty").notNull().default(3),
    axisFocus: jsonb("axis_focus").$type<AxisWeights | Record<string, never>>().notNull().default({}),
    createdAt,
    updatedAt,
  },
  (table) => ({
    axisOrderIdx: uniqueIndex("modules_axis_order_idx").on(table.axis, table.order),
    lockedIdx: index("modules_is_locked_idx").on(table.isLocked),
    slugIdx: uniqueIndex("modules_slug_idx").on(table.slug),
    difficultyCheck: check("modules_difficulty_check", sql`${table.difficulty} >= 1 AND ${table.difficulty} <= 5`),
  }),
);

export const modulePrerequisites = pgTable(
  "module_prerequisites",
  {
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    prerequisiteModuleId: uuid("prerequisite_module_id")
      .notNull()
      .references((): AnyPgColumn => modules.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.moduleId, table.prerequisiteModuleId] }),
    prerequisiteIdx: index("module_prerequisites_prerequisite_idx").on(table.prerequisiteModuleId),
    noSelfPrerequisiteCheck: check(
      "module_prerequisites_no_self_check",
      sql`${table.moduleId} <> ${table.prerequisiteModuleId}`,
    ),
  }),
);

export const lessons = pgTable(
  "lessons",
  {
    id: id(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    textSource: text("text_source").notNull(),
    sourceMeta: jsonb("source_meta").$type<Record<string, unknown>>().notNull().default({}),
    order: integer("order").notNull(),
    objectives: jsonb("objectives").$type<string[]>().notNull().default([]),
    tutorSystemPromptId: uuid("tutor_system_prompt_id").references(
      (): AnyPgColumn => tutorSystemPrompts.id,
      { onDelete: "set null" },
    ),
    axisFocus: jsonb("axis_focus").$type<AxisWeights | Record<string, never>>().notNull().default({}),
    createdAt,
    updatedAt,
  },
  (table) => ({
    moduleOrderIdx: uniqueIndex("lessons_module_order_idx").on(table.moduleId, table.order),
    tutorPromptIdx: index("lessons_tutor_prompt_idx").on(table.tutorSystemPromptId),
  }),
);

export const textExcerpts = pgTable(
  "text_excerpts",
  {
    id: id(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    highlights: jsonb("highlights").$type<Array<Record<string, unknown>>>().notNull().default([]),
    order: integer("order").notNull().default(0),
    title: varchar("title", { length: 200 }).notNull().default(""),
    author: varchar("author", { length: 120 }).notNull().default(""),
    source: varchar("source", { length: 200 }).notNull().default(""),
    language: varchar("language", { length: 8 }).notNull().default("ko"),
    createdAt,
  },
  (table) => ({
    lessonOrderIdx: index("text_excerpts_lesson_order_idx").on(table.lessonId, table.order),
    languageCheck: check("text_excerpts_language_check", sql`${table.language} IN ('ko', 'en')`),
  }),
);

export const enrollments = pgTable(
  "enrollments",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    status: enrollmentStatusEnum("status").notNull().default("not_started"),
    progress: integer("progress").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt,
    deletedAt,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.moduleId] }),
    moduleStatusIdx: index("enrollments_module_status_idx").on(table.moduleId, table.status),
    progressCheck: check("enrollments_progress_check", sql`${table.progress} >= 0 AND ${table.progress} <= 100`),
  }),
);

export const learningSessions = pgTable(
  "learning_sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "restrict" }),
    perspective: moduleAxisEnum("perspective"),
    mode: sessionModeEnum("mode").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    deletedAt,
  },
  (table) => ({
    startedAtIdx: index("learning_sessions_started_at_idx").on(table.startedAt),
    userStartedIdx: index("learning_sessions_user_started_idx").on(table.userId, table.startedAt),
    lessonModeIdx: index("learning_sessions_lesson_mode_idx").on(table.lessonId, table.mode),
    lessonIdx: index("learning_sessions_lesson_id_idx").on(table.lessonId),
    perspectiveIdx: index("learning_sessions_perspective_idx").on(table.perspective),
  }),
);

export const canvasArtifacts = pgTable(
  "canvas_artifacts",
  {
    id: id(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => learningSessions.id, { onDelete: "cascade" }),
    mode: canvasModeEnum("mode").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    thumbnailUrl: text("thumbnail_url"),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt,
  },
  (table) => ({
    sessionSavedIdx: index("canvas_artifacts_session_saved_idx").on(table.sessionId, table.savedAt),
  }),
);

export const canvasExports = pgTable(
  "canvas_exports",
  {
    id: id(),
    artifactId: uuid("artifact_id")
      .notNull()
      .references(() => canvasArtifacts.id, { onDelete: "cascade" }),
    format: exportFormatEnum("format").notNull(),
    url: text("url").notNull(),
    createdAt,
  },
  (table) => ({
    artifactFormatIdx: index("canvas_exports_artifact_format_idx").on(table.artifactId, table.format),
  }),
);

export const tutorSystemPrompts = pgTable(
  "tutor_system_prompts",
  {
    id: id(),
    name: varchar("name", { length: 160 }).notNull(),
    version: varchar("version", { length: 40 }).notNull(),
    content: text("content").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => ({
    nameVersionIdx: uniqueIndex("tutor_system_prompts_name_version_idx").on(table.name, table.version),
    activeIdx: index("tutor_system_prompts_active_idx").on(table.isActive),
  }),
);

export const tutorMessages = pgTable(
  "tutor_messages",
  {
    id: id(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => learningSessions.id, { onDelete: "cascade" }),
    role: tutorMessageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    model: varchar("model", { length: 120 }),
    promptVersion: varchar("prompt_version", { length: 80 }),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    tokens: integer("tokens").notNull().default(0),
    latencyMs: integer("latency_ms"),
    rating: integer("rating"),
    rejected: boolean("rejected").notNull().default(false),
    createdAt,
  },
  (table) => ({
    sessionCreatedIdx: index("tutor_messages_session_created_idx").on(table.sessionId, table.createdAt),
    roleCreatedIdx: index("tutor_messages_role_created_idx").on(table.role, table.createdAt),
    promptVersionIdx: index("tutor_messages_prompt_version_idx").on(table.promptVersion),
    assistantLatencyIdx: index("tutor_messages_assistant_latency_idx")
      .on(table.latencyMs)
      .where(sql`${table.role} = 'assistant'`),
    assistantRejectedIdx: index("tutor_messages_assistant_rejected_idx")
      .on(table.createdAt)
      .where(sql`${table.role} = 'assistant' AND ${table.rejected} = true`),
    ratingCheck: check("tutor_messages_rating_check", sql`${table.rating} IS NULL OR (${table.rating} >= 1 AND ${table.rating} <= 5)`),
    latencyCheck: check("tutor_messages_latency_ms_check", sql`${table.latencyMs} IS NULL OR ${table.latencyMs} >= 0`),
  }),
);

export const tutorRatings = pgTable(
  "tutor_ratings",
  {
    id: id(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => tutorMessages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(),
    comment: text("comment"),
    createdAt,
  },
  (table) => ({
    messageUserIdx: uniqueIndex("tutor_ratings_message_user_idx").on(table.messageId, table.userId),
    userCreatedIdx: index("tutor_ratings_user_created_idx").on(table.userId, table.createdAt),
    starsCheck: check("tutor_ratings_stars_check", sql`${table.stars} >= 1 AND ${table.stars} <= 5`),
  }),
);

export const sessionEvaluations = pgTable(
  "session_evaluations",
  {
    id: id(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => learningSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    selfScore: integer("self_score").notNull(),
    score: integer("score"),
    nodeCount: integer("node_count"),
    edgeCount: integer("edge_count"),
    freeText: text("free_text"),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt,
  },
  (table) => ({
    sessionIdx: uniqueIndex("session_evaluations_session_idx").on(table.sessionId),
    scoreIdx: index("session_evaluations_score_idx").on(table.score),
    createdAtIdx: index("session_evaluations_created_at_idx").on(table.createdAt),
    userSavedIdx: index("session_evaluations_user_saved_idx").on(table.userId, table.savedAt),
    selfScoreCheck: check(
      "session_evaluations_self_score_check",
      sql`${table.selfScore} >= 1 AND ${table.selfScore} <= 5`,
    ),
    scoreCheck: check("session_evaluations_score_check", sql`${table.score} IS NULL OR (${table.score} >= 0 AND ${table.score} <= 100)`),
    nodeCountCheck: check("session_evaluations_node_count_check", sql`${table.nodeCount} IS NULL OR ${table.nodeCount} >= 0`),
    edgeCountCheck: check("session_evaluations_edge_count_check", sql`${table.edgeCount} IS NULL OR ${table.edgeCount} >= 0`),
  }),
);

export const apiCosts = pgTable(
  "api_costs",
  {
    id: id(),
    provider: apiProviderEnum("provider").notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull(),
    tokensUsed: integer("tokens_used"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    recordedAtIdx: index("api_costs_recorded_at_idx").on(table.recordedAt),
    providerRecordedAtIdx: index("api_costs_provider_recorded_at_idx").on(table.provider, table.recordedAt),
    tokensUsedCheck: check("api_costs_tokens_used_check", sql`${table.tokensUsed} IS NULL OR ${table.tokensUsed} >= 0`),
  }),
);

export const growthReports = pgTable(
  "growth_reports",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    axisCognitiveScore: numeric("axis_cognitive_score", { precision: 5, scale: 2 }).notNull(),
    axisValueScore: numeric("axis_value_score", { precision: 5, scale: 2 }).notNull(),
    axisTimeScore: numeric("axis_time_score", { precision: 5, scale: 2 }).notNull(),
    summary: text("summary").notNull(),
    isAnonymized: boolean("is_anonymized").notNull().default(false),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
    createdAt,
  },
  (table) => ({
    userPeriodIdx: index("growth_reports_user_period_idx").on(table.userId, table.periodStart, table.periodEnd),
    anonymizedIdx: index("growth_reports_anonymized_idx").on(table.isAnonymized),
    periodCheck: check("growth_reports_period_check", sql`${table.periodStart} <= ${table.periodEnd}`),
    cognitiveScoreCheck: check(
      "growth_reports_cognitive_score_check",
      sql`${table.axisCognitiveScore} >= 0 AND ${table.axisCognitiveScore} <= 100`,
    ),
    valueScoreCheck: check(
      "growth_reports_value_score_check",
      sql`${table.axisValueScore} >= 0 AND ${table.axisValueScore} <= 100`,
    ),
    timeScoreCheck: check(
      "growth_reports_time_score_check",
      sql`${table.axisTimeScore} >= 0 AND ${table.axisTimeScore} <= 100`,
    ),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 80 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt,
    deletedAt,
  },
  (table) => ({
    userReadIdx: index("notifications_user_read_idx").on(table.userId, table.readAt),
    userCreatedIdx: index("notifications_user_created_idx").on(table.userId, table.createdAt),
  }),
);

export const reminderRules = pgTable(
  "reminder_rules",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    frequency: reminderFrequencyEnum("frequency").notNull(),
    timeOfDay: time("time_of_day").notNull(),
    timezone: varchar("timezone", { length: 80 }).notNull().default("Asia/Seoul"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => ({
    userActiveIdx: index("reminder_rules_user_active_idx").on(table.userId, table.isActive),
  }),
);

export const reminderRuleChannels = pgTable(
  "reminder_rule_channels",
  {
    reminderRuleId: uuid("reminder_rule_id")
      .notNull()
      .references(() => reminderRules.id, { onDelete: "cascade" }),
    channel: reminderChannelEnum("channel").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.reminderRuleId, table.channel] }),
  }),
);

export const groupClasses = pgTable(
  "group_classes",
  {
    id: id(),
    name: varchar("name", { length: 160 }).notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => ({
    ownerIdx: index("group_classes_owner_idx").on(table.ownerId),
  }),
);

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groupClasses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupId, table.userId] }),
    userIdx: index("group_members_user_idx").on(table.userId),
  }),
);

export const apiUsageLogs = pgTable(
  "api_usage_logs",
  {
    id: id(),
    provider: varchar("provider", { length: 32 }).notNull().default("anthropic"),
    model: varchar("model", { length: 120 }).notNull(),
    anonymizedUserId: varchar("anonymized_user_id", { length: 128 }),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    status: varchar("status", { length: 16 }).notNull().default("ok"),
    errorCode: varchar("error_code", { length: 64 }),
    costKrw: numeric("cost_krw", { precision: 12, scale: 4 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    anonUserCreatedIdx: index("api_usage_logs_anon_user_created_idx").on(
      table.anonymizedUserId,
      table.createdAt,
    ),
    providerModelCreatedIdx: index("api_usage_logs_provider_model_created_idx").on(
      table.provider,
      table.model,
      table.createdAt,
    ),
    statusCreatedIdx: index("api_usage_logs_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export const lessonFeedback = pgTable(
  "lesson_feedback",
  {
    id: id(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 80 }).notNull().default(""),
    content: text("content").notNull(),
    rating: integer("rating").notNull().default(0),
    createdAt,
  },
  (table) => ({
    lessonCreatedIdx: index("lesson_feedback_lesson_created_idx").on(
      table.lessonId,
      table.createdAt,
    ),
    ratingCheck: check(
      "lesson_feedback_rating_check",
      sql`${table.rating} >= 0 AND ${table.rating} <= 5`,
    ),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
