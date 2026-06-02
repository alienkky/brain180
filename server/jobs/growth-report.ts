// Generates weekly GrowthReport for every active student who had sessions
// in the past 7 days. Runs Sunday at 22:00 KST (= 13:00 UTC).
// Uses three-axis analyzer (ALI-69) for scoring + growth-aggregator for summary.

import { and, gte, isNotNull, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { eq } from "drizzle-orm";
import { growthReports, learningSessions, users } from "../db/schema.js";
import { computeThreeAxisScores } from "../ai/analyzers/three-axis.js";
import { generateGrowthSummary } from "../ai/analyzers/growth-aggregator.js";
import { registerJob } from "./scheduler.js";

export async function generateWeeklyGrowthReports() {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const periodStart = weekAgo.toISOString().slice(0, 10);
  const periodEnd = now.toISOString().slice(0, 10);

  // Students with sessions in past 7 days.
  const activeStudents = await db
    .selectDistinct({ userId: learningSessions.userId })
    .from(learningSessions)
    .where(
      and(
        isNotNull(learningSessions.endedAt),
        gte(learningSessions.startedAt, weekAgo),
      ),
    );

  let created = 0;
  for (const { userId } of activeStudents) {
    if (!userId) continue;
    try {
      const [user] = await db
        .select({ name: users.name })
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);
      if (!user) continue;

      const scores = await computeThreeAxisScores(userId, weekAgo, now);
      const summary = await generateGrowthSummary(userId, user.name, scores, weekAgo, now);

      await db.insert(growthReports).values({
        userId,
        periodStart,
        periodEnd,
        axisCognitiveScore: String(scores.cognitive),
        axisValueScore: String(scores.value),
        axisTimeScore: String(scores.time),
        summary,
      });
      created++;
    } catch (err) {
      console.error(`[job:growth-report] userId=${userId.slice(0, 8)}`, err);
    }
  }
  console.log(`[job:growth-report] ${periodStart}→${periodEnd} generated ${created} report(s)`);
}

registerJob({
  name: "growth-report",
  schedule: { hour: 13, minute: 0, dayOfWeek: 0 }, // Sunday 13:00 UTC = 22:00 KST
  run: generateWeeklyGrowthReports,
});
