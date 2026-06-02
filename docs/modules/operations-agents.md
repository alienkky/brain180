# Brain180 v2 — 운영 보조 에이전트 정의

> Owner: 표본새[운영] · Issue ALI-70

이 문서는 Brain180 운영팀이 반복적으로 수행하는 작업을 자동화하거나 보조하는 AI 에이전트 3종을 정의합니다.

---

## 원칙

- 모든 에이전트는 **인간 최종 결정**을 전제로 작동합니다. 에이전트는 분류·초안·플래그를 제시하고, 실제 조치는 관리자가 내립니다.
- 민감 데이터(이메일, 이름)는 에이전트 컨텍스트에 포함하지 않습니다. ID나 익명화된 식별자만 전달합니다.
- 에이전트 응답은 `multica issue comment add` 를 통해 해당 이슈에 기록됩니다.

---

## 에이전트 1: brain180-content-curator

### 역할

관리자가 업로드한 텍스트 콘텐츠의 Brain180 3축 적합도를 사전 검증합니다.

### 호출 트리거

- 관리자가 새 레슨 텍스트를 `text_excerpts` 테이블에 저장할 때.
- 또는 관리자 대시보드 "콘텐츠 검증" 버튼 클릭 시.

### 입력

```json
{
  "lesson_id": "uuid",
  "text_body": "...",
  "axis_focus": "cognition | value | time"
}
```

### 출력 (JSON)

```json
{
  "cognitive_fit": 0–100,
  "value_fit": 0–100,
  "time_fit": 0–100,
  "primary_axis": "cognition | value | time",
  "concerns": ["복잡도 과다 (800자 초과)", "시간 축 단서 부족"],
  "recommendation": "approve | review | reject",
  "note": "텍스트 요약 + 판단 근거 1–2문장"
}
```

### 권한 범위

- READ: `text_excerpts`, `lessons`
- WRITE: 없음 (읽기 전용 분석)

### 구현 위치

`server/ai/ops/content-curator.ts`

---

## 에이전트 2: brain180-tutor-quality

### 역할

별점 ≤2 또는 무응답 상태의 튜터 메시지를 자동 검토하고, 프롬프트 개선 제안을 작성합니다.

### 호출 트리거

- 매일 09:00 KST 배치: 전날 별점 ≤2인 `tutor_messages` 목록 처리.
- 또는 관리자 대시보드 "품질 검토" 버튼 클릭.

### 입력

```json
{
  "message_id": "uuid",
  "user_message": "...",
  "assistant_response": "...",
  "rating": 1–2,
  "feedback": "optional user comment",
  "canvas_mode": "free | constrained | guided",
  "axis_focus": "cognition | value | time"
}
```

### 출력

```json
{
  "issue_category": "off_topic | too_vague | too_direct | wrong_axis | other",
  "severity": "low | medium | high",
  "prompt_suggestion": "구체적인 프롬프트 수정 제안 (1–3문장)",
  "example_rewrite": "이상적인 응답 예시 (선택)"
}
```

### 권한 범위

- READ: `tutor_messages`, `tutor_ratings`, `learning_sessions`
- WRITE: 없음 (제안만)

### 구현 위치

`server/ai/ops/tutor-quality.ts`

---

## 에이전트 3: brain180-signup-triage

### 역할

신규 가입 신청을 자동 분류하여 관리자 승인 작업을 줄입니다. 부정행위 패턴(중복 계정, 봇 가입)을 탐지합니다.

> **⚠️ 주의:** AUTO_APPROVE_STUDENTS=true 환경에서는 이 에이전트가 불필요합니다. B2B/비공개 코스 운영 시 유효합니다.

### 호출 트리거

- 새 사용자 `status=pending_approval` 생성 시 (webhook 또는 배치).

### 입력

```json
{
  "user_id": "uuid",
  "email_domain": "gmail.com",
  "name_length": 5,
  "created_at": "ISO8601",
  "ip_hash": "sha256(IP)"
}
```

### 출력

```json
{
  "recommendation": "approve | review | reject",
  "flags": ["disposable_email_domain", "duplicate_ip_24h", "suspicious_name_pattern"],
  "confidence": 0.0–1.0,
  "note": "판단 근거 1문장"
}
```

### 권한 범위

- READ: `users` (익명화된 필드만)
- WRITE: 없음 (관리자가 최종 결정)

### 구현 위치

`server/ai/ops/signup-triage.ts`

---

## 배포 형태

현재 이 3개 에이전트는 **서버 함수**로 구현됩니다 (`server/ai/ops/`). Multica 에이전트 시스템 연동은 차기 스프린트에서 진행합니다.

관리자 대시보드 UI (`/admin/quality`, `/admin/signup`)에서 트리거하거나, 배치 잡에서 자동 호출합니다.
