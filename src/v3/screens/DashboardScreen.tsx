import { useEffect, useState } from "react";
import { api } from "../../v2-shell/api";
import type { ArtifactGalleryDto, ProgressEntryDto, TextExcerptDto } from "../../v2-shell/api";
import { useProtocolStore } from "../store/useProtocolStore";
import type { V3User, V3Node, V3Edge, BlockWord } from "../types";

interface Props {
  user: V3User;
  onGoLibrary: () => void;
  onResume: () => void;
}

export function DashboardScreen({ user, onGoLibrary, onResume }: Props) {
  const session = useProtocolStore((s) => s.session);
  const savedMap = useProtocolStore((s) => s.saved);
  const { clearSession, startSession, setStage1Canvas, setBlocks, resumeLesson, discardSaved } = useProtocolStore();
  const [loadingArtifact, setLoadingArtifact] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [progress, setProgress] = useState<ProgressEntryDto[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactGalleryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    Promise.all([api.progress(), api.artifacts()])
      .then(([p, a]) => { setProgress(p); setArtifacts(a); setChecked(new Set()); })
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteChecked = async () => {
    if (checked.size === 0) return;
    if (!window.confirm(`선택한 학습 기록 ${checked.size}개를 삭제할까요?`)) return;
    setBulkBusy(true);
    try {
      // 선택된 기록 중 현재 진행 세션이 있으면 메모리 정리
      const sel = artifacts.filter((a) => checked.has(a.artifact_id));
      if (session && sel.some((a) => a.session_id === session.sessionId)) {
        discardSaved(session.lessonId);
        clearSession();
      }
      await api.deleteArtifacts([...checked]);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBulkBusy(false);
    }
  };

  // 시도별 진도 — 메모리/임시저장(같은 session_id) 우선, 없으면 DB 저장 progress.
  // 반환: 현재 부 + 각 부 완료 여부(① ② ③ 표시용). active=진행 중(메모리/saved).
  const progressFor = (a: ArtifactGalleryDto) => {
    const live =
      session && session.sessionId === a.session_id && !session.completedAt
        ? session
        : savedMap[a.lesson.id]?.sessionId === a.session_id
        ? savedMap[a.lesson.id]
        : null;
    if (live) {
      return {
        active: true,
        stage: live.currentStage,
        done: [live.stage1.done, live.stage2.done, live.stage3.done] as boolean[],
      };
    }
    if (a.progress) {
      return {
        active: false,
        stage: a.progress.stage,
        done: [a.progress.s1, a.progress.s2, a.progress.s3] as boolean[],
      };
    }
    return null;
  };

  // 저장된 학습 기록 불러오기 → 이어하기.
  // 같은 기기에 임시저장이 있으면 완전 복원(단계/설명/메시지),
  // 없으면 DB 의 1부 다이어그램만 복원.
  const loadArtifact = async (a: ArtifactGalleryDto) => {
    if (loadingArtifact) return;
    // 바로 이 세션이 메모리에 진행 중이면 그대로 재개 (블록·설명 등 보존)
    if (session && !session.completedAt && session.sessionId === a.session_id) {
      onResume();
      return;
    }
    // 다른 진행 중 세션이 있으면 확인 (자동저장되므로 손실 없음)
    if (session && !session.completedAt && session.sessionId !== a.session_id) {
      const ok = window.confirm(
        `진행 중인 학습(${session.lessonTitle})이 있습니다.\n이 기록을 불러올까요? (현재 진행은 자동 저장됩니다)`
      );
      if (!ok) return;
    }
    if (!a.lesson.text_excerpt_id) {
      alert("이 레슨의 텍스트를 찾을 수 없어 불러올 수 없습니다.");
      return;
    }
    setLoadingArtifact(a.artifact_id);
    try {
      // 새 세션을 만들지 않고 그 기록의 session_id 를 재사용 → 이어 작업 시
      // 새 카드가 쌓이지 않고 같은 기록에 덮어쓰기됨
      const [artifact, text] = await Promise.all([
        api.getArtifact(a.session_id),
        api.text(a.lesson.text_excerpt_id),
      ]);
      const t = text as TextExcerptDto;
      const meta = {
        sessionId: a.session_id,
        lessonId: a.lesson.id,
        lessonTitle: a.lesson.title,
        author: t.author || "",
        source: t.source || "",
        textBody: t.body || "",
      };
      // 임시저장이 '바로 이 세션'일 때만 완전 복원, 아니면 그 기록의 DB 내용 복원
      if (savedMap[a.lesson.id]?.sessionId === a.session_id) {
        // 같은 기기 임시저장 — 단계/설명/메시지까지 완전 복원
        resumeLesson(a.lesson.id, meta);
      } else {
        // 다른 시도/기기 기록 — DB 의 1부 캔버스+블록 복원
        startSession(meta, { restoreSaved: false });
        if (artifact) {
          const cj = artifact.canvas_json;
          // v3 원본이 있으면 그대로 복원 (group·parent·dir 보존), 없으면 레거시 변환
          if (Array.isArray(cj.v3nodes) && cj.v3nodes.length > 0) {
            setStage1Canvas(
              cj.v3nodes as unknown as V3Node[],
              (Array.isArray(cj.v3edges) ? cj.v3edges : []) as unknown as V3Edge[],
            );
          } else {
            const ns: V3Node[] = cj.nodes.map((n) => ({
              id: n.id, label: n.label, x: n.x, y: n.y, kind: "concept",
            }));
            const es: V3Edge[] = cj.edges.map((e) => ({
              id: e.id, from: e.from, to: e.to, label: e.label,
            }));
            setStage1Canvas(ns, es);
          }
          const savedBlocks = cj.blocks;
          if (Array.isArray(savedBlocks) && savedBlocks.length > 0) {
            setBlocks(savedBlocks as unknown as BlockWord[]);
          }
        }
      }
      onResume();
    } catch (e) {
      alert(e instanceof Error ? e.message : "기록을 불러올 수 없습니다.");
    } finally {
      setLoadingArtifact(null);
    }
  };

  const deleteArtifact = async (a: ArtifactGalleryDto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`"${a.lesson.title}" 학습 기록을 삭제할까요?`)) return;
    try {
      await api.deleteArtifact(a.artifact_id);
      // 삭제한 시도가 현재 진행 중인 바로 그 세션일 때만 메모리/임시저장 정리
      if (session && session.sessionId === a.session_id) {
        discardSaved(a.lesson.id);
        clearSession();
      }
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  const totalLessons = progress.length;
  const totalSessions = progress.reduce((s, p) => s + p.session_count, 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome */}
        <div>
          <h2 className="text-xl font-semibold text-brain-text">
            안녕하세요, {user.name}님 👋
          </h2>
          <p className="text-sm text-brain-text-muted mt-1">
            오늘도 천재의 뇌로 읽기를 시작해봅시다.
          </p>
        </div>

        {/* Resume in-progress session */}
        {session && !session.completedAt && (
          <div className="bg-brain-surface border border-brain-accent rounded-xl p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-brain-text truncate">
                진행 중인 학습 — {session.lessonTitle}
              </h3>
              <p className="text-xs text-brain-text-muted mt-0.5">
                {session.author} · 현재 {session.currentStage}부
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  if (window.confirm("진행 중인 학습을 삭제할까요? 작업 내용이 사라집니다.")) clearSession();
                }}
                className="px-3 py-2 rounded-lg border border-brain-border text-brain-text-muted text-xs hover:text-brain-text"
              >
                삭제
              </button>
              <button
                onClick={onResume}
                className="px-5 py-2 rounded-lg bg-brain-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                이어하기 →
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "학습한 레슨", value: totalLessons },
            { label: "총 학습 횟수", value: totalSessions },
            { label: "저장된 작업", value: artifacts.length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-brain-surface border border-brain-border rounded-xl p-4"
            >
              <div className="text-2xl font-bold text-brain-text">{stat.value}</div>
              <div className="text-xs text-brain-text-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-brain-accent-soft border border-brain-accent/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-brain-text mb-1">
            3부 학습 사이클로 시작하세요
          </h3>
          <p className="text-xs text-brain-text-muted mb-4 leading-relaxed">
            1부 → 글의 내용 이해 &nbsp;·&nbsp; 2부 → 저자의 인지구조 파악 &nbsp;·&nbsp; 3부 → 렌즈 내재화
          </p>
          <button
            onClick={onGoLibrary}
            className="px-5 py-2 rounded-lg bg-brain-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            레슨 선택하기 →
          </button>
        </div>

        {/* Recent artifacts */}
        {!loading && artifacts.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-brain-text">
                최근 학습 기록 <span className="text-xs text-brain-text-muted font-normal">({artifacts.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                {checked.size > 0 && (
                  <button
                    onClick={deleteChecked}
                    disabled={bulkBusy}
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    🗑 선택 삭제 ({checked.size})
                  </button>
                )}
                <button
                  onClick={() =>
                    setChecked(
                      checked.size === artifacts.length
                        ? new Set()
                        : new Set(artifacts.map((a) => a.artifact_id)),
                    )
                  }
                  className="text-xs text-brain-text-muted hover:text-brain-text"
                >
                  {checked.size === artifacts.length ? "선택 해제" : "전체 선택"}
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {artifacts.map((a) => {
                const prog = progressFor(a);
                const allDone = prog && prog.done[0] && prog.done[1] && prog.done[2];
                return (
                  <div
                    key={a.artifact_id}
                    className={`flex items-center justify-between gap-3 bg-brain-surface border rounded-lg px-4 py-3 transition-colors ${
                      checked.has(a.artifact_id) ? "border-brain-accent" : "border-brain-border hover:border-brain-accent/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(a.artifact_id)}
                      onClick={(e) => toggleCheck(a.artifact_id, e)}
                      onChange={() => {}}
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-brain-text truncate">{a.lesson.title}</span>
                        {/* 부 단계 진행도 ① ② ③ */}
                        {prog && (
                          <span className="shrink-0 flex items-center gap-1">
                            {([1, 2, 3] as const).map((n) => {
                              const isDone = prog.done[n - 1];
                              const isCurrent = prog.active && !isDone && prog.stage === n;
                              return (
                                <span
                                  key={n}
                                  title={`${n}부${isDone ? " 완료" : isCurrent ? " 진행 중" : ""}`}
                                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                                    isDone
                                      ? "bg-brain-accent text-white"
                                      : isCurrent
                                      ? "border-[1.5px] border-brain-accent text-brain-accent"
                                      : "bg-brain-border text-brain-text-muted"
                                  }`}
                                >
                                  {isDone ? "✓" : n}
                                </span>
                              );
                            })}
                          </span>
                        )}
                        <span className={`shrink-0 text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                          allDone
                            ? "bg-green-100 text-green-700"
                            : prog?.active
                            ? "bg-brain-accent-soft text-brain-accent"
                            : "bg-brain-surface-soft text-brain-text-muted"
                        }`}>
                          {allDone ? "완료" : prog ? `${prog.stage}부${prog.active ? " 진행 중" : ""}` : "저장됨"}
                        </span>
                      </div>
                      <div className="text-xs text-brain-text-muted mt-0.5">
                        노드 {a.node_count}개 · 엣지 {a.edge_count}개 ·{" "}
                        {new Date(a.saved_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => loadArtifact(a)}
                        disabled={loadingArtifact !== null}
                        className="px-3 py-1.5 rounded-lg bg-brain-accent text-white text-xs font-medium disabled:opacity-50 hover:opacity-90"
                      >
                        {loadingArtifact === a.artifact_id ? "여는 중..." : prog?.active ? "이어하기 →" : "불러오기 →"}
                      </button>
                      <button
                        onClick={(e) => deleteArtifact(a, e)}
                        className="px-2 py-1.5 rounded-lg border border-brain-border text-brain-text-muted text-xs hover:border-red-400 hover:text-red-500"
                        title="기록 삭제"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center text-brain-text-muted text-sm py-8">로딩 중...</div>
        )}
      </div>
    </div>
  );
}
