## 🛸 스킬 발전 사항 일일 보고 — 2026년 7월 20일 KST

### 📡 최신 동향

**Claude Code 스킬 시스템 최신 업데이트 (2026년 7월 기준)**

- **v2.1.205+**: `/doctor`가 내장 커맨드에서 번들 스킬로 전환. `disableBundledSkills` 설정 시에도 타이핑 가능 (완전 숨기려면 `skillOverrides: doctor: off` 사용)
- **v2.1.203+**: 중첩 `.claude/skills/` 디렉토리 지원 → 모노레포에서 패키지별 스킬 자동 적용 (예: `apps/web:deploy`)
- **v2.1.202+**: 동일 스킬 재호출 시 중복 콘텐츠 방지 (이미 로드된 경우 짧은 안내 메시지만 표시)
- **v2.1.199+**: 스킬 스태킹 지원 (`/code-review /fix-issue 123` 처럼 여러 스킬 동시 호출), `skillOverrides: "off"` 가 Remote Control·Agent SDK 목록에서도 숨김
- **v2.1.196+**: `${CLAUDE_PROJECT_DIR}` 치환 변수 추가, `disable-model-invocation: true` 이 스케줄 태스크에서도 실행 차단
- **7월 2026**: 안정성·안전성 업데이트 — 권한 체크 강화, `EndConversation` 도구 추가, 장기 작업 대상 프로그레스 하트비트 추가
- **6월 2026**: 3단계 중첩 서브에이전트, 커뮤니티 도구 마켓플레이스, 에이전트별 비용 귀속, 스코프 권한
- **3월 2026**: `/loop` 커맨드 추가, 푸시투토크 음성 모드, 100만 토큰 컨텍스트 윈도우, MCP elicitation

**스킬 생태계 현황**

- Claude Skills Hub: 12,980+ 스킬 등재 (clskills.in)
- `skill-creator` 플러그인: 스킬 eval 자동화 (A/B 비교, 패스율 측정, 설명 튜닝 등)
- agentskills.io 오픈 표준 채택 — Cursor, Codex, Gemini CLI 등 8개 이상 도구에서 호환
- Anthropic 공식 `frontend-design` 스킬: 277,000+ 설치

---

### 🔍 현재 설치된 스킬 현황

**brain180 프로젝트 (`.claude/` 분석)**

| 항목 | 상태 |
|------|------|
| `.claude/skills/` 디렉토리 | ❌ 없음 |
| `.claude/settings.json` | ❌ 없음 (settings.local.json만 존재) |
| `.claude/settings.local.json` | ✅ 존재 (일부 Bash 권한만 설정됨) |
| `.claude/launch.json` | ✅ 존재 (Vite 개발 서버 설정) |

**현재 세션에 로드된 번들/계정 스킬 (Alien Agentic 계정 레벨)**

| 스킬 | 카테고리 |
|------|---------|
| `session-start-hook` | 인프라 |
| `deep-research` | 조사·분석 |
| `dataviz` | 시각화 |
| `artifact-design` / `artifact-capabilities` | UI·아티팩트 |
| `update-config` | 설정 관리 |
| `keybindings-help` | 단축키 |
| `simplify` / `review` / `security-review` | 코드 품질 |
| `fewer-permission-prompts` | 권한 최적화 |
| `loop` | 자동화 |
| `claude-api` | API 참조 |
| `run` | 앱 실행 |
| `morning` | 브리핑 |
| `learn` | 학습 |
| `doc-coauthoring` | 문서화 |
| `web-artifacts-builder` | 프론트엔드 |
| `skill-creator` | 스킬 개발 |
| `theme-factory` / `brand-guidelines` / `canvas-design` / `internal-comms` / `algorithmic-art` | 디자인·창작 |
| `mcp-builder` | MCP 통합 |
| `slack-gif-creator` | 커뮤니케이션 |
| `xlsx` / `pptx` / `pdf` / `docx` | 오피스 |
| `init` | 프로젝트 초기화 |

**번들 스킬 (Claude Code 내장)**

`/doctor`, `/code-review`, `/batch`, `/debug`, `/loop`, `/claude-api`, `/run`, `/verify`, `/run-skill-generator`

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| `cognitive-map-extractor` | 신규 프로젝트 스킬 | 🔴 긴급 | Brain180 핵심 기능 — 고전 텍스트에서 인지 구조 추출 워크플로 정형화 필요 |
| `why-how-what-analysis` | 신규 계정 스킬 | 🔴 긴급 | Alien Agentic 컨설팅 핵심 프레임워크를 스킬로 표준화 |
| `run-skill-generator` 실행 | 번들 스킬 활성화 | 🟠 높음 | brain180 Vite 앱 실행 레시피를 `/run`·`/verify`에 등록 |
| `agent-status-reporter` | 신규 계정 스킬 | 🟠 높음 | 27개 에이전트 시스템의 상태·진행·블로커를 multica 이슈에 자동 보고 |
| `multica-reporter` | 신규 계정 스킬 | 🟠 높음 | multica issue comment add 자동 실행 스킬 (스케줄 작업 연동) |
| `text-visualization-layer` | 신규 프로젝트 스킬 | 🟡 중간 | Brain180 텍스트↔시각화 연동 코드 패턴 및 아키텍처 가이드 캡슐화 |
| `genius-profile` | 신규 프로젝트 스킬 | 🟡 중간 | 분야별 천재의 인지 패턴 데이터를 스킬 참조 파일로 제공 |
| `subagent-orchestrator` | 신규 계정 스킬 | 🟡 중간 | 27명 에이전트 팀에서 context:fork + 중첩 서브에이전트(3단계) 패턴 표준화 |

**[가설]** `skill-creator` 플러그인의 eval 자동화를 활용하면 `cognitive-map-extractor` 스킬 품질을 A/B 테스트로 빠르게 검증 가능할 것으로 추정.

---

### 📋 오늘의 액션 아이템

1. **`/run-skill-generator` 실행** — brain180 Vite 개발 서버 레시피를 `.claude/skills/run-brain180/`에 등록
2. **`why-how-what-analysis` 스킬 초안 작성** — Alien Agentic WHY-HOW-WHAT 프레임워크를 SKILL.md로 문서화
3. **`cognitive-map-extractor` 스킬 설계** — 텍스트 → CognitiveMap 스키마 추출 절차를 스킬로 정형화 (Brain180 CLAUDE.md 데이터 모델 기반)
4. **`multica-reporter` 스킬 생성** — 스케줄 보고 루틴에서 multica CLI 자동 호출하도록 스킬화
5. **`.claude/skills/` 디렉토리 생성** — brain180 프로젝트 레벨 스킬 기반 마련 및 리포에 커밋

---

### ⚠️ 운영 이슈

- **multica CLI 미설치**: 현재 실행 환경(원격 컨테이너)에서 `@multica/cli` npm 패키지 없음 (404), GitHub Releases 직접 다운로드도 네트워크 제한으로 차단(403). 본 보고서는 `/home/user/brain180/reply.md` 에 저장됨. 자동 multica 이슈 코멘트 제출은 실패.
- **권고**: `multica-reporter` 스킬 내에 설치 로직 포함하거나, 환경 설정(session-start-hook)에서 multica CLI를 사전 설치 설정 권장.
