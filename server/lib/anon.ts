import { createHash } from "node:crypto";
import { loadEnv } from "./env.js";

export function anonymizeUserId(userId: string): string {
  const { ANON_SALT } = loadEnv();
  return createHash("sha256").update(`${userId}:${ANON_SALT}`).digest("hex");
}
