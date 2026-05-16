## 🛸 스킬 발전 사항 일일 보고 — 2026-05-16 KST

---

### 📡 최신 동향

**Claude Code v2.1.x (2026년 4~5월) 주요 변경사항:**

- **커스텀 명령어 → 스킬로 통합**: v2.1.101(2026-04-11)부터 `.claude/commands/` 파일과 `.claude/skills/` 디렉토리가 동일한 `/slash-command` 인터페이스를 공유. 같은 이름일 경우 스킬이 우선. 기존 `.claude/commands/` 파일은 그대로 동작하나 스킬 방식이 권장됨.
- **스킬 새 프론트매터 필드 추가**:
  - `paths`: 특정 파일 패턴에서만 스킬 자동 활성화 (모노레포 지원)
  - `effort`: 스킬 실행 시 추론 노력 수준 지정 (`low` ~ `max`)
  - `hooks`: 스킬 라이프사이클 전용 훅 설정
  - `shell`: PowerShell 지원 (`bash` 또는 `powershell`)
  - `${CLAUDE_SKILL_DIR}`: 스킬 디렉토리 절대경로 변수
- **스킬 자동 발견(Live Detection)**: 세션 중 스킬 파일 추가/수정/삭제가 재시작 없이 즉시 반영
- **중첩 디렉토리 스킬 발견**: 하위 디렉토리 작업 시 해당 경로의 `.claude/skills/`도 자동 로드 (모노레포 최적화)
- **skillOverrides 설정**: `/skills` 메뉴에서 Space 키로 스킬 표시 상태(`on`/`name-only`/`user-invocable-only`/`off`) 전환, `settings.local.json` 자동 저장
- **`/doctor` 명령어**: 스킬 예산 오버플로우 여부 및 영향받는 스킬 목록 진단
- **hooks MCP 도구 직접 호출**: `type: "mcp_tool"` 타입으로 훅에서 MCP 도구 직접 실행 가능
- **PostToolUse 훅 확장**: `hookSpecificOutput.updatedToolOutput`으로 모든 도구 출력 교체 가능 (이전엔 MCP 전용)
- **terminalSequence 필드**: 훅 JSON 출력에서 데스크탑 알림, 창 제목, 벨 신호 발송 가능
- **`xhigh` 추론 수준**: Opus 4.7 코딩/에이전트 워크로드의 새 기본값
- **`/model` 개선**: API 게이트웨이 `/v1/models` 엔드포인트 모델 목록 자동 반영
- **`claude project purge`**: 프로젝트 상태(트랜스크립트, 태스크, 파일 히스토리, 설정) 완전 삭제 명령어 추가 (`--dry-run`, `-y`, `-i`, `--all` 지원)
- **MCP stdio 서버**: `CLAUDE_PROJECT_DIR` 환경변수 수신 지원 (훅과 동일)
- **원격 MCP 재연결**: 일시적 오류 시 자동 재연결 전체 사용자 적용

**Agent Skills 오픈 표준 채택**: Claude Code 스킬이 agentskills.io 오픈 표준을 준수하여 타 AI 도구와 스킬 호환성 확보. 커뮤니티 스킬 생태계 규모: 약 15,000개 이상 스킬 리포지토리 인덱싱됨(2026-05-01 기준).

---

### 🔍 현재 설치된 스킬 현황

**brain180 프로젝트 (`.claude/`):**

| 항목 | 내용 |
|------|------|
| `.claude/skills/` | **없음** (스킬 디렉토리 미생성) |
| `.claude/commands/` | **없음** |
| `settings.local.json` | 허용 권한 3개만 정의 (스킬 설정 없음) |
| `launch.json` | vite 개발서버 설정만 포함 |

**현재 세션에서 사용 가능한 번들 스킬 (Claude Code 내장):**
- `/simplify` — 코드 리뷰 및 품질 개선
- `/batch` — 다중 작업 병렬 처리
- `/debug` — 버그 진단 및 수정
- `/loop` — 반복 실행 설정
- `/claude-api` — Claude API 연동 코드 작성
- `/init` — CLAUDE.md 초기화
- `/review` — PR 리뷰
- `/security-review` — 보안 취약점 검토
- `/session-start-hook` — 세션 시작 훅 설정
- `/update-config` — settings.json 설정 변경
- `/keybindings-help` — 키바인딩 커스터마이즈
- `/fewer-permission-prompts` — 권한 프롬프트 최소화
- `/statusline-setup` — 상태바 설정

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `why-how-what` | 신규 개인 스킬 | 🔴 최우선 | Alien Agentic 핵심 WHY-HOW-WHAT 컨설팅 프레임워크를 스킬로 구조화. 매 세션 일관된 분석 흐름 보장 |
| `cognitive-map-extract` | 신규 프로젝트 스킬 | 🔴 최우선 | Brain180 핵심 기능: 텍스트 → 뇌인지 구조 패턴 추출 워크플로 자동화 (Claude API 활용) |
| `agent-orchestrate` | 신규 개인 스킬 | 🟠 높음 | 27명 에이전트 시스템 조율 패턴. 작업 분배, 의존성 확인, 병렬 실행 체크리스트 |
| `daily-report` | 신규 개인 스킬 | 🟠 높음 | 오늘처럼 반복되는 일일 보고 작업 자동화. `disable-model-invocation: true` + `context: fork` 조합 |
| `multica-issue-comment` | 신규 개인 스킬 | 🟡 중간 | multica CLI 이슈 코멘트 작성 워크플로 표준화 (보고서 생성 → 제출 원스텝) |
| `brain180-visualize` | 신규 프로젝트 스킬 | 🟡 중간 | CognitiveMap → D3.js/Cytoscape 시각화 코드 생성 보조. `paths: src/core/**` 제한 권장 |
| `genius-text-analyze` | 신규 프로젝트 스킬 | 🟡 중간 | 천재 텍스트 분석 시 4차원 해석 체크리스트 자동 로드. `user-invocable: false`로 자동 트리거 |
| `schema-first` | 신규 프로젝트 스킬 | 🟢 낮음 | UI 작업 전 CognitiveMap 스키마 검증 강제. CLAUDE.md 원칙 코드화 |

---

### 📋 오늘의 액션 아이템

1. **[즉시] `cognitive-map-extract` 스킬 생성**: Brain180 핵심 분석 기능인 텍스트→뇌인지구조 추출 워크플로를 `.claude/skills/cognitive-map-extract/SKILL.md`로 작성. `context: fork` + Claude API 활용 패턴 적용
2. **[즉시] `why-how-what` 스킬 생성**: Alien Agentic 컨설팅 프레임워크의 WHY-HOW-WHAT 3단계 분석을 개인 스킬(`~/.claude/skills/`)로 구현
3. **[이번 주] `agent-orchestrate` 스킬 설계**: 27명 에이전트 시스템의 태스크 분배 패턴을 스킬로 템플릿화. `disable-model-invocation: true` 필수 (의도치 않은 에이전트 실행 방지)
4. **[이번 주] `daily-report` 스킬 생성**: 오늘 작업한 일일 보고 프로세스를 재사용 가능한 스킬로 캡슐화. `$ARGUMENTS`로 이슈 ID 전달 지원
5. **[참고] 스킬 예산 모니터링**: 스킬 수가 늘어날수록 `/doctor` 명령어로 description 예산 오버플로우 주기적 점검. 필요시 `skillListingBudgetFraction` 조정
6. **[가설] MCP 훅 연동 검토**: `type: "mcp_tool"` 훅으로 multica MCP 서버가 있다면 이슈 코멘트를 훅에서 자동 실행하는 방식 탐색

---

*보고: Alien Agentic subagent-builder | 환경: brain180 원격 실행 컨테이너 | multica CLI v0.3.1*
