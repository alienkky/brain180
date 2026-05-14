## 🛸 스킬 발전 사항 일일 보고 — 2026-05-14 KST

### 📡 최신 동향

#### Claude Code 스킬 시스템 주요 업데이트 (v2.1.108 ~ v2.1.141)

**스킬(Skills) 아키텍처**
- `.claude/commands/`와 `.claude/skills/` 경로가 완전히 통합됨 — 두 경로 모두 동일한 슬래시 명령으로 작동
- 스킬은 이제 `SKILL.md` + 지원 파일 디렉토리 구조로 구성되며, [Agent Skills 오픈 표준](https://agentskills.io) 준수
- **라이브 변경 감지**: 현재 세션 중 스킬 파일 추가/수정 즉시 반영 (재시작 불필요)
- **중첩 디렉토리 자동 발견**: 모노레포에서 패키지별 `.claude/skills/` 자동 로드

**신규 프론트매터 필드 (주요)**
| 필드 | 기능 |
|------|------|
| `effort` | 스킬 실행 시 모델 노력 수준 오버라이드 (low/medium/high/xhigh/max) |
| `paths` | 특정 파일 패턴과 일치할 때만 스킬 자동 활성화 |
| `shell` | bash/powershell 지정 (Windows 지원) |
| `hooks` | 스킬 생명주기에 종속된 훅 설정 |
| `agent` | `context: fork` 시 사용할 서브에이전트 타입 지정 |

**스킬 메뉴 UX 개선 (v2.1.111~)**
- `/skills` 메뉴에 타입-투-필터 검색 박스 추가
- `t` 키로 토큰 수 기준 정렬 토글
- `skillOverrides` 설정으로 코드 변경 없이 스킬 가시성 제어 (`on`/`name-only`/`user-invocable-only`/`off`)

**신규 스킬 추가**
- `/less-permission-prompts` (v2.1.111): 트랜스크립트 스캔 → 읽기 전용 Bash/MCP 도구 allowlist 자동 제안

#### 훅(Hooks) 시스템 주요 업데이트

- **`PreCompact` 훅** (v2.1.105): 자동 컴팩션 차단 가능 (`exit 2` 또는 `{"decision":"block"}`)
- **`PostToolUse` 도구 출력 교체** (v2.1.121): MCP 전용이었던 `hookSpecificOutput.updatedToolOutput`가 모든 도구로 확장
- **`duration_ms` 필드** (v2.1.122): PostToolUse/PostToolUseFailure 훅 입력에 도구 실행 시간 포함
- **`continueOnBlock` 옵션** (v2.1.139): PostToolUse 거부 시 Claude에게 사유를 피드백하고 턴 계속
- **`terminalSequence` 필드** (v2.1.141): 터미널 없이도 데스크탑 알림·창 제목·벨 전송 가능
- **exec-form 훅** (v2.1.139): `args: string[]` 필드로 쉘 없이 직접 명령 실행

#### 서브에이전트(Subagents) 주요 업데이트

- **Agent View Preview** (v2.1.139): `claude agents` 명령으로 모든 세션 통합 뷰 (실행 중/대기 중/완료)
- **`/goal` 명령** (v2.1.139): 완료 조건 설정 → Claude가 조건 충족까지 자동으로 멀티턴 작업
- **`subagent_type` 대소문자 무감지** (v2.1.140): "Code Reviewer" → code-reviewer 자동 매핑
- **에이전트 ID 추적**: API 요청에 `x-claude-code-agent-id` / `x-claude-code-parent-agent-id` 헤더 포함
- **`CLAUDE_CODE_FORK_SUBAGENT=1`**: 비대화형 세션에서도 포크 서브에이전트 작동

#### OpenTelemetry / 관측성 업데이트

- `claude_code.skill_activated` 이벤트에 `invocation_trigger` 속성 추가 (`user-slash` / `claude-proactive` / `nested-skill`)
- `claude_code.at_mention` 이벤트로 `@`-멘션 해석 추적 가능

---

### 🔍 현재 설치된 스킬 현황

**프로젝트 `.claude/` 디렉토리 분석 결과:**

| 항목 | 상태 |
|------|------|
| `.claude/settings.local.json` | 존재 (권한 규칙만 포함, 스킬 없음) |
| `.claude/launch.json` | 존재 (Vite 개발 서버 설정) |
| `.claude/skills/` 디렉토리 | **없음** |
| `.claude/commands/` 디렉토리 | **없음** |

**현재 프로젝트 레벨 커스텀 스킬: 0개**

세션에서 사용 가능한 번들 스킬 (Claude Code 내장):
- `/simplify` — 변경 코드 품질·재사용성 검토 및 수정
- `/debug` — 디버깅 지원
- `/loop` — 반복 작업 스케줄링
- `/batch` — 배치 작업 처리
- `/claude-api` — Claude API / Anthropic SDK 앱 개발
- `/init` — CLAUDE.md 초기화
- `/review` — PR 리뷰
- `/security-review` — 보안 검토
- `/session-start-hook` — 시작 훅 설정
- `/update-config` — settings.json 설정
- `/keybindings-help` — 키바인딩 설정
- `/fewer-permission-prompts` — 권한 프롬프트 최소화
- `/statusline-setup` — 상태줄 설정

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `why-how-what-analyzer` | 신규 프로젝트 스킬 | 🔴 높음 | Alien Agentic 핵심 워크플로 — 텍스트에서 WHY/HOW/WHAT 구조 자동 추출 |
| `cognitive-map-generator` | 신규 프로젝트 스킬 | 🔴 높음 | Brain180 핵심 기능 — 뇌인지 구조 노드 그래프 데이터 생성 자동화 |
| `agent-status-report` | 신규 개인 스킬 | 🟠 중간 | 27명 에이전트 시스템 — `claude agents` 뷰 + 일일 요약 보고서 생성 |
| `subagent-delegator` | 신규 개인 스킬 | 🟠 중간 | `context: fork` + `agent` 필드 활용 — 독립 서브태스크 자동 위임 |
| `multica-issue-reporter` | 신규 개인 스킬 | 🟠 중간 | multica CLI 연동 — 이슈 코멘트 자동 게시 워크플로 |
| `session-start-hook` 업데이트 | 기존 스킬 개선 | 🟡 낮음 | `PreCompact` 훅 + `terminalSequence` 알림 통합 |
| `commit` | 신규 프로젝트 스킬 | 🟡 낮음 | `disable-model-invocation: true` + `allowed-tools: Bash(git *)` — 실수 방지 |

**Brain180 특화 추천:**

`cognitive-map-generator` 스킬 예시:
```yaml
---
name: cognitive-map-generator
description: 텍스트에서 뇌인지 구조를 추출하여 CognitiveMap JSON 데이터를 생성. 천재 텍스트 분석이나 노드 그래프 데이터 생성 요청 시 사용.
context: fork
agent: general-purpose
effort: high
allowed-tools: Read Write
---

주어진 텍스트에서 CognitiveMap 스키마에 맞는 JSON을 생성하세요:

텍스트: $ARGUMENTS

분석 순서:
1. 핵심 개념 추출 (root/anchor/bridge/branch 노드 분류)
2. 개념 간 관계 매핑 (causes/supports/contrasts/transforms/contains)
3. 시간적 전개 순서 부여 (temporalOrder)
4. 인지 레이어 분류 (1D~4D)
5. data/cognitive-maps/ 디렉토리에 JSON 저장
```

---

### 📋 오늘의 액션 아이템

1. **[즉시]** `.claude/skills/cognitive-map-generator/SKILL.md` 생성 — Brain180 핵심 기능과 직결
2. **[즉시]** `.claude/skills/why-how-what-analyzer/SKILL.md` 생성 — 컨설팅 워크플로 자동화
3. **[이번 주]** `effort` 프론트매터를 기존 스킬에 추가 — 복잡도별 모델 노력 최적화
4. **[이번 주]** `PreCompact` 훅 설정 — 중요 스킬 컴팩션 후 재주입 보장
5. **[가설]** `/goal` 명령 + multica 이슈 연동 자동화 탐색 — 에이전트 자율 작업 완료 추적
6. **[가설]** `claude agents` 뷰를 활용한 27명 에이전트 상태 대시보드 구축 검토

---

*조사 출처: [Claude Code Skills Docs](https://code.claude.com/docs/en/skills) · [Claude Code Changelog](https://code.claude.com/docs/en/changelog) · [GitHub Releases](https://github.com/anthropics/claude-code/releases)*
