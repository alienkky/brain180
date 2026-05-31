// Owner: 연다리 [통합설계].
// Toss Path B (key-in) billing endpoints. Stays 503 until TOSS_CLIENT_KEY +
// TOSS_SECRET_KEY + TOSS_WEBHOOK_SECRET are all present in env. The plan
// catalogue endpoint is always available so the UI can render pricing even
// before live keys are wired.
//
// Flow:
//   1. GET  /api/billing/plans                       (auth, always on)
//   2. GET  /api/billing/me/subscription             (auth, always on)
//   3. POST /api/billing/checkout                    (auth, requires toss)
//      → server creates a pending payments row + returns Toss-ready payload
//   4. Frontend opens Toss widget with the payload, user pays.
//   5. POST /api/billing/confirm                     (auth, requires toss)
//      → server calls Toss confirm API with the secret key, on success marks
//        payment + activates subscription.
//   6. POST /webhooks/toss is the async backstop (see webhooks.ts).

import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { payments, plans, subscriptions } from "../db/schema.js";
import { ok, fail } from "../lib/envelope.js";
import { hasFeature, loadEnv } from "../lib/env.js";
import { ensurePlanRow, PLAN_CATALOGUE } from "../lib/billing-plans.js";
import { parseBody } from "../lib/validators.js";
import {
  requireApprovedUser,
  requireAuth,
  requirePasswordFresh,
} from "../middleware/auth.js";
import { userRateLimit } from "../middleware/rate-limit.js";

export const billingRouter = Router();
billingRouter.use(requireAuth, requirePasswordFresh, requireApprovedUser, userRateLimit);

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

function requireToss(res: Response): boolean {
  if (!hasFeature("toss")) {
    fail(res, 503, "service_unavailable", { message: "toss_not_configured" });
    return false;
  }
  return true;
}

// ── GET /api/billing/plans ──────────────────────────────────────────
billingRouter.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    ok(
      res,
      PLAN_CATALOGUE.map((p) => ({
        name: p.name,
        title: p.title,
        price_krw: p.priceKrw,
        features: p.features,
      })),
    );
  }),
);

// ── GET /api/billing/me/subscription ────────────────────────────────
billingRouter.get(
  "/me/subscription",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const rows = await db
      .select({
        id: subscriptions.id,
        planId: subscriptions.planId,
        status: subscriptions.status,
        startedAt: subscriptions.startedAt,
        endsAt: subscriptions.endsAt,
      })
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
      .orderBy(desc(subscriptions.startedAt))
      .limit(1);
    const sub = rows[0];
    if (!sub) {
      ok(res, null);
      return;
    }
    const planRow = await db
      .select({ name: plans.name })
      .from(plans)
      .where(eq(plans.id, sub.planId))
      .limit(1);
    ok(res, {
      id: sub.id,
      plan_name: planRow[0]?.name ?? null,
      status: sub.status,
      started_at: sub.startedAt.toISOString(),
      ends_at: sub.endsAt ? sub.endsAt.toISOString() : null,
    });
  }),
);

// ── POST /api/billing/checkout ──────────────────────────────────────
const CheckoutBody = z.object({
  plan_name: z.enum(["standard", "premium"]),
});

billingRouter.post(
  "/checkout",
  asyncHandler(async (req, res) => {
    if (!requireToss(res)) return;
    const body = parseBody(CheckoutBody, req, res);
    if (!body) return;
    const plan = PLAN_CATALOGUE.find((p) => p.name === body.plan_name);
    if (!plan) {
      fail(res, 404, "not_found", { message: "plan_not_found" });
      return;
    }
    const userId = req.user!.id;
    const orderId = `b180_${userId.slice(0, 8)}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    await db.insert(payments).values({
      userId,
      planName: plan.name,
      amount: plan.priceKrw,
      currency: "KRW",
      method: "card",
      tossPaymentKey: orderId,
      status: "pending",
    });
    const env = loadEnv();
    ok(res, {
      order_id: orderId,
      amount: plan.priceKrw,
      plan_name: plan.name,
      order_name: `Brain180 ${plan.title}`,
      client_key: env.TOSS_CLIENT_KEY!,
      customer_email: req.user!.email,
      success_url: `${env.APP_BASE_URL}/billing/success`,
      fail_url: `${env.APP_BASE_URL}/billing/fail`,
    });
  }),
);

// ── POST /api/billing/confirm ───────────────────────────────────────
const ConfirmBody = z.object({
  payment_key: z.string().min(1).max(200),
  order_id: z.string().min(1).max(64),
  amount: z.number().int().positive(),
});

interface TossConfirmResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  approvedAt?: string;
  method?: string;
}

async function tossConfirm(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossConfirmResponse> {
  const env = loadEnv();
  const auth = Buffer.from(`${env.TOSS_SECRET_KEY}:`).toString("base64");
  const r = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      amount: input.amount,
    }),
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    throw new Error(
      `toss_confirm_failed:${(j.code as string) ?? r.status}:${(j.message as string) ?? "unknown"}`,
    );
  }
  return j as unknown as TossConfirmResponse;
}

billingRouter.post(
  "/confirm",
  asyncHandler(async (req, res) => {
    if (!requireToss(res)) return;
    const body = parseBody(ConfirmBody, req, res);
    if (!body) return;
    const userId = req.user!.id;

    const pendingRows = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        userId: payments.userId,
        planName: payments.planName,
        status: payments.status,
      })
      .from(payments)
      .where(eq(payments.tossPaymentKey, body.order_id))
      .limit(1);
    const pending = pendingRows[0];
    if (!pending) {
      fail(res, 404, "not_found", { message: "order_not_found" });
      return;
    }
    if (pending.userId !== userId) {
      fail(res, 403, "forbidden");
      return;
    }
    if (pending.status === "success" || pending.status === "paid") {
      ok(res, { payment_id: pending.id, idempotent: true });
      return;
    }
    if (pending.amount !== body.amount) {
      fail(res, 409, "conflict", { message: "amount_mismatch" });
      return;
    }
    if (!pending.planName) {
      fail(res, 500, "internal_error", { message: "missing_plan_on_payment" });
      return;
    }

    let confirmed: TossConfirmResponse;
    try {
      confirmed = await tossConfirm({
        paymentKey: body.payment_key,
        orderId: body.order_id,
        amount: body.amount,
      });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? e);
      await db
        .update(payments)
        .set({ status: "failed" })
        .where(eq(payments.id, pending.id));
      fail(res, 402, "payment_required", { message: msg });
      return;
    }

    const planId = await ensurePlanRow(pending.planName);
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + 31 * 24 * 60 * 60 * 1000);

    const subRows = await db
      .insert(subscriptions)
      .values({
        userId,
        planId,
        status: "active",
        startedAt,
        endsAt,
        tossBillingKey: confirmed.paymentKey,
      })
      .returning({ id: subscriptions.id });
    const subId = subRows[0]?.id;

    await db
      .update(payments)
      .set({
        status: "paid",
        paidAt: confirmed.approvedAt ? new Date(confirmed.approvedAt) : new Date(),
        tossPaymentKey: confirmed.paymentKey,
        subscriptionId: subId ?? null,
      })
      .where(eq(payments.id, pending.id));

    ok(res, {
      payment_id: pending.id,
      subscription_id: subId,
      plan_name: pending.planName,
      ends_at: endsAt.toISOString(),
    });
  }),
);
