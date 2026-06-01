// Toss webhook HMAC verification per api-contracts.md §6-1.
// Owner: ALI-67 방연동[MCP]. Webhook handler calls verifyTossSignature() on
// raw body BEFORE JSON.parse. Returns false on missing secret, malformed
// signature, or mismatch. Uses constant-time comparison.

import { createHmac, timingSafeEqual } from "node:crypto";
import { loadEnv } from "./env.js";

export interface TossVerifyInput {
  rawBody: string | Buffer;
  signatureHeader: string | undefined;
}

export function verifyTossSignature({
  rawBody,
  signatureHeader,
}: TossVerifyInput): boolean {
  if (!signatureHeader) return false;

  const env = loadEnv();
  const secret = env.TOSS_WEBHOOK_SECRET;
  if (!secret) return false;

  const body = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
  const expected = createHmac("sha256", secret).update(body).digest("hex");

  const provided = signatureHeader.trim().toLowerCase();
  const expectedLower = expected.toLowerCase();

  if (provided.length !== expectedLower.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(provided, "utf8"),
      Buffer.from(expectedLower, "utf8"),
    );
  } catch {
    return false;
  }
}
