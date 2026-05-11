import type { CognitiveMap, Field } from "../../types/cognitive"
import littlePrinceFox from "./little-prince-fox"
import popperPositivism from "./popper-positivism"

export interface TextMeta {
  id: string
  title: string
  author: string
  field: Field
  difficulty: 1 | 2 | 3
  description: string
  map: CognitiveMap
}

export const TEXT_LIBRARY: TextMeta[] = [
  {
    id: littlePrinceFox.id,
    title: littlePrinceFox.textSource.title,
    author: littlePrinceFox.textSource.author,
    field: littlePrinceFox.textSource.field,
    difficulty: 1,
    description: "관계 맺기로 익명에서 유일한 존재로 변환되는 사랑의 본질",
    map: littlePrinceFox,
  },
  {
    id: popperPositivism.id,
    title: popperPositivism.textSource.title,
    author: popperPositivism.textSource.author,
    field: popperPositivism.textSource.field,
    difficulty: 3,
    description: "지식의 분류와 과학적 방법 — 검증과 반증, 두 입장의 분기와 통합",
    map: popperPositivism,
  },
]

export function getMapById(id: string): CognitiveMap {
  const meta = TEXT_LIBRARY.find((m) => m.id === id)
  return meta?.map ?? TEXT_LIBRARY[0].map
}

export const FIELD_LABELS: Record<Field, string> = {
  science: "과학·수학",
  philosophy: "철학",
  literature: "문학",
  art: "예술·음악",
  economics: "경제·사회",
  eastern: "동양 고전",
}

// Warm earth-tone palette aligned with the soft-skill design system
export const FIELD_COLORS: Record<Field, string> = {
  science: "#6F8AA8",        // dusty blue
  philosophy: "#8F7FA8",     // muted lavender
  literature: "#B85C3F",     // terracotta (accent)
  art: "#C68A3D",            // warm amber
  economics: "#6B8B6E",      // sage green
  eastern: "#A0533F",        // baked clay
}
