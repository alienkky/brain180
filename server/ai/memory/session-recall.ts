// Session recall: injects recent past-session summaries into the tutor system
// prompt to give the tutor memory across sessions within a token budget.
//
// Called from tutor.ts before building the system message (opt-in).
// Budget: max 600 tokens worth of context (≈2400 chars) — keeps overhead low.

import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { db } from "../../db/client.js";
import { canvasArtifacts, learningSessions, lessons } from "../../db/schema.js";
import { summarizeCanvas } from "../analyzers/canvas-summary.js";

const MAX_CHARS = 2400;
const MAX_SESSIONS = 5;

export interface RecallContext {
  text: string;
  sessionCount: number;
}

export async function buildSessionRecall(
  userId: string,
  currentSessionId: string,
): Promise<RecallContext> {
  const pastSessions = await db
    .select({
      id: learningSessions.id,
      lessonTitle: lessons.title,
      startedAt: learningSessions.startedAt,
    })
    .from(learningSessions)
    .innerJoin(lessons, eq(learningSessions.lessonId, lessons.id))
    .where(
      and(
        eq(learningSessions.userId, userId),
        isNull(learningSessions.deletedAt),
        lt(learningSessions.id, currentSessionId), // earlier sessions by UUID v7 ordering
      ),
    )
    .orderBy(desc(learningSessions.startedAt))
    .limit(MAX_SESSIONS);

  if (pastSessions.length === 0) return { text: "", sessionCount: 0 };

  const parts: string[] = [];
  let totalChars = 0;

  for (const sess of pastSessions) {
    const artifacts = await db
      .select({ payload: canvasArtifacts.payload })
      .from(canvasArtifacts)
      .where(and(eq(canvasArtifacts.sessionId, sess.id), isNull(canvasArtifacts.deletedAt)))
      .orderBy(desc(canvasArtifacts.savedAt))
      .limit(1);

    const payload = (artifacts[0]?.payload ?? {}) as {
      nodes?: { id: string; type: string; label: string }[];
      edges?: { from: string; to: string; relation: string }[];
    };

    const summary = await summarizeCanvas(userId, payload, sess.lessonTitle);
    const date = sess.startedAt.toISOString().slice(0, 10);
    const entry = `[${date}] "${sess.lessonTitle}": ${summary}`;

    if (totalChars + entry.length > MAX_CHARS) break;
    parts.push(entry);
    totalChars += entry.length;
  }

  if (parts.length === 0) return { text: "", sessionCount: 0 };

  return {
    text: [
      "## 과거 학습 기록 (최근 순)",
      ...parts,
    ].join("\n"),
    sessionCount: parts.length,
  };
}
