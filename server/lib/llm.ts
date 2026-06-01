// Tutor LLM provider dispatcher.
//
// Picks Anthropic vs Kimi (Moonshot) per AI_PROVIDER env, with automatic
// fallback to whichever key is configured. This is the single entrypoint the
// tutor route calls — provider-specific wrappers (anthropic.ts, kimi.ts) stay
// independent so we can swap or A/B without touching route code.

import { loadEnv, hasFeature } from "./env.js";
import { callAnthropic, UpstreamError, type AnthropicCall, type AnthropicResult } from "./anthropic.js";
import { callKimi } from "./kimi.js";

export type TutorLLMCall = AnthropicCall;
export type TutorLLMResult = AnthropicResult;

export type TutorProvider = "anthropic" | "kimi";

export function resolveTutorProvider(): TutorProvider {
  const env = loadEnv();
  const preferred = env.AI_PROVIDER;
  // If preferred provider has no key, fall back to whichever one is keyed.
  if (preferred === "kimi" && !hasFeature("kimi") && hasFeature("anthropic")) {
    return "anthropic";
  }
  if (preferred === "anthropic" && !hasFeature("anthropic") && hasFeature("kimi")) {
    return "kimi";
  }
  return preferred;
}

export async function callTutorLLM(call: TutorLLMCall): Promise<TutorLLMResult> {
  const provider = resolveTutorProvider();
  if (provider === "kimi") {
    if (!hasFeature("kimi")) {
      throw new UpstreamError(
        "kimi",
        "missing_api_key",
        "MOONSHOT_API_KEY (or KIMI_API_KEY) not configured",
        false,
      );
    }
    return callKimi(call);
  }
  if (!hasFeature("anthropic")) {
    throw new UpstreamError(
      "anthropic",
      "missing_api_key",
      "ANTHROPIC_API_KEY not configured",
      false,
    );
  }
  return callAnthropic(call);
}
