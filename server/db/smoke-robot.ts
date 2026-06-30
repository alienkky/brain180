// Robot bridge HTTP smoke (ALI-21). Companion to smoke-http.ts but for the
// device path: no Lucia cookie, no DB rows — just the bearer-token robot route.
//
// Pre-conditions:
//   1. `npm run dev:server` running on APP_BASE_URL (or SMOKE_BASE_URL).
//   2. .env has ROBOT_DEVICE_TOKEN set AND a text provider key (KIMI/ANTHROPIC).
//   3. ROBOT_DEVICE_TOKEN in this shell matches the server's.
//
// What it does:
//   1. GET  /api/robot/health (Bearer)            → providers live
//   2. POST /api/robot/chat  { message }          → text reply (text path)
//   3. POST /api/robot/chat  { } (bad body)       → 422 validation
//   4. GET  /api/robot/health (no token)          → 401
//
// Exits 0 on PASS, 1 on FAIL. One run = ~1 LLM call (~₩0).

function baseUrl(): string {
  return process.env.SMOKE_BASE_URL ?? process.env.APP_BASE_URL ?? "http://localhost:3001";
}

function token(): string {
  const t = process.env.ROBOT_DEVICE_TOKEN;
  if (!t) {
    console.error("FAIL: ROBOT_DEVICE_TOKEN not set in this shell");
    process.exit(1);
  }
  return t;
}

async function call(path: string, init?: RequestInit, withToken = true): Promise<Response> {
  const headers = new Headers(init?.headers ?? {});
  if (withToken) headers.set("Authorization", `Bearer ${token()}`);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${baseUrl()}${path}`, { ...init, headers });
}

function assert(cond: boolean, label: string, detail?: unknown): void {
  if (cond) {
    console.log(`  ok   ${label}`);
  } else {
    console.error(`  FAIL ${label}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  console.log(`[smoke-robot] base=${baseUrl()}`);

  // 1. health (authed)
  const health = await call("/api/robot/health", { method: "GET" });
  const healthBody = await health.json().catch(() => ({}));
  assert(health.status === 200, "GET /api/robot/health → 200", health.status);
  const textProvider = (healthBody as { data?: { text_provider?: string } }).data?.text_provider;
  assert(textProvider !== undefined && textProvider !== "none", "text provider configured", healthBody);

  // 2. chat (text path)
  const chat = await call("/api/robot/chat", {
    method: "POST",
    body: JSON.stringify({ message: "앞에 뭐가 보이는지 한 문장으로 말해줘. (이미지는 없음)" }),
  });
  const chatBody = await chat.json().catch(() => ({}));
  assert(chat.status === 200, "POST /api/robot/chat → 200", chat.status);
  const text = (chatBody as { data?: { text?: string } }).data?.text;
  assert(typeof text === "string" && text.length > 0, "reply text non-empty", chatBody);
  if (typeof text === "string") console.log(`  reply: ${text.slice(0, 120)}`);

  // 3. validation
  const bad = await call("/api/robot/chat", { method: "POST", body: JSON.stringify({}) });
  assert(bad.status === 422, "POST /api/robot/chat {} → 422", bad.status);

  // 4. auth gate
  const noAuth = await call("/api/robot/health", { method: "GET" }, false);
  assert(noAuth.status === 401, "GET /api/robot/health (no token) → 401", noAuth.status);

  console.log(process.exitCode ? "[smoke-robot] FAIL" : "[smoke-robot] PASS");
}

main().catch((err) => {
  console.error("[smoke-robot] threw", err);
  process.exit(1);
});
