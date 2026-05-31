# Brain180 v2 — API Contracts

> Owner: 연다리 [통합설계]
> Implementation: ALI-62 (schema) + ALI-66 (prompts) + ALI-67 (wire-up) + ALI-71 (QA)
> 본 문서는 **고정 계약**. 라우트 핸들러는 본 envelope을 지킨다. 변경 시 본 문서를 먼저 갱신.

## 0. 공통 규칙

### 0-1. JSON envelope
- 성공: `{ "data": <T>, "meta"?: { "ts": ISO8601, "request_id": uuid } }`
- 실패: `{ "error": "<snake_case_code>", "message"?: "<human>", "details"?: <T> }`
- 모든 시간: ISO 8601 UTC `2026-05-30T14:00:00.000Z`
- 모든 ID: UUID v7

### 0-2. 인증
- 세션 쿠키 `b180_session` (HttpOnly + Secure + SameSite=Lax)
- TTL 720h (30일), 슬라이딩 갱신 없음 (Lucia v3 기본)
- 인증 필요 라우트: 401 `{"error":"auth_required"}` 응답
- admin 필요: 403 `{"error":"admin_required"}`
- `must_change_password=true` 사용자는 `/api/auth/change-password` 외 모든 라우트 403 `{"error":"password_change_required"}`

### 0-3. 에러 코드 카탈로그
| 코드 | HTTP | 의미 |
|---|---|---|
| `auth_required` | 401 | 세션 없음/만료 |
| `admin_required` | 403 | admin 권한 필요 |
| `password_change_required` | 403 | must_change_password 게이트 |
| `email_taken` | 409 | 가입 이메일 중복 |
| `invalid_credentials` | 401 | 로그인 실패 |
| `weak_password` | 422 | 패스워드 정책 위반 |
| `validation_error` | 422 | 스키마 검증 실패 (zod) |
| `not_found` | 404 | 리소스 없음 |
| `rate_limited` | 429 | 분당 한도 초과 |
| `upstream_error` | 502 | Anthropic/Toss/R2 에러 |
| `service_unavailable` | 503 | MVP cut |
| `not_implemented` | 501 | 구현 대기 |

### 0-4. 패스워드 정책
- 최소 12자, 영문/숫자/기호 중 2종 이상
- argon2id 해시 (m=64MB, t=3, p=4)
- 평문 절대 저장/로그 금지

### 0-5. Rate limit (MVP 최소선)
- 인증 라우트(`/api/auth/*`): IP당 분당 20
- 튜터 채팅(`/api/tutor/chat`): user당 분당 30, 일일 200
- 그 외 인증된 라우트: user당 분당 60

---

## 1. Auth (`/api/auth`)

### 1-1. `POST /api/auth/register`
요청:
```json
{ "email": "user@example.com", "password": "string(>=12)", "name": "string(1..40)" }
```
응답 200: `{ "data": { "user": <UserDTO>, "session_expires_at": ISO } }`
응답 409: `{ "error": "email_taken" }`
응답 422: `{ "error": "validation_error" | "weak_password" }`
사이드 이펙트: User row 삽입(`status='pending_approval'`, `must_change_password=false`), 세션 쿠키 발급 (가입 직후 자동 로그인), MVP 이후: 인증 메일 발송.

### 1-2. `POST /api/auth/login`
요청: `{ "email": "...", "password": "..." }`
응답 200: `{ "data": { "user": <UserDTO>, "session_expires_at": ISO } }`
응답 401: `{ "error": "invalid_credentials" }` (email 존재 여부 누설 금지 — 동일 메시지)
응답 403: `{ "error": "password_change_required" }` (사용자는 `/api/auth/change-password`만 호출 가능)

### 1-3. `POST /api/auth/logout`
응답 200: `{ "data": { "ok": true } }` (세션 무효화 + 쿠키 삭제)

### 1-4. `GET /api/auth/me`
응답 200: `{ "data": <UserDTO> }`
응답 401: `{ "error": "auth_required" }`

### 1-5. `POST /api/auth/change-password`
요청: `{ "current_password": "...", "new_password": "..." }`
응답 200: `{ "data": { "ok": true } }` + `must_change_password=false` 갱신, 다른 세션 전부 무효화
응답 401: `{ "error": "invalid_credentials" }` (current_password 불일치)
응답 422: `{ "error": "weak_password" }`

### 1-6. UserDTO
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "role": "user" | "admin",
  "status": "pending_approval" | "approved" | "rejected" | "suspended",
  "must_change_password": false,
  "onboarded_at": "ISO | null",
  "created_at": "ISO"
}
```

---

## 2. Library (`/api/library`)

### 2-1. `GET /api/library/modules`
응답 200:
```json
{ "data": [ { "id": "uuid", "slug": "little-prince-fox" | "popper-positivism" | "tao-te-ching-01",
              "title": "string", "field": "literature" | "philosophy" | "eastern-classics",
              "difficulty": 1..5, "axis_focus": { "cognition": 1..5, "value": 1..5, "time": 1..5 },
              "lesson_count": 1 } ] }
```

### 2-2. `GET /api/library/modules/:id/lessons`
응답 200: `{ "data": [ <LessonDTO> ] }`

### 2-3. `GET /api/library/lessons/:id`
응답 200: `{ "data": <LessonDTO> }`

### 2-4. `GET /api/library/texts/:id`
응답 200:
```json
{ "data": { "id": "uuid", "lesson_id": "uuid", "title": "string", "author": "string",
            "source": "string", "body": "string", "language": "ko" | "en" } }
```

### 2-5. LessonDTO
```json
{ "id": "uuid", "module_id": "uuid", "order": 1, "title": "string",
  "text_excerpt_id": "uuid",
  "tutor_system_prompt_id": "uuid",
  "objectives": ["string"],
  "axis_focus": { "cognition": 1..5, "value": 1..5, "time": 1..5 } }
```

---

## 3. Practice (`/api/practice`)

### 3-1. `POST /api/practice/sessions`
요청: `{ "lesson_id": "uuid" }`
응답 200: `{ "data": <LearningSessionDTO> }` (`status='draft'`)

### 3-2. `GET /api/practice/sessions/:id`
응답 200: `{ "data": <LearningSessionDTO> }`
응답 404 / 403 (소유자 아님)

### 3-3. `PATCH /api/practice/sessions/:id`
요청: `{ "self_evaluation"?: { "cognition": 1..5, "value": 1..5, "time": 1..5, "note": "string" } }`
응답 200: `{ "data": <LearningSessionDTO> }`
제약: `status='draft'`일 때만 허용.

### 3-4. `POST /api/practice/sessions/:id/submit`
응답 200: `{ "data": <LearningSessionDTO> }` (`status='submitted'`, `submitted_at` 기록)
응답 422: `{ "error": "validation_error", "message": "artifact_missing" }`

### 3-5. `PUT /api/practice/artifacts/:id`
요청: `{ "canvas_json": <CanvasJSON>, "client_revision": int }`
응답 200: `{ "data": <CanvasArtifactDTO> }`
응답 409: `{ "error": "revision_conflict", "details": { "server_revision": int } }`

### 3-6. `GET /api/practice/artifacts/:id`
응답 200: `{ "data": <CanvasArtifactDTO> }`

### 3-7. LearningSessionDTO
```json
{ "id": "uuid", "user_id": "uuid", "lesson_id": "uuid",
  "status": "draft" | "submitted" | "reviewed",
  "artifact_id": "uuid",
  "self_evaluation": { "cognition": 1..5, "value": 1..5, "time": 1..5, "note": "string" } | null,
  "started_at": "ISO", "submitted_at": "ISO | null" }
```

### 3-8. CanvasArtifactDTO
```json
{ "id": "uuid", "session_id": "uuid", "mode": "free",
  "canvas_json": <CanvasJSON>, "revision": int, "updated_at": "ISO" }
```

### 3-9. CanvasJSON (MVP: free 모드만)
```json
{ "version": 1, "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "nodes": [ { "id": "string", "type": "concept" | "anchor" | "bridge" | "branch",
               "label": "string", "x": 0, "y": 0,
               "axis_tag"?: "cognition" | "value" | "time" } ],
  "edges": [ { "id": "string", "from": "node-id", "to": "node-id",
               "relation": "causes" | "supports" | "contrasts" | "transforms" | "contains",
               "temporal_order"?: int } ] }
```

---

## 4. Tutor (`/api/tutor`)

### 4-1. `POST /api/tutor/chat`
요청:
```json
{ "session_id": "uuid", "lesson_id": "uuid",
  "message": "string(1..4000)",
  "canvas_snapshot"?: <CanvasJSON> }
```
응답 200:
```json
{ "data": { "message_id": "uuid", "role": "assistant", "content": "string",
            "model": "claude-opus-4-7", "input_tokens": int, "output_tokens": int,
            "created_at": "ISO" } }
```
응답 429: `{ "error": "rate_limited" }`
응답 502: `{ "error": "upstream_error", "message": "anthropic_<reason>" }`
사이드 이펙트:
- TutorMessage row 2개 삽입 (user + assistant)
- APIUsageLog row 1개 삽입 (anonymized_user_id=`sha256(user_id:ANON_SALT)`, model, input/output tokens, latency_ms)
- 외부 Anthropic 호출 시 `metadata.user_id` 필드에 anonymized id만 전송

### 4-2. `GET /api/tutor/sessions/:id/messages`
응답 200: `{ "data": [ <TutorMessageDTO> ] }` (시간 오름차순)

### 4-3. `POST /api/tutor/messages/:id/rate`
요청: `{ "rating": 1..5, "feedback"?: "string(<=500)" }`
응답 200: `{ "data": <TutorRatingDTO> }`
제약: assistant 메시지만, 본인 세션 메시지만, 최초 1회만.

### 4-4. TutorMessageDTO
```json
{ "id": "uuid", "session_id": "uuid", "role": "user" | "assistant",
  "content": "string", "model": "string | null",
  "input_tokens": int, "output_tokens": int,
  "created_at": "ISO" }
```

### 4-5. TutorRatingDTO
```json
{ "id": "uuid", "message_id": "uuid", "rating": 1..5,
  "feedback": "string | null", "created_at": "ISO" }
```

### 4-6. 시스템 프롬프트 주입 (ALI-66 계약)
ALI-67이 ALI-66의 `TutorSystemPrompt.body` 를 system 메시지로 주입한다. 변수 치환:
- `{{lesson_title}}` ← Lesson.title
- `{{text_body}}` ← TextExcerpt.body
- `{{axis_focus}}` ← `cognition/value/time` JSON
- `{{user_name}}` ← User.name (Anthropic으로는 미전송, 시스템 프롬프트에만 치환)

---

## 5. Admin (`/api/admin`)

### 5-1. `GET /api/admin/users/pending`
응답 200: `{ "data": [ <UserDTO> ] }` (`status='pending_approval'` 만)

### 5-2. `POST /api/admin/users/:id/approve`
응답 200: `{ "data": <UserDTO> }` (`status='approved'`, `approved_at`, `approved_by_id` 기록)

### 5-3. `POST /api/admin/users/:id/reject`
요청: `{ "reason"?: "string(<=500)" }`
응답 200: `{ "data": <UserDTO> }` (`status='rejected'`, `rejected_reason` 기록)

---

## 6. Webhooks (`/webhooks`)

### 6-1. `POST /webhooks/toss` — MVP cut (503)
MVP 이후 활성 시:
- 헤더 `Toss-Signature` 검증 (HMAC-SHA256, `TOSS_WEBHOOK_SECRET`)
- 멱등: `event_id` 기존 dedupe 테이블 검사
- 응답 200 즉시 (5초 내), 처리는 비동기 큐 (pg-boss)

### 6-2. `POST /webhooks/resend` — MVP cut (503)
MVP 이후 활성 시 동일 패턴.

---

## 7. Health (`/`)

### 7-1. `GET /healthz`
응답 200: `{ "ok": true, "ts": ISO }` (liveness)

### 7-2. `GET /readyz`
응답 200: `{ "ok": true, "env": "...", "features": { <flags> } }` (readiness)
DB 연결 실패 시 503.

---

## 8. 외부 시스템 계약 (ALI-67 입력)

### 8-1. Anthropic Messages API
- 모델: `ANTHROPIC_MODEL` (기본 `claude-opus-4-7`)
- max_tokens: 1024 (MVP 기본)
- temperature: 0.7
- system: `TutorSystemPrompt.body` (변수 치환 완료)
- messages: `[{ role: "user" | "assistant", content: string }]` (TutorMessage 시간순)
- metadata: `{ "user_id": anonymizedUserId }` ← **userId 평문 절대 금지**

### 8-2. APIUsageLog row (모든 외부 AI 호출)
```sql
provider    text        -- 'anthropic' | 'openai' | 'gemini'
model       text
anonymized_user_id text -- sha256(user_id:ANON_SALT)
input_tokens  int
output_tokens int
latency_ms    int
status        text     -- 'ok' | 'error'
error_code    text | null
created_at    timestamptz default now()
```

### 8-3. R2 객체 키 (MVP 이후)
- `artifacts/{uuid}/canvas.json` (CanvasArtifact 백업)
- `exports/{uuid}/{lesson_slug}.png` (썸네일)
- **user_id 평문 절대 금지**

---

## 9. 변경 정책

본 문서는 *계약*이다. 변경 시:
1. 본 문서 갱신 PR을 먼저 올린다.
2. 영향받는 라우트 핸들러 PR은 본 문서 갱신 머지 후에 올린다.
3. 호환성 깨질 변경 (응답 필드 제거/타입 변경)은 통합 보고에서 명시.
