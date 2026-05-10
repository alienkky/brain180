import { create } from "zustand"
import type { CognitiveNode, NodeType, Dimensionality } from "../types/cognitive"

export type CanvasTool = "select" | "connect" | "delete"

export interface UserNode extends CognitiveNode {
  sourceWord: string
}

export interface UserEdge {
  id: string
  from: string
  to: string
  label: string
}

export interface CircledPhrase {
  id: string
  wordKeys: string[]
  text: string
}

interface PracticeState {
  circledPhrases: CircledPhrase[]
  userNodes: UserNode[]
  userEdges: UserEdge[]
  activeTool: CanvasTool
  selectedUserNodeId: string | null
  selectedEdgeId: string | null
  connectSourceId: string | null
  nextNodeType: NodeType
  nextDimensionality: Dimensionality
  nextEdgeLabel: string
  showEvaluation: boolean

  addPhrase: (wordKeys: string[], text: string) => void
  removePhrase: (phraseId: string) => void
  addNode: (word: string) => void
  ensureNode: (word: string) => string
  removeNode: (nodeId: string) => void
  updateNodeType: (nodeId: string, type: NodeType) => void
  updateNodeDimensionality: (nodeId: string, dim: Dimensionality) => void
  addEdge: (from: string, to: string, label?: string) => void
  removeEdge: (edgeId: string) => void
  updateEdgeLabel: (edgeId: string, label: string) => void
  selectEdge: (edgeId: string | null) => void
  setTool: (tool: CanvasTool) => void
  selectUserNode: (nodeId: string | null) => void
  startConnect: (nodeId: string) => void
  finishConnect: (nodeId: string) => void
  setNextNodeType: (type: NodeType) => void
  setNextDimensionality: (dim: Dimensionality) => void
  setNextEdgeLabel: (label: string) => void
  setShowEvaluation: (show: boolean) => void
  clearCanvas: () => void
}

let nodeCounter = 0
let phraseCounter = 0
let edgeCounter = 0

export const usePracticeStore = create<PracticeState>((set, get) => ({
  circledPhrases: [],
  userNodes: [],
  userEdges: [],
  activeTool: "select",
  selectedUserNodeId: null,
  selectedEdgeId: null,
  connectSourceId: null,
  nextNodeType: "anchor",
  nextDimensionality: 2,
  nextEdgeLabel: "",
  showEvaluation: false,

  addPhrase: (wordKeys, text) => {
    const keySet = new Set(wordKeys)
    const id = `phrase-${++phraseCounter}`
    set((state) => ({
      circledPhrases: [
        ...state.circledPhrases.filter(
          (p) => !p.wordKeys.some((k) => keySet.has(k))
        ),
        { id, wordKeys, text },
      ],
    }))
  },

  removePhrase: (phraseId) => {
    set((state) => ({
      circledPhrases: state.circledPhrases.filter((p) => p.id !== phraseId),
    }))
  },

  addNode: (word) => {
    const { nextNodeType, nextDimensionality } = get()
    const id = `user-n-${++nodeCounter}`
    const node: UserNode = {
      id,
      concept: word,
      type: nextNodeType,
      dimensionality: nextDimensionality,
      sourceWord: word,
    }
    set((state) => ({ userNodes: [...state.userNodes, node] }))
  },

  ensureNode: (word) => {
    const existing = get().userNodes.find((n) => n.concept === word)
    if (existing) return existing.id
    const { nextNodeType, nextDimensionality } = get()
    const id = `user-n-${++nodeCounter}`
    set((state) => ({
      userNodes: [...state.userNodes, {
        id, concept: word, type: nextNodeType,
        dimensionality: nextDimensionality, sourceWord: word,
      }],
    }))
    return id
  },

  removeNode: (nodeId) => {
    set((state) => ({
      userNodes: state.userNodes.filter((n) => n.id !== nodeId),
      userEdges: state.userEdges.filter(
        (e) => e.from !== nodeId && e.to !== nodeId
      ),
      selectedUserNodeId:
        state.selectedUserNodeId === nodeId ? null : state.selectedUserNodeId,
    }))
  },

  updateNodeType: (nodeId, type) => {
    set((state) => ({
      userNodes: state.userNodes.map((n) =>
        n.id === nodeId ? { ...n, type } : n
      ),
    }))
  },

  updateNodeDimensionality: (nodeId, dim) => {
    set((state) => ({
      userNodes: state.userNodes.map((n) =>
        n.id === nodeId ? { ...n, dimensionality: dim } : n
      ),
    }))
  },

  addEdge: (from, to, label?) => {
    const { nextEdgeLabel, userEdges } = get()
    const exists = userEdges.some((e) => e.from === from && e.to === to)
    if (exists || from === to) return
    const id = `ue-${++edgeCounter}`
    set((state) => ({
      userEdges: [...state.userEdges, { id, from, to, label: label ?? nextEdgeLabel }],
      selectedEdgeId: id,
    }))
  },

  removeEdge: (edgeId) => {
    set((state) => ({
      userEdges: state.userEdges.filter((e) => e.id !== edgeId),
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
    }))
  },

  updateEdgeLabel: (edgeId, label) => {
    set((state) => ({
      userEdges: state.userEdges.map((e) =>
        e.id === edgeId ? { ...e, label } : e
      ),
    }))
  },

  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedUserNodeId: null }),

  setTool: (tool) => set({ activeTool: tool, connectSourceId: null }),
  selectUserNode: (nodeId) => set({ selectedUserNodeId: nodeId, selectedEdgeId: null }),
  startConnect: (nodeId) => set({ connectSourceId: nodeId }),

  finishConnect: (nodeId) => {
    const { connectSourceId } = get()
    if (connectSourceId && connectSourceId !== nodeId) {
      get().addEdge(connectSourceId, nodeId)
    }
    set({ connectSourceId: null })
  },

  setNextNodeType: (type) => set({ nextNodeType: type }),
  setNextDimensionality: (dim) => set({ nextDimensionality: dim }),
  setNextEdgeLabel: (label) => set({ nextEdgeLabel: label }),
  setShowEvaluation: (show) => set({ showEvaluation: show }),

  clearCanvas: () =>
    set({
      userNodes: [],
      userEdges: [],
      circledPhrases: [],
      selectedUserNodeId: null,
      selectedEdgeId: null,
      connectSourceId: null,
      showEvaluation: false,
    }),
}))
