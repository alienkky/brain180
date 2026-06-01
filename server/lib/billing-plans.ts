// Default plan catalogue for Brain180 v2 MVP.
// Three tiers; the prices below are the source of truth for both /api/billing/plans
// and the server-side amount check during Toss confirm. Rows are upserted into
// the `plans` table on first access so subscription FK constraints hold.

import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { plans } from "../db/schema.js";

export interface PlanCatalogueEntry {
  name: "free" | "standard" | "premium";
  title: string;
  priceKrw: number;
  features: Record<string, unknown>;
}

export const PLAN_CATALOGUE: PlanCatalogueEntry[] = [
  {
    name: "free",
    title: "무료 체험",
    priceKrw: 0,
    features: { lessons_per_month: 3, tutor_chat: false, canvas_history: 7 },
  },
  {
    name: "standard",
    title: "스탠다드",
    priceKrw: 12_000,
    features: { lessons_per_month: "unlimited", tutor_chat: true, canvas_history: 90 },
  },
  {
    name: "premium",
    title: "프리미엄",
    priceKrw: 30_000,
    features: {
      lessons_per_month: "unlimited",
      tutor_chat: true,
      canvas_history: "unlimited",
      compare_mode: true,
      export_pdf: true,
    },
  },
];

export function findPlanByName(name: string): PlanCatalogueEntry | undefined {
  return PLAN_CATALOGUE.find((p) => p.name === name);
}

export async function ensurePlanRow(name: PlanCatalogueEntry["name"]): Promise<string> {
  const def = findPlanByName(name);
  if (!def) throw new Error(`unknown_plan:${name}`);
  const existing = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.name, name))
    .limit(1);
  if (existing[0]) return existing[0].id;
  const inserted = await db
    .insert(plans)
    .values({
      name: def.name,
      priceKrw: def.priceKrw,
      features: def.features,
      isActive: true,
    })
    .returning({ id: plans.id });
  if (!inserted[0]) throw new Error("plan_insert_failed");
  return inserted[0].id;
}
