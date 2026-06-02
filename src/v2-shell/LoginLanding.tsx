import { useState, type FormEvent, type ReactNode } from "react";
import { ApiError, api, type UserDto } from "./api";

type LoginMode = "login" | "register" | "forgot" | "reset";

export function LoginLanding({ onLoggedIn }: { onLoggedIn: (u: UserDto) => void }) {
  const [mode, setMode] = useState<LoginMode>(() => {
    if (typeof window === "undefined") return "login";
    return window.location.pathname === "/reset-password" ? "reset" : "login";
  });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resetToken, setResetToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") ?? "";
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: LoginMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setDevResetUrl(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setDevResetUrl(null);

    if (mode === "register" && password !== confirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (mode === "reset" && newPassword !== confirm) {
      setError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        const data = await api.login(email, password);
        onLoggedIn(data.user);
        return;
      }
      if (mode === "register") {
        const data = await api.register(email, password, name);
        onLoggedIn(data.user);
        return;
      }
      if (mode === "forgot") {
        const result = await api.forgotPassword(email);
        setNotice(
          result.sent
            ? "비밀번호 재설정 메일을 보냈습니다."
            : "메일 발송 설정이 없어 개발용 재설정 링크를 표시합니다.",
        );
        if (result.url) setDevResetUrl(result.url);
        return;
      }

      await api.resetPassword(resetToken, newPassword);
      window.history.replaceState({}, "", "/");
      setPassword("");
      setNewPassword("");
      setConfirm("");
      setNotice("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.");
      setMode("login");
    } catch (e: unknown) {
      setError(friendlyAuthError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid h-full overflow-y-auto bg-brain-bg lg:grid-cols-[minmax(0,1fr)_430px]">
      <section className="flex min-h-[620px] flex-col justify-between px-6 py-8 md:px-10">
        <div className="max-w-4xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-brain-border bg-brain-surface px-3 py-1 text-xs text-brain-text-muted shadow-soft-1">
            <span className="h-2 w-2 rounded-full bg-brain-accent" />
            Brain180 작업 페이지
          </div>
          <h1 className="font-display text-4xl leading-tight tracking-tight text-brain-text md:text-5xl">
            텍스트를 읽고, 구조를 그리고, AI 튜터와 바로 대화합니다.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-brain-text-muted">
            로그인하면 라이브러리, 분석 캔버스, 튜터 대화, 학습 기록으로 바로 이어집니다.
          </p>
        </div>

        <div className="mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          <PreviewPanel title="라이브러리" meta="3축 텍스트" rows={["인지", "가치", "시간"]} />
          <PreviewPanel title="분석 캔버스" meta="노드와 연결" rows={["개념", "근거", "전환"]} />
          <PreviewPanel title="AI 튜터" meta="결과물 기반 대화" rows={["질문", "피드백", "평가"]} />
        </div>
      </section>

      <form
        onSubmit={submit}
        className="m-4 flex min-h-[calc(100vh-2rem)] flex-col justify-center space-y-4 rounded-2xl border border-brain-border bg-brain-surface p-6 shadow-soft-2 md:m-6 md:p-8"
      >
        <div>
          <h2 className="font-display text-2xl">{modeTitle(mode)}</h2>
          <p className="mt-1 text-sm text-brain-text-muted">{modeDescription(mode)}</p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg border border-brain-border bg-brain-bg p-1">
          <ModeButton active={mode === "login"} onClick={() => switchMode("login")}>
            로그인
          </ModeButton>
          <ModeButton active={mode === "register"} onClick={() => switchMode("register")}>
            가입
          </ModeButton>
        </div>

        {mode === "register" && (
          <TextInput
            label="이름"
            value={name}
            onChange={setName}
            autoComplete="name"
            minLength={1}
            maxLength={40}
          />
        )}

        {(mode === "login" || mode === "register" || mode === "forgot") && (
          <TextInput
            label="이메일"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
          />
        )}

        {(mode === "login" || mode === "register") && (
          <TextInput
            label="비밀번호"
            value={password}
            onChange={setPassword}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "register" ? 8 : 1}
            help={mode === "register" ? "8자 이상. 영문 / 숫자 / 특수문자 중 2종 이상 권장." : null}
          />
        )}

        {mode === "reset" && (
          <>
            <TextInput label="재설정 토큰" value={resetToken} onChange={setResetToken} />
            <TextInput
              label="새 비밀번호"
              value={newPassword}
              onChange={setNewPassword}
              type="password"
              autoComplete="new-password"
              minLength={8}
            />
          </>
        )}

        {(mode === "register" || mode === "reset") && (
          <TextInput
            label={mode === "register" ? "비밀번호 확인" : "새 비밀번호 확인"}
            value={confirm}
            onChange={setConfirm}
            type="password"
            autoComplete="new-password"
          />
        )}

        {notice && (
          <div className="rounded border border-brain-accent/40 bg-brain-accent-soft/50 px-3 py-2 text-sm text-brain-text">
            {notice}
            {devResetUrl && (
              <button
                type="button"
                onClick={() => {
                  const url = new URL(devResetUrl, window.location.origin);
                  setResetToken(url.searchParams.get("token") ?? "");
                  switchMode("reset");
                }}
                className="mt-2 block text-xs font-medium text-brain-accent hover:underline"
              >
                개발용 재설정 토큰 입력
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="rounded border border-brain-danger/40 bg-brain-accent-soft/50 px-3 py-2 text-sm text-brain-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-brain-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "처리 중..." : submitLabel(mode)}
        </button>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-brain-text-muted">
          {mode !== "forgot" && (
            <button type="button" onClick={() => switchMode("forgot")} className="hover:text-brain-text">
              비밀번호 찾기
            </button>
          )}
          {mode !== "reset" && (
            <button type="button" onClick={() => switchMode("reset")} className="hover:text-brain-text">
              토큰으로 재설정
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-md px-3 py-1.5 text-sm transition " +
        (active ? "bg-brain-accent text-white" : "text-brain-text-muted hover:text-brain-text")
      }
    >
      {children}
    </button>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  minLength,
  maxLength,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  help?: string | null;
}) {
  return (
    <label className="block text-sm">
      <span className="text-brain-text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={maxLength}
        required
        className="mt-1 w-full rounded border border-brain-border bg-brain-bg px-3 py-2 outline-none focus:border-brain-accent"
      />
      {help && <p className="mt-1 text-[11px] text-brain-text-soft">{help}</p>}
    </label>
  );
}

function PreviewPanel({ title, meta, rows }: { title: string; meta: string; rows: string[] }) {
  return (
    <div className="rounded-xl border border-brain-border bg-brain-surface p-4 shadow-soft-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-base text-brain-text">{title}</div>
          <div className="mt-1 text-xs text-brain-text-muted">{meta}</div>
        </div>
        <span className="rounded-full bg-brain-accent-soft px-2 py-0.5 text-[11px] text-brain-accent">
          준비됨
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row} className="flex items-center gap-2 text-xs text-brain-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brain-accent" />
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}

function friendlyAuthError(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "weak_password":
        return "비밀번호가 약합니다. 8자 이상, 영문/숫자/특수문자 중 2종 이상을 섞어 주세요.";
      case "email_taken":
        return "이미 사용 중인 이메일입니다. 로그인으로 진행해 주세요.";
      case "invalid_credentials":
        return "이메일 또는 비밀번호가 일치하지 않습니다.";
      case "validation_error":
        return "입력값을 확인해 주세요. 이메일 형식과 비밀번호 길이가 맞아야 합니다.";
      case "account_blocked":
        return "계정이 차단 또는 거절 상태입니다. 관리자에게 문의해 주세요.";
      case "rate_limited":
        return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
      default:
        return `${e.message || "오류가 발생했습니다"} (${e.code})`;
    }
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

function modeTitle(mode: LoginMode): string {
  if (mode === "register") return "계정 만들기";
  if (mode === "forgot") return "비밀번호 찾기";
  if (mode === "reset") return "비밀번호 재설정";
  return "로그인";
}

function modeDescription(mode: LoginMode): string {
  if (mode === "register") return "이메일과 이름으로 베타 계정을 만듭니다.";
  if (mode === "forgot") return "가입한 이메일로 재설정 링크를 받습니다.";
  if (mode === "reset") return "메일로 받은 토큰과 새 비밀번호를 입력합니다.";
  return "작업 페이지로 들어가 학습을 이어갑니다.";
}

function submitLabel(mode: LoginMode): string {
  if (mode === "register") return "가입하고 시작";
  if (mode === "forgot") return "재설정 링크 받기";
  if (mode === "reset") return "비밀번호 변경";
  return "작업 페이지로 들어가기";
}
