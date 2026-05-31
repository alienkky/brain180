// APIUsageLog DB writer — wires UsageLogRow → api_usage_logs insert.
// Owner: ALI-67 방연동[MCP].
//
// Failure isolation: insert errors are swallowed (logged to console) so a DB
// hiccup never poisons the upstream call result. Routes never observe writer failures.

import { db } from "../db/client.js";
import { apiUsageLogs } from "../db/schema.js";
import type { UsageLogRow } from "./anthropic.js";
import { setUsageLogWriter } from "./anthropic.js";

async function writeUsageLogToDb(row: UsageLogRow): Promise<void> {
  try {
    await db.insert(apiUsageLogs).values({
      userId: row.userId,
      model: row.model,
      tokensIn: row.inputTokens,
      tokensOut: row.outputTokens,
    });
  } catch (err) {
    console.error("[usage-log] insert failed:", err, { row });
  }
}

export function installUsageLogWriter(): void {
  setUsageLogWriter(writeUsageLogToDb);
}
