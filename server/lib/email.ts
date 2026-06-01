// Resend REST wrapper per api-contracts.md §1 (가입 인증 메일, MVP 이후).
// Owner: ALI-67 방연동[MCP]. No SDK dep — uses fetch directly.
// Feature-gated: hasFeature("resend") false → throws DisabledFeatureError
// so route handlers can return 503 mvp_cut.

import { loadEnv, hasFeature } from "./env.js";
import { UpstreamError } from "./anthropic.js";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  id: string;
  latencyMs: number;
}

export class DisabledFeatureError extends Error {
  constructor(feature: string) {
    super(`feature_disabled:${feature}`);
    this.name = "DisabledFeatureError";
  }
}

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!hasFeature("resend")) {
    throw new DisabledFeatureError("resend");
  }

  const env = loadEnv();
  const started = Date.now();

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const code = res.status === 429 ? "rate_limited" : `http_${res.status}`;
      throw new UpstreamError(
        "resend",
        code,
        `resend ${res.status}`,
        res.status === 429 || res.status >= 500,
      );
    }

    const body = (await res.json()) as { id: string };
    return { id: body.id, latencyMs: Date.now() - started };
  } catch (err) {
    if (err instanceof UpstreamError || err instanceof DisabledFeatureError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new UpstreamError("resend", "timeout", "resend timeout", true);
    }
    throw new UpstreamError(
      "resend",
      "network_error",
      err instanceof Error ? err.message : String(err),
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}
