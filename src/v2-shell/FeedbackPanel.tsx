// Owner: 연다리 [통합설계].
//
// v1 FeedbackPanel 의 작성/읽기 두 탭 흐름을 v2 셸로 복원.
// 백엔드: /api/library/lessons/:id/feedback (GET/POST/DELETE)
// 스키마: lesson_feedback 테이블 (migration 0005).

import { useCallback, useEffect, useState } from "react";
import { api, type LessonFeedbackDto } from "./api";

interface Props {
  lessonId: string;
}

type Tab = "write" | "read";

export function FeedbackPanel({ lessonId }: Props) {
  const [tab, setTab] = useState<Tab>("read");
  const [entries, setEntries] = useState<LessonFeedbackDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // write 폼
  const [displayName, setDisplayName] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.lessonFeedback(lessonId);
      setEntries(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (tab === "read") reload();
  }, [tab, reload]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.addLessonFeedback(lessonId, {
        display_name: displayName.trim(),
        content: content.trim(),
        rating,
      });
      setContent("");
      setRating(0);
      setSubmitted(true);
      window.setTimeout(() => {
        setSubmitted(false);
        setTab("read");
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (feedbackId: string) => {
    if (!window.confirm("이 피드백을 삭제할까요?")) return;
    try {
      await api.deleteLessonFeedback(lessonId, feedbackId);
      setEntries((curr) => curr.filter((e) => e.id !== feedbackId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-brain-surface-soft">
      <div className="border-b border-brain-border bg-brain-surface px-6 py-3">
        <p
          className="mb-1 text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
        >
          학습자 피드백
        </p>
        <h3
          className="text-[16px]"
          style={{
            color: "var(--color-brain-text)",
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
          }}
        >
          이 레슨을 함께 본 사람들
        </h3>
      </div>

      <div className="border-b border-brain-border bg-brain-surface px-6 pt-2">
        <div className="flex gap-1">
          <SubTabButton
            active={tab === "read"}
            onClick={() => setTab("read")}
            label={`읽기 ${entries.length > 0 ? `(${entries.length})` : ""}`}
          />
          <SubTabButton
            active={tab === "write"}
            onClick={() => setTab("write")}
            label="쓰기"
          />
        </div>
      </div>

      {error && (
        <div className="border-b border-brain-danger/40 bg-brain-accent-soft/40 px-6 py-2 text-[12px] text-brain-danger">
          {error}
        </div>
      )}

      {tab === "read" && (
        <div className="space-y-3 px-6 py-5">
          {loading && (
            <p className="text-sm text-brain-text-muted">불러오는 중…</p>
          )}
          {!loading && entries.length === 0 && (
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: "rgba(111, 138, 168, 0.06)",
                border: "1px solid rgba(111, 138, 168, 0.18)",
              }}
            >
              <p
                className="text-[13px] leading-relaxed"
                style={{
                  color: "var(--color-brain-text-muted)",
                  fontFamily: "var(--font-serif)",
                }}
              >
                아직 이 레슨에 대한 피드백이 없습니다. 첫 번째 학습자가 되어
                보세요.
              </p>
            </div>
          )}
          {entries.map((e) => (
            <article
              key={e.id}
              className="rounded-lg border border-brain-border bg-brain-surface px-4 py-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[12.5px]"
                    style={{
                      color: "var(--color-brain-text)",
                      fontWeight: 600,
                    }}
                  >
                    {e.display_name}
                  </span>
                  {e.rating > 0 && (
                    <span
                      className="text-[12px]"
                      style={{ color: "var(--color-brain-highlight)" }}
                    >
                      {"★".repeat(e.rating)}
                      <span style={{ color: "var(--color-brain-border)" }}>
                        {"★".repeat(5 - e.rating)}
                      </span>
                    </span>
                  )}
                </div>
                <span
                  className="text-[10.5px]"
                  style={{ color: "var(--color-brain-text-soft)" }}
                >
                  {formatRelative(e.created_at)}
                  {e.is_mine && (
                    <button
                      onClick={() => remove(e.id)}
                      className="ml-2 rounded border border-brain-border px-1.5 py-0.5 text-[10px] text-brain-text-muted hover:border-brain-danger hover:text-brain-danger"
                    >
                      삭제
                    </button>
                  )}
                </span>
              </div>
              <p
                className="text-[13px] leading-relaxed"
                style={{
                  color: "var(--color-brain-text)",
                  fontFamily: "var(--font-serif)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {e.content}
              </p>
              {e.admin_reply && (
                <div className="mt-3 rounded border border-brain-accent/25 bg-brain-accent-soft/40 px-3 py-2">
                  <div className="mb-1 text-[11px] font-semibold text-brain-accent">
                    관리자 답변
                  </div>
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{
                      color: "var(--color-brain-text)",
                      fontFamily: "var(--font-serif)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {e.admin_reply}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {tab === "write" && (
        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <div>
            <label
              className="mb-1 block text-[10px] uppercase tracking-[0.18em]"
              style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
            >
              표시 이름 (선택)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              placeholder="비우면 익명"
              className="w-full rounded border border-brain-border bg-brain-bg px-3 py-2 text-sm outline-none focus:border-brain-accent"
            />
          </div>

          <div>
            <label
              className="mb-1 block text-[10px] uppercase tracking-[0.18em]"
              style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
            >
              평점 (선택)
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? 0 : n)}
                  className="text-[20px] transition"
                  style={{
                    color:
                      n <= rating
                        ? "var(--color-brain-highlight)"
                        : "var(--color-brain-border)",
                  }}
                >
                  ★
                </button>
              ))}
              {rating > 0 && (
                <button
                  type="button"
                  onClick={() => setRating(0)}
                  className="ml-2 text-[11px] text-brain-text-muted hover:text-brain-text"
                >
                  지우기
                </button>
              )}
            </div>
          </div>

          <div>
            <label
              className="mb-1 block text-[10px] uppercase tracking-[0.18em]"
              style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
            >
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="이 레슨을 통해 어떤 사고 패턴을 발견했나요?"
              className="w-full resize-none rounded border border-brain-border bg-brain-bg px-3 py-2 text-sm leading-relaxed outline-none focus:border-brain-accent"
            />
            <p className="mt-1 text-[10.5px] text-brain-text-soft">
              {content.length}/2000
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="rounded bg-brain-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "저장 중…" : submitted ? "✓ 저장됨" : "피드백 남기기"}
            </button>
            <p className="text-[11px] text-brain-text-soft">
              모든 피드백은 다른 학습자에게도 보입니다.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

function SubTabButton({
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
      className="border-b-2 px-3 py-2 text-[13px] transition"
      style={{
        borderColor: active ? "var(--color-brain-accent)" : "transparent",
        color: active
          ? "var(--color-brain-text)"
          : "var(--color-brain-text-muted)",
        fontWeight: active ? 600 : 500,
      }}
    >
      {label}
    </button>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "방금";
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}분 전`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3600_000)}시간 전`;
  if (ms < 30 * 86_400_000) return `${Math.floor(ms / 86_400_000)}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}
