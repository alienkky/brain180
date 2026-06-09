import { useState } from "react";
import { useProtocolStore } from "../store/useProtocolStore";
import { NodeCanvas } from "../components/NodeCanvas";
import { AICoach } from "../components/AICoach";
import type { V3Node } from "../types";
import { toCanvasJson, STAGE_DESCRIPTIONS } from "../types";

function makeDefaultStage2Nodes(): V3Node[] {
  return [
    { id: "target_node", label: "대상 (Target)", x: 150, y: 150, kind: "target" },
    { id: "lens_node", label: "렌즈 (Lens)", x: 400, y: 150, kind: "lens" },
  ];
}

export function Stage2Screen({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const session = useProtocolStore((s) => s.session)!;
  const stage1 = session.stage1;
  const stage2 = session.stage2;
  const { setStage2Canvas, setStage2Description, addMessage, incrementIteration, markStageDone } =
    useProtocolStore();

  const [showAI, setShowAI] = useState(false);

  // Init default nodes if empty
  if (stage2.nodes.length === 0) {
    setStage2Canvas(makeDefaultStage2Nodes(), [
      { id: "lens_edge", from: "target_node", to: "lens_node", label: "→ 렌즈로 바라봄" },
    ]);
  }

  const canvasSnapshot = toCanvasJson(stage2.nodes, stage2.edges);

  const handleFinish = () => {
    markStageDone(2);
    onNext();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2 bg-brain-surface-soft border-b border-brain-border text-xs text-brain-text-muted">
        {STAGE_DESCRIPTIONS[2]}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Stage1 reference */}
        <div className="w-[35%] border-r border-brain-border flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-brain-border">
            <span className="text-xs font-semibold text-brain-text-muted uppercase tracking-wide">
              1부 참고 다이어그램
            </span>
          </div>
          <div className="flex-1 overflow-hidden p-3">
            {stage1.nodes.length > 0 ? (
              <NodeCanvas
                nodes={stage1.nodes}
                edges={stage1.edges}
                onChange={() => {}}
                readOnly
              />
            ) : (
              <div className="text-center text-brain-text-soft text-sm py-10">
                1부에서 만든 다이어그램이 여기에 표시됩니다.
              </div>
            )}
          </div>
          {stage1.description && (
            <div className="border-t border-brain-border p-3">
              <p className="text-xs text-brain-text-muted mb-1">1부 설명</p>
              <p className="text-xs text-brain-text leading-relaxed line-clamp-5">
                {stage1.description}
              </p>
            </div>
          )}
        </div>

        {/* Right: Stage2 work */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-brain-border bg-brain-surface">
            <div className="px-4 py-2.5 text-xs font-medium text-brain-accent border-b-2 border-brain-accent">
              대상 + 렌즈 도표화
            </div>
            <div className="flex-1" />
            <button
              onClick={() => setShowAI((v) => !v)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                showAI
                  ? "border-brain-accent text-brain-accent bg-brain-accent-soft"
                  : "border-transparent text-brain-text-muted hover:text-brain-text"
              }`}
            >
              💬 AI 코치
            </button>
          </div>

          <div className={`flex flex-1 overflow-hidden ${showAI ? "flex-row" : ""}`}>
            {/* Canvas + description */}
            <div className={`flex flex-col overflow-hidden ${showAI ? "w-[55%] border-r border-brain-border" : "flex-1"}`}>
              <div className="flex-1 overflow-hidden p-3">
                <p className="text-xs text-brain-text-muted mb-2">
                  "대상" 노드와 "렌즈" 노드 이름을 더블클릭하여 수정하고, 저자의 관점을 추가 노드로 표현하세요.
                </p>
                <div className="h-[calc(100%-2rem)]">
                  <NodeCanvas
                    nodes={stage2.nodes}
                    edges={stage2.edges}
                    onChange={(ns, es) => setStage2Canvas(ns, es)}
                  />
                </div>
              </div>
              <div className="border-t border-brain-border p-3 flex flex-col gap-2">
                <label className="text-xs font-medium text-brain-text-muted">
                  저자의 렌즈 설명 (글 또는 음성)
                </label>
                <textarea
                  value={stage2.description}
                  onChange={(e) => setStage2Description(e.target.value)}
                  placeholder="이 저자는 [대상]을 [렌즈]로 바라보았기 때문에..."
                  rows={4}
                  className="resize-none text-sm rounded-lg border border-brain-border bg-brain-surface px-3 py-2.5 focus:outline-none focus:border-brain-accent text-brain-text placeholder-brain-text-soft"
                />
                <div className="flex gap-2">
                  <button onClick={onBack} className="px-3 py-1.5 rounded-lg border border-brain-border text-brain-text-muted text-sm hover:text-brain-text">
                    ← 1부
                  </button>
                  <button
                    onClick={() => setShowAI(true)}
                    disabled={!stage2.description.trim()}
                    className="px-4 py-1.5 rounded-lg bg-brain-surface border border-brain-accent text-brain-accent text-sm disabled:opacity-40 hover:bg-brain-accent-soft"
                  >
                    💬 AI 피드백
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={stage2.messages.length === 0}
                    className="px-4 py-1.5 rounded-lg bg-brain-accent text-white text-sm disabled:opacity-40 hover:opacity-90 ml-auto"
                  >
                    3부로 진행 →
                  </button>
                </div>
                {stage2.messages.length === 0 && stage2.description && (
                  <p className="text-xs text-brain-text-soft">AI 피드백을 1회 이상 받아야 3부로 진행할 수 있습니다.</p>
                )}
              </div>
            </div>

            {/* AI Coach */}
            {showAI && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <AICoach
                  sessionId={session.sessionId}
                  lessonId={session.lessonId}
                  messages={stage2.messages}
                  onMessage={(msg) => addMessage(2, msg)}
                  onIterate={() => incrementIteration(2)}
                  stagePrefix="[2부 인지구조 설명]"
                  canvasSnapshot={canvasSnapshot}
                  placeholder="저자가 어떤 대상을 어떤 렌즈로 보았는지 설명하세요..."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
