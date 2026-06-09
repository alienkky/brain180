import { useProtocolStore } from "../store/useProtocolStore";

interface Props {
  onBack: () => void;
}

export function CompletionScreen({ onBack }: Props) {
  const session = useProtocolStore((s) => s.session)!;
  const { clearSession } = useProtocolStore();

  const stageStats = [
    {
      stage: "1부",
      label: "글의 내용 이해하기",
      nodes: session.stage1.nodes.length,
      iterations: session.stage1.iterationCount,
    },
    {
      stage: "2부",
      label: "저자의 인지구조 이해하기",
      nodes: session.stage2.nodes.length,
      iterations: session.stage2.iterationCount,
    },
    {
      stage: "3부",
      label: "저자의 렌즈 내재화",
      chars: session.stage3.description.length,
      iterations: session.stage3.iterationCount,
    },
  ];

  const handleDone = () => {
    clearSession();
    onBack();
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-brain-text mb-2">레슨 완료!</h2>
        <p className="text-sm text-brain-text-muted mb-6">
          <span className="font-medium text-brain-text">{session.author}</span>의{" "}
          <span className="font-medium text-brain-text">{session.lessonTitle}</span>을
          <br />
          3부 코칭 프로토콜로 완주했습니다.
        </p>

        {/* Stage summary */}
        <div className="bg-brain-surface border border-brain-border rounded-xl p-5 mb-6 text-left">
          <h3 className="text-xs font-semibold text-brain-text-muted uppercase tracking-wide mb-4">
            학습 요약
          </h3>
          <div className="space-y-3">
            {stageStats.map((s) => (
              <div key={s.stage} className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-brain-accent mr-2">{s.stage}</span>
                  <span className="text-xs text-brain-text">{s.label}</span>
                </div>
                <div className="text-xs text-brain-text-muted">
                  {"nodes" in s ? `노드 ${s.nodes}개` : `${s.chars}자`}
                  {s.iterations > 0 && ` · AI ${s.iterations}회`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleDone}
            className="px-6 py-2.5 rounded-lg bg-brain-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            대시보드로 →
          </button>
        </div>
      </div>
    </div>
  );
}
