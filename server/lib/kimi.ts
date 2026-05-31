// Kimi / Moonshot (OpenAI-compatible) tutor LLM adapter.
// Mirrors the shape of callAnthropic() so the route layer can swap providers
// behind one seam (server/lib/llm.ts).
//
// v1 brain180 (server.js) already ran on Moonshot's chat.completions endpoint
// with model "kimi-k2.6"; this port keeps the same model + base URL defaults
// so an existing KIMI_API_KEY just works.
//
// Retry / classification mirrors anthropic.ts:
//   - 429 / 5xx → retryable, exponential backoff (3 tries, 500ms base, ×2)
//   - 401/403 → auth_error (non-retryable)
//   - 400 → bad_request (non-retryable)
//   - Empty response after retry → "empty_response" (non-retryable)
//
// All terminal outcomes emit one APIUsageLog row via writeUsageLog (seam shared
// with anthropic.ts to keep §8-2 audit shape consistent across providers).

import OpenAI from "openai";
import { loadEnv, moonshotApiKey } from "./env.js";
import { anonymizeUserId } from "./anon.js";
import { UpstreamError, type UsageLogRow } from "./anthropic.js";

export interface KimiCall {
  userId: string;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface KimiResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

// Reuse the same usage-log writer registered for anthropic.ts. The router (llm.ts)
// is the only call site, so importing it directly keeps the seam single-owner.
type UsageLogWriter = (row: UsageLogRow) => Promise<void>;

let writeUsageLog: UsageLogWriter = async (row) => {
  console.log(JSON.stringify({ kind: "api_usage_log", ...row }));
};

export function setKimiUsageLogWriter(w: UsageLogWriter): void {
  writeUsageLog = w;
}

const RETRY_BASE_MS = 500;
const RETRY_MAX = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

let cachedClient: OpenAI | null = null;
function client(): OpenAI {
  if (cachedClient) return cachedClient;
  const env = loadEnv();
  const apiKey = moonshotApiKey();
  if (!apiKey) {
    throw new UpstreamError(
      "kimi",
      "missing_api_key",
      "MOONSHOT_API_KEY (or KIMI_API_KEY) not configured",
      false,
    );
  }
  cachedClient = new OpenAI({
    apiKey,
    baseURL: env.MOONSHOT_BASE_URL,
    timeout: env.MOONSHOT_TIMEOUT_MS,
  });
  return cachedClient;
}

function classifyError(err: unknown): { code: string; retryable: boolean } {
  if (err instanceof OpenAI.APIError) {
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

// Moonshot's kimi-* thinking models reject any temperature other than 0.6.
function resolveTemperature(model: string, requested: number | undefined): number {
  if (model.startsWith("kimi-")) return 0.6;
  return requested ?? 0.3;
}

export async function callKimi(call: KimiCall): Promise<KimiResult> {
  const env = loadEnv();
  const model = call.model ?? env.MOONSHOT_MODEL;
  const anonymizedUserId = anonymizeUserId(call.userId);
  const started = Date.now();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: call.system },
    ...call.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model,
        max_tokens: call.maxTokens ?? env.MOONSHOT_MAX_TOKENS,
        temperature: resolveTemperature(model, call.temperature),
        messages,
        response_format: { type: "text" },
        stream: false,
      };
      if (model.startsWith("kimi-")) {
        // Moonshot's kimi-* models accept a `thinking` field that is not part of
        // the upstream OpenAI schema. Attach via a typed escape hatch.
        (params as unknown as Record<string, unknown>).thinking = {
          type: env.MOONSHOT_THINKING,
        };
      }

      const res = await client().chat.completions.create(params);

      const text = res.choices[0]?.message?.content ?? "";
      if (!text) {
        throw new UpstreamError(
          "kimi",
          "empty_response",
          "Moonshot returned empty content",
          false,
        );
      }

      const inputTokens = res.usage?.prompt_tokens ?? 0;
      const outputTokens = res.usage?.completion_tokens ?? 0;
      const latencyMs = Date.now() - started;

      void writeUsageLog({
        provider: "kimi",
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
      if (err instanceof UpstreamError && !err.retryable) {
        void writeUsageLog({
          provider: "kimi",
          model,
          anonymizedUserId,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - started,
          status: "error",
          errorCode: err.code,
        });
        throw err;
      }
      const { code, retryable } = classifyError(err);
      if (!retryable || attempt === RETRY_MAX) {
        void writeUsageLog({
          provider: "kimi",
          model,
          anonymizedUserId,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - started,
          status: "error",
          errorCode: code,
        });
        throw new UpstreamError(
          "kimi",
          code,
          err instanceof Error ? err.message : String(err),
          false,
        );
      }
      await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
    }
  }

  throw new UpstreamError(
    "kimi",
    "exhausted",
    lastErr instanceof Error ? lastErr.message : "retry exhausted",
    false,
  );
}
