import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { api } from "../../v2-shell/api";
import type { RobotTutorTurn } from "../../v2-shell/api";
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

interface Props {
  onClose: () => void;
}

export function RobotTutor({ onClose }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  loadingRef.current = loading;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loadingRef.current) return;
    setInput("");
    const history: RobotTutorTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await api.robotTutorChat(text, history);
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

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[min(560px,80vh)] w-[min(380px,calc(100vw-2rem))] flex-col rounded-2xl border border-brain-border bg-brain-surface shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-brain-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <div className="text-sm font-semibold text-brain-text">로봇 튜터</div>
            <div className="text-[11px] text-brain-text-muted">학습한 내용을 바탕으로 조언해요</div>
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
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
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
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "assistant"
                  ? "border border-brain-border bg-brain-surface text-brain-text"
                  : "border border-brain-border bg-brain-accent-soft text-brain-text whitespace-pre-wrap"
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
            onClick={send}
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
