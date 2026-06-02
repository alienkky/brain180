// Deletes expired email_tokens rows. Runs daily at 03:00 KST (= 18:00 UTC).
// Safe to run multiple times — always idempotent.

import { lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { emailTokens } from "../db/schema.js";
import { registerJob } from "./scheduler.js";

export async function cleanupExpiredEmailTokens() {
  const result = await db
    .delete(emailTokens)
    .where(lt(emailTokens.expiresAt, new Date()))
    .returning({ token: emailTokens.token });
  if (result.length > 0) {
    console.log(`[job:email-verify-cleanup] deleted ${result.length} expired token(s)`);
  }
}

registerJob({
  name: "email-verify-cleanup",
  schedule: { hour: 18, minute: 0 }, // 03:00 KST = 18:00 UTC
  run: cleanupExpiredEmailTokens,
});
