## 🛸 스킬 발전 사항 일일 보고 — 2026-05-21 KST

### 📡 최신 동향

#### Claude Code 스킬 시스템 주요 업데이트

- **스킬 즉시 활성화 (2026-01-07)**: 스킬 파일 수정 후 세션 재시작 없이 즉시 반영됨. 스킬 개발 사이클이 대폭 단축됨.
- **Agent Skills 오픈 스탠다드 (2025-12-18)**: Anthropic이 `SKILL.md` 스펙을 오픈 스탠다드로 공개. OpenAI Codex, Google Gemini CLI, GitHub Copilot, JetBrains Junie, AWS Kiro 등 32개+ 도구가 동일 규격 채택. **Write once, use everywhere** 실현.
- **커스텀 명령어와 스킬 통합**: `.claude/commands/` 와 `.claude/skills/` 가 동일하게 동작. 스킬 쪽이 YAML frontmatter, 지원 파일, 동적 컨텍스트 주입 등 추가 기능 제공.
- **Auto Mode (2026-05-~)**: 툴 실행 승인을 모델 기반 분류기에 위임하는 중간 권한 모드 추가. Sonnet 4.6이 트랜스크립트 분류기로 동작.
- **향상된 Hooks (2026-05)**: `terminalSequence` 필드 추가 (데스크탑 알림, 윈도우 타이틀). `Stop`/`SubagentStop` 훅 입력에 `background_tasks`, `session_crons` 필드 추가.

#### MCP (Model Context Protocol) 현황

- **Linux Foundation 이관 (2025-12)**: Anthropic이 MCP를 AAIF(Agentic AI Foundation)에 기부. 커뮤니티 거버넌스 체제로 전환.
- **보안 강화 (2025-06)**: PKCE 필수화, Resource Indicators (RFC 8707), Token Passthrough 금지.
- **생태계**: 9,400개+ 공식 등록 서버, 월 9,700만 SDK 다운로드.
- **2026 로드맵**: 서버리스 환경용 Stateless 세션 모델, MCP Server Cards(서버 검색), 엔터프라이즈 인증 전파 개선.

#### 스킬 고급 기능 (현재 지원)

- **동적 컨텍스트 주입**: `` !`command` `` 구문으로 스킬 실행 전 쉘 명령 결과를 프롬프트에 자동 삽입
- **YAML frontmatter**: `model`, `context: fork`, `allowed-tools`, `paths`, `arguments` 등으로 세밀한 동작 제어
- **Tool Search**: MCP 툴 정의를 필요 시에만 로드해 컨텍스트 절약 (기본 활성화)

---

### 🔍 현재 설치된 스킬 현황

#### 글로벌 스킬 (`~/.claude/skills/`)

| 스킬명 | 설명 | 상태 |
|-------|------|------|
| `session-start-hook` | Claude Code 웹 환경용 SessionStart 훅 생성 도우미 | ✅ 설치됨 |

#### 프로젝트 스킬 (`brain180/.claude/skills/`, `brain180/.claude/commands/`)

| 스킬명 | 설명 | 상태 |
|-------|------|------|
| - | 없음 | ⚠️ 미설치 |

#### 현재 세션에서 사용 가능한 번들 스킬 (Claude Code 내장)

`session-start-hook`, `update-config`, `keybindings-help`, `verify`, `code-review`, `fewer-permission-prompts`, `loop`, `claude-api`, `run`, `init`, `review`, `security-review`

#### `.claude/settings.local.json` 권한 현황

```json
{
  "permissions": {
    "allow": [
      "Bash(node -e ' *)",
      "Bash(cd \"/e/bettermondaynodesystem\" && find ...)",
      "Read(//e/e/**)"
    ]
  }
}
```
> ⚠️ [가설] 이전 프로젝트(`bettermondaynodesystem`)의 권한이 잔존 중. brain180 전용 정리 필요.

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| `brain-analyze` | 신규 프로젝트 스킬 | 🔴 높음 | CognitiveMap 구조 분석 자동화 — 텍스트 → 패턴 추출 워크플로 실행 |
| `cognitive-viz` | 신규 프로젝트 스킬 | 🔴 높음 | D3.js/Cytoscape 시각화 컴포넌트 생성 템플릿 + 검증 자동화 |
| `genius-data` | 신규 프로젝트 스킬 | 🟡 중간 | 천재 텍스트 데이터 JSON 파일 생성 및 스키마 검증 |
| `daily-report` | 신규 글로벌 스킬 | 🟡 중간 | 현재 이 작업 자체를 스킬로 만들어 매일 자동 실행 가능하게 |
| `session-start-hook` 업그레이드 | 기존 스킬 업데이트 | 🟡 중간 | brain180의 Vite+TypeScript 스택에 맞게 npm install + tsc 체크 추가 |
| `agent-orchestrate` | 신규 글로벌 스킬 | 🟠 낮음 | 27명 에이전트 시스템의 병렬 서브에이전트 실행 패턴 표준화 |
| `security-audit-brain180` | 신규 프로젝트 스킬 | 🟠 낮음 | AI 보조 패턴 제안 기능의 prompt injection 위험 정기 검사 |

---

### 📋 오늘의 액션 아이템

1. **`brain180/.claude/skills/brain-analyze/SKILL.md` 생성** — CognitiveMap 스키마 기반 패턴 추출 자동화 스킬 작성
2. **`settings.local.json` 정리** — `bettermondaynodesystem` 잔존 권한 제거, brain180 전용 권한으로 교체
3. **`session-start-hook` 커스터마이즈** — brain180 Vite 스택에 맞게 `npm install && npx tsc --noEmit` 실행하도록 업그레이드
4. **동적 컨텍스트 주입 실험** — `brain-analyze` 스킬에 `` !`find src/data -name "*.json"` `` 패턴 적용하여 데이터 파일 자동 목록화
5. **`daily-report` 글로벌 스킬 초안 작성** — 현재 보고 워크플로를 재사용 가능한 스킬로 캡슐화

---

_보고 기준: 2026-05-21 | 소스: Anthropic 공식 문서, Claude Code GitHub, Agent Skills agentskills.io_
_⚠️ multica CLI 미설치로 GitHub 이슈 대체 제출_
