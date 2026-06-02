// Owner: 연다리 [통합설계].
//
// v1 의 floating ChatPanel 을 v2 셸에 복원. 학습 화면 우하단에 *AI 튜터*
// 라벨이 붙은 둥근 버튼 — 클릭하면 우하단에서 떠오르는 ~ 400x560 패널.
// 다시 누르면 접힘. 메시지/입력/전송/에러 상태는 PracticeScreen 이 들고
// 있고, 본 컴포넌트는 *표현 전용* (Open/Closed 만 내부 상태).
//
// v1 와의 차이:
//   - 드래그 이동은 일단 제외 (v1 의 draggable 헤더는 v2 의 모바일 반응형
//     레이아웃과 충돌할 가능성). 필요해지면 후속 매듭.
//   - "튜터에게 패턴 제안" 버튼은 캔버스 도구바에 이미 있으므로 중복 배치
//     하지 않음. 본 버블은 *대화 자리* 만 책임.

import { useEffect, useRef, useState } from "react";
import type { CanvasJson, SessionDto, TutorMessageDto } from "./api";

interface Props {
  open: boolean;
  onToggle: () => void;

  session: SessionDto | null;
  messages: TutorMessageDto[];
  error: string | null;
  sending: boolean;
  input: string;
  onInputChange: (next: string) => void;
  onSend: (e: React.FormEvent) => void;
  onAskTutor?: (snapshot: CanvasJson) => void;
  onRateMessage?: (messageId: string, rating: number, feedback?: string) => Promise<void>;
  liveCanvas?: CanvasJson | null;
}

export function TutorBubble({
  open,
  onToggle,
  session,
  messages,
  error,
  sending,
  input,
  onInputChange,
  onSend,
  onAskTutor,
  onRateMessage,
  liveCanvas,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages.length, sending]);

  // 새 응답이 도착했을 때 *닫혀있으면* 살짝 빛나는 신호 — 마지막 메시지의
  // role 이 assistant 이고 그 시점에 closed 면 unread 신호로 본다.
  const lastIsAssistant =
    messages.length > 0 && messages[messages.length - 1]?.role === "assistant";
  const unread = !open && lastIsAssistant && !sending;

  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-soft-3 transition hover:scale-105"
        style={{
          background: "var(--color-brain-accent)",
          color: "white",
        }}
        title="AI 튜터에게 묻기"
      >
        <span className="sr-only">AI 튜터 열기</span>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        {unread && (
          <span
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white"
            style={{ background: "var(--color-brain-highlight)" }}
          />
        )}
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-brain-border bg-brain-surface shadow-soft-3"
      style={{ width: 400, height: 560, maxWidth: "calc(100vw - 24px)", maxHeight: "calc(100vh - 24px)" }}
    >
      <div className="flex items-center justify-between border-b border-brain-border bg-brain-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: "var(--color-brain-accent)", color: "white" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </span>
          <div>
            <p
              className="text-[14px] font-semibold leading-tight"
              style={{ color: "var(--color-brain-text)" }}
            >
              AI 튜터
            </p>
            <p className="text-[10px] text-brain-text-muted">
              {session
                ? `세션 ${session.id.slice(0, 8)}…`
                : "세션 시작 중…"}
            </p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="rounded p-1 text-brain-text-muted hover:bg-brain-surface-soft hover:text-brain-text"
          title="닫기"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-brain-surface-soft px-4 py-3"
      >
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
                "max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-soft-1 " +
                (m.role === "user"
                  ? "ml-auto bg-brain-accent text-white"
                  : "mr-auto bg-brain-surface text-brain-text")
              }
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.model && (
                <div className="mt-1 text-[9.5px] uppercase tracking-wider opacity-60">
                  {m.model} · in {m.input_tokens} / out {m.output_tokens}
                </div>
              )}
              {m.role === "assistant" && onRateMessage && (
                <TutorRatingControls
                  messageId={m.id}
                  onRateMessage={onRateMessage}
                />
              )}
            </li>
          ))}
          {sending && (
            <li className="mr-auto max-w-[60%] rounded-2xl bg-brain-surface px-3 py-2 text-[13px] text-brain-text-muted shadow-soft-1">
              <span className="inline-block animate-pulse">…</span>
            </li>
          )}
        </ul>
      </div>

      {error && (
        <div className="border-t border-brain-danger/40 bg-brain-accent-soft/50 px-3 py-2 text-[12px] text-brain-danger">
          {error}
        </div>
      )}

      <form
        onSubmit={onSend}
        className="flex items-end gap-2 border-t border-brain-border bg-brain-surface p-2"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(e as unknown as React.FormEvent);
            }
          }}
          rows={2}
          disabled={!session || sending}
          placeholder="질문 — Enter 전송, Shift+Enter 줄바꿈"
          className="flex-1 resize-none rounded border border-brain-border bg-brain-bg px-2 py-1.5 text-[13px] outline-none focus:border-brain-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!session || sending || !input.trim()}
          className="rounded bg-brain-accent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {sending ? "…" : "전송"}
        </button>
      </form>

      {onAskTutor && liveCanvas && (
        <div className="border-t border-brain-border bg-brain-surface-soft px-2 py-1.5">
          <button
            onClick={() => onAskTutor(liveCanvas)}
            disabled={!session || sending}
            className="w-full rounded border border-brain-accent/60 px-2 py-1 text-[11px] text-brain-accent hover:bg-brain-accent-soft/40 disabled:opacity-50"
            title="지금 캔버스 스냅샷을 함께 보내 다음 노드를 제안받습니다"
          >
            현재 캔버스로 패턴 제안 받기
          </button>
        </div>
      )}
    </div>
  );
}

function TutorRatingControls({
  messageId,
  onRateMessage,
}: {
  messageId: string;
  onRateMessage: (messageId: string, rating: number, feedback?: string) => Promise<void>;
}) {
  const [rated, setRated] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rate = async (rating: number) => {
    setBusy(true);
    setError(null);
    try {
      await onRateMessage(messageId, rating);
      setRated(rating);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 border-t border-brain-border/60 pt-1">
      <div className="flex items-center gap-1 text-[11px] text-brain-text-muted">
        <span>평가</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy || rated !== null}
            onClick={() => void rate(n)}
            className={
              "rounded px-1 text-[13px] " +
              (rated !== null && n <= rated
                ? "text-brain-highlight"
                : "text-brain-text-muted hover:text-brain-accent")
            }
            title={`${n}점`}
          >
            ★
          </button>
        ))}
        {rated && <span className="ml-1">저장됨</span>}
      </div>
      {error && <div className="mt-1 text-[10px] text-brain-danger">{error}</div>}
    </div>
  );
}
