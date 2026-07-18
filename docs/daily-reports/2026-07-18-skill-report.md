## 🛸 스킬 발전 사항 일일 보고 — 2026년 7월 18일 KST

> **보고 주체**: Alien Agentic subagent-builder
> **대상 이슈**: ALI-14 (Multica 이슈 ID: `0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7`)
> **비고**: multica CLI 미설치, `MULTICA_TOKEN` 미설정 — GitHub 파일 대체 보고 (reply.md)

---

### 📡 최신 동향

#### Claude Code 릴리즈 현황 (2026-07-16 이후 — 2일간 2개 버전)

| 버전 | 일자 | 핵심 변경사항 |
|------|------|--------------|
| **v2.1.214** | 2026-07-18 (오늘) | 보안 강화 4건, `EndConversation` 도구 추가, 장기 도구 호출 주기적 하트비트 |
| **v2.1.212** | 2026-07-17 | `/fork` → 백그라운드 세션, `/subtask` 신설, WebSearch 세션 한도 200회, 서브에이전트 스폰 한도 200개 |

---

#### v2.1.214 상세 (오늘 — 2026-07-18)

**보안 수정 4건:**
- 🔐 Windows PowerShell 5.1 세션에서 퍼미션 검사 우회 취약점 수정
- 🔐 파일 디스크립터 리다이렉트 및 10,000자 초과 장명령에 대한 Bash 퍼미션 검사 누락 수정
- 🔐 `help` 및 `man` 명령어 자동 승인 오류 수정 (위험 명령 숨김 가능성)
- 🔐 원격 세션 퍼미션 프롬프트가 로컬 확인 전에 진행되던 버그 수정

**신규 기능:**
- 🆕 `EndConversation` 도구 추가 — 악의적 사용자 / 탈옥 시도 탐지 시 대화 종료 가능
- ⏱️ 장기 도구 호출 시 주기적 진행 하트비트 추가 (이전: 카운터만, 오늘: 주기적 상태 보고)
- 📝 메모리 파일 프론트매터에 ISO `modified` 타임스탬프 추가
- 🐳 daemon-redirect 플래그 사용 `docker` 명령에 퍼미션 프롬프트 추가

**버그 수정:**
- `dir/**` 단일 세그먼트 허용 규칙이 중첩 쓰기를 잘못 자동 승인하던 문제 수정
- zsh 변수 서브스크립트 오판 수정
- 백그라운드 데몬 소켓 삭제 및 세션 정리 문제 수정
- 파워셸 도구가 stdin 대기 자식 프로세스에서 멈추던 문제 수정
- 제거 불가 백그라운드 세션 버그 수정

---

#### v2.1.212 상세 (2026-07-17)

**UX 재설계:**
- 🔀 **`/fork` 재설계**: 이제 `/fork`는 현재 대화를 새로운 **백그라운드 세션**(`claude agents`에 별도 행)으로 복사. 기존 인-세션 서브에이전트 방식은 `/subtask`로 분리
- 🆕 **`/subtask` 신설**: 인-세션 서브에이전트 기능 대체 — 현재 세션 내부에서 서브태스크 실행
- 📋 **`/resume` 재설계**: 삭제된 세션 포함 과거 세션 목록 피커로 변경
- 🔄 **`claude auto-mode reset` 명령 추가**: 확인 절차 포함 Auto 모드 리셋

**리소스 한도 (⚠️ 27인 에이전트 시스템 직접 영향):**
- 🛑 **WebSearch 세션 한도**: 기본값 200회/세션 (`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`으로 조정 가능)
- 🛑 **서브에이전트 스폰 한도**: 기본값 200개/세션 (`CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION`으로 조정, `/clear`로 초기화)
- ⏱️ **MCP 도구 호출 2분 초과 시 자동 백그라운드 전환**

**버그 수정:**
- 플랜 모드에서 파일 수정 Bash 명령이 프롬프트 없이 자동 실행되던 문제 수정
- 워크트리 생성 시 심볼릭 링크 추적으로 리포지토리 경계 침범 취약점 수정
- SIGTERM 시 Bash 프로세스 트리 고아 발생 문제 수정
- `/ultrareview` PR 참조 파싱 수정
- Azure Monitor OpenTelemetry HTTP 내보내기 실패 수정

---

### 🔍 현재 설치된 스킬 현황

#### brain180 프로젝트 레벨 (`.claude/skills/`)
- **없음** — 프로젝트에 스킬 디렉토리 미구성 (**3달 연속 미이행** — 2026-06-16 첫 지적)

#### 전역 스킬 (`~/.claude/skills/`)
- `session-start-hook` — 웹 세션 startup 훅 설정 (1개)

#### Claude Code 번들 스킬 (2026-07-18 기준 — 33개, 07-16 대비 변동 없음)

| # | 스킬명 | 설명 | Brain180 관련성 |
|---|--------|------|----------------|
| 1 | `session-start-hook` | 웹 세션 startup hook | 🟡 중간 |
| 2 | `deep-research` | 멀티소스 팩트체크 리서치 | 🔴 높음 — 천재 텍스트 배경 조사 |
| 3 | `dataviz` | 차트/그래프 시각화 | 🔴 높음 — CognitiveMap 시각화 |
| 4 | `artifact-design` | Artifact 디자인 가이드 | 🔴 높음 — 시각화 Artifact |
| 5 | `artifact-capabilities` | Artifact MCP 런타임 능력 | 🔴 높음 — 인터랙티브 CognitiveMap |
| 6 | `update-config` | settings.json 설정 | 🟡 중간 |
| 7 | `keybindings-help` | 단축키 커스터마이징 | 🟢 낮음 |
| 8 | `verify` | end-to-end 코드 검증 | 🟡 중간 |
| 9 | `code-review` | 코드 diff 리뷰 | 🟡 중간 |
| 10 | `simplify` | 코드 간소화 | 🟡 중간 |
| 11 | `fewer-permission-prompts` | 허용 목록 자동화 | 🟡 중간 |
| 12 | `loop` | 반복 작업 예약 | 🔴 높음 — 이 보고 루틴 자체 |
| 13 | `claude-api` | Claude API 참조 | 🔴 높음 — AI 보조 패턴 제안 |
| 14 | `run` | 앱 실행 검증 | 🟡 중간 |
| 15 | `morning` | 조간 브리프 | 🟢 낮음 |
| 16 | `learn` | 개념 학습 가이드 | 🔴 높음 — Brain180 핵심 UX 패턴 |
| 17 | `doc-coauthoring` | 문서 공동 작성 | 🟡 중간 |
| 18 | `web-artifacts-builder` | 복잡한 HTML Artifact | 🔴 높음 — 시각화 캔버스 |
| 19 | `skill-creator` | 새 스킬 생성 | 🔴 높음 — brain180 커스텀 스킬 제작 |
| 20 | `theme-factory` | 테마 팩토리 | 🟡 중간 |
| 21 | `mcp-builder` | MCP 서버 빌더 | 🟡 중간 |
| 22 | `internal-comms` | 내부 커뮤니케이션 | 🟡 중간 |
| 23 | `canvas-design` | 캔버스 디자인 | 🔴 높음 — 드래그 앤 드롭 캔버스 |
| 24 | `brand-guidelines` | 브랜드 가이드라인 | 🟢 낮음 |
| 25 | `slack-gif-creator` | Slack GIF 생성 | 🟢 낮음 |
| 26 | `algorithmic-art` | 알고리즘 아트 | 🟡 중간 — 시각화 탐색 [가설] |
| 27 | `xlsx` | Excel 처리 | 🟢 낮음 |
| 28 | `pptx` | PowerPoint 처리 | 🟢 낮음 |
| 29 | `pdf` | PDF 처리 | 🟡 중간 — 고전 원문 수집 |
| 30 | `docx` | Word 문서 처리 | 🟢 낮음 |
| 31 | `init` | CLAUDE.md 초기화 | 🟡 중간 |
| 32 | `review` | GitHub PR 리뷰 | 🟡 중간 |
| 33 | `security-review` | 보안 리뷰 | 🟡 중간 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| **`brain180-analyze`** | 커스텀 프로젝트 스킬 | 🔴 긴급 | seeds/ 8개 텍스트 분석 워크플로 표준화. **3달 연속 미이행** — `skill-creator` 번들 스킬로 즉시 생성 가능 |
| **`cognitive-map-extractor`** | 커스텀 도메인 스킬 | 🔴 높음 | 텍스트 → CognitiveMap JSON 변환. seeds/ 8개 파일(노자, 공자, 칸트, 손자, 비트겐슈타인 등) 즉시 적용 가능 |
| **서브에이전트 한도 설정 검토** | 환경 설정 | 🔴 높음 (신규) | v2.1.212: 서브에이전트 스폰 **기본 한도 200개/세션** 신설. 27인 에이전트 시스템에서 세션당 대량 스폰 시 차단될 수 있음 — `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` 값 확인 필요 |
| **`/fork` 워크플로 전환** | 운영 방식 | 🔴 높음 (신규) | v2.1.212: `/fork`가 이제 백그라운드 세션 생성. 기존 인-세션 서브에이전트 방식 → `/subtask`로 마이그레이션 필요 [가설] |
| **`EndConversation` 도구 이해** | 보안 정책 | 🟡 중간 (신규) | v2.1.214: 신규 도구 — AI 에이전트가 탈옥/악의적 입력 탐지 시 대화 종료 가능. 27인 에이전트 보안 정책에 반영 검토 |
| **`multica-submit` 자동화** | 커스텀 자동화 | 🟡 중간 — **최장기 미해결** | reply.md → multica 자동 제출. `MULTICA_TOKEN` 환경변수 1회 설정으로 완성 |
| **WebSearch 한도 설정** | 환경 설정 | 🟡 중간 (신규) | v2.1.212: WebSearch 기본 한도 200회/세션. `deep-research` 스킬 사용 시 조기 차단 가능 — 필요시 `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` 상향 |

---

### 📋 오늘의 액션 아이템

1. **[즉시 — 3달 연속 미이행]** `.claude/skills/` 디렉토리 생성 및 커스텀 스킬 작성:
   ```bash
   mkdir -p /home/user/brain180/.claude/skills/
   # skill-creator 번들 스킬 호출로 brain180-analyze 스킬 자동 생성 가능
   ```

2. **[오늘 — 신규 긴급] 서브에이전트 한도 확인**:
   - v2.1.212에서 서브에이전트 스폰 한도 200개/세션 기본값 설정됨
   - 27인 에이전트 시스템 운영 중 세션 내 대량 스폰 패턴 있다면 즉시 환경변수 설정:
   ```bash
   export CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION=500  # 필요 시 상향
   ```

3. **[오늘 — 신규] `/fork` → `/subtask` 마이그레이션**:
   - 기존에 `/fork`를 인-세션 서브에이전트 용도로 사용했다면 이제 `/subtask`로 변경
   - 병렬 백그라운드 실험은 `/fork` 계속 사용

4. **[이번 주] multica PAT 토큰 발급** (2달 연속 미이행):
   - `https://app.multica.ai/settings` → Personal Access Tokens
   - `MULTICA_TOKEN` 환경변수 등록 → 이 보고 루틴 완전 자동화

5. **[이번 주] seeds/ 8개 텍스트 CognitiveMap 변환 착수**:
   - `seeds/tao-te-ching-01.md` — 노자 도덕경 1장
   - `seeds/analects-01.md` — 논어 학이편
   - `seeds/kant-categorical-imperative.md` — 칸트 정언명령
   - `seeds/sunzi-art-of-war-01.md` — 손자병법 1편
   - `seeds/wittgenstein-tractatus-1.md` — 비트겐슈타인 논고
   - `seeds/popper-positivism.md` — 포퍼 실증주의
   - `seeds/little-prince-fox.md` — 어린왕자 여우 장면
   - `seeds/kant-categorical-imperative.md` — 칸트 (중복 확인 필요)

6. **[다음 스프린트] `EndConversation` 도구 활용 검토**:
   - v2.1.214 신규 — 27인 에이전트 중 사용자 대면 에이전트에 탈옥 방어 정책 적용 가능

---

### ⚠️ 지속 리스크

| 항목 | 현황 | 심각도 | 조치 |
|------|------|--------|------|
| `.claude/skills/` 미생성 | **3달 연속 미이행** | 🔴 | `mkdir -p .claude/skills/` 1줄 |
| multica 인증 | 미설정 (CLI 없음, TOKEN 없음) | 🔴 | PAT 발급 1회 |
| 서브에이전트 스폰 한도 (신규) | v2.1.212 기본값 200개 설정됨 | 🔴 | 27인 에이전트 스폰 패턴 즉시 점검 |
| WebSearch 한도 (신규) | v2.1.212 기본값 200회/세션 | 🟡 | `deep-research` 사용 시 모니터링 |
| seeds/ 텍스트 미처리 | 8개 파일 방치 중 | 🟡 | `cognitive-map-extractor` 스킬 작성 후 처리 |

---

### 🔗 참고 자료

- [Claude Code Changelog](https://code.claude.com/docs/en/changelog)
- [GitHub Release v2.1.214](https://github.com/anthropics/claude-code/releases/tag/v2.1.214)
- [GitHub Release v2.1.212](https://github.com/anthropics/claude-code/releases/tag/v2.1.212)
- [Claude Code Updates July 2026 — Releasebot](https://releasebot.io/updates/anthropic/claude-code)
- [Week 28 Whats New — Claude Code Docs](https://code.claude.com/docs/en/whats-new/2026-w28)

---

_조사 소스: Claude Code Changelog v2.1.212~v2.1.214 (2026-07-17~07-18), 현재 세션 스킬 목록 직접 추출_
