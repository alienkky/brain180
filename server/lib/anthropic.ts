// Anthropic Messages API wrapper per api-contracts.md §8-1/§8-2
// Owner: ALI-67 방연동[MCP]. Tutor route imports callAnthropic().
//
// Contract guarantees:
//   - metadata.user_id = anonymizeUserId(userId) — userId 평문 전송 금지
//   - 429/5xx → exponential backoff (3 retries, 500ms base, ×2)
//   - All terminal results emit APIUsageLog row via writeUsageLog (seam)
//   - SDK errors mapped to UpstreamError → routes return 502 upstream_error

import Anthropic from "@anthropic-ai/sdk";
import { loadEnv } from "./env.js";
import { anonymizeUserId } from "./anon.js";

export interface AnthropicCall {
  userId: string;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AnthropicResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

// Persisted shape per api-contracts §8-2. Plaintext userId is intentionally
// absent — only the anonymized id (sha256(user_id:ANON_SALT)) crosses this
// seam, so a writer mistake can never store the raw uuid.
export interface UsageLogRow {
  provider: "anthropic" | "openai" | "gemini";
  model: string;
  anonymizedUserId: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: "ok" | "error";
  errorCode: string | null;
}

export type UpstreamProvider = "anthropic" | "openai" | "gemini" | "resend" | "toss" | "r2";

export class UpstreamError extends Error {
  constructor(
    public readonly provider: UpstreamProvider,
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

// Usage log writer seam — ALI-62 schema lands, ALI-67 wires real insert.
// Until then: console structured log. Routes never observe write failures.
type UsageLogWriter = (row: UsageLogRow) => Promise<void>;

let writeUsageLog: UsageLogWriter = async (row) => {
  console.log(JSON.stringify({ kind: "api_usage_log", ...row }));
};

export function setUsageLogWriter(w: UsageLogWriter): void {
  writeUsageLog = w;
}

let cachedClient: Anthropic | null = null;
function client(): Anthropic {
  if (cachedClient) return cachedClient;
  const { ANTHROPIC_API_KEY } = loadEnv();
  cachedClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  return cachedClient;
}

const RETRY_BASE_MS = 500;
const RETRY_MAX = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function classifyError(err: unknown): { code: string; retryable: boolean } {
  if (err instanceof Anthropic.APIError) {
    const status = err.status ?? 0;
    if (status === 429) return { code: "rate_limited", retryable: true };
    if (status >= 500) return { code: "upstream_5xx", retryable: true };
    if (status === 401 || status === 403)
      return { code: "auth_error", retryable: false };
    if (status === 400) return { code: "bad_request", retryable: false };
    return { code: `http_${status}`, retryable: false };
  }
  return { code: "unknown", retryable: false };
}

export async function callAnthropic(call: AnthropicCall): Promise<AnthropicResult> {
  const env = loadEnv();
  const model = call.model ?? env.ANTHROPIC_MODEL;
  const anonymizedUserId = anonymizeUserId(call.userId);
  const started = Date.now();

  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      const res = await client().messages.create({
        model,
        max_tokens: call.maxTokens ?? 1024,
        temperature: call.temperature ?? 0.7,
        system: call.system,
        messages: call.messages,
        metadata: { user_id: anonymizedUserId },
      });

      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      const inputTokens = res.usage.input_tokens;
      const outputTokens = res.usage.output_tokens;
      const latencyMs = Date.now() - started;

      void writeUsageLog({
        provider: "anthropic",
        model,
        anonymizedUserId,
        inputTokens,
        outputTokens,
        latencyMs,
        status: "ok",
        errorCode: null,
      });

      return { text, model, inputTokens, outputTokens, latencyMs };
    } catch (err) {
      lastErr = err;
      const { code, retryable } = classifyError(err);
      if (!retryable || attempt === RETRY_MAX) {
        void writeUsageLog({
          provider: "anthropic",
          model,
          anonymizedUserId,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - started,
          status: "error",
          errorCode: code,
        });
        throw new UpstreamError(
          "anthropic",
          code,
          err instanceof Error ? err.message : String(err),
          false,
        );
      }
      await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
    }
  }

  // unreachable — loop above either returns or throws
  throw new UpstreamError(
    "anthropic",
    "exhausted",
    lastErr instanceof Error ? lastErr.message : "retry exhausted",
    false,
  );
}
