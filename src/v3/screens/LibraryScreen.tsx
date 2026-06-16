import { useEffect, useState } from "react";
import { api } from "../../v2-shell/api";
import type { ModuleDto, LessonDto, TextExcerptDto } from "../../v2-shell/api";
import { useProtocolStore } from "../store/useProtocolStore";
import { toCanvasJson } from "../types";

interface Props {
  onSessionStart: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  philosophy: "철학",
  science: "과학/수학",
  literature: "문학",
  art: "예술/음악",
  economics: "경제/사회",
  eastern: "동양 고전",
};

export function LibraryScreen({ onSessionStart }: Props) {
  const [modules, setModules] = useState<ModuleDto[]>([]);
  const [selectedModule, setSelectedModule] = useState<ModuleDto | null>(null);
  const [lessons, setLessons] = useState<LessonDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const { startSession, resumeLesson, discardSaved } = useProtocolStore();
  const existingSession = useProtocolStore((s) => s.session);
  const savedMap = useProtocolStore((s) => s.saved);

  // 레슨별 진행 상태 — 현재 세션 또는 임시저장에서
  const lessonProgress = (lessonId: string) => {
    const sess =
      existingSession && existingSession.lessonId === lessonId && !existingSession.completedAt
        ? existingSession
        : savedMap[lessonId];
    if (!sess) return null;
    return {
      stage: sess.currentStage,
      done: [sess.stage1.done, sess.stage2.done, sess.stage3.done] as const,
    };
  };

  const selectModule = async (mod: ModuleDto) => {
    setSelectedModule(mod);
    const ls = await api.moduleLessons(mod.id);
    setLessons(ls);
  };

  useEffect(() => {
    api
      .modules()
      .then((ms) => {
        setModules(ms);
        // 첫 라이브러리 자동 선택 — 빈 화면 대신 바로 레슨 목록 표시
        if (ms.length > 0) void selectModule(ms[0]);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // mode: "resume"=이어서, "fresh"=처음부터, "auto"=진행 없으면 새로(기본)
  const startLesson = async (lesson: LessonDto, mode: "resume" | "fresh" | "auto" = "auto") => {
    if (!lesson.text_excerpt_id) {
      alert("이 레슨에 텍스트가 등록되지 않았습니다.");
      return;
    }

    const hasProgress =
      (existingSession?.lessonId === lesson.id && !existingSession.completedAt) ||
      !!savedMap[lesson.id];
    if (mode === "fresh" && hasProgress) {
      if (!window.confirm("진행하던 작업을 저장하고 새로 시작할까요?\n기존 진행은 '최근 학습 기록'에 보관됩니다.")) return;
      // 기존 진행을 DB에 보존 (최근 학습 기록에서 다시 불러올 수 있게)
      const prev =
        existingSession?.lessonId === lesson.id && !existingSession.completedAt
          ? existingSession
          : savedMap[lesson.id];
      if (prev && (prev.stage1.nodes.length > 0 || prev.stage1.blocks.length > 0)) {
        await api
          .putArtifact(
            prev.sessionId,
            {
              ...toCanvasJson(prev.stage1.nodes, prev.stage1.edges),
              blocks: prev.stage1.blocks as unknown as Record<string, unknown>[],
              v3nodes: prev.stage1.nodes as unknown as Record<string, unknown>[],
              v3edges: prev.stage1.edges as unknown as Record<string, unknown>[],
            },
            1,
          )
          .catch(() => {});
      }
    }
    const resume = mode === "resume" || (mode === "auto" && hasProgress);

    setStarting(lesson.id);
    try {
      // 본문/저자/출처는 항상 서버 최신값으로 (관리자 본문 수정 대응)
      const text = (await api.text(lesson.text_excerpt_id)) as TextExcerptDto;
      const freshMeta = {
        author: text.author || selectedModule?.title || "",
        source: text.source || "",
        textBody: text.body || "",
      };

      // ── 이어하기: 새 DB 세션을 만들지 않고 기존 진행을 그대로 재개 ──
      if (resume && hasProgress) {
        if (existingSession?.lessonId === lesson.id && !existingSession.completedAt) {
          // 메모리에 진행 중 — 본문만 최신화하고 그대로 재개 (블록·노드 보존)
          useProtocolStore.setState((s) =>
            s.session ? { session: { ...s.session, ...freshMeta } } : s,
          );
        } else {
          // 임시저장본 복원 — 기존 sessionId 유지(sessionId 미전달), 본문만 최신화
          resumeLesson(lesson.id, freshMeta);
        }
        onSessionStart();
        return;
      }

      // ── 처음부터 / 신규: 새 DB 세션 생성 ──
      const session = await api.startSession(lesson.id, "practice");
      discardSaved(lesson.id);
      startSession(
        { sessionId: session.id, lessonId: lesson.id, lessonTitle: lesson.title, ...freshMeta },
        { restoreSaved: false },
      );
      onSessionStart();
    } catch (e) {
      alert(e instanceof Error ? e.message : "세션을 시작할 수 없습니다.");
    } finally {
      setStarting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-brain-text-muted text-sm">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Module sidebar — 모바일: 상단 가로 스크롤 / 데스크톱: 좌측 세로 */}
      <div className="shrink-0 w-full md:w-56 border-b md:border-b-0 md:border-r border-brain-border bg-brain-surface flex flex-col overflow-hidden">
        <div className="hidden md:block px-4 py-3 border-b border-brain-border">
          <span className="text-xs font-semibold text-brain-text-muted uppercase tracking-wide">라이브러리</span>
        </div>
        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-hidden md:overflow-y-auto py-2 gap-1 md:gap-0 px-2 md:px-0">
          {modules.length === 0 ? (
            <p className="text-xs text-brain-text-soft text-center py-8 w-full">라이브러리 없음</p>
          ) : (
            modules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => selectModule(mod)}
                className={`shrink-0 md:w-full max-w-[60vw] md:max-w-none text-left px-4 py-2.5 md:py-3 text-sm rounded-lg md:rounded-none transition-colors ${
                  selectedModule?.id === mod.id
                    ? "bg-brain-accent-soft text-brain-accent font-medium"
                    : "text-brain-text hover:bg-brain-surface-soft"
                }`}
              >
                <div className="font-medium truncate">{mod.title}</div>
                <div className="text-xs text-brain-text-muted mt-0.5 truncate">
                  {FIELD_LABELS[mod.field] ?? mod.field} · {mod.lesson_count}레슨
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Lesson list */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {!selectedModule ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
            <div className="text-5xl">🧠</div>
            <h3 className="text-base font-semibold text-brain-text">천재의 뇌로 읽기</h3>
            <p className="text-sm text-brain-text-muted max-w-xs leading-relaxed">
              {modules.length > 0
                ? "왼쪽에서 라이브러리를 선택하면 레슨 목록이 나타납니다."
                : "아직 등록된 라이브러리가 없습니다. 관리자 패널에서 라이브러리와 레슨을 추가하세요."}
            </p>
            {modules.length > 0 && (
              <button
                onClick={() => selectModule(modules[0])}
                className="mt-1 px-4 py-2 rounded-lg bg-brain-accent text-white text-sm font-medium hover:opacity-90"
              >
                {modules[0].title} 열기 →
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-brain-border">
              <h2 className="text-base font-semibold text-brain-text">{selectedModule.title}</h2>
              <p className="text-xs text-brain-text-muted mt-0.5">
                {FIELD_LABELS[selectedModule.field] ?? selectedModule.field} · 난이도 {selectedModule.difficulty}/5
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {lessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center gap-2 py-16">
                  <div className="text-4xl">📭</div>
                  <p className="text-sm text-brain-text-soft">
                    이 라이브러리에 아직 레슨이 없습니다.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-4xl mx-auto">
                  {lessons.map((lesson, idx) => {
                    const prog = lessonProgress(lesson.id);
                    return (
                      <div
                        key={lesson.id}
                        className={`bg-brain-surface border rounded-xl p-4 transition-colors ${
                          prog ? "border-brain-accent/60" : "border-brain-border hover:border-brain-accent/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-brain-text-soft">#{idx + 1}</span>
                              <h3 className="text-sm font-semibold text-brain-text truncate">
                                {lesson.title}
                              </h3>
                            </div>
                            {lesson.objectives?.length > 0 && (
                              <ul className="text-xs text-brain-text-muted space-y-0.5 mt-2">
                                {lesson.objectives.slice(0, 2).map((obj, i) => (
                                  <li key={i} className="flex gap-1.5">
                                    <span className="text-brain-accent shrink-0">·</span>
                                    <span className="line-clamp-1">{obj}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {/* 진행 단계 표시 — ①②③ */}
                            {prog && (
                              <div className="mt-2.5 flex items-center gap-1.5">
                                {([1, 2, 3] as const).map((n) => {
                                  const isDone = prog.done[n - 1];
                                  const isCurrent = !isDone && prog.stage === n;
                                  return (
                                    <span
                                      key={n}
                                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                        isDone
                                          ? "bg-brain-accent text-white"
                                          : isCurrent
                                          ? "border-2 border-brain-accent text-brain-accent"
                                          : "bg-brain-border text-brain-text-muted"
                                      }`}
                                    >
                                      {isDone ? "✓" : n}
                                    </span>
                                  );
                                })}
                                <span className="ml-1 text-[11px] text-brain-accent font-medium">
                                  {prog.stage}부 진행 중
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-stretch gap-1.5">
                            {prog ? (
                              <>
                                <button
                                  onClick={() => startLesson(lesson, "resume")}
                                  disabled={starting === lesson.id}
                                  className="px-4 py-2 rounded-lg bg-brain-accent text-white text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                                >
                                  {starting === lesson.id ? "시작 중..." : "이어서 하기 →"}
                                </button>
                                <button
                                  onClick={() => startLesson(lesson, "fresh")}
                                  disabled={starting === lesson.id}
                                  className="px-4 py-1.5 rounded-lg border border-brain-border text-brain-text-muted text-xs font-medium disabled:opacity-50 hover:text-brain-text hover:border-brain-accent/50 transition-colors"
                                >
                                  새로 시작
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startLesson(lesson, "auto")}
                                disabled={starting === lesson.id}
                                className="px-4 py-2 rounded-lg bg-brain-accent text-white text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                              >
                                {starting === lesson.id ? "시작 중..." : "학습 시작"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
