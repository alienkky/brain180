# Brain180 v2 — Integration Blueprint

> Owner: 연다리 [통합설계] (integration-specialist) · 2026-05-30
> Implementation: ALI-67 (방연동[MCP]).
> 본 문서는 *블루프린트* — 어떤 외부 시스템을, 어떤 권한으로, 어떤 데이터 방향으로, 어디서 익명화하여 연결할지 정의. 구체 코드(라우트, 클라이언트 래퍼)는 ALI-67이 본 문서를 입력으로 받아 구현.

## 1. 도구 인벤토리

| 시스템 | 용도 | 사용 빈도 | 연결 우선순위 | 비고 |
|---|---|---|---|---|
| Anthropic Claude API | AI 튜터 본진 | 사용자 요청마다 | 직접 SDK (`@anthropic-ai/sdk`) | v1 의존성 유지 |
| OpenAI API | 폴백/임베딩(선택) | 보조 | 직접 SDK (`openai`) | v1 의존성 유지, 기본 비활성 |
| Google Gemini | 분석용 보조(선택) | 보조 | 직접 SDK (`@google/genai`) | v1 의존성 유지, 기본 비활성 |
| PostgreSQL (Neon) | 운영 DB | 항시 | DATABASE_URL | Drizzle ORM |
| Resend | 트랜잭션 이메일(인증·비번재설정·리마인더) | 이벤트 트리거 | 직접 API | Day-1 MVP 컷, 인프라만 준비 |
| Toss Payments | 카드/카카오페이 결제 | 결제 이벤트 | 직접 API + Webhook | Day-1 MVP 컷, 인프라만 준비 |
| Cloudflare R2 | 캔버스 아티팩트·내보내기 저장 | 사용자 저장 시 | S3 호환 SDK (`@aws-sdk/client-s3`) | Day-1: 로컬 디스크 폴백, 운영은 R2 |
| Web Push (VAPID) | 알림 푸시 | 알림 이벤트 | 표준 Web Push | Day-1 MVP 컷 |
| Railway | 배포 | 항시 | railway.json | 기존 설정 활용 |

## 2. 인증 방식 · 권한 범위 (최소 권한)

| 시스템 | 인증 | 권한 범위 | 키 저장 |
|---|---|---|---|
| Anthropic | `x-api-key` 헤더 | 모델 호출만. 조직 관리 키 사용 금지. | `.env` `ANTHROPIC_API_KEY`, Railway env vars |
| OpenAI | Bearer 토큰 | 모델 호출만. 파인튜닝/조직 접근 금지. | `.env` `OPENAI_API_KEY` (선택) |
| Gemini | API 키 | 모델 호출만. | `.env` `GEMINI_API_KEY` (선택) |
| Neon Postgres | 접속 문자열 | 운영 DB는 app 전용 role (CREATE/SELECT/INSERT/UPDATE/DELETE on app 스키마만; DROP/SUPERUSER 금지). | `.env` `DATABASE_URL` |
| Resend | API 키 | 발신 도메인 한정. | `.env` `RESEND_API_KEY` |
| Toss | 시크릿 키 + 클라이언트 키 (각각) | 결제 생성/조회/취소만. 통계/정산은 인간 콘솔. | `.env` `TOSS_SECRET_KEY`, `TOSS_CLIENT_KEY`, `TOSS_WEBHOOK_SECRET` |
| R2 | Access key + Secret + Account ID | 단일 버킷 read/write만. 계정 관리 금지. | `.env` `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET` |
| Web Push | VAPID 키쌍 | 자체 발급. 키 회전 시 구독자 재구독 필요. | `.env` `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |

**절대 금지:**
- 키 평문 커밋 (`.env` 는 `.gitignore`, `.env.example` 만 커밋)
- 로그에 키 출력
- 운영 키를 로컬 머신에 두기 (Railway env vars only)
- Toss webhook 서명 검증 생략
- Admin 시드 패스워드 평문 저장 (argon2id 해시만)

## 3. 데이터 흐름 · 익명화 자리

```
사용자 브라우저 ─── HTTPS ───▶ Express (Railway)
                                 │
                                 ├─▶ Postgres (Neon)
                                 │     ▲ User PII 평문 보관(이름/메일/성별/나이/직업)
                                 │     ▲ TutorMessage 원문 보관
                                 │     ▲ APIUsageLog 토큰 수만, 응답 본문 미저장
                                 │
                                 ├─▶ Anthropic Claude
                                 │     ▲ TutorMessage 본문 + 시스템 프롬프트 송신
                                 │     ▲ 사용자 식별자 송신 금지 (anonymous_id = hash(userId+salt))
                                 │
                                 ├─▶ Resend (이메일)
                                 │     ▲ 수신자 이메일만 송신, 본문은 템플릿 변수 치환 후
                                 │
                                 ├─▶ Toss Payments
                                 │     ▲ 결제 금액·주문ID·구매자ID(해시)만. PII 직송 금지
                                 │     ▲ Webhook 인입 시 서명 검증 → 멱등 처리
                                 │
                                 └─▶ R2 (스토리지)
                                       ▲ 캔버스 직렬화 JSON + 썸네일 PNG
                                       ▲ 객체 키에 userId 평문 금지, UUID v7만
```

**익명화 자리:**
- 외부 AI 호출: `userId` → `sha256(userId + ANON_SALT)` 로 변환 후 송신.
- 외부 결제: `orderId` 는 UUID v7, `customerKey` 는 동일 해시.
- 외부 스토리지 키: `artifacts/{uuid}/{filename}` — userId 미노출.
- GrowthReport 익명화 옵션 (Day-1 컷, 컬럼만 준비).

## 4. Webhook · 인입 트래픽 보안

| 엔드포인트 | 출처 | 검증 | 멱등성 |
|---|---|---|---|
| `POST /webhooks/toss` | Toss Payments | `Toss-Signature` HMAC 검증 (`TOSS_WEBHOOK_SECRET`) | 이벤트 ID로 dedupe 테이블 검사 |
| `POST /webhooks/resend` (선택) | Resend | 서명 검증 | 동일 |

Day-1 MVP 컷 — webhook 라우트는 405 응답 + 로그만. 결제 인프라 활성 시 ALI-67이 검증 로직 추가.

## 5. .env 구조

[../../.env.example](../../.env.example) 참조. 모든 키 인벤토리만, 값은 비움.

## 6. Day-1 구현 최소선 (ALI-67 인입)

ALI-67 방연동이 Day-1 마감(2026-05-31T14:59Z) 기준 구현해야 할 *최소* 범위:

1. **활성:** Anthropic SDK 래퍼 (`server/lib/anthropic.ts`) — 재시도·예외 매핑·토큰 카운트·`APIUsageLog` 기록
2. **활성:** Postgres 연결 (`server/db/client.ts`) — Drizzle 인스턴스, pool 설정
3. **인프라만 (호출 미연결):** Toss/Resend/R2/Push 클라이언트 스텁 + `.env.example` 키 등재. 라우트는 503 응답.
4. `brain180/docs/modules/integrations.md` 작성 — 본 블루프린트를 구현 관점에서 확장.

OpenAI/Gemini는 환경변수 있을 때만 활성, 없으면 graceful skip.

## 7. 다음 스프린트 (Day-1 이후)

- Toss 결제창 + webhook 활성 → ALI-67 잔여 작업
- Resend 템플릿 등록 + 이메일 인증/리마인더 활성
- R2 정식 연결 + 로컬 디스크 폴백 제거
- Web Push VAPID 키 발급 + 서비스워커 구독
- Anthropic 응답 캐싱 (시스템 프롬프트 캐시 ttl=5분)
