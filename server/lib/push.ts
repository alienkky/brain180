// Web Push (VAPID) wrapper per api-contracts.md §6-4.
// Owner: ALI-67 방연동[MCP]. node:crypto only — no `web-push` dependency.
//
// MVP scope: VAPID-authenticated empty-payload push. The browser wakes the
// service worker on receipt; the worker then fetches /api/notifications for
// the actual content. This keeps the server side minimal (no RFC 8291 payload
// encryption) while staying spec-compliant for the push protocol itself.
// Payload encryption (RFC 8291: ECDH + HKDF + AES-128-GCM) is deferred to
// MVP 이후 once we have a notification template that benefits from inline data.
//
// VAPID keys (raw uncompressed P-256):
//   VAPID_PUBLIC_KEY  — 65 bytes base64url (0x04 || X || Y)
//   VAPID_PRIVATE_KEY — 32 bytes base64url (the scalar d)
//
// Feature-gated via hasFeature("push").

import { createPrivateKey, sign as cryptoSign } from "node:crypto";
import { loadEnv, hasFeature } from "./env.js";
import { UpstreamError } from "./anthropic.js";
import { DisabledFeatureError } from "./email.js";

const VAPID_TOKEN_TTL_SEC = 12 * 60 * 60;
const PUSH_TIMEOUT_MS = 10_000;

export interface PushSubscriptionKeys {
  endpoint: string;
}

export interface SendPushInput {
  subscription: PushSubscriptionKeys;
  ttlSec?: number;
  urgency?: "very-low" | "low" | "normal" | "high";
  topic?: string;
}

export interface SendPushResult {
  status: number;
  latencyMs: number;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function endpointOrigin(endpoint: string): string {
  const u = new URL(endpoint);
  return `${u.protocol}//${u.host}`;
}

// Build a VAPID JWT (ES256). Signature is raw r||s (64 bytes) — node's
// dsaEncoding:"ieee-p1363" emits that directly, skipping DER parsing.
function buildVapidJwt(audience: string): string {
  const env = loadEnv();
  const pub = b64urlDecode(env.VAPID_PUBLIC_KEY ?? "");
  const priv = b64urlDecode(env.VAPID_PRIVATE_KEY ?? "");
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new UpstreamError(
      "push",
      "vapid_public_key_invalid",
      "VAPID_PUBLIC_KEY must be 65-byte uncompressed P-256 point",
      false,
    );
  }
  if (priv.length !== 32) {
    throw new UpstreamError(
      "push",
      "vapid_private_key_invalid",
      "VAPID_PRIVATE_KEY must be 32-byte P-256 scalar",
      false,
    );
  }

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: b64url(pub.subarray(1, 33)),
    y: b64url(pub.subarray(33, 65)),
    d: b64url(priv),
  };
  const privateKey = createPrivateKey({ key: jwk, format: "jwk" });

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + VAPID_TOKEN_TTL_SEC,
    sub: env.VAPID_SUBJECT,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = cryptoSign("SHA256", Buffer.from(signingInput, "utf8"), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${b64url(sig)}`;
}

export async function sendPush(input: SendPushInput): Promise<SendPushResult> {
  if (!hasFeature("push")) {
    throw new DisabledFeatureError("push");
  }

  const env = loadEnv();
  const audience = endpointOrigin(input.subscription.endpoint);
  const jwt = buildVapidJwt(audience);
  const started = Date.now();

  const headers: Record<string, string> = {
    Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY ?? ""}`,
    TTL: String(input.ttlSec ?? 60),
    "Content-Length": "0",
  };
  if (input.urgency) headers.Urgency = input.urgency;
  if (input.topic) headers.Topic = input.topic;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PUSH_TIMEOUT_MS);

  try {
    const res = await fetch(input.subscription.endpoint, {
      method: "POST",
      headers,
      signal: ctrl.signal,
    });

    // 404/410 = subscription invalid; caller should evict from DB.
    if (res.status === 404 || res.status === 410) {
      throw new UpstreamError(
        "push",
        "subscription_gone",
        `push ${res.status}`,
        false,
      );
    }
    if (!res.ok) {
      const code = res.status === 429 ? "rate_limited" : `http_${res.status}`;
      throw new UpstreamError(
        "push",
        code,
        `push ${res.status}`,
        res.status === 429 || res.status >= 500,
      );
    }

    return { status: res.status, latencyMs: Date.now() - started };
  } catch (err) {
    if (err instanceof UpstreamError || err instanceof DisabledFeatureError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new UpstreamError("push", "timeout", "push timeout", true);
    }
    throw new UpstreamError(
      "push",
      "network_error",
      err instanceof Error ? err.message : String(err),
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}
