# Brain180 v2 — KPI 3계층 명세

> **에이전트**: kpi-translator (HOW Division)  
> **산출물 경로**: `brain180/docs/modules/kpi.md`  
> **연계 이슈**: ALI-65  
> **최종 수정**: 2026-05-30

---

## 개요

Brain180 v2의 측정 가능한 KPI를 3계층으로 정의한다.

| 계층 | 대상 | 목적 |
|------|------|------|
| **L1 학습자** | 학생 행동·성취 | 학습 효과 측정 |
| **L2 AI 튜터** | 응답 품질·속도 | 서비스 품질 보증 |
| **L3 운영** | 가입·결제·비용 | 재무 건전성·성장 |

### DB 스키마 전제 (v2 PostgreSQL)

```sql
-- 핵심 테이블 (v2 아키텍처 기준)
users            (id, email, plan, created_at, verified_at, last_active_at)
sessions         (id, user_id, text_id, started_at, completed_at, perspective)
evaluations      (id, session_id, user_id, score, node_count, edge_count, created_at)
chat_messages    (id, user_id, session_id, role, tokens, latency_ms, rating, rejected, created_at, prompt_version)
payments         (id, user_id, plan, amount, currency, status, created_at)
events           (id, user_id, name, properties jsonb, created_at)
-- events.name 값 예: 'session_start', 'session_complete', 'perspective_switch',
--                    'eval_submit', 'chat_send', 'feedback_submit', 'signup', 'verify_email'
```

---

## L1 — 학습자 KPI

### KPI-L1-01: DAU / WAU

| 항목 | 내용 |
|------|------|
| **정의** | Daily/Weekly Active Users — 해당 기간에 세션을 1개 이상 시작한 고유 사용자 수 |
| **측정 SQL** | ```sql SELECT DATE(started_at) AS day, COUNT(DISTINCT user_id) AS dau FROM sessions GROUP BY 1 ORDER BY 1 DESC; -- WAU: DATE_TRUNC('week', started_at) ``` |
| **이벤트 대안** | `events` where `name = 'session_start'` — `DATE(created_at)`, `COUNT(DISTINCT user_id)` |
| **임계값** | DAU ≥ 20 (초기 3개월), DAU/MAU 비율 ≥ 0.15 (성숙기) |
| **알림 트리거** | DAU 전일 대비 40% 이상 감소 → Slack #alert-brain180 |

---

### KPI-L1-02: 모듈 완료율

| 항목 | 내용 |
|------|------|
| **정의** | 세션 시작 후 평가(evaluation)까지 완료한 비율. 드롭아웃 지점 파악. |
| **측정 SQL** | ```sql SELECT s.text_id, COUNT(s.id) AS started, COUNT(e.id) AS completed, ROUND(COUNT(e.id)::numeric / NULLIF(COUNT(s.id),0) * 100, 1) AS completion_pct FROM sessions s LEFT JOIN evaluations e ON e.session_id = s.id GROUP BY s.text_id ORDER BY completion_pct; ``` |
| **임계값** | 전체 완료율 ≥ 60%; 특정 텍스트 < 40% 이면 해당 텍스트 UX 점검 |
| **알림 트리거** | 주간 완료율 < 50% 2주 연속 → `client-concierge` 리뷰 태스크 생성 |

---

### KPI-L1-03: 인지/가치/시간 3축 평균 점수

| 항목 | 내용 |
|------|------|
| **정의** | 평가 점수를 perspective(인지·가치·시간)별로 집계한 평균. 어느 관점에서 학습자가 약한지 파악. |
| **측정 SQL** | ```sql SELECT s.perspective, ROUND(AVG(e.score), 1) AS avg_score, COUNT(e.id) AS n FROM evaluations e JOIN sessions s ON s.id = e.session_id GROUP BY s.perspective; ``` |
| **이벤트 대안** | `events` where `name = 'eval_submit'`, properties → `score`, `perspective` |
| **임계값** | 각 축 평균 ≥ 55%; 특정 축 < 45% 이면 해당 perspective 콘텐츠 보강 검토 |
| **알림 트리거** | 어느 축이든 월 평균 < 45% → 콘텐츠 팀 이슈 생성 |

---

### KPI-L1-04: 자가평가 분포

| 항목 | 내용 |
|------|------|
| **정의** | 시스템 평가 점수 구간별 학습자 분포. 너무 쉬움(>80% 과반) / 너무 어려움(<40% 과반) 판정. |
| **측정 SQL** | ```sql SELECT CASE WHEN score >= 80 THEN '뛰어남(≥80)' WHEN score >= 60 THEN '양호(60-79)' WHEN score >= 40 THEN '발전중(40-59)' ELSE '시작단계(<40)' END AS grade, COUNT(*) AS n, ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) AS pct FROM evaluations GROUP BY 1 ORDER BY MIN(score) DESC; ``` |
| **임계값** | '뛰어남' 비율 < 70%; '시작단계' 비율 < 25% |
| **알림 트리거** | '시작단계' 비율 ≥ 35% 월 2회 연속 → 난이도 조정 검토 |

---

### KPI-L1-05: 7일 / 30일 잔존율

| 항목 | 내용 |
|------|------|
| **정의** | 가입 후 7일/30일 내 재방문(세션 시작) 사용자 비율. 습관 형성 지표. |
| **측정 SQL** | ```sql -- 7일 잔존율 SELECT cohort_week, COUNT(DISTINCT user_id) AS cohort_size, COUNT(DISTINCT CASE WHEN days_since_join BETWEEN 1 AND 7 THEN user_id END) AS retained_7d, ROUND(COUNT(DISTINCT CASE WHEN days_since_join BETWEEN 1 AND 7 THEN user_id END)::numeric / COUNT(DISTINCT user_id) * 100, 1) AS retention_7d_pct FROM ( SELECT u.id AS user_id, DATE_TRUNC('week', u.created_at) AS cohort_week, EXTRACT(DAY FROM s.started_at - u.created_at) AS days_since_join FROM users u LEFT JOIN sessions s ON s.user_id = u.id ) t GROUP BY cohort_week ORDER BY cohort_week DESC; -- 30일: BETWEEN 1 AND 30 ``` |
| **임계값** | D7 잔존율 ≥ 30%; D30 잔존율 ≥ 15% |
| **알림 트리거** | 최근 3개 코호트 D7 평균 < 25% → 온보딩 플로우 리뷰 |

---

## L2 — AI 튜터 KPI

### KPI-L2-01: 응답 별점 평균

| 항목 | 내용 |
|------|------|
| **정의** | 학습자가 채팅 응답에 남긴 별점(1-5) 평균. 튜터 품질 직접 지표. |
| **측정 SQL** | ```sql SELECT DATE_TRUNC('week', created_at) AS week, ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) FILTER (WHERE rating IS NOT NULL) AS rated_count, COUNT(*) AS total_count FROM chat_messages WHERE role = 'assistant' GROUP BY 1 ORDER BY 1 DESC; ``` |
| **임계값** | 주간 평균 별점 ≥ 4.0; 평가율(rated_count/total_count) ≥ 10% |
| **알림 트리거** | 주간 평균 < 3.5 → 프롬프트 버전 점검 |

---

### KPI-L2-02: p50 / p95 응답 시간

| 항목 | 내용 |
|------|------|
| **정의** | AI 응답 스트리밍 첫 토큰 도달 시간(ms). 체감 속도. |
| **측정 SQL** | ```sql SELECT DATE_TRUNC('day', created_at) AS day, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50_ms, PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms, COUNT(*) AS n FROM chat_messages WHERE role = 'assistant' GROUP BY 1 ORDER BY 1 DESC; ``` |
| **이벤트 대안** | `events` where `name = 'chat_response'`, properties → `latency_ms`, `provider` |
| **임계값** | p50 < 2,000ms; p95 < 8,000ms |
| **알림 트리거** | p95 ≥ 10,000ms (1시간 이동평균) → 인프라 알림 |

---

### KPI-L2-03: 토큰 / 응답

| 항목 | 내용 |
|------|------|
| **정의** | 응답 1건당 평균 토큰 수. 비용 예측 및 응답 길이 이상 탐지. |
| **측정 SQL** | ```sql SELECT DATE_TRUNC('week', created_at) AS week, prompt_version, ROUND(AVG(tokens), 0) AS avg_tokens_per_resp, ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tokens), 0) AS p95_tokens FROM chat_messages WHERE role = 'assistant' GROUP BY 1, 2 ORDER BY 1 DESC, 2; ``` |
| **임계값** | 평균 ≤ 600 tokens/응답; p95 ≤ 900 tokens |
| **알림 트리거** | 7일 평균 > 800 tokens → 프롬프트 `max_tokens` 파라미터 검토 |

---

### KPI-L2-04: 거절률

| 항목 | 내용 |
|------|------|
| **정의** | AI가 응답 거부(refusal) 또는 에러를 반환한 비율. 안전성·안정성 지표. |
| **측정 SQL** | ```sql SELECT DATE_TRUNC('week', created_at) AS week, ROUND(COUNT(*) FILTER (WHERE rejected = true)::numeric / COUNT(*) * 100, 2) AS rejection_pct, COUNT(*) FILTER (WHERE rejected = true) AS rejected_n FROM chat_messages WHERE role = 'assistant' GROUP BY 1 ORDER BY 1 DESC; ``` |
| **이벤트 대안** | `events` where `name = 'chat_error'` or `name = 'chat_rejected'` |
| **임계값** | 거절률 ≤ 2% |
| **알림 트리거** | 1시간 내 거절률 ≥ 5% → API 키/할당량 점검 알림 |

---

### KPI-L2-05: 품질 검토 통과율

| 항목 | 내용 |
|------|------|
| **정의** | 샘플링된 응답 중 인간 검토자가 "적절"로 판정한 비율. 소크라테스식 질문 유도 품질 기준. |
| **측정 방법** | 매주 무작위 30건 샘플링 → 검토자가 `quality_reviews` 테이블에 `pass`/`fail` 기록 |
| **측정 SQL** | ```sql SELECT DATE_TRUNC('week', reviewed_at) AS week, ROUND(COUNT(*) FILTER (WHERE result = 'pass')::numeric / COUNT(*) * 100, 1) AS pass_rate, COUNT(*) AS reviewed_n FROM quality_reviews GROUP BY 1 ORDER BY 1 DESC; ``` |
| **임계값** | 주간 통과율 ≥ 85% |
| **알림 트리거** | 주간 통과율 < 80% → 프롬프트 리뷰 이슈 자동 생성 |

---

### KPI-L2-06: 프롬프트 버전별 비교

| 항목 | 내용 |
|------|------|
| **정의** | `prompt_version` 컬럼 기준 별점·거절률·토큰을 버전별 비교. 프롬프트 A/B 효과 측정. |
| **측정 SQL** | ```sql SELECT prompt_version, COUNT(*) AS n, ROUND(AVG(rating), 2) AS avg_rating, ROUND(AVG(tokens), 0) AS avg_tokens, ROUND(COUNT(*) FILTER (WHERE rejected)::numeric / COUNT(*) * 100, 2) AS rejection_pct, ROUND(AVG(latency_ms), 0) AS avg_latency_ms FROM chat_messages WHERE role = 'assistant' AND created_at >= NOW() - INTERVAL '30 days' GROUP BY prompt_version ORDER BY avg_rating DESC; ``` |
| **임계값** | 신버전 별점 ≥ 구버전 -0.1 이내; 거절률 ≤ 구버전 +0.5%p |
| **알림 트리거** | 신버전 배포 후 48시간 내 별점 차이 > -0.3 → 자동 롤백 검토 |

---

## L3 — 운영 KPI

### KPI-L3-01: 신규 가입

| 항목 | 내용 |
|------|------|
| **정의** | 일별·주별 신규 가입자 수. 상단 퍼널 건강도. |
| **측정 SQL** | ```sql SELECT DATE_TRUNC('week', created_at) AS week, COUNT(*) AS signups FROM users GROUP BY 1 ORDER BY 1 DESC; ``` |
| **이벤트 대안** | `events` where `name = 'signup'` |
| **임계값** | 주간 신규 가입 ≥ 10 (성장기 목표) |
| **알림 트리거** | 주간 가입 전주 대비 50% 이상 감소 → 유입 채널 점검 |

---

### KPI-L3-02: 이메일 인증 완료율

| 항목 | 내용 |
|------|------|
| **정의** | 가입 후 24시간 내 이메일 인증 완료 비율. 낮으면 메일 발송 문제 또는 UX 문제. |
| **측정 SQL** | ```sql SELECT DATE_TRUNC('week', u.created_at) AS week, COUNT(*) AS signups, COUNT(*) FILTER (WHERE u.verified_at - u.created_at <= INTERVAL '24 hours') AS verified_24h, ROUND(COUNT(*) FILTER (WHERE u.verified_at - u.created_at <= INTERVAL '24 hours')::numeric / COUNT(*) * 100, 1) AS verify_rate_pct FROM users u GROUP BY 1 ORDER BY 1 DESC; ``` |
| **임계값** | 24시간 인증 완료율 ≥ 70% |
| **알림 트리거** | 주간 인증율 < 55% → 이메일 발송 로그 점검 |

---

### KPI-L3-03: 플랜별 전환율

| 항목 | 내용 |
|------|------|
| **정의** | Free → Paid 전환 비율. 플랜별(Basic/Pro) 분리. |
| **측정 SQL** | ```sql SELECT p.plan, DATE_TRUNC('month', p.created_at) AS month, COUNT(DISTINCT p.user_id) AS new_paid, (SELECT COUNT(*) FROM users WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', p.created_at)) AS total_signups_same_month, ROUND(COUNT(DISTINCT p.user_id)::numeric / NULLIF((SELECT COUNT(*) FROM users WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', p.created_at)), 0) * 100, 1) AS conversion_pct FROM payments p WHERE p.status = 'success' GROUP BY 1, 2 ORDER BY 2 DESC, 1; ``` |
| **임계값** | Free→Paid 월간 전환율 ≥ 5% (목표); ≥ 3% (최소) |
| **알림 트리거** | 연속 2개월 전환율 < 3% → 가격 정책 또는 온보딩 리뷰 |

---

### KPI-L3-04: 결제 성공 / 실패율

| 항목 | 내용 |
|------|------|
| **정의** | 결제 시도 대비 성공 비율. 실패 유형(카드 거절·타임아웃 등) 분류. |
| **측정 SQL** | ```sql SELECT DATE_TRUNC('week', created_at) AS week, status, COUNT(*) AS n, ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER (PARTITION BY DATE_TRUNC('week', created_at)) * 100, 1) AS pct FROM payments GROUP BY 1, 2 ORDER BY 1 DESC, 2; ``` |
| **임계값** | 결제 성공률 ≥ 95% |
| **알림 트리거** | 시간당 결제 실패율 > 10% → PG사 상태 페이지 확인 + 알림 |

---

### KPI-L3-05: MRR (Monthly Recurring Revenue)

| 항목 | 내용 |
|------|------|
| **정의** | 월별 반복 매출. 플랜별 분리, MoM 성장률 포함. |
| **측정 SQL** | ```sql WITH monthly AS ( SELECT DATE_TRUNC('month', created_at) AS month, plan, SUM(amount) AS mrr FROM payments WHERE status = 'success' GROUP BY 1, 2 ) SELECT month, plan, mrr, ROUND((mrr - LAG(mrr) OVER (PARTITION BY plan ORDER BY month)) / NULLIF(LAG(mrr) OVER (PARTITION BY plan ORDER BY month), 0) * 100, 1) AS mom_growth_pct FROM monthly ORDER BY month DESC, plan; ``` |
| **임계값** | MoM MRR 성장률 ≥ 10% (성장기) |
| **알림 트리거** | MRR 전월 대비 감소 → finance-tracker 주간 리포트 강조 표시 |

---

### KPI-L3-06: API 비용 / 매출 비율

| 항목 | 내용 |
|------|------|
| **정의** | AI API 비용(Claude/OpenAI/Kimi 등) 합계 ÷ 월 매출. 단위경제 건전성 지표. |
| **측정 방법** | API 비용은 `api_costs` 테이블 또는 CSV 수동 입력; 매출은 payments 집계 |
| **측정 SQL** | ```sql SELECT c.month, c.total_api_cost, p.mrr, ROUND(c.total_api_cost / NULLIF(p.mrr, 0) * 100, 1) AS cost_revenue_ratio_pct FROM ( SELECT DATE_TRUNC('month', recorded_at) AS month, SUM(cost_usd) AS total_api_cost FROM api_costs GROUP BY 1 ) c JOIN ( SELECT DATE_TRUNC('month', created_at) AS month, SUM(amount) AS mrr FROM payments WHERE status = 'success' GROUP BY 1 ) p ON c.month = p.month ORDER BY c.month DESC; ``` |
| **임계값** | API 비용/매출 비율 ≤ 25% (지속 가능 임계); ≤ 15% (목표) |
| **알림 트리거** | 비율 > 35% 이면 finance-tracker 즉시 알림 + 모델 최적화 검토 |

---

## 통계 대시보드 (n317) — 핵심 5개 카드

이슈 n317 통계 대시보드에 표시할 최우선 카드 5개를 아래와 같이 선정한다.  
선정 기준: **의사결정 즉시성** + **이상 탐지 민감도** + **학습/재무 균형**.

| 순위 | 카드 명 | 참조 KPI | 시각화 | 이유 |
|------|---------|---------|--------|------|
| 1 | **DAU 7일 추이** | L1-01 | 라인 차트 | 서비스 생명 징후 — 매일 확인해야 하는 최우선 지표 |
| 2 | **모듈 완료율 × 텍스트** | L1-02 | 수평 바 차트 | 콘텐츠별 드롭아웃 파악 → 즉각적 UX 개선 포인트 |
| 3 | **AI 튜터 응답 별점 (p50/p95 latency 병기)** | L2-01, L2-02 | 복합 카드 (숫자 + 스파크라인) | 품질과 속도 동시 모니터링; 가장 체감 빠른 이탈 원인 |
| 4 | **D7 잔존율 코호트** | L1-05 | 코호트 히트맵 | 습관 형성 여부 판단; 온보딩 개선 효과 주 단위 측정 |
| 5 | **MRR + API 비용/매출 비율** | L3-05, L3-06 | 듀얼 라인 (축 분리) | 재무 생존 지표; 비용이 매출보다 빠르게 오르면 즉시 대응 필요 |

---

## 핸드오프

| 수신자 | 전달 내용 |
|--------|-----------|
| **백그림 [UI/UX]** | 위 5개 카드 명세를 와이어프레임 입력으로 사용. 각 카드의 시각화 유형과 표시 데이터 컬럼 정의 포함. |
| **차곡담 [데이터 설계]** | `sessions.perspective`, `evaluations.score`, `chat_messages.latency_ms/tokens/rating/rejected/prompt_version`, `api_costs` 테이블 인덱스 결정에 위 SQL의 GROUP BY / WHERE 컬럼 참조. |

---

## MEMORY UPDATE

### work.md (append)
- 2026-05-30: ALI-65 — Brain180 v2 KPI 3계층 명세 작성 완료 (`brain180/docs/modules/kpi.md`)

### learnings.md (append)
- Brain180 v1은 DB 없음(파일 기반 feedback.json). KPI SQL은 v2 PostgreSQL 스키마 전제로 작성함.
- 3 perspectives(cognitive/value/temporal)가 이미 타입으로 정의됨 → L1-03 3축 점수 KPI로 직접 연결 가능.
- AI provider가 다중(Claude/OpenAI/Kimi/Gemini/Ollama) — prompt_version 컬럼에 provider 포함 권장.

### decisions.md (append)
- 대시보드 핵심 5카드: DAU추이, 모듈완료율, 튜터별점+레이턴시, D7코호트, MRR+비용비율 선정.
  근거: 학습(L1)·품질(L2)·재무(L3) 균형 + 이상 탐지 즉시성 최우선.

### mistakes.md (append)
- (없음)
