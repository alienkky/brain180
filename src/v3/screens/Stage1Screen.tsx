import { useState } from "react";
import { useProtocolStore } from "../store/useProtocolStore";
import { NodeCanvas } from "../components/NodeCanvas";
import { AICoach } from "../components/AICoach";
import { TextBlockSelector } from "../components/TextBlockSelector";
import type { BlockWord } from "../types";
import { toCanvasJson, STAGE_DESCRIPTIONS } from "../types";

type Tab = "blocks" | "canvas" | "describe";

const TAB_LABELS: Record<Tab, string> = {
  blocks: "① 블록 추출",
  canvas: "② 시각화",
  describe: "③ 설명",
};

export function Stage1Screen({ onNext }: { onNext: () => void }) {
  const session = useProtocolStore((s) => s.session)!;
  const stage = session.stage1;
  const { setBlocks, setStage1Canvas, setStage1Description, addMessage, incrementIteration, markStageDone } =
    useProtocolStore();

  const [tab, setTab] = useState<Tab>("blocks");
  const [showAI, setShowAI] = useState(false);
  // 칩 클릭 시 본문에서 강조할 블록 id
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);

  const handleAddBlock = (block: BlockWord) => {
    // 같은 위치를 덮는 기존 블록이 있으면 추가하지 않음 (중복 방지)
    const overlaps = stage.blocks.some(
      (b) =>
        b.charStart !== undefined &&
        b.charEnd !== undefined &&
        block.charStart !== undefined &&
        block.charEnd !== undefined &&
        b.charStart < block.charEnd &&
        b.charEnd > block.charStart
    );
    if (overlaps) return;
    setBlocks([...stage.blocks, block]);
  };

  const handleRemoveBlock = (id: string) => {
    setBlocks(stage.blocks.filter((b) => b.id !== id));
  };

  const wordBank = stage.blocks.map((b) => b.text);
  const canvasSnapshot = toCanvasJson(stage.nodes, stage.edges);

  const handleFinishStage = () => {
    markStageDone(1);
    onNext();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Description bar */}
      <div className="px-4 py-2 bg-brain-surface-soft border-b border-brain-border text-xs text-brain-text-muted">
        {STAGE_DESCRIPTIONS[1]}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Text panel */}
        <div className="w-[45%] border-r border-brain-border flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-brain-border flex items-center justify-between">
            <span className="text-xs font-semibold text-brain-text-muted uppercase tracking-wide">
              텍스트 · {session.author}
            </span>
            <span className="text-xs text-brain-text-soft">{stage.blocks.length}개 블록 선택됨</span>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <h3 className="font-semibold text-base px-5 pt-3 pb-1 text-brain-text shrink-0">
              {session.lessonTitle}
            </h3>
            <div className="flex-1 overflow-hidden">
              <TextBlockSelector
                body={session.textBody}
                blocks={stage.blocks}
                onAddBlock={handleAddBlock}
                onRemoveBlock={handleRemoveBlock}
                highlightedBlockId={highlightedBlockId}
              />
            </div>
          </div>
        </div>

        {/* Right: Tabs + work area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-brain-border bg-brain-surface">
            {(["blocks", "canvas", "describe"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  tab === t
                    ? "border-brain-accent text-brain-accent"
                    : "border-transparent text-brain-text-muted hover:text-brain-text"
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
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
            {/* Tab content */}
            <div className={`flex flex-col overflow-hidden ${showAI ? "w-[55%] border-r border-brain-border" : "flex-1"}`}>
              {tab === "blocks" && (
                <div className="flex-1 overflow-y-auto p-4">
                  <p className="text-xs text-brain-text-muted mb-3">
                    왼쪽 텍스트에서 핵심 명사·동사를 클릭하여 선택하세요.
                  </p>
                  {stage.blocks.length === 0 ? (
                    <div className="text-center text-brain-text-soft py-10 text-sm">
                      아직 선택된 블록이 없습니다.<br />왼쪽 텍스트에서 단어를 클릭하세요.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {stage.blocks.map((b) => (
                        <div
                          key={b.id}
                          className={`flex items-center gap-1 px-3 py-1.5 bg-brain-surface border rounded-full text-sm text-brain-accent transition-shadow ${
                            highlightedBlockId === b.id
                              ? "border-brain-accent ring-2 ring-brain-highlight/60"
                              : "border-brain-accent/40"
                          }`}
                        >
                          <button
                            onClick={() => setHighlightedBlockId(b.id)}
                            className="cursor-pointer"
                            title="본문에서 위치 보기"
                          >
                            {b.text}
                          </button>
                          <button
                            onClick={() => {
                              setBlocks(stage.blocks.filter((x) => x.id !== b.id));
                              if (highlightedBlockId === b.id) setHighlightedBlockId(null);
                            }}
                            className="text-brain-text-muted hover:text-brain-text text-xs ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setTab("canvas")}
                    disabled={stage.blocks.length === 0}
                    className="mt-6 px-4 py-2 rounded-lg bg-brain-accent text-white text-sm disabled:opacity-40"
                  >
                    시각화 단계로 →
                  </button>
                </div>
              )}

              {tab === "canvas" && (
                <div className="flex-1 overflow-hidden p-3">
                  <NodeCanvas
                    nodes={stage.nodes}
                    edges={stage.edges}
                    onChange={(ns, es) => setStage1Canvas(ns, es)}
                    wordBank={wordBank}
                  />
                  <button
                    onClick={() => setTab("describe")}
                    disabled={stage.nodes.length === 0}
                    className="mt-3 px-4 py-2 rounded-lg bg-brain-accent text-white text-sm disabled:opacity-40"
                  >
                    설명 단계로 →
                  </button>
                </div>
              )}

              {tab === "describe" && (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  <p className="text-xs text-brain-text-muted">
                    만든 다이어그램을 설명하세요. 어떤 구조를 발견했나요?
                  </p>
                  <textarea
                    value={stage.description}
                    onChange={(e) => setStage1Description(e.target.value)}
                    placeholder="이 텍스트의 핵심 구조는..."
                    rows={6}
                    className="flex-1 resize-none text-sm rounded-lg border border-brain-border bg-brain-surface px-3 py-2.5 focus:outline-none focus:border-brain-accent text-brain-text placeholder-brain-text-soft"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAI(true)}
                      disabled={!stage.description.trim()}
                      className="px-4 py-2 rounded-lg bg-brain-surface border border-brain-accent text-brain-accent text-sm disabled:opacity-40 hover:bg-brain-accent-soft"
                    >
                      💬 AI 피드백 받기
                    </button>
                    <button
                      onClick={handleFinishStage}
                      disabled={stage.messages.length === 0}
                      className="px-4 py-2 rounded-lg bg-brain-accent text-white text-sm disabled:opacity-40 hover:opacity-90"
                    >
                      2부로 진행 →
                    </button>
                  </div>
                  {stage.messages.length === 0 && (
                    <p className="text-xs text-brain-text-soft">AI 피드백을 1회 이상 받아야 2부로 진행할 수 있습니다.</p>
                  )}
                </div>
              )}
            </div>

            {/* AI Coach panel */}
            {showAI && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <AICoach
                  sessionId={session.sessionId}
                  lessonId={session.lessonId}
                  messages={stage.messages}
                  onMessage={(msg) => addMessage(1, msg)}
                  onIterate={() => incrementIteration(1)}
                  stagePrefix="[1부 시각화 설명]"
                  canvasSnapshot={canvasSnapshot}
                  placeholder={`다이어그램 설명을 입력하세요...\n\n예: "이 텍스트에서 ○○과 ○○의 관계를 발견했습니다..."`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
