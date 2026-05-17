## 🛸 스킬 발전 사항 일일 보고 — 2026-05-17 KST

---

### 📡 최신 동향

**Skills 아키텍처 공식 변화:**
- `.claude/commands/` 형식은 **레거시(legacy)로 공식 지정**. 현재 권장 형식은 `.claude/skills/<name>/SKILL.md`
- Skills는 슬래시 커맨드(`/name`)와 **자율 호출(autonomous invocation)** 동시 지원 — Claude가 컨텍스트 판단해 스스로 발동
- `invocation_trigger` 텔레메트리 속성 추가: `user-slash`, `claude-proactive`, `nested-skill` 세 가지 호출 경로 구분 가능

**2026년 신규 빌트인 슬래시 커맨드:**
- `/loop` — 반복 실행 태스크 설정 (예: `5m` 간격 반복)
- `/batch` — 다수 태스크 병렬 처리
- `/effort` — 모델 추론 깊이 조절 (`xhigh`는 Opus 4.7 지원, 인수 없으면 인터랙티브 슬라이더)
- `/diff` — Claude가 변경한 전체 diff 인터랙티브 뷰어
- `/skills` — 현재 사용 가능한 스킬 전체 목록 출력

**Hooks 시스템 확장 (12개 → 21개 라이프사이클 이벤트):**
- `terminalSequence` 필드 추가: 데스크탑 알림, 창 제목, 벨 신호 출력 가능
- `--init`, `--init-only`, `--maintenance` CLI 플래그로 Setup 훅 트리거 가능
- `type: "mcp_tool"` 훅 타입: 훅에서 MCP 도구 직접 실행 가능
- `PostToolUse` 훅: `hookSpecificOutput.updatedToolOutput`으로 모든 도구 출력 교체 가능

**Agent SDK Skills 통합:**
- SDK에서 `skills: "all"` 또는 이름 리스트로 활성화 제어
- `settingSources: ["user", "project"]` 명시 필수 — 생략 시 스킬 미로드
- Plugin 시스템으로 서드파티 스킬 번들 배포 가능
- `plugin:skill` 형식으로 네임스페이스 구분

**MCP 생태계 (2026년 5월 현재):**
- 공식 레지스트리 서버 9,400개+, SDK 다운로드 9,700만회/월
- Skills + MCP 결합 권장 패턴: MCP는 외부 도구 접근, Skills는 도구 활용 절차 지식 담당
- 기업: `managed-mcp.json`으로 조직 전체 MCP 서버 정책 관리

**[가설] Agent Skills 오픈 표준**: Skills가 agentskills.io 오픈 표준 준수 방향으로 발전 중인 것으로 보임 — 커뮤니티 스킬 생태계 규모 급성장.

---

### 🔍 현재 설치된 스킬 현황

**전역 스킬 (`~/.claude/skills/`):**

| 스킬명 | 상태 | 설명 |
|-------|------|------|
| `session-start-hook` | ✅ 설치됨 | SessionStart 훅 생성 — 웹 세션에서 의존성 자동 설치 |

**brain180 프로젝트 (`.claude/`):**

| 항목 | 내용 |
|------|------|
| `.claude/skills/` | **없음** (스킬 디렉토리 미생성) |
| `.claude/commands/` | **없음** |
| `settings.local.json` | 허용 권한 3개 (스킬 설정 없음) |
| `launch.json` | vite 개발서버 설정만 포함 |

**현재 세션에서 사용 가능한 번들 스킬 (Claude Code 내장):**
- `/session-start-hook` — 웹 환경 SessionStart 훅 설정
- `/update-config` — settings.json 자동화/훅 설정
- `/keybindings-help` — 키보드 단축키 커스터마이징
- `/simplify` — 코드 리뷰 및 품질 개선
- `/fewer-permission-prompts` — 반복 허용 목록 자동 추가
- `/loop` — 반복 실행 태스크 설정
- `/claude-api` — Claude API / Anthropic SDK 앱 빌드 및 최적화
- `/init` — CLAUDE.md 초기화
- `/review` — PR 코드 리뷰
- `/security-review` — 현재 브랜치 보안 검토

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `cognitive-map-extract` | 신규 프로젝트 스킬 | 🔴 최우선 | Brain180 핵심: 텍스트 → 뇌인지 구조 노드/엣지 자동 추출. Claude API 패턴 제안 기능 구현 전 스킬 정의 필수 (스키마 우선 원칙) |
| `why-how-what` | 신규 개인 스킬 | 🔴 최우선 | Alien Agentic 컨설팅 프레임워크 핵심. WHY(목적)→HOW(구조)→WHAT(실행) 3층 분석을 `~/.claude/skills/`에 패키징 |
| `content-loader` | 신규 프로젝트 스킬 | 🔴 높음 | 하드코딩 금지 원칙 — JSON 데이터 파일에서 천재 텍스트 로드하는 표준 절차 정의 필수 |
| `agent-orchestrate` | 신규 개인 스킬 | 🟠 높음 | 27명 에이전트 시스템 조율 패턴. 태스크 분배, 의존성 확인, 병렬 실행 체크리스트 템플릿화 |
| `daily-report` | 신규 개인 스킬 | 🟠 높음 | 오늘처럼 반복되는 일일 보고 작업 자동화. `$ARGUMENTS`로 이슈 ID 전달, multica 제출 원스텝화 |
| `brain180-session-start` | 기존 → 프로젝트 적용 | 🟡 중간 | `session-start-hook` 전역 스킬을 brain180에 적용. `.claude/hooks/session-start.sh` 생성 + `npm install` 자동화 |
| `visualization-review` | 신규 프로젝트 스킬 | 🟡 중간 | 시각화 레이어 ↔ 텍스트 레이어 분리 원칙(CLAUDE.md) 자동 검증. 크로스-레이어 의존성 grep 포함 |
| `multica-issue-comment` | 신규 개인 스킬 | 🔵 낮음 | multica CLI `issue comment add` 절차 캡슐화. 보고서 생성 → 제출 원스텝 자동화 |

---

### 📋 오늘의 액션 아이템

1. **[즉시] brain180 `session-start-hook` 등록**: `/session-start-hook` 스킬 실행 → `npm install` 자동화 훅 생성 및 커밋
2. **[즉시] `cognitive-map-extract` 스킬 작성**: `.claude/skills/cognitive-map-extract/SKILL.md` 생성. CognitiveMap 스키마(CLAUDE.md) 기반 노드/엣지 추출 워크플로 정의
3. **[이번 주] `why-how-what` 개인 스킬 작성**: `~/.claude/skills/why-how-what/SKILL.md`. Alien Agentic WHY→HOW→WHAT 3단계 분석 표준화
4. **[이번 주] `daily-report` 스킬 생성**: 오늘 작업 프로세스를 재사용 스킬로 캡슐화. `$ARGUMENTS`로 이슈 ID 전달 지원
5. **[이번 주] `/effort xhigh` 효과 테스트**: 뇌인지 구조 분석처럼 깊은 추론이 필요한 작업에 Opus 4.7 `xhigh` 설정 효과 검증
6. **[다음 주] MCP 훅 연동 검토**: `type: "mcp_tool"` 훅으로 multica MCP 서버 연동 시 이슈 코멘트 자동 실행 가능성 탐색 [가설]

---

*보고: Alien Agentic subagent-builder | 환경: brain180 원격 실행 컨테이너 | multica CLI v0.3.1 | 날짜: 2026-05-17*
