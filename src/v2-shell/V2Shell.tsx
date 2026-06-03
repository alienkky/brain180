// Owner: 연다리 [통합설계].
// First browser shell for Brain180 v2. Single-file 3-screen flow:
//   login → library (modules → lessons) → practice (text + tutor chat).
// Talks to the Express server through the Vite /api proxy. Lucia's session
// cookie is httpOnly so we cannot read it — we rely on `credentials: include`
// in api.ts and probe /me on mount to restore sessions across reloads.

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ApiError,
  api,
  type AdminTutorRatingsDto,
  type AdminLessonCreateInput,
  type AdminLessonDto,
  type AdminLessonUpdateInput,
  type AdminModuleCreateInput,
  type AdminModuleDto,
  type AdminModuleUpdateInput,
  type ArtifactGalleryDto,
  type BrandingSettingsDto,
  type CanvasCite,
  type CanvasJson,
  type CanvasNode,
  type CheckoutPayload,
  type LessonDto,
  type ModuleAxis,
  type ModuleDto,
  type PlanDto,
  type PlanName,
  type ProgressEntryDto,
  type SessionDto,
  type SessionMode,
  type SubscriptionDto,
  type TextExcerptDto,
  type TutorMessageDto,
  type TutorRatingDto,
  type UserDto,
} from "./api";
import { CognitiveMap, type CanvasMode } from "./CognitiveMap";
import {
  FreeDrawCanvas,
  freeCanvasToBase64,
  type FreeCanvasJson,
  type FreeDrawCanvasGetBase64,
} from "./FreeDrawCanvas";
import { EvaluationPanel } from "./EvaluationPanel";
import { FeedbackPanel } from "./FeedbackPanel";
import { PatternPanel } from "./PatternPanel";
import { TextInteractive } from "./TextInteractive";
import type { CircledPhrase } from "./TextInteractive";
import { TutorBubble } from "./TutorBubble";
import { LoginLanding } from "./LoginLanding";
import { OnboardingFlow, isOnboarded } from "./OnboardingFlow";
import { MethodologyScreen } from "./MethodologyScreen";

type Screen =
  | { name: "login" }
  | { name: "library" }
  | { name: "practice"; lesson: LessonDto; resumeSessionId?: string }
  | { name: "compare"; left: LessonDto; right: LessonDto }
  | { name: "admin" }
  | { name: "subscription"; flash?: string | null };

interface ComparePins {
  left: LessonDto | null;
  right: LessonDto | null;
}

export function V2Shell() {
  const [user, setUser] = useState<UserDto | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "login" });
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [comparePins, setComparePins] = useState<ComparePins>({ left: null, right: null });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [branding, setBranding] = useState<BrandingSettingsDto>({
    logo_data_url: null,
  });

  useEffect(() => {
    let cancelled = false;
    api
      .brandingSettings()
      .then((settings) => {
        if (!cancelled) setBranding(settings);
      })
      .catch(() => {
        /* Branding is optional; keep default wordmark if settings fail. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const authReturn = await consumeAuthReturnUrl();
      if (authReturn) return authReturn;
      const user = await api.me();
      return { user };
    })()
      .then(async (u) => {
        if (cancelled) return;
        setUser(u.user);
        const flash = await consumeTossReturnUrl();
        setScreen(
          flash ? { name: "subscription", flash } : { name: "library" },
        );
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // Unauthenticated is the expected first-visit case — stay on login.
        if (!(e instanceof ApiError && e.status === 401)) {
          setBootError(toMessage(e));
        }
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onLoggedIn = (u: UserDto) => {
    setUser(u);
    setScreen({ name: "library" });
    if (!isOnboarded()) setShowOnboarding(true);
  };

  const onGoHome = () => {
    setShowOnboarding(false);
    setShowMethodology(false);
    setScreen(user ? { name: "library" } : { name: "login" });
  };

  const onLogout = async () => {
    try {
      await api.logout();
    } catch {
      /* fall through — clear local state regardless */
    }
    setUser(null);
    setScreen({ name: "login" });
  };

  if (booting) {
    return (
      <div className="flex h-full items-center justify-center text-brain-text-muted">
        세션 확인 중…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-brain-bg text-brain-text">
      <Header
        user={user}
        onLogout={onLogout}
        onGoHome={onGoHome}
        onGoLibrary={() => setScreen({ name: "library" })}
        onGoAdmin={() => setScreen({ name: "admin" })}
        onGoSubscription={() => setScreen({ name: "subscription" })}
        onShowMethodology={() => setShowMethodology(true)}
        activeScreen={screen.name}
        branding={branding}
      />
      {showOnboarding && (
        <OnboardingFlow onClose={() => setShowOnboarding(false)} />
      )}
      {showMethodology && (
        <MethodologyScreen onClose={() => setShowMethodology(false)} />
      )}
      {bootError && (
        <div className="border-b border-brain-border bg-brain-highlight-soft px-6 py-2 text-sm text-brain-text">
          {bootError}
        </div>
      )}
      <main className="flex-1 overflow-hidden">
        {screen.name === "login" && <LoginScreen onLoggedIn={onLoggedIn} />}
        {screen.name === "library" && (
          <LibraryScreen
            onPickLesson={(lesson) => setScreen({ name: "practice", lesson })}
            comparePins={comparePins}
            onPinCompare={(slot, lesson) =>
              setComparePins((c) => ({ ...c, [slot]: lesson }))
            }
            onClearPin={(slot) =>
              setComparePins((c) => ({ ...c, [slot]: null }))
            }
            onStartCompare={() => {
              if (comparePins.left && comparePins.right) {
                setScreen({
                  name: "compare",
                  left: comparePins.left,
                  right: comparePins.right,
                });
              }
            }}
            onOpenArtifact={(item) =>
              setScreen({
                name: "practice",
                lesson: item.lesson,
                resumeSessionId: item.session_id,
              })
            }
          />
        )}
        {screen.name === "practice" && (
          <PracticeScreen
            lesson={screen.lesson}
            resumeSessionId={screen.resumeSessionId}
            onBack={() => setScreen({ name: "library" })}
          />
        )}
        {screen.name === "compare" && (
          <CompareScreen
            left={screen.left}
            right={screen.right}
            onBack={() => setScreen({ name: "library" })}
          />
        )}
        {screen.name === "admin" && (
          <AdminScreen branding={branding} onBrandingChange={setBranding} />
        )}
        {screen.name === "subscription" && (
          <SubscriptionScreen flash={screen.flash ?? null} />
        )}
      </main>
    </div>
  );
}

function Header({
  user,
  onLogout,
  onGoHome,
  onGoLibrary,
  onGoAdmin,
  onGoSubscription,
  onShowMethodology,
  activeScreen,
  branding,
}: {
  user: UserDto | null;
  onLogout: () => void;
  onGoHome: () => void;
  onGoLibrary: () => void;
  onGoAdmin: () => void;
  onGoSubscription: () => void;
  onShowMethodology: () => void;
  activeScreen: Screen["name"];
  branding: BrandingSettingsDto;
}) {
  return (
    <header className="flex items-center justify-between border-b border-brain-border bg-brain-surface px-6 py-3 shadow-soft-1">
      <button
        type="button"
        onClick={onGoHome}
        className="text-left transition hover:opacity-80"
        aria-label="Brain180 dashboard"
      >
        {branding.logo_data_url ? (
          <img
            src={branding.logo_data_url}
            alt="Brain180"
            className="h-8 max-w-[180px] object-contain object-left"
          />
        ) : (
          <div className="font-display text-xl tracking-tight">Brain180</div>
        )}
        <div className="text-xs text-brain-text-muted">천재의 뇌인지 구조 시각화</div>
      </button>
      {user && (
        <div className="flex items-center gap-4 text-sm">
          <nav className="flex items-center gap-1">
            <HeaderNavButton
              active={activeScreen === "library" || activeScreen === "practice"}
              onClick={onGoLibrary}
              label="라이브러리"
            />
            <HeaderNavButton
              active={activeScreen === "subscription"}
              onClick={onGoSubscription}
              label="구독"
            />
            {user.role === "admin" && (
              <HeaderNavButton
                active={activeScreen === "admin"}
                onClick={onGoAdmin}
                label="관리자"
              />
            )}
          </nav>
          <button
            onClick={onShowMethodology}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-brain-border text-sm text-brain-text-muted hover:bg-brain-surface-soft"
            title="Brain180 방법론 소개"
          >
            ?
          </button>
          <span className="text-brain-text-muted">
            {user.name}{" "}
            <span className="text-brain-text-soft">· {user.role}</span>
          </span>
          <button
            onClick={onLogout}
            className="rounded border border-brain-border px-3 py-1 text-brain-text-muted hover:bg-brain-surface-soft"
          >
            로그아웃
          </button>
        </div>
      )}
    </header>
  );
}

function HeaderNavButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-3 py-1 text-xs transition " +
        (active
          ? "bg-brain-accent text-white"
          : "text-brain-text-muted hover:text-brain-text")
      }
    >
      {label}
    </button>
  );
}

// 로그인/가입 폼에서만 쓰는 친절 에러 매퍼. 서버는 envelope.code (예:
// "weak_password", "email_taken", "invalid_credentials") 만 던지므로
// 사용자에게 보일 한국어를 여기서 합성. toMessage() 는 기술 디버그용이라
// 그대로 둔다.
function friendlyAuthError(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "weak_password":
        return "비밀번호가 정책을 충족하지 못합니다 — 8자 이상 + 영문 / 숫자 / 특수문자 중 2종 이상.";
      case "email_taken":
        return "이미 사용 중인 이메일입니다. 로그인 탭으로 진행하세요.";
      case "invalid_credentials":
        return "이메일 또는 비밀번호가 일치하지 않습니다.";
      case "validation_error":
        return "입력값을 확인해주세요 (이메일 형식, 비밀번호 길이 등).";
      case "account_blocked":
        return "이 계정은 차단/거절 상태입니다. 관리자에게 문의하세요.";
      case "rate_limited":
        return "잠시 후 다시 시도해 주세요. (요청이 너무 잦습니다)";
      default:
        return `${e.message || "오류가 발생했습니다"} (${e.code})`;
    }
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: (u: UserDto) => void }) {
  return <LoginLanding onLoggedIn={onLoggedIn} />;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register" && password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setSubmitting(true);
    try {
      const data =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(email, password, name);
      onLoggedIn(data.user);
    } catch (e: unknown) {
      setError(friendlyAuthError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-brain-border bg-brain-surface p-8 shadow-soft-2"
      >
        <div>
          <h1 className="font-display text-2xl">
            {mode === "login" ? "로그인" : "회원가입"}
          </h1>
          <p className="mt-1 text-sm text-brain-text-muted">
            {mode === "login"
              ? "Brain180 에 다시 오신 것을 환영합니다."
              : "이메일과 이름만으로 바로 학습을 시작할 수 있습니다."}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-brain-border bg-brain-bg p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={
              "flex-1 rounded-md px-3 py-1.5 text-sm transition " +
              (mode === "login"
                ? "bg-brain-accent text-white"
                : "text-brain-text-muted hover:text-brain-text")
            }
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={
              "flex-1 rounded-md px-3 py-1.5 text-sm transition " +
              (mode === "register"
                ? "bg-brain-accent text-white"
                : "text-brain-text-muted hover:text-brain-text")
            }
          >
            가입
          </button>
        </div>
        {mode === "register" && (
          <label className="block text-sm">
            <span className="text-brain-text-muted">이름</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              minLength={1}
              maxLength={40}
              required
              className="mt-1 w-full rounded border border-brain-border bg-brain-bg px-3 py-2 outline-none focus:border-brain-accent"
            />
          </label>
        )}
        <label className="block text-sm">
          <span className="text-brain-text-muted">이메일</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="mt-1 w-full rounded border border-brain-border bg-brain-bg px-3 py-2 outline-none focus:border-brain-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="text-brain-text-muted">비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={mode === "register" ? 8 : 1}
            required
            className="mt-1 w-full rounded border border-brain-border bg-brain-bg px-3 py-2 outline-none focus:border-brain-accent"
          />
          {mode === "register" && (
            <p className="mt-1 text-[11px] text-brain-text-soft">
              8자 이상. 영문 / 숫자 / 특수문자 중 *2종 이상* 섞기.
            </p>
          )}
        </label>
        {mode === "register" && (
          <label className="block text-sm">
            <span className="text-brain-text-muted">비밀번호 확인</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              className="mt-1 w-full rounded border border-brain-border bg-brain-bg px-3 py-2 outline-none focus:border-brain-accent"
            />
          </label>
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
          {submitting
            ? "확인 중…"
            : mode === "login"
              ? "로그인"
              : "가입하고 시작"}
        </button>
      </form>
    </div>
  );
}

function LibraryScreen({
  onPickLesson,
  comparePins,
  onPinCompare,
  onClearPin,
  onStartCompare,
  onOpenArtifact,
}: {
  onPickLesson: (lesson: LessonDto) => void;
  comparePins: ComparePins;
  onPinCompare: (slot: "left" | "right", lesson: LessonDto) => void;
  onClearPin: (slot: "left" | "right") => void;
  onStartCompare: () => void;
  onOpenArtifact: (item: ArtifactGalleryDto) => void;
}) {
  const [modules, setModules] = useState<ModuleDto[] | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonDto[] | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactGalleryDto[] | null>(null);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [progress, setProgress] = useState<Map<string, ProgressEntryDto>>(
    () => new Map(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.modules(), api.progress(), api.artifacts()])
      .then(([modRows, progRows, artifactRows]) => {
        if (cancelled) return;
        setModules(modRows);
        if (modRows[0]) {
          setActiveModuleId(modRows[0].id);
        }
        setProgress(new Map(progRows.map((p) => [p.lesson_id, p])));
        setArtifacts(artifactRows);
      })
      .catch((e: unknown) => !cancelled && setError(toMessage(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeModuleId) return;
    let cancelled = false;
    setLoadingLessons(true);
    setLessons(null);
    api
      .moduleLessons(activeModuleId)
      .then((rows) => !cancelled && setLessons(rows))
      .catch((e: unknown) => !cancelled && setError(toMessage(e)))
      .finally(() => !cancelled && setLoadingLessons(false));
    return () => {
      cancelled = true;
    };
  }, [activeModuleId]);

  return (
    <div className="grid h-full grid-cols-[280px_1fr] gap-0">
      <aside className="overflow-y-auto border-r border-brain-border bg-brain-surface-soft p-4">
        <h2 className="mb-3 font-display text-lg">분야</h2>
        {!modules && <p className="text-sm text-brain-text-muted">불러오는 중…</p>}
        {modules && modules.length === 0 && (
          <p className="text-sm text-brain-text-muted">
            아직 등록된 작품이 없습니다.
          </p>
        )}
        {modules && (
          <ModulesByField
            modules={modules}
            activeModuleId={activeModuleId}
            onPick={setActiveModuleId}
          />
        )}
      </aside>
      <section className="overflow-y-auto p-6">
        <ProgressSummary progress={progress} />
        <ArtifactGallery artifacts={artifacts} onOpen={onOpenArtifact} />
        <CompareBar
          pins={comparePins}
          onClear={onClearPin}
          onStart={onStartCompare}
        />
        <h2 className="mb-4 font-display text-xl">레슨</h2>
        {error && (
          <div className="mb-4 rounded border border-brain-danger/40 bg-brain-accent-soft/50 px-3 py-2 text-sm text-brain-danger">
            {error}
          </div>
        )}
        {loadingLessons && (
          <p className="text-sm text-brain-text-muted">불러오는 중…</p>
        )}
        {!loadingLessons && lessons && lessons.length === 0 && (
          <p className="text-sm text-brain-text-muted">
            이 작품에는 장이 없습니다.
          </p>
        )}
        <ul className="space-y-3">
          {lessons?.map((l) => {
            const p = progress.get(l.id);
            const pinSlot =
              comparePins.left?.id === l.id
                ? "left"
                : comparePins.right?.id === l.id
                  ? "right"
                  : null;
            return (
              <li key={l.id}>
                <div className="group relative rounded-xl border border-brain-border bg-brain-surface p-4 shadow-soft-1 transition hover:border-brain-accent hover:shadow-soft-2">
                  <button
                    onClick={() => onPickLesson(l)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-display text-lg">{l.title}</div>
                      {p && <LessonProgressBadge entry={p} />}
                    </div>
                    {l.objectives.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-sm text-brain-text-muted">
                        {l.objectives.slice(0, 3).map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ul>
                    )}
                  </button>
                  <ComparePinButtons
                    lesson={l}
                    pinSlot={pinSlot}
                    pins={comparePins}
                    onPin={onPinCompare}
                    onClear={onClearPin}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

type PracticeTab = "canvas" | "eval" | "pattern" | "feedback";

const MODE_OPTIONS: { value: SessionMode; label: string; hint: string }[] = [
  {
    value: "practice",
    label: "연습",
    hint: "자유 그리기: 본문은 참고, 캔버스 중심 코칭",
  },
  {
    value: "analyze",
    label: "분석",
    hint: "본문 → 캔버스: 텍스트에서 사고 구조를 추출",
  },
  {
    value: "reverse",
    label: "역해석",
    hint: "캔버스 → 본문: 본문을 숨긴 채 먼저 구조를 그린 뒤 원문과 비교",
  },
];

function PracticeScreen({
  lesson,
  resumeSessionId,
  onBack,
}: {
  lesson: LessonDto;
  resumeSessionId?: string;
  onBack: () => void;
}) {
  const [text, setText] = useState<TextExcerptDto | null>(null);
  const [session, setSession] = useState<SessionDto | null>(null);
  const [messages, setMessages] = useState<TutorMessageDto[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratingToast, setRatingToast] = useState<string | null>(null);
  const [tab, setTab] = useState<PracticeTab>("canvas");
  // 튜터 버블 열림 상태 — v1 의 floating ChatPanel 패턴 복원.
  const [tutorOpen, setTutorOpen] = useState(false);
  const [mode, setMode] = useState<SessionMode>("analyze");
  // 캔버스 모드 (ALI-81): null = 미선택 (진입 시 카드 표시)
  const [canvasMode, setCanvasMode] = useState<"free" | CanvasMode | null>(null);
  const freeCanvasGetBase64 = useRef<FreeDrawCanvasGetBase64 | null>(null);
  const [revealText, setRevealText] = useState(false);
  const [initialCanvas, setInitialCanvas] = useState<CanvasJson | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  // 자기평가 패널이 실시간으로 다시 계산되도록 캔버스 상태를 거울처럼 들고 있는다.
  // 평가 결과는 useMemo 가 캐싱하므로 매 변경마다 재렌더 비용은 미미.
  const [liveCanvas, setLiveCanvas] = useState<CanvasJson | null>(null);
  // v1 PracticeTextLayer 의 circledPhrases — 세션 메모리만으로 유지.
  const [phrases, setPhrases] = useState<CircledPhrase[]>([]);
  const [pendingCite, setPendingCite] = useState<CanvasCite | null>(null);
  const [focusCite, setFocusCite] = useState<CanvasCite | null>(null);
  const currentCanvas = useRef<CanvasJson | null>(null);
  const clientRevision = useRef(0);
  const textBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setText(null);
    setSession(null);
    setMessages([]);
    setInitialCanvas(null);
    setCanvasMode(null);
    setCanvasReady(false);
    currentCanvas.current = null;
    setLiveCanvas(null);
    freeCanvasGetBase64.current = null;
    setPhrases([]);
    clientRevision.current = 0;
    // Reverse mode: text starts hidden so student must reconstruct from the
    // canvas; analyze/practice show text up front.
    setRevealText(mode !== "reverse");

    (async () => {
      try {
        const textPromise = lesson.text_excerpt_id
          ? api.text(lesson.text_excerpt_id)
          : Promise.resolve(null);
        const sessionPromise = resumeSessionId
          ? api.session(resumeSessionId)
          : api.startSession(lesson.id, mode);
        const [textRow, sess] = await Promise.all([
          textPromise,
          sessionPromise,
        ]);
        if (cancelled) return;
        setText(textRow);
        setSession(sess);
        const [msgs, artifact] = await Promise.all([
          api.messages(sess.id),
          api.getArtifact(sess.id),
        ]);
        if (cancelled) return;
        setMessages(msgs);
        const restoredCanvas = artifact?.canvas_json ?? null;
        setInitialCanvas(restoredCanvas);
        currentCanvas.current = restoredCanvas;
        setLiveCanvas(restoredCanvas);
        if (artifact?.mode) {
          setCanvasMode(artifact.mode === "free" ? "free" : artifact.mode);
        }
        setCanvasReady(true);
      } catch (e: unknown) {
        if (!cancelled) setError(toMessage(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lesson.id, lesson.text_excerpt_id, mode, resumeSessionId]);

  const onSaveCanvas = useCallback(
    async (next: CanvasJson) => {
      if (!session) return;
      clientRevision.current += 1;
      await api.putArtifact(session.id, next, clientRevision.current);
    },
    [session],
  );

  const onCanvasChange = useCallback((next: CanvasJson) => {
    currentCanvas.current = next;
    setLiveCanvas(next);
  }, []);

  const onNodeFocus = useCallback((n: CanvasNode) => {
    if (!n.cite) return;
    setFocusCite(n.cite);
    setRevealText(true);
  }, []);

  // 직전 동작은 4s 자동 fade 였지만, 학습자가 본문을 *읽으며* 캔버스 노드를
  // 비교하는 흐름을 자르는 부작용이 있었음. 이제는 *명시적* 해제 (다른 노드
  // 클릭 / 본문 클릭) 까지 하이라이트 유지.
  useEffect(() => {
    if (!focusCite || !textBodyRef.current) return;
    // 다음 페인트 직후 스크롤 — DOM 이 cite span 을 실제로 그렸는지 확인 후.
    const r = window.requestAnimationFrame(() => {
      const target = textBodyRef.current?.querySelector(
        "[data-cite-highlight=\"true\"]",
      );
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
    return () => window.cancelAnimationFrame(r);
  }, [focusCite]);

  const sendChat = async (
    message: string,
    snapshot?: CanvasJson | null,
  ): Promise<void> => {
    if (!session) return;
    setError(null);
    const optimistic: TutorMessageDto = {
      id: `pending-${Date.now()}`,
      session_id: session.id,
      role: "user",
      content: message,
      model: null,
      input_tokens: 0,
      output_tokens: 0,
      my_rating: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const effectiveSnapshot =
        canvasMode === "free" ? snapshot ?? currentCanvas.current : snapshot;
      const freeSnapshot =
        canvasMode === "free" && effectiveSnapshot
          ? (effectiveSnapshot as FreeCanvasJson)
          : null;
      const imageBase64 =
        canvasMode === "free"
          ? freeCanvasGetBase64.current?.() ?? freeCanvasToBase64(freeSnapshot)
          : null;
      await api.chat(
        session.id,
        lesson.id,
        message,
        effectiveSnapshot,
        canvasMode ?? undefined,
        imageBase64,
      );
      const fresh = await api.messages(session.id);
      setMessages(fresh);
    } catch (e: unknown) {
      setError(toMessage(e));
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      throw e;
    }
  };

  const onAskTutor = useCallback(
    async (snapshot: CanvasJson) => {
      if (!session || sending) return;
      const message =
        snapshot.nodes.length === 0
          ? "현재 캔버스는 비어 있습니다. 이 본문에서 첫 번째로 추출해야 할 핵심 개념 노드를 한 개 제안해 주시고, 그 이유를 짧게 설명해 주세요."
          : "현재 인지 캔버스 상태를 함께 첨부했습니다. 다음으로 추가하면 좋을 노드 1~2개와 그 노드들을 기존 노드와 어떻게 연결하면 좋을지(관계 유형 포함)를 제안해 주세요. 학생이 직접 그릴 수 있도록 *이유와 방향*만 알려주시고 정답을 단정하지는 마세요.";
      setTutorOpen(true);
      setSending(true);
      try {
        await sendChat(message, snapshot);
      } catch {
        /* sendChat already surfaced the error */
      } finally {
        setSending(false);
      }
    },
    // sendChat closes over session/lesson; React's exhaustive-deps isn't strict here
    // because sendChat is recreated each render but only used inside this callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, lesson.id, sending],
  );

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !input.trim() || sending) return;
    const message = input.trim();
    setInput("");
    setSending(true);
    try {
      // Attach current canvas snapshot only when student is actively in the
      // canvas tab — keeps chat-only sessions lean (no extra tokens).
      const snapshot = tab === "canvas" ? currentCanvas.current : null;
      await sendChat(message, snapshot);
    } catch {
      setInput(message);
    } finally {
      setSending(false);
    }
  };

  const rateTutorMessage = useCallback(
    async (
      messageId: string,
      rating: number,
      feedback?: string,
    ): Promise<TutorRatingDto> => {
      const saved = await api.rateTutorMessage(messageId, { rating, feedback });
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, my_rating: saved } : m)),
      );
      setRatingToast("감사합니다 — 튜터가 더 나아질 자리에 쓰입니다");
      window.setTimeout(() => setRatingToast(null), 1000);
      return saved;
    },
    [],
  );

  return (
    <div className="flex h-full flex-col md:grid md:grid-cols-[1fr_1fr] md:gap-0">
      <section className="flex h-1/2 min-h-0 flex-col overflow-hidden border-b border-brain-border md:h-auto md:border-b-0 md:border-r">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brain-border bg-brain-surface px-4 py-3 md:px-6">
          <button
            onClick={onBack}
            className="text-sm text-brain-text-muted hover:text-brain-text"
          >
            ← 레슨 선택
          </button>
          <div className="font-display text-base md:text-lg">{lesson.title}</div>
          <ModePicker active={mode} onPick={setMode} disabled={sending} />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6">
          {!text && !error && (
            <p className="text-sm text-brain-text-muted">본문 불러오는 중…</p>
          )}
          {text && (
            <article className="prose max-w-none">
              <h3 className="font-display text-xl">{text.title}</h3>
              <p className="text-sm text-brain-text-muted">
                {text.author} · {text.source}
              </p>
              {mode === "reverse" && !revealText ? (
                <div className="mt-6 rounded-xl border border-dashed border-brain-border bg-brain-surface-soft p-6 text-center">
                  <p className="text-sm text-brain-text-muted">
                    역해석 모드 — 본문이 숨겨져 있습니다.
                  </p>
                  <p className="mt-1 text-xs text-brain-text-soft">
                    우측 캔버스를 먼저 그려보고, 본문이 어떤 구조였을지 추측해 보세요.
                  </p>
                  <button
                    onClick={() => setRevealText(true)}
                    className="mt-4 rounded border border-brain-accent/60 px-3 py-1 text-sm text-brain-accent hover:bg-brain-accent-soft/50"
                  >
                    본문 펼치기
                  </button>
                </div>
              ) : (
                <div ref={textBodyRef} className="-mx-8 mt-4 h-full">
                  <TextInteractive
                    body={text.body}
                    phrases={phrases}
                    onAddPhrase={(p) =>
                      setPhrases((curr) => {
                        // 동일 구간 중복 방지 — 글자 구간이 같으면 무시
                        if (
                          curr.some(
                            (x) =>
                              x.charStart === p.charStart &&
                              x.charEnd === p.charEnd,
                          )
                        ) {
                          return curr;
                        }
                        return [...curr, p];
                      })
                    }
                    onRemovePhrase={(id) =>
                      setPhrases((curr) => curr.filter((p) => p.id !== id))
                    }
                    onSendToCanvas={(cite) => {
                      setPendingCite(cite);
                      setTab("canvas");
                    }}
                    focusCite={focusCite}
                    onClearFocus={() => setFocusCite(null)}
                  />
                </div>
              )}
            </article>
          )}
        </div>
      </section>
      <section className="flex h-1/2 min-h-0 flex-col overflow-hidden bg-brain-surface-soft md:h-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brain-border bg-brain-surface px-4 py-3 md:px-6">
          <div className="flex flex-wrap gap-1">
            <TabButton
              active={tab === "canvas"}
              onClick={() => setTab("canvas")}
              label="인지 캔버스"
            />
            <TabButton
              active={tab === "eval"}
              onClick={() => setTab("eval")}
              label="자기평가"
            />
            <TabButton
              active={tab === "pattern"}
              onClick={() => setTab("pattern")}
              label="패턴"
            />
            <TabButton
              active={tab === "feedback"}
              onClick={() => setTab("feedback")}
              label="피드백"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-brain-text-muted">
            {tab === "canvas" && canvasMode !== null && (
              <button
                onClick={() => setCanvasMode(null)}
                className="rounded border border-brain-border px-2 py-1 text-[11px] hover:bg-brain-surface-soft"
                title="캔버스 모드 변경"
              >
                모드 변경
              </button>
            )}
            {session ? `세션 ${session.id.slice(0, 8)}…` : "세션 시작 중…"}
          </div>
        </div>
        {tab === "canvas" && (
          <div className="flex-1 overflow-hidden">
            {!canvasReady ? (
              <p className="p-6 text-sm text-brain-text-muted">캔버스 불러오는 중…</p>
            ) : canvasMode === null ? (
              <CanvasModeSelector onSelect={setCanvasMode} />
            ) : canvasMode === "free" ? (
              <FreeDrawCanvas
                initial={initialCanvas as FreeCanvasJson | null}
                onSave={onSaveCanvas}
                onChange={onCanvasChange}
                onCanvasRef={(fn) => { freeCanvasGetBase64.current = fn; }}
                disabled={!session}
              />
            ) : (
              <CognitiveMap
                initial={initialCanvas}
                onSave={onSaveCanvas}
                onChange={onCanvasChange}
                onAskTutor={onAskTutor}
                onNodeFocus={onNodeFocus}
                canvasMode={canvasMode}
                injectCite={pendingCite}
                onCiteConsumed={() => setPendingCite(null)}
                disabled={!session}
              />
            )}
          </div>
        )}
        {tab === "eval" && (
          <div className="flex-1 overflow-hidden">
            <EvaluationPanel
              canvas={liveCanvas ?? initialCanvas}
              onAskTutor={onAskTutor}
            />
          </div>
        )}
        {tab === "pattern" && (
          <div className="flex-1 overflow-hidden">
            <PatternPanel canvas={liveCanvas ?? initialCanvas} />
          </div>
        )}
        {tab === "feedback" && (
          <div className="flex-1 overflow-hidden">
            <FeedbackPanel lessonId={lesson.id} />
          </div>
        )}
      </section>
      <TutorBubble
        open={tutorOpen}
        onToggle={() => setTutorOpen((v) => !v)}
        session={session}
        messages={messages}
        error={error}
        sending={sending}
        input={input}
        onInputChange={setInput}
        onSend={send}
        onRateMessage={rateTutorMessage}
        onAskTutor={onAskTutor}
        liveCanvas={liveCanvas}
        ratingToast={ratingToast}
      />
    </div>
  );
}

const CANVAS_MODES: {
  value: "free" | CanvasMode;
  label: string;
  subtitle: string;
  desc: string;
  accent: string;
}[] = [
  {
    value: "free",
    label: "자유형",
    subtitle: "Free Draw",
    desc: "펜으로 자유롭게 그리세요. 형태보다 사고의 흐름에 집중합니다.",
    accent: "var(--color-brain-sage)",
  },
  {
    value: "constrained",
    label: "제약형",
    subtitle: "Constrained",
    desc: "핵심·기둥·다리·가지 4종 노드와 5종 관계로 구조화합니다.",
    accent: "var(--color-brain-accent)",
  },
  {
    value: "guided",
    label: "단계형",
    subtitle: "Guided",
    desc: "핵심→기둥→다리→가지 순서로 단계별 게이트를 통과합니다.",
    accent: "var(--color-brain-node-bridge)",
  },
];

function CanvasModeSelector({ onSelect }: { onSelect: (m: "free" | CanvasMode) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-brain-bg px-6 py-10">
      <div className="text-center">
        <p className="text-base font-semibold text-brain-text">캔버스 모드를 선택하세요</p>
        <p className="mt-1 text-sm text-brain-text-muted">선택 후 언제든지 탭 상단에서 변경할 수 있습니다.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {CANVAS_MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onSelect(m.value)}
            className="flex w-52 flex-col items-start rounded-xl border-2 bg-brain-surface p-5 text-left transition hover:shadow-md"
            style={{ borderColor: m.accent }}
          >
            <span className="mb-1 text-lg font-bold" style={{ color: m.accent }}>{m.label}</span>
            <span className="mb-2 text-xs font-medium text-brain-text-muted tracking-wide">{m.subtitle}</span>
            <span className="text-sm text-brain-text">{m.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type AdminTab = "users" | "modules" | "lessons" | "tutorQuality" | "brand";

function AdminScreen({
  branding,
  onBrandingChange,
}: {
  branding: BrandingSettingsDto;
  onBrandingChange: (settings: BrandingSettingsDto) => void;
}) {
  const [tab, setTab] = useState<AdminTab>("users");
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-brain-border bg-brain-surface px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <AdminTabButton active={tab === "users"} onClick={() => setTab("users")}>
            가입 대기
          </AdminTabButton>
          <AdminTabButton active={tab === "modules"} onClick={() => setTab("modules")}>
            모듈
          </AdminTabButton>
          <AdminTabButton active={tab === "lessons"} onClick={() => setTab("lessons")}>
            레슨
          </AdminTabButton>
          <AdminTabButton
            active={tab === "tutorQuality"}
            onClick={() => setTab("tutorQuality")}
          >
            튜터 품질
          </AdminTabButton>
          <AdminTabButton active={tab === "brand"} onClick={() => setTab("brand")}>
            브랜드
          </AdminTabButton>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          {tab === "users" && <AdminUsersPanel />}
          {tab === "modules" && <AdminModulesPanel />}
          {tab === "lessons" && <AdminLessonsPanel />}
          {tab === "tutorQuality" && <AdminTutorRatingsPanel />}
          {tab === "brand" && (
            <AdminBrandPanel
              branding={branding}
              onBrandingChange={onBrandingChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AdminTabButton({
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
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm transition ${
        active
          ? "bg-brain-accent text-white shadow-soft-1"
          : "text-brain-text-muted hover:text-brain-text"
      }`}
    >
      {children}
    </button>
  );
}

function AdminBrandPanel({
  branding,
  onBrandingChange,
}: {
  branding: BrandingSettingsDto;
  onBrandingChange: (settings: BrandingSettingsDto) => void;
}) {
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(branding.logo_data_url);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLogoDataUrl(branding.logo_data_url);
  }, [branding.logo_data_url]);

  const onPickLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("PNG, JPG, WebP 이미지만 등록할 수 있습니다.");
      event.target.value = "";
      return;
    }
    if (file.size > 700_000) {
      setError("로고 이미지는 700KB 이하로 등록해 주세요.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setLogoDataUrl(result);
    };
    reader.onerror = () => {
      setError("이미지를 읽지 못했습니다.");
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await api.adminUpdateBrandingSettings({
        logo_data_url: logoDataUrl,
      });
      onBrandingChange(next);
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl">브랜드 설정</h2>
        <p className="mt-1 text-sm text-brain-text-muted">
          상단 Brain180 로고 이미지를 등록하거나 기본 텍스트 로고로 되돌립니다.
        </p>
      </div>
      {error && (
        <div className="rounded border border-brain-danger/40 bg-brain-accent-soft/50 px-3 py-2 text-sm text-brain-danger">
          {error}
        </div>
      )}
      <div className="rounded-xl border border-brain-border bg-brain-surface p-5 shadow-soft-1">
        <div className="mb-4 text-sm font-medium text-brain-text">현재 로고</div>
        <div className="flex min-h-24 items-center rounded-lg border border-dashed border-brain-border bg-brain-surface-soft px-4 py-5">
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              alt="Brain180"
              className="max-h-16 max-w-[260px] object-contain object-left"
            />
          ) : (
            <div>
              <div className="font-display text-xl tracking-tight">Brain180</div>
              <div className="text-xs text-brain-text-muted">기본 텍스트 로고</div>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded border border-brain-border px-3 py-2 text-sm text-brain-text-muted hover:bg-brain-surface-soft">
            이미지 등록
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onPickLogo}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={() => setLogoDataUrl(null)}
            className="rounded border border-brain-border px-3 py-2 text-sm text-brain-text-muted hover:bg-brain-surface-soft"
          >
            기본 로고로 되돌리기
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="rounded bg-brain-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "저장 중" : "저장"}
          </button>
        </div>
      </div>
    </section>
  );
}

function AdminTutorRatingsPanel() {
  const [data, setData] = useState<AdminTutorRatingsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setData(await api.adminTutorRatings(80));
    } catch (e: unknown) {
      setError(toMessage(e));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .adminTutorRatings(80)
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(toMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const maxDistribution = Math.max(
    1,
    ...(data?.summary.distribution.map((d) => d.count) ?? [0]),
  );

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">튜터 품질</h2>
          <p className="mt-1 text-sm text-brain-text-muted">
            학생이 남긴 AI 튜터 응답 별점과 코멘트를 확인합니다.
          </p>
        </div>
        <button
          onClick={() => void reload()}
          className="rounded border border-brain-border px-3 py-1 text-sm text-brain-text-muted hover:bg-brain-surface-soft"
        >
          새로고침
        </button>
      </div>
      {error && (
        <div className="mb-4 rounded border border-brain-danger/40 bg-brain-accent-soft/50 px-3 py-2 text-sm text-brain-danger">
          {error}
        </div>
      )}
      {!data && !error && (
        <p className="text-sm text-brain-text-muted">불러오는 중…</p>
      )}
      {data && (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-brain-border bg-brain-surface p-4 shadow-soft-1">
              <div className="text-xs text-brain-text-muted">전체 평균</div>
              <div className="mt-1 font-display text-3xl">
                {formatRating(data.summary.average)}
              </div>
              <div className="mt-1 text-xs text-brain-text-soft">
                평가 {data.summary.count.toLocaleString("ko-KR")}개
              </div>
            </div>
            <AggregateCard title="모델별 평균" rows={data.summary.by_model} />
            <AggregateCard
              title="프롬프트 버전별 평균"
              rows={data.summary.by_prompt_version}
            />
          </div>

          <section className="rounded-xl border border-brain-border bg-brain-surface p-4 shadow-soft-1">
            <h3 className="mb-3 font-display text-lg">별점 분포</h3>
            <div className="space-y-2">
              {data.summary.distribution.map((d) => (
                <div key={d.rating} className="grid grid-cols-[48px_1fr_48px] items-center gap-3 text-sm">
                  <div className="text-brain-text-muted">{d.rating}점</div>
                  <div className="h-3 overflow-hidden rounded-full bg-brain-surface-soft">
                    <div
                      className="h-full rounded-full bg-brain-accent"
                      style={{ width: `${(d.count / maxDistribution) * 100}%` }}
                    />
                  </div>
                  <div className="text-right text-brain-text-muted">{d.count}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-display text-lg">최근 평가</h3>
            {data.recent.length === 0 && (
              <p className="text-sm text-brain-text-muted">아직 등록된 평가가 없습니다.</p>
            )}
            <ul className="space-y-3">
              {data.recent.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-brain-border bg-brain-surface p-4 shadow-soft-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-display text-base">
                      {"★".repeat(r.rating)}
                      <span className="text-brain-text-soft">
                        {"☆".repeat(5 - r.rating)}
                      </span>
                    </div>
                    <div className="text-xs text-brain-text-muted">
                      {new Date(r.created_at).toLocaleString("ko-KR")} · {r.user_name}
                    </div>
                  </div>
                  {r.feedback && (
                    <p className="mt-2 rounded bg-brain-surface-soft px-3 py-2 text-sm">
                      {r.feedback}
                    </p>
                  )}
                  <p className="mt-2 line-clamp-3 text-sm text-brain-text-muted">
                    {r.message_content}
                  </p>
                  <div className="mt-2 text-[11px] uppercase tracking-wider text-brain-text-soft">
                    {r.model ?? "unknown"} · prompt {r.prompt_version ?? "unknown"} · in{" "}
                    {r.input_tokens} / out {r.output_tokens}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}

function AggregateCard({
  title,
  rows,
}: {
  title: string;
  rows: AdminTutorRatingsDto["summary"]["by_model"];
}) {
  return (
    <div className="rounded-xl border border-brain-border bg-brain-surface p-4 shadow-soft-1">
      <div className="mb-2 text-xs text-brain-text-muted">{title}</div>
      {rows.length === 0 && (
        <div className="text-sm text-brain-text-muted">데이터 없음</div>
      )}
      <ul className="space-y-2">
        {rows.slice(0, 4).map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-brain-text">{r.key}</span>
            <span className="shrink-0 text-brain-text-muted">
              {formatRating(r.average)} · {r.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatRating(value: number | null): string {
  return value == null ? "-" : value.toFixed(2);
}

function AdminUsersPanel() {
  const [pending, setPending] = useState<UserDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const rows = await api.adminPending();
      setPending(rows);
    } catch (e: unknown) {
      setError(toMessage(e));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const approve = async (u: UserDto) => {
    setBusyId(u.id);
    try {
      await api.adminApprove(u.id);
      await reload();
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (u: UserDto) => {
    const reason = window.prompt(`${u.email} 거절 사유 (선택)`) ?? undefined;
    if (reason === null) return;
    setBusyId(u.id);
    try {
      await api.adminReject(u.id, reason || undefined);
      await reload();
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <h2 className="mb-1 font-display text-2xl">관리자 — 가입 승인 대기</h2>
      <p className="mb-4 text-sm text-brain-text-muted">
        승인 시 사용자는 즉시 로그인 가능. 거절 시 사유는 사용자에게 노출되지 않습니다.
      </p>
      {error && (
        <div className="mb-4 rounded border border-brain-danger/40 bg-brain-accent-soft/50 px-3 py-2 text-sm text-brain-danger">
          {error}
        </div>
      )}
      {!pending && <p className="text-sm text-brain-text-muted">불러오는 중…</p>}
      {pending && pending.length === 0 && (
        <p className="text-sm text-brain-text-muted">대기 중인 사용자가 없습니다.</p>
      )}
      <ul className="space-y-3">
        {pending?.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between rounded-xl border border-brain-border bg-brain-surface p-4 shadow-soft-1"
          >
            <div>
              <div className="font-display text-base">{u.name}</div>
              <div className="text-sm text-brain-text-muted">{u.email}</div>
              <div className="mt-1 text-xs text-brain-text-soft">
                역할 {u.role} · 상태 {u.status}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approve(u)}
                disabled={busyId === u.id}
                className="rounded bg-brain-accent px-3 py-1 text-sm text-white hover:opacity-90 disabled:opacity-50"
              >
                승인
              </button>
              <button
                onClick={() => reject(u)}
                disabled={busyId === u.id}
                className="rounded border border-brain-danger/40 px-3 py-1 text-sm text-brain-danger hover:bg-brain-accent-soft/50 disabled:opacity-50"
              >
                거절
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

const AXIS_OPTIONS: { value: ModuleAxis; label: string }[] = [
  { value: "cognitive", label: "인지" },
  { value: "value", label: "가치" },
  { value: "time", label: "시간" },
];

function AdminModulesPanel() {
  const [modules, setModules] = useState<AdminModuleDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminModuleDto | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const rows = await api.adminModules();
      setModules(rows);
    } catch (e: unknown) {
      setError(toMessage(e));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const remove = async (m: AdminModuleDto) => {
    if (m.lesson_count > 0) {
      window.alert("레슨이 남아 있어 삭제할 수 없습니다. 먼저 레슨을 지워주세요.");
      return;
    }
    if (!window.confirm(`${m.title} 모듈을 삭제할까요?`)) return;
    setBusy(true);
    try {
      await api.adminDeleteModule(m.id);
      await reload();
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl">모듈</h2>
        <button
          onClick={() => setEditing("new")}
          className="rounded bg-brain-accent px-3 py-1 text-sm text-white hover:opacity-90"
        >
          + 새 모듈
        </button>
      </div>
      {error && (
        <div className="mb-4 rounded border border-brain-danger/40 bg-brain-accent-soft/50 px-3 py-2 text-sm text-brain-danger">
          {error}
        </div>
      )}
      {!modules && <p className="text-sm text-brain-text-muted">불러오는 중…</p>}
      <ul className="space-y-2">
        {modules?.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-xl border border-brain-border bg-brain-surface p-4 shadow-soft-1"
          >
            <div>
              <div className="font-display text-base">{m.title}</div>
              <div className="text-xs text-brain-text-muted">
                {m.slug} · 축 {m.axis} · 분야 {m.field} · 난이도 {m.difficulty} · 레슨 {m.lesson_count}개
              </div>
              {m.description && (
                <div className="mt-1 text-xs text-brain-text-soft">{m.description}</div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(m)}
                disabled={busy}
                className="rounded border border-brain-border px-3 py-1 text-sm hover:bg-brain-accent-soft/30 disabled:opacity-50"
              >
                수정
              </button>
              <button
                onClick={() => remove(m)}
                disabled={busy}
                className="rounded border border-brain-danger/40 px-3 py-1 text-sm text-brain-danger hover:bg-brain-accent-soft/50 disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
      {editing !== null && (
        <ModuleEditorDialog
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reload();
          }}
        />
      )}
    </>
  );
}

function ModuleEditorDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: AdminModuleDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [axis, setAxis] = useState<ModuleAxis>(initial?.axis ?? "cognitive");
  const [field, setField] = useState(initial?.field ?? "literature");
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 3);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (initial) {
        const patch: AdminModuleUpdateInput = {
          title,
          slug,
          axis,
          field,
          order,
          difficulty,
          description: description || undefined,
        };
        await api.adminUpdateModule(initial.id, patch);
      } else {
        const body: AdminModuleCreateInput = {
          title,
          slug,
          axis,
          field,
          order,
          difficulty,
          description: description || undefined,
        };
        await api.adminCreateModule(body);
      }
      onSaved();
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-brain-border bg-brain-surface p-6 shadow-soft-2">
        <h3 className="mb-4 font-display text-xl">
          {initial ? "모듈 수정" : "새 모듈"}
        </h3>
        {error && (
          <div className="mb-3 rounded border border-brain-danger/40 bg-brain-accent-soft/50 px-3 py-2 text-sm text-brain-danger">
            {error}
          </div>
        )}
        <div className="space-y-3 text-sm">
          <Field label="제목">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1"
            />
          </Field>
          <Field label="slug (URL용)">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="newton-principia"
              className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="축">
              <select
                value={axis}
                onChange={(e) => setAxis(e.target.value as ModuleAxis)}
                className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1"
              >
                {AXIS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="분야">
              <input
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1"
              />
            </Field>
            <Field label="순서">
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1"
              />
            </Field>
            <Field label="난이도 (1~5)">
              <input
                type="number"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1"
              />
            </Field>
          </div>
          <Field label="설명 (선택)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1"
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded border border-brain-border px-3 py-1 text-sm disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={() => void submit()}
            disabled={busy || !title || !slug}
            className="rounded bg-brain-accent px-3 py-1 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminLessonsPanel() {
  const [modules, setModules] = useState<AdminModuleDto[] | null>(null);
  const [moduleId, setModuleId] = useState<string>("");
  const [lessons, setLessons] = useState<AdminLessonDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminLessonDto | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .adminModules()
      .then((rows) => {
        if (cancelled) return;
        setModules(rows);
        setModuleId((cur) => (cur ? cur : (rows[0]?.id ?? "")));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(toMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!moduleId) {
      setLessons([]);
      return;
    }
    setError(null);
    try {
      const rows = await api.adminLessons(moduleId);
      setLessons(rows);
    } catch (e: unknown) {
      setError(toMessage(e));
    }
  }, [moduleId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const remove = async (l: AdminLessonDto) => {
    if (!window.confirm(`${l.title} 레슨을 삭제할까요? (텍스트도 함께 사라집니다)`)) return;
    setBusy(true);
    try {
      await api.adminDeleteLesson(l.id);
      await reload();
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl">레슨</h2>
        <div className="flex items-center gap-2">
          <select
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            className="rounded border border-brain-border bg-brain-bg px-2 py-1 text-sm"
          >
            {!modules && <option>불러오는 중…</option>}
            {modules?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => setEditing("new")}
            disabled={!moduleId}
            className="rounded bg-brain-accent px-3 py-1 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            + 새 레슨
          </button>
        </div>
      </div>
      {error && (
        <div className="mb-4 rounded border border-brain-danger/40 bg-brain-accent-soft/50 px-3 py-2 text-sm text-brain-danger">
          {error}
        </div>
      )}
      {!lessons && moduleId && (
        <p className="text-sm text-brain-text-muted">불러오는 중…</p>
      )}
      {lessons && lessons.length === 0 && (
        <p className="text-sm text-brain-text-muted">이 모듈에는 레슨이 없습니다.</p>
      )}
      <ul className="space-y-2">
        {lessons?.map((l) => (
          <li
            key={l.id}
            className="rounded-xl border border-brain-border bg-brain-surface p-4 shadow-soft-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-base">
                  #{l.order} · {l.title}
                </div>
                <div className="text-xs text-brain-text-muted">
                  {l.author && <>저자 {l.author} · </>}
                  {l.source && <>출처 {l.source} · </>}
                  언어 {l.language} · 본문 {l.body.length}자
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(l)}
                  disabled={busy}
                  className="rounded border border-brain-border px-3 py-1 text-sm hover:bg-brain-accent-soft/30 disabled:opacity-50"
                >
                  수정
                </button>
                <button
                  onClick={() => remove(l)}
                  disabled={busy}
                  className="rounded border border-brain-danger/40 px-3 py-1 text-sm text-brain-danger hover:bg-brain-accent-soft/50 disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {editing !== null && (
        <LessonEditorDialog
          moduleId={moduleId}
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reload();
          }}
        />
      )}
    </>
  );
}

function LessonEditorDialog({
  moduleId,
  initial,
  onClose,
  onSaved,
}: {
  moduleId: string;
  initial: AdminLessonDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [language, setLanguage] = useState<"ko" | "en">(
    (initial?.language as "ko" | "en") ?? "ko",
  );
  const [objectivesText, setObjectivesText] = useState(
    initial?.objectives.join("\n") ?? "",
  );
  const [cognitiveStructureAnalysis, setCognitiveStructureAnalysis] = useState(
    initial?.cognitive_structure_analysis ?? "",
  );
  const [learnerQuestions, setLearnerQuestions] = useState(
    initial?.learner_questions ?? "",
  );
  const [tutorReferenceNotes, setTutorReferenceNotes] = useState(
    initial?.tutor_reference_notes ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const objectives = objectivesText
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    try {
      if (initial) {
        const patch: AdminLessonUpdateInput = {
          title,
          order,
          body,
          author: author || undefined,
          source: source || undefined,
          language,
          objectives,
          cognitive_structure_analysis: cognitiveStructureAnalysis,
          learner_questions: learnerQuestions,
          tutor_reference_notes: tutorReferenceNotes,
        };
        await api.adminUpdateLesson(initial.id, patch);
      } else {
        const create: AdminLessonCreateInput = {
          module_id: moduleId,
          title,
          order,
          body,
          author: author || undefined,
          source: source || undefined,
          language,
          objectives,
          cognitive_structure_analysis: cognitiveStructureAnalysis,
          learner_questions: learnerQuestions,
          tutor_reference_notes: tutorReferenceNotes,
        };
        await api.adminCreateLesson(create);
      }
      onSaved();
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-brain-border bg-brain-surface p-6 shadow-soft-2">
        <h3 className="mb-4 font-display text-xl">
          {initial ? "레슨 수정" : "새 레슨"}
        </h3>
        {error && (
          <div className="mb-3 rounded border border-brain-danger/40 bg-brain-accent-soft/50 px-3 py-2 text-sm text-brain-danger">
            {error}
          </div>
        )}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-sm">
          <Field label="제목">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="순서">
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1"
              />
            </Field>
            <Field label="저자">
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1"
              />
            </Field>
            <Field label="언어">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "ko" | "en")}
                className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1"
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>
          <Field label="출처">
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1"
            />
          </Field>
          <Field label="본문 (학생에게 노출될 텍스트)">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1 font-mono text-xs leading-relaxed"
            />
          </Field>
          <Field label="학습 목표 (한 줄에 하나)">
            <textarea
              value={objectivesText}
              onChange={(e) => setObjectivesText(e.target.value)}
              rows={3}
              className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1"
            />
          </Field>
          <section className="rounded-lg border border-brain-border bg-brain-surface-soft p-3">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-brain-text">
                AI 튜터 참고자료
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-brain-text-muted">
                학생에게 직접 노출하지 않고, 튜터가 답변할 때 참조하는 레슨별 기준입니다.
              </p>
            </div>
            <div className="space-y-3">
              <Field label="인지구조 분석">
                <textarea
                  value={cognitiveStructureAnalysis}
                  onChange={(e) => setCognitiveStructureAnalysis(e.target.value)}
                  rows={5}
                  placeholder="예: 이 글은 핵심 개념 → 근거 → 반례 → 재정의 순서로 전개된다..."
                  className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1 text-xs leading-relaxed"
                />
              </Field>
              <Field label="학습자에게 던질 질문">
                <textarea
                  value={learnerQuestions}
                  onChange={(e) => setLearnerQuestions(e.target.value)}
                  rows={5}
                  placeholder="예: 핵심 노드를 그렇게 잡은 근거는 어디에 있나요? 이 관계를 원인으로 볼 수 있나요?"
                  className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1 text-xs leading-relaxed"
                />
              </Field>
              <Field label="AI 튜터 참고 메모">
                <textarea
                  value={tutorReferenceNotes}
                  onChange={(e) => setTutorReferenceNotes(e.target.value)}
                  rows={4}
                  placeholder="예: 정답을 먼저 말하지 말고, 학생의 캔버스 노드 이름을 언급한 뒤 질문한다."
                  className="w-full rounded border border-brain-border bg-brain-bg px-2 py-1 text-xs leading-relaxed"
                />
              </Field>
            </div>
          </section>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded border border-brain-border px-3 py-1 text-sm disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={() => void submit()}
            disabled={busy || !title || !body}
            className="rounded bg-brain-accent px-3 py-1 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-brain-text-muted">{label}</span>
      {children}
    </label>
  );
}

// 분야 (modules.field) 의 enum 값 → 한국어 라벨. CLAUDE.md 의 분야 매트릭스와
// 정렬. 백엔드 컬럼은 그대로 두고 라벨만 한국화한다.
const FIELD_LABEL: Record<string, string> = {
  literature: "문학",
  philosophy: "철학",
  science: "과학·수학",
  art: "예술·음악",
  "eastern-classics": "동양 고전",
  economics: "경제·사회",
};

const FIELD_ORDER = [
  "science",
  "philosophy",
  "literature",
  "art",
  "economics",
  "eastern-classics",
];

function ModulesByField({
  modules,
  activeModuleId,
  onPick,
}: {
  modules: ModuleDto[];
  activeModuleId: string | null;
  onPick: (id: string) => void;
}) {
  const grouped = new Map<string, ModuleDto[]>();
  for (const m of modules) {
    const list = grouped.get(m.field) ?? [];
    list.push(m);
    grouped.set(m.field, list);
  }
  // 알려진 순서로 먼저, 모르는 분야는 뒤에.
  const fields = [
    ...FIELD_ORDER.filter((f) => grouped.has(f)),
    ...Array.from(grouped.keys()).filter((f) => !FIELD_ORDER.includes(f)),
  ];
  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const list = grouped.get(field) ?? [];
        const label = FIELD_LABEL[field] ?? field;
        return (
          <section key={field}>
            <h3
              className="mb-1.5 text-[10px] uppercase tracking-[0.18em]"
              style={{
                color: "var(--color-brain-text-soft)",
                fontWeight: 600,
              }}
            >
              {label}{" "}
              <span
                className="ml-1 text-[10px] normal-case"
                style={{ color: "var(--color-brain-text-soft)" }}
              >
                ({list.length})
              </span>
            </h3>
            <ul className="space-y-1">
              {list.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => onPick(m.id)}
                    className={
                      "w-full rounded px-3 py-2 text-left text-sm transition " +
                      (m.id === activeModuleId
                        ? "bg-brain-accent text-white"
                        : "text-brain-text hover:bg-brain-surface")
                    }
                  >
                    <div className="font-medium">{m.title}</div>
                    <div
                      className={
                        "text-xs " +
                        (m.id === activeModuleId
                          ? "text-white/80"
                          : "text-brain-text-muted")
                      }
                    >
                      {m.lesson_count}장
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ArtifactGallery({
  artifacts,
  onOpen,
}: {
  artifacts: ArtifactGalleryDto[] | null;
  onOpen: (item: ArtifactGalleryDto) => void;
}) {
  if (!artifacts) {
    return (
      <div className="mb-4 rounded-xl border border-brain-border bg-brain-surface-soft px-4 py-3 text-sm text-brain-text-muted">
        작업물을 불러오는 중...
      </div>
    );
  }
  if (artifacts.length === 0) return null;
  return (
    <section className="mb-4 rounded-xl border border-brain-border bg-brain-surface p-4 shadow-soft-1">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">내 작업물</h2>
          <p className="mt-1 text-xs text-brain-text-muted">최근 저장한 캔버스를 이어서 엽니다.</p>
        </div>
        <span className="rounded-full bg-brain-accent-soft px-2 py-0.5 text-xs text-brain-accent">
          {artifacts.length}개
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {artifacts.slice(0, 6).map((item) => (
          <button
            key={item.artifact_id}
            type="button"
            onClick={() => onOpen(item)}
            className="rounded-lg border border-brain-border bg-brain-bg p-3 text-left transition hover:border-brain-accent hover:bg-brain-surface-soft"
          >
            <div className="line-clamp-1 font-display text-sm text-brain-text">
              {item.lesson.title}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-brain-text-muted">
              <span>노드 {item.node_count}</span>
              <span>엣지 {item.edge_count}</span>
              <span>{new Date(item.saved_at).toLocaleDateString("ko-KR")}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProgressSummary({
  progress,
}: {
  progress: Map<string, ProgressEntryDto>;
}) {
  if (progress.size === 0) return null;
  const lessonsStarted = progress.size;
  let totalSessions = 0;
  let lastTs: number | null = null;
  progress.forEach((p) => {
    totalSessions += p.session_count;
    if (p.last_started_at) {
      const t = Date.parse(p.last_started_at);
      if (!Number.isNaN(t) && (lastTs === null || t > lastTs)) lastTs = t;
    }
  });
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-brain-border bg-brain-surface px-4 py-3 text-sm shadow-soft-1">
      <span className="font-display text-brain-text">학습 진행</span>
      <span className="text-brain-text-muted">
        진입한 레슨 <span className="text-brain-text">{lessonsStarted}</span>개
      </span>
      <span className="text-brain-text-muted">
        총 세션 <span className="text-brain-text">{totalSessions}</span>회
      </span>
      {lastTs !== null && (
        <span className="text-brain-text-muted">
          최근 활동 <span className="text-brain-text">{relativeTime(lastTs)}</span>
        </span>
      )}
    </div>
  );
}

function LessonProgressBadge({ entry }: { entry: ProgressEntryDto }) {
  const lastTs = entry.last_started_at ? Date.parse(entry.last_started_at) : null;
  return (
    <div className="flex shrink-0 flex-col items-end text-xs text-brain-text-muted">
      <span className="rounded-full bg-brain-accent-soft px-2 py-0.5 text-brain-accent">
        {entry.session_count}회
      </span>
      {lastTs !== null && !Number.isNaN(lastTs) && (
        <span className="mt-1">{relativeTime(lastTs)}</span>
      )}
    </div>
  );
}

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}일 전`;
  const mon = Math.round(day / 30);
  if (mon < 12) return `${mon}달 전`;
  return `${Math.round(mon / 12)}년 전`;
}

function ModePicker({
  active,
  onPick,
  disabled,
}: {
  active: SessionMode;
  onPick: (m: SessionMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" title="학습 모드 변경 시 새 세션이 시작됩니다">
      {MODE_OPTIONS.map((m) => (
        <button
          key={m.value}
          onClick={() => !disabled && active !== m.value && onPick(m.value)}
          disabled={disabled}
          title={m.hint}
          className={
            "rounded-full px-3 py-1 font-sans text-xs transition " +
            (m.value === active
              ? "bg-brain-accent text-white"
              : "border border-brain-border text-brain-text-muted hover:border-brain-accent hover:text-brain-text")
          }
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-3 py-1 font-sans text-sm transition " +
        (active
          ? "bg-brain-accent text-white"
          : "text-brain-text-muted hover:text-brain-text")
      }
    >
      {label}
    </button>
  );
}

function toMessage(e: unknown): string {
  if (e instanceof ApiError) return `${e.message} (${e.code})`;
  if (e instanceof Error) return e.message;
  return String(e);
}

function CompareBar({
  pins,
  onClear,
  onStart,
}: {
  pins: ComparePins;
  onClear: (slot: "left" | "right") => void;
  onStart: () => void;
}) {
  const hasAny = pins.left || pins.right;
  if (!hasAny) return null;
  const ready = pins.left && pins.right;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-brain-accent/40 bg-brain-accent-soft/40 px-4 py-3 text-sm">
      <span className="font-display text-brain-text">비교 모드</span>
      <ComparePinChip
        label="좌"
        lesson={pins.left}
        onClear={() => onClear("left")}
      />
      <ComparePinChip
        label="우"
        lesson={pins.right}
        onClear={() => onClear("right")}
      />
      <button
        onClick={onStart}
        disabled={!ready}
        className="ml-auto rounded bg-brain-accent px-3 py-1 text-sm text-white hover:opacity-90 disabled:opacity-40"
      >
        비교 시작
      </button>
    </div>
  );
}

function ComparePinChip({
  label,
  lesson,
  onClear,
}: {
  label: string;
  lesson: LessonDto | null;
  onClear: () => void;
}) {
  if (!lesson)
    return (
      <span className="rounded-full border border-dashed border-brain-border px-3 py-0.5 text-xs text-brain-text-muted">
        {label}: 비어 있음
      </span>
    );
  return (
    <span className="flex items-center gap-1 rounded-full bg-brain-surface px-3 py-0.5 text-xs text-brain-text shadow-soft-1">
      <span className="text-brain-text-muted">{label}:</span>
      <span className="max-w-[180px] truncate">{lesson.title}</span>
      <button
        onClick={onClear}
        className="ml-1 text-brain-text-muted hover:text-brain-danger"
        aria-label="비교 슬롯 비우기"
      >
        ×
      </button>
    </span>
  );
}

function ComparePinButtons({
  lesson,
  pinSlot,
  pins,
  onPin,
  onClear,
}: {
  lesson: LessonDto;
  pinSlot: "left" | "right" | null;
  pins: ComparePins;
  onPin: (slot: "left" | "right", lesson: LessonDto) => void;
  onClear: (slot: "left" | "right") => void;
}) {
  return (
    <div className="mt-2 flex justify-end gap-2 text-xs">
      <PinSlotBtn
        slot="left"
        label="좌측 비교"
        active={pinSlot === "left"}
        disabled={pins.left !== null && pinSlot !== "left"}
        onClick={() => (pinSlot === "left" ? onClear("left") : onPin("left", lesson))}
      />
      <PinSlotBtn
        slot="right"
        label="우측 비교"
        active={pinSlot === "right"}
        disabled={pins.right !== null && pinSlot !== "right"}
        onClick={() =>
          pinSlot === "right" ? onClear("right") : onPin("right", lesson)
        }
      />
    </div>
  );
}

function PinSlotBtn({
  label,
  active,
  disabled,
  onClick,
}: {
  slot: "left" | "right";
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "rounded-full border px-2.5 py-0.5 transition " +
        (active
          ? "border-brain-accent bg-brain-accent text-white"
          : disabled
            ? "border-brain-border text-brain-text-soft opacity-40"
            : "border-brain-border text-brain-text-muted hover:border-brain-accent hover:text-brain-text")
      }
    >
      {active ? "비교 해제" : label}
    </button>
  );
}

function CompareScreen({
  left,
  right,
  onBack,
}: {
  left: LessonDto;
  right: LessonDto;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-brain-border bg-brain-surface px-6 py-3">
        <button
          onClick={onBack}
          className="text-sm text-brain-text-muted hover:text-brain-text"
        >
          ← 라이브러리
        </button>
        <div className="text-center font-display text-base">
          비교 모드 — {left.title} <span className="text-brain-text-muted">vs</span>{" "}
          {right.title}
        </div>
        <div className="w-20 text-right text-xs text-brain-text-muted">
          좌우 캔버스는 각자 자동 저장됩니다
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 overflow-hidden">
        <div className="overflow-hidden border-r border-brain-border">
          <CompareSide lesson={left} side="좌" />
        </div>
        <div className="overflow-hidden">
          <CompareSide lesson={right} side="우" />
        </div>
      </div>
    </div>
  );
}

function CompareSide({ lesson, side }: { lesson: LessonDto; side: string }) {
  const [text, setText] = useState<TextExcerptDto | null>(null);
  const [session, setSession] = useState<SessionDto | null>(null);
  const [initialCanvas, setInitialCanvas] = useState<CanvasJson | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"text" | "canvas">("canvas");
  const clientRevision = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setText(null);
    setSession(null);
    setInitialCanvas(null);
    setCanvasReady(false);
    clientRevision.current = 0;
    (async () => {
      try {
        const textPromise = lesson.text_excerpt_id
          ? api.text(lesson.text_excerpt_id)
          : Promise.resolve(null);
        const [textRow, sess] = await Promise.all([
          textPromise,
          api.startSession(lesson.id, "analyze"),
        ]);
        if (cancelled) return;
        setText(textRow);
        setSession(sess);
        const artifact = await api.getArtifact(sess.id);
        if (cancelled) return;
        setInitialCanvas(artifact?.canvas_json ?? null);
        setCanvasReady(true);
      } catch (e: unknown) {
        if (!cancelled) setError(toMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lesson.id, lesson.text_excerpt_id]);

  const onSaveCanvas = useCallback(
    async (next: CanvasJson) => {
      if (!session) return;
      clientRevision.current += 1;
      await api.putArtifact(session.id, next, clientRevision.current);
    },
    [session],
  );

  return (
    <div className="flex h-full flex-col bg-brain-surface-soft">
      <div className="flex items-center justify-between border-b border-brain-border bg-brain-surface px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brain-accent px-2 py-0.5 text-white">{side}</span>
          <span className="font-display text-sm text-brain-text">{lesson.title}</span>
        </div>
        <div className="flex gap-1">
          <TabButton
            active={view === "text"}
            onClick={() => setView("text")}
            label="본문"
          />
          <TabButton
            active={view === "canvas"}
            onClick={() => setView("canvas")}
            label="캔버스"
          />
        </div>
      </div>
      {error && (
        <div className="border-b border-brain-danger/40 bg-brain-accent-soft/50 px-4 py-1 text-xs text-brain-danger">
          {error}
        </div>
      )}
      {view === "text" && (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!text && !error && (
            <p className="text-xs text-brain-text-muted">본문 불러오는 중…</p>
          )}
          {text && (
            <article className="prose max-w-none">
              <h3 className="font-display text-base">{text.title}</h3>
              <p className="text-xs text-brain-text-muted">
                {text.author} · {text.source}
              </p>
              <div className="mt-3 whitespace-pre-wrap font-serif text-sm leading-relaxed">
                {text.body}
              </div>
            </article>
          )}
        </div>
      )}
      {view === "canvas" && (
        <div className="flex-1 overflow-hidden">
          {canvasReady ? (
            <CognitiveMap
              initial={initialCanvas}
              onSave={onSaveCanvas}
              disabled={!session}
            />
          ) : (
            <p className="p-4 text-xs text-brain-text-muted">캔버스 불러오는 중…</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Subscription (Toss Path B) ─────────────────────────────────────

interface TossPaymentsClient {
  requestPayment: (
    method: string,
    payload: {
      amount: number;
      orderId: string;
      orderName: string;
      customerEmail?: string;
      successUrl: string;
      failUrl: string;
    },
  ) => Promise<void>;
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsClient;
  }
}

const TOSS_SDK_URL = "https://js.tosspayments.com/v1/payment";

async function consumeAuthReturnUrl(): Promise<{ user: UserDto } | null> {
  if (typeof window === "undefined") return null;
  if (window.location.pathname !== "/verify-email") return null;
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) return null;
  try {
    const result = await api.verifyEmail(token);
    return { user: result.user };
  } finally {
    window.history.replaceState({}, "", "/");
  }
}

function loadTossSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no_window"));
  if (window.TossPayments) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TOSS_SDK_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("toss_sdk_load_failed")), {
        once: true,
      });
      return;
    }
    const s = document.createElement("script");
    s.src = TOSS_SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("toss_sdk_load_failed"));
    document.head.appendChild(s);
  });
}

// Detects /billing/success?paymentKey=…&orderId=…&amount=… and /billing/fail.
// On success: calls /api/billing/confirm and returns a flash message.
// Always resets pathname back to "/" so reloads don't re-trigger.
async function consumeTossReturnUrl(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname;
  if (path !== "/billing/success" && path !== "/billing/fail") return null;
  const qs = new URLSearchParams(window.location.search);
  try {
    if (path === "/billing/fail") {
      const code = qs.get("code") ?? "unknown";
      const msg = qs.get("message") ?? "결제가 취소되었거나 실패했습니다.";
      return `결제 실패 (${code}): ${msg}`;
    }
    const paymentKey = qs.get("paymentKey");
    const orderId = qs.get("orderId");
    const amount = Number(qs.get("amount") ?? "0");
    if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
      return "결제 정보가 불완전해 확인을 건너뛰었습니다.";
    }
    const result = await api.billingConfirm(paymentKey, orderId, amount);
    return `${result.plan_name.toUpperCase()} 구독 활성화 완료 — ${new Date(
      result.ends_at,
    ).toLocaleDateString("ko-KR")}까지`;
  } catch (e: unknown) {
    return `결제 확인 실패: ${toMessage(e)}`;
  } finally {
    window.history.replaceState({}, "", "/");
  }
}

function SubscriptionScreen({ flash }: { flash: string | null }) {
  const [plans, setPlans] = useState<PlanDto[] | null>(null);
  const [current, setCurrent] = useState<SubscriptionDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(flash);
  const [busy, setBusy] = useState<PlanName | null>(null);

  const refresh = useCallback(() => {
    let cancelled = false;
    Promise.all([api.billingPlans(), api.billingMeSubscription()])
      .then(([p, s]) => {
        if (cancelled) return;
        setPlans(p);
        setCurrent(s);
      })
      .catch((e: unknown) => !cancelled && setError(toMessage(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return refresh();
  }, [refresh]);

  const onCheckout = async (planName: Exclude<PlanName, "free">) => {
    setError(null);
    setBusy(planName);
    try {
      const payload: CheckoutPayload = await api.billingCheckout(planName);
      await loadTossSdk();
      if (!window.TossPayments) throw new Error("toss_sdk_unavailable");
      const toss = window.TossPayments(payload.client_key);
      await toss.requestPayment("카드", {
        amount: payload.amount,
        orderId: payload.order_id,
        orderName: payload.order_name,
        customerEmail: payload.customer_email,
        successUrl: payload.success_url,
        failUrl: payload.fail_url,
      });
    } catch (e: unknown) {
      const msg = toMessage(e);
      if (e instanceof ApiError && e.status === 503) {
        setError(
          "결제 모듈은 아직 활성화되지 않았습니다 (TOSS 키 등록 후 사용 가능).",
        );
      } else {
        setError(msg);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 overflow-y-auto p-6">
      <div>
        <h2 className="font-display text-2xl">구독</h2>
        <p className="mt-1 text-sm text-brain-text-muted">
          무료 체험으로 시작하고, 더 깊은 학습이 필요할 때 구독을 활성화하세요.
        </p>
      </div>

      {notice && (
        <div className="rounded border border-brain-accent/40 bg-brain-accent-soft/40 px-4 py-3 text-sm text-brain-text">
          <div className="flex items-start justify-between gap-3">
            <span>{notice}</span>
            <button
              className="text-xs text-brain-text-muted hover:text-brain-text"
              onClick={() => setNotice(null)}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded border border-brain-danger/40 bg-brain-accent-soft/50 px-3 py-2 text-sm text-brain-danger">
          {error}
        </div>
      )}

      {current && (
        <div className="rounded-2xl border border-brain-border bg-brain-surface p-5 shadow-soft-1">
          <div className="text-xs text-brain-text-muted">현재 구독</div>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-display text-lg">
              {(current.plan_name ?? "free").toUpperCase()}
            </span>
            <span className="rounded-full bg-brain-accent-soft px-2 py-0.5 text-xs text-brain-accent">
              {current.status}
            </span>
          </div>
          <div className="mt-2 text-xs text-brain-text-muted">
            {new Date(current.started_at).toLocaleDateString("ko-KR")} 시작
            {current.ends_at && (
              <>
                {" "}· {new Date(current.ends_at).toLocaleDateString("ko-KR")} 만료
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {plans?.map((p) => (
          <PlanCard
            key={p.name}
            plan={p}
            busy={busy === p.name}
            onCheckout={
              p.name === "free"
                ? null
                : () => void onCheckout(p.name as Exclude<PlanName, "free">)
            }
          />
        ))}
        {!plans && (
          <p className="text-sm text-brain-text-muted">요금제 불러오는 중…</p>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-brain-border bg-brain-surface-soft p-4 text-xs text-brain-text-muted">
        결제는 Toss Payments 키-인 방식 (Path B) 으로 처리됩니다. 카드 정보는 Toss
        결제창에서만 입력되며 Brain180 서버에는 저장되지 않습니다. 결제 완료 후 자동으로
        구독이 활성화되고, 영수증은 가입 이메일로 발송됩니다.
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  busy,
  onCheckout,
}: {
  plan: PlanDto;
  busy: boolean;
  onCheckout: (() => void) | null;
}) {
  const featureRows = Object.entries(plan.features).map(([k, v]) => ({
    key: k,
    label: featureLabel(k, v),
  }));
  return (
    <div className="flex h-full flex-col rounded-2xl border border-brain-border bg-brain-surface p-5 shadow-soft-1">
      <div className="font-display text-lg">{plan.title}</div>
      <div className="mt-1 text-2xl font-semibold">
        {plan.price_krw === 0 ? "무료" : `₩ ${plan.price_krw.toLocaleString("ko-KR")}`}
        {plan.price_krw > 0 && (
          <span className="ml-1 text-xs text-brain-text-muted">/월</span>
        )}
      </div>
      <ul className="mt-4 flex-1 space-y-1 text-xs text-brain-text-muted">
        {featureRows.map((f) => (
          <li key={f.key}>· {f.label}</li>
        ))}
      </ul>
      <button
        onClick={() => onCheckout?.()}
        disabled={!onCheckout || busy}
        className={
          "mt-5 rounded px-3 py-2 text-sm font-medium transition " +
          (!onCheckout
            ? "cursor-default bg-brain-surface-soft text-brain-text-muted"
            : busy
              ? "bg-brain-accent/70 text-white"
              : "bg-brain-accent text-white hover:opacity-90")
        }
      >
        {!onCheckout ? "기본 제공" : busy ? "결제창 여는 중…" : "결제하기"}
      </button>
    </div>
  );
}

function featureLabel(key: string, value: unknown): string {
  const labels: Record<string, string> = {
    lessons_per_month: "월간 레슨",
    tutor_chat: "튜터 채팅",
    canvas_history: "캔버스 보관 일수",
    compare_mode: "비교 모드",
    export_pdf: "PDF 내보내기",
  };
  const label = labels[key] ?? key;
  const v =
    typeof value === "boolean"
      ? value
        ? "포함"
        : "미포함"
      : typeof value === "number"
        ? `${value}`
        : String(value);
  return `${label}: ${v}`;
}
