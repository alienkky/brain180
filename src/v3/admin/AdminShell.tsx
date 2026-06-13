import { useEffect, useState } from "react";
import { api } from "../../v2-shell/api";
import type {
  UserDto,
  AdminModuleDto,
  AdminLessonDto,
  AdminTutorRatingsDto,
} from "../../v2-shell/api";
import { useTheme, ACCENT_OPTIONS, HL_OPTIONS } from "../../v2-shell/useTheme";
import type { Skin } from "../../v2-shell/useTheme";
import type { AdminScreen, V3User } from "../types";

interface Props {
  user: V3User;
  onLogout: () => void;
  onSwitchToLearning?: () => void;
}

const NAV_ITEMS: { id: AdminScreen; label: string; icon: string }[] = [
  { id: "dashboard", label: "대시보드", icon: "📊" },
  { id: "users", label: "회원 관리", icon: "👥" },
  { id: "content", label: "콘텐츠 관리", icon: "📚" },
  { id: "ai", label: "AI 코치 제어", icon: "🤖" },
  { id: "theme", label: "테마 관리", icon: "🎨" },
  { id: "analytics", label: "분석/통계", icon: "📈" },
];

// ── Sub-panels ────────────────────────────────────────────

function AdminDashboard() {
  const [pending, setPending] = useState<UserDto[]>([]);
  const [allUsers, setAllUsers] = useState<UserDto[]>([]);
  useEffect(() => {
    api.adminPending().then(setPending).catch(() => {});
    api.adminUsers().then(setAllUsers).catch(() => {});
  }, []);
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h2 className="text-lg font-semibold text-brain-text">관리자 대시보드</h2>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "전체 회원", value: allUsers.length },
          { label: "승인 대기", value: pending.length },
          { label: "승인된 회원", value: allUsers.filter((u) => u.status === "approved").length },
        ].map((s) => (
          <div key={s.label} className="bg-brain-surface border border-brain-border rounded-xl p-4">
            <div className="text-2xl font-bold text-brain-text">{s.value}</div>
            <div className="text-xs text-brain-text-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800">
            ⚠️ 승인 대기 회원 {pending.length}명 — 회원 관리 탭에서 처리하세요.
          </p>
        </div>
      )}
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.adminUsers().then(setUsers).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const approve = async (id: string) => {
    setActing(id);
    await api.adminApprove(id).catch(() => {});
    load();
    setActing(null);
  };
  const reject = async (id: string) => {
    setActing(id);
    await api.adminReject(id).catch(() => {});
    load();
    setActing(null);
  };

  const STATUS_LABELS: Record<string, string> = {
    pending_approval: "대기",
    approved: "승인됨",
    rejected: "거절됨",
    suspended: "정지됨",
  };

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brain-text">회원 관리</h2>
        <button onClick={load} className="text-xs text-brain-text-muted hover:text-brain-text">
          새로고침
        </button>
      </div>
      {loading ? (
        <div className="text-center text-brain-text-muted py-12">로딩 중...</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between bg-brain-surface border border-brain-border rounded-xl px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-brain-text">{u.name}</div>
                <div className="text-xs text-brain-text-muted mt-0.5">
                  {u.email} · {u.role}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    u.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : u.status === "pending_approval"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-brain-surface-soft text-brain-text-muted"
                  }`}
                >
                  {STATUS_LABELS[u.status] ?? u.status}
                </span>
                {u.status === "pending_approval" && (
                  <>
                    <button
                      onClick={() => approve(u.id)}
                      disabled={acting === u.id}
                      className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white disabled:opacity-50 hover:bg-green-700"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => reject(u.id)}
                      disabled={acting === u.id}
                      className="text-xs px-3 py-1 rounded-lg bg-brain-surface border border-brain-border text-brain-text-muted disabled:opacity-50 hover:text-brain-text"
                    >
                      거절
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="text-center text-brain-text-muted py-12 text-sm">회원 없음</div>
          )}
        </div>
      )}
    </div>
  );
}

// 레슨 글 편집기 — 제목/저자/출처/순서 + 본문 텍스트 에디터
function LessonEditor({
  lesson,
  moduleId,
  nextOrder,
  onSaved,
  onClose,
}: {
  lesson: AdminLessonDto | null; // null = 새 레슨
  moduleId: string;
  nextOrder: number;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [author, setAuthor] = useState(lesson?.author ?? "");
  const [source, setSource] = useState(lesson?.source ?? "");
  const [order, setOrder] = useState(lesson?.order ?? nextOrder);
  const [body, setBody] = useState(lesson?.body ?? "");
  const [objectives, setObjectives] = useState((lesson?.objectives ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = body.length;
  const paraCount = body.split(/\n\s*\n/).filter((p) => p.trim()).length;

  // 본문 정리 도구
  const tidyBody = () => {
    setBody((b) =>
      b
        .replace(/[ \t]+\n/g, "\n") // 줄 끝 공백 제거
        .replace(/\n{3,}/g, "\n\n") // 3줄 이상 빈 줄 → 1줄
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .trim()
    );
  };

  const save = async () => {
    if (!title.trim()) { setError("제목을 입력하세요."); return; }
    if (!body.trim()) { setError("본문을 입력하세요."); return; }
    setSaving(true);
    setError(null);
    const objList = objectives.split("\n").map((s) => s.trim()).filter(Boolean);
    try {
      if (lesson) {
        await api.adminUpdateLesson(lesson.id, {
          title: title.trim(),
          order,
          body,
          author: author.trim(),
          source: source.trim(),
          objectives: objList,
        });
      } else {
        await api.adminCreateLesson({
          module_id: moduleId,
          title: title.trim(),
          order,
          body,
          author: author.trim() || undefined,
          source: source.trim() || undefined,
          objectives: objList.length ? objList : undefined,
        });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-brain-border bg-brain-bg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brain-border bg-brain-surface px-5 py-3">
          <h3 className="text-sm font-semibold text-brain-text">
            {lesson ? "레슨 편집" : "새 레슨"}
          </h3>
          <button onClick={onClose} className="text-brain-text-muted hover:text-brain-text text-lg leading-none">✕</button>
        </div>

        {/* Meta fields */}
        <div className="grid grid-cols-2 gap-3 border-b border-brain-border px-5 py-3 md:grid-cols-4">
          <label className="col-span-2 flex flex-col gap-1 text-xs text-brain-text-muted">
            제목 *
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text focus:border-brain-accent focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-brain-text-muted">
            저자
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text focus:border-brain-accent focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-brain-text-muted">
            순서
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text focus:border-brain-accent focus:outline-none"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-xs text-brain-text-muted">
            출처
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text focus:border-brain-accent focus:outline-none"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-xs text-brain-text-muted">
            학습 목표 (줄바꿈으로 구분)
            <textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              rows={2}
              className="resize-none rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text focus:border-brain-accent focus:outline-none"
            />
          </label>
        </div>

        {/* Body editor */}
        <div className="flex flex-1 flex-col overflow-hidden px-5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-brain-text-muted">본문 *</span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-brain-text-soft">
                {charCount.toLocaleString()}자 · 문단 {paraCount}개
              </span>
              <button
                onClick={tidyBody}
                className="rounded border border-brain-border px-2 py-1 text-[11px] text-brain-text-muted hover:border-brain-accent hover:text-brain-accent"
                title="줄 끝 공백 제거 · 과도한 빈 줄 정리 · 따옴표 통일"
              >
                ✨ 본문 정리
              </button>
            </div>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"고전 텍스트 본문을 붙여넣으세요.\n\n빈 줄로 문단을 구분하면 학습 화면에 그대로 반영됩니다."}
            className="flex-1 resize-none rounded-lg border border-brain-border bg-brain-surface px-4 py-3 text-[14px] leading-[1.9] text-brain-text focus:border-brain-accent focus:outline-none"
            style={{ whiteSpace: "pre-wrap" }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-brain-border bg-brain-surface px-5 py-3">
          <span className="text-xs text-red-500">{error}</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-brain-border px-4 py-2 text-sm text-brain-text-muted hover:text-brain-text"
            >
              취소
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-brain-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 모듈(라이브러리) 생성/편집 모달
function ModuleEditModal({
  module,
  nextOrder,
  onSaved,
  onClose,
}: {
  module: AdminModuleDto | null; // null = 새 라이브러리
  nextOrder: number;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(module?.title ?? "");
  const [field, setField] = useState(module?.field ?? "philosophy");
  const [difficulty, setDifficulty] = useState(module?.difficulty ?? 3);
  const [description, setDescription] = useState(module?.description ?? "");
  const [order, setOrder] = useState(module?.order ?? nextOrder);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const FIELD_OPTIONS = [
    ["philosophy", "철학"],
    ["science", "과학/수학"],
    ["literature", "문학"],
    ["art", "예술/음악"],
    ["economics", "경제/사회"],
    ["eastern", "동양 고전"],
  ] as const;

  const save = async () => {
    if (!title.trim()) { setError("제목을 입력하세요."); return; }
    setSaving(true);
    setError(null);
    try {
      if (module) {
        await api.adminUpdateModule(module.id, {
          title: title.trim(),
          field,
          order,
          difficulty,
          description: description.trim() || undefined,
        });
      } else {
        await api.adminCreateModule({
          title: title.trim(),
          slug: `m-${Date.now().toString(36)}`,
          axis: "cognitive",
          field,
          order: nextOrder,
          difficulty,
          description: description.trim() || undefined,
        });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : module ? "수정 실패" : "생성 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-brain-border bg-brain-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-brain-border bg-brain-surface px-5 py-3">
          <h3 className="text-sm font-semibold text-brain-text">{module ? "라이브러리 편집" : "새 라이브러리"}</h3>
          <button onClick={onClose} className="text-brain-text-muted hover:text-brain-text text-lg leading-none">✕</button>
        </div>
        <div className="flex flex-col gap-3 px-5 py-4">
          <label className="flex flex-col gap-1 text-xs text-brain-text-muted">
            제목 *
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text focus:border-brain-accent focus:outline-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-brain-text-muted">
              분야
              <select
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text focus:border-brain-accent focus:outline-none"
              >
                {FIELD_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-brain-text-muted">
              난이도 (1~5)
              <input
                type="number"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Math.min(5, Math.max(1, Number(e.target.value))))}
                className="rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text focus:border-brain-accent focus:outline-none"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-brain-text-muted">
              순서
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text focus:border-brain-accent focus:outline-none"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs text-brain-text-muted">
            설명
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text focus:border-brain-accent focus:outline-none"
            />
          </label>
        </div>
        <div className="flex items-center justify-between border-t border-brain-border bg-brain-surface px-5 py-3">
          <span className="text-xs text-red-500">{error}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-brain-border px-4 py-2 text-sm text-brain-text-muted hover:text-brain-text">
              취소
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-brain-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "저장 중..." : module ? "저장" : "생성"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminContent() {
  const [modules, setModules] = useState<AdminModuleDto[]>([]);
  const [selectedMod, setSelectedMod] = useState<AdminModuleDto | null>(null);
  const [lessons, setLessons] = useState<AdminLessonDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<AdminLessonDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingModule, setCreatingModule] = useState(false);
  const [editingModule, setEditingModule] = useState<AdminModuleDto | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.adminModules().then(setModules).finally(() => setLoading(false));
  }, []);

  const refreshModules = async () => {
    const ms = await api.adminModules();
    setModules(ms);
    return ms;
  };

  const deleteModule = async (m: AdminModuleDto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`라이브러리 "${m.title}"을(를) 삭제할까요?`)) return;
    setBusy(true);
    try {
      await api.adminDeleteModule(m.id);
      if (selectedMod?.id === m.id) {
        setSelectedMod(null);
        setLessons([]);
      }
      await refreshModules();
    } catch {
      alert("레슨이 남아 있는 라이브러리는 삭제할 수 없습니다.\n(숨김 처리된 레슨 포함) 레슨을 먼저 모두 삭제하세요.");
    } finally {
      setBusy(false);
    }
  };

  const refreshLessons = async (mod: AdminModuleDto) => {
    const ls = await api.adminLessons(mod.id);
    setLessons(ls);
    setChecked(new Set());
  };

  const selectMod = async (mod: AdminModuleDto) => {
    setSelectedMod(mod);
    await refreshLessons(mod);
  };

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteOne = async (l: AdminLessonDto) => {
    if (!window.confirm(`레슨 "${l.title}"을(를) 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setBusy(true);
    try {
      await api.adminDeleteLesson(l.id);
      if (selectedMod) await refreshLessons(selectedMod);
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusy(false);
    }
  };

  const deleteChecked = async () => {
    if (checked.size === 0) return;
    if (!window.confirm(`선택한 레슨 ${checked.size}개를 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setBusy(true);
    try {
      for (const id of checked) {
        await api.adminDeleteLesson(id);
      }
      if (selectedMod) await refreshLessons(selectedMod);
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
      if (selectedMod) await refreshLessons(selectedMod);
    } finally {
      setBusy(false);
    }
  };

  const allChecked = lessons.length > 0 && checked.size === lessons.length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Module list */}
      <div className="w-64 border-r border-brain-border flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-brain-border flex items-center justify-between">
          <span className="text-xs font-semibold text-brain-text-muted uppercase">라이브러리</span>
          <button
            onClick={() => setCreatingModule(true)}
            className="rounded-lg bg-brain-accent px-2 py-1 text-[11px] font-medium text-white hover:opacity-90"
          >
            + 추가
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="text-center text-brain-text-muted text-xs py-6">로딩...</div>
          ) : (
            modules.map((m) => (
              <div
                key={m.id}
                onClick={() => selectMod(m)}
                className={`group flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm transition-colors ${
                  selectedMod?.id === m.id
                    ? "bg-brain-accent-soft text-brain-accent"
                    : "text-brain-text hover:bg-brain-surface-soft"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.title}</div>
                  <div className="text-xs text-brain-text-muted">{m.lesson_count}레슨</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingModule(m); }}
                  className="shrink-0 rounded px-1.5 py-1 text-xs text-brain-text-soft opacity-0 transition-opacity hover:text-brain-accent group-hover:opacity-100"
                  title="라이브러리 편집"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => deleteModule(m, e)}
                  disabled={busy}
                  className="shrink-0 rounded px-1.5 py-1 text-xs text-brain-text-soft opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 disabled:opacity-30"
                  title="라이브러리 삭제"
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lesson list */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedMod ? (
          <div className="text-center text-brain-text-muted text-sm py-16">모듈을 선택하세요.</div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between max-w-2xl">
              <h2 className="text-base font-semibold text-brain-text">{selectedMod.title}</h2>
              <div className="flex items-center gap-2">
                {checked.size > 0 && (
                  <button
                    onClick={deleteChecked}
                    disabled={busy}
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    🗑 선택 삭제 ({checked.size})
                  </button>
                )}
                <button
                  onClick={() => setCreating(true)}
                  className="rounded-lg bg-brain-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  + 새 레슨
                </button>
              </div>
            </div>

            {lessons.length > 0 && (
              <label className="mb-2 flex max-w-2xl items-center gap-2 px-1 text-xs text-brain-text-muted">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={() =>
                    setChecked(allChecked ? new Set() : new Set(lessons.map((l) => l.id)))
                  }
                />
                전체 선택
              </label>
            )}

            <div className="space-y-2 max-w-2xl">
              {lessons.map((l, idx) => (
                <div
                  key={l.id}
                  className={`bg-brain-surface border rounded-xl p-4 transition-colors ${
                    checked.has(l.id) ? "border-brain-accent" : "border-brain-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked.has(l.id)}
                      onChange={() => toggleCheck(l.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-brain-text-muted mr-2">#{idx + 1}</span>
                      <span className="text-sm font-medium text-brain-text">{l.title}</span>
                      {l.author && (
                        <div className="text-xs text-brain-text-muted mt-1">저자: {l.author}</div>
                      )}
                      {l.objectives?.length > 0 && (
                        <ul className="text-xs text-brain-text-muted mt-2 space-y-0.5">
                          {l.objectives.slice(0, 2).map((o, i) => (
                            <li key={i}>· {o}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-brain-text-soft">
                        {l.text_excerpt_id ? `${l.body.length.toLocaleString()}자` : "텍스트 없음"}
                      </span>
                      <button
                        onClick={() => setEditing(l)}
                        className="rounded-lg border border-brain-border px-2.5 py-1 text-xs text-brain-text-muted hover:border-brain-accent hover:text-brain-accent"
                      >
                        ✏️ 편집
                      </button>
                      <button
                        onClick={() => deleteOne(l)}
                        disabled={busy}
                        className="rounded-lg border border-brain-border px-2.5 py-1 text-xs text-brain-text-muted hover:border-red-400 hover:text-red-500 disabled:opacity-50"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {lessons.length === 0 && (
                <div className="text-center text-brain-text-muted text-sm py-12">레슨 없음</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Editor modal */}
      {(editing || creating) && selectedMod && (
        <LessonEditor
          lesson={editing}
          moduleId={selectedMod.id}
          nextOrder={lessons.length + 1}
          onSaved={async () => {
            setEditing(null);
            setCreating(false);
            await refreshLessons(selectedMod);
            await refreshModules();
          }}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}

      {/* Module create modal */}
      {(creatingModule || editingModule) && (
        <ModuleEditModal
          module={editingModule}
          nextOrder={modules.length + 1}
          onSaved={async () => {
            setCreatingModule(false);
            setEditingModule(null);
            const ms = await refreshModules();
            // 편집 중인 모듈이 선택돼 있으면 최신 값으로 갱신
            if (selectedMod) {
              const fresh = ms.find((m) => m.id === selectedMod.id);
              if (fresh) setSelectedMod(fresh);
            }
          }}
          onClose={() => {
            setCreatingModule(false);
            setEditingModule(null);
          }}
        />
      )}
    </div>
  );
}

function AdminAI() {
  const [ratings, setRatings] = useState<AdminTutorRatingsDto | null>(null);
  useEffect(() => {
    api.adminTutorRatings(20).then(setRatings).catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h2 className="text-lg font-semibold text-brain-text">AI 코치 제어</h2>

      {/* Stats */}
      {ratings && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-brain-surface border border-brain-border rounded-xl p-4">
            <div className="text-2xl font-bold text-brain-text">{ratings.summary.count}</div>
            <div className="text-xs text-brain-text-muted mt-1">총 평가 수</div>
          </div>
          <div className="bg-brain-surface border border-brain-border rounded-xl p-4">
            <div className="text-2xl font-bold text-brain-text">
              {ratings.summary.average?.toFixed(1) ?? "-"}
            </div>
            <div className="text-xs text-brain-text-muted mt-1">평균 평점</div>
          </div>
          <div className="bg-brain-surface border border-brain-border rounded-xl p-4">
            <div className="text-2xl font-bold text-brain-text">
              {ratings.summary.by_model.length}
            </div>
            <div className="text-xs text-brain-text-muted mt-1">사용 모델 수</div>
          </div>
        </div>
      )}

      {/* Stage-specific prompts */}
      <div className="bg-brain-surface border border-brain-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-brain-text mb-3">3부 프로토콜 AI 설정</h3>
        <p className="text-xs text-brain-text-muted mb-4">
          각 부의 AI 피드백 프롬프트는 레슨별로 설정됩니다.
          <br />콘텐츠 관리 탭에서 레슨을 선택하여 시스템 프롬프트를 편집하세요.
        </p>
        <div className="space-y-3">
          {["1부 · 시각화 피드백", "2부 · 인지구조 피드백", "3부 · 글쓰기 피드백"].map(
            (label) => (
              <div
                key={label}
                className="flex items-center justify-between p-3 bg-brain-surface-soft rounded-lg"
              >
                <span className="text-xs text-brain-text">{label}</span>
                <span className="text-xs text-brain-text-soft">레슨별 프롬프트 사용</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Recent ratings */}
      {ratings && ratings.recent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-brain-text mb-3">최근 AI 피드백 평가</h3>
          <div className="space-y-2">
            {ratings.recent.slice(0, 8).map((r) => (
              <div
                key={r.id}
                className="bg-brain-surface border border-brain-border rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-brain-text line-clamp-2">{r.message_content}</p>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {"⭐".repeat(r.rating)}
                    <span className="text-xs text-brain-text-muted">({r.rating})</span>
                  </div>
                </div>
                {r.feedback && (
                  <p className="text-xs text-brain-text-muted mt-1.5 italic">"{r.feedback}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminTheme() {
  const { skin, accent, hl, setSkin, setAccent, setHl } = useTheme();
  const SKINS: { id: Skin; label: string; desc: string }[] = [
    { id: "warm", label: "Warm", desc: "테라코타 + 종이 질감" },
    { id: "slate", label: "Slate", desc: "중립 회색 + 모던" },
    { id: "dark", label: "Dark", desc: "다크 그레이" },
    { id: "ivory", label: "Ivory", desc: "아이보리 + 스큐어모피즘" },
  ];
  return (
    <div className="p-6 space-y-6 max-w-xl">
      <h2 className="text-lg font-semibold text-brain-text">테마 관리</h2>
      {/* Skin */}
      <div>
        <h3 className="text-xs font-semibold text-brain-text-muted uppercase tracking-wide mb-3">스킨</h3>
        <div className="grid grid-cols-2 gap-3">
          {SKINS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSkin(s.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                skin === s.id
                  ? "border-brain-accent bg-brain-accent-soft"
                  : "border-brain-border hover:border-brain-accent/50"
              }`}
            >
              <div className="text-sm font-semibold text-brain-text">{s.label}</div>
              <div className="text-xs text-brain-text-muted mt-0.5">{s.desc}</div>
              {skin === s.id && <div className="text-xs text-brain-accent mt-1 font-medium">✓ 현재 적용됨</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Accent color (warm) */}
      {skin === "warm" && (
        <div>
          <h3 className="text-xs font-semibold text-brain-text-muted uppercase tracking-wide mb-3">액센트 색상</h3>
          <div className="flex gap-2">
            {ACCENT_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setAccent(c)}
                style={{ background: c }}
                className={`w-8 h-8 rounded-full transition-all ${
                  accent === c ? "ring-2 ring-offset-2 ring-brain-accent scale-110" : "hover:scale-105"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Highlight color (non-warm) */}
      {skin !== "warm" && (
        <div>
          <h3 className="text-xs font-semibold text-brain-text-muted uppercase tracking-wide mb-3">하이라이트 색상</h3>
          <div className="flex gap-2">
            {HL_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setHl(c)}
                style={{ background: c }}
                className={`w-8 h-8 rounded-full transition-all ${
                  hl === c ? "ring-2 ring-offset-2 ring-brain-accent scale-110" : "hover:scale-105"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminAnalytics() {
  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-lg font-semibold text-brain-text mb-6">분석 / 통계</h2>
      <div className="bg-brain-surface border border-brain-border rounded-xl p-8 text-center">
        <div className="text-3xl mb-3">📊</div>
        <p className="text-sm text-brain-text-muted">
          상세 분석 기능은 추후 업데이트 예정입니다.
          <br />회원 진행도는 회원 관리 탭에서 확인하세요.
        </p>
      </div>
    </div>
  );
}

// ── Main AdminShell ───────────────────────────────────────

export function AdminShell({ user, onLogout, onSwitchToLearning }: Props) {
  const [screen, setScreen] = useState<AdminScreen>("dashboard");

  const PANELS: Record<AdminScreen, React.ReactNode> = {
    dashboard: <AdminDashboard />,
    users: <AdminUsers />,
    content: <AdminContent />,
    ai: <AdminAI />,
    theme: <AdminTheme />,
    analytics: <AdminAnalytics />,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brain-bg">
      {/* Sidebar */}
      <div className="w-52 border-r border-brain-border bg-brain-surface flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-brain-border">
          <div className="text-sm font-bold text-brain-text">Brain180</div>
          <div className="text-xs text-brain-text-muted mt-0.5">관리자 모드</div>
        </div>
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                screen === item.id
                  ? "bg-brain-accent-soft text-brain-accent font-medium"
                  : "text-brain-text hover:bg-brain-surface-soft"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-brain-border p-3 space-y-2">
          {onSwitchToLearning && (
            <button
              onClick={onSwitchToLearning}
              className="w-full text-xs bg-brain-accent-soft text-brain-accent hover:opacity-80 py-2 rounded-lg font-medium transition-opacity"
            >
              📖 학습자 모드로 보기
            </button>
          )}
          <div className="text-xs text-brain-text-muted truncate">{user.email}</div>
          <button
            onClick={onLogout}
            className="w-full text-xs text-brain-text-muted hover:text-brain-text py-1"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{PANELS[screen]}</div>
    </div>
  );
}
