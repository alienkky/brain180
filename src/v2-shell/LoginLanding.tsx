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
    <div className="flex h-full flex-col lg:flex-row bg-brain-bg overflow-hidden">
      {/* ── Left: scrollable marketing content (ALI-75) ── */}
      <div className="flex-1 overflow-y-auto">
        <LandingContent />
      </div>

      {/* ── Right: login form (fixed width) ── */}
      <div className="flex-shrink-0 overflow-y-auto lg:w-[430px]">

      <form
        onSubmit={submit}
        className="flex min-h-full flex-col justify-center space-y-4 border-l border-brain-border bg-brain-surface p-6 shadow-soft-2 md:p-8"
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
    </div>
  );
}

// ─── Landing content (ALI-75 marketing page integrated) ──────────────────────

function LandingContent() {
  return (
    <div className="min-h-full bg-brain-bg text-brain-text">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-brain-border bg-brain-surface/90 px-8 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brain-accent text-sm font-bold text-white">B</span>
          <span className="font-display text-lg font-bold text-brain-text">Brain180</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-brain-text-muted md:flex">
          <a href="#program" className="hover:text-brain-text">Program</a>
          <a href="#method" className="hover:text-brain-text">Method</a>
          <a href="#system" className="hover:text-brain-text">System</a>
          <a href="#journey" className="hover:text-brain-text">Journey</a>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex flex-col gap-8 px-8 py-16 md:flex-row md:items-center md:py-24">
        <div className="flex-1">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brain-accent">
            Brainshot Project
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.15] tracking-tight text-brain-text md:text-5xl">
            <span className="block">천재의 뇌를</span>
            <span className="block">아이의 사고</span>
            <span className="block text-brain-accent">습관으로</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-brain-text-muted">
            고전 텍스트에 남아 있는 천재들의 지식이 아니라,<br />
            그들이 세상을 이해하던 뇌인지구조를<br />
            아이의 사고 방식으로 옮깁니다.
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-4">
          {[
            { n: "01", label: "Lens", color: "#B85C3F" },
            { n: "02", label: "Coupling", color: "#C68A3D" },
            { n: "03", label: "Feedback", color: "#6E8F82" },
          ].map((c) => (
            <div
              key={c.n}
              className="flex h-28 w-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-brain-surface shadow-soft-1"
              style={{ borderColor: `${c.color}40` }}
            >
              <span className="text-xs font-semibold text-brain-text-muted">{c.n}</span>
              <span className="text-2xl font-bold" style={{ color: c.color }}>▣</span>
              <span className="text-[11px] font-medium text-brain-text">{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Program */}
      <section id="program" className="border-t border-brain-border bg-brain-surface px-8 py-14">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brain-accent">
          Install the author's brain
        </p>
        <h2 className="font-display text-3xl font-bold leading-snug text-brain-text">
          브레인180은<br />
          지식을 가르치기보다<br />
          사고의 구조를 옮깁니다.
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-7 text-brain-text-muted">
          인류 역사상 각 분야 천재들이 남긴 고전 텍스트에서 지식이 아닌 뇌인지구조를 추출하고,
          아이가 그 구조를 자신의 언어와 스피치로 다시 작동시키게 합니다.
        </p>
      </section>

      {/* 3-step */}
      <section id="method" className="border-t border-brain-border px-8 py-14">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brain-accent">
          Download Method
        </p>
        <h2 className="mb-10 font-display text-3xl font-bold text-brain-text">
          3단계 변화 흐름
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { n: "01", title: "추출", desc: "저자의 렌즈를 시각화합니다.", color: "#B85C3F" },
            { n: "02", title: "탑재", desc: "천 명의 인지방식을 아이가 활용하게 합니다.", color: "#C68A3D" },
            { n: "03", title: "압축", desc: "긴 변화 과정을 집중 훈련으로 줄입니다.", color: "#6E8F82" },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-brain-border bg-brain-surface p-6">
              <span className="text-xs font-bold" style={{ color: s.color }}>{s.n}</span>
              <h3 className="mt-2 text-xl font-bold text-brain-text">{s.title}</h3>
              <p className="mt-2 text-sm text-brain-text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-brain-border bg-brain-surface px-8 py-14">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brain-accent">
          Career Aptitude Test
        </p>
        <h2 className="mb-10 font-display text-3xl font-bold text-brain-text">
          8,192가지 뇌인지 행동 유형으로<br />
          아이의 진짜 원인을 봅니다.
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "8,192가지 행동 유형",
              desc: "아이마다 다른 방식으로 느끼고 생각하고 행동한다는 전제에서 시작합니다.",
            },
            {
              title: "심층적 원인 진단",
              desc: "과목을 못하거나 싫어하는 이유, 성적 변화의 원인을 파악합니다.",
            },
            {
              title: "뇌적성 진로설계",
              desc: "강점과 약점을 함께 보며 어떤 분야에서 180 역량을 낼지 예측합니다.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-brain-border bg-brain-bg p-6">
              <div className="mb-3 h-8 w-8 rounded-lg bg-brain-accent/10 flex items-center justify-center">
                <span className="text-base text-brain-accent">◈</span>
              </div>
              <h3 className="text-base font-bold text-brain-text">{f.title}</h3>
              <p className="mt-2 text-sm text-brain-text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Self Feedback System */}
      <section id="system" className="border-t border-brain-border px-8 py-14">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brain-accent">
          Self Feedback System
        </p>
        <h2 className="mb-2 font-display text-3xl font-bold text-brain-text">
          렌즈를 읽고, 커플링하고,<br />말하며, 다시 조정합니다.
        </h2>
        <ol className="mt-8 flex flex-col gap-3 md:flex-row">
          {[
            { label: "LENS", desc: "저자 렌즈 모델링" },
            { label: "Coupling", desc: "인지 커플링 스피치" },
            { label: "SPEECH", desc: "즉각적 이해도 검증" },
            { label: "FEEDBACK", desc: "모델 개선" },
          ].map((s, i, arr) => (
            <li key={s.label} className="flex flex-1 items-center gap-3">
              <div className="flex-1 rounded-xl border border-brain-border bg-brain-surface px-5 py-4">
                <p className="text-sm font-bold text-brain-accent">{s.label}</p>
                <p className="mt-1 text-xs text-brain-text-muted">{s.desc}</p>
              </div>
              {i < arr.length - 1 && (
                <span className="hidden text-brain-text-muted md:inline">→</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Journey CTA */}
      <section id="journey" className="border-t border-brain-border bg-brain-surface px-8 py-16 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brain-accent">
          Brain180 Journey
        </p>
        <h2 className="font-display text-3xl font-bold leading-snug text-brain-text">
          이제 아이의 뇌를<br />
          지능 180으로 바꾸는<br />
          여정을 시작합니다.
        </h2>
        <p className="mt-6 text-sm text-brain-text-muted">
          오른쪽에서 로그인하거나 계정을 만들어 바로 시작하세요.
        </p>
      </section>
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
