// ALI-82: 첫 로그인 온보딩 모달 시퀀스 (5 스텝).
// localStorage 'brain180_onboarded' = '1' 로 완료 표시. 재시청: MethodologyScreen.

import { useState } from "react";

const ONBOARDING_KEY = "brain180_onboarded";

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboarded() {
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

interface Step {
  title: string;
  icon: string;
  body: string;
  detail?: string;
}

const STEPS: Step[] = [
  {
    title: "Brain180이란",
    icon: "🧠",
    body: "천재의 지식이 아니라, 그들의 사고 구조를 봅니다.",
    detail:
      "일반 독서는 텍스트의 내용을 파악합니다. Brain180은 텍스트 뒤에 숨겨진 저자의 뇌인지 구조를 추출하고 시각화합니다.",
  },
  {
    title: "3가지 인지 축",
    icon: "🛸",
    body: "모든 천재의 사고는 3개의 축으로 해부됩니다.",
    detail:
      "인지(Cognition) — 어떻게 논리를 구성하는가\n가치(Value) — 무엇을 중요하게 여기는가\n시간(Time) — 언제, 왜 그 시점인가",
  },
  {
    title: "학습 사이클",
    icon: "🔁",
    body: "텍스트 → 캔버스 → 튜터 → 평가의 4단계.",
    detail:
      "① 고전 텍스트를 읽습니다\n② 뇌인지 구조 패턴을 캔버스에 그립니다\n③ AI 튜터와 대화하며 구조를 다듬습니다\n④ 자기평가로 성장을 확인합니다",
  },
  {
    title: "첫 작품 추천",
    icon: "📖",
    body: "어린왕자와 여우의 대화로 시작해보세요.",
    detail:
      "생텍쥐페리의 이 짧은 텍스트는 시간(Time) 축이 두드러집니다. 관계, 길들임, 시간의 의미를 3축으로 분해해보세요. 5분 안에 첫 캔버스를 완성할 수 있습니다.",
  },
  {
    title: "준비 완료",
    icon: "✨",
    body: "언제든지 헤더의 ? 버튼으로 이 소개를 다시 볼 수 있습니다.",
    detail: "라이브러리에서 레슨을 선택하면 학습이 시작됩니다. 즐거운 탐구 되세요!",
  },
];

interface Props {
  onClose: () => void;
}

export function OnboardingFlow({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  function finish() {
    markOnboarded();
    onClose();
  }

  function skip() {
    markOnboarded();
    onClose();
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-md rounded-2xl bg-brain-surface shadow-2xl">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="block rounded-full transition-all"
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                background: i === step ? "var(--color-brain-accent)" : "var(--color-brain-border)",
              }}
            />
          ))}
        </div>

        <div className="px-8 pb-4 pt-6 text-center">
          <div className="mb-4 text-5xl">{current.icon}</div>
          <h2 className="mb-2 text-xl font-bold text-brain-text">{current.title}</h2>
          <p className="mb-3 text-base font-medium text-brain-accent">{current.body}</p>
          {current.detail && (
            <p className="whitespace-pre-line text-sm text-brain-text-muted">{current.detail}</p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-brain-border px-8 py-4">
          <button
            className="text-sm text-brain-text-muted hover:text-brain-text"
            onClick={skip}
          >
            건너뛰기
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                className="rounded-lg border border-brain-border px-4 py-2 text-sm text-brain-text hover:bg-brain-surface-soft"
                onClick={() => setStep((s) => s - 1)}
              >
                이전
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                className="rounded-lg bg-brain-accent px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                onClick={() => setStep((s) => s + 1)}
              >
                다음
              </button>
            ) : (
              <button
                className="rounded-lg bg-brain-accent px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                onClick={finish}
              >
                시작하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
