// E2E test helpers — HTTP client against running dev server.
// Set TEST_BASE_URL env var (default: http://localhost:3000).

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

export interface FetchOptions extends RequestInit {
  json?: unknown;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  headers: Headers;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: FetchOptions = {},
  cookie?: string,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  if (opts.json !== undefined) opts.body = JSON.stringify(opts.json);

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...headers, ...((opts.headers as Record<string, string>) ?? {}) },
    credentials: "include",
  });

  const data = await res.json().catch(() => null) as T;
  return { ok: res.ok, status: res.status, data, headers: res.headers };
}

export function extractSetCookie(headers: Headers): string {
  return headers.getSetCookie?.()?.join("; ") ?? headers.get("set-cookie") ?? "";
}

let _cookie = "";

export const session = {
  clear() { _cookie = ""; },
  get() { return _cookie; },
  async register(email: string, password: string, name: string) {
    const res = await apiFetch<{ data: { user: { id: string } } }>(
      "/api/auth/register",
      { method: "POST", json: { email, password, name } },
    );
    if (res.headers) _cookie = extractSetCookie(res.headers);
    return res;
  },
  async login(email: string, password: string) {
    const res = await apiFetch<{ data: { user: { id: string } } }>(
      "/api/auth/login",
      { method: "POST", json: { email, password } },
    );
    if (res.headers) _cookie = extractSetCookie(res.headers);
    return res;
  },
  get cookie() { return _cookie; },
};
