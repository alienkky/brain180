import { create } from "zustand"
import type { CognitiveMap, Perspective } from "../types/cognitive"
import { TEXT_LIBRARY, getMapById } from "../data/texts"
import { usePracticeStore } from "./usePracticeStore"

interface BrainState {
  currentMapId: string
  currentMap: CognitiveMap
  showLibrary: boolean
  perspective: Perspective
  selectedNodeIds: string[]
  selectedSegmentIds: string[]
  hoveredNodeId: string | null
  hoveredSegmentId: string | null
  activeTemporalPhase: number | null

  setPerspective: (p: Perspective) => void
  selectNode: (nodeId: string) => void
  selectSegment: (segmentId: string) => void
  hoverNode: (nodeId: string | null) => void
  hoverSegment: (segmentId: string | null) => void
  setTemporalPhase: (phase: number | null) => void
  clearSelection: () => void
  setCurrentMap: (id: string) => void
  setShowLibrary: (show: boolean) => void
}

export const useStore = create<BrainState>((set, get) => ({
  currentMapId: TEXT_LIBRARY[0].id,
  currentMap: TEXT_LIBRARY[0].map,
  showLibrary: true,
  perspective: "cognitive",
  selectedNodeIds: [],
  selectedSegmentIds: [],
  hoveredNodeId: null,
  hoveredSegmentId: null,
  activeTemporalPhase: null,

  setPerspective: (perspective) => {
    set({
      perspective,
      selectedNodeIds: [],
      selectedSegmentIds: [],
      hoveredNodeId: null,
      hoveredSegmentId: null,
      activeTemporalPhase: null,
    })
  },

  selectNode: (nodeId) => {
    const { currentMap } = get()
    const linkedSegmentIds = currentMap.textSource.segments
      .filter((s) => s.nodeIds.includes(nodeId))
      .map((s) => s.id)
    set({ selectedNodeIds: [nodeId], selectedSegmentIds: linkedSegmentIds })
  },

  selectSegment: (segmentId) => {
    const { currentMap } = get()
    const segment = currentMap.textSource.segments.find(
      (s) => s.id === segmentId
    )
    set({
      selectedSegmentIds: [segmentId],
      selectedNodeIds: segment?.nodeIds ?? [],
    })
  },

  hoverNode: (nodeId) => {
    if (!nodeId) {
      set({ hoveredNodeId: null, hoveredSegmentId: null })
      return
    }
    const { currentMap } = get()
    const linkedSegment = currentMap.textSource.segments.find((s) =>
      s.nodeIds.includes(nodeId)
    )
    set({ hoveredNodeId: nodeId, hoveredSegmentId: linkedSegment?.id ?? null })
  },

  hoverSegment: (segmentId) => {
    if (!segmentId) {
      set({ hoveredSegmentId: null, hoveredNodeId: null })
      return
    }
    const { currentMap } = get()
    const segment = currentMap.textSource.segments.find(
      (s) => s.id === segmentId
    )
    set({
      hoveredSegmentId: segmentId,
      hoveredNodeId: segment?.nodeIds[0] ?? null,
    })
  },

  setTemporalPhase: (phase) => {
    const { currentMap } = get()
    if (phase === null) {
      set({ activeTemporalPhase: null, selectedNodeIds: [], selectedSegmentIds: [] })
      return
    }
    const nodeIds = currentMap.nodes
      .filter((n) => n.temporalPhase === phase)
      .map((n) => n.id)
    const segmentIds = currentMap.textSource.segments
      .filter((s) => s.temporalPhase === phase)
      .map((s) => s.id)
    set({ activeTemporalPhase: phase, selectedNodeIds: nodeIds, selectedSegmentIds: segmentIds })
  },

  clearSelection: () => {
    set({
      selectedNodeIds: [],
      selectedSegmentIds: [],
      hoveredNodeId: null,
      hoveredSegmentId: null,
      activeTemporalPhase: null,
    })
  },

  setCurrentMap: (id) => {
    const map = getMapById(id)
    set({
      currentMapId: id,
      currentMap: map,
      showLibrary: false,
      selectedNodeIds: [],
      selectedSegmentIds: [],
      hoveredNodeId: null,
      hoveredSegmentId: null,
      activeTemporalPhase: null,
    })
    usePracticeStore.getState().clearCanvas()
  },

  setShowLibrary: (show) => set({ showLibrary: show }),
}))
