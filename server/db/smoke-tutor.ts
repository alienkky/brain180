// Owner: ALI-67 방연동[MCP].
//
// One-shot end-to-end smoke for the tutor pipeline. Bypasses HTTP + Lucia auth
// (those have their own integration coverage) and exercises the DB → prompt
// resolver → callTutorLLM → api_usage_logs path that actually matters for
// "did the LLM seam survive contact with reality?".
//
// What it does:
//   1. Find admin user (from ADMIN_SEED_EMAIL — must exist; run db:seed first)
//   2. Find first lesson with a non-empty text_excerpt
//   3. Resolve system prompt (lesson.tutor_system_prompt_id, else first active)
//   4. Substitute the same 4 vars the real route does
//   5. Open a smoke learning_session, write a `user` tutor_message, call Kimi,
//      write the `assistant` tutor_message — same order as routes/tutor.ts
//   6. Verify api_usage_logs row count incremented by exactly 1
//   7. Close the smoke session (endedAt=now) so it does not pollute real data
//   8. Print PASS/FAIL with the new row id, provider, model, tokens, latency
//
// Run via:
//   npm run smoke:tutor
//
// Exits 0 on PASS, 1 on FAIL. Safe to re-run: each run creates a fresh
// learning_session row + 2 tutor_message rows. Idempotency is not the goal —
// this is a live-fire smoke that costs ~1 Kimi call per run (~₩0).

import { asc, desc, eq, count } from "drizzle-orm";
import { db, closeDb } from "./client.js";
import {
  apiUsageLogs,
  learningSessions,
  lessons,
  textExcerpts,
  tutorMessages,
  tutorSystemPrompts,
  users,
} from "./schema.js";
import { loadEnv } from "../lib/env.js";
import { callTutorLLM, resolveTutorProvider } from "../lib/llm.js";
import { UpstreamError } from "../lib/anthropic.js";
import { installUsageLogWriter } from "../lib/usage-log.js";

const FALLBACK_PROMPT = [
  "당신은 Brain180의 사고구조 튜터입니다.",
  "학생이 텍스트 '{{lesson_title}}'의 사고구조를 추출하도록 돕습니다.",
  "원문: {{text_body}}",
  "축 가중치: {{axis_focus}}",
  "학생: {{user_name}}",
].join("\n");

function substitute(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => vars[key] ?? "");
}

interface ResolvedPrompt {
  content: string;
  version: string;
  source: "lesson" | "active" | "fallback";
}

async function resolveSystemPrompt(lessonRow: {
  tutorSystemPromptId: string | null;
}): Promise<ResolvedPrompt> {
  if (lessonRow.tutorSystemPromptId) {
    const rows = await db
      .select({
        content: tutorSystemPrompts.content,
        version: tutorSystemPrompts.version,
      })
      .from(tutorSystemPrompts)
      .where(eq(tutorSystemPrompts.id, lessonRow.tutorSystemPromptId))
      .limit(1);
    if (rows[0]) {
      return { content: rows[0].content, version: rows[0].version, source: "lesson" };
    }
  }
  const active = await db
    .select({
      content: tutorSystemPrompts.content,
      version: tutorSystemPrompts.version,
    })
    .from(tutorSystemPrompts)
    .where(eq(tutorSystemPrompts.isActive, true))
    .orderBy(desc(tutorSystemPrompts.updatedAt))
    .limit(1);
  if (active[0]) {
    return { content: active[0].content, version: active[0].version, source: "active" };
  }
  return { content: FALLBACK_PROMPT, version: "fallback-0", source: "fallback" };
}

async function main(): Promise<void> {
  const env = loadEnv();
  installUsageLogWriter();

  const provider = resolveTutorProvider();
  console.log(`[smoke] provider=${provider} (AI_PROVIDER=${env.AI_PROVIDER})`);

  // 1. Admin user
  const adminEmail = env.ADMIN_SEED_EMAIL.toLowerCase();
  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);
  const user = userRows[0];
  if (!user) {
    throw new Error(`admin user not found for ${adminEmail} — run npm run db:seed first`);
  }
  console.log(`[smoke] user id=${user.id} name=${user.name}`);

  // 2. First lesson + its first excerpt
  const lessonRows = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      textSource: lessons.textSource,
      axisFocus: lessons.axisFocus,
      tutorSystemPromptId: lessons.tutorSystemPromptId,
    })
    .from(lessons)
    .orderBy(asc(lessons.createdAt))
    .limit(1);
  const lesson = lessonRows[0];
  if (!lesson) {
    throw new Error("no lessons in DB — run npm run db:seed first");
  }
  const excerptRows = await db
    .select({ content: textExcerpts.content })
    .from(textExcerpts)
    .where(eq(textExcerpts.lessonId, lesson.id))
    .orderBy(asc(textExcerpts.order))
    .limit(1);
  const textBody = excerptRows[0]?.content ?? lesson.textSource;
  console.log(`[smoke] lesson id=${lesson.id} title="${lesson.title}"`);

  // 3. + 4. Resolve + substitute prompt
  const prompt = await resolveSystemPrompt(lesson);
  console.log(`[smoke] prompt source=${prompt.source} version=${prompt.version}`);
  const systemMessage = substitute(prompt.content, {
    lesson_title: lesson.title,
    text_body: textBody,
    axis_focus: JSON.stringify(lesson.axisFocus ?? {}),
    user_name: user.name,
  });

  // 5. Smoke session + user msg
  const sessionInserted = await db
    .insert(learningSessions)
    .values({
      userId: user.id,
      lessonId: lesson.id,
      mode: "analyze",
      perspective: "cognitive",
    })
    .returning({ id: learningSessions.id });
  const sessionId = sessionInserted[0]!.id;
  console.log(`[smoke] session id=${sessionId}`);

  const userMessage = "안녕하세요. 이 본문에서 가장 자주 반복되는 사고 패턴 하나만 골라 알려주세요.";
  await db.insert(tutorMessages).values({
    sessionId,
    role: "user",
    content: userMessage,
    promptVersion: prompt.version,
  });

  // 6. Pre-call: count api_usage_logs
  const before = await db.select({ c: count() }).from(apiUsageLogs);
  const beforeCount = Number(before[0]?.c ?? 0);
  console.log(`[smoke] api_usage_logs before=${beforeCount}`);

  // Call LLM
  let result;
  try {
    result = await callTutorLLM({
      userId: user.id,
      system: systemMessage,
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (err) {
    if (err instanceof UpstreamError) {
      console.error(`[smoke] ❌ upstream error: ${err.provider} ${err.code} ${err.message}`);
    } else {
      console.error("[smoke] ❌ unexpected error:", err);
    }
    await db
      .update(learningSessions)
      .set({ endedAt: new Date() })
      .where(eq(learningSessions.id, sessionId));
    process.exitCode = 1;
    return;
  }

  // 7. Assistant msg + verify
  await db.insert(tutorMessages).values({
    sessionId,
    role: "assistant",
    content: result.text,
    model: result.model,
    promptVersion: prompt.version,
    tokensIn: result.inputTokens,
    tokensOut: result.outputTokens,
    tokens: result.inputTokens + result.outputTokens,
    latencyMs: result.latencyMs,
  });

  const after = await db.select({ c: count() }).from(apiUsageLogs);
  const afterCount = Number(after[0]?.c ?? 0);
  console.log(`[smoke] api_usage_logs after=${afterCount}`);

  const newest = await db
    .select({
      id: apiUsageLogs.id,
      provider: apiUsageLogs.provider,
      model: apiUsageLogs.model,
      tokensIn: apiUsageLogs.tokensIn,
      tokensOut: apiUsageLogs.tokensOut,
      latencyMs: apiUsageLogs.latencyMs,
      status: apiUsageLogs.status,
    })
    .from(apiUsageLogs)
    .orderBy(desc(apiUsageLogs.createdAt))
    .limit(1);
  const log = newest[0];

  await db
    .update(learningSessions)
    .set({ endedAt: new Date() })
    .where(eq(learningSessions.id, sessionId));

  const delta = afterCount - beforeCount;
  const pass = delta === 1 && log?.status === "ok";
  console.log("");
  console.log(`[smoke] ===== ${pass ? "✅ PASS" : "❌ FAIL"} =====`);
  console.log(`[smoke] tutor reply (first 200 chars): ${result.text.slice(0, 200)}`);
  console.log(`[smoke] model=${result.model} input=${result.inputTokens} output=${result.outputTokens} latency=${result.latencyMs}ms`);
  console.log(`[smoke] api_usage_logs Δ=${delta} (expected 1)`);
  if (log) {
    console.log(`[smoke] newest log id=${log.id} provider=${log.provider} model=${log.model} status=${log.status} latency=${log.latencyMs}ms`);
  }
  if (!pass) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("[smoke] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => void closeDb());
