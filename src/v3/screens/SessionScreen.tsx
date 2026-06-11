import { useProtocolStore } from "../store/useProtocolStore";
import { ProtocolNav } from "../components/ProtocolNav";
import { Stage1Screen } from "./Stage1Screen";
import { Stage2Screen } from "./Stage2Screen";
import { Stage3Screen } from "./Stage3Screen";
import type { ProtocolStage } from "../types";

export function SessionScreen({ onComplete, onExit }: { onComplete: () => void; onExit: () => void }) {
  const session = useProtocolStore((s) => s.session)!;
  const { setStage } = useProtocolStore();

  const stage = session.currentStage;

  const goTo = (s: ProtocolStage) => setStage(s);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-brain-border bg-brain-surface flex items-center gap-3">
        <button
          onClick={onExit}
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
