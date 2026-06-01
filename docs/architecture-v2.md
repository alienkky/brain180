# Brain180 v2 — System Architecture (TO-BE)

> Source spec: [`docs/system-v2.json`](./system-v2.json) — 60 nodes / 79 edges
> Owner: 연다리 [통합설계] (integration-specialist)
> Parent issue: ALI-60 — 버전2 브레인 180 프로그램 개발 착수

## 0. 변경 요약 (v1 → v2)

v1 (현재 repo 상태) — React 19 / Vite / Express / Cytoscape / Anthropic+OpenAI+Gemini SDK.
컴포넌트: Library, Practice, Chat, Feedback, PatternPanel, TextLayer, VisualLayer. 텍스트 2종.

v2 spec이 추가하는 9개 카테고리 (총 24개 신규 노드):

| 카테고리 | 신규 노드 | v1 대비 |
|---|---|---|
| 인증 강화 | n300(이메일인증), n301(소셜로그인) | 신규 |
| 온보딩 | n302(튜토리얼), n303(방법론 소개) | 신규 |
| 구독/결제 | n320(플랜), n321(결제) | 신규 |
| 캔버스 모드 결정 | n304(자유형/제약형/단계형) | assumption(n262/n263/n274) 해소 |
| 캔버스 저장/갤러리 | n305(저장), n306(갤러리), n322(다운로드) | 신규 |
| AI 튜터 관리 | n307(프롬프트), n308(품질평가), n309(히스토리), n319(품질관리) | v1의 Chat/Feedback 확장 |
| 평가/리포트 | n310(완료평가), n311(성장리포트), n312(3축분석) | 신규 |
| 알림 | n313(센터), n314(리마인더) | 신규 |
| 관리자 확장 | n315(콘텐츠), n316(모듈), n317(통계), n318(그룹), n323(통계출력) | 신규 |

## 1. 도메인 모델 (12 modules)

```
┌─ Identity ─────────────┐  ┌─ Billing ──────────┐  ┌─ Admin ────────┐
│ Auth, EmailVerify,     │  │ Plan, Payment,     │  │ Dashboard,     │
│ Social, PwReset,       │  │ Subscription       │  │ Users(승인),   │
│ Profile(이름·메일·     │  │                    │  │ Content,       │
│ 성별·나이·직업)        │  │                    │  │ Modules,       │
└────────────────────────┘  └────────────────────┘  │ Groups,        │
                                                    │ Stats,         │
┌─ Onboarding ───────────┐  ┌─ Notification ─────┐  │ AIQuality,     │
│ Tutorial(첫로그인),    │  │ Center, Reminder   │  │ TutorLog,      │
│ MethodIntro(3축)       │  │                    │  │ APIUsage       │
└────────────────────────┘  └────────────────────┘  └────────────────┘

┌─ Learning Core ────────────────────────────────────────────────┐
│ Library → ModuleSelect → Practice                               │
│                              ├─ TextLayer (텍스트)              │
│                              ├─ CanvasLayer (캔버스 3모드)      │
│                              ├─ Tools (도구)                    │
│                              └─ Analysis (인지/가치/시간)       │
└─────────────────────────────────────────────────────────────────┘

┌─ AI Tutor ─────────────┐  ┌─ Assessment & Report ───────────────┐
│ ChatSession, Question, │  │ SessionEval, GrowthReport,          │
│ Feedback, History,     │  │ ThreeAxisReport, ExportCSV/PDF      │
│ QualityRating          │  │                                     │
└────────────────────────┘  └─────────────────────────────────────┘

┌─ Canvas Artifacts ─────┐
│ Save, Load, Gallery,   │
│ Export (PDF/PNG)       │
└────────────────────────┘
```

## 2. 기술 스택 결정 (확정 후보)

| 영역 | 선택 | 이유 |
|---|---|---|
| Frontend | Vite + React 19 + TS (유지) | v1 자산 보존, 마이그레이션 비용 0 |
| 라우팅 | React Router v7 | Next 미사용 → SPA + Express |
| 상태 | Zustand (유지) + 세션별 슬라이스 분리 | v1 코드 호환 |
| 스타일 | Tailwind 4 (유지) | v1 호환 |
| 캔버스 엔진 | Konva.js + react-konva | 자유형/제약형/단계형 3모드 추상화 가능, 저장 직렬화 쉬움 |
| 그래프 시각화 | Cytoscape (유지) | v1 자산 |
| 백엔드 | Express 5 (유지) → 모듈러 라우터 분리 | v1 호환 |
| DB | PostgreSQL + Drizzle ORM | 무료/Neon 호스팅, 타입 안전 |
| 인증 | Lucia v3 (이메일/패스워드 + OAuth Google/Kakao) | 가볍고 Express에 결합 쉬움 |
| 결제 | 토스페이먼츠 (카드 + 카카오페이) | 한국 시장 표준, KCP 대비 적은 마찰 |
| 이메일 | Resend | 인증/리마인더 |
| 파일 저장 | Cloudflare R2 (S3 호환) | 캔버스 저장/내보내기 |
| AI | Anthropic Claude (튜터 본진) + OpenAI fallback | v1 SDK 유지, Gemini는 분석용 |
| 알림 푸시 | Web Push API (서비스워커) + 이메일 | 무료 + 모바일 호환 |
| 백그라운드 잡 | node-cron + pg-boss | DB-기반 큐, 단일 인스턴스 운영 충분 |
| 배포 | Railway (railway.json 이미 있음) + Neon DB + R2 | 기존 설정 활용 |

## 3. 데이터 모델 (1차 초안)

```ts
// 사용자 & 인증
User { id, email, emailVerifiedAt, password?, name, gender, age, occupation, role, createdAt }
OAuthAccount { userId, provider, providerUserId }
Session { id, userId, expiresAt }
EmailToken { token, userId, purpose: 'verify'|'reset', expiresAt }

// 구독
Plan { id, name: 'free'|'standard'|'premium', priceKRW, features }
Subscription { id, userId, planId, status, startedAt, endsAt, tossBillingKey? }
Payment { id, userId, subscriptionId, amount, method, tossPaymentKey, status, paidAt }

// 콘텐츠 (관리자가 업로드)
Module { id, title, axis: '인지'|'가치'|'시간', order, isLocked, prerequisiteIds[] }
Lesson { id, moduleId, title, textSource, sourceMeta, order }
TextExcerpt { id, lessonId, content, highlights[] }

// 학습
Enrollment { userId, moduleId, status, progress, startedAt }
LearningSession { id, userId, lessonId, mode: 'analyze'|'reverse'|'practice', startedAt, endedAt }
CanvasArtifact { id, sessionId, mode: 'free'|'constrained'|'guided', payload(JSON), thumbnailUrl, savedAt }
CanvasExport { id, artifactId, format: 'pdf'|'png', url }

// AI 튜터
TutorSystemPrompt { id, name, version, content, isActive }
TutorMessage { id, sessionId, role: 'user'|'assistant'|'system', content, model, tokensIn, tokensOut, createdAt }
TutorRating { id, messageId, userId, stars: 1..5, comment }

// 평가 & 리포트
SessionEvaluation { id, sessionId, userId, selfScore, freeText, savedAt }
GrowthReport { id, userId, periodStart, periodEnd, axisCognitiveScore, axisValueScore, axisTimeScore, summary }

// 알림 & 리마인더
Notification { id, userId, type, title, body, readAt, createdAt }
ReminderRule { id, userId, frequency: 'daily'|'weekly', timeOfDay, channels: ['push','email'] }

// 관리자 / 운영
GroupClass { id, name, ownerId, memberIds[] }
APIUsageLog { id, userId, model, tokensIn, tokensOut, costKRW, ts }
```

## 4. 라우팅 / IA

```
공개:
  /login                       n181 / n215(관리자 별도 아님 — role로 분기)
  /signup                      n193
  /signup/email-verify         n300
  /signup/plan                 n320 → /signup/pay n321
  /password-reset              n194 → n220
  /oauth/{google|kakao}        n301

학생 영역(인증 필수):
  /onboarding/intro            n303 → /onboarding/tutorial n302
  /dashboard                   n205
  /dashboard/progress          n206
  /library                     n165, n213
  /library/:moduleId           n268
  /practice/:lessonId          n166, n225
    하위 패널: text n172/n228, canvas n173/n229, tools n174/n230
    분석 패널: n171/n227 + 카테고리 n170/n179/n180/n226/n231/n232
  /practice/:lessonId/canvas/mode   n304 (free|constrained|guided)
  /artifacts                   n306 (갤러리)
  /artifacts/:id/export        n322
  /tutor/:sessionId            n241/n195/n191
  /tutor/:sessionId/history    n309
  /tutor/:msgId/rate           n308
  /assessment/:sessionId       n310 → /reports/growth n311 → /reports/three-axis n312
  /notifications               n313
  /settings/reminders          n314
  /reports/export              n323

관리자 영역(role=admin):
  /admin                       n243
  /admin/users                 n224 → n244 (승인/보류)
  /admin/questions             n242
  /admin/tutor-responses       n256
  /admin/api-usage             n258
  /admin/content               n315
  /admin/modules               n316
  /admin/stats                 n317
  /admin/groups                n318
  /admin/ai-quality            n319
  /admin/tutor-prompts         n307
```

## 5. 폴더 구조 (v2 목표)

```
brain180/
├── server/
│   ├── index.ts                      # express bootstrap
│   ├── routes/
│   │   ├── auth.ts                   # signup, login, verify, oauth, reset
│   │   ├── billing.ts                # plan, payment, subscription, webhook
│   │   ├── library.ts                # modules, lessons
│   │   ├── practice.ts               # sessions, canvas save/load
│   │   ├── tutor.ts                  # chat, rating, history
│   │   ├── assessment.ts             # eval, reports
│   │   ├── notifications.ts          # center, reminders
│   │   └── admin/*.ts
│   ├── db/
│   │   ├── schema.ts                 # Drizzle schema
│   │   └── migrations/
│   ├── jobs/                         # pg-boss workers (reminder, report build)
│   ├── ai/
│   │   ├── tutor.ts                  # Anthropic client + prompt loader
│   │   ├── prompts/                  # versioned system prompts
│   │   └── analyzers/                # axis score extraction
│   └── lib/{auth,email,storage,toss,push}.ts
├── src/                              # 기존 React 앱
│   ├── pages/                        # route components (위 IA 매핑)
│   ├── components/
│   │   ├── Canvas/                   # Konva 기반 3-mode 캔버스
│   │   ├── TextLayer/ (유지)
│   │   ├── VisualLayer/ (유지, cytoscape)
│   │   ├── Tutor/                    # Chat 확장
│   │   ├── Library/ (확장)
│   │   ├── Practice/ (확장)
│   │   ├── Notifications/
│   │   ├── Reports/
│   │   └── Admin/
│   ├── store/                        # zustand 슬라이스
│   └── data/                         # 정적 폴백 텍스트 (Module API로 점진 교체)
├── docs/
│   ├── system-v2.json (스펙 원본)
│   ├── architecture-v2.md (이 문서)
│   └── modules/                      # 각 모듈 상세 사양 (HOW 트랙 산출물)
└── tests/
    ├── e2e/                          # Playwright
    └── unit/
```

## 6. 의존성 흐름 (Why-How-What 작업 순서)

```
HOW (병렬):
  ├─ 프로세스 매핑 (고도현)         → docs/modules/process-as-is-to-be.md
  ├─ DB 스키마 (차곡담)            → server/db/schema.ts
  ├─ 워크플로/상태기계 (류한길)    → docs/modules/state-machines.md
  ├─ UI/UX 와이어 (백그림)         → docs/modules/wireframes.md
  └─ KPI (정도량)                  → docs/modules/kpi.md
       │
       ▼
WHAT (HOW 완료 후 promote):
  ├─ 시스템 프롬프트 (남말씨)      → server/ai/prompts/*
  ├─ MCP 연결 (방연동)             → MCP: toss, resend, anthropic, r2
  ├─ 자동화 (공도율)               → server/jobs/*
  ├─ 지식/메모리 (장서윤)          → server/ai/analyzers/* + tutor 메모리
  ├─ 에이전트 빌드 (표본새)        → 클라이언트 운영 에이전트 정의(필요시)
  └─ QA (하검수)                   → tests/e2e/* + 시나리오 3종
```

## 7. 보안·운영 원칙 (integration-specialist 최소 권한 명시)

- 모든 비밀(`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `TOSS_SECRET`, `RESEND_KEY`, `DATABASE_URL`, `R2_ACCESS_KEY`)은 `.env` 분리. repo 커밋 금지.
- 결제 webhook은 Toss 서명 검증 후에만 수락.
- 관리자 라우트는 미들웨어로 role 가드.
- AI 호출은 사용자 본인 세션에서만, `APIUsageLog`로 토큰·비용 누적. 일일 한도 초과 시 자동 차단.
- 개인정보(성별·나이·직업)는 학습 분석 외 용도 사용 금지. 리포트 익명화 옵션 제공.

## 8. 단계별 의존 순서 (시간 제약 없음)

| 단계 | HOW 완료물 | WHAT 시작 |
|---|---|---|
| A | 프로세스 매핑 · DB 스키마 초안 · 와이어 v0 | Auth 라우트 + Drizzle 마이그레이션 |
| B | 상태기계 · KPI 확정 · 와이어 v1 | Billing(토스) + Library/Practice 확장 |
| C | — | Canvas 3-mode + Tutor 프롬프트 v1 + 알림 |
| D | — | Assessment/Report + Admin + QA E2E |

각 단계는 직선이 아니라 선후 의존을 의미. 동일 단계 내 산출물은 병렬 가능, 다음 단계는 직전 단계 완결 후 시작.

---

이 문서는 sub-issue 진행에 따라 갱신된다. 모듈 상세 사양은 `docs/modules/` 하위에서 각 HOW 에이전트가 핸드오프한다.
