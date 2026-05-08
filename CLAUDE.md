# Brain180 — 천재의 뇌인지 구조 시각화 프로그램

> Claude Code가 이 프로젝트에서 작업할 때 항상 읽어야 할 규칙과 컨텍스트.

---

## 프로젝트 개요

**Brain180** — 각 분야 천재들의 고전 텍스트에서 그들의 **지식(WHAT)**이 아닌  
**뇌인지 구조(HOW THEY THINK)**를 시각화하여, 4차원적 글 해석 능력을 기르는 학습 시각화 프로그램.

### 핵심 철학

> "천재의 글을 읽는 것이 아니라, 천재의 뇌로 보는 것."

일반적인 독서는 텍스트의 **내용**을 파악한다.  
Brain180은 텍스트 뒤에 숨겨진 저자의 **사고 구조**를 추출하고 시각화한다.

---

## 학습 사이클

① 고전 텍스트 제시
        ↓
② 뇌인지 구조 패턴 추출  ← 핵심 훈련
        ↓
③ 4차원 시각화 이미지 생성
        ↓
④ 시각화 → 텍스트 역해석  ← 역방향 훈련
        ↓
⑤ 반복을 통한 4차원 독해 능력 내재화

### 4차원적 해석 정의

| 차원 | 읽기 방식 | 포착하는 것 |
|---|---|---|
| 1차원 | 선형적 읽기 | 단어 → 문장 → 단락 |
| 2차원 | 구조적 읽기 | 논리 구조, 계층 |
| 3차원 | 공간적 읽기 | 개념들의 관계망 |
| 4차원 | 인지적 읽기 | 저자의 사고 흐름 + 시간성 + 패턴 |

---

## 콘텐츠 구조

### 수록 분야 및 텍스트

| 분야 | 대표 인물 |
|---|---|
| 과학 / 수학 | 뉴턴, 아인슈타인, 튜링, 괴델 |
| 철학 | 플라톤, 칸트, 비트겐슈타인, 니체 |
| 문학 | 셰익스피어, 도스토옙스키, 카프카 |
| 예술 / 음악 | 레오나르도 다 빈치, 바흐, 베토벤 |
| 경제 / 사회 | 애덤 스미스, 케인스, 맑스 |
| 동양 고전 | 논어(공자), 도덕경(노자), 손자병법 |

### 시각화 유형

- **노드 그래프**: 개념 간 관계망 (공간적 배치)
- **흐름도**: 사고의 시간적 전개 순서
- **레이어 맵**: 인지 구조의 다층성 (표층 → 심층)
- **패턴 매핑**: 저자가 반복 사용하는 사고 패턴

---

## 프로그램 구성

### 학습 모드

1. **분석 모드** — 텍스트 → 시각화 (뇌인지 구조 추출 훈련)
2. **역해석 모드** — 시각화 → 텍스트 재이해 (역방향 훈련)
3. **비교 모드** — 서로 다른 천재들의 인지 구조 나란히 비교
4. **연습 모드** — 사용자가 직접 시각화를 생성하고 피드백 수령

### 핵심 기능

- 텍스트 구절 하이라이팅 + 인지 패턴 태깅
- 드래그 앤 드롭 시각화 캔버스
- AI 보조 패턴 제안 및 힌트
- 학습자 시각화 저장 / 공유
- 학습 진행도 추적

---

## 데이터 모델 (초안)

interface CognitiveMap {
  id: string
  textSource: TextExcerpt
  author: Genius
  field: Field
  nodes: CognitiveNode[]
  edges: CognitiveEdge[]
  layers: Layer[]
  patterns: Pattern[]
  createdBy: "system" | "user"
}

interface CognitiveNode {
  id: string
  concept: string
  type: "root" | "anchor" | "bridge" | "branch"
  dimensionality: 1 | 2 | 3 | 4
}

interface CognitiveEdge {
  from: string
  to: string
  relation: "causes" | "supports" | "contrasts" | "transforms" | "contains"
  temporalOrder: number
}

---

## 개발 원칙

### UX 원칙

1. **텍스트 ↔ 시각화 연동**: 한쪽 클릭 시 다른 쪽 하이라이트
2. **점진적 복잡성**: 처음엔 단순하게, 학습자 수준에 따라 단계적 노출
3. **정답 없음**: 학습자의 시각화가 달라도 틀린 것이 아님 — 과정이 목적
4. **역방향 강조**: 시각화 → 텍스트 방향 학습이 핵심

### 코드 원칙

1. **레이어 분리**: 텍스트 레이어와 시각화 레이어는 독립적 컴포넌트
2. **데이터 주도**: 텍스트 콘텐츠 하드코딩 금지, 데이터 파일(JSON/DB)에서 로드
3. **시각화 엔진 추상화**: 라이브러리는 교체 가능하도록 인터페이스 뒤에 숨김
4. **스키마 우선**: UI 작업 전 CognitiveMap 스키마를 먼저 정의

### 하지 말아야 할 것

| 금지 | 올바른 방법 |
|---|---|
| 텍스트 콘텐츠를 코드에 하드코딩 | 콘텐츠는 데이터 파일로 분리 |
| 시각화 레이어에서 직접 DOM 텍스트 조작 | 이벤트/상태를 통해 텍스트 레이어와 통신 |
| 특정 천재 인지 구조를 "유일한 정답"으로 제시 | 다양한 해석 가능성을 UI에서 열어둠 |

---

## 폴더 구조 (예정)

brain180/
├── src/
│   ├── core/
│   │   ├── CognitiveMap.ts
│   │   ├── PatternExtractor.ts
│   │   └── VisualizationEngine/
│   ├── components/
│   │   ├── TextLayer/
│   │   ├── VisualLayer/
│   │   └── ControlPanel/
│   └── data/
│       ├── geniuses/
│       └── texts/
├── docs/
│   └── methodology.md
└── CLAUDE.md

---

## 기술 스택 (확정 전)

- **Frontend**: TBD
- **시각화**: D3.js / Three.js / Cytoscape.js 중 검토
- **Backend**: TBD
- **AI 보조**: Claude API (패턴 제안, 힌트 생성)

---

## 커밋 전 체크리스트

grep -rn '"[가-힣A-Za-z].*[가-힣A-Za-z]"' src/components/ | grep -v ".test."
grep -rn 'TextLayer' src/components/VisualLayer/
grep -rn 'VisualLayer' src/components/TextLayer/
grep -rn 'as any' src/core/

---

_기술 스택 확정 및 개발 진행에 따라 지속 업데이트._
