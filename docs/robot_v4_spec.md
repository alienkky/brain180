# Brain180 Robot v4 — 설계 명세서 (Draft 0.1)

> 위치 제안: `brain180-v4/docs/robot_v4_spec.md`
> 원칙: 로봇 버전은 "화면 없는 채점기"가 아니라 **구술 설명 코치**다.
> 두뇌(v4 채점 모델)는 프로그램 버전과 공유하고, 몸과 인터페이스만 다르다.

---

## PART 1. 말더듬·비문 처리 파이프라인 (3-레이어)

### 설계 철학 (한 줄)

> **ASR을 완벽하게 만들려 하지 말고, 불완전한 전사를 "평가 가능한 내용"으로
> 변환하는 층을 하나 끼운다.** 그리고 유창성은 절대 감점하지 않는다.

아이의 말더듬·비문은 버그가 아니라 데이터다. 억지로 없애면 안 되고,
**원본 보존 + 정규화 병행**이 정답이다.

### Layer 1 — 청취 (ASR: SenseVoice)

| 항목 | 설정 | 이유 |
|------|------|------|
| VAD 종료 판정 | 침묵 1.5~2.0초 (성인 기본값보다 길게) | 아이는 생각하며 말이 끊긴다. 짧으면 로봇이 말을 자름 |
| 명시적 종료 신호 | "끝!" 발화 시 종료 (세션 시작 때 안내) | VAD 오판 대비 이중 안전장치 |
| 원음 보관 | 세션별 wav 저장 (보존 정책은 PART 3) | 나중에 ASR 개선·재전사 가능하게 |
| 타임스탬프 | 발화 세그먼트별 기록 | 어느 지점에서 막혔는지 분석 가능 |

**재질문 프로토콜:** 전사 결과의 [불명확] 비율이 30%를 넘으면
로봇이 딱 **1회만** 되묻는다: *"한 번만 다시 말해줄래? 천천히 해도 돼."*
2회 이상 되물으면 아이가 위축되므로 금지. 그래도 불명확하면
들린 부분만으로 평가하고 `low_confidence` 플래그를 기록한다.

### Layer 2 — 정규화 (LLM 전처리 패스)

ASR 원문(raw)을 채점 가능한 정규화 전사(normalized)로 변환하는
별도 LLM 호출. **이 층이 말더듬·비문 문제의 핵심 해법이다.**

변환 규칙 (프롬프트에 그대로 사용):

```
당신은 아동 발화 전사 정규화 전문가입니다. 아래 음성 인식 원문을
평가용 정규화 전사로 변환하십시오.

규칙:
1. 필러 제거: "어", "음", "그니까", "막", "약간" 등 의미 없는 간투사 삭제
2. 반복 병합: "그게 그게 그러니까 물이" → "물이" (말더듬 반복은 1회로)
3. 자기수정 반영: "3개, 아니 4개" → "4개" (아이의 최종 의도 채택)
4. 비문 최소 복원: 조사·어순만 바로잡고, 아이가 말하지 않은 내용은
   절대 추가하지 않는다 (내용 추가 = 치명적 오류)
5. 알아들을 수 없는 구간: [불명확] 으로 표기 (추측 금지)
6. 출력: JSON — {"normalized": "...", "disfluency": {"filler": n,
   "repeat": n, "self_correct": n, "unclear": n}}

원문: {raw_transcript}
```

핵심 안전장치는 규칙 4번이다. 정규화 LLM이 아이 대신 말을 지어내면
평가 전체가 오염된다. 골든셋 검증 때 이 층의 "내용 추가율 0%"를
별도로 테스트할 것.

### Layer 3 — 평가 (v4 채점 모델)

- 평가 입력은 **normalized만** 사용. raw는 기록용.
- disfluency 통계는 **점수에 반영하지 않고** 메타데이터로만 저장.
  (장기적으로 "설명이 유창해지는 추이"를 부모 리포트에 쓸 수 있는 자산)
- 구술 전용 루브릭 보정 원칙:
  - 서면 기준의 "문장 완결성" 항목은 구술에서 **평가 제외**
  - "핵심 개념 언급 여부"와 "인과 연결"만 평가 (내용 중심)
  - 이 보정본은 `rubric/v4/rubric_v4_oral.md` 로 분리 관리
    (원본 rubric_v4.md 는 건드리지 않는다)

---

## PART 2. 3단계(추론적 이해) 기반 로봇 답변 로직

### 원칙: 점수는 속으로, 코칭은 겉으로

로봇은 아이에게 "3점이야"라고 말하지 않는다. 점수는 DB에 기록하고,
입 밖으로는 **코칭 언어**만 낸다. 심판이 아니라 코치이므로.

### 답변 구조 (고정 3박자, 한 호흡 분량)

```
① 인정 (1문장) — 아이가 맞게 설명한 지점을 "구체적으로" 짚는다
② 조언 (1문장) — 루브릭 기준 중 미충족 항목 "딱 하나만" 고른다
③ 유도 질문 (1문장) — 그 빈틈을 스스로 메우게 하는 열린 질문
```

세 문장 초과 금지. 아이의 주의 지속 시간과 TTS 길이를 고려한 하드 리밋.

### 로봇 시스템 프롬프트 (전문)

```
당신은 Brain180 설명 코치 로봇입니다. 초등학생이 지문 내용을
말로 설명하면, v4 채점기준 3단계(추론적 이해)로 내부 평가한 뒤
코칭 답변을 합니다.

[내부 평가 — 출력하지 않음]
- 아래 3단계 기준으로 0~4점 채점: {rubric_v4_stage3_criteria}
- 충족/미충족 기준 항목을 식별

[출력 형식 — 반드시 JSON]
{
  "internal": {"score": 0-4, "met": [...], "unmet": [...]},
  "speech": "①인정 ②조언 ③유도질문 — 정확히 3문장, 한국어 존대 없는
             다정한 반말, 60자 내외/문장"
}

[말투 규칙]
- 점수·등급·단계 명칭을 아이에게 절대 언급하지 않는다
- "틀렸어" 금지 → "여기까지 왔네, 그럼 ~는 어떻게 될까?" 방식
- 조언은 반드시 unmet 항목 중 가장 도달 가까운 것 하나만
- 아이가 말한 단어를 최소 1개 인용해서 "들었다"는 신호를 준다

[입력]
지문 요약: {passage_summary}
아이의 설명(정규화): {normalized_transcript}
```

`speech`는 TTS로 발화, `internal`은 DB에 기록된다. 이 분리가
"코치의 얼굴 + 채점기의 두뇌"를 동시에 만족시키는 구조다.

### 응답 예시 (감 잡기용 더미)

> 아이: "물이 하늘로 올라가서... 어... 구름이 되고, 그래서 비가 와요"
>
> 로봇: "물이 올라가서 구름이 된다는 거, 정확하게 봤어!
> 그런데 물이 '왜' 하늘로 올라가는지가 궁금하네.
> 해가 물을 어떻게 하는 걸까?"
>
> (internal: score 2/4, met: [현상 순서 파악], unmet: [원인-결과 연결])

---

## PART 3. 데이터 저장 스키마 (확인·발전의 기반)

### 저장 위치

Multica 서버의 기존 PostgreSQL(pgvector) 활용 권장.
새 DB `brain180_robot` 생성. 로봇 서버(xiaozhi-esp32-server)에서
세션 종료 시 일괄 기록.

### DDL (그대로 실행 가능)

```sql
CREATE TABLE learners (
  learner_id   SERIAL PRIMARY KEY,
  nickname     TEXT NOT NULL,           -- 실명 저장 금지, 별칭만
  birth_year   INT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sessions (
  session_id   SERIAL PRIMARY KEY,
  learner_id   INT REFERENCES learners(learner_id),
  passage_ref  TEXT,                    -- 지문 식별자 (원문 아닌 참조키)
  target_stage INT NOT NULL,            -- 이번 세션의 목표 단계 (예: 3)
  started_at   TIMESTAMPTZ DEFAULT now(),
  ended_at     TIMESTAMPTZ,
  device       TEXT DEFAULT 'cores3'
);

CREATE TABLE utterances (
  utt_id           SERIAL PRIMARY KEY,
  session_id       INT REFERENCES sessions(session_id),
  seq              INT NOT NULL,        -- 세션 내 발화 순번
  audio_path       TEXT,                -- 원음 파일 경로 (보존 정책 적용)
  raw_transcript   TEXT NOT NULL,       -- ASR 원문 (보존!)
  normalized       TEXT NOT NULL,       -- Layer 2 결과
  disfluency       JSONB,               -- {"filler":n,"repeat":n,...}
  low_confidence   BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE evaluations (
  eval_id      SERIAL PRIMARY KEY,
  utt_id       INT REFERENCES utterances(utt_id),
  rubric_ver   TEXT NOT NULL DEFAULT 'v4-oral-0.1',  -- 루브릭 버전 추적!
  stage        INT NOT NULL,
  score        INT NOT NULL,
  max_score    INT NOT NULL,
  met          JSONB,                   -- 충족 기준 목록
  unmet        JSONB,                   -- 미충족 기준 목록
  robot_speech TEXT NOT NULL,           -- 실제 발화한 코칭 문장
  model_name   TEXT,                    -- 어떤 모델이 채점했는지
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

### 이 스키마가 열어주는 "나중" 3가지

1. **크로스 시나리오 (Q2 실현)** — 프로그램 버전의 서면 채점 결과와
   `learner_id`로 조인하면 "쓰기에서 약한 단계를 로봇이 골라 설명시키는"
   패키지가 SQL 한 줄로 가능해진다.
2. **성장 리포트** — disfluency 추이 + score 추이 = 부모용 월간 리포트 원료.
3. **모델 개선 루프** — raw/normalized/score가 쌓이면 그 자체가
   차기 LoRA 학습 데이터다. `rubric_ver` 컬럼 덕에 루브릭이 바뀌어도
   과거 데이터를 재해석할 수 있다.

### 프라이버시 최소 원칙

- 실명 대신 별칭, 지문 원문 대신 참조키 (기밀·개인정보 이중 보호)
- 원음(wav)은 기본 30일 후 자동 삭제, 전사만 영구 보존
  (부모 동의 시 연장) — cron 한 줄이면 된다

---

## PART 4. 구현 순서 (v4 프로그램 트랙과의 교차점)

```
[프로그램 트랙]  STEP 1-3 골든셋  →  STEP 4 베이스라인  →  LoRA
                                         │
[로봇 트랙]                              └→ R1. 구술 루브릭 보정본 작성
                                            R2. Layer 2 정규화 프롬프트 검증
                                                (용훈·진아 음성으로 ASR 인식률 측정 포함)
                                            R3. DB 스키마 생성 + 세션 기록 연동
                                            R4. 3단계 코치 프롬프트 파일럿
                                            R5. 시뮬레이션 영상 (국문/영문)
```

로봇 트랙은 프로그램 트랙의 STEP 4가 끝난 뒤 시작해도 늦지 않다.
단, **R2의 아동 음성 인식률 측정만은 지금 당장 해도 된다** —
여기가 뚫리는지가 로봇 버전 전체의 성립 조건이므로.
