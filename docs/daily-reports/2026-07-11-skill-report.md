## 🛸 스킬 발전 사항 일일 보고 — 2026-07-11 KST

### 📡 최신 동향

**Claude Code 스킬 시스템 — 2026년 7월 최신 업데이트**

#### Skills 핵심 변경사항
- **중첩 디렉토리 지원**: `.claude/skills/` 내 중첩 디렉토리의 스킬이 이제 자동 로드됨. 이름 충돌 시 `<dir>:<name>` 형식으로 구분
- **Skill YAML 프론트매터 개선**: `display-name`, `default-enabled`, `fallback`, `metadata.*` 키가 kebab-case, snake_case, camelCase 모두 지원
- **번들 스킬 비활성화 옵션 추가**: `disableBundledSkills` 설정 및 `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` 환경변수로 기본 번들 스킬/워크플로우/슬래시 커맨드 비활성화 가능
- **스택 슬래시-스킬 호출**: `/skill-a /skill-b do XYZ` 형식으로 최대 5개 스킬 연쇄 호출 가능 (이전에는 첫 번째 스킬만 로드)
- **`/reload-skills` 명령어 추가**: 세션 재시작 없이 스킬 디렉토리 재스캔 가능
- **버그 수정**: 이미 로드된 스킬 재호출 시 중복 지시사항이 컨텍스트에 추가되던 문제 해결

#### Slash Commands 신규 추가
- **`/cd` 명령어**: 새 작업 디렉토리로 이동하면서 프롬프트 캐시 유지
- **`/config key=value` 구문**: 프롬프트에서 직접 설정 변경 (`/config thinking=false`, `/config effort=xhigh`)
- **`/checkup` 명령어**: 클로드 코드 설정 자동 감사 — 미사용 스킬/MCP/플러그인 정리, CLAUDE.md 최적화, 느린 훅 비활성화 등
- **`/workflows` 개선**: 상태 필터링 지원 (`f` 키)

#### MCP 업데이트
- **CLI 직접 인증 관리**: `claude mcp login <name>` / `claude mcp logout <name>`
- **보안 강화**: `claude mcp list/get` 명령이 더 이상 `.claude/settings.json`의 자동 승인 서버를 spawn하지 않음
- **OAuth 개선**: 자동 재시도, 401/403 자동 재연결
- **에러 메시지 개선**: HTTP 404 에러 시 명확한 URL 표시 및 가이드 제공
- **타임아웃 버그 수정**: `--mcp-config` 또는 `.mcp.json`으로 설정된 서버가 `request_timeout_ms` 무시하던 문제 해결

---

### 🔍 현재 설치된 스킬 현황

#### brain180 프로젝트 레벨 (`.claude/skills/`)
- **없음** — 프로젝트에 스킬 디렉토리 미구성

#### 전역 스킬 (`/root/.claude/skills/`)
- `session-start-hook` — 세션 시작 훅 설정 스킬 (1개만 설치됨)

#### Claude Code 내장 스킬 (시스템 번들)
현재 이 세션에서 활성화된 내장 스킬:
- `session-start-hook` — 웹 세션용 startup hook 설정
- `deep-research` — 멀티소스 팩트체크 리서치 리포트
- `dataviz` — 차트/그래프/대시보드 시각화
- `artifact-design` — Artifact 디자인 가이드라인
- `update-config` — settings.json 설정 변경
- `keybindings-help` — 키보드 단축키 커스터마이징
- `verify` — 코드 변경 사항 end-to-end 검증
- `code-review` — 코드 diff 버그 및 개선점 리뷰
- `simplify` — 코드 간소화 및 효율화 리뷰
- `fewer-permission-prompts` — 허용 목록 자동 생성
- `loop` — 반복 작업 예약 실행
- `claude-api` — Claude API/Anthropic SDK 참조
- `run` — 프로젝트 앱 실행 및 검증
- `init` — CLAUDE.md 초기화
- `review` — GitHub PR 리뷰
- `security-review` — 보안 리뷰

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| `brain180-dev-server` | 커스텀 프로젝트 스킬 | 🔴 높음 | `launch.json`에 vite 서버 설정 있으나 스킬로 표준화 필요. `/run` 스킬 보강용 |
| `cognitive-map-extractor` | 커스텀 도메인 스킬 | 🔴 높음 | Brain180 핵심 기능 — 텍스트에서 인지 구조 추출 AI 패턴을 스킬로 정의하면 일관성 확보 |
| `genius-text-analyzer` | 커스텀 도메인 스킬 | 🔴 높음 | 천재 텍스트 분석 워크플로우 표준화 (WHY-HOW-WHAT 구조에 맞게) |
| `agent-daily-report` | 자동화 스킬 | 🟡 중간 | 현재 수동으로 실행되는 일일 보고 루틴을 multica 인증 포함 완전 자동화 |
| `frontend-design` | Anthropic 공식 스킬 | 🟡 중간 | Brain180 시각화 UI 개발 시 필요 — production-grade React/D3 컴포넌트 생성 |
| `multica-workflow` | 커스텀 통합 스킬 | 🟡 중간 | multica CLI 인증 및 이슈 보고 워크플로우 표준화 (PAT 토큰 관리 포함) |
| `d3-visualization` | 커스텀 도메인 스킬 | 🟡 중간 | CognitiveMap 시각화를 D3.js로 렌더링하는 패턴 정의 |
| `data-schema-validator` | 커스텀 유틸리티 스킬 | 🟢 낮음 | CognitiveMap 스키마 검증 자동화 (`grep -rn 'as any'` 체크 포함) |

---

### 📋 오늘의 액션 아이템

1. **[즉시] multica PAT 토큰 발급**: `https://app.multica.ai/settings`에서 Personal Access Token 발급 후 이 세션의 환경변수로 제공 (`MULTICA_TOKEN=mul_...`). 현재 헤드리스 환경에서 multica 인증 불가로 이슈 코멘트 제출 실패
2. **[오늘] `cognitive-map-extractor` 스킬 작성**: Brain180의 핵심 기능인 텍스트→인지구조 추출 로직을 `.claude/skills/cognitive-map-extractor.md`로 정의
3. **[오늘] `genius-text-analyzer` 스킬 작성**: 6개 분야(과학/철학/문학/예술/경제/동양고전) 별 분석 패턴을 스킬로 표준화
4. **[이번 주] brain180 프로젝트에 `.claude/skills/` 디렉토리 구성**: 프로젝트 전용 스킬 체계 구축
5. **[이번 주] `/checkup` 실행**: 새로 추가된 `/checkup` 명령으로 현재 설정 감사 및 최적화
6. **[가설] `stacked skill` 활용**: `/cognitive-map-extractor /genius-text-analyzer analyze this text` 형식으로 Brain180 분석 파이프라인 구성 가능 — 검증 필요

---

### ⚠️ 보고 제출 실패 사유

이번 보고는 multica 이슈 ALI-14 (`0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7`)에 직접 제출하려 했으나 실패:
- `@multica/cli`는 npm registry에 등록되지 않음
- Homebrew 미설치 환경
- GitHub releases API 접근 차단 (403)
- multica 소스 빌드 성공했으나 PAT 인증 토큰 없음
- 환경변수에 multica 자격증명 없음

**해결책**: `https://app.multica.ai/settings`에서 PAT 발급 후 세션 환경변수 `MULTICA_TOKEN`으로 주입 필요. 이후 자동화 시 multica 인증을 포함한 스킬 정의 권장.

---

_조사 소스: [Claude Code Changelog](https://code.claude.com/docs/en/changelog) · [Best Skills 2026](https://www.firecrawl.dev/blog/best-claude-code-skills) · [Agentic Workflow Patterns](https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051)_
