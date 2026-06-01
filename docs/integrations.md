# Brain180 v2 — Integrations Inventory

> 외부 서비스 의존성 인벤토리. *어디서 무엇을 끌어다 쓰는가*, 어떤 키를 어디에 발급받고 어디에 저장하는가, 어떤 폴백이 있는가의 단일 진실 공급원.
> Owner: 연다리 [통합설계] (ALI-67). Last updated: 2026-06-01.

## 0. 빠른 표 — 현재 의존 상태

| # | 서비스 | 무엇에 쓰나 | 상태 | 키 위치 | 키 회전 주기 |
|---|---|---|---|---|---|
| 1 | **Neon Postgres** | 운영 DB (users, sessions, modules, lessons, tutor_messages, api_usage_logs) | 🟢 ON (dev) | `DATABASE_URL` | 90일 / 노출 시 즉시 |
| 2 | **Moonshot (Kimi)** | 튜터 LLM (기본 provider) | 🟢 ON (dev) | `MOONSHOT_API_KEY` | 90일 / 노출 시 즉시 |
| 3 | **Anthropic Claude** | 튜터 LLM (대체 provider) | 🟡 standby | `ANTHROPIC_API_KEY` | 90일 |
| 4 | **OpenAI** | 추후 fallback 후보 | ⚫ off | `OPENAI_API_KEY` | — |
| 5 | **Gemini** | 추후 fallback 후보 | ⚫ off | `GEMINI_API_KEY` | — |
| 6 | **Resend** | 시스템 메일 (가입 승인, 비번 리셋) | ⚫ off | `RESEND_API_KEY` | 90일 |
| 7 | **Toss Payments** | 구독 결제 | ⚫ off | `TOSS_*` | 180일 / 노출 시 즉시 |
| 8 | **Cloudflare R2** | 학습 산출물 저장 (Day-1: 로컬 폴백) | ⚫ off | `R2_*` | 180일 |
| 9 | **Web Push (VAPID)** | 푸시 알림 | ⚫ off | `VAPID_*` | 회전 시 구독자 재등록 필요 |

상태 범례: 🟢 켜져 있고 코드 경로 통과 / 🟡 키만 발급, 코드는 boot 시 hasFeature 체크 / ⚫ 키 미발급, 코드는 dormant.

---

## 1. Neon Postgres

- **무엇**: 모든 서버 상태 (인증, 세션, 콘텐츠, 학습 데이터, AI 호출 로그).
- **드라이버**: `pg` (driver), `drizzle-orm/pg-core` (ORM), `lucia` (세션).
- **연결 형태**: Pooled endpoint 권장. URL 패턴 `postgres://<user>:<pwd>@<host>-pooler.<region>.neon.tech/<db>?sslmode=require`.
- **권한 모델**: `app` role 만 사용. `SUPERUSER` / `CREATE DATABASE` / `DROP TABLE` 금지. 마이그레이션도 `app` role 로 돌림 (drizzle-kit migrate).
- **마이그레이션 실행**: `npm run db:migrate:run` (Windows 안전한 programmatic runner, `pathToFileURL(argv[1])` 사용).
- **시드**: `npm run db:seed`. 멱등. admin 백필 포함.
- **노출 시 대응**: `docs/secret-rotation.md` 참고.
- **백업**: Neon 자체 PITR (Point-in-Time Recovery) 활성화 확인 필요. *현재 미확인.*

## 2. Moonshot (Kimi) — 기본 튜터 LLM

- **무엇**: `/api/tutor/chat` 라우트가 호출하는 기본 모델. v1 brain180 이 이미 Moonshot 위에서 돌고 있었기 때문에 v2 기본값도 동일.
- **SDK**: `openai` npm 패키지 (Moonshot 은 OpenAI-호환 API). `baseURL=https://api.moonshot.ai/v1`.
- **모델**: 기본 `kimi-k2.6`, fallback `moonshot-v1-8k`.
- **온도 처리**: `kimi-*` 모델은 temperature 0.6 만 허용 (다른 값 전달하면 400). `server/lib/kimi.ts` 가 자동 보정.
- **thinking 모드**: `MOONSHOT_THINKING=enabled` 으로 켤 수 있음. 토큰 비용 증가, 응답 품질 향상.
- **타임아웃**: `MOONSHOT_TIMEOUT_MS=45000` 기본. 라우트는 `502 upstream_error / code=kimi_timeout` 로 변환.
- **계측**: 모든 호출이 `api_usage_logs` 에 `provider="kimi"`, model, in/out tokens, status, latency_ms 로 1행 박힘.
- **provider 스위치**: `AI_PROVIDER=anthropic` 으로 즉시 전환 가능. 라우트는 추상화된 `callTutorLLM` 만 호출.

## 3. Anthropic Claude — 대체 provider

- **무엇**: Moonshot 장애 시 즉시 전환할 fallback. 현재 standby.
- **SDK**: `@anthropic-ai/sdk`.
- **모델**: `claude-opus-4-7` 기본.
- **전환 방법**: `.env` 의 `AI_PROVIDER=anthropic` + 서버 재시작.
- **주의**: 현재 코드 경로는 anthropic 가지를 *통과는 하지만 운영 검증되지 않음*. switch 전 smoke:tutor 로 1회 검증 필요.

## 4. Resend — 시스템 메일 (보류)

- **무엇**: 가입 승인 메일, 비밀번호 재설정, 결제 영수증.
- **현재 상태**: 키 미발급, 코드 경로 dormant. `hasFeature("resend") === false` 인 동안 라우트는 메일 발송을 *skip 하고 로그만 남김*.
- **켜는 조건**: 첫 외부 사용자 등록 직전.

## 5. Toss Payments — 결제 (보류, Path B)

- **무엇**: 월 구독 결제 + 웹훅 기반 구독 활성화.
- **현재 상태**: 코드 경로 미구현. 다음 Path B 에서 작업.
- **dedupe 전략**: 웹훅 이벤트 ID 기반 멱등 — `payment_events` 테이블 unique constraint.
- **WHY 우선순위**: Path A (셸) → Path C (안전망) → **Path B (결제)** 순서. 매출 라인보다 *눈에 보이는 작동* + *키 로테이션* 이 먼저.

## 6. Cloudflare R2 — 산출물 저장 (보류)

- **무엇**: 학습자 생성 시각화 / 평가 산출물 저장.
- **Day-1 폴백**: `./uploads` 로컬 디스크. 단일 머신 가정.
- **운영 전환 시점**: 첫 실 사용자 또는 다중 인스턴스 배포 직전.

## 7. Web Push (VAPID) — 알림 (보류)

- **무엇**: 학습 리마인더, 답변 도착 알림.
- **현재 상태**: dormant.

---

## 8. 로컬 dev 환경 토폴로지

```
[Browser]
   │ http://localhost:5173 (Vite)
   ▼
[Vite dev server] ── /api/* ───────────────▶ [Express :3001 (dev:server)]
   │  ─ index.html, src/*                                │
   │                                                     ├─▶ [Neon Postgres] (pg + drizzle + lucia)
   │                                                     └─▶ [Moonshot API] (openai SDK → api.moonshot.ai)
   ▼
(나머지 모든 라우트 = SPA fallback)
```

쿠키 관점: Vite proxy 덕분에 브라우저 입장에서는 모든 호출이 same-origin (`:5173`). Lucia 의 `b180_session` 쿠키는 httpOnly + sameSite=lax 로 발급되어 브라우저가 자동 첨부.

## 9. CI / 운영 환경 (계획)

- **호스팅 후보**: Railway (서버) + Neon (DB) + Cloudflare (정적 + CDN).
- **빌드**: `npm run build` (vite) + `npm run build:server` (tsc) → `dist/` + `dist-server/`.
- **부팅**: `node --env-file-if-exists=.env dist-server/index.js`.
- **secrets 주입**: Railway env vars. `.env` 파일은 *절대* 컨테이너에 넣지 않음.
- **헬스체크**: `GET /healthz`.

---

## 10. 무엇이 빠져 있는가 (TODO)

- [ ] **Sentry / 에러 추적** — 현재 stderr 만. 외부 사용자 받기 전 필수.
- [ ] **구조화 로깅** — `pino` 또는 그 비슷한 것. 현재 `console.log` 산재.
- [ ] **Neon PITR 활성화 확인** — 콘솔에서 백업 정책 확인 후 본 문서에 명시.
- [ ] **MOONSHOT_FALLBACK_MODEL 폴백 경로 테스트** — env 에 있지만 코드에서 실제 폴백 동작 확인 안 됨.
- [ ] **Anthropic provider smoke** — switch 후 `smoke:tutor` PASS 받기.
- [ ] **CORS_ALLOWED_ORIGINS 운영 값 결정** — Railway 도메인 확정 후.
