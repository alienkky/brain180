import { useEffect, useState } from "react";
import { api } from "../../v2-shell/api";
import type { ModuleDto, LessonDto, TextExcerptDto } from "../../v2-shell/api";
import { useProtocolStore } from "../store/useProtocolStore";

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
  const { startSession } = useProtocolStore();
  const existingSession = useProtocolStore((s) => s.session);

  useEffect(() => {
    api.modules().then(setModules).finally(() => setLoading(false));
  }, []);

  const selectModule = async (mod: ModuleDto) => {
    setSelectedModule(mod);
    const ls = await api.moduleLessons(mod.id);
    setLessons(ls);
  };

  const startLesson = async (lesson: LessonDto) => {
    if (!lesson.text_excerpt_id) {
      alert("이 레슨에 텍스트가 등록되지 않았습니다.");
      return;
    }
    if (existingSession && !existingSession.completedAt) {
      const ok = window.confirm(
        `진행 중인 학습(${existingSession.lessonTitle})이 있습니다.\n새 레슨을 시작하면 기존 진행 내용이 사라집니다. 계속할까요?`
      );
      if (!ok) return;
    }
    setStarting(lesson.id);
    try {
      const [session, text] = await Promise.all([
        api.startSession(lesson.id, "practice"),
        api.text(lesson.text_excerpt_id),
      ]);
      startSession({
        sessionId: session.id,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        author: (text as TextExcerptDto).author || selectedModule?.title || "",
        source: (text as TextExcerptDto).source || "",
        textBody: (text as TextExcerptDto).body || "",
      });
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
    <div className="flex h-full overflow-hidden">
      {/* Module sidebar */}
      <div className="w-56 border-r border-brain-border bg-brain-surface flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-brain-border">
          <span className="text-xs font-semibold text-brain-text-muted uppercase tracking-wide">모듈</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {modules.length === 0 ? (
            <p className="text-xs text-brain-text-soft text-center py-8">모듈 없음</p>
          ) : (
            modules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => selectModule(mod)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                  selectedModule?.id === mod.id
                    ? "bg-brain-accent-soft text-brain-accent font-medium"
                    : "text-brain-text hover:bg-brain-surface-soft"
                }`}
              >
                <div className="font-medium truncate">{mod.title}</div>
                <div className="text-xs text-brain-text-muted mt-0.5">
                  {FIELD_LABELS[mod.field] ?? mod.field} · {mod.lesson_count}레슨
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Lesson list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedModule ? (
          <div className="flex-1 flex items-center justify-center text-brain-text-muted text-sm">
            왼쪽에서 모듈을 선택하세요.
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-brain-border">
              <h2 className="text-base font-semibold text-brain-text">{selectedModule.title}</h2>
              <p className="text-xs text-brain-text-muted mt-0.5">
                {FIELD_LABELS[selectedModule.field] ?? selectedModule.field} · 난이도 {selectedModule.difficulty}/5
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {lessons.length === 0 ? (
                <p className="text-sm text-brain-text-soft text-center py-12">
                  이 모듈에 레슨이 없습니다.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-w-2xl">
                  {lessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      className="bg-brain-surface border border-brain-border rounded-xl p-4 hover:border-brain-accent/50 transition-colors"
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
                        </div>
                        <button
                          onClick={() => startLesson(lesson)}
                          disabled={starting === lesson.id}
                          className="shrink-0 px-4 py-2 rounded-lg bg-brain-accent text-white text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                        >
                          {starting === lesson.id ? "시작 중..." : "학습 시작"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
