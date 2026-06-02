// ALI-82: Brain180 방법론 소개 화면.
// 헤더의 ? 버튼으로 언제든 진입. 온보딩 다시보기 + 4차원 해석 표 + 시각화 유형.

interface Props {
  onClose: () => void;
}

const AXES = [
  {
    name: "인지 (Cognition)",
    color: "var(--color-brain-node-branch)",
    question: "어떻게 생각하는가",
    desc: "논리, 구조, 인과, 귀납/연역. 저자가 어떤 방식으로 아이디어를 쌓아올리는지 봅니다.",
    example: "뉴턴이 만유인력을 증명하는 논리 사슬 — 관찰 → 가설 → 수학적 검증",
  },
  {
    name: "가치 (Value)",
    color: "var(--color-brain-node-bridge)",
    question: "무엇을 중요하게 여기는가",
    desc: "판단, 윤리, 우선순위, 의미. 저자가 선택하고 강조하는 것들의 이유를 봅니다.",
    example: "노자의 도덕경 — 무위(無爲)를 최상의 가치로 놓는 근거",
  },
  {
    name: "시간 (Time)",
    color: "var(--color-brain-sage)",
    question: "언제, 왜 그 시점인가",
    desc: "맥락, 변화, 순서, 역사적 위치. 사고가 어떤 시간적 흐름 속에 있는지 봅니다.",
    example: "어린왕자 — 길들임이 가져오는 책임의 시간적 축적",
  },
];

const DIMENSIONS = [
  { n: "1차원", mode: "선형적 읽기", captures: "단어 → 문장 → 단락" },
  { n: "2차원", mode: "구조적 읽기", captures: "논리 구조, 계층" },
  { n: "3차원", mode: "공간적 읽기", captures: "개념들의 관계망" },
  { n: "4차원", mode: "인지적 읽기", captures: "저자의 사고 흐름 + 시간성 + 패턴" },
];

const VIZ_TYPES = [
  { name: "노드 그래프", desc: "개념 간 관계망 (공간적 배치)" },
  { name: "흐름도", desc: "사고의 시간적 전개 순서" },
  { name: "레이어 맵", desc: "인지 구조의 다층성 (표층 → 심층)" },
  { name: "패턴 매핑", desc: "저자가 반복 사용하는 사고 패턴" },
];

export function MethodologyScreen({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-40 overflow-auto bg-brain-bg">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brain-text">Brain180 방법론</h1>
            <p className="mt-1 text-sm text-brain-text-muted">
              천재의 글을 읽는 것이 아니라, 천재의 뇌로 보는 것.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-brain-border px-4 py-2 text-sm text-brain-text hover:bg-brain-surface"
          >
            닫기
          </button>
        </div>

        {/* 4차원 해석 */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-brain-text">4차원적 해석</h2>
          <div className="overflow-hidden rounded-xl border border-brain-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brain-surface-soft">
                  <th className="px-4 py-3 text-left font-semibold text-brain-text-muted">차원</th>
                  <th className="px-4 py-3 text-left font-semibold text-brain-text-muted">읽기 방식</th>
                  <th className="px-4 py-3 text-left font-semibold text-brain-text-muted">포착하는 것</th>
                </tr>
              </thead>
              <tbody>
                {DIMENSIONS.map((d, i) => (
                  <tr key={i} className="border-t border-brain-border">
                    <td className={`px-4 py-3 font-medium ${i === 3 ? "text-brain-accent" : "text-brain-text"}`}>
                      {d.n}
                    </td>
                    <td className="px-4 py-3 text-brain-text">{d.mode}</td>
                    <td className={`px-4 py-3 ${i === 3 ? "font-medium text-brain-accent" : "text-brain-text-muted"}`}>
                      {d.captures}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3축 */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-brain-text">3가지 인지 축</h2>
          <div className="flex flex-col gap-4">
            {AXES.map((ax) => (
              <div
                key={ax.name}
                className="rounded-xl border-l-4 bg-brain-surface p-5"
                style={{ borderColor: ax.color }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-bold text-brain-text" style={{ color: ax.color }}>
                    {ax.name}
                  </span>
                  <span className="text-sm text-brain-text-muted">— {ax.question}</span>
                </div>
                <p className="mb-2 text-sm text-brain-text">{ax.desc}</p>
                <p className="text-xs text-brain-text-muted italic">{ax.example}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 시각화 유형 */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-brain-text">시각화 유형</h2>
          <div className="grid grid-cols-2 gap-3">
            {VIZ_TYPES.map((v) => (
              <div key={v.name} className="rounded-xl border border-brain-border bg-brain-surface p-4">
                <p className="font-semibold text-brain-text">{v.name}</p>
                <p className="mt-1 text-sm text-brain-text-muted">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 학습 사이클 */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-brain-text">학습 사이클</h2>
          <div className="flex flex-wrap items-center gap-2">
            {["고전 텍스트", "패턴 추출", "4D 시각화", "역해석", "내재화"].map((s, i, arr) => (
              <div key={s} className="flex items-center gap-2">
                <span className="rounded-lg bg-brain-surface-soft px-4 py-2 text-sm font-medium text-brain-text">
                  {s}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-brain-text-muted">→</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="text-center">
          <button
            onClick={onClose}
            className="rounded-lg bg-brain-accent px-6 py-3 font-semibold text-white hover:opacity-90"
          >
            라이브러리로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
