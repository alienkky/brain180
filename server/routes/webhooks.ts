// Owner: 연다리 [통합설계]. Toss Path B async backstop.
// Flow:
//   1. Toss sends POST /webhooks/toss with HMAC-SHA256 over the raw body in
//      the `TossPayments-Signature` header.
//   2. We verify with TOSS_WEBHOOK_SECRET before trusting any field.
//   3. We look the payment up by orderId (initial tossPaymentKey) OR the real
//      paymentKey (after /api/billing/confirm has replaced it). Either lookup
//      hits the same unique index so duplicate webhooks are idempotent.
//   4. On DONE: mark payment paid + activate subscription if one wasn't created
//      by the synchronous confirm path. On CANCELED/EXPIRED/ABORTED: mark
//      payment failed (best-effort, never blocks the 200 to Toss).
//
// The handler ALWAYS responds 200 once the signature is valid — Toss retries
// any non-2xx for ~24h, and we'd rather log + investigate than thrash.

import { Router } from "express";
import type { Request } from "express";
import { eq, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { payments, subscriptions } from "../db/schema.js";
import { hasFeature } from "../lib/env.js";
import { verifyTossSignature } from "../lib/toss.js";
import { ensurePlanRow } from "../lib/billing-plans.js";

export const webhookRouter = Router();

interface TossWebhookBody {
  eventType?: string;
  data?: {
    paymentKey?: string;
    orderId?: string;
    status?: string;
    totalAmount?: number;
    approvedAt?: string;
  };
}

function rawBodyOf(req: Request): Buffer {
  const r = (req as { rawBody?: Buffer }).rawBody;
  if (r) return r;
  // Fallback if the json verify hook didn't run (shouldn't happen in prod).
  return Buffer.from(JSON.stringify(req.body ?? {}), "utf8");
}

webhookRouter.post("/toss", async (req, res) => {
  if (!hasFeature("toss")) {
    res.status(503).json({ error: "service_unavailable", reason: "mvp_cut" });
    return;
  }

  const signature =
    (req.header("tosspayments-signature") ?? req.header("TossPayments-Signature")) ||
    undefined;
  const ok = verifyTossSignature({
    rawBody: rawBodyOf(req),
    signatureHeader: signature,
  });
  if (!ok) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  const body = req.body as TossWebhookBody;
  const paymentKey = body?.data?.paymentKey;
  const orderId = body?.data?.orderId;
  const status = body?.data?.status;
  const totalAmount = body?.data?.totalAmount;
  const approvedAt = body?.data?.approvedAt;

  if (!orderId && !paymentKey) {
    res.status(200).json({ received: true, skipped: "no_key" });
    return;
  }

  try {
    const rows = await db
      .select({
        id: payments.id,
        userId: payments.userId,
        planName: payments.planName,
        amount: payments.amount,
        status: payments.status,
        subscriptionId: payments.subscriptionId,
      })
      .from(payments)
      .where(
        or(
          paymentKey ? eq(payments.tossPaymentKey, paymentKey) : undefined,
          orderId ? eq(payments.tossPaymentKey, orderId) : undefined,
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      res.status(200).json({ received: true, skipped: "unknown_order" });
      return;
    }

    const upper = (status ?? "").toUpperCase();
    const isSuccess = upper === "DONE" || upper === "APPROVED";
    const isFailure =
      upper === "CANCELED" || upper === "ABORTED" || upper === "EXPIRED";

    if (isSuccess) {
      if (typeof totalAmount === "number" && totalAmount !== row.amount) {
        res.status(200).json({ received: true, skipped: "amount_mismatch" });
        return;
      }

      // Activate subscription if confirm endpoint didn't already (e.g. user
      // closed the tab and webhook arrives first).
      let subId = row.subscriptionId;
      if (!subId && row.planName) {
        const planId = await ensurePlanRow(row.planName);
        const startedAt = new Date();
        const endsAt = new Date(startedAt.getTime() + 31 * 24 * 60 * 60 * 1000);
        const subRows = await db
          .insert(subscriptions)
          .values({
            userId: row.userId,
            planId,
            status: "active",
            startedAt,
            endsAt,
            tossBillingKey: paymentKey ?? null,
          })
          .returning({ id: subscriptions.id });
        subId = subRows[0]?.id ?? null;
      }

      if (row.status !== "paid" && row.status !== "success") {
        await db
          .update(payments)
          .set({
            status: "paid",
            paidAt: approvedAt ? new Date(approvedAt) : new Date(),
            tossPaymentKey: paymentKey ?? row.id,
            subscriptionId: subId ?? null,
          })
          .where(eq(payments.id, row.id));
      }
    } else if (isFailure && row.status !== "paid" && row.status !== "success") {
      await db
        .update(payments)
        .set({ status: "failed" })
        .where(eq(payments.id, row.id));
    }

    res.status(200).json({ received: true });
  } catch (e) {
    // Never bounce Toss — log and move on. The /api/billing/confirm path is
    // the primary activation path; the webhook is just a safety net.
    console.error("[webhooks/toss] processing failed", e);
    res.status(200).json({ received: true, error: "processing_deferred" });
  }
});

webhookRouter.post("/resend", (_req, res) => {
  if (!hasFeature("resend")) {
    res.status(503).json({ error: "service_unavailable", reason: "mvp_cut" });
    return;
  }
  res.status(501).json({ error: "not_implemented", owner: "ALI-67" });
});

