import { create } from "zustand"
import type { CognitiveNode, CognitiveEdge, NodeType, Dimensionality, EdgeRelation } from "../types/cognitive"

export type CanvasTool = "select" | "connect" | "delete"

export interface UserNode extends CognitiveNode {
  x: number
  y: number
  sourceWord: string
}

interface PracticeState {
  circledWords: Set<string>
  userNodes: UserNode[]
  userEdges: CognitiveEdge[]
  activeTool: CanvasTool
  selectedUserNodeId: string | null
  connectSourceId: string | null
  nextNodeType: NodeType
  nextDimensionality: Dimensionality
  nextEdgeRelation: EdgeRelation

  toggleCircle: (wordKey: string) => void
  addNode: (word: string, x: number, y: number) => void
  removeNode: (nodeId: string) => void
  moveNode: (nodeId: string, x: number, y: number) => void
  updateNodeType: (nodeId: string, type: NodeType) => void
  updateNodeDimensionality: (nodeId: string, dim: Dimensionality) => void
  addEdge: (from: string, to: string) => void
  removeEdge: (from: string, to: string) => void
  setTool: (tool: CanvasTool) => void
  selectUserNode: (nodeId: string | null) => void
  startConnect: (nodeId: string) => void
  finishConnect: (nodeId: string) => void
  setNextNodeType: (type: NodeType) => void
  setNextDimensionality: (dim: Dimensionality) => void
  setNextEdgeRelation: (rel: EdgeRelation) => void
  clearCanvas: () => void
}

let nodeCounter = 0

export const usePracticeStore = create<PracticeState>((set, get) => ({
  circledWords: new Set<string>(),
  userNodes: [],
  userEdges: [],
  activeTool: "select",
  selectedUserNodeId: null,
  connectSourceId: null,
  nextNodeType: "anchor",
  nextDimensionality: 2,
  nextEdgeRelation: "causes",

  toggleCircle: (wordKey) => {
    set((state) => {
      const next = new Set(state.circledWords)
      if (next.has(wordKey)) next.delete(wordKey)
      else next.add(wordKey)
      return { circledWords: next }
    })
  },

  addNode: (word, x, y) => {
    const { nextNodeType, nextDimensionality } = get()
    const id = `user-n-${++nodeCounter}`
    const node: UserNode = {
      id,
      concept: word,
      type: nextNodeType,
      dimensionality: nextDimensionality,
      sourceWord: word,
      x,
      y,
    }
    set((state) => ({ userNodes: [...state.userNodes, node] }))
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

  moveNode: (nodeId, x, y) => {
    set((state) => ({
      userNodes: state.userNodes.map((n) =>
        n.id === nodeId ? { ...n, x, y } : n
      ),
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

  addEdge: (from, to) => {
    const { nextEdgeRelation, userEdges } = get()
    const exists = userEdges.some((e) => e.from === from && e.to === to)
    if (exists || from === to) return
    const edge: CognitiveEdge = {
      from,
      to,
      relation: nextEdgeRelation,
      temporalOrder: userEdges.length + 1,
    }
    set((state) => ({ userEdges: [...state.userEdges, edge] }))
  },

  removeEdge: (from, to) => {
    set((state) => ({
      userEdges: state.userEdges.filter(
        (e) => !(e.from === from && e.to === to)
      ),
    }))
  },

  setTool: (tool) => set({ activeTool: tool, connectSourceId: null }),

  selectUserNode: (nodeId) => set({ selectedUserNodeId: nodeId }),

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
  setNextEdgeRelation: (rel) => set({ nextEdgeRelation: rel }),

  clearCanvas: () =>
    set({
      userNodes: [],
      userEdges: [],
      circledWords: new Set(),
      selectedUserNodeId: null,
      connectSourceId: null,
    }),
}))
