// Robot bridge endpoint — owner: alien_robot/embedded-engineer (도하람), ALI-21.
//
// Purpose: let the Alien Robot terminal (ESP32-S3) talk to the Brain180 AI
// through a 4090 robot-gateway. Unlike /api/tutor/chat this route is:
//   - device-token authed (Authorization: Bearer <ROBOT_DEVICE_TOKEN>), NOT
//     cookie/Lucia — an embedded device has no browser session.
//   - lesson/session independent — no DB writes, fully stateless. The gateway
//     owns conversation memory and passes `history` each turn.
//   - persona-fixed — the Alien Robot persona (concise Korean), not the
//     cognitive-structure tutor persona.
//
// It reuses the existing provider seam (llm.ts → Kimi/Anthropic) and vision
// wrappers (anthropic / openai) so a future swap to the local 4090 vLLM
// (Qwen3.6) is a provider-config change, not a route change.
//
// Side effects: 1 api_usage_log row per call via the LLM wrapper seam. No DB rows.

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import { ok, fail } from "../lib/envelope.js";
import { loadEnv, hasFeature } from "../lib/env.js";
import {
  UpstreamError,
  callAnthropic,
  type AnthropicMessageContent,
} from "../lib/anthropic.js";
import { callTutorLLM } from "../lib/llm.js";
import { callOpenAIVision } from "../lib/openai-vision.js";
import { parseBody, RobotChatBody } from "../lib/validators.js";

export const robotRouter = Router();

// Synthetic user id for the usage-log anonymizer. The device is not a real
// Brain180 user, but every LLM call must carry *some* id through the §8-2
// audit seam — this keeps robot traffic attributable without inventing a row.
const ROBOT_USER_ID = "alien-robot-device";

// Default Alien Robot persona (mirrors alien_robot/CLAUDE.md §4). Overridable
// per-deployment via ROBOT_PERSONA env without touching code.
const DEFAULT_PERSONA = [
  "당신은 'Alien Robot' — 책상 위의 작은 AI 로봇입니다.",
  "말투: 위트 있고 관찰력이 날카롭습니다. 한 발 물러서서 사물을 명료하게 봅니다.",
  "지적으로 한 발 떨어진 거리감을 유지하되 차갑지 않게, 짧고 간결하게 말합니다.",
  "규칙:",
  "- 항상 한국어로 답합니다.",
  "- 한두 문장으로 짧게. 사과·면책·군더더기 표현을 쓰지 않습니다.",
  "- 카메라 이미지가 주어지면 본 것을 사실대로, 간결하게 묘사하거나 짚어 줍니다.",
  "- 불교 용어(禪/명상/간화선 등)를 직접 쓰지 않습니다. 평범한 말로 의미만 전합니다.",
].join("\n");

function persona(): string {
  const override = process.env.ROBOT_PERSONA?.trim();
  return override && override.length > 0 ? override : DEFAULT_PERSONA;
}

// Timing-safe device token check. Returns true only when ROBOT_DEVICE_TOKEN is
// configured AND the presented token matches exactly.
function tokenMatches(presented: string): boolean {
  const expected = loadEnv().ROBOT_DEVICE_TOKEN;
  if (!expected) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function readToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }
  const header = req.headers["x-robot-token"];
  if (typeof header === "string" && header.length > 0) return header.trim();
  return null;
}

// Device-token gate. 503 when the feature is unconfigured (no token in env),
// 401 when a wrong/absent token is presented.
function requireDeviceToken(req: Request, res: Response, next: NextFunction): void {
  if (!loadEnv().ROBOT_DEVICE_TOKEN) {
    fail(res, 503, "robot_disabled", {
      message: "ROBOT_DEVICE_TOKEN not configured",
    });
    return;
  }
  const presented = readToken(req);
  if (!presented || !tokenMatches(presented)) {
    fail(res, 401, "robot_auth_required");
    return;
  }
  next();
}

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

robotRouter.use(requireDeviceToken);

// ── POST /api/robot/chat ────────────────────────────────────────────
// Body: { message, image_base64?, history?, persona_extra? }
// Returns: { text, model, input_tokens, output_tokens, latency_ms }
robotRouter.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const body = parseBody(RobotChatBody, req, res);
    if (!body) return;

    const systemMessage = body.persona_extra
      ? `${persona()}\n\n${body.persona_extra}`
      : persona();

    // Prior turns supplied by the gateway (it owns memory; this route is stateless).
    const messages: Array<{ role: "user" | "assistant"; content: AnthropicMessageContent }> =
      (body.history ?? []).map((m) => ({ role: m.role, content: m.content }));

    // Pick a vision provider only when an image is attached AND a vision-capable
    // key exists. Kimi (default text provider) cannot see images.
    const imageB64 = body.image_base64;
    const visionProvider = imageB64
      ? hasFeature("anthropic")
        ? "anthropic"
        : hasFeature("openai")
        ? "openai"
        : null
      : null;

    if (imageB64 && visionProvider) {
      messages.push({
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: imageB64 },
          },
          { type: "text", text: body.message },
        ],
      });
    } else if (imageB64) {
      // No vision key — keep the turn alive but tell the model it is blind.
      messages.push({
        role: "user",
        content: `[카메라 이미지가 첨부됐지만 현재 비전 모델이 설정되지 않아 볼 수 없습니다]\n\n${body.message}`,
      });
    } else {
      messages.push({ role: "user", content: body.message });
    }

    try {
      let result;
      if (visionProvider === "anthropic") {
        result = await callAnthropic({ userId: ROBOT_USER_ID, system: systemMessage, messages });
      } else if (visionProvider === "openai") {
        result = await callOpenAIVision({ userId: ROBOT_USER_ID, system: systemMessage, messages });
      } else {
        result = await callTutorLLM({ userId: ROBOT_USER_ID, system: systemMessage, messages });
      }
      ok(res, {
        text: result.text,
        model: result.model,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        latency_ms: result.latencyMs,
      });
    } catch (err) {
      if (err instanceof UpstreamError) {
        fail(res, 502, "upstream_error", { message: `${err.provider}_${err.code}` });
        return;
      }
      throw err;
    }
  }),
);

// ── GET /api/robot/health ───────────────────────────────────────────
// Token-gated readiness probe for the gateway: confirms the device token is
// accepted and reports which providers are live (text + vision).
robotRouter.get("/health", (_req, res) => {
  const textProvider = hasFeature("kimi") ? "kimi" : hasFeature("anthropic") ? "anthropic" : "none";
  const visionProvider = hasFeature("anthropic")
    ? "anthropic"
    : hasFeature("openai")
    ? "openai"
    : "none";
  ok(res, { status: "ok", text_provider: textProvider, vision_provider: visionProvider });
});
