import { create } from "zustand"

export type AIProvider = "claude" | "openai" | "gemini" | "ollama" | "kimi"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  status?: string
}

interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  isOpen: boolean
  provider: AIProvider
  availableProviders: AIProvider[]

  setOpen: (open: boolean) => void
  setProvider: (p: AIProvider) => void
  setAvailableProviders: (ps: AIProvider[]) => void
  addUserMessage: (content: string) => void
  startStreaming: (status?: string) => void
  setLastAssistantStatus: (status: string) => void
  appendToLastAssistant: (text: string) => void
  finishStreaming: () => void
  clearMessages: () => void
}

let msgCounter = 0

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  isOpen: false,
  provider: "claude",
  availableProviders: [],

  setOpen: (open) => set({ isOpen: open }),
  setProvider: (provider) => set({ provider }),
  setAvailableProviders: (availableProviders) => set({ availableProviders }),

  addUserMessage: (content) => {
    const id = `msg-${++msgCounter}`
    set((s) => ({
      messages: [...s.messages, { id, role: "user", content }],
    }))
  },

  startStreaming: (status) => {
    const id = `msg-${++msgCounter}`
    set((s) => ({
      isStreaming: true,
      messages: [...s.messages, { id, role: "assistant", content: "", status }],
    }))
  },

  setLastAssistantStatus: (status) => {
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last?.role === "assistant" && !last.content) {
        msgs[msgs.length - 1] = { ...last, status }
      }
      return { messages: msgs }
    })
  },

  appendToLastAssistant: (text) => {
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last?.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: last.content + text, status: undefined }
      }
      return { messages: msgs }
    })
  },

  finishStreaming: () => set({ isStreaming: false }),

  clearMessages: () => set({ messages: [], isStreaming: false }),
}))
