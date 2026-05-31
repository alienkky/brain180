// Owner: 연다리 [통합설계].
// First browser shell for Brain180 v2. Single-file 3-screen flow:
//   login → library (modules → lessons) → practice (text + tutor chat).
// Talks to the Express server through the Vite /api proxy. Lucia's session
// cookie is httpOnly so we cannot read it — we rely on `credentials: include`
// in api.ts and probe /me on mount to restore sessions across reloads.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ApiError,
  api,
  type AdminLessonCreateInput,
  type AdminLessonDto,
  type AdminLessonUpdateInput,
  type AdminModuleCreateInput,
  type AdminModuleDto,
  type AdminModuleUpdateInput,
  type CanvasCite,
  type CanvasJson,
  type CanvasNode,
  type LessonDto,
  type ModuleAxis,
  type ModuleDto,
  type ProgressEntryDto,
  type SessionDto,
  type SessionMode,
  type TextExcerptDto,
  type TutorMessageDto,
  type UserDto,
} from "./api";
import { CognitiveMap } from "./CognitiveMap";

type Screen =
  | { name: "login" }
  | { name: "library" }
  | { name: "practice"; lesson: LessonDto }
  | { name: "compare"; left: LessonDto; right: LessonDto }
  | { name: "admin" };

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

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setScreen({ name: "library" });
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
        onGoLibrary={() => setScreen({ name: "library" })}
        onGoAdmin={() => setScreen({ name: "admin" })}
        activeScreen={screen.name}
      />
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
          />
        )}
        {screen.name === "practice" && (
          <PracticeScreen
            lesson={screen.lesson}
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
        {screen.name === "admin" && <AdminScreen />}
      </main>
    </div>
  );
}

function Header({
  user,
  onLogout,
  onGoLibrary,
  onGoAdmin,
  activeScreen,
}: {
  user: UserDto | null;
  onLogout: () => void;
  onGoLibrary: () => void;
  onGoAdmin: () => void;
  activeScreen: Screen["name"];
}) {
  return (
    <header className="flex items-center justify-between border-b border-brain-border bg-brain-surface px-6 py-3 shadow-soft-1">
      <div>
        <div className="font-display text-xl tracking-tight">Brain180</div>
        <div className="text-xs text-brain-text-muted">천재의 뇌인지 구조 시각화</div>
      </div>
      {user && (
        <div className="flex items-center gap-4 text-sm">
          <nav className="flex items-center gap-1">
            <HeaderNavButton
              active={activeScreen === "library" || activeScreen === "practice"}
              onClick={onGoLibrary}
              label="라이브러리"
            />
            {user.role === "admin" && (
              <HeaderNavButton
                active={activeScreen === "admin"}
                onClick={onGoAdmin}
                label="관리자"
              />
            )}
          </nav>
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

function LoginScreen({ onLoggedIn }: { onLoggedIn: (u: UserDto) => void }) {
  const [email, setEmail] = useState("kky710@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await api.login(email, password);
      onLoggedIn(data.user);
    } catch (e: unknown) {
      setError(toMessage(e));
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
          <h1 className="font-display text-2xl">로그인</h1>
          <p className="mt-1 text-sm text-brain-text-muted">
            Brain180 v2 에 접속하려면 인증이 필요합니다.
          </p>
        </div>
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
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded border border-brain-border bg-brain-bg px-3 py-2 outline-none focus:border-brain-accent"
          />
        </label>
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
          {submitting ? "확인 중…" : "로그인"}
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
}: {
  onPickLesson: (lesson: LessonDto) => void;
  comparePins: ComparePins;
  onPinCompare: (slot: "left" | "right", lesson: LessonDto) => void;
  onClearPin: (slot: "left" | "right") => void;
  onStartCompare: () => void;
}) {
  const [modules, setModules] = useState<ModuleDto[] | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonDto[] | null>(null);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [progress, setProgress] = useState<Map<string, ProgressEntryDto>>(
    () => new Map(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.modules(), api.progress()])
      .then(([modRows, progRows]) => {
        if (cancelled) return;
        setModules(modRows);
        if (modRows[0]) {
          setActiveModuleId(modRows[0].id);
        }
        setProgress(new Map(progRows.map((p) => [p.lesson_id, p])));
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
        <h2 className="mb-3 font-display text-lg">모듈</h2>
        {!modules && <p className="text-sm text-brain-text-muted">불러오는 중…</p>}
        {modules && modules.length === 0 && (
          <p className="text-sm text-brain-text-muted">
            아직 시드된 모듈이 없습니다.
          </p>
        )}
        <ul className="space-y-1">
          {modules?.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => setActiveModuleId(m.id)}
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
                  {m.field} · {m.lesson_count}개 레슨
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="overflow-y-auto p-6">
        <ProgressSummary progress={progress} />
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
            이 모듈에는 레슨이 없습니다.
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

type PracticeTab = "chat" | "canvas";

const MODE_OPTIONS: { value: SessionMode; label: string; hint: string }[] = [
  {
    value: "analyze",
    label: "분석",
    hint: "본문 → 캔버스: 텍스트에서 사고 구조를 추출",
  },
  {
    value: "reverse",
    label: "역해석",
    hint: "캔버스 → 본문: 그래프를 먼저 본 뒤 본문을 추측",
  },
  {
    value: "practice",
    label: "연습",
    hint: "자유 그리기: 본문은 참고, 캔버스 중심 코칭",
  },
];

function PracticeScreen({
  lesson,
  onBack,
}: {
  lesson: LessonDto;
  onBack: () => void;
}) {
  const [text, setText] = useState<TextExcerptDto | null>(null);
  const [session, setSession] = useState<SessionDto | null>(null);
  const [messages, setMessages] = useState<TutorMessageDto[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PracticeTab>("chat");
  const [mode, setMode] = useState<SessionMode>("analyze");
  const [revealText, setRevealText] = useState(false);
  const [initialCanvas, setInitialCanvas] = useState<CanvasJson | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [textSelection, setTextSelection] = useState<CanvasCite | null>(null);
  const [pendingCite, setPendingCite] = useState<CanvasCite | null>(null);
  const [focusCite, setFocusCite] = useState<CanvasCite | null>(null);
  const currentCanvas = useRef<CanvasJson | null>(null);
  const clientRevision = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setText(null);
    setSession(null);
    setMessages([]);
    setInitialCanvas(null);
    setCanvasReady(false);
    currentCanvas.current = null;
    clientRevision.current = 0;
    // Reverse mode: text starts hidden so student must reconstruct from the
    // canvas; analyze/practice show text up front.
    setRevealText(mode !== "reverse");

    (async () => {
      try {
        const textPromise = lesson.text_excerpt_id
          ? api.text(lesson.text_excerpt_id)
          : Promise.resolve(null);
        const [textRow, sess] = await Promise.all([
          textPromise,
          api.startSession(lesson.id, mode),
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
        setInitialCanvas(artifact?.canvas_json ?? null);
        currentCanvas.current = artifact?.canvas_json ?? null;
        setCanvasReady(true);
      } catch (e: unknown) {
        if (!cancelled) setError(toMessage(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lesson.id, lesson.text_excerpt_id, mode]);

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
  }, []);

  const onNodeFocus = useCallback((n: CanvasNode) => {
    if (!n.cite) return;
    setFocusCite(n.cite);
    setRevealText(true);
  }, []);

  // Auto-clear focus highlight after a few seconds so the spotlight is
  // transient — the student should still be able to read the rest of the
  // text without a persistent yellow stripe.
  useEffect(() => {
    if (!focusCite) return;
    const t = window.setTimeout(() => setFocusCite(null), 4000);
    return () => window.clearTimeout(t);
  }, [focusCite]);

  // Whenever a focused cite changes, scroll its highlighted span into view.
  useEffect(() => {
    if (!focusCite || !textBodyRef.current) return;
    const target = textBodyRef.current.querySelector(
      "[data-cite-highlight=\"true\"]",
    );
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusCite]);

  const captureTextSelection = useCallback(() => {
    if (!text || !textBodyRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setTextSelection(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!textBodyRef.current.contains(range.commonAncestorContainer)) {
      setTextSelection(null);
      return;
    }
    const quote = sel.toString().trim();
    if (!quote) {
      setTextSelection(null);
      return;
    }
    const start = text.body.indexOf(quote);
    if (start === -1) {
      setTextSelection(null);
      return;
    }
    setTextSelection({
      start,
      end: start + quote.length,
      quote: quote.slice(0, 400),
    });
  }, [text]);

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
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      await api.chat(session.id, lesson.id, message, snapshot);
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
      setTab("chat");
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

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

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

  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-0">
      <section className="flex flex-col overflow-hidden border-r border-brain-border">
        <div className="flex items-center justify-between border-b border-brain-border bg-brain-surface px-6 py-3">
          <button
            onClick={onBack}
            className="text-sm text-brain-text-muted hover:text-brain-text"
          >
            ← 레슨 선택
          </button>
          <div className="font-display text-lg">{lesson.title}</div>
          <ModePicker active={mode} onPick={setMode} disabled={sending} />
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-6">
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
                <>
                  <div
                    ref={textBodyRef}
                    onMouseUp={captureTextSelection}
                    onKeyUp={captureTextSelection}
                    className="mt-4 whitespace-pre-wrap font-serif text-base leading-relaxed"
                  >
                    {renderTextWithHighlight(text.body, focusCite)}
                  </div>
                  {textSelection && (
                    <div className="sticky bottom-4 mt-4 flex items-center gap-2 rounded-xl border border-brain-accent/60 bg-brain-surface px-4 py-2 text-sm shadow-soft-2">
                      <span className="flex-1 truncate text-brain-text-muted">
                        선택: <span className="text-brain-text">{textSelection.quote.slice(0, 50)}</span>
                        {textSelection.quote.length > 50 ? "…" : ""}
                      </span>
                      <button
                        onClick={() => {
                          setPendingCite(textSelection);
                          setTextSelection(null);
                          setTab("canvas");
                          window.getSelection()?.removeAllRanges();
                        }}
                        className="rounded bg-brain-accent px-3 py-1 text-xs text-white hover:opacity-90"
                      >
                        캔버스에 인용 노드 추가
                      </button>
                      <button
                        onClick={() => {
                          setTextSelection(null);
                          window.getSelection()?.removeAllRanges();
                        }}
                        className="rounded border border-brain-border px-2 py-1 text-xs text-brain-text-muted hover:text-brain-text"
                      >
                        취소
                      </button>
                    </div>
                  )}
                </>
              )}
            </article>
          )}
        </div>
      </section>
      <section className="flex flex-col overflow-hidden bg-brain-surface-soft">
        <div className="flex items-center justify-between border-b border-brain-border bg-brain-surface px-6 py-3">
          <div className="flex gap-1">
            <TabButton
              active={tab === "chat"}
              onClick={() => setTab("chat")}
              label="사고구조 튜터"
            />
            <TabButton
              active={tab === "canvas"}
              onClick={() => setTab("canvas")}
              label="인지 캔버스"
            />
          </div>
          <div className="text-xs text-brain-text-muted">
            {session ? `세션 ${session.id.slice(0, 8)}…` : "세션 시작 중…"}
          </div>
        </div>
        {tab === "chat" && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
              {messages.length === 0 && !error && (
                <p className="text-sm text-brain-text-muted">
                  본문에 대한 질문을 던지면 튜터가 사고 패턴을 함께 풀어드립니다.
                </p>
              )}
              <ul className="space-y-3">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-soft-1 " +
                      (m.role === "user"
                        ? "ml-auto bg-brain-accent text-white"
                        : "mr-auto bg-brain-surface text-brain-text")
                    }
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.model && (
                      <div className="mt-1 text-[10px] uppercase tracking-wider opacity-60">
                        {m.model} · in {m.input_tokens} / out {m.output_tokens}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {error && (
              <div className="border-t border-brain-danger/40 bg-brain-accent-soft/50 px-6 py-2 text-sm text-brain-danger">
                {error}
              </div>
            )}
            <form
              onSubmit={send}
              className="flex items-end gap-2 border-t border-brain-border bg-brain-surface p-3"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(e as unknown as React.FormEvent);
                  }
                }}
                rows={2}
                disabled={!session || sending}
                placeholder="질문을 입력하세요 — Enter 전송, Shift+Enter 줄바꿈"
                className="flex-1 resize-none rounded border border-brain-border bg-brain-bg px-3 py-2 text-sm outline-none focus:border-brain-accent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!session || sending || !input.trim()}
                className="rounded bg-brain-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {sending ? "…" : "전송"}
              </button>
            </form>
          </>
        )}
        {tab === "canvas" && (
          <div className="flex-1 overflow-hidden">
            {canvasReady ? (
              <CognitiveMap
                initial={initialCanvas}
                onSave={onSaveCanvas}
                onChange={onCanvasChange}
                onAskTutor={onAskTutor}
                onNodeFocus={onNodeFocus}
                injectCite={pendingCite}
                onCiteConsumed={() => setPendingCite(null)}
                disabled={!session}
              />
            ) : (
              <p className="p-6 text-sm text-brain-text-muted">
                캔버스 불러오는 중…
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

type AdminTab = "users" | "modules" | "lessons";

function AdminScreen() {
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
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          {tab === "users" && <AdminUsersPanel />}
          {tab === "modules" && <AdminModulesPanel />}
          {tab === "lessons" && <AdminLessonsPanel />}
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
            "rounded-full px-3 py-1 text-xs transition " +
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
        "rounded-full px-3 py-1 font-display text-sm transition " +
        (active
          ? "bg-brain-accent text-white"
          : "text-brain-text-muted hover:text-brain-text")
      }
    >
      {label}
    </button>
  );
}

function renderTextWithHighlight(
  body: string,
  cite: CanvasCite | null,
): ReactNode {
  if (!cite) return body;
  const start = Math.max(0, Math.min(cite.start, body.length));
  const end = Math.max(start, Math.min(cite.end, body.length));
  if (end <= start) return body;
  return (
    <>
      {body.slice(0, start)}
      <mark
        data-cite-highlight="true"
        className="rounded bg-brain-highlight-soft px-0.5 text-brain-text"
      >
        {body.slice(start, end)}
      </mark>
      {body.slice(end)}
    </>
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
