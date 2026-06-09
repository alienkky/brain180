import { useState } from "react";
import { api } from "../../v2-shell/api";
import type { V3User } from "../types";

interface Props {
  onLogin: (user: V3User) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const data = await api.login(email, password);
        onLogin({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          status: data.user.status,
        });
      } else {
        await api.register(email, password, name);
        setRegistered(true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-brain-bg flex items-center justify-center p-4">
        <div className="bg-brain-surface border border-brain-border rounded-2xl p-8 w-full max-w-sm text-center">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-lg font-semibold text-brain-text mb-2">가입 신청 완료</h2>
          <p className="text-sm text-brain-text-muted">
            관리자 승인 후 로그인할 수 있습니다.<br />이메일을 확인해 주세요.
          </p>
          <button
            onClick={() => { setMode("login"); setRegistered(false); }}
            className="mt-6 px-4 py-2 rounded-lg border border-brain-border text-sm text-brain-text-muted hover:text-brain-text"
          >
            로그인으로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brain-bg flex items-center justify-center p-4">
      <div className="bg-brain-surface border border-brain-border rounded-2xl p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brain-text tracking-tight">Brain180</h1>
          <p className="text-xs text-brain-text-muted mt-1">천재의 뇌로 보는 읽기 훈련</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-brain-surface-soft rounded-lg p-1 mb-6">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === m
                  ? "bg-brain-surface shadow text-brain-text"
                  : "text-brain-text-muted hover:text-brain-text"
              }`}
            >
              {m === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "register" && (
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-brain-border bg-brain-bg text-sm text-brain-text placeholder-brain-text-soft focus:outline-none focus:border-brain-accent"
            />
          )}
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-brain-border bg-brain-bg text-sm text-brain-text placeholder-brain-text-soft focus:outline-none focus:border-brain-accent"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-brain-border bg-brain-bg text-sm text-brain-text placeholder-brain-text-soft focus:outline-none focus:border-brain-accent"
          />

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-brain-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity mt-1"
          >
            {loading ? "처리 중..." : mode === "login" ? "로그인" : "가입 신청"}
          </button>
        </form>
      </div>
    </div>
  );
}
