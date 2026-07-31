## 🛸 스킬 발전 사항 일일 보고 — 2026-07-31 KST

### 📡 최신 동향

**Claude Code 주요 업데이트 (2026년 7월)**

- **Claude Opus 5 기본 모델 채택**: Opus 계열 기본 모델이 Opus 5로 업그레이드됨
- **동적 워크플로 확장**: 중첩 서브에이전트(nested subagents) 및 동적 워크플로 기능 대폭 확장
- **`/verify` 및 `/code-review` 스킬 동작 변경**: 이제 직접 호출될 때만 실행됨 (Claude가 자동으로 실행하지 않음) — 이 변경은 기존 자동화 흐름에 영향 줄 수 있음
- **이모지 단축코드 자동완성**: 프롬프트 입력창에서 `:heart:` 등 입력 시 자동완성
- **메모리 누수 수정**:
  - MCP stdio 서버 stderr 버퍼가 서버당 최대 64MB까지 쌓이던 문제 수정
  - LSP 문서가 무제한 열려 있던 문제 → LRU 50개 문서 상한으로 수정
- **서브에이전트·예산·백그라운드 세션 제어 강화**
- **Skills 2.0** [가설]: Q1 2026에 공식 출시된 것으로 보고됨 — 실행 스크립트 포함 전체 워크플로 패키지 형태
- **SKILL.md 포맷**: 2025년 12월 오픈소스화, OpenAI Codex도 동일 스펙 채택 [가설]

**Multica 플랫폼 업데이트**
- Multica CLI v0.4.15 (2026-07-30 릴리즈) — 최신 버전
- Claude Code, Codex, Cursor, OpenCode 등 14개 코딩 도구 공식 지원
- 에이전트를 실제 팀원처럼 관리: 태스크 큐, 팀 조율, 스킬 재사용, 런타임 모니터링

---

### 🔍 현재 설치된 스킬 현황

**프로젝트 레벨 (brain180 리포 `.claude/` 디렉토리)**
- 프로젝트 전용 스킬 없음 (`.claude/skills/` 디렉토리 미존재)
- `.claude/settings.local.json`: 기본 퍼미션 설정만 있음
- `.claude/launch.json`: Vite 개발 서버 설정만 있음

**세션/계정 레벨 현재 설치 스킬 (30개)**

| 스킬명 | 설명 |
|-------|------|
| `session-start-hook` | 세션 시작 훅 설정 |
| `dataviz` | 데이터 시각화 (차트/그래프) |
| `artifact-design` | 아티팩트 디자인 가이드 |
| `artifact-capabilities` | 아티팩트 런타임 기능 |
| `update-config` | settings.json 설정 관리 |
| `keybindings-help` | 키보드 단축키 커스터마이징 |
| `simplify` | 코드 단순화·리팩토링 리뷰 |
| `fewer-permission-prompts` | 퍼미션 프롬프트 최소화 |
| `loop` | 반복 스케줄 작업 설정 |
| `claude-api` | Claude API/Anthropic SDK 레퍼런스 |
| `run` | 앱 실행 및 테스트 |
| `morning` | 아침 브리핑 |
| `learn` | 학습·개념 이해 지원 |
| `doc-coauthoring` | 문서 공동 작성 워크플로 |
| `web-artifacts-builder` | 복잡한 HTML 아티팩트 생성 |
| `skill-creator` | 스킬 생성·수정·최적화 |
| `theme-factory` | 아티팩트 테마 스타일링 |
| `mcp-builder` | MCP 서버 스캐폴딩 |
| `internal-comms` | 내부 커뮤니케이션 |
| `canvas-design` | 캔버스 디자인 |
| `brand-guidelines` | 브랜드 가이드라인 |
| `slack-gif-creator` | Slack GIF 생성 |
| `algorithmic-art` | 알고리즘 아트 생성 |
| `xlsx` | Excel 파일 처리 |
| `pptx` | PowerPoint 파일 처리 |
| `pdf` | PDF 파일 처리 |
| `docx` | Word 파일 처리 |
| `init` | CLAUDE.md 초기화 |
| `review` | GitHub PR 리뷰 |
| `security-review` | 보안 리뷰 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| `multica` | 신규 설치 | ⚡ 최고 | 27명 에이전트 시스템 운영 핵심 — 이슈 트리아지, 코멘트, 메타데이터 관리 자동화 |
| `brain180-cognitive-viz` | 신규 생성 | ⚡ 최고 | Brain180 프로젝트 전용 스킬 — 뇌인지 구조 추출/시각화 패턴 정의 |
| `why-how-what-consulting` | 신규 생성 | 🔥 높음 | WHY-HOW-WHAT 컨설팅 워크플로를 스킬로 패키징하여 에이전트 간 일관성 확보 |
| `frontend-design` | 신규 설치 | 🔥 높음 | 공식 Anthropic 스킬 (277,000+ 설치) — Brain180 UI 개발에 필수 |
| `webapp-testing` | 신규 설치 | 🔥 높음 | Brain180 Playwright 기반 UI 테스트 자동화 |
| `vercel-react-best-practices` | 신규 설치 | 🟡 중간 | React/Vite 기반 Brain180 프론트엔드 품질 향상 |
| `d3-visualization` | 신규 생성 | 🟡 중간 | D3.js 기반 CognitiveMap 시각화 전용 패턴 |
| `agent-squad-coordinator` | 신규 생성 | 🟡 중간 | 27명 에이전트 팀 간 태스크 분배·조율 스킬 |
| `superpowers` | 신규 설치 | 🟢 낮음 | TDD 엄격 강제 및 7단계 개발 방법론 — 코드 품질 향상 |
| `static-analysis` | 신규 설치 | 🟢 낮음 | 정적 분석 자동화 — Brain180 TypeScript 코드 품질 게이트 |

---

### 📋 오늘의 액션 아이템

1. **multica 스킬 설치** — multica-ai/multica-cli 리포에서 multica 스킬 설치 후 `multica login --token <PAT>`으로 인증 설정 (현재 이 세션에서는 PAT 없이 인증 불가 — 사용자 직접 처리 필요)
2. **brain180 전용 스킬 생성** — `skill-creator` 스킬로 `brain180-cognitive-viz` 스킬 생성 시작, SKILL.md에 CognitiveMap 추출 패턴 정의
3. **`frontend-design` 스킬 설치** — Brain180 UI 개발 전 설치 권장 (공식 Anthropic 스킬)
4. **`/verify`·`/code-review` 동작 변경 확인** — 자동화 스크립트에서 이 스킬들을 직접 호출하는 부분 점검 필요
5. **Brain180 `.claude/` 구조 정비** — `skills/` 디렉토리 생성 및 프로젝트 전용 스킬 체계 구축

---

### ⚠️ 주의 사항

- **multica 인증 불가**: 이 자동 실행 세션에는 Multica PAT 토큰이 없어 `multica issue comment add` 명령 실행 불가. 이 보고서는 파일로 저장됨. 다음 수동 세션에서 `multica login --token <PAT>` 후 `multica issue comment add 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7 --content-file ./reply.md` 실행 필요.
- [가설] Skills 2.0 세부 사항은 공식 Anthropic 문서보다 커뮤니티 소스에 더 많이 나타남 — 공식 확인 필요

---

_보고 생성: 2026-07-31 | 자동 스케줄 실행 | Claude Code (claude-sonnet-4-6)_
