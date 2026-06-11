import { useEffect, useState } from "react";
import { api } from "../../v2-shell/api";
import type { ArtifactGalleryDto, ProgressEntryDto, TextExcerptDto } from "../../v2-shell/api";
import { useProtocolStore } from "../store/useProtocolStore";
import type { V3User, V3Node, V3Edge } from "../types";

interface Props {
  user: V3User;
  onGoLibrary: () => void;
  onResume: () => void;
}

export function DashboardScreen({ user, onGoLibrary, onResume }: Props) {
  const session = useProtocolStore((s) => s.session);
  const { clearSession, startSession, setStage1Canvas } = useProtocolStore();
  const [loadingArtifact, setLoadingArtifact] = useState<string | null>(null);

  // 저장된 학습 기록 클릭 → 1부 다이어그램 복원 + 세션 재구성
  const loadArtifact = async (a: ArtifactGalleryDto) => {
    if (loadingArtifact) return;
    if (session && !session.completedAt) {
      const ok = window.confirm(
        `진행 중인 학습(${session.lessonTitle})이 있습니다.\n기록을 불러오면 기존 진행 내용이 사라집니다. 계속할까요?`
      );
      if (!ok) return;
    }
    if (!a.lesson.text_excerpt_id) {
      alert("이 레슨의 텍스트를 찾을 수 없어 불러올 수 없습니다.");
      return;
    }
    setLoadingArtifact(a.artifact_id);
    try {
      const [artifact, text, newSession] = await Promise.all([
        api.getArtifact(a.session_id),
        api.text(a.lesson.text_excerpt_id),
        api.startSession(a.lesson.id, "practice"),
      ]);
      const t = text as TextExcerptDto;
      startSession({
        sessionId: newSession.id,
        lessonId: a.lesson.id,
        lessonTitle: a.lesson.title,
        author: t.author || "",
        source: t.source || "",
        textBody: t.body || "",
      });
      if (artifact) {
        const ns: V3Node[] = artifact.canvas_json.nodes.map((n) => ({
          id: n.id,
          label: n.label,
          x: n.x,
          y: n.y,
          kind: "concept",
        }));
        const es: V3Edge[] = artifact.canvas_json.edges.map((e) => ({
          id: e.id,
          from: e.from,
          to: e.to,
          label: e.label,
        }));
        setStage1Canvas(ns, es);
      }
      onResume();
    } catch (e) {
      alert(e instanceof Error ? e.message : "기록을 불러올 수 없습니다.");
    } finally {
      setLoadingArtifact(null);
    }
  };
  const [progress, setProgress] = useState<ProgressEntryDto[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactGalleryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.progress(), api.artifacts()])
      .then(([p, a]) => { setProgress(p); setArtifacts(a); })
      .finally(() => setLoading(false));
  }, []);

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
            <h3 className="text-sm font-semibold text-brain-text mb-3">최근 학습 기록</h3>
            <div className="space-y-2">
              {artifacts.slice(0, 5).map((a) => (
                <button
                  key={a.artifact_id}
                  onClick={() => loadArtifact(a)}
                  disabled={loadingArtifact !== null}
                  className="w-full flex items-center justify-between bg-brain-surface border border-brain-border rounded-lg px-4 py-3 text-left hover:border-brain-accent/50 transition-colors disabled:opacity-60"
                  title="클릭하면 저장된 다이어그램을 불러옵니다"
                >
                  <div>
                    <div className="text-sm text-brain-text">{a.lesson.title}</div>
                    <div className="text-xs text-brain-text-muted mt-0.5">
                      노드 {a.node_count}개 · 엣지 {a.edge_count}개 ·{" "}
                      {new Date(a.saved_at).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                  <span className="text-xs text-brain-text-soft">
                    {loadingArtifact === a.artifact_id ? "불러오는 중..." : "불러오기 →"}
                  </span>
                </button>
              ))}
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
