import { useEffect, useRef } from "react";
import { useProtocolStore } from "../store/useProtocolStore";
import { ProtocolNav } from "../components/ProtocolNav";
import { Stage1Screen } from "./Stage1Screen";
import { Stage2Screen } from "./Stage2Screen";
import { Stage3Screen } from "./Stage3Screen";
import { api } from "../../v2-shell/api";
import { toCanvasJson } from "../types";
import type { ProtocolStage } from "../types";

export function SessionScreen({ onComplete, onExit }: { onComplete: () => void; onExit: () => void }) {
  const session = useProtocolStore((s) => s.session)!;
  const { setStage } = useProtocolStore();

  const stage = session.currentStage;

  const goTo = (s: ProtocolStage) => setStage(s);

  // 진행 중 자동 저장 — 1부 블록/다이어그램이 생기면 DB(canvas_artifacts)에 스냅샷 저장.
  // 멈춰도 '최근 학습 기록'에 남고 다른 기기/재로그인 시 불러올 수 있음.
  const revRef = useRef(0);
  // 가장 최근 저장 대상 — 언마운트(나가기) 시 즉시 flush 용
  const pendingRef = useRef<{ sid: string; canvas: Record<string, unknown> } | null>(null);
  const savePending = () => {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    api.putArtifact(p.sid, p.canvas as never, ++revRef.current).catch(() => {});
  };

  const nodesKey = JSON.stringify(session.stage1.nodes.map((n) => [n.id, n.label, Math.round(n.x), Math.round(n.y)]));
  const edgesKey = JSON.stringify(session.stage1.edges.map((e) => [e.id, e.from, e.to, e.dir]));
  const blocksKey = JSON.stringify(session.stage1.blocks.map((b) => b.id));
  // 진행도(현재 부 + 각 부 완료 여부) — 부 전환·완료 시에도 저장 트리거
  const progressKey = `${session.currentStage}-${session.stage1.done}-${session.stage2.done}-${session.stage3.done}`;
  useEffect(() => {
    if (session.completedAt) return;
    if (session.stage1.nodes.length === 0 && session.stage1.blocks.length === 0) return;
    pendingRef.current = {
      sid: session.sessionId,
      canvas: {
        ...toCanvasJson(session.stage1.nodes, session.stage1.edges),
        blocks: session.stage1.blocks as unknown as Record<string, unknown>[],
        // group·parent·dir 보존을 위해 v3 원본도 함께 저장
        v3nodes: session.stage1.nodes as unknown as Record<string, unknown>[],
        v3edges: session.stage1.edges as unknown as Record<string, unknown>[],
        // 진행도 — 대시보드 '저장된 학습' 카드의 부 단계 표시용
        progress: {
          stage: session.currentStage,
          s1: session.stage1.done,
          s2: session.stage2.done,
          s3: session.stage3.done,
        },
      },
    };
    const t = window.setTimeout(savePending, 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesKey, edgesKey, blocksKey, progressKey, session.sessionId, session.completedAt]);

  // 언마운트(나가기 등) 시 대기 중이던 저장을 즉시 flush — 디바운스 대기 중
  // 화면을 떠나도 마지막 변경이 DB에 반영되도록 보장
  useEffect(() => {
    return () => savePending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-brain-border bg-brain-surface flex items-center gap-3">
        <button
          onClick={() => { savePending(); onExit(); }}
          className="shrink-0 px-3 py-1.5 rounded-lg border border-brain-border text-xs text-brain-text-muted hover:text-brain-text hover:border-brain-accent/50 transition-colors"
          title="진행 내용은 저장됩니다"
        >
          ← 나가기
        </button>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-brain-text truncate">{session.lessonTitle}</span>
          <span className="text-xs text-brain-text-muted truncate">{session.author} · {session.source}</span>
        </div>
      </div>

      {/* Protocol nav */}
      <ProtocolNav
        currentStage={stage}
        stage1Done={session.stage1.done}
        stage2Done={session.stage2.done}
        stage3Done={session.stage3.done}
        onStageClick={goTo}
      />

      {/* Stage content */}
      <div className="flex-1 overflow-hidden">
        {stage === 1 && (
          <Stage1Screen onNext={() => goTo(2)} />
        )}
        {stage === 2 && (
          <Stage2Screen onNext={() => goTo(3)} onBack={() => goTo(1)} />
        )}
        {stage === 3 && (
          <Stage3Screen onComplete={onComplete} onBack={() => goTo(2)} />
        )}
      </div>
    </div>
  );
}
