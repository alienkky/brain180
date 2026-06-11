import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  V3SessionState,
  StageState,
  BlockWord,
  V3Node,
  V3Edge,
  ProtocolStage,
  ChatMessage,
} from "../types";

const emptyStage = (): StageState => ({
  blocks: [],
  nodes: [],
  edges: [],
  description: "",
  messages: [],
  iterationCount: 0,
  done: false,
});

interface ProtocolStore {
  session: V3SessionState | null;
  /** 레슨별 임시저장 — 다른 레슨으로 옮겨도 진행 내용 보존 */
  saved: Record<string, V3SessionState>;

  startSession: (
    params: {
      sessionId: string;
      lessonId: string;
      lessonTitle: string;
      author: string;
      source: string;
      textBody: string;
    },
    opts?: { restoreSaved?: boolean },
  ) => void;
  clearSession: () => void;
  /** 임시저장 삭제 (대시보드 '삭제' 등) */
  discardSaved: (lessonId: string) => void;
  /** 임시저장된 레슨 이어하기 — 서버 호출 없이 복원 */
  resumeLesson: (lessonId: string) => void;
  setStage: (stage: ProtocolStage) => void;

  // Stage 1
  setBlocks: (blocks: BlockWord[]) => void;
  setStage1Canvas: (nodes: V3Node[], edges: V3Edge[]) => void;
  setStage1Description: (text: string) => void;

  // Stage 2
  setStage2Canvas: (nodes: V3Node[], edges: V3Edge[]) => void;
  setStage2Description: (text: string) => void;

  // Stage 3
  setStage3Writing: (text: string) => void;

  // AI messages (all stages)
  addMessage: (stage: ProtocolStage, msg: ChatMessage) => void;
  incrementIteration: (stage: ProtocolStage) => void;
  markStageDone: (stage: ProtocolStage) => void;
  markComplete: () => void;
}

export const useProtocolStore = create<ProtocolStore>()(
  persist(
    (set) => ({
  session: null,
  saved: {},

  startSession: ({ sessionId, lessonId, lessonTitle, author, source, textBody }, opts) =>
    set((s) => {
      // 현재 진행 중 세션은 자동 임시저장 (완료된 건 제외)
      const saved = { ...s.saved };
      if (s.session && !s.session.completedAt && s.session.lessonId !== lessonId) {
        saved[s.session.lessonId] = s.session;
      }
      // 같은 레슨에 임시저장이 있으면 복원 (restoreSaved:false 면 새로 시작)
      const restored = opts?.restoreSaved !== false ? saved[lessonId] : undefined;
      delete saved[lessonId];
      if (restored) {
        return { session: restored, saved };
      }
      return {
        session: {
          sessionId,
          lessonId,
          lessonTitle,
          author,
          source,
          textBody,
          currentStage: 1 as const,
          stage1: emptyStage(),
          stage2: emptyStage(),
          stage3: emptyStage(),
        },
        saved,
      };
    }),

  clearSession: () => set({ session: null }),

  discardSaved: (lessonId) =>
    set((s) => {
      const saved = { ...s.saved };
      delete saved[lessonId];
      return { saved };
    }),

  resumeLesson: (lessonId) =>
    set((s) => {
      const saved = { ...s.saved };
      const target = saved[lessonId];
      if (!target) return s;
      // 현재 진행 중인 다른 레슨은 임시저장으로 보관
      if (s.session && !s.session.completedAt && s.session.lessonId !== lessonId) {
        saved[s.session.lessonId] = s.session;
      }
      delete saved[lessonId];
      return { session: target, saved };
    }),

  setStage: (stage) =>
    set((s) => s.session ? { session: { ...s.session, currentStage: stage } } : s),

  setBlocks: (blocks) =>
    set((s) =>
      s.session
        ? { session: { ...s.session, stage1: { ...s.session.stage1, blocks } } }
        : s
    ),

  setStage1Canvas: (nodes, edges) =>
    set((s) =>
      s.session
        ? { session: { ...s.session, stage1: { ...s.session.stage1, nodes, edges } } }
        : s
    ),

  setStage1Description: (description) =>
    set((s) =>
      s.session
        ? { session: { ...s.session, stage1: { ...s.session.stage1, description } } }
        : s
    ),

  setStage2Canvas: (nodes, edges) =>
    set((s) =>
      s.session
        ? { session: { ...s.session, stage2: { ...s.session.stage2, nodes, edges } } }
        : s
    ),

  setStage2Description: (description) =>
    set((s) =>
      s.session
        ? { session: { ...s.session, stage2: { ...s.session.stage2, description } } }
        : s
    ),

  setStage3Writing: (description) =>
    set((s) =>
      s.session
        ? { session: { ...s.session, stage3: { ...s.session.stage3, description } } }
        : s
    ),

  addMessage: (stage, msg) =>
    set((s) => {
      if (!s.session) return s;
      const key = `stage${stage}` as "stage1" | "stage2" | "stage3";
      const st = s.session[key];
      return {
        session: {
          ...s.session,
          [key]: { ...st, messages: [...st.messages, msg] },
        },
      };
    }),

  incrementIteration: (stage) =>
    set((s) => {
      if (!s.session) return s;
      const key = `stage${stage}` as "stage1" | "stage2" | "stage3";
      const st = s.session[key];
      return {
        session: {
          ...s.session,
          [key]: { ...st, iterationCount: st.iterationCount + 1 },
        },
      };
    }),

  markStageDone: (stage) =>
    set((s) => {
      if (!s.session) return s;
      const key = `stage${stage}` as "stage1" | "stage2" | "stage3";
      const nextStage = stage < 3 ? ((stage + 1) as ProtocolStage) : s.session.currentStage;
      return {
        session: {
          ...s.session,
          [key]: { ...s.session[key], done: true },
          currentStage: nextStage,
        },
      };
    }),

  markComplete: () =>
    set((s) =>
      s.session
        ? {
            session: {
              ...s.session,
              completedAt: new Date().toISOString(),
              stage3: { ...s.session.stage3, done: true },
            },
          }
        : s
    ),
    }),
    {
      name: "brain180-v3-session",
      // 완료된 세션은 복원하지 않음 (새 학습 방해 방지). 레슨별 임시저장은 유지.
      partialize: (s) => ({
        session: s.session && !s.session.completedAt ? s.session : null,
        saved: s.saved,
      }),
    }
  )
);
