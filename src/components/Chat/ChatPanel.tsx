import { useState, useRef, useEffect } from "react"
import { useChatStore } from "../../store/useChatStore"
import type { AIProvider } from "../../store/useChatStore"
import { useStore } from "../../store/useStore"
import { usePracticeStore } from "../../store/usePracticeStore"

const PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: "Claude",
  openai: "GPT",
  gemini: "Gemini",
}

function buildContext() {
  const { currentMap } = useStore.getState()
  const { userNodes, userEdges } = usePracticeStore.getState()

  const nodeMap = new Map(userNodes.map((n) => [n.id, n.concept]))

  return {
    textSource: {
      title: currentMap.textSource.title,
      author: currentMap.textSource.author,
      field: currentMap.textSource.field,
    },
    userNodes: userNodes.map((n) => ({
      concept: n.concept,
      type: n.type,
    })),
    userEdges: userEdges.map((e) => ({
      fromConcept: nodeMap.get(e.from) ?? e.from,
      toConcept: nodeMap.get(e.to) ?? e.to,
      label: e.label,
    })),
    systemNodes: currentMap.nodes.map((n) => ({
      concept: n.concept,
      type: n.type,
    })),
  }
}

async function sendChat(
  userContent: string,
  provider: AIProvider,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
) {
  const { messages } = useChatStore.getState()
  const apiMessages = messages
    .filter((m) => m.content.length > 0)
    .map((m) => ({ role: m.role, content: m.content }))
  apiMessages.push({ role: "user" as const, content: userContent })

  const context = buildContext()

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages, context, provider }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "서버 오류" }))
      onError(err.error || `HTTP ${res.status}`)
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      onError("스트림을 열 수 없습니다")
      return
    }

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        const payload = line.slice(6).trim()
        if (payload === "[DONE]") {
          onDone()
          return
        }
        try {
          const data = JSON.parse(payload)
          if (data.error) {
            onError(data.error)
            return
          }
          if (data.text) onChunk(data.text)
        } catch {
          // skip malformed line
        }
      }
    }

    onDone()
  } catch (err) {
    onError(err instanceof Error ? err.message : "네트워크 오류")
  }
}

export default function ChatPanel() {
  const { messages, isStreaming, isOpen, provider, availableProviders, setOpen, setProvider, setAvailableProviders } = useChatStore()
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => {
        if (data.available?.length > 0) {
          setAvailableProviders(data.available)
          if (data.active && data.available.includes(data.active)) {
            setProvider(data.active)
          }
        }
      })
      .catch(() => {})
  }, [setAvailableProviders, setProvider])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return

    useChatStore.getState().addUserMessage(text)
    useChatStore.getState().startStreaming()
    setInput("")

    sendChat(
      text,
      provider,
      (chunk) => useChatStore.getState().appendToLastAssistant(chunk),
      () => useChatStore.getState().finishStreaming(),
      (err) => {
        useChatStore.getState().appendToLastAssistant(`\n\n⚠️ ${err}`)
        useChatStore.getState().finishStreaming()
      },
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all z-50"
        style={{
          backgroundColor: "var(--color-brain-accent)",
          color: "#fff",
          boxShadow: "0 4px 16px rgba(184, 92, 63, 0.3)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)"
        }}
        title="AI 튜터와 대화"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-6 right-6 flex flex-col rounded-2xl border overflow-hidden z-50"
      style={{
        width: 400,
        height: 560,
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
            className="w-8 h-8 rounded-full flex items-center justify-center text-[13px]"
            style={{
              backgroundColor: "var(--color-brain-accent)",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            AI
          </div>
          <div>
            <p
              className="text-[14px] leading-tight"
              style={{
                color: "var(--color-brain-text)",
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
              }}
            >
              Brain180 튜터
            </p>
            {/* Provider selector */}
            {availableProviders.length > 1 ? (
              <div className="flex items-center gap-1 mt-0.5">
                {availableProviders.map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className="px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-all"
                    style={{
                      backgroundColor:
                        provider === p
                          ? "var(--color-brain-accent)"
                          : "transparent",
                      color:
                        provider === p
                          ? "#fff"
                          : "var(--color-brain-text-soft)",
                      fontWeight: provider === p ? 600 : 400,
                    }}
                  >
                    {PROVIDER_LABELS[p]}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: "var(--color-brain-text-soft)" }}>
                {PROVIDER_LABELS[provider]} · 결과물 기반 대화
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => useChatStore.getState().clearMessages()}
            className="px-2 py-1 rounded text-[11px] cursor-pointer transition-colors"
            style={{ color: "var(--color-brain-text-soft)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--color-brain-surface)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
            title="대화 초기화"
          >
            초기화
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--color-brain-text-soft)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--color-brain-surface)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ backgroundColor: "var(--color-brain-bg)" }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "var(--color-brain-accent-soft)",
                color: "var(--color-brain-accent)",
                fontSize: "20px",
              }}
            >
              🧠
            </div>
            <p
              className="text-[14px] leading-relaxed"
              style={{
                color: "var(--color-brain-text-muted)",
                fontFamily: "var(--font-serif)",
              }}
            >
              다이어그램을 만든 후,<br />
              AI 튜터에게 질문해 보세요.
            </p>
            <div className="space-y-1.5 w-full mt-2">
              {[
                "내가 만든 다이어그램 어때?",
                "놓친 개념이 있을까?",
                "저자의 핵심 사고 흐름이 뭐야?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q)
                    inputRef.current?.focus()
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-colors"
                  style={{
                    backgroundColor: "var(--color-brain-surface)",
                    color: "var(--color-brain-text-muted)",
                    border: "1px solid var(--color-brain-border)",
                    fontFamily: "var(--font-serif)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor =
                      "var(--color-brain-border-strong)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor =
                      "var(--color-brain-border)")
                  }
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap"
              style={
                msg.role === "user"
                  ? {
                      backgroundColor: "var(--color-brain-accent)",
                      color: "#fff",
                      borderBottomRightRadius: "6px",
                      fontFamily: "var(--font-sans)",
                    }
                  : {
                      backgroundColor: "var(--color-brain-surface)",
                      color: "var(--color-brain-text)",
                      border: "1px solid var(--color-brain-border)",
                      borderBottomLeftRadius: "6px",
                      fontFamily: "var(--font-serif)",
                    }
              }
            >
              {msg.content || (
                <span
                  className="inline-block w-1.5 h-4 animate-pulse"
                  style={{ backgroundColor: "var(--color-brain-text-soft)" }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: "var(--color-brain-border)" }}
      >
        <div
          className="flex items-end gap-2 rounded-xl border px-3 py-2"
          style={{
            backgroundColor: "var(--color-brain-surface-soft)",
            borderColor: "var(--color-brain-border)",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="질문을 입력하세요..."
            rows={1}
            className="flex-1 resize-none bg-transparent outline-none text-[14px]"
            style={{
              color: "var(--color-brain-text)",
              fontFamily: "var(--font-sans)",
              maxHeight: 100,
            }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = "auto"
              el.style.height = Math.min(el.scrollHeight, 100) + "px"
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all"
            style={{
              backgroundColor:
                input.trim() && !isStreaming
                  ? "var(--color-brain-accent)"
                  : "var(--color-brain-border)",
              color: "#fff",
              opacity: input.trim() && !isStreaming ? 1 : 0.5,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] mt-1.5 text-center" style={{ color: "var(--color-brain-text-soft)" }}>
          Shift+Enter로 줄바꿈 · Enter로 전송
        </p>
      </div>
    </div>
  )
}
