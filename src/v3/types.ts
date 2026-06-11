// Brain180 v3 — 3부 학습 프로토콜 타입 정의

export type V3Screen =
  | "login"
  | "dashboard"
  | "library"
  | "session"
  | "complete";

export type AdminScreen =
  | "dashboard"
  | "users"
  | "content"
  | "ai"
  | "theme"
  | "analytics";

export type ProtocolStage = 1 | 2 | 3;

export interface BlockWord {
  id: string;
  text: string;
  type: "noun" | "verb" | "other";
  selected: boolean;
  /** 본문 내 문자 위치 — 같은 단어가 여러 번 나와도 구분 */
  charStart?: number;
  charEnd?: number;
  /** 토큰 키 목록 (범위 선택 시 여러 개) */
  wordKeys?: string[];
}

export interface V3Node {
  id: string;
  label: string;
  x: number;
  y: number;
  kind?: "concept" | "anchor" | "target" | "lens";
}

export interface V3Edge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  messageId?: string; // for rating
}

export interface StageState {
  blocks: BlockWord[];
  nodes: V3Node[];
  edges: V3Edge[];
  description: string;
  messages: ChatMessage[];
  iterationCount: number;
  done: boolean;
}

export interface V3SessionState {
  sessionId: string;
  lessonId: string;
  lessonTitle: string;
  author: string;
  source: string;
  textBody: string;
  currentStage: ProtocolStage;
  stage1: StageState;
  stage2: StageState;
  stage3: StageState;
  completedAt?: string;
}

export interface V3User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  status: string;
}

// Converts V3Node/Edge → CanvasJson for API
export function toCanvasJson(nodes: V3Node[], edges: V3Edge[]) {
  return {
    version: 1 as const,
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: nodes.map((n) => ({
      id: n.id,
      type: "concept" as const,
      label: n.label,
      x: n.x,
      y: n.y,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      relation: "other" as const,
      label: e.label,
    })),
  };
}

export const STAGE_LABELS: Record<ProtocolStage, string> = {
  1: "1부 · 글의 내용 이해하기",
  2: "2부 · 저자의 인지구조 이해하기",
  3: "3부 · 저자의 렌즈로 자신의 뇌 셋팅",
};

export const STAGE_DESCRIPTIONS: Record<ProtocolStage, string> = {
  1: "텍스트에서 핵심 단어를 추출하고, 구조적으로 시각화한 뒤 설명하세요.",
  2: "저자가 어떤 대상을 어떤 렌즈로 바라봤는지 도표화하고 설명하세요.",
  3: "1부와 2부를 종합하여 한 편의 글을 완성하세요.",
};
