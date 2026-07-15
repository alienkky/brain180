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
  | "grading"
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
  kind?: "concept" | "anchor" | "target" | "lens" | "group";
  /** 소속 그룹(컴파운드 부모) 노드 id */
  parent?: string;
}

/** 화살표 방향 — 클릭 순환: forward → both → back → none */
export type EdgeDir = "forward" | "both" | "back" | "none";

export interface V3Edge {
  id: string;
  from: string;
  to: string;
  label?: string;
  dir?: EdgeDir;
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

// Serializes the learner's structure (nodes + directed edges) to compact text
// for the 로봇 튜터, which reads the structure and explanation together and
// advises through the author-lens. Text beats an image here: the in-app graph
// is already structured, so no OCR and no vision key needed.
export function structureToText(nodes: V3Node[], edges: V3Edge[]): string {
  const visible = nodes.filter((n) => n.kind !== "group" && (n.label ?? "").trim() !== "");
  if (visible.length === 0) return "";
  const labelOf = new Map(visible.map((n) => [n.id, n.label]));
  const arrow = (d?: EdgeDir) =>
    d === "both" ? "↔" : d === "back" ? "←" : d === "none" ? "—" : "→";
  const nodeLines = visible.map(
    (n) => `- ${n.label}${n.kind && n.kind !== "concept" ? ` (${n.kind})` : ""}`,
  );
  const edgeLines = edges
    .filter((e) => labelOf.has(e.from) && labelOf.has(e.to))
    .map(
      (e) =>
        `- ${labelOf.get(e.from)} ${arrow(e.dir)} ${labelOf.get(e.to)}${e.label ? ` : ${e.label}` : ""}`,
    );
  return [
    `노드 ${visible.length}개:`,
    ...nodeLines,
    "",
    `연결 ${edgeLines.length}개:`,
    ...(edgeLines.length ? edgeLines : ["- (아직 연결 없음)"]),
  ].join("\n");
}

// Converts V3Node/Edge → CanvasJson for API.
// 그룹(컴파운드 부모) 노드는 라벨이 비어 서버 검증(label.min(1))을 위반하므로
// 제외 — group 정보는 v3nodes 에 별도 보존, AI 코치엔 의미 노드만 전달.
export function toCanvasJson(nodes: V3Node[], edges: V3Edge[]) {
  const visible = nodes.filter((n) => n.kind !== "group" && (n.label ?? "").trim() !== "");
  const ids = new Set(visible.map((n) => n.id));
  return {
    version: 1 as const,
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: visible.map((n) => ({
      id: n.id,
      type: "concept" as const,
      label: n.label,
      x: n.x,
      y: n.y,
    })),
    edges: edges
      .filter((e) => ids.has(e.from) && ids.has(e.to))
      .map((e) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        relation: "other" as const,
        label: e.label,
      })),
  };
}

// v3 세션 전체 상태를 관리자 열람용 스냅샷(jsonb)으로 직렬화.
export function toProtocolSnapshot(session: V3SessionState) {
  const stageSnap = (st: StageState) => ({
    blocks: st.blocks.map((b) => ({ text: b.text, charStart: b.charStart ?? null })),
    nodes: st.nodes,
    edges: st.edges,
    description: st.description,
    iteration_count: st.iterationCount,
    done: st.done,
    message_count: st.messages.length,
  });
  return {
    lesson_id: session.lessonId,
    lesson_title: session.lessonTitle,
    author: session.author,
    current_stage: session.currentStage,
    completed_at: session.completedAt ?? null,
    stage1: stageSnap(session.stage1),
    stage2: stageSnap(session.stage2),
    stage3: stageSnap(session.stage3),
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
