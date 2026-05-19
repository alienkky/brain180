import { create } from "zustand"

export type AIProvider = "claude" | "openai" | "gemini"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
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
  startStreaming: () => void
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

  startStreaming: () => {
    const id = `msg-${++msgCounter}`
    set((s) => ({
      isStreaming: true,
      messages: [...s.messages, { id, role: "assistant", content: "" }],
    }))
  },

  appendToLastAssistant: (text) => {
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last?.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: last.content + text }
      }
      return { messages: msgs }
    })
  },

  finishStreaming: () => set({ isStreaming: false }),

  clearMessages: () => set({ messages: [], isStreaming: false }),
}))
