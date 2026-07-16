import { useEffect, useState } from "react";
import { api } from "../../v2-shell/api";
import type {
  UserDto,
  AdminModuleDto,
  AdminLessonDto,
  AdminTutorRatingsDto,
  AdminUserProgressDto,
  AdminSessionDetailDto,
} from "../../v2-shell/api";
import { useTheme, ACCENT_OPTIONS, HL_OPTIONS } from "../../v2-shell/useTheme";
import type { Skin } from "../../v2-shell/useTheme";
import type { AdminScreen, V3User, V3Node, V3Edge } from "../types";
import { NodeCanvas } from "../components/NodeCanvas";
import { GradingPanel } from "./GradingPanel";

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
  { id: "grading", label: "v4 채점 콘솔", icon: "⚖️" },
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

const USER_STATUS_LABELS: Record<string, string> = {
  pending_approval: "대기",
  approved: "승인됨",
  rejected: "거절됨",
  suspended: "정지됨",
};

function statusBadgeClass(status: string) {
  return status === "approved"
    ? "bg-green-100 text-green-700"
    : status === "pending_approval"
    ? "bg-amber-100 text-amber-700"
    : status === "rejected"
    ? "bg-red-100 text-red-700"
    : "bg-brain-surface-soft text-brain-text-muted";
}

// 회원 진도 상세 + 관리 액션 패널 (우측 드로어)
function UserDetailDrawer({
  user,
  onClose,
  onChanged,
}: {
  user: UserDto;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [prog, setProg] = useState<AdminUserProgressDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tempPw, setTempPw] = useState<string | null>(null);
  const [viewSession, setViewSession] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setTempPw(null);
    api.adminUserProgress(user.id).then(setProg).catch(() => setProg(null)).finally(() => setLoading(false));
  }, [user.id]);

  const act = async (fn: () => Promise<unknown>, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "작업 실패");
    } finally {
      setBusy(false);
    }
  };

  const resetPw = async () => {
    if (!window.confirm(`${user.name}님의 비밀번호를 임시 비밀번호로 재설정할까요?`)) return;
    setBusy(true);
    try {
      const r = await api.adminResetUserPassword(user.id);
      setTempPw(r.temp_password);
    } catch (e) {
      alert(e instanceof Error ? e.message : "재설정 실패");
    } finally {
      setBusy(false);
    }
  };

  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("ko-KR") : "—");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col overflow-hidden bg-brain-bg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-brain-border bg-brain-surface px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-semibold text-brain-text truncate">{user.name}</div>
            <div className="text-xs text-brain-text-muted mt-0.5 truncate">{user.email}</div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(user.status)}`}>
                {USER_STATUS_LABELS[user.status] ?? user.status}
              </span>
              <span className="text-xs text-brain-text-soft">{user.role === "admin" ? "관리자" : "학습자"}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-brain-text-muted hover:text-brain-text text-lg leading-none">✕</button>
        </div>

        {/* Actions */}
        <div className="border-b border-brain-border px-5 py-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {user.status !== "approved" && (
              <button onClick={() => act(() => api.adminApprove(user.id))} disabled={busy}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white disabled:opacity-50 hover:bg-green-700">승인</button>
            )}
            {user.status === "pending_approval" && (
              <button onClick={() => act(() => api.adminReject(user.id))} disabled={busy}
                className="text-xs px-3 py-1.5 rounded-lg border border-brain-border text-brain-text-muted disabled:opacity-50 hover:text-brain-text">거절</button>
            )}
            {user.status === "approved" && (
              <button onClick={() => act(() => api.adminSuspendUser(user.id), `${user.name}님을 정지할까요?`)} disabled={busy}
                className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 disabled:opacity-50 hover:bg-amber-100">정지</button>
            )}
            <button
              onClick={() => act(() => api.adminUpdateUser(user.id, { role: user.role === "admin" ? "user" : "admin" }),
                user.role === "admin" ? `${user.name}님의 관리자 권한을 해제할까요?` : `${user.name}님을 관리자로 지정할까요?`)}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg border border-brain-border text-brain-text-muted disabled:opacity-50 hover:text-brain-text">
              {user.role === "admin" ? "관리자 해제" : "관리자 지정"}
            </button>
            <button onClick={resetPw} disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg border border-brain-border text-brain-text-muted disabled:opacity-50 hover:text-brain-text">비밀번호 재설정</button>
            <button onClick={() => act(() => api.adminDeleteUser(user.id), `${user.name}님을 삭제할까요?\n로그인이 차단되고 목록에서 사라집니다. (학습 기록은 보존)`)} disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-600 disabled:opacity-50 hover:bg-red-100">삭제</button>
          </div>
          {tempPw && (
            <div className="rounded-lg border border-brain-accent/40 bg-brain-accent-soft px-3 py-2 text-xs text-brain-text">
              임시 비밀번호: <span className="font-mono font-semibold select-all">{tempPw}</span>
              <div className="text-brain-text-muted mt-0.5">회원에게 전달 후 로그인하여 변경하도록 안내하세요.</div>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="text-center text-brain-text-muted text-sm py-8">진도 불러오는 중...</div>
          ) : !prog ? (
            <div className="text-center text-brain-text-soft text-sm py-8">진도 정보 없음</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["학습 레슨", prog.summary.lesson_count],
                  ["총 세션", prog.summary.session_count],
                  ["저장 작업", prog.summary.artifact_count],
                ].map(([label, val]) => (
                  <div key={label as string} className="rounded-lg border border-brain-border bg-brain-surface p-3 text-center">
                    <div className="text-lg font-bold text-brain-text">{val as number}</div>
                    <div className="text-[11px] text-brain-text-muted mt-0.5">{label as string}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-brain-text-muted">
                최근 활동: {fmt(prog.summary.last_started_at)}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-brain-text-muted uppercase mb-2">레슨별 진행</h4>
                {prog.lessons.length === 0 ? (
                  <p className="text-xs text-brain-text-soft">학습한 레슨 없음</p>
                ) : (
                  <div className="space-y-1.5">
                    {prog.lessons.map((l) => (
                      <div key={l.lesson_id} className="flex items-center justify-between rounded-lg border border-brain-border bg-brain-surface px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm text-brain-text truncate">{l.lesson_title}</div>
                          <div className="text-[11px] text-brain-text-muted truncate">{l.module_title}</div>
                        </div>
                        <span className="shrink-0 text-xs text-brain-text-soft ml-2">{l.session_count}회</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-brain-text-muted uppercase mb-2">최근 세션</h4>
                {prog.recent_sessions.length === 0 ? (
                  <p className="text-xs text-brain-text-soft">세션 없음</p>
                ) : (
                  <div className="space-y-1.5">
                    {prog.recent_sessions.map((s) => (
                      <button
                        key={s.session_id}
                        onClick={() => setViewSession(s.session_id)}
                        className="w-full text-left rounded-lg border border-brain-border bg-brain-surface px-3 py-2 hover:border-brain-accent transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm text-brain-text truncate">{s.lesson_title}</div>
                          <span className="shrink-0 text-xs text-brain-accent">열람 →</span>
                        </div>
                        <div className="text-[11px] text-brain-text-muted mt-0.5">
                          {fmt(s.started_at)} · 노드작업 {s.artifact_count}개 · {s.ended_at ? "완료" : "진행중"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {viewSession && (
        <AdminSessionViewer
          sessionId={viewSession}
          onClose={() => setViewSession(null)}
        />
      )}
    </div>
  );
}

// v3 스냅샷 페이로드의 한 단계.
interface V3StageSnap {
  nodes?: V3Node[];
  edges?: V3Edge[];
  description?: string;
  blocks?: { text: string }[];
  iteration_count?: number;
}

const SESSION_MODE_LABELS: Record<string, string> = {
  analyze: "분석",
  reverse: "역해석",
  practice: "연습",
};

function fmtSessionDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("ko-KR") : "-";
}

// 세션 한 건 상세 — AI 대화 전체 + 캔버스 스냅샷 + 원문. 전체화면 모달.
function AdminSessionViewer({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<AdminSessionDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"chat" | "canvas" | "text">("chat");

  useEffect(() => {
    setLoading(true);
    api
      .adminSessionDetail(sessionId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const payload = data?.artifact?.payload as Record<string, unknown> | undefined;
  const isV3 = payload?.v3 === true;
  const stages: { n: number; label: string; snap: V3StageSnap }[] = isV3
    ? [
        { n: 1, label: "1부 · 내용 이해", snap: (payload?.stage1 ?? {}) as V3StageSnap },
        { n: 2, label: "2부 · 인지구조", snap: (payload?.stage2 ?? {}) as V3StageSnap },
        { n: 3, label: "3부 · 렌즈 셋팅", snap: (payload?.stage3 ?? {}) as V3StageSnap },
      ]
    : [];

  const visibleMessages = data?.messages.filter((m) => m.role !== "system") ?? [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-brain-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brain-border bg-brain-surface px-5 py-3 shrink-0">
          {data ? (
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-brain-text truncate">{data.session.lesson_title}</h2>
              <p className="text-xs text-brain-text-muted truncate">
                {data.session.user_name} · {data.session.author || "저자 미상"} ·{" "}
                {SESSION_MODE_LABELS[data.session.mode] ?? data.session.mode} · {fmtSessionDate(data.session.started_at)}
              </p>
            </div>
          ) : (
            <span className="text-sm text-brain-text">세션 열람</span>
          )}
          <button onClick={onClose} className="text-brain-text-muted hover:text-brain-text text-lg leading-none">✕</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-brain-text-muted">로딩 중...</div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-brain-text-muted text-sm">
            세션을 찾을 수 없습니다.
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-brain-border bg-brain-surface shrink-0">
              {([
                ["chat", `AI 대화 (${visibleMessages.length})`],
                ["canvas", "인지 캔버스"],
                ["text", "원문"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                    tab === id
                      ? "border-brain-accent text-brain-accent"
                      : "border-transparent text-brain-text-muted hover:text-brain-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {tab === "chat" && (
                <div className="space-y-3">
                  {visibleMessages.length === 0 ? (
                    <div className="text-center text-brain-text-muted py-12 text-sm">
                      AI 대화 기록이 없습니다.
                    </div>
                  ) : (
                    visibleMessages.map((m) => (
                      <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                            m.role === "user"
                              ? "bg-brain-accent text-white"
                              : "bg-brain-surface border border-brain-border text-brain-text"
                          }`}
                        >
                          <div className="text-[10px] opacity-60 mb-1">
                            {m.role === "user" ? "학습자" : "AI 코치"} · {fmtSessionDate(m.created_at)}
                          </div>
                          {m.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "canvas" &&
                (isV3 ? (
                  <div className="space-y-6">
                    {stages.map((st) => {
                      const nodes = st.snap.nodes ?? [];
                      const edges = st.snap.edges ?? [];
                      return (
                        <div key={st.n}>
                          <h3 className="text-sm font-semibold text-brain-text mb-2">{st.label}</h3>
                          {st.snap.blocks && st.snap.blocks.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {st.snap.blocks.map((b, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-brain-accent-soft text-brain-accent">
                                  {b.text}
                                </span>
                              ))}
                            </div>
                          )}
                          {nodes.length > 0 ? (
                            <div className="h-72 border border-brain-border rounded-xl overflow-hidden">
                              <NodeCanvas nodes={nodes} edges={edges} onChange={() => {}} readOnly />
                            </div>
                          ) : (
                            <div className="text-xs text-brain-text-soft py-4 px-3 bg-brain-surface-soft rounded-lg">
                              이 단계의 캔버스 노드가 없습니다.
                            </div>
                          )}
                          {st.snap.description && (
                            <div className="mt-2 p-3 bg-brain-surface border border-brain-border rounded-lg">
                              <p className="text-xs text-brain-text-muted mb-1">학습자 설명</p>
                              <p className="text-sm text-brain-text whitespace-pre-wrap leading-relaxed">
                                {st.snap.description}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : data.artifact ? (
                  <div className="text-sm text-brain-text-muted">
                    <p className="mb-3">이 세션은 구버전 캔버스 형식입니다.</p>
                    <pre className="text-xs bg-brain-surface-soft rounded-lg p-3 overflow-x-auto">
                      {JSON.stringify(data.artifact.payload, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center text-brain-text-muted py-12 text-sm">
                    저장된 캔버스가 없습니다.
                  </div>
                ))}

              {tab === "text" && (
                <div>
                  <p className="text-xs text-brain-text-muted mb-2">
                    {data.session.author} · {data.session.source}
                  </p>
                  <div className="text-sm text-brain-text leading-[2] whitespace-pre-wrap">
                    {data.session.text_body || "원문이 없습니다."}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserDto | null>(null);
  const [filter, setFilter] = useState<"all" | "pending_approval" | "approved" | "suspended">("all");
  const [query, setQuery] = useState("");

  const load = () => {
    setLoading(true);
    api.adminUsers().then((us) => {
      setUsers(us);
      // 드로어 열려 있으면 최신 객체로 갱신
      setSelected((cur) => (cur ? us.find((u) => u.id === cur.id) ?? null : null));
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const approve = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActing(id);
    await api.adminApprove(id).catch(() => {});
    load();
    setActing(null);
  };
  const reject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActing(id);
    await api.adminReject(id).catch(() => {});
    load();
    setActing(null);
  };

  const counts = {
    all: users.length,
    pending_approval: users.filter((u) => u.status === "pending_approval").length,
    approved: users.filter((u) => u.status === "approved").length,
    suspended: users.filter((u) => u.status === "suspended").length,
  };

  const visible = users.filter((u) => {
    if (filter !== "all" && u.status !== filter) return false;
    const q = query.trim().toLowerCase();
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brain-text">회원 관리</h2>
        <button onClick={load} className="text-xs text-brain-text-muted hover:text-brain-text">새로고침</button>
      </div>

      {/* 필터 + 검색 */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          ["all", "전체"],
          ["pending_approval", "대기"],
          ["approved", "승인됨"],
          ["suspended", "정지됨"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === key
                ? "bg-brain-accent text-white"
                : "bg-brain-surface border border-brain-border text-brain-text-muted hover:text-brain-text"
            }`}
          >
            {label} {counts[key]}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름·이메일 검색"
          className="ml-auto rounded-lg border border-brain-border bg-brain-surface px-3 py-1.5 text-xs text-brain-text focus:border-brain-accent focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center text-brain-text-muted py-12">로딩 중...</div>
      ) : (
        <div className="space-y-2">
          {visible.map((u) => (
            <div
              key={u.id}
              onClick={() => setSelected(u)}
              className="flex cursor-pointer items-center justify-between bg-brain-surface border border-brain-border rounded-xl px-4 py-3 hover:border-brain-accent/50 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-brain-text truncate">{u.name}</div>
                <div className="text-xs text-brain-text-muted mt-0.5 truncate">
                  {u.email} · {u.role === "admin" ? "관리자" : "학습자"}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(u.status)}`}>
                  {USER_STATUS_LABELS[u.status] ?? u.status}
                </span>
                {u.status === "pending_approval" && (
                  <>
                    <button onClick={(e) => approve(u.id, e)} disabled={acting === u.id}
                      className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white disabled:opacity-50 hover:bg-green-700">승인</button>
                    <button onClick={(e) => reject(u.id, e)} disabled={acting === u.id}
                      className="text-xs px-3 py-1 rounded-lg bg-brain-surface border border-brain-border text-brain-text-muted disabled:opacity-50 hover:text-brain-text">거절</button>
                  </>
                )}
                <span className="text-brain-text-soft text-xs">›</span>
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="text-center text-brain-text-muted py-12 text-sm">해당 회원 없음</div>
          )}
        </div>
      )}

      {selected && (
        <UserDetailDrawer user={selected} onClose={() => setSelected(null)} onChanged={load} />
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
  // AI 코치 단계별 참고 자료 (lesson.sourceMeta → 프롬프트 {{lesson_tutor_notes}})
  const [coach1, setCoach1] = useState(lesson?.cognitive_structure_analysis ?? "");
  const [coach2, setCoach2] = useState(lesson?.learner_questions ?? "");
  const [coach3, setCoach3] = useState(lesson?.tutor_reference_notes ?? "");
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
          cognitive_structure_analysis: coach1.trim(),
          learner_questions: coach2.trim(),
          tutor_reference_notes: coach3.trim(),
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
          cognitive_structure_analysis: coach1.trim() || undefined,
          learner_questions: coach2.trim() || undefined,
          tutor_reference_notes: coach3.trim() || undefined,
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
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"고전 텍스트 본문을 붙여넣으세요.\n\n빈 줄로 문단을 구분하면 학습 화면에 그대로 반영됩니다."}
              className="min-h-[220px] flex-1 resize-none rounded-lg border border-brain-border bg-brain-surface px-4 py-3 text-[14px] leading-[1.9] text-brain-text focus:border-brain-accent focus:outline-none"
              style={{ whiteSpace: "pre-wrap" }}
            />

            {/* AI 코치 단계별 참고 자료 — 답변 고급화용. 학습자에겐 안 보임 */}
            <details className="rounded-lg border border-brain-border bg-brain-surface-soft" open>
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-brain-text">
                🤖 AI 코치 참고 자료 (1·2·3부) — 학습자 비공개
              </summary>
              <div className="flex flex-col gap-3 px-4 pb-4">
                <p className="text-[11px] text-brain-text-muted leading-relaxed">
                  각 부에서 AI 코치가 참고해 더 깊은 피드백을 주는 자료입니다. 학습 화면엔 노출되지 않습니다.
                </p>
                <label className="flex flex-col gap-1 text-xs text-brain-text-muted">
                  1부 · 글의 인지구조 (핵심 개념·논리 구조·사고 흐름)
                  <textarea
                    value={coach1}
                    onChange={(e) => setCoach1(e.target.value)}
                    rows={3}
                    placeholder="예: 이 글은 '길들임'을 시간·반복·관계의 축으로 전개한다. 핵심 노드: 길들이다/책임/유일성..."
                    className="resize-none rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text focus:border-brain-accent focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-brain-text-muted">
                  2부 · 저자의 대상과 렌즈 (저자가 무엇을 어떤 관점으로 봤나)
                  <textarea
                    value={coach2}
                    onChange={(e) => setCoach2(e.target.value)}
                    rows={3}
                    placeholder="예: 대상=관계 맺기, 렌즈=시간 투자와 책임. 학생에게 '왜 길들임이 시간을 요구하는가' 질문 유도..."
                    className="resize-none rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text focus:border-brain-accent focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-brain-text-muted">
                  3부 · 종합·내재화 (자기 삶에 적용·확장 포인트)
                  <textarea
                    value={coach3}
                    onChange={(e) => setCoach3(e.target.value)}
                    rows={3}
                    placeholder="예: 학생이 자신의 관계/습관에 '길들임의 렌즈'를 적용하도록. 피상적 요약은 되묻기..."
                    className="resize-none rounded-lg border border-brain-border bg-brain-surface px-3 py-2 text-sm text-brain-text focus:border-brain-accent focus:outline-none"
                  />
                </label>
              </div>
            </details>
          </div>
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
  const [showDeleted, setShowDeleted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.adminModules(showDeleted).then(setModules).finally(() => setLoading(false));
  }, [showDeleted]);

  const refreshModules = async () => {
    const ms = await api.adminModules(showDeleted);
    setModules(ms);
    return ms;
  };

  const deleteModule = async (m: AdminModuleDto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`라이브러리 "${m.title}"을(를) 숨길까요?\n학습 자료는 보존되며 '숨김 보기'에서 복원할 수 있습니다.`)) return;
    setBusy(true);
    try {
      await api.adminDeleteModule(m.id);
      if (selectedMod?.id === m.id) {
        setSelectedMod(null);
        setLessons([]);
      }
      await refreshModules();
    } catch {
      alert("삭제 실패");
    } finally {
      setBusy(false);
    }
  };

  const restoreModule = async (m: AdminModuleDto, e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    try {
      await api.adminRestoreModule(m.id);
      await refreshModules();
    } catch {
      alert("복원 실패");
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
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Module list — 모바일: 상단(높이 제한) / 데스크톱: 좌측 */}
      <div className="w-full md:w-64 max-h-[38vh] md:max-h-none border-b md:border-b-0 md:border-r border-brain-border flex flex-col overflow-hidden shrink-0">
        <div className="px-4 py-3 border-b border-brain-border flex items-center justify-between">
          <span className="text-xs font-semibold text-brain-text-muted uppercase">라이브러리</span>
          <button
            onClick={() => setCreatingModule(true)}
            className="rounded-lg bg-brain-accent px-2 py-1 text-[11px] font-medium text-white hover:opacity-90"
          >
            + 추가
          </button>
        </div>
        <label className="flex items-center gap-1.5 border-b border-brain-border px-4 py-2 text-[11px] text-brain-text-muted cursor-pointer">
          <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
          숨김 라이브러리 보기
        </label>
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="text-center text-brain-text-muted text-xs py-6">로딩...</div>
          ) : (
            modules.map((m) => (
              <div
                key={m.id}
                onClick={() => selectMod(m)}
                className={`group flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm transition-colors ${
                  m.deleted ? "opacity-50" : ""
                } ${
                  selectedMod?.id === m.id
                    ? "bg-brain-accent-soft text-brain-accent"
                    : "text-brain-text hover:bg-brain-surface-soft"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {m.deleted && <span className="text-red-500">🗑 </span>}
                    {m.title}
                  </div>
                  <div className="text-xs text-brain-text-muted">{m.lesson_count}레슨</div>
                </div>
                {m.deleted ? (
                  <button
                    onClick={(e) => restoreModule(m, e)}
                    disabled={busy}
                    className="shrink-0 rounded px-2 py-1 text-[11px] font-medium text-green-600 hover:bg-green-50 disabled:opacity-30"
                    title="복원"
                  >
                    ↩ 복원
                  </button>
                ) : (
                  <>
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
                      title="라이브러리 삭제(숨김)"
                    >
                      🗑
                    </button>
                  </>
                )}
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
    grading: <GradingPanel />,
    theme: <AdminTheme />,
    analytics: <AdminAnalytics />,
  };

  return (
    <div className="flex flex-col md:flex-row h-dvh overflow-hidden bg-brain-bg">
      {/* Sidebar — 데스크톱: 좌측 세로 / 모바일·태블릿 세로: 상단 가로 바 */}
      <div className="md:w-52 border-b md:border-b-0 md:border-r border-brain-border bg-brain-surface flex flex-col shrink-0 overflow-hidden">
        <button
          onClick={() => setScreen("dashboard")}
          className="hidden md:flex md:flex-col px-4 py-4 border-b border-brain-border text-left hover:bg-brain-surface-soft transition-colors"
          title="대시보드로"
        >
          <div className="text-sm font-bold text-brain-text">Brain180</div>
          <div className="text-xs text-brain-text-muted mt-0.5">관리자 모드</div>
        </button>
        {/* 모바일 상단 줄: 로고 + 학습자/로그아웃 */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-brain-border">
          <button onClick={() => setScreen("dashboard")} className="text-sm font-bold text-brain-text shrink-0" title="대시보드로">Brain180</button>
          <span className="text-[11px] text-brain-text-muted shrink-0">관리자</span>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {onSwitchToLearning && (
              <button
                onClick={onSwitchToLearning}
                className="text-[11px] bg-brain-accent-soft text-brain-accent px-2 py-1 rounded-md font-medium whitespace-nowrap"
              >
                📖 학습자
              </button>
            )}
            <button onClick={onLogout} className="text-[11px] text-brain-text-muted whitespace-nowrap">
              로그아웃
            </button>
          </div>
        </div>
        <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-hidden py-1 md:py-2 px-1 md:px-0 gap-1 md:gap-0">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`shrink-0 md:w-full flex items-center gap-1.5 md:gap-3 px-3 py-2 md:py-2.5 text-xs md:text-sm rounded-lg md:rounded-none transition-colors text-left whitespace-nowrap ${
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
        {/* 데스크톱: 메뉴 바로 아래 — 사이드바 최하단 고정 시 패드에서 잘리는 문제 방지 */}
        <div className="hidden md:block border-t border-brain-border p-3 space-y-2">
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
      <div className="flex-1 min-h-0 overflow-y-auto">{PANELS[screen]}</div>
    </div>
  );
}
