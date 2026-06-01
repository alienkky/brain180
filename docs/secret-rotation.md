# Brain180 v2 — Secret Rotation Playbook

> 어떤 키가 노출됐을 때 *몇 분 안에 무력화* 시키는가의 절차. 키별로 분리.
> Owner: 연다리 [통합설계]. Last updated: 2026-06-01.

## 0. 즉시 회전이 필요한 시점

- 키가 git 커밋, Slack, 이메일, GitHub Issue, 캡처 이미지, 외부 채팅, 공개 로그 *어디에든* 노출됐을 때.
- 회사 PC 분실, 협업자 이탈, 의심스러운 API 호출 패턴 발견.
- *대화 로그가 외부 시스템(예: 본 Multica 이슈 댓글, AI 호출 로그)에 평문으로 남았을 때.*

판단 기준은 단순: "이 문자열을 내가 통제하지 못하는 곳에 한 글자라도 흘렸는가?" 그렇다면 회전.

---

## 1. 현재 회전 필요 키 (2026-06-01 기준)

다음 두 키는 본 이슈 (ALI-60) 의 대화 로그에 평문으로 남아 있다. **외부에 노출된 것과 동등하게 취급.** 매출 라인을 열기 *전에* 회전해야 한다.

| 키 | 마지막 노출 위치 | 회전 우선순위 |
|---|---|---|
| Neon `DATABASE_URL` 패스워드 `npg_bSh3DeuHB9oK` | 이슈 댓글 (개발 초기) | 🔴 P0 |
| Moonshot `MOONSHOT_API_KEY` `sk-WD7cYnoxA0SVRNnFXiZ6kZabujHHauUi2VZLk3sI22i8osjI` | 이슈 댓글 (개발 초기) | 🔴 P0 |

회전 완료 후 본 표의 두 행은 `~~취소선~~` 처리하고 회전 일자를 명기한다.

---

## 2. Neon Postgres 비밀번호 회전

### 차단

1. https://console.neon.tech → 해당 프로젝트 → **Roles & Databases** 탭
2. `app` role → **Reset password** 클릭 → 새 비번 발급 (Neon 이 자동 생성)
3. *기존 비번은 그 순간 무효화* 됨. dev:server 가 떠있다면 다음 쿼리부터 실패.

### 재투입

4. 새 `DATABASE_URL` 을 다음 두 곳에 갱신:
   - 로컬 `E:\brain180\.env` 의 `DATABASE_URL=` 라인
   - (운영 배포 시) Railway env vars 의 동일 키
5. 로컬: `npm run dev:server` 재시작 → 부팅 로그에 에러 없으면 OK
6. `npm run smoke:http` 로 1회 검증

### 사후

7. Neon 콘솔 → **Operations** 탭에서 직전 1시간 쿼리 로그 훑어 *모르는 IP 의 접속* 흔적 점검
8. 본 문서의 §1 표에서 해당 행 취소선 + 회전 일자 기록
9. 이슈 댓글에 *"노출됐던 키는 무효화됨"* 1줄 코멘트 (값은 다시 적지 않는다)

### 비용/시간

- Neon 회전 자체 무료, 30초.
- 운영 중이라면 *순간적인* 503 가능. 운영 전 회전 권장.

---

## 3. Moonshot (Kimi) API 키 회전

### 차단

1. https://platform.moonshot.ai → **API Keys** 탭
2. 노출된 키 옆 **Revoke** 클릭
3. **Create new key** → 권한 범위 최소 (chat-completions 만)

### 재투입

4. 새 키를 다음에 갱신:
   - 로컬 `E:\brain180\.env` 의 `MOONSHOT_API_KEY=` 라인
   - (운영) Railway env vars
5. 로컬: `npm run dev:server` 재시작 → `npm run smoke:tutor` 1회 (DB-레이어 검증) → `npm run smoke:http` 1회 (HTTP-레이어 검증)

### 사후

6. Moonshot 콘솔 → **Usage** 탭에서 회전 *직전 24시간* 사용량 확인. 모르는 호출 패턴 있으면 청구 분쟁 케이스 비축.
7. 본 문서의 §1 표 갱신.

### 비용/시간

- Moonshot 회전 자체 무료, 1분.
- 무효화된 키로 진행 중인 호출은 401 로 즉시 끊김. *진행 중 사용자 요청 있다면 retry 안내 필요.* (Day-1 단계라 무시 가능.)

---

## 4. ANON_SALT / SESSION_SECRET 회전

### 영향

- `ANON_SALT` 회전 → 기존 익명화 ID 가 새 ID 와 *연결 끊김*. 분석 연속성이 사라지므로 *드물게만* 회전.
- `SESSION_SECRET` 회전 → 발급된 *모든 Lucia 세션 즉시 만료*. 모든 사용자 재로그인 필요.

### 절차

1. 32바이트 무작위 생성:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. `.env` 의 해당 라인 교체 → 재시작.
3. SESSION_SECRET 회전 시 *공지* 필수 (사용자가 갑자기 로그아웃됨).

### 권장 주기

- ANON_SALT: 회전 안 함 (분석 연속성 우선). 노출 시에만.
- SESSION_SECRET: 90일 또는 *세션 탈취 의심* 시.

---

## 5. Toss / R2 / Resend (현재 미사용)

해당 서비스 발급 시점에 본 문서에 회전 절차 1섹션씩 추가한다. 발급 즉시 회전 주기를 캘린더에 등록 (180일 권장, Toss 의 경우 매출 라인이므로 더 짧게).

---

## 6. 회전 자동화 — 추후 (보류)

수동 회전이 회전 안 됨의 가장 큰 원인. 다음은 향후 자동화 후보:

- GitHub Actions cron + Vault 회전 → Railway env 갱신
- Doppler / Infisical 같은 secret manager 도입 검토
- 단, *현 단계는 키가 3~4개뿐* 이므로 수동으로 충분.

---

## 7. 키 노출 사고가 났을 때의 *행동 순서* (1페이지)

1. **차단** — 노출된 키 즉시 revoke (60초 안에)
2. **재투입** — 새 키 생성 → `.env` + Railway → 재시작 → smoke 1회
3. **점검** — 노출 ~ 차단 사이 구간의 사용량 로그 확인 (Neon Operations, Moonshot Usage 등)
4. **기록** — 본 문서 §1 표 갱신. 무엇이 어디에 노출됐는지 1줄
5. **공지** — 영향받는 사용자 있으면 재로그인 안내 (SESSION_SECRET 회전 시)
6. **회고** — 어떤 채널로 노출됐는지, 같은 채널에 다른 키도 흘렸을 가능성 점검

회전을 두려워하지 마라. **회전 안 한 키가 1년 굴러간 채로 발견되는 것이 훨씬 비싸다.**
