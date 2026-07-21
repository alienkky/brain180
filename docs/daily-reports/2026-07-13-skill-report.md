## 🛸 스킬 발전 사항 일일 보고 — 2026-07-13 KST

### 📡 최신 동향

**Claude Code 스킬 생태계 (2026년 7월 기준)**

- **Skills 2.0** (Q1 2026 출시): 단순 프롬프트 주입 → 실행 가능한 스크립트 포함 전체 워크플로 패키지로 진화. xlsx, pptx, docx, pdf 번들 스킬 공식 탑재
- **주간 28 (7/6~10, v2.1.202–206)**: 데스크톱에 인앱 브라우저 내장, `/doctor` 설치 검진 명령 추가, auto mode 트랜스크립트 무결성 보호 강화
- **주간 27 (6/29~7/3)**: **Claude Sonnet 5** 기본 모델 전환 (1M 컨텍스트, 적응형 thinking 기본 활성), 서브에이전트 백그라운드 실행 기본화, Claude Desktop Linux 베타 출시
- **주간 26 (6/22~26)**: `claude mcp login` 쉘 인증, `/rewind`로 `/clear` 이전 대화 복원
- **주간 25 (6/15~19)**: `/config key=value` 인라인 설정 변경, Tool 파라미터 기반 deny/ask 규칙
- **주간 24 (6/8~12)**: 서브에이전트 5단계 체인 지원, `fallbackModel` 최대 3개 폴백 체인, `--safe-mode` 디버깅 모드
- **주간 22 (5/25~29)**: **동적 워크플로** 정식 출시 — 수십~수백 서브에이전트를 스크립트로 오케스트레이션, security-guidance 플러그인 출시
- **주간 21 (5/18~22)**: `/usage` 스킬·서브에이전트·플러그인·MCP별 사용량 분석, `/code-review` 명령 추가
- **주간 16 (4/13~17)**: **Routines** — 스케줄/GitHub 이벤트/API 트리거로 클라우드 에이전트 자동 실행, 모바일 푸시 알림
- **커뮤니티 마켓플레이스**: 21,700+ 스킬 등록, Obra's Superpowers (40.9k stars) 등 생태계 급성장

**MCP 관련 업데이트**

- `claude mcp login/logout` 쉘 명령으로 MCP 서버 인증 간소화
- 플러그인이 `.zip` 아카이브 및 URL에서 직접 로드 가능 (`--plugin-dir`, `--plugin-url`)
- 서브에이전트에서 ToolSearch로 MCP 스키마 온디맨드 로드 표준화

---

### 🔍 현재 설치된 스킬 현황 (brain180 프로젝트)

**프로젝트 레벨 스킬 (`.claude/`)**: 없음 (settings.local.json, launch.json만 존재)

**계정 레벨 활성 스킬 (15개)**:

| # | 스킬명 | 설명 |
|---|--------|------|
| 1 | `learn` | 개념 학습·설명·퀴즈 생성 |
| 2 | `doc-coauthoring` | 문서·제안서·스펙 공동 작성 워크플로 |
| 3 | `web-artifacts-builder` | React/Tailwind/shadcn 복잡 아티팩트 생성 |
| 4 | `skill-creator` | 스킬 생성·수정·성능 평가 |
| 5 | `theme-factory` | 아티팩트 테마 스타일링 (10가지 프리셋) |
| 6 | `mcp-builder` | MCP 서버 설계·구현 가이드 |
| 7 | `internal-comms` | 사내 커뮤니케이션 작성 |
| 8 | `canvas-design` | 포스터·아트·정적 디자인 생성 |
| 9 | `brand-guidelines` | Anthropic 브랜드 스타일 적용 |
| 10 | `slack-gif-creator` | Slack용 애니메이션 GIF 생성 |
| 11 | `algorithmic-art` | p5.js 알고리즘 아트 생성 |
| 12 | `xlsx` | 스프레드시트 파일 처리 |
| 13 | `pptx` | PowerPoint 파일 처리 |
| 14 | `pdf` | PDF 파일 처리 |
| 15 | `docx` | Word 문서 파일 처리 |

**누락된 Claude Code 기본 스킬** (현재 미설치):

Claude Code 시스템 프롬프트에 노출된 빌트인 스킬들 — `session-start-hook`, `deep-research`, `dataviz`, `artifact-design`, `update-config`, `keybindings-help`, `verify`, `code-review`, `simplify`, `fewer-permission-prompts`, `loop`, `claude-api`, `run`, `init`, `review`, `security-review` — 은 프로젝트 레벨에 `.claude/agents/*.md` 방식으로 관리되어 별도 계정 설치 불필요.

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `subagent-orchestrator` | 신규 커스텀 스킬 | 🔴 긴급 | Alien Agentic 27명 에이전트 시스템 오케스트레이션을 위한 동적 워크플로 스크립트 표준화 필요. Week 22 동적 워크플로 출시에 맞춰 설계 |
| `consulting-pattern-extractor` | 신규 커스텀 스킬 | 🔴 긴급 | Brain180 핵심 기능인 WHY-HOW-WHAT 인지 패턴 추출을 AI 보조로 자동화. CognitiveMap 스키마에 맞는 패턴 분류 로직 포함 |
| `dataviz` (Claude Code 빌트인) | 빌트인 활성화 | 🟡 높음 | Brain180 뇌인지 구조 시각화(노드그래프, 흐름도, 레이어맵) 개발 시 차트·대시보드 일관성 확보. Week 26에 `/dataviz` 스킬 정식 추가됨 |
| `deep-research` | 빌트인 활성화 | 🟡 높음 | 천재 인물별 텍스트·인지 구조 심층 조사. 멀티소스 팩트체크 보고서 자동 생성으로 콘텐츠 수집 시간 단축 |
| `routine-reporter` | 신규 커스텀 스킬 | 🟡 높음 | 현재 이 보고서처럼 매일 실행되는 스케줄 루틴의 표준 출력 형식·제출 로직을 스킬로 캡슐화. Routines(Week 16) 연동 |
| `security-review` | 빌트인 활성화 | 🟢 보통 | Brain180 Claude API 연동 코드 및 사용자 데이터 처리 구현 시 보안 검토 자동화 |
| `mcp-builder` ✅ | 기존 스킬 (설치됨) | — | 이미 활성. Multica MCP 서버, Claude API MCP 연동 시 활용 권장 |

---

### 📋 오늘의 액션 아이템

1. **`subagent-orchestrator` 스킬 초안 작성**: 27에이전트 시스템의 역할 분담(role: WHY/HOW/WHAT), 오케스트레이션 패턴(pipeline vs parallel), 컨텍스트 절약 전략을 담은 `.claude/agents/subagent-orchestrator.md` 작성
2. **`consulting-pattern-extractor` 스킬 설계**: Brain180 CognitiveMap 스키마(`CognitiveNode`, `CognitiveEdge`, `Pattern`)에 맞는 텍스트 분석 프롬프트 구조 설계. Anthropic Claude API 호출 로직 포함
3. **`/usage` 명령 실행**: 현재 계획 사용량 중 스킬·서브에이전트·MCP별 비중 점검 (Week 21 기능)
4. **`/doctor` 실행**: 설치 상태 검진, 미사용 스킬·MCP 서버 식별, CLAUDE.md 중복 감지 (Week 28 기능)
5. **Brain180 `.claude/settings.local.json` 업데이트**: `disableBundledSkills` 옵션 검토 및 brain180 프로젝트 전용 스킬 디렉토리(`.claude/agents/`) 구조 초기화
6. **Routines 스케줄 설정**: 현재 매일 아침 보고 루틴을 Claude Code on the web의 Routines 기능(Week 16)으로 등록하여 수동 트리거 제거

---

*조사 소스: [Claude Code What's New](https://code.claude.com/docs/en/whats-new) · [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills) · [Claude Code Changelog 2026](https://claudefa.st/blog/guide/changelog) · [Claude Code 커뮤니티 마켓플레이스](https://claudemarketplaces.com/) · [Best Skills 2026](https://www.developersdigest.tech/blog/best-claude-code-skills-2026)*
