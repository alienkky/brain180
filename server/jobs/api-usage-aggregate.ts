// Aggregates api_usage_logs into daily summary and logs totals.
// Runs daily at 00:30 KST (= 15:30 UTC prev day → just use 15 UTC).
// No separate aggregate table yet — writes to console for ops monitoring.
// Extend to write into a summary table when admin stats dashboard is built.

import { and, gte, lt, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { apiUsageLogs } from "../db/schema.js";
import { registerJob } from "./scheduler.js";

export async function aggregateApiUsage() {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  const today = new Date(yesterday);
  today.setUTCDate(today.getUTCDate() + 1);

  const rows = await db
    .select({
      provider: apiUsageLogs.provider,
      model: apiUsageLogs.model,
      totalIn: sql<number>`sum(${apiUsageLogs.tokensIn})::int`,
      totalOut: sql<number>`sum(${apiUsageLogs.tokensOut})::int`,
      calls: sql<number>`count(*)::int`,
      errors: sql<number>`sum(case when ${apiUsageLogs.status} != 'ok' then 1 else 0 end)::int`,
    })
    .from(apiUsageLogs)
    .where(and(gte(apiUsageLogs.createdAt, yesterday), lt(apiUsageLogs.createdAt, today)))
    .groupBy(apiUsageLogs.provider, apiUsageLogs.model);

  const date = yesterday.toISOString().slice(0, 10);
  if (rows.length === 0) {
    console.log(`[job:api-usage-aggregate] ${date} — no usage`);
    return;
  }
  for (const r of rows) {
    console.log(
      `[job:api-usage-aggregate] ${date} ${r.provider}/${r.model}` +
        ` calls=${r.calls} in=${r.totalIn} out=${r.totalOut} errors=${r.errors}`,
    );
  }
}

registerJob({
  name: "api-usage-aggregate",
  schedule: { hour: 15, minute: 30 }, // 00:30 KST = 15:30 UTC
  run: aggregateApiUsage,
});
