// Processes active reminder_rules and fires push/email notifications.
// Runs every 5 minutes. Compares rule.timeOfDay in the rule's timezone.
// Feature-gated: RESEND_ or VAPID_ keys missing → skips that channel silently.

import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { notifications, reminderRuleChannels, reminderRules, users } from "../db/schema.js";
import { sendEmail, DisabledFeatureError } from "../lib/email.js";
import { sendPush } from "../lib/push.js";
import { registerJob } from "./scheduler.js";

function nowInTz(tz: string): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    timeZone: tz,
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return { h, m };
}

export async function processReminders() {
  const rules = await db
    .select({
      id: reminderRules.id,
      userId: reminderRules.userId,
      timeOfDay: reminderRules.timeOfDay,
      timezone: reminderRules.timezone,
    })
    .from(reminderRules)
    .where(and(eq(reminderRules.isActive, true), isNull(reminderRules.deletedAt)));

  for (const rule of rules) {
    const { h, m } = nowInTz(rule.timezone);
    const [ruleH, ruleM] = rule.timeOfDay.split(":").map(Number);
    if (h !== ruleH || m !== ruleM) continue;

    // Fetch user email for email channel.
    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, rule.userId))
      .limit(1);
    if (!user) continue;

    const channels = await db
      .select({ channel: reminderRuleChannels.channel })
      .from(reminderRuleChannels)
      .where(eq(reminderRuleChannels.reminderRuleId, rule.id));

    const title = "Brain180 학습 리마인더";
    const body = `오늘의 학습 세션을 시작할 시간이에요, ${user.name}님!`;

    // Insert notification row regardless of channel.
    await db.insert(notifications).values({
      userId: rule.userId,
      type: "reminder",
      title,
      body,
    });

    for (const { channel } of channels) {
      try {
        if (channel === "email") {
          await sendEmail({
            to: user.email,
            subject: title,
            html: `<p>${body}</p><p><a href="https://brain180.app">지금 학습하기 →</a></p>`,
          });
        } else if (channel === "push") {
          // push_subscriptions table not yet added to schema — deferred MVP+1.
          // sendPush requires an endpoint from the browser's PushSubscription.
          void sendPush; // imported to ensure dep is wired
          console.log(`[job:reminder] push for ${rule.userId.slice(0, 8)} — push_subscriptions table pending`);
        }
      } catch (e) {
        if (e instanceof DisabledFeatureError) {
          // Feature not configured — silently skip.
        } else {
          console.error(`[job:reminder] channel=${channel} user=${rule.userId.slice(0, 8)}`, e);
        }
      }
    }
  }
}

registerJob({
  name: "reminder",
  schedule: "everyN",
  intervalMs: 5 * 60 * 1000,
  run: processReminders,
});
