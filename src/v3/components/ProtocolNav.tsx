import type { ProtocolStage } from "../types";
import { STAGE_LABELS } from "../types";

interface Props {
  currentStage: ProtocolStage;
  stage1Done: boolean;
  stage2Done: boolean;
  stage3Done: boolean;
  onStageClick?: (s: ProtocolStage) => void;
}

export function ProtocolNav({
  currentStage,
  stage1Done,
  stage2Done,
  stage3Done,
  onStageClick,
}: Props) {
  const stages: ProtocolStage[] = [1, 2, 3];
  const doneMap: Record<ProtocolStage, boolean> = {
    1: stage1Done,
    2: stage2Done,
    3: stage3Done,
  };

  return (
    <div className="flex items-center gap-0 bg-brain-surface border-b border-brain-border px-4 h-12">
      {stages.map((s, idx) => {
        const isActive = s === currentStage;
        const isDone = doneMap[s];
        const isAccessible = s === 1 || doneMap[(s - 1) as ProtocolStage];
        return (
          <div key={s} className="flex items-center">
            {idx > 0 && (
              <div
                className={`w-8 h-px ${
                  doneMap[(s - 1) as ProtocolStage] ? "bg-brain-accent" : "bg-brain-border"
                }`}
              />
            )}
            <button
              onClick={() => isAccessible && onStageClick?.(s)}
              disabled={!isAccessible}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? "bg-brain-accent text-white"
                  : isDone
                  ? "bg-brain-accent-soft text-brain-accent border border-brain-accent"
                  : isAccessible
                  ? "text-brain-text-muted hover:text-brain-text"
                  : "text-brain-text-soft cursor-not-allowed opacity-50"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isActive
                    ? "bg-white text-brain-accent"
                    : isDone
                    ? "bg-brain-accent text-white"
                    : "bg-brain-border text-brain-text-muted"
                }`}
              >
                {isDone ? "✓" : s}
              </span>
              <span className="hidden sm:inline">{STAGE_LABELS[s]}</span>
              <span className="sm:hidden">{s}부</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
