import { useState, useEffect } from "react"
import { useStore } from "../../store/useStore"
import { usePracticeStore } from "../../store/usePracticeStore"

interface FeedbackEntry {
  id: string
  studentName: string
  textId: string
  textTitle: string
  content: string
  rating: number | null
  createdAt: string
}

export default function FeedbackPanel() {
  const { currentMap, currentMapId } = useStore()
  const { userNodes, userEdges } = usePracticeStore()

  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<"write" | "read">("write")
  const [name, setName] = useState("")
  const [content, setContent] = useState("")
  const [rating, setRating] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [entries, setEntries] = useState<FeedbackEntry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)

  useEffect(() => {
    if (isOpen && tab === "read") {
      setLoadingEntries(true)
      fetch(`/api/feedback?textId=${encodeURIComponent(currentMapId)}`)
        .then((r) => r.json())
        .then((data) => setEntries(Array.isArray(data) ? data : []))
        .catch(() => setEntries([]))
        .finally(() => setLoadingEntries(false))
    }
  }, [isOpen, tab, currentMapId])

  const handleSubmit = async () => {
    if (!content.trim()) return
    setSubmitting(true)

    const nodeMap = new Map(userNodes.map((n) => [n.id, n.concept]))
    const mapSnapshot = {
      nodes: userNodes.map((n) => ({ concept: n.concept, type: n.type })),
      edges: userEdges.map((e) => ({
        from: nodeMap.get(e.from) ?? e.from,
        to: nodeMap.get(e.to) ?? e.to,
        label: e.label,
      })),
    }

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: name.trim() || "익명",
          textId: currentMapId,
          textTitle: currentMap.textSource.title,
          content: content.trim(),
          rating: rating || null,
          cognitiveMap: mapSnapshot.nodes.length > 0 ? mapSnapshot : null,
        }),
      })
      setSubmitted(true)
      setContent("")
      setRating(0)
      setTimeout(() => setSubmitted(false), 3000)
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-6 px-4 py-3 rounded-full flex items-center gap-2 cursor-pointer transition-all z-50"
        style={{
          backgroundColor: "var(--color-brain-sage)",
          color: "#fff",
          boxShadow: "0 4px 16px rgba(110, 143, 130, 0.3)",
          fontFamily: "var(--font-serif)",
          fontSize: "14px",
          fontWeight: 500,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        title="피드백 남기기"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        피드백
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-6 left-6 flex flex-col rounded-2xl border overflow-hidden z-50"
      style={{
        width: 420,
        maxHeight: 520,
        backgroundColor: "var(--color-brain-surface)",
        borderColor: "var(--color-brain-border)",
        boxShadow: "0 16px 48px rgba(42, 36, 29, 0.12), 0 4px 12px rgba(42, 36, 29, 0.06)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{
          borderColor: "var(--color-brain-border)",
          backgroundColor: "var(--color-brain-surface-soft)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[14px]"
            style={{ backgroundColor: "var(--color-brain-sage)", color: "#fff" }}
          >
            ✎
          </div>
          <div>
            <p
              className="text-[14px]"
              style={{ color: "var(--color-brain-text)", fontFamily: "var(--font-serif)", fontWeight: 500 }}
            >
              학생 피드백
            </p>
            <p className="text-[11px]" style={{ color: "var(--color-brain-text-soft)" }}>
              {currentMap.textSource.title}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors"
          style={{ color: "var(--color-brain-text-soft)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-brain-surface)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          ✕
        </button>
      </div>

      {/* Tab */}
      <div className="flex border-b" style={{ borderColor: "var(--color-brain-border)" }}>
        {(["write", "read"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-[13px] cursor-pointer transition-all"
            style={{
              color: tab === t ? "var(--color-brain-text)" : "var(--color-brain-text-soft)",
              fontWeight: tab === t ? 500 : 400,
              borderBottom: tab === t ? "2px solid var(--color-brain-sage)" : "2px solid transparent",
              fontFamily: "var(--font-serif)",
            }}
          >
            {t === "write" ? "피드백 작성" : `보기 (${entries.length})`}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ backgroundColor: "var(--color-brain-bg)" }}>
        {tab === "write" ? (
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label
                className="block text-[11px] uppercase tracking-[0.15em] mb-1.5"
                style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
              >
                이름 (선택)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="익명"
                className="w-full px-3 py-2 rounded-lg text-[14px] outline-none border"
                style={{
                  backgroundColor: "var(--color-brain-surface)",
                  borderColor: "var(--color-brain-border)",
                  color: "var(--color-brain-text)",
                  fontFamily: "var(--font-sans)",
                }}
              />
            </div>

            {/* Rating */}
            <div>
              <label
                className="block text-[11px] uppercase tracking-[0.15em] mb-1.5"
                style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
              >
                이 글의 난이도
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className="w-9 h-9 rounded-lg text-[13px] cursor-pointer transition-all"
                    style={{
                      backgroundColor: rating >= n ? "var(--color-brain-sage)" : "var(--color-brain-surface)",
                      color: rating >= n ? "#fff" : "var(--color-brain-text-soft)",
                      border: `1px solid ${rating >= n ? "var(--color-brain-sage)" : "var(--color-brain-border)"}`,
                      fontWeight: 500,
                    }}
                  >
                    {n}
                  </button>
                ))}
                <span className="flex items-center ml-2 text-[11px]" style={{ color: "var(--color-brain-text-soft)" }}>
                  {rating === 0 ? "" : rating <= 2 ? "쉬움" : rating <= 3 ? "보통" : "어려움"}
                </span>
              </div>
            </div>

            {/* Content */}
            <div>
              <label
                className="block text-[11px] uppercase tracking-[0.15em] mb-1.5"
                style={{ color: "var(--color-brain-text-soft)", fontWeight: 500 }}
              >
                피드백 내용
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="이 글을 읽고 느낀 점, 어려웠던 부분, 인지 구조에 대한 생각을 자유롭게 적어주세요..."
                rows={5}
                className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none border resize-none leading-relaxed"
                style={{
                  backgroundColor: "var(--color-brain-surface)",
                  borderColor: "var(--color-brain-border)",
                  color: "var(--color-brain-text)",
                  fontFamily: "var(--font-serif)",
                }}
              />
            </div>

            {/* Submit */}
            {submitted ? (
              <div
                className="text-center py-3 rounded-lg text-[14px]"
                style={{
                  backgroundColor: "rgba(107, 139, 110, 0.1)",
                  color: "var(--color-brain-success)",
                  fontFamily: "var(--font-serif)",
                  fontWeight: 500,
                }}
              >
                피드백이 제출되었습니다. 감사합니다!
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className="w-full py-2.5 rounded-lg text-[14px] cursor-pointer transition-all"
                style={{
                  backgroundColor: content.trim() && !submitting ? "var(--color-brain-sage)" : "var(--color-brain-border)",
                  color: "#fff",
                  fontFamily: "var(--font-serif)",
                  fontWeight: 500,
                  opacity: content.trim() && !submitting ? 1 : 0.5,
                }}
              >
                {submitting ? "제출 중..." : "피드백 제출"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {loadingEntries ? (
              <p className="text-center py-8 text-[13px]" style={{ color: "var(--color-brain-text-soft)" }}>
                불러오는 중...
              </p>
            ) : entries.length === 0 ? (
              <p
                className="text-center py-8 text-[13px]"
                style={{ color: "var(--color-brain-text-soft)", fontFamily: "var(--font-serif)" }}
              >
                아직 피드백이 없습니다.
              </p>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl p-4 border"
                  style={{
                    backgroundColor: "var(--color-brain-surface)",
                    borderColor: "var(--color-brain-border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[13px]"
                      style={{ color: "var(--color-brain-text)", fontWeight: 500 }}
                    >
                      {entry.studentName}
                    </span>
                    <div className="flex items-center gap-2">
                      {entry.rating && (
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: "var(--color-brain-surface-soft)",
                            color: "var(--color-brain-text-soft)",
                          }}
                        >
                          난이도 {entry.rating}/5
                        </span>
                      )}
                      <span className="text-[11px]" style={{ color: "var(--color-brain-text-soft)" }}>
                        {new Date(entry.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>
                  <p
                    className="text-[13.5px] leading-relaxed whitespace-pre-wrap"
                    style={{ color: "var(--color-brain-text)", fontFamily: "var(--font-serif)" }}
                  >
                    {entry.content}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
