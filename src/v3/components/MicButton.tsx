// 음성 → 텍스트 받아쓰기 버튼. 브라우저 내장 Web Speech API(무료, 서버 불필요).
// 인식된 문장을 onText 로 흘려보내 설명 입력란에 누적한다.
// 지원 안 하는 브라우저(일부 Safari 등)에선 버튼이 렌더되지 않음.

import { useEffect, useRef, useState } from "react";

// 타입 최소 정의 (브라우저 SpeechRecognition)
/* eslint-disable @typescript-eslint/no-explicit-any */
interface SR {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
}

function getRecognitionCtor(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

interface Props {
  /** 확정된 인식 텍스트를 호출자에 전달 (보통 textarea 에 append) */
  onText: (text: string) => void;
  className?: string;
}

export function MicButton({ onText, className }: Props) {
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const t = String(r[0]?.transcript ?? "").trim();
          if (t) onTextRef.current(t);
        }
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "받아쓰기 중지" : "음성으로 입력 (말하면 텍스트로 변환)"}
      className={
        (className ?? "") +
        " inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors " +
        (listening
          ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
          : "bg-brain-surface border border-brain-border text-brain-text-muted hover:border-brain-accent hover:text-brain-accent")
      }
    >
      {listening ? "● 듣는 중…" : "🎤 음성 입력"}
    </button>
  );
}
