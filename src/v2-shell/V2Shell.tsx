// Owner: 연다리 [통합설계].
// First browser shell for Brain180 v2. Single-file 3-screen flow:
//   login → library (modules → lessons) → practice (text + tutor chat).
// Talks to the Express server through the Vite /api proxy. Lucia's session
// cookie is httpOnly so we cannot read it — we rely on `credentials: include`
// in api.ts and probe /me on mount to restore sessions across reloads.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  api,
  type CanvasJson,
  type LessonDto,
  type ModuleDto,
  type SessionDto,
  type TextExcerptDto,
  type TutorMessageDto,
  type UserDto,
} from "./api";
import { CognitiveMap } from "./CognitiveMap";

type Screen =
  | { name: "login" }
  | { name: "library" }
  | { name: "practice"; lesson: LessonDto };

export function V2Shell() {
  const [user, setUser] = useState<UserDto | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "login" });
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

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
      <Header user={user} onLogout={onLogout} />
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
          />
        )}
        {screen.name === "practice" && (
          <PracticeScreen
            lesson={screen.lesson}
            onBack={() => setScreen({ name: "library" })}
          />
        )}
      </main>
    </div>
  );
}

function Header({ user, onLogout }: { user: UserDto | null; onLogout: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-brain-border bg-brain-surface px-6 py-3 shadow-soft-1">
      <div>
        <div className="font-display text-xl tracking-tight">Brain180</div>
        <div className="text-xs text-brain-text-muted">천재의 뇌인지 구조 시각화</div>
      </div>
      {user && (
        <div className="flex items-center gap-4 text-sm">
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
}: {
  onPickLesson: (lesson: LessonDto) => void;
}) {
  const [modules, setModules] = useState<ModuleDto[] | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonDto[] | null>(null);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .modules()
      .then((rows) => {
        if (cancelled) return;
        setModules(rows);
        if (rows[0]) {
          setActiveModuleId(rows[0].id);
        }
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
          {lessons?.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => onPickLesson(l)}
                className="w-full rounded-xl border border-brain-border bg-brain-surface p-4 text-left shadow-soft-1 transition hover:border-brain-accent hover:shadow-soft-2"
              >
                <div className="font-display text-lg">{l.title}</div>
                {l.objectives.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-brain-text-muted">
                    {l.objectives.slice(0, 3).map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

type PracticeTab = "chat" | "canvas";

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
  const [initialCanvas, setInitialCanvas] = useState<CanvasJson | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const currentCanvas = useRef<CanvasJson | null>(null);
  const clientRevision = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

    (async () => {
      try {
        const textPromise = lesson.text_excerpt_id
          ? api.text(lesson.text_excerpt_id)
          : Promise.resolve(null);
        const [textRow, sess] = await Promise.all([
          textPromise,
          api.startSession(lesson.id),
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
  }, [lesson.id, lesson.text_excerpt_id]);

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
          <span className="w-20" />
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
              <div className="mt-4 whitespace-pre-wrap font-serif text-base leading-relaxed">
                {text.body}
              </div>
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

function toMessage(e: unknown): string {
  if (e instanceof ApiError) return `${e.message} (${e.code})`;
  if (e instanceof Error) return e.message;
  return String(e);
}
