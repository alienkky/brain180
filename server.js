import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(join(__dirname, "dist")));

const SYSTEM_PROMPT = `당신은 Brain180 학습 프로그램의 AI 튜터입니다.

Brain180은 천재들의 고전 텍스트에서 **지식(WHAT)**이 아닌 **뇌인지 구조(HOW THEY THINK)**를 시각화하여, 4차원적 글 해석 능력을 기르는 학습 프로그램입니다.

학생이 텍스트를 읽고 인지 구조 다이어그램(노드와 엣지)을 만들었습니다. 학생의 결과물을 기반으로 대화하세요.

## 역할
- 학생의 인지 구조 다이어그램을 분석하고 피드백을 제공합니다.
- 저자의 사고 흐름에 대해 토론합니다.
- 학생이 놓친 관계나 개념을 소크라테스식 질문으로 유도합니다.
- 학생의 해석을 존중하되, 더 깊은 사고를 자극합니다.

## 노드 유형
- root: 텍스트의 핵심 주제/개념
- anchor: 주요 지지 개념
- bridge: 개념 간 연결 역할
- branch: 파생/부수 개념

## 톤
- 다정하고 격려하는 톤. 한국어로 대화.
- 정답을 알려주지 말고, 질문으로 유도하세요.
- 학생의 수준에 맞추어 대화하세요.`;

function buildContextMessage(context) {
  const parts = [];

  if (context.textSource) {
    parts.push(`## 텍스트 정보\n- 제목: ${context.textSource.title}\n- 저자: ${context.textSource.author}\n- 분야: ${context.textSource.field}`);
  }

  if (context.userNodes?.length > 0) {
    const nodeList = context.userNodes
      .map((n) => `  - "${n.concept}" (${n.type})`)
      .join("\n");
    parts.push(`## 학생이 만든 노드 (${context.userNodes.length}개)\n${nodeList}`);
  }

  if (context.userEdges?.length > 0) {
    const edgeList = context.userEdges
      .map((e) => `  - "${e.fromConcept}" → "${e.toConcept}"${e.label ? ` [${e.label}]` : ""}`)
      .join("\n");
    parts.push(`## 학생이 만든 연결 (${context.userEdges.length}개)\n${edgeList}`);
  }

  if (context.systemNodes?.length > 0) {
    const sysNodeList = context.systemNodes
      .map((n) => `  - "${n.concept}" (${n.type})`)
      .join("\n");
    parts.push(`## 시스템 정답 노드 (${context.systemNodes.length}개)\n${sysNodeList}`);
  }

  if (context.evaluationScore !== undefined) {
    parts.push(`## 현재 평가 점수: ${context.evaluationScore}%`);
  }

  return parts.length > 0
    ? `[학생의 현재 작업 컨텍스트]\n\n${parts.join("\n\n")}`
    : "";
}

// ─── Provider: Claude (Anthropic) ───────────────────────────────

async function streamClaude(apiMessages, systemPrompt, res) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = await client.messages.stream({
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: apiMessages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
    }
  }
}

// ─── Provider: OpenAI (GPT / Codex) ────────────────────────────

async function streamOpenAI(apiMessages, systemPrompt, res) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });

  const openaiMessages = [
    { role: "system", content: systemPrompt },
    ...apiMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const stream = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: 1024,
    messages: openaiMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
  }
}

// ─── Provider: Kimi / Moonshot (OpenAI-compatible API) ───────────

async function streamKimi(apiMessages, systemPrompt, res) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey: process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY,
    baseURL: process.env.KIMI_BASE_URL || process.env.MOONSHOT_BASE_URL || "https://api.moonshot.ai/v1",
  });
  const model = process.env.KIMI_MODEL || process.env.MOONSHOT_MODEL || "kimi-k2.6";
  const fallbackModel = process.env.KIMI_FALLBACK_MODEL || process.env.MOONSHOT_FALLBACK_MODEL || "moonshot-v1-8k";
  const maxTokens = Number(process.env.KIMI_MAX_TOKENS || process.env.MOONSHOT_MAX_TOKENS || 512);
  const retryMaxTokens = Number(process.env.KIMI_RETRY_MAX_TOKENS || process.env.MOONSHOT_RETRY_MAX_TOKENS || Math.max(maxTokens * 2, 1024));
  const timeoutMs = Number(process.env.KIMI_TIMEOUT_MS || process.env.MOONSHOT_TIMEOUT_MS || 45000);
  const streamEnabled = String(process.env.KIMI_STREAM || process.env.MOONSHOT_STREAM || "false").toLowerCase() === "true";
  const thinkingType = String(process.env.KIMI_THINKING || process.env.MOONSHOT_THINKING || "disabled").toLowerCase();
  const temperature = Number(process.env.KIMI_TEMPERATURE || process.env.MOONSHOT_TEMPERATURE || 0.3);

  const kimiMessages = [
    { role: "system", content: systemPrompt },
    ...apiMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const withTimeout = (promise) =>
    new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Kimi request timed out after ${timeoutMs}ms`)), timeoutMs);
      promise.then(
        (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      );
    });

  const extractText = (completion) => {
    const message = completion?.choices?.[0]?.message;
    const content = message?.content;

    if (typeof content === "string") return content.trim();
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === "string") return part;
          return part?.text || part?.content || "";
        })
        .join("")
        .trim();
    }

    return String(
      message?.reasoning_content ||
        message?.reasoning ||
        completion?.output_text ||
        "",
    ).trim();
  };

  if (!streamEnabled) {
    const createCompletion = (tokens, requestedModel = model) =>
      withTimeout(client.chat.completions.create({
        model: requestedModel,
        max_completion_tokens: tokens,
        max_tokens: tokens,
        messages: kimiMessages,
        response_format: { type: "text" },
        stream: false,
        temperature,
        ...(requestedModel.startsWith("kimi-") ? { thinking: { type: thinkingType } } : {}),
      }));

    let completion = await createCompletion(maxTokens);
    let text = extractText(completion);
    if (!text && retryMaxTokens > maxTokens) {
      completion = await createCompletion(retryMaxTokens);
      text = extractText(completion);
    }
    if (!text && fallbackModel && fallbackModel !== model) {
      completion = await createCompletion(retryMaxTokens, fallbackModel);
      text = extractText(completion);
    }
    if (!text) {
      throw new Error("Kimi returned an empty response after retry. Check Moonshot balance, model access, or Railway deploy logs.");
    }
    res.write(`data: ${JSON.stringify({ text })}\n\n`);
    return;
  }

  const stream = await withTimeout(client.chat.completions.create({
    model,
    max_completion_tokens: maxTokens,
    max_tokens: maxTokens,
    messages: kimiMessages,
    stream: true,
    temperature,
    ...(model.startsWith("kimi-") ? { thinking: { type: thinkingType } } : {}),
  }));

  let wroteText = false;
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) {
      wroteText = true;
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
  }
  if (!wroteText) {
    throw new Error("Kimi stream ended without text");
  }
}

// ─── Provider: Gemini (Google) ──────────────────────────────────

async function streamGemini(apiMessages, systemPrompt, res) {
  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const contents = apiMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const stream = await client.models.generateContentStream({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    config: { systemInstruction: systemPrompt, maxOutputTokens: 1024 },
    contents,
  });

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
  }
}

// ─── Provider: Ollama (local Qwen/Gemma/Hermes) ──────────────────

async function streamOllama(apiMessages, systemPrompt, res) {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "qwen3.5:35b";
  const headers = { "Content-Type": "application/json" };

  if (process.env.OLLAMA_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${process.env.OLLAMA_AUTH_TOKEN}`;
  }
  if (process.env.OLLAMA_CF_ACCESS_CLIENT_ID && process.env.OLLAMA_CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = process.env.OLLAMA_CF_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = process.env.OLLAMA_CF_ACCESS_CLIENT_SECRET;
  }

  let response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...apiMessages.map((m) => ({ role: m.role, content: m.content })),
        ],
        options: {
          temperature: Number(process.env.OLLAMA_TEMPERATURE || 0.4),
          num_predict: Number(process.env.OLLAMA_MAX_TOKENS || 1024),
        },
      }),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "fetch failed";
    throw new Error(`Cannot reach Ollama at ${baseUrl}. If this is Railway, set AI_PROVIDER=kimi for Kimi API or set OLLAMA_BASE_URL to a reachable tunnel. Detail: ${detail}`);
  }

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Ollama request failed: HTTP ${response.status}${detail ? ` - ${detail}` : ""}`);
  }

  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const data = JSON.parse(trimmed);
      const text = data.message?.content;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
      if (data.done) return;
    }
  }
}

// ─── Provider resolution ────────────────────────────────────────

function canonicalProviderName(value) {
  const normalized = (value || "").toLowerCase().trim();
  if (["ollama", "local", "qwen", "qwen3.5", "qwen35", "gemma", "hermes"].includes(normalized)) return "ollama";
  if (["kimi", "moonshot", "kimi-k2.6", "kimi-k26"].includes(normalized)) return "kimi";
  if (["openai", "gpt", "codex"].includes(normalized)) return "openai";
  if (["gemini", "google"].includes(normalized)) return "gemini";
  if (["claude", "anthropic", ""].includes(normalized)) return "claude";
  return normalized;
}

function resolveProvider(requested) {
  const explicit = requested || process.env.AI_PROVIDER || "";
  const normalized = explicit.toLowerCase().trim();

  if (["ollama", "local", "qwen", "qwen3.5", "qwen35", "gemma", "hermes"].includes(normalized)) {
    return { provider: "ollama", stream: streamOllama };
  }
  if (["kimi", "moonshot", "kimi-k2.6", "kimi-k26"].includes(normalized)) {
    if (!process.env.KIMI_API_KEY && !process.env.MOONSHOT_API_KEY) {
      return { error: "KIMI_API_KEY or MOONSHOT_API_KEY not configured" };
    }
    return { provider: "kimi", stream: streamKimi };
  }
  if (["openai", "gpt", "codex"].includes(normalized)) {
    if (!process.env.OPENAI_API_KEY) return { error: "OPENAI_API_KEY not configured" };
    return { provider: "openai", stream: streamOpenAI };
  }
  if (["gemini", "google"].includes(normalized)) {
    if (!process.env.GEMINI_API_KEY) return { error: "GEMINI_API_KEY not configured" };
    return { provider: "gemini", stream: streamGemini };
  }
  if (["claude", "anthropic", ""].includes(normalized)) {
    if (!process.env.ANTHROPIC_API_KEY) return { error: "ANTHROPIC_API_KEY not configured" };
    return { provider: "claude", stream: streamClaude };
  }

  return { error: `Unknown provider: ${explicit}` };
}

// ─── GET /api/providers — which providers are available ─────────

app.get("/api/providers", (_req, res) => {
  const isRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID
  );
  const available = [];
  if (process.env.OLLAMA_BASE_URL || !isRailway) available.push("ollama");
  if (process.env.ANTHROPIC_API_KEY) available.push("claude");
  if (process.env.OPENAI_API_KEY) available.push("openai");
  if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) available.push("kimi");
  if (process.env.GEMINI_API_KEY) available.push("gemini");

  const preferred = canonicalProviderName(process.env.AI_PROVIDER || (available.includes("claude") ? "claude" : "ollama"));
  const active = available.includes(preferred) ? preferred : available[0] || preferred;
  res.json({ available, active });
});

// ─── POST /api/chat ─────────────────────────────────────────────

app.post("/api/chat", async (req, res) => {
  const { messages, context, provider: requestedProvider } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  const resolved = resolveProvider(requestedProvider);
  if (resolved.error) {
    return res.status(500).json({ error: resolved.error });
  }

  const apiMessages = [];
  const contextMsg = buildContextMessage(context || {});
  if (contextMsg) {
    apiMessages.push({ role: "user", content: contextMsg });
    apiMessages.push({
      role: "assistant",
      content: "네, 학생의 작업 컨텍스트를 확인했습니다. 대화를 시작할 준비가 되었습니다.",
    });
  }
  const historyLimit = Number(process.env.CHAT_HISTORY_LIMIT || 8);
  for (const m of messages.slice(-historyLimit)) {
    apiMessages.push({ role: m.role, content: m.content });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const writeSse = (chunk) => {
    if (!res.writableEnded && !res.destroyed) {
      res.write(chunk);
    }
  };

  res.flushHeaders?.();
  writeSse(": connected\n\n");

  const heartbeat = setInterval(() => {
    writeSse(": waiting\n\n");
  }, 10000);
  res.on("close", () => clearInterval(heartbeat));

  try {
    await resolved.stream(apiMessages, SYSTEM_PROMPT, res);
    writeSse("data: [DONE]\n\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    writeSse(`data: ${JSON.stringify({ error: msg })}\n\n`);
  } finally {
    clearInterval(heartbeat);
    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
  }
});

// ─── Feedback storage ───────────────────────────────────────────

const DATA_DIR = join(__dirname, "data");
const FEEDBACK_FILE = join(DATA_DIR, "feedback.json");

async function loadFeedback() {
  try {
    const raw = await readFile(FEEDBACK_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveFeedback(entries) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FEEDBACK_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

app.post("/api/feedback", async (req, res) => {
  const { studentName, textId, textTitle, content, rating, cognitiveMap } = req.body;
  if (!content || !textId) {
    return res.status(400).json({ error: "content and textId required" });
  }

  const entry = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    studentName: studentName || "익명",
    textId,
    textTitle: textTitle || "",
    content,
    rating: rating || null,
    cognitiveMap: cognitiveMap || null,
    createdAt: new Date().toISOString(),
  };

  const entries = await loadFeedback();
  entries.push(entry);
  await saveFeedback(entries);

  res.json({ ok: true, id: entry.id });
});

app.get("/api/feedback", async (req, res) => {
  const entries = await loadFeedback();
  const { textId } = req.query;
  if (textId) {
    return res.json(entries.filter((e) => e.textId === textId));
  }
  res.json(entries);
});

app.get("/{*splat}", (_req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Brain180 server listening on port ${PORT}`);
});
