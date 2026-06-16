import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import type { ChatMessage } from "../types";
import { api } from "../../v2-shell/api";
import type { CanvasJson } from "../../v2-shell/api";

// 경량 마크다운 렌더 — **굵게**, `코드`, ## 헤딩, > 인용, --- 구분선, 줄바꿈.
// 외부 라이브러리 없이 채팅 답변용 최소 서식만 처리.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // **bold** 와 `code` 를 토큰 분리
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter((p) => p !== "");
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={keyPrefix + i}>{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith("`") && p.endsWith("`")) {
      return (
        <code key={keyPrefix + i} className="rounded bg-brain-surface-soft px-1 py-0.5 text-[12px] font-mono">
          {p.slice(1, -1)}
        </code>
      );
    }
    return <span key={keyPrefix + i}>{p}</span>;
  });
}

function renderMarkdown(text: string): ReactNode[] {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t === "---" || t === "***") {
      out.push(<hr key={i} className="my-2 border-brain-border" />);
      return;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(t);
    if (h) {
      out.push(
        <div key={i} className="font-semibold text-brain-text mt-1.5 mb-0.5">
          {renderInline(h[2], `h${i}-`)}
        </div>,
      );
      return;
    }
    if (line.startsWith("> ")) {
      out.push(
        <div key={i} className="border-l-2 border-brain-accent/60 pl-2 my-1 text-brain-text-muted">
          {renderInline(line.slice(2), `q${i}-`)}
        </div>,
      );
      return;
    }
    const li = /^\s*[-*]\s+(.*)$/.exec(line);
    if (li) {
      out.push(
        <div key={i} className="flex gap-1.5 pl-1">
          <span className="text-brain-accent shrink-0">·</span>
          <span>{renderInline(li[1], `li${i}-`)}</span>
        </div>,
      );
      return;
    }
    if (t === "") {
      out.push(<div key={i} className="h-2" />);
      return;
    }
    out.push(<div key={i}>{renderInline(line, `p${i}-`)}</div>);
  });
  return out;
}

interface Props {
  sessionId: string;
  lessonId: string;
  messages: ChatMessage[];
  onMessage: (msg: ChatMessage) => void;
  onIterate: () => void;
  stagePrefix: string; // "[1부 시각화 설명]" etc.
  canvasSnapshot?: CanvasJson | null;
  placeholder?: string;
  /** nonce 가 바뀌면 text 를 자동 전송 (작성한 설명을 바로 피드백) */
  autoSubmit?: { text: string; nonce: number };
}

export function AICoach({
  sessionId,
  lessonId,
  messages,
  onMessage,
  onIterate,
  stagePrefix,
  canvasSnapshot,
  placeholder,
  autoSubmit,
}: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  loadingRef.current = loading;
  const lastNonce = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loadingRef.current) return;
    if (override === undefined) setInput("");
    const userMsg: ChatMessage = { role: "user", content: `${stagePrefix}\n\n${text}` };
    onMessage(userMsg);
    onIterate();
    setLoading(true);
    try {
      const res = await api.chat(
        sessionId,
        lessonId,
        userMsg.content,
        canvasSnapshot ?? null,
        null,
        null
      );
      onMessage({ role: "assistant", content: res.content, messageId: res.id });
    } catch (e) {
      onMessage({
        role: "assistant",
        content: `⚠️ 피드백을 불러오지 못했습니다. (${e instanceof Error ? e.message : "오류"})`,
      });
    } finally {
      setLoading(false);
    }
  };

  // 작성한 설명 자동 전송 — AI 피드백 버튼이 nonce 를 올리면 1회 발화
  useEffect(() => {
    if (autoSubmit && autoSubmit.nonce !== lastNonce.current && autoSubmit.text.trim()) {
      lastNonce.current = autoSubmit.nonce;
      void send(autoSubmit.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit]);

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-brain-text-muted text-sm py-8">
            작업 내용을 입력하고 AI 코치에게 피드백을 받아보세요.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`text-xs px-1.5 py-0.5 rounded-full h-fit mt-1 shrink-0 font-medium ${
                m.role === "assistant"
                  ? "bg-brain-accent text-white"
                  : "bg-brain-surface-soft text-brain-text-muted border border-brain-border"
              }`}
            >
              {m.role === "assistant" ? "AI" : "나"}
            </div>
            <div
              className={`max-w-[85%] text-sm rounded-xl px-3 py-2 leading-relaxed ${
                m.role === "assistant"
                  ? "bg-brain-surface border border-brain-border text-brain-text"
                  : "bg-brain-accent-soft text-brain-text border border-brain-border whitespace-pre-wrap"
              }`}
            >
              {m.role === "assistant"
                ? renderMarkdown(m.content.replace(/^\[.*?\]\n\n/, ""))
                : m.content.replace(/^\[.*?\]\n\n/, "")}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="text-xs px-1.5 py-0.5 rounded-full h-fit mt-1 bg-brain-accent text-white font-medium shrink-0">
              AI
            </div>
            <div className="bg-brain-surface border border-brain-border rounded-xl px-3 py-2">
              <span className="inline-flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-brain-text-muted rounded-full animate-bounce"
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
      <div className="border-t border-brain-border p-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
          placeholder={placeholder ?? "다이어그램 설명을 입력하세요... (Ctrl+Enter 전송)"}
          rows={3}
          className="flex-1 resize-none text-sm rounded-lg border border-brain-border bg-brain-surface px-3 py-2 focus:outline-none focus:border-brain-accent text-brain-text placeholder-brain-text-soft"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="self-end px-4 py-2 rounded-lg bg-brain-accent text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          전송
        </button>
      </div>
    </div>
  );
}
