// Lightweight in-process cron scheduler — no external deps.
// Fires registered jobs on their schedule by polling every minute.
// Each job gets a "last-ran" timestamp tracked in memory; on pod restart
// a job whose window was missed during downtime fires on next eligible tick.

import { loadEnv } from "../lib/env.js";

export interface JobSpec {
  name: string;
  /** Cron-style spec: { hour, minute, dayOfWeek? }. dayOfWeek: 0=Sun … 6=Sat */
  schedule: { hour: number; minute: number; dayOfWeek?: number } | "everyN";
  /** Only used when schedule === "everyN" */
  intervalMs?: number;
  run: () => Promise<void>;
}

const registry: JobSpec[] = [];
const lastRan = new Map<string, number>();

export function registerJob(spec: JobSpec) {
  registry.push(spec);
}

function shouldRun(spec: JobSpec, now: Date, prevTick: Date): boolean {
  if (spec.schedule === "everyN") {
    const last = lastRan.get(spec.name) ?? 0;
    return Date.now() - last >= (spec.intervalMs ?? 60_000);
  }
  const { hour, minute, dayOfWeek } = spec.schedule;
  if (dayOfWeek !== undefined && now.getDay() !== dayOfWeek) return false;
  // Fire if current minute window contains the target, and didn't fire in prev window.
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const target = hour * 60 + minute;
  const prevMin = prevTick.getHours() * 60 + prevTick.getMinutes();
  return nowMin === target && prevMin !== target;
}

export function startScheduler() {
  if (loadEnv().NODE_ENV === "test") return;
  let prev = new Date();
  setInterval(() => {
    const now = new Date();
    for (const spec of registry) {
      if (!shouldRun(spec, now, prev)) continue;
      lastRan.set(spec.name, Date.now());
      spec.run().catch((err: unknown) => {
        console.error(`[job:${spec.name}] error`, err);
      });
    }
    prev = now;
  }, 60_000);
  console.log(`[scheduler] started — ${registry.length} job(s) registered`);
}
