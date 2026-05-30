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
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed", "refunded", "canceled"]);
export const moduleAxisEnum = pgEnum("module_axis", ["cognitive", "value", "time"]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", ["not_started", "active", "completed", "paused"]);
export const sessionModeEnum = pgEnum("session_mode", ["analyze", "reverse", "practice"]);
export const canvasModeEnum = pgEnum("canvas_mode", ["free", "constrained", "guided"]);
export const exportFormatEnum = pgEnum("export_format", ["pdf", "png"]);
export const tutorMessageRoleEnum = pgEnum("tutor_message_role", ["user", "assistant", "system"]);
export const reminderFrequencyEnum = pgEnum("reminder_frequency", ["daily", "weekly"]);
export const reminderChannelEnum = pgEnum("reminder_channel", ["push", "email"]);

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
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
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
    amount: integer("amount").notNull(),
    method: paymentMethodEnum("method").notNull(),
    tossPaymentKey: text("toss_payment_key"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt,
  },
  (table) => ({
    userPaidAtIdx: index("payments_user_paid_at_idx").on(table.userId, table.paidAt),
    tossPaymentKeyIdx: uniqueIndex("payments_toss_payment_key_idx").on(table.tossPaymentKey),
  }),
);

export const modules = pgTable(
  "modules",
  {
    id: id(),
    title: varchar("title", { length: 200 }).notNull(),
    axis: moduleAxisEnum("axis").notNull(),
    order: integer("order").notNull(),
    isLocked: boolean("is_locked").notNull().default(false),
    description: text("description"),
    createdAt,
    updatedAt,
  },
  (table) => ({
    axisOrderIdx: uniqueIndex("modules_axis_order_idx").on(table.axis, table.order),
    lockedIdx: index("modules_is_locked_idx").on(table.isLocked),
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
    createdAt,
    updatedAt,
  },
  (table) => ({
    moduleOrderIdx: uniqueIndex("lessons_module_order_idx").on(table.moduleId, table.order),
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
    createdAt,
  },
  (table) => ({
    lessonOrderIdx: index("text_excerpts_lesson_order_idx").on(table.lessonId, table.order),
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
    mode: sessionModeEnum("mode").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    deletedAt,
  },
  (table) => ({
    userStartedIdx: index("learning_sessions_user_started_idx").on(table.userId, table.startedAt),
    lessonModeIdx: index("learning_sessions_lesson_mode_idx").on(table.lessonId, table.mode),
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
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    createdAt,
  },
  (table) => ({
    sessionCreatedIdx: index("tutor_messages_session_created_idx").on(table.sessionId, table.createdAt),
    roleCreatedIdx: index("tutor_messages_role_created_idx").on(table.role, table.createdAt),
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
    freeText: text("free_text"),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: uniqueIndex("session_evaluations_session_idx").on(table.sessionId),
    userSavedIdx: index("session_evaluations_user_saved_idx").on(table.userId, table.savedAt),
    selfScoreCheck: check(
      "session_evaluations_self_score_check",
      sql`${table.selfScore} >= 1 AND ${table.selfScore} <= 5`,
    ),
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
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    model: varchar("model", { length: 120 }).notNull(),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    costKrw: numeric("cost_krw", { precision: 12, scale: 4 }).notNull().default("0"),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userTsIdx: index("api_usage_logs_user_ts_idx").on(table.userId, table.ts),
    modelTsIdx: index("api_usage_logs_model_ts_idx").on(table.model, table.ts),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
