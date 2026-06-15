import { useState } from "react";
import { useProtocolStore } from "../store/useProtocolStore";
import { NodeCanvas } from "../components/NodeCanvas";
import { AICoach } from "../components/AICoach";
import { SplitPane } from "../components/SplitPane";
import { STAGE_DESCRIPTIONS, toCanvasJson } from "../types";
import { api } from "../../v2-shell/api";

export function Stage3Screen({
  onComplete,
  onBack,
}: {
  onComplete: () => void;
  onBack: () => void;
}) {
  const session = useProtocolStore((s) => s.session)!;
  const stage1 = session.stage1;
  const stage2 = session.stage2;
  const stage3 = session.stage3;
  const { setStage3Writing, addMessage, incrementIteration, markComplete } = useProtocolStore();

  const [showAI, setShowAI] = useState(false);
  const [refTab, setRefTab] = useState<1 | 2>(1);

  const handleComplete = () => {
    // 1부 다이어그램을 아티팩트로 저장 — 대시보드 '최근 학습 기록'에서 다시 불러옴
    if (stage1.nodes.length > 0) {
      api
        .putArtifact(session.sessionId, toCanvasJson(stage1.nodes, stage1.edges), 1)
        .catch(() => {});
    }
    markComplete();
    onComplete();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2 bg-brain-surface-soft border-b border-brain-border text-xs text-brain-text-muted">
        {STAGE_DESCRIPTIONS[3]}
      </div>

      <SplitPane
        storageKey="brain180-v3-split-stage3"
        initial={35}
        left={
          <>
          <div className="flex border-b border-brain-border">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                onClick={() => setRefTab(n)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                  refTab === n
                    ? "border-brain-accent text-brain-accent"
                    : "border-transparent text-brain-text-muted hover:text-brain-text"
                }`}
              >
                {n}부 참고
              </button>
            ))}
          </div>

          {refTab === 1 && (
            <div className="flex-1 flex flex-col overflow-hidden p-3">
              <div className="flex-1 overflow-hidden mb-3">
                {stage1.nodes.length > 0 ? (
                  <NodeCanvas
                    nodes={stage1.nodes}
                    edges={stage1.edges}
                    onChange={() => {}}
                    readOnly
                  />
                ) : (
                  <div className="text-center text-brain-text-soft text-sm py-6">
                    1부 다이어그램 없음
                  </div>
                )}
              </div>
              {stage1.description && (
                <div className="border-t border-brain-border pt-3">
                  <p className="text-xs text-brain-text-muted mb-1">1부 설명</p>
                  <p className="text-xs text-brain-text leading-relaxed overflow-y-auto max-h-32">
                    {stage1.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {refTab === 2 && (
            <div className="flex-1 flex flex-col overflow-hidden p-3">
              <div className="flex-1 overflow-hidden mb-3">
                {stage2.nodes.length > 0 ? (
                  <NodeCanvas
                    nodes={stage2.nodes}
                    edges={stage2.edges}
                    onChange={() => {}}
                    readOnly
                  />
                ) : (
                  <div className="text-center text-brain-text-soft text-sm py-6">
                    2부 다이어그램 없음
                  </div>
                )}
              </div>
              {stage2.description && (
                <div className="border-t border-brain-border pt-3">
                  <p className="text-xs text-brain-text-muted mb-1">2부 설명</p>
                  <p className="text-xs text-brain-text leading-relaxed overflow-y-auto max-h-32">
                    {stage2.description}
                  </p>
                </div>
              )}
            </div>
          )}
          </>
        }
        right={
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-brain-border bg-brain-surface">
            <div className="px-4 py-2.5 text-xs font-medium text-brain-accent border-b-2 border-brain-accent">
              종합 글쓰기
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

          <div className={`flex flex-1 overflow-hidden ${showAI ? "flex-col md:flex-row" : ""}`}>
            {/* Writing area */}
            <div className={`flex flex-col overflow-hidden ${showAI ? "flex-1 min-h-0 md:flex-none md:w-[55%] border-b md:border-b-0 md:border-r border-brain-border" : "flex-1"}`}>
              <div className="flex-1 p-4 flex flex-col gap-3">
                <p className="text-xs text-brain-text-muted">
                  1부와 2부를 종합하여 저자의 렌즈로 바라본 한 편의 글을 완성하세요.
                </p>
                <textarea
                  value={stage3.description}
                  onChange={(e) => setStage3Writing(e.target.value)}
                  placeholder={`저자 ${session.author}의 시각으로 다음을 쓰시오...\n\n1부에서 발견한 구조는...\n2부에서 파악한 저자의 렌즈는...\n이를 종합하면...`}
                  className="flex-1 resize-none text-sm rounded-lg border border-brain-border bg-brain-surface px-4 py-3 focus:outline-none focus:border-brain-accent text-brain-text placeholder-brain-text-soft leading-relaxed"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brain-text-soft">
                    {stage3.description.length > 0
                      ? `${stage3.description.length}자`
                      : ""}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={onBack} className="px-3 py-1.5 rounded-lg border border-brain-border text-brain-text-muted text-sm hover:text-brain-text">
                      ← 2부
                    </button>
                    <button
                      onClick={() => setShowAI(true)}
                      disabled={!stage3.description.trim()}
                      className="px-4 py-1.5 rounded-lg bg-brain-surface border border-brain-accent text-brain-accent text-sm disabled:opacity-40 hover:bg-brain-accent-soft"
                    >
                      💬 AI 피드백
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={stage3.messages.length === 0}
                      className="px-4 py-1.5 rounded-lg bg-brain-accent text-white text-sm disabled:opacity-40 hover:opacity-90"
                    >
                      ✓ 레슨 완료
                    </button>
                  </div>
                </div>
                {stage3.messages.length === 0 && stage3.description && (
                  <p className="text-xs text-brain-text-soft">AI 피드백을 1회 이상 받아야 완료할 수 있습니다.</p>
                )}
              </div>
            </div>

            {/* AI Coach */}
            {showAI && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <AICoach
                  sessionId={session.sessionId}
                  lessonId={session.lessonId}
                  messages={stage3.messages}
                  onMessage={(msg) => addMessage(3, msg)}
                  onIterate={() => incrementIteration(3)}
                  stagePrefix="[3부 종합 글쓰기]"
                  placeholder="완성한 글에 대한 설명을 함께 보내거나, AI에게 질문하세요..."
                />
              </div>
            )}
          </div>
        </div>
        }
      />
    </div>
  );
}
