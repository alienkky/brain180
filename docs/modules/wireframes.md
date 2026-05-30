# Brain180 v2 Wireframes & Component Spec

> Owner: 백그림 [UI/UX] · Issue ALI-64 · Source: `docs/architecture-v2.md` §4-5, `docs/system-v2.json`, v1 `src/components/*`

## 0. Scope

This document is the UI handoff for the WHAT implementation team. It maps the v2 IA to screen-level wireframes, reusable component inventory, new component specs, and design tokens.

Route groups covered:

- Public/student: login, signup, email verify, plan, payment, onboarding intro, onboarding tutorial, dashboard, library, module select, practice, session evaluation, growth report, three-axis report, gallery, notification center, reminder settings.
- Admin: admin dashboard, signup approval, users, content, modules, groups, stats, AI quality, tutor prompts, tutor response storage, API usage, stats export.

## 1. Design Direction

Brain180 should feel like a calm thinking studio, not a generic LMS dashboard. Keep v1's paper-like reading surface and serif learning tone, then add product-grade shells for auth, billing, reports, and admin.

Principles:

- Reading and canvas work get the largest stable areas.
- Operational screens use dense tables, split panes, filters, and side drawers instead of card-heavy marketing layouts.
- The three learning axes are persistent visual language: cognitive, value, time.
- Student screens should reduce start friction. Admin screens should optimize scanning and bulk action.
- Avoid nested cards. Use full-height shells, rails, tables, panels, and drawers.

## 2. Design Tokens

Keep v1 tokens in `src/index.css` and extend them rather than replacing the visual identity.

### Color

| Token | Value | Use |
|---|---:|---|
| `--color-brain-bg` | `#FAF7F2` | app background, reading paper |
| `--color-brain-surface` | `#FFFFFF` | primary panels, forms, table rows |
| `--color-brain-surface-soft` | `#F3EEE4` | inactive tabs, toolbar wells |
| `--color-brain-border` | `#E8E2D6` | dividers |
| `--color-brain-border-strong` | `#D6CDBC` | selected borders, handles |
| `--color-brain-text` | `#2A241D` | primary text |
| `--color-brain-text-muted` | `#6E6557` | body secondary |
| `--color-brain-text-soft` | `#A09684` | labels, helper text |
| `--color-brain-accent` | `#B85C3F` | primary CTA, root node |
| `--color-brain-highlight` | `#C68A3D` | relation, warning emphasis |
| `--color-brain-sage` | `#6E8F82` | completion, feedback, anchor node |
| `--color-brain-node-bridge` | `#8F7FA8` | bridge node, wisdom/value axis |
| `--color-brain-node-branch` | `#6F8AA8` | branch node, cognitive axis |
| `--color-brain-danger` | `#A0533F` | destructive action |
| `--color-brain-info` | `#4E758D` | admin/info status, new |
| `--color-brain-admin-bg` | `#F6F7F5` | admin workspace, new |

Semantic status colors:

- Pending: amber `#C68A3D`
- Approved/success: sage `#6B8B6E`
- Rejected/error: terracotta `#A0533F`
- Draft/inactive: warm gray `#8F857A`
- System/info: blue gray `#4E758D`

### Typography

| Token | Value | Use |
|---|---|---|
| `--font-display` | Fraunces, Noto Serif KR, Georgia, serif | product wordmark, report numbers |
| `--font-serif` | Noto Serif KR, Fraunces, Georgia, serif | reading, learning copy, panel titles |
| `--font-sans` | Pretendard, system, Inter, sans-serif | UI chrome, forms, tables |
| `--font-mono` | JetBrains Mono, ui-monospace | IDs, API usage, export fields |

Type scale:

- App title: 22/1.0, weight 700.
- Page title: 28-36/1.15, display or serif.
- Panel title: 17-22/1.25, serif weight 500.
- Body reading: 15/2.0-2.4, serif.
- UI body: 14/1.5, sans.
- Table cell: 13/1.4, sans.
- Label: 10-11 uppercase, tracking 0.15-0.22em.
- Caption/help: 11-12/1.5, muted.

### Spacing & Shape

- Base spacing: 4px.
- Shell padding: desktop 24-32px, mobile 16px.
- Panel padding: 20-24px.
- Form control height: 40px default, 32px compact admin.
- Toolbar icon button: 32px.
- Radius: 8px default, 12px only for modal/panel groups, full radius only for pills/status.
- Divider width: 1px. Resize handles: 5px.
- Avoid cards inside cards. If a screen needs grouping, use section headers plus tables/lists.

### Motion

- Hover/selected transitions: 120-180ms.
- Drawer/modal: 180ms ease-out.
- Report chart reveal: 300ms stagger max, disabled with `prefers-reduced-motion`.
- Practice canvas pan/zoom must remain immediate; no decorative animation on the working surface.

## 3. Route & Shell Model

```
PublicShell
  AuthCard | BillingFlow | EmailVerify

StudentShell
  TopBar(brand, current module, notifications, profile)
  LeftNav(optional on dashboard/report/library)
  MainContent
  RightRail(optional: tutor, reminders, session summary)

PracticeShell
  TopBar(brand, library, mode switch, artifact actions, tutor)
  TextPanel(resizable)
  CanvasPanel(resizable)
  ToolPanel(resizable)
  FloatingTutor + FloatingFeedback

AdminShell
  AdminSidebar
  AdminTopBar(search, date range, export, profile)
  Workspace(table/chart/editor)
  DetailDrawer(optional)
```

Responsive:

- Desktop: preserve multi-panel practice layout.
- Tablet: practice becomes two columns: text/canvas tabs + bottom tool drawer.
- Mobile: auth, onboarding, reports, notifications only. Practice is read-only or guided compact until tablet/desktop.

## 4. v1 Component Reuse

### Reuse As-Is or Lightly Extend

| v1 component | v2 use | Required changes |
|---|---|---|
| `Library/Library.tsx` | `/library`, module cards | Replace static text library with module API data, add filters/progress/locks. |
| `Practice/PracticeTextLayer.tsx` | practice text panel | Add lesson metadata, saved highlights, read-only review mode. |
| `Practice/PracticeCanvas.tsx` | free-mode graph canvas | Extract engine boundary; later swap/augment with Konva for 3 canvas modes. |
| `Practice/PracticeToolbar.tsx` | practice tool rail | Split into mode-specific tool groups; add save/export controls. |
| `Practice/EvaluationPanel.tsx` | session evaluation baseline | Convert from inline local evaluator to route-level assessment and report seed. |
| `Chat/ChatPanel.tsx` | tutor chat floating panel | Add history, rating, persistence, model/token metadata. |
| `Feedback/FeedbackPanel.tsx` | student feedback and admin review source | Split student feedback vs tutor-response quality rating. |
| `PatternPanel/PatternPanel.tsx` | analysis side panel | Reuse for 3-axis report and analysis mode detail panels. |
| `TextLayer/TextLayer.tsx` | analysis read-only text | Use for report/explanation views. |
| `VisualLayer/VisualLayer.tsx` | analysis graph view | Use for system solution and report comparison graphs. |

### New Shared Components

| Component | Purpose | Variants |
|---|---|---|
| `AppTopBar` | brand, route context, account controls | student, practice, admin |
| `SideNav` | student/admin navigation | compact, expanded |
| `AuthForm` | login/signup/reset | login, signup, reset |
| `StepProgress` | signup/onboarding/payment flow | 3-5 steps |
| `PlanSelector` | billing plan compare | free, standard, premium |
| `PaymentPanel` | Toss payment state | card, kakao, receipt |
| `OnboardingFrame` | intro/tutorial step shell | method, interaction demo |
| `ModuleProgressCard` | module progress summary | locked, active, completed |
| `AxisBadge` | cognitive/value/time labels | icon+color |
| `DataTable` | admin lists | selectable, sortable, bulk action |
| `FilterBar` | search/date/status filters | student, admin |
| `DetailDrawer` | row detail/editor | right drawer |
| `EmptyState` | no data state | library, report, admin table |
| `LoadingSkeleton` | loading state | table, card list, report |
| `ErrorPanel` | recoverable route/API error | inline, full-page |
| `ReportChart` | progress/axis charts | line, radar, bar, timeline |
| `StatsKpiCard` | n317 KPI dashboard card with current value, delta, threshold border, chart preview | line, horizontal bar, composite, heatmap, dual-axis |
| `StatsDrilldownDrawer` | slide-in detail panel opened from a KPI card | metric detail, source rows, SQL/data notes |
| `ExportMenu` | CSV/PDF/PNG export | student report, admin stats |
| `NotificationList` | notifications | unread, read, grouped |
| `ReminderRuleEditor` | reminder creation | daily, weekly |
| `PromptEditor` | admin tutor prompt editing | draft, compare, publish |
| `QualityReviewPanel` | tutor QA review | message, rating, action |

## 5. Student Screens

### S01. Login (`/login`, n181/n215, n301)

```
┌──────────────────────────────────────────────┐
│ Brain180                                     │
│                                              │
│        ┌──────── LoginPanel ────────┐        │
│        │ Email                      │        │
│        │ Password                   │        │
│        │ [로그인]                   │        │
│        │ Google  Kakao              │        │
│        │ 가입하기 · 비밀번호 찾기   │        │
│        └────────────────────────────┘        │
└──────────────────────────────────────────────┘
```

Component tree:

- `PublicShell`
- `AuthPanel`
- `AuthForm(mode="login")`
- `SocialLoginButtons(providers=["google","kakao"])`
- `AuthLinkRow`

Interaction:

- Successful login routes by `role`: student to `/dashboard`, admin to `/admin`.
- Social login opens `/oauth/google` or `/oauth/kakao`.
- Unverified user routes to `/signup/email-verify`.
- Forgot password routes to `/password-reset`.

States:

- Empty: blank fields, disabled submit.
- Loading: submit spinner, fields disabled.
- Error: invalid credentials inline above password; OAuth error as toast plus retry.
- Locked/unverified: blocking message with resend verification CTA.

### S02. Signup (`/signup`, n193, n182/n201/n202/n203/n204)

```
┌──────────────────────────────────────────────┐
│ Brain180                            1/4      │
│ ┌────────────── 가입 정보 ────────────────┐  │
│ │ 이름 [              ]                   │  │
│ │ 이메일 [            ]                   │  │
│ │ 비밀번호 [          ]                   │  │
│ │ 성별 [select] 나이 [ ] 직업 [select]    │  │
│ │ 약관 동의 [ ]                           │  │
│ │                         [다음]          │  │
│ └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

Component tree:

- `PublicShell`
- `StepProgress(current=1, steps=[가입, 인증, 플랜, 결제])`
- `AuthForm(mode="signup")`
- `ProfileFields`
- `ConsentCheckboxes`

Interaction:

- Email duplication validates on blur.
- Submit creates user and verification token, then routes to `/signup/email-verify`.
- Social signup still asks missing profile fields before dashboard.

States:

- Empty: helper text explains profile data is used only for learning analysis.
- Loading: form skeleton or button spinner.
- Error: per-field validation; global network error with retry.

### S03. Email Verification (`/signup/email-verify`, n300)

```
┌──────────────────────────────────────────────┐
│ Brain180                            2/4      │
│ ┌──────── 이메일 인증 ─────────┐             │
│ │ kim@example.com 으로 전송됨 │             │
│ │ [ 6자리 코드 ]              │             │
│ │ [인증 완료]                 │             │
│ │ 재전송 00:42                │             │
│ └─────────────────────────────┘             │
└──────────────────────────────────────────────┘
```

Component tree:

- `PublicShell`
- `StepProgress`
- `EmailVerifyPanel`
- `CodeInput(length=6)`
- `ResendTimer`

Interaction:

- Code auto-advances focus.
- Valid code routes to `/signup/plan`.
- Resend resets timer and invalidates old token.

States:

- Empty: code input focused.
- Loading: verifying code.
- Error: expired/invalid code message with resend.

### S04. Plan Selection (`/signup/plan`, n320)

```
┌──────────────────────────────────────────────────────────────┐
│ Brain180                                              3/4    │
│ 플랜 선택                                                     │
│ ┌ Free ┐  ┌ Standard ┐  ┌ Premium ┐                          │
│ │ ...  │  │ ...      │  │ ...     │                          │
│ │선택  │  │선택      │  │선택     │                          │
│ 비교표: 모듈 수 · AI 질문 · 리포트 · 내보내기                 │
└──────────────────────────────────────────────────────────────┘
```

Component tree:

- `PublicShell`
- `StepProgress`
- `PlanSelector`
- `PlanComparisonTable`

Interaction:

- Free plan can skip payment and route to onboarding.
- Paid plan stores pending plan and routes to `/signup/pay`.
- Plan cards show current recommendation based on role/occupation only if available.

States:

- Empty/loading: skeleton cards.
- Error: failed to load plan config with retry.
- Disabled: unavailable plan marked "준비 중".

### S05. Payment (`/signup/pay`, n321)

```
┌────────────────────────────────────────────────────┐
│ Brain180                                    4/4    │
│ ┌ 결제 요약 ┐  ┌ 결제 수단 ┐                       │
│ │ Standard  │  │ 카드 / 카카오페이                 │
│ │ 월 00,000 │  │ 약관 [ ]                          │
│ │ 변경      │  │ [결제하기]                        │
│ └───────────┘  └──────────────────────────────────┘
└────────────────────────────────────────────────────┘
```

Component tree:

- `PublicShell`
- `StepProgress`
- `PaymentSummary`
- `PaymentMethodTabs`
- `TossPaymentButton`

Interaction:

- Payment success creates subscription and routes to `/onboarding/intro`.
- Payment cancel returns to plan with selected plan preserved.
- Payment failure shows recoverable inline error and keeps method.

States:

- Loading: payment widget loading.
- Error: declined/canceled/webhook pending.
- Success: receipt summary with continue CTA.

### S06. Onboarding Intro (`/onboarding/intro`, n303)

```
┌────────────────────────────────────────────────────┐
│ Brain180                              건너뛰기     │
│ 3축으로 읽는 법                                     │
│ ┌ 인지 ┐ ┌ 가치 ┐ ┌ 시간 ┐                         │
│ │구조  │ │동기  │ │흐름  │                         │
│ [튜토리얼 시작]                                     │
└────────────────────────────────────────────────────┘
```

Component tree:

- `StudentShell(minimal)`
- `OnboardingFrame(type="method")`
- `AxisIntroTriptych`
- `PrimaryAction`

Interaction:

- Start routes to `/onboarding/tutorial`.
- Skip routes to `/dashboard` but leaves onboarding task on dashboard.

States:

- Loading: intro content skeleton.
- Error: fallback static intro from local content.

### S07. Onboarding Tutorial (`/onboarding/tutorial`, n302)

```
┌────────────────────────────────────────────────────────┐
│ Step 2/5: 단어를 고르고 캔버스에 놓기                 │
│ ┌ Text demo ┐ ┌ Canvas demo ┐ ┌ Tool hint ┐           │
│ │ phrase    │ │ node        │ │ 역할 선택 │           │
│ [이전]                                      [다음]     │
└────────────────────────────────────────────────────────┘
```

Component tree:

- `StudentShell(minimal)`
- `OnboardingFrame(type="tutorial")`
- `TutorialStepList`
- Reused demo variants of `PracticeTextLayer`, `PracticeCanvas`, `PracticeToolbar`

Interaction:

- Five steps: choose phrase, create node, connect nodes, ask tutor, view evaluation.
- Completion routes to `/dashboard`.

States:

- Empty: first step.
- Loading: saved tutorial progress.
- Error: local tutorial mode without persistence.

### S08. Dashboard (`/dashboard`, `/dashboard/progress`, n205/n206)

```
┌ TopBar ───────────────────────────────────────────────┐
│ SideNav │ 오늘의 이어하기                             │
│         │ ┌ ActiveModule ┐ ┌ Streak/Reminder ┐        │
│         │ 성장 요약: 인지/가치/시간 mini chart         │
│         │ 최근 세션 table                             │
│         │ 추천 다음 모듈                              │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `StudentShell`
- `DashboardHeader`
- `ContinueLearningPanel`
- `AxisProgressSummary`
- `RecentSessionTable`
- `RecommendedModuleList`
- `ReminderMiniPanel`

Interaction:

- Continue opens last lesson in `/practice/:lessonId`.
- Axis summary links to `/reports/three-axis`.
- Reminder panel links to `/settings/reminders`.

States:

- Empty: first-user dashboard with onboarding/tutorial CTA.
- Loading: dashboard skeleton.
- Error: partial panels show retry; navigation remains usable.

### S09. Library (`/library`, n165/n213)

```
┌ TopBar ───────────────────────────────────────────────┐
│ SideNav │ Library                                     │
│         │ Filters: 축 / 난이도 / 진행상태 / 검색       │
│         │ ┌ ModuleProgressCard ┐ ┌ ... ┐              │
│         │ ┌ locked card        ┐ ┌ complete card ┐    │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `StudentShell`
- Reuse/extend `Library`
- `FilterBar`
- `ModuleProgressCard`
- `EmptyState`

Interaction:

- Card opens `/library/:moduleId`.
- Locked card opens prerequisite drawer.
- Filters update URL query for shareable state.

States:

- Empty: no matching module.
- Loading: grid/list skeleton.
- Error: failed module API; show local fallback texts if available.

### S10. Module Select (`/library/:moduleId`, n268)

```
┌ TopBar ───────────────────────────────────────────────┐
│ Module title + axis badges                            │
│ ┌ Lesson list ──────────────┐ ┌ Module details ┐      │
│ │ 1. source text   progress │ │ objectives     │      │
│ │ 2. practice      locked   │ │ prerequisites  │      │
│ │ 3. report        done     │ │ [시작/이어하기]│      │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `StudentShell`
- `ModuleHeader`
- `LessonSequenceList`
- `ModuleDetailPanel`
- `PrerequisiteNotice`

Interaction:

- Start opens first available lesson practice route.
- Lesson row opens specific `/practice/:lessonId`.
- Completed lesson opens session report.

States:

- Empty: module exists but no lessons published.
- Loading: header + row skeleton.
- Error: unavailable module, return to library CTA.

### S11. Practice (`/practice/:lessonId`, n166/n225/n172/n173/n174/n304/n305/n308/n309)

```
┌ TopBar: Brain180 | Library | Practice/Analysis | Save | Export | Tutor ┐
├──────────── Text ─────────┬──────────── Canvas ───────────┬── Tools ───┤
│ title, source, phrases    │ mode switch: free/constrained │ node type  │
│ reading text              │ graph/canvas workspace        │ edge label │
│ phrase footer             │ zoom, fit, save status        │ analysis   │
├───────────────────────────┴───────────────────────────────┴────────────┤
│ optional EvaluationPanel                                                │
└ Floating: TutorChat, Feedback/Rating                                    ┘
```

Component tree:

- `PracticeShell`
- Reuse `PracticeTextLayer`
- `CanvasModeSwitch` (new, maps n304)
- Reuse `PracticeCanvas` for free mode
- New `ConstrainedCanvas`, `GuidedCanvas`
- Reuse/split `PracticeToolbar`
- `ArtifactSaveStatus` (n305)
- Reuse `ChatPanel` with `TutorHistoryButton` (n309)
- `TutorRatingPopover` (n308)

Interaction:

- Text phrase tap/circle and drag/drop remain v1 behavior.
- Canvas modes:
  - Free: user creates any node/edge.
  - Constrained: available node/edge count or shapes are limited by lesson.
  - Guided: step prompts unlock the next structure action.
- Save is explicit plus autosave every meaningful graph change.
- Complete session opens `EvaluationPanel`, then route CTA to `/assessment/:sessionId`.
- Tutor rating is attached to each assistant message.

States:

- Empty: canvas instructions with mode-specific examples.
- Loading: lesson and artifact loading; canvas disabled until ready.
- Error: save failed banner with retry; AI unavailable banner; mode not supported fallback to free mode.
- Conflict: saved artifact newer than local state; choose local/server.

### S12. Session End Evaluation (`/assessment/:sessionId`, n310)

```
┌ TopBar ───────────────────────────────────────────────┐
│ 세션 완료 평가                                        │
│ ┌ Score ring ┐ ┌ Self review form ┐                   │
│ ┌ Matched concepts table ┐ ┌ Tutor summary ┐          │
│ [성장 리포트 보기] [다시 연습]                         │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `StudentShell`
- Reuse/elevate `EvaluationPanel`
- `SelfEvaluationForm`
- `MatchedConceptTable`
- `TutorSummaryPanel`

Interaction:

- Self score/free text saves to `SessionEvaluation`.
- Continue routes to `/reports/growth`.
- Re-practice restores artifact in practice.

States:

- Empty: not enough submitted nodes; show "평가 가능한 구조가 부족합니다."
- Loading: evaluator/report generation.
- Error: AI summary failed; local structural evaluation still visible.

### S13. Growth Report (`/reports/growth`, n311)

```
┌ TopBar ───────────────────────────────────────────────┐
│ 개인 성장 리포트       기간 [최근 4주 v] [PDF]        │
│ ┌ Trend line ┐ ┌ Axis cards ┐                         │
│ ┌ Session timeline table ┐                            │
│ ┌ Recommendations ┐                                   │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `StudentShell`
- `ReportToolbar`
- `ReportChart(type="line")`
- `AxisScoreCards`
- `SessionTimelineTable`
- `RecommendationPanel`
- `ExportMenu`

Interaction:

- Period switch reloads charts.
- Row opens session evaluation.
- Export creates PDF.

States:

- Empty: no completed sessions, CTA to library.
- Loading: chart/table skeleton.
- Error: chart API failed, retry + CSV fallback if data exists.

### S14. Three-Axis Report (`/reports/three-axis`, n312)

```
┌ TopBar ───────────────────────────────────────────────┐
│ 3축 분석 리포트                                       │
│ ┌ Radar: 인지/가치/시간 ┐ ┌ Explanation panel ┐       │
│ ┌ Cognitive graph ┐ ┌ Value map ┐ ┌ Time flow ┐       │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `StudentShell`
- `AxisRadarChart`
- Reuse `PatternPanel` sections
- Reuse `VisualLayer` in compact read-only mode
- `AxisInsightList`

Interaction:

- Axis segment click filters insight panels.
- Report can compare current period vs previous period.
- Export through `/reports/export`.

States:

- Empty: needs at least one completed session.
- Loading: chart skeleton.
- Error: failed analysis; show last generated report with stale badge.

### S15. Artifact Gallery (`/artifacts`, `/artifacts/:id/export`, n306/n322)

```
┌ TopBar ───────────────────────────────────────────────┐
│ 작업물 갤러리                    검색 / 축 / 날짜     │
│ ┌ thumbnail ┐ ┌ thumbnail ┐ ┌ thumbnail ┐             │
│ Detail drawer: preview, metadata, open, export         │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `StudentShell`
- `FilterBar`
- `ArtifactGrid`
- `ArtifactPreviewDrawer`
- `ExportMenu(format=["pdf","png"])`

Interaction:

- Thumbnail opens preview drawer.
- Open restores artifact in practice.
- Export routes to `/artifacts/:id/export` or opens export modal.

States:

- Empty: no saved work, CTA to library.
- Loading: thumbnail skeletons.
- Error: thumbnail failed uses text fallback; export failed retry.

### S16. Notification Center (`/notifications`, n313)

```
┌ TopBar ───────────────────────────────────────────────┐
│ 알림 센터                         모두 읽음           │
│ Tabs: 전체 / 튜터 / 진도 / 결제 / 시스템              │
│ Today group                                            │
│ ├ unread notification row                              │
│ Older group                                            │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `StudentShell`
- `NotificationTabs`
- `NotificationList`
- `NotificationRow`

Interaction:

- Row click routes to target session/report/payment.
- Mark all read updates unread count in top bar.
- Filters persist in query.

States:

- Empty: "새 알림이 없습니다."
- Loading: list skeleton.
- Error: retry row; cached notifications remain visible.

### S17. Reminder Settings (`/settings/reminders`, n314)

```
┌ TopBar ───────────────────────────────────────────────┐
│ 리마인더 설정                                         │
│ ┌ Current rules table ┐ ┌ Rule editor ┐               │
│ │ daily 21:00 push    │ │ frequency   │               │
│ │ weekly Mon email    │ │ time/channel│               │
│ [저장]                                                  │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `StudentShell`
- `ReminderRuleList`
- `ReminderRuleEditor`
- `ChannelToggleGroup`
- `PermissionBanner`

Interaction:

- Push channel requests browser permission.
- Rules can be paused, edited, deleted.
- Save writes `ReminderRule`.

States:

- Empty: create first reminder.
- Loading: current rules skeleton.
- Error: permission denied banner; save failed inline.

## 6. Admin Screens

### A01. Admin Dashboard (`/admin`, n243)

```
┌ AdminTopBar: search, date range, export ──────────────┐
│ Sidebar │ KPI strip: users/sessions/questions/cost     │
│         │ ┌ Learning activity chart ┐ ┌ Alerts ┐       │
│         │ Recent approvals / AI quality queue          │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `AdminShell`
- `KpiStrip`
- `AdminChartGrid`
- `QueuePreviewTable`
- `AlertList`

Interaction:

- KPI card routes to relevant admin screen with filters.
- Date range applies to all dashboard charts.
- Alerts open detail drawer.

States:

- Empty: no activity yet.
- Loading: KPI/chart skeleton.
- Error: per-widget retry.

### A02. Signup Approval (`/admin/users?status=pending`, n224/n244)

```
┌ AdminShell ───────────────────────────────────────────┐
│ 가입승인/보류                  search/status filters  │
│ ┌ selectable DataTable ─────────────────────────────┐ │
│ │ name email plan joined status [approve][hold]     │ │
│ └───────────────────────────────────────────────────┘ │
│ DetailDrawer: profile, notes, audit trail             │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `AdminShell`
- `FilterBar`
- `DataTable(selectable)`
- `BulkActionBar`
- `UserApprovalDrawer`

Interaction:

- Approve/hold/reject single or bulk.
- Row opens drawer with profile and payment status.
- Approval can trigger welcome email.

States:

- Empty: no pending users.
- Loading: table skeleton.
- Error: action failed toast and row remains pending.

### A03. Users (`/admin/users`, n224)

```
┌ AdminShell ───────────────────────────────────────────┐
│ 사용자 관리                        filters/export     │
│ DataTable: user, role, plan, progress, last active     │
│ DetailDrawer: profile, enrollment, sessions, notes     │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `AdminShell`
- `UserFilterBar`
- `DataTable`
- `UserDetailDrawer`
- `EnrollmentEditor`

Interaction:

- Role/plan/status filters.
- Admin can assign group, reset password mail, deactivate.
- Drawer tabs: profile, sessions, billing, notes.

States:

- Empty: no users for filters.
- Loading: table skeleton.
- Error: row-level failed updates.

### A04. Content Upload (`/admin/content`, n315)

```
┌ AdminShell ───────────────────────────────────────────┐
│ 콘텐츠 업로드                                         │
│ ┌ Source editor ┐ ┌ Metadata / preview ┐              │
│ │ title/content │ │ author/field/difficulty           │
│ [저장 초안] [게시]                                    │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `AdminShell`
- `ContentEditor`
- `TextMetadataForm`
- `ReadingPreview`
- `PublishControls`

Interaction:

- Draft autosaves.
- Publish validates required metadata and excerpts.
- Preview uses student reading typography.

States:

- Empty: blank editor.
- Loading: draft loading.
- Error: validation list; save failed retry.

### A05. Module Management (`/admin/modules`, n316)

```
┌ AdminShell ───────────────────────────────────────────┐
│ 교육 모듈 관리                         [새 모듈]      │
│ ┌ Module sequence list ┐ ┌ Module editor drawer ┐     │
│ drag order, lock rules, prerequisite ids              │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `AdminShell`
- `ModuleSequenceList`
- `ModuleEditorDrawer`
- `PrerequisiteBuilder`
- `LockRuleEditor`

Interaction:

- Drag reorder changes `order`.
- Toggle lock/published.
- Prerequisite builder prevents circular dependencies.

States:

- Empty: create first module.
- Loading: sequence skeleton.
- Error: reorder conflict, refresh required.

### A06. Groups (`/admin/groups`, n318)

```
┌ AdminShell ───────────────────────────────────────────┐
│ 그룹/클래스 관리                    [새 그룹]         │
│ Group list │ Member table │ Assignment drawer          │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `AdminShell`
- `GroupList`
- `GroupMemberTable`
- `GroupAssignmentDrawer`

Interaction:

- Create/edit group.
- Add/remove users in bulk.
- Assign modules to group.

States:

- Empty: no groups.
- Loading: group/member skeleton.
- Error: member update failed row toast.

### A07. Stats Dashboard (`/admin/stats`, n317)

```
┌ AdminShell ───────────────────────────────────────────┐
│ 통계 대시보드       date range / group / module/export  │
│ ┌ DAU 7일 추이 ─────┐ ┌ 모듈 완료율 × 텍스트 ───────┐ │
│ │ value + Δ + line  │ │ value + Δ + horizontal bars │ │
│ ├ AI 별점+p95 ─────┤ ├ D7 잔존율 코호트 ───────────┤ │
│ │ score + latency   │ │ cohort heatmap              │ │
│ ├ MRR+API 비용비율 ┤ ├ Drilldown preview/alerts ───┤ │
│ │ dual line axes    │ │ selected card details       │ │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `AdminShell`
- `StatsFilterBar`
- `StatsKpiGrid(columns={desktop:2, mobile:1})`
- `StatsKpiCard`
- `StatsDrilldownDrawer`
- `ThresholdStatusBorder`
- `StatsDataTable`
- `ExportMenu`

KPI card spec from `docs/modules/kpi.md` / ALI-65:

| Rank | Card | Visualization | Primary value | Data source |
|---:|---|---|---|---|
| 1 | DAU 7일 추이 | Line chart | latest DAU + previous-period delta | `sessions.started_at` by DATE + `COUNT(DISTINCT user_id)` |
| 2 | 모듈 완료율 × 텍스트 | Horizontal bar chart | average completion % + delta | `sessions` LEFT JOIN `evaluations`, `completion_pct` per `text_id` |
| 3 | AI 튜터 별점 + p95 레이턴시 | Composite metric + sparkline | avg rating, p95 latency | `chat_messages.rating`, `latency_ms` p95 |
| 4 | D7 잔존율 코호트 | Cohort heatmap | latest cohort D7 % + delta | `users.created_at` cohort x `sessions` return day |
| 5 | MRR + API 비용/매출 비율 | Dual-axis line chart | MRR, API-cost/revenue ratio | monthly `payments.amount`, `api_costs.cost_usd / mrr` |

Card anatomy:

```
┌ StatsKpiCard ──────────────────────────────┐
│ label                         status dot   │
│ current value        Δ vs previous period  │
│ chart preview / heatmap / bar preview       │
│ threshold note          [drilldown chevron] │
└────────────────────────────────────────────┘
```

Threshold treatment:

- Normal: sage border, subtle green status dot.
- Warning: amber border, warning label in card footer.
- Danger: terracotta border, card moves to alert priority and drawer opens with mitigation notes when clicked.
- Status must be text + color, never color-only.

Interaction:

- Filters update charts and table together.
- Card click opens `StatsDrilldownDrawer` from the right with full chart, source table rows, threshold rule, and recommended action.
- Chart segment click filters the drawer table segment without navigating away.
- Export routes to `/reports/export` or `/admin/stats/export` implementation alias.
- Desktop uses a 2 x 3 grid: five metric cards plus one alert/detail preview slot.
- Mobile stacks cards in one column; drawer becomes full-screen bottom sheet.

States:

- Empty: no data for range; each card shows required event/table source and setup CTA.
- Loading: card-level skeletons; filter bar remains interactive.
- Error: failed card keeps other cards visible; drawer shows raw query/source error and retry.
- Partial: MRR/API card can show "API cost not connected" while revenue line remains visible.

### A08. AI Quality (`/admin/ai-quality`, n319/n308)

```
┌ AdminShell ───────────────────────────────────────────┐
│ AI 품질 관리                      rating/status/model │
│ Queue table │ QualityReviewPanel                      │
│ message, context, rating, admin label, prompt version  │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `AdminShell`
- `QualityQueueTable`
- `QualityReviewPanel`
- `MessageContextViewer`
- `QualityActionBar`

Interaction:

- Filter by low rating, model, prompt version.
- Mark reviewed, needs prompt change, or hidden.
- Link to prompt editor with context.

States:

- Empty: no quality issues.
- Loading: queue skeleton.
- Error: review save failed with retry.

### A09. Tutor Prompts (`/admin/tutor-prompts`, n307)

```
┌ AdminShell ───────────────────────────────────────────┐
│ AI 프롬프트 관리                                      │
│ Version list │ PromptEditor │ Test console             │
│ [초안 저장] [비교] [활성화]                           │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `AdminShell`
- `PromptVersionList`
- `PromptEditor`
- `PromptDiffView`
- `PromptTestConsole`
- `PublishControls`

Interaction:

- Create draft from active prompt.
- Diff draft vs active.
- Test console uses sample lesson/session context.
- Activate creates immutable version.

States:

- Empty: no prompt yet, seed default.
- Loading: version/editor skeleton.
- Error: activation blocked if tests fail or save fails.

### A10. Tutor Response Storage (`/admin/tutor-responses`, n256/n309)

```
┌ AdminShell ───────────────────────────────────────────┐
│ 튜터 응답사항 저장                 search/model/user  │
│ Conversation table │ Transcript drawer                 │
│ tokens, latency, session, rating, saved flag           │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `AdminShell`
- `TutorConversationTable`
- `TranscriptDrawer`
- `TokenUsageInline`
- `SavedResponseToggle`

Interaction:

- Search messages by user/session/content.
- Drawer shows full transcript and artifact context.
- Saved flag marks useful examples for prompt QA.

States:

- Empty: no conversations.
- Loading: table skeleton.
- Error: transcript fetch failed, keep table.

### A11. API Usage (`/admin/api-usage`, n258)

```
┌ AdminShell ───────────────────────────────────────────┐
│ API 사용량                       date/model/provider  │
│ KPI strip: tokens in/out/cost/errors                   │
│ Usage chart                                            │
│ DataTable: ts user model tokens cost status            │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `AdminShell`
- `ApiUsageKpiStrip`
- `UsageChart`
- `DataTable`
- `CostThresholdBanner`

Interaction:

- Filter by provider/model/user/date.
- Cost threshold banner links to settings later.
- Export CSV.

States:

- Empty: no usage logs.
- Loading: KPI/chart/table skeleton.
- Error: cost calculation failed shows raw token counts.

### A12. Stats Export (`/reports/export`, n323)

```
┌ AdminShell or StudentShell ───────────────────────────┐
│ 학습 통계 내보내기                                    │
│ Scope: user/group/module/date                         │
│ Format: CSV / PDF                                     │
│ Columns checklist                                     │
│ [미리보기] [내보내기]                                 │
└───────────────────────────────────────────────────────┘
```

Component tree:

- `ExportShell` inside `AdminShell` or `StudentShell`
- `ExportScopeForm`
- `ColumnPicker`
- `ExportPreviewTable`
- `ExportJobStatus`

Interaction:

- Admin can export group/user aggregate.
- Student can export own report only.
- Long export creates background job and downloadable notification.

States:

- Empty: no scope selected.
- Loading: preview/export job.
- Error: permission denied, no rows, job failed.

## 7. Cross-Screen Interaction Notes

### Navigation

- `role=admin` after login goes to `/admin`; student goes to `/dashboard`.
- Student primary journey: signup -> verify -> plan/payment -> onboarding -> dashboard -> library -> module -> practice -> assessment -> reports.
- Practice actions should not lose work on route change. Prompt before leaving with unsaved local changes.

### Persistence

- Practice autosave stores `CanvasArtifact` with mode, payload, and thumbnail.
- Tutor messages attach to `LearningSession`.
- Reports should be generated from saved session/evaluation data, not transient UI state.

### Accessibility

- All icon buttons need visible tooltip/title and accessible label.
- Tables need keyboard row focus and drawer opening via Enter.
- Canvas mode needs non-pointer fallbacks for critical actions.
- Color cannot be the only axis/status indicator. Pair with label/icon.

### Responsive Behavior

- Admin tables keep columns via horizontal scroll on tablet; mobile admin can show read-only stacked rows.
- Student dashboard/library collapse side nav to top segmented nav below 900px.
- Practice desktop is the canonical authoring layout; below 900px, show a "desktop recommended" banner and switch to tabbed text/canvas/tools.

## 8. Implementation Checklist

- Create `src/pages/*` route components matching IA.
- Extract shared shells before implementing individual pages.
- Move v1 `App.tsx` practice shell into `/practice/:lessonId`.
- Keep current v1 component names for reused components to reduce migration risk.
- Add new components under the v2 target folders from `architecture-v2.md`:
  - `src/components/Canvas/`
  - `src/components/Tutor/`
  - `src/components/Notifications/`
  - `src/components/Reports/`
  - `src/components/Admin/`
- Add route-level empty/loading/error states before API integration is complete.
- Use fake fixture data only inside page story/dev fixtures, not embedded in reusable components.
