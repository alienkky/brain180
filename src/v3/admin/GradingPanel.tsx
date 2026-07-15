// v4 채점 콘솔 — 관리자 전용 탭 (Phase 2 이식).
// AI는 밴드를 '제안'만 하고, 저장되는 점수는 관리자가 확정한 밴드다 (점수 결정권 규칙).
// 루브릭(rubric_v4.md)은 서버가 매 요청 재로드하므로 파일 수정 즉시 다음 채점에 반영된다.
import { useEffect, useRef, useState } from "react";

const STAGES = [
  { v: 1, label: "① 정밀 포착 — 장치어 앞에서 멈췄는가" },
  { v: 2, label: "② 구조 복원 — 저자의 설계도를 그렸는가" },
  { v: 3, label: "③ 렌즈 발견 — 내용에서 렌즈로 올라갔는가" },
  { v: 4, label: "④ 저자 되어보기 — 저자의 입장에서 설명하는가" },
  { v: 5, label: "⑤ 렌즈 재배선 — 렌즈가 자기 문제의 도구가 됐는가" },
];

interface Status {
  endpoint: string;
  model: string;
  server: string;
  rubric_found: boolean;
}
interface GoldenStats {
  total: number;
  stage_dist: Record<string, number>;
  borderline: number;
  next_id: string;
}
interface SessionRow {
  session_id: string;
  user_name: string;
  lesson_title: string;
  saved_at: string;
  has_stage: Record<"1" | "2" | "3", boolean>;
}
interface SessionDetail {
  user_name: string;
  lesson_title: string;
  excerpt: string;
  stages: Record<"1" | "2" | "3", { description: string }>;
}

// v3 학습 3부 ↔ 채점 문항·기본 채점 항목 매핑 (부별 표준 문항은 v3 STAGE_DESCRIPTIONS 기준)
const PART_INFO: Record<1 | 2 | 3, { question: string; defaultStage: number; label: string }> = {
  1: {
    label: "1부 · 글의 내용 이해하기",
    question: "텍스트에서 핵심 단어를 추출하고, 구조적으로 시각화한 뒤 설명하세요.",
    defaultStage: 2, // ② 구조 복원
  },
  2: {
    label: "2부 · 저자의 인지구조 이해하기",
    question: "저자가 어떤 대상을 어떤 렌즈로 바라봤는지 도표화하고 설명하세요.",
    defaultStage: 3, // ③ 렌즈 발견
  },
  3: {
    label: "3부 · 저자의 렌즈로 자신의 뇌 셋팅",
    question: "1부와 2부를 종합하여 한 편의 글을 완성하세요.",
    defaultStage: 5, // ⑤ 렌즈 재배선
  },
};

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`http ${r.status}`);
  return (await r.json()).data as T;
}

export function GradingPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [stats, setStats] = useState<GoldenStats | null>(null);
  const [stage, setStage] = useState(3);
  const [passage, setPassage] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [aiOut, setAiOut] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [band, setBand] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<"clear" | "borderline">("clear");
  const [note, setNote] = useState("");
  const [rationale, setRationale] = useState("");
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [loadingPick, setLoadingPick] = useState<string | null>(null);
  const [pickedFrom, setPickedFrom] = useState<string | null>(null);
  const outRef = useRef<HTMLPreElement>(null);

  const refresh = () => {
    getJson<Status>("/api/grading/status").then(setStatus).catch(() => setStatus(null));
    getJson<GoldenStats>("/api/grading/golden/stats").then(setStats).catch(() => setStats(null));
  };
  useEffect(refresh, []);

  const openPicker = () => {
    setPickerOpen((v) => !v);
    if (!sessions) {
      getJson<{ sessions: SessionRow[] }>("/api/grading/sessions")
        .then((d) => setSessions(d.sessions))
        .catch(() => setSessions([]));
    }
  };

  // 세션의 특정 부(1~3) 설명을 채점 대상으로 채움
  const pickPart = async (sessionId: string, part: 1 | 2 | 3) => {
    setLoadingPick(`${sessionId}:${part}`);
    try {
      const d = await getJson<SessionDetail>(`/api/grading/sessions/${sessionId}`);
      const desc = d.stages[String(part) as "1" | "2" | "3"]?.description ?? "";
      if (!desc) {
        alert("해당 부의 설명이 비어 있습니다.");
        return;
      }
      const info = PART_INFO[part];
      setPassage(d.excerpt || "(레슨 발췌 없음 — 직접 입력)");
      setQuestion(info.question);
      setAnswer(desc);
      setStage(info.defaultStage);
      setPickedFrom(`${d.user_name} · ${d.lesson_title} · ${info.label}`);
      setAiOut("");
      setBand(null);
      setRationale("");
      setSaveMsg(null);
      setPickerOpen(false);
    } catch {
      alert("세션 불러오기 실패");
    } finally {
      setLoadingPick(null);
    }
  };

  const grade = async () => {
    if (!passage.trim() || !question.trim() || !answer.trim()) {
      alert("지문·문항·학생 응답을 모두 입력하세요.");
      return;
    }
    setGrading(true);
    setAiOut("");
    setBand(null);
    setSaveMsg(null);
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    let acc = "";
    try {
      const r = await fetch("/api/grading/grade", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, passage, question, answer }),
      });
      if (!r.ok || !r.body) {
        setAiOut(`[오류] http ${r.status}`);
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const f of frames) {
          if (!f.startsWith("data: ")) continue;
          const d = JSON.parse(f.slice(6)) as { t?: string; error?: string };
          if (d.t) {
            acc += d.t;
            setAiOut(acc);
            outRef.current?.scrollTo(0, 1e9);
          }
          if (d.error) acc += `\n[오류] ${d.error}`;
        }
      }
      setRationale(acc);
    } finally {
      clearInterval(timer);
      setGrading(false);
    }
  };

  const save = async () => {
    if (!band) return;
    const r = await fetch("/api/grading/golden", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, passage, question, answer, score: band, rationale, difficulty, note }),
    });
    if (r.ok) {
      const data = (await r.json()).data as { id: string };
      setSaveMsg({ ok: true, text: `저장됨: ${data.id}` });
      refresh();
    } else {
      setSaveMsg({ ok: false, text: `저장 실패 (http ${r.status})` });
    }
  };

  const aiSuggested = aiOut.match(/점수: (\d)\/5/)?.[1];
  const inputCls =
    "w-full border border-brain-border rounded-lg px-3 py-2 text-sm bg-brain-surface text-brain-text focus:outline-none focus:ring-1 focus:ring-brain-accent";

  return (
    <div className="p-6 max-w-6xl space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-brain-text">v4 채점 콘솔</h2>
        <span className="text-xs text-brain-text-muted">
          AI는 제안만 — 저장 점수는 관리자가 확정한 밴드
        </span>
        <span className="ml-auto text-xs text-brain-text-muted">
          {status ? (
            <>
              모델 <b className="text-brain-text">{status.model}</b> · vLLM{" "}
              <b className={status.server === "online" ? "text-green-600" : "text-red-500"}>
                {status.server}
              </b>
              {!status.rubric_found && <b className="text-red-500"> · 루브릭 없음</b>}
            </>
          ) : (
            "상태 확인 중…"
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 좌: 채점 대상 */}
        <div className="bg-brain-surface border border-brain-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-brain-text-muted uppercase tracking-wide">
              1 · 채점 대상
            </h3>
            <button
              onClick={openPicker}
              className="text-xs bg-brain-accent-soft text-brain-accent px-3 py-1.5 rounded-lg font-medium hover:opacity-80 transition-opacity"
            >
              📥 학습 기록에서 불러오기
            </button>
          </div>

          {pickerOpen && (
            <div className="border border-brain-border rounded-lg max-h-64 overflow-y-auto divide-y divide-brain-border">
              {sessions === null && (
                <div className="p-3 text-xs text-brain-text-muted">불러오는 중…</div>
              )}
              {sessions?.length === 0 && (
                <div className="p-3 text-xs text-brain-text-muted">
                  v3 학습 기록이 없습니다. 학습자가 세션을 진행하면 여기에 나타납니다.
                </div>
              )}
              {sessions?.map((s) => (
                <div key={s.session_id} className="p-2.5 flex items-center gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-brain-text truncate">{s.lesson_title}</div>
                    <div className="text-brain-text-muted truncate">
                      {s.user_name} · {new Date(s.saved_at).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                  {([1, 2, 3] as const).map((p) => (
                    <button
                      key={p}
                      disabled={!s.has_stage[String(p) as "1" | "2" | "3"] || loadingPick !== null}
                      onClick={() => pickPart(s.session_id, p)}
                      title={PART_INFO[p].label}
                      className={`shrink-0 px-2 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
                        s.has_stage[String(p) as "1" | "2" | "3"]
                          ? "bg-brain-surface-soft text-brain-text border-brain-border hover:bg-brain-accent-soft hover:text-brain-accent"
                          : "opacity-30 cursor-not-allowed border-brain-border text-brain-text-muted"
                      }`}
                    >
                      {loadingPick === `${s.session_id}:${p}` ? "…" : `${p}부`}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {pickedFrom && (
            <div className="text-[11px] text-brain-accent bg-brain-accent-soft rounded-md px-2.5 py-1.5">
              📥 불러옴: {pickedFrom}
            </div>
          )}

          <select value={stage} onChange={(e) => setStage(Number(e.target.value))} className={inputCls}>
            {STAGES.map((s) => (
              <option key={s.v} value={s.v}>
                {s.label}
              </option>
            ))}
          </select>
          <textarea
            value={passage}
            onChange={(e) => setPassage(e.target.value)}
            placeholder="지문 발췌 — 채점에 필요한 부분만 (원문 전체 금지)"
            className={`${inputCls} min-h-[70px] resize-y`}
          />
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="문항"
            className={`${inputCls} min-h-[44px] resize-y`}
          />
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="학생 응답 — 실명 등 개인정보 제거 후 입력"
            className={`${inputCls} min-h-[110px] resize-y`}
          />
          <button
            onClick={grade}
            disabled={grading}
            className="w-full bg-brain-accent text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 transition-opacity"
          >
            {grading ? `AI 채점 중… ${elapsed}s (2~4분 정상)` : "AI 채점 (제안)"}
          </button>
        </div>

        {/* 우: 제안 → 확정 → 저장 */}
        <div className="bg-brain-surface border border-brain-border rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-brain-text-muted uppercase tracking-wide">
            2 · AI 제안 → 관리자 확정
          </h3>
          <pre
            ref={outRef}
            className="whitespace-pre-wrap text-xs bg-brain-surface-soft border border-brain-border rounded-lg p-3 min-h-[140px] max-h-72 overflow-y-auto text-brain-text font-mono"
          >
            {aiOut || "여기에 AI의 밴드 제안과 근거가 스트리밍됩니다."}
          </pre>
          {aiSuggested && (
            <div className="text-xs text-brain-text-muted">
              AI 제안: <b className="text-brain-accent">Lv.{aiSuggested}</b> — 아래에서 최종 밴드를
              직접 확정하세요 (제안과 달라도 됨)
            </div>
          )}
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((b) => (
              <button
                key={b}
                onClick={() => setBand(b)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                  band === b
                    ? "bg-brain-accent text-white border-brain-accent"
                    : "bg-brain-accent-soft text-brain-text border-brain-border hover:opacity-80"
                }`}
              >
                Lv.{b}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as "clear" | "borderline")}
              className={inputCls}
            >
              <option value="clear">clear — 판정 명확</option>
              <option value="borderline">borderline — 경계 사례 (목표 30%+)</option>
            </select>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="메모 (선택)"
              className={inputCls}
            />
          </div>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="근거 문장 — AI 제안이 자동 복사됨, 수정 가능 (루브릭 조항 인용 유지)"
            className={`${inputCls} min-h-[80px] resize-y`}
          />
          <button
            onClick={save}
            disabled={!band || grading}
            className="w-full bg-brain-text text-brain-bg rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            골든셋에 저장 (golden_v4.jsonl)
          </button>
          {saveMsg && (
            <div className={`text-xs font-medium ${saveMsg.ok ? "text-green-600" : "text-red-500"}`}>
              {saveMsg.text}
            </div>
          )}
          {stats && (
            <div className="text-xs text-brain-text-muted leading-relaxed border-t border-brain-border pt-3">
              골든셋 <b className="text-brain-text">{stats.total}</b>/20건 · borderline{" "}
              <b className="text-brain-text">
                {stats.total ? Math.round((stats.borderline / stats.total) * 100) : 0}%
              </b>{" "}
              (목표 30%+) · 다음 id <b className="text-brain-text">{stats.next_id}</b>
              <div className="flex gap-3 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s}>
                    {["", "①", "②", "③", "④", "⑤"][s]} {stats.stage_dist[s] ?? 0}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="text-[11px] text-brain-text-muted">
            루브릭(rubric_v4.md) 수정 → 파일 저장만 하면 다음 채점부터 즉시 반영.
          </div>
        </div>
      </div>
    </div>
  );
}
