import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { api } from "../../v2-shell/api";
import type { RobotTutorTurn, RobotStatus } from "../../v2-shell/api";
import { MicButton } from "./MicButton";

// 로봇 튜터 (ALI-23) — AI 코치와 같은 대화 UX 로 진입하는 또 하나의 튜터 페르소나.
// 백엔드 /api/robot-tutor/chat 는 세션 인증 + 학생의 학습 레슨(학습된 노드)을
// 프롬프트에 주입하므로, 로봇이 "무엇을 배웠는지 확인하고 조언"할 수 있다.
// 무상태 라우트라 대화 이력은 이 컴포넌트가 보관해 매 요청에 함께 보낸다.

interface Msg {
  role: "user" | "assistant";
  content: string;
}

// 경량 마크다운 — **굵게**, 줄바꿈. 채팅 답변용 최소 서식.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={keyPrefix + i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={keyPrefix + i}>{p}</span>
    ),
  );
}

function renderMarkdown(text: string): ReactNode[] {
  return text.split("\n").map((line, i) =>
    line.trim() === "" ? (
      <div key={i} className="h-2" />
    ) : (
      <div key={i}>{renderInline(line, `p${i}-`)}</div>
    ),
  );
}

// Optional in-session context. When present, the robot reads the learner's
// current structure + explanation and this lesson's admin-authored 1/2/3부
// principles. Getters are read at send time so values are always fresh.
export interface RobotTutorContext {
  lessonId?: string;
  getStructureText?: () => string;
  getExplanation?: () => string;
}

interface Props {
  onClose: () => void;
  context?: RobotTutorContext;
}

export function RobotTutor({ onClose, context }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  loadingRef.current = loading;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const structureText = context?.getStructureText?.() ?? "";
  const hasStructure = structureText.trim().length > 0;

  // 로봇 단말 연결 상태 — 8초마다 폴링.
  const [robot, setRobot] = useState<RobotStatus | null>(null);
  useEffect(() => {
    let alive = true;
    const poll = () => {
      api
        .robotStatus()
        .then((s) => {
          if (alive) setRobot(s);
        })
        .catch(() => {
          if (alive) setRobot(null);
        });
    };
    poll();
    const t = setInterval(poll, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const send = async (
    override?: string,
    opts?: { includeStructure?: boolean; imageBase64?: string },
  ) => {
    const text = (override ?? input).trim();
    if (!text || loadingRef.current) return;
    if (override === undefined) setInput("");
    const history: RobotTutorTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      // Attach the learner's structure + explanation only on the "구조 분석"
      // action, so normal chat turns stay lightweight.
      const chatOpts = {
        lessonId: context?.lessonId,
        structureText: opts?.includeStructure ? context?.getStructureText?.() : undefined,
        explanation: opts?.includeStructure ? context?.getExplanation?.() : undefined,
        imageBase64: opts?.imageBase64,
      };
      const res = await api.robotTutorChat(text, history, chatOpts);
      setMessages((prev) => [...prev, { role: "assistant", content: res.text }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ 로봇 튜터 응답을 불러오지 못했습니다. (${e instanceof Error ? e.message : "오류"})`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeStructure = () =>
    send("내가 그린 구조와 설명을 안진훈 박사님처럼 3단계 저자의 렌즈로 분석하고 조언해줘.", {
      includeStructure: true,
    });

  // 로봇이 지금 보고 있는 화면(카메라 프레임)을 가져와 바로 분석 요청.
  const pullRobotScreen = async () => {
    if (loadingRef.current) return;
    setLoading(true);
    try {
      const frame = await api.robotFrame();
      setLoading(false);
      await send("로봇이 지금 보고 있는 화면을 안진훈 박사님처럼 읽고 조언해줘.", {
        imageBase64: frame.image_base64,
      });
    } catch (e) {
      setLoading(false);
      const msg =
        e instanceof Error && /404|no_frame/.test(e.message)
          ? "🤖 로봇이 아직 화면을 보내지 않았습니다. 로봇이 연결되어 화면을 전송 중인지 확인하세요."
          : `⚠️ 로봇 화면을 가져오지 못했습니다. (${e instanceof Error ? e.message : "오류"})`;
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    }
  };

  // 물리 로봇에게 "지금 캡처해" 명령을 보낸다. 로봇이 ~5초 내 폴링해 사진을 찍고
  // 그 자리에서 한국어로 설명해 말한다. 게이트웨이가 같은 프레임을 서버로 올리므로
  // 잠시 뒤 자동으로 그 장면을 튜터 조언으로도 가져온다.
  const captureViaRobot = async () => {
    if (loadingRef.current) return;
    setLoading(true);
    try {
      await api.robotTriggerCapture();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "🤖📸 로봇에게 캡처를 요청했습니다. 로봇이 찍고 설명하는 데 10~20초쯤 걸립니다. 끝나면 그 장면을 여기로 가져와 조언합니다...",
        },
      ]);
      setLoading(false);
      // 로봇의 캡처 턴(폴링 최대 5초 + 촬영/업로드)이 끝날 때쯤 프레임을 당겨온다.
      setTimeout(() => {
        void pullRobotScreen();
      }, 18000);
    } catch (e) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ 로봇 캡처 요청에 실패했습니다. (${e instanceof Error ? e.message : "오류"})`,
        },
      ]);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[min(560px,80vh)] w-[min(380px,calc(100vw-2rem))] flex-col rounded-2xl border border-brain-border bg-brain-surface shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-brain-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <div className="text-sm font-semibold text-brain-text">로봇 튜터</div>
            <div className="flex items-center gap-1 text-[11px]">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  robot?.online ? "bg-green-500" : "bg-brain-text-soft"
                }`}
              />
              <span className="text-brain-text-muted">
                {robot?.online ? "로봇 연결됨" : "로봇 연결 안 됨"}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-brain-text-muted hover:text-brain-text"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      {/* Message list */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="py-8 text-center text-sm text-brain-text-muted">
            무엇이든 물어보세요. 지금까지 학습한 레슨을 참고해 답합니다.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex min-w-0 gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div
              className={`mt-1 h-fit shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                m.role === "assistant"
                  ? "bg-brain-accent text-white"
                  : "border border-brain-border bg-brain-surface-soft text-brain-text-muted"
              }`}
            >
              {m.role === "assistant" ? "🤖" : "나"}
            </div>
            <div
              className={`min-w-0 max-w-[85%] whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "assistant"
                  ? "border border-brain-border bg-brain-surface text-brain-text"
                  : "border border-brain-border bg-brain-accent-soft text-brain-text"
              }`}
            >
              {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="mt-1 h-fit shrink-0 rounded-full bg-brain-accent px-1.5 py-0.5 text-xs font-medium text-white">
              🤖
            </div>
            <div className="rounded-xl border border-brain-border bg-brain-surface px-3 py-2">
              <span className="inline-flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-brain-text-muted"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 액션 — 내 구조 분석 / 로봇 화면 캡처 */}
      {(hasStructure || robot) && (
        <div className="flex flex-col gap-1.5 border-t border-brain-border px-3 pt-2">
          {hasStructure && (
            <button
              onClick={analyzeStructure}
              disabled={loading}
              className="w-full rounded-lg border border-brain-accent bg-brain-accent-soft px-3 py-2 text-sm font-medium text-brain-accent transition-opacity hover:opacity-90 disabled:opacity-40"
              title="내가 그린 구조와 설명을 로봇 튜터가 분석해 조언합니다"
            >
              🧩 내 구조 · 설명 분석 요청
            </button>
          )}
          <button
            onClick={captureViaRobot}
            disabled={loading || !robot?.online}
            className="w-full rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm font-medium text-brain-text transition-opacity hover:opacity-90 disabled:opacity-40"
            title={
              robot?.online
                ? "로봇이 지금 사진을 찍고 그 자리에서 설명한 뒤, 같은 장면을 여기로 가져와 조언합니다"
                : "로봇이 연결되어 있지 않아 캡처를 요청할 수 없습니다"
            }
          >
            🤖📸 로봇에게 지금 보게 하기
          </button>
          <button
            onClick={pullRobotScreen}
            disabled={loading || !robot?.online}
            className="w-full rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm font-medium text-brain-text transition-opacity hover:opacity-90 disabled:opacity-40"
            title={
              robot?.online
                ? "로봇이 마지막으로 본 화면을 가져와 분석합니다"
                : "로봇이 연결되어 있지 않아 화면을 가져올 수 없습니다"
            }
          >
            📷 로봇 화면 캡처 · 분석
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 border-t border-brain-border p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
          placeholder="로봇 튜터에게 물어보세요... (Ctrl+Enter 전송 · 🎤 음성)"
          rows={2}
          className="flex-1 resize-none rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text placeholder-brain-text-soft focus:border-brain-accent focus:outline-none"
        />
        <div className="flex flex-col gap-1.5 self-end">
          <MicButton onText={(t) => setInput((v) => (v ? `${v} ${t}` : t))} />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-brain-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
