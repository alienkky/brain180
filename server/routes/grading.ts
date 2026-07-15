// v4 채점 콘솔 API — 관리자 전용 (Phase 2 이식: brain180-v4-full 콘솔 → AdminShell 탭).
// 채점 두뇌(vLLM, OpenAI 호환)는 별도 서버 — 여기는 중계 + 골든셋 파일 관리만 한다.
// 루브릭/골든셋의 진실은 v4 저장소 파일(B180_V4_DIR)이며 DB에 복제하지 않는다.

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { ok, fail } from "../lib/envelope.js";
import { requireAdmin } from "../middleware/auth.js";

// 로컬 개발 기본값 — 배포 시 env로 오버라이드
const V4_DIR = process.env.B180_V4_DIR ?? "E:/brain180/brain180-v4-full";
const VLLM_ENDPOINT = process.env.B180_VLLM ?? "http://localhost:8000/v1";
const VLLM_MODEL = process.env.B180_MODEL ?? "qwen36";

const RUBRIC_PATH = join(V4_DIR, "rubric", "v4", "rubric_v4.md");
const GOLDEN_PATH = join(V4_DIR, "data", "golden", "golden_v4.jsonl");

const STAGE_NAMES: Record<number, string> = {
  1: "정밀 포착",
  2: "구조 복원",
  3: "렌즈 발견",
  4: "저자 되어보기",
  5: "렌즈 재배선",
};

export const gradingRouter = Router();
gradingRouter.use(requireAdmin);

// ── helpers ──────────────────────────────────────────────

function readGoldenItems(): Array<Record<string, unknown>> {
  if (!existsSync(GOLDEN_PATH)) return [];
  return readFileSync(GOLDEN_PATH, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

function goldenStats() {
  const items = readGoldenItems();
  const stageDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let borderline = 0;
  for (const it of items) {
    const st = Number(it.stage);
    if (st >= 1 && st <= 5) stageDist[st] = (stageDist[st] ?? 0) + 1;
    if (it.difficulty === "borderline") borderline += 1;
  }
  return {
    total: items.length,
    stage_dist: stageDist,
    borderline,
    next_id: `G4-${String(items.length + 1).padStart(3, "0")}`,
  };
}

function buildMessages(stage: number, passage: string, question: string, answer: string) {
  // 매 요청 재로드 — rubric_v4.md 저장 즉시 다음 채점에 반영
  const rubricText = readFileSync(RUBRIC_PATH, "utf-8");
  const system = [
    "당신은 Brain180 v4 인지 독해 채점 전문가입니다.",
    "아래 채점기준(루브릭)에 엄격히 근거하여 채점하십시오.",
    "",
    "=== Brain180 v4 채점기준 ===",
    rubricText,
    "=== 채점기준 끝 ===",
    "",
    "출력 형식(반드시 준수):",
    "첫 줄: 점수: X/5  — X는 판정한 밴드 번호(1~5)다.",
    "  (예: Lv.4 판정이면 '점수: 4/5'. 대표점수(80점 등)·백분점(0~100)을 절대 쓰지 말 것)",
    "둘째 줄부터: 근거 (루브릭 조항을 인용할 것)",
  ].join("\n");
  const user =
    `다음 학생 응답을 Brain180 v4 채점기준의 ${STAGE_NAMES[stage]}(항목 ${stage}) 기준으로 채점하라. ` +
    `밴드(1~5)와 근거를 제시하라.\n\n지문: ${passage}\n문항: ${question}\n학생 응답: ${answer}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

// ── routes ───────────────────────────────────────────────

gradingRouter.get("/status", async (_req: Request, res: Response) => {
  let server = "offline";
  try {
    const r = await fetch(`${VLLM_ENDPOINT}/models`, { signal: AbortSignal.timeout(5000) });
    server = r.ok ? "online" : `http ${r.status}`;
  } catch {
    /* offline 유지 */
  }
  return ok(res, {
    endpoint: VLLM_ENDPOINT,
    model: VLLM_MODEL,
    server,
    rubric_found: existsSync(RUBRIC_PATH),
    v4_dir: V4_DIR,
  });
});

gradingRouter.get("/golden/stats", (_req: Request, res: Response) => {
  return ok(res, goldenStats());
});

const GradeBody = z.object({
  stage: z.number().int().min(1).max(5),
  passage: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
});

// SSE 스트리밍 채점 — envelope 미적용 (스트림이라 §0-1 예외)
gradingRouter.post("/grade", async (req: Request, res: Response) => {
  const parsed = GradeBody.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "validation_failed", { details: parsed.error.flatten() });
  }
  if (!existsSync(RUBRIC_PATH)) {
    return fail(res, 500, "rubric_not_found", { message: RUBRIC_PATH });
  }
  const { stage, passage, question, answer } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const upstream = await fetch(`${VLLM_ENDPOINT}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VLLM_MODEL,
        messages: buildMessages(stage, passage, question, answer),
        temperature: 0,
        max_tokens: 400,
        stream: true,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: AbortSignal.timeout(900_000),
    });
    if (!upstream.ok || !upstream.body) {
      send({ error: `vLLM http ${upstream.status}` });
      return res.end();
    }
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";
      for (const frame of frames) {
        const line = frame.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const delta: string =
            JSON.parse(data)?.choices?.[0]?.delta?.content ?? "";
          if (delta) send({ t: delta });
        } catch {
          /* partial frame 무시 */
        }
      }
    }
    send({ done: true });
  } catch (e) {
    send({ error: e instanceof Error ? e.message : String(e) });
  }
  return res.end();
});

const SaveBody = z.object({
  stage: z.number().int().min(1).max(5),
  passage: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  score: z.number().int().min(1).max(5), // 사용자가 확정한 밴드 — 점수 결정권은 사용자
  rationale: z.string().min(1),
  difficulty: z.enum(["clear", "borderline"]),
  note: z.string().default(""),
});

gradingRouter.post("/golden", (req: Request, res: Response) => {
  const parsed = SaveBody.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "validation_failed", { details: parsed.error.flatten() });
  }
  const b = parsed.data;
  // rationale 첫 줄의 점수를 확정 밴드로 강제 정합 (schema.md 규칙 1)
  let rationale = b.rationale.trim();
  if (/^점수: \d+\/\d+/.test(rationale)) {
    rationale = rationale.replace(/^점수: \d+\/\d+/, `점수: ${b.score}/5`);
  } else {
    rationale = `점수: ${b.score}/5\n${rationale}`;
  }
  const stats = goldenStats();
  const item = {
    id: stats.next_id,
    stage: b.stage,
    stage_name: STAGE_NAMES[b.stage],
    instruction:
      `다음 학생 응답을 Brain180 v4 채점기준의 ${STAGE_NAMES[b.stage]}(항목 ${b.stage}) 기준으로 채점하라. ` +
      "밴드(1~5)와 근거를 제시하라.",
    input: `지문: ${b.passage}\n문항: ${b.question}\n학생 응답: ${b.answer}`,
    output: rationale,
    score: b.score,
    max_score: 5,
    difficulty: b.difficulty,
    author: req.user?.name ?? "관리자",
    note: b.note,
  };
  appendFileSync(GOLDEN_PATH, JSON.stringify(item) + "\n", "utf-8");
  return ok(res, { id: item.id, stats: goldenStats() }, 201);
});
