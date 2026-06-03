import OpenAI from "openai";
import { anonymizeUserId } from "./anon.js";
import { loadEnv } from "./env.js";
import {
  UpstreamError,
  type AnthropicCall,
  type AnthropicMessageContent,
  type AnthropicResult,
  type UsageLogRow,
} from "./anthropic.js";

type UsageLogWriter = (row: UsageLogRow) => Promise<void>;

let writeUsageLog: UsageLogWriter = async (row) => {
  console.log(JSON.stringify({ kind: "api_usage_log", ...row }));
};

export function setOpenAIUsageLogWriter(w: UsageLogWriter): void {
  writeUsageLog = w;
}

let cachedClient: OpenAI | null = null;
function client(): OpenAI {
  if (cachedClient) return cachedClient;
  const env = loadEnv();
  if (!env.OPENAI_API_KEY) {
    throw new UpstreamError(
      "openai",
      "missing_api_key",
      "OPENAI_API_KEY not configured",
      false,
    );
  }
  cachedClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return cachedClient;
}

function contentToOpenAI(
  content: AnthropicMessageContent,
): OpenAI.Chat.Completions.ChatCompletionContentPart[] | string {
  if (typeof content === "string") return content;
  return content.map((block) => {
    if (block.type === "text") {
      return { type: "text", text: block.text };
    }
    return {
      type: "image_url",
      image_url: {
        url: `data:${block.source.media_type};base64,${block.source.data}`,
      },
    };
  });
}

function classifyError(err: unknown): { code: string; retryable: boolean } {
  if (err instanceof OpenAI.APIError) {
    const status = err.status ?? 0;
    if (status === 429) return { code: "rate_limited", retryable: true };
    if (status >= 500) return { code: "upstream_5xx", retryable: true };
    if (status === 401 || status === 403) return { code: "auth_error", retryable: false };
    if (status === 400) return { code: "bad_request", retryable: false };
    return { code: `http_${status}`, retryable: false };
  }
  return { code: "unknown", retryable: false };
}

export async function callOpenAIVision(call: AnthropicCall): Promise<AnthropicResult> {
  const env = loadEnv();
  const model = call.model ?? env.OPENAI_VISION_MODEL;
  const anonymizedUserId = anonymizeUserId(call.userId);
  const started = Date.now();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: call.system },
  ];
  for (const message of call.messages) {
    if (message.role === "assistant") {
      messages.push({
        role: "assistant",
        content:
          typeof message.content === "string"
            ? message.content
            : message.content
                .filter((block) => block.type === "text")
                .map((block) => block.text)
                .join("\n"),
      });
    } else {
      messages.push({
        role: "user",
        content: contentToOpenAI(message.content),
      });
    }
  }

  try {
    const res = await client().chat.completions.create({
      model,
      max_tokens: call.maxTokens ?? 1024,
      temperature: call.temperature ?? 0.7,
      messages,
      response_format: { type: "text" },
    });

    const text = res.choices[0]?.message?.content ?? "";
    if (!text) {
      throw new UpstreamError("openai", "empty_response", "OpenAI returned empty content", false);
    }

    const latencyMs = Date.now() - started;
    const inputTokens = res.usage?.prompt_tokens ?? 0;
    const outputTokens = res.usage?.completion_tokens ?? 0;
    void writeUsageLog({
      provider: "openai",
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
    const upstream =
      err instanceof UpstreamError ? err : null;
    const { code } = upstream ? { code: upstream.code } : classifyError(err);
    void writeUsageLog({
      provider: "openai",
      model,
      anonymizedUserId,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - started,
      status: "error",
      errorCode: code,
    });
    if (upstream) throw upstream;
    throw new UpstreamError(
      "openai",
      code,
      err instanceof Error ? err.message : String(err),
      false,
    );
  }
}
