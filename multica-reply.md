## 🛸 스킬 발전 사항 일일 보고 — 2026-05-27 KST

### 📡 최신 동향 (Claude Code v2.1.139 기준 — 2026년 5월 15일)

**Week 20 (v2.1.139–v2.1.142, 5/11–15):**
- **`/goal` 슬래시 명령** 추가: 완료 조건을 설정하면 Claude가 조건 충족 시까지 자동으로 계속 작업 (인터랙티브 / `-p` / Remote Control 모두 지원)
- **`claude agents` (Agent View)**: 모든 Claude Code 세션을 하나의 화면에서 관리 — 실행 중, 대기 중, 완료된 에이전트를 한눈에 확인 (research preview)
- **Fast mode → Opus 4.7 기본값**: `/fast` 명령이 이제 Opus 4.7 기반으로 약 2.5× 속도 향상
- **새 훅 기능**: `continueOnBlock` (거부 이유를 Claude에게 피드백 후 계속 진행), `terminalSequence` (훅에서 데스크톱 알림/벨 발송)
- **플러그인 root `SKILL.md` 자동 스킬 노출**: `skills/` 서브디렉토리 없이 플러그인 루트에 `SKILL.md`만 있어도 스킬로 인식

**Week 19 (v2.1.128–v2.1.136, 5/4–8):**
- 플러그인 `.zip` 아카이브 및 URL 로드 지원 (`--plugin-url`)
- Auto mode **hard deny rules**: allow 예외 무관하게 특정 액션 절대 차단
- 훅에서 `$CLAUDE_EFFORT` 환경 변수로 현재 effort 수준 접근 가능

**Week 18 (v2.1.120–v2.1.126, 4/27–5/1):**
- `claude ultrareview`: CI 및 스크립트에서 클라우드 코드 리뷰 실행 가능

**Week 16–17 (4/13–4/24):**
- Claude Opus 4.7 기본 모델, `xhigh` effort 레벨 추가, `/effort` 인터랙티브 슬라이더
- 웹에서 **Routines**: 스케줄/GitHub 이벤트/API로 클라우드 에이전트 자동 실행
- **모바일 푸시 알림**: 장시간 작업 완료 또는 입력 필요 시 폰으로 알림
- `/usage` 명령으로 토큰 사용량 확인

**스킬 시스템 구조 변화 (2026 현재 확정):**
- `.claude/commands/*.md` 와 `.claude/skills/*/SKILL.md` 가 **완전히 통합** — 두 방식 모두 동일한 `/command` 생성
- 새 프론트매터 필드: `when_to_use`, `argument-hint`, `arguments`, `model`, `effort`, `hooks`, `paths`, `shell`
- 새 변수: `$CLAUDE_SKILL_DIR`, `$CLAUDE_SESSION_ID`, `$CLAUDE_EFFORT`, `$ARGUMENTS[N]`, `$N`
- 스킬 파일 변경 시 **재시작 없이 즉시 반영** (Live change detection)
- 스킬은 [AgentSkills.io](https://agentskills.io) 오픈 표준 준수 (다른 AI 도구와 호환 가능)
- `context: fork` + `agent:` 조합으로 특정 서브에이전트 유형 지정 가능

---

### 🔍 현재 설치된 스킬 현황 (brain180 / Alien Agentic 환경)

**개인 전역 스킬 (`~/.claude/skills/`):**
| 스킬명 | 설명 |
|--------|------|
| `session-start-hook` | 웹 세션 시작 시 의존성 설치 훅 생성 도우미 |

**환경 번들 스킬 (현재 세션에서 확인된 내장 스킬):**
| 스킬명 | 용도 |
|--------|------|
| `session-start-hook` | 웹 원격 세션 스타트업 훅 |
| `update-config` | settings.json 설정 (훅, 권한, 환경변수) |
| `keybindings-help` | 키보드 단축키 커스터마이즈 |
| `verify` | 코드 변경사항 앱 실행으로 검증 |
| `code-review` | diff 코드 리뷰 (low/medium/high/ultra) |
| `simplify` | diff 리뷰 + 자동 수정 |
| `fewer-permission-prompts` | 권한 프롬프트 줄이기 |
| `loop` | 반복 실행 스케줄링 |
| `claude-api` | Claude API / Anthropic SDK 앱 빌드 |
| `run` | 앱 실행 및 실제 브라우저 확인 |
| `init` | CLAUDE.md 초기화 |
| `review` | PR 리뷰 |
| `security-review` | 보안 리뷰 |

**프로젝트 스킬 (`.claude/skills/`):** 없음
**글로벌 설정 (`~/.claude/settings.json`) 훅:** Stop 훅 (미커밋 변경사항 검사)

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `daily-report` | 신규 개인 스킬 | 🔴 높음 | 오늘과 같은 일일 보고 작업을 `/daily-report` 한 번으로 자동화. `/goal` 기능과 연계하면 완료까지 무인 실행 가능 |
| `multica-report` | 신규 개인 스킬 | 🔴 높음 | multica issue comment add 명령 패턴 + 보고서 포맷을 캡슐화하여 매번 재작성 불필요 |
| `why-how-what` | 신규 개인 스킬 | 🟠 중간 | Alien Agentic 핵심 컨설팅 프레임워크(WHY-HOW-WHAT)를 스킬화. `user-invocable: false`로 Claude가 컨설팅 맥락 감지 시 자동 적용 |
| `subagent-orchestrator` | 신규 개인 스킬 | 🟠 중간 | 27명 에이전트 역할 정의 및 태스크 라우팅 가이드 스킬. `context: fork` + `agent:` 로 적절한 서브에이전트 자동 선택 |
| `cognitive-map-extractor` | 신규 프로젝트 스킬 | 🟠 중간 | Brain180 핵심: 텍스트 → 인지 구조 추출 프로세스를 표준화. `CognitiveMap` 스키마 기반 |
| `visualization-generator` | 신규 프로젝트 스킬 | 🟡 보통 | D3.js/Three.js 노드 그래프 생성 절차를 스킬화. Brain180 시각화 레이어 개발 속도 향상 |
| `goal` 활용 전략 | 기존 기능 활용 | 🔴 높음 | `/goal all tests pass and PR merged` 패턴으로 장시간 에이전트 태스크에 자동 완료 조건 설정 |
| `run-skill-generator` 실행 | 기존 스킬 활용 | 🟡 보통 | Brain180 개발 환경(Vite/port 5173)을 `.claude/skills/run-brain180/`에 레코딩 → 이후 `/run`, `/verify` 자동 작동 |

---

### 📋 오늘의 액션 아이템

1. **`~/.claude/skills/daily-report/SKILL.md` 생성**: 오늘 이 작업 흐름(웹 조사 → 현황 파악 → multica 보고)을 스킬로 기록. `!` 동적 컨텍스트 인젝션으로 날짜 자동 주입
2. **`/goal` 명령 Brain180 개발에 즉시 적용**: 예: `/goal CognitiveMap 타입 정의 완료 및 TypeScript 컴파일 오류 0개` 
3. **`/run-skill-generator` 실행**: Brain180 Vite 개발 서버 시작 레시피 기록 → `/run` · `/verify` 활성화
4. **Brain180용 프로젝트 스킬 디렉토리 생성**: `.claude/skills/cognitive-map-extractor/SKILL.md` — CognitiveMap 스키마 기반 인지 구조 추출 절차 문서화
5. **[가설] `claude agents` 대시보드 활용**: Brain180 분야별(철학/과학/문학) 인지 지도 추출을 병렬 에이전트로 분산 처리 가능 여부 검토

---

> **조사 출처:**
> - [Claude Code What's New](https://code.claude.com/docs/en/whats-new) (v2.1.139–v2.1.142, 2026-05-15)
> - [Extend Claude with Skills 공식 문서](https://code.claude.com/docs/en/skills)
> - [GitHub - anthropics/claude-code CHANGELOG](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
> - [Awesome Claude Code](https://github.com/hesreallyhim/awesome-claude-code)
> - [Multica CLI 문서](https://github.com/multica-ai/multica/blob/main/CLI_AND_DAEMON.md)
