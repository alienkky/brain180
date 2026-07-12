## 🛸 스킬 발전 사항 일일 보고 — 2026-06-15 KST

> 작성자: Alien Agentic subagent-builder | 자동 생성 보고서

---

### 📡 최신 동향

#### Claude Code v2.1.150–v2.1.157 (Week 22, 2026-05-25~29) 주요 업데이트

**스킬/플러그인 관련 핵심 변경사항:**

1. **`.claude/skills` 자동 로드** — 마켓플레이스 없이도 `.claude/skills` 디렉토리에 플러그인을 배치하면 자동으로 로드됨. `claude plugin init <name>`으로 새 플러그인 스캐폴딩 가능.

2. **`/reload-skills` 신규 커맨드** — 세션 재시작 없이 스킬 디렉토리를 재스캔. `SessionStart` 훅이 `reloadSkills: true`를 반환하면 훅이 설치한 스킬이 동일 세션에서 즉시 활성화됨.

3. **`disallowed-tools` 프론트매터** — 스킬/커맨드 SKILL.md의 YAML 프론트매터에 `disallowed-tools`를 선언해, 해당 스킬 실행 중 특정 도구를 모델에서 제거 가능 (최소 권한 원칙 적용).

4. **`disableBundledSkills` 설정 추가** — `settings.json`의 `disableBundledSkills: true` 또는 환경변수 `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=true`로 번들 스킬/워크플로/내장 슬래시 커맨드를 숨길 수 있음.

5. **`defaultEnabled: false` 플러그인 선언** — `plugin.json` 또는 마켓플레이스 항목에서 선언하면 설치 후 수동 활성화 전까지 비활성 상태로 유지.

6. **`MessageDisplay` 훅 이벤트** — 훅이 어시스턴트 메시지 텍스트를 표시 시점에 변환하거나 숨길 수 있는 새 훅 이벤트 추가.

7. **`/cd` 커맨드** — 프롬프트 캐시를 깨지 않고 세션의 작업 디렉토리를 변경.

8. **커스텀 커맨드 → 스킬 통합** — `.claude/commands/deploy.md`와 `.claude/skills/deploy/SKILL.md`는 동일하게 `/deploy` 슬래시 커맨드를 생성. 기존 `.claude/commands/` 파일은 호환 유지.

#### 신규 주요 기능

- **Dynamic Workflows (리서치 프리뷰)** — 대규모 태스크를 위한 오케스트레이션 스크립트. Claude가 직접 워크플로를 작성하고 수십~수백 개의 병렬 서브에이전트를 실행. `/workflows`로 관리. 코드베이스 전체 감사, 대규모 마이그레이션, 교차검증 리서치에 적합.

- **security-guidance 플러그인** — 코드 변경 시 취약점을 자동 감지·수정. 편집 시 패턴 체크, 턴 종료 시 모델 리뷰, 커밋/푸시 시 심층 에이전틱 리뷰 실행.

- **Claude Opus 4.8 기본 모델 전환** — Max, Team Premium, Enterprise pay-as-you-go, Anthropic API에서 기본 모델로 채택. Fast Mode도 Opus 4.8 기준 $10/$50 per MTok.

- **[가설] Agent Skills 오픈 표준(agentskills.io)** — Claude Code 스킬이 이 표준을 따르며, 여러 AI 도구에서 상호운용 가능성을 목표로 함.

---

### 🔍 현재 설치된 스킬 현황

#### Brain180 프로젝트 (`.claude/` 디렉토리)

| 항목 | 내용 |
|------|------|
| `.claude/settings.local.json` | permissions allow 설정 (기본적 Bash/Read 허용) |
| `.claude/launch.json` | vite dev server 실행 설정 (포트 5173) |
| **스킬 디렉토리** | **없음** — `.claude/skills/` 또는 `.claude/commands/` 미존재 |

#### 글로벌 설치 스킬 (`~/.claude/skills/`)

| 스킬명 | 설명 |
|--------|------|
| `session-start-hook` | SessionStart 훅 생성 스킬 (의존성 설치, 테스트/린터 환경 구성) |

#### 시스템 번들 스킬 (Claude Code 내장)

세션에서 확인된 사용 가능 스킬:
- `/session-start-hook` — 세션 시작 훅 설정
- `/deep-research` — 멀티소스 심층 리서치
- `/update-config` — settings.json 설정 업데이트
- `/keybindings-help` — 키보드 단축키 커스터마이징
- `/verify` — 변경사항 동작 검증
- `/code-review` — 코드 리뷰 (인라인 PR 코멘트 가능)
- `/simplify` — 코드 단순화/리팩터링
- `/fewer-permission-prompts` — 권한 프롬프트 최소화 allowlist 생성
- `/loop` — 반복 실행 태스크 설정
- `/claude-api` — Claude API 레퍼런스
- `/run` — 앱 실행 및 검증
- `/init` — CLAUDE.md 초기화
- `/review` — PR 리뷰
- `/security-review` — 보안 리뷰

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|----------|------|
| `security-guidance` 플러그인 | 새 플러그인 설치 | 🔴 높음 | Brain180 개발 시 AI 생성 코드 보안 취약점 자동 감지. `/plugin install security-guidance@claude-plugins-official`로 설치 |
| `brain180-dev` SessionStart 훅 | 신규 생성 | 🔴 높음 | `.claude/launch.json`에 vite 설정은 있으나 `session-start.sh`가 없어 웹 세션에서 npm install 미실행 |
| Dynamic Workflow for `cognitive-map-audit` | 새 기능 활용 | 🟡 중간 | 코드베이스 전체 CognitiveMap 스키마 일관성 감사에 Dynamic Workflows 적합. `/workflows` 커맨드 활용 |
| `brain180-schema-check` 커스텀 스킬 | 신규 생성 | 🟡 중간 | CLAUDE.md 커밋 전 체크리스트(`grep -rn '"[가-힣]..."' src/` 등)를 스킬로 자동화 |
| `agent-orchestrator` 스킬 | 신규 생성 | 🟡 중간 | 27명 에이전트 시스템 운영을 위한 서브에이전트 조율 스킬. Dynamic Workflows와 연계 |
| `/reload-skills` 활용 SessionStart | 기존 훅 업데이트 | 🟢 낮음 | `reloadSkills: true` 반환으로 훅 설치 스킬이 즉시 활성화되도록 기존 훅 업데이트 |
| `disallowed-tools` 적용 | 기존 스킬 강화 | 🟢 낮음 | 텍스트 레이어/시각화 레이어 분리 원칙에 맞게 특정 스킬 실행 시 불필요한 도구 제한 |

---

### 📋 오늘의 액션 아이템

1. **[즉시] `security-guidance` 플러그인 설치**
   ```bash
   /plugin install security-guidance@claude-plugins-official
   /reload-plugins
   ```
   Brain180 개발 시 XSS, SQL Injection 등 OWASP Top 10 자동 감지.

2. **[이번 주] Brain180 SessionStart 훅 생성**
   - `/session-start-hook` 스킬 활용
   - `npm install` + `vite build` 검증 포함
   - `reloadSkills: true` 반환으로 `.claude/skills/`의 프로젝트 스킬 자동 로드

3. **[이번 주] `brain180-schema-check` 커스텀 스킬 생성**
   - CLAUDE.md의 커밋 전 체크리스트 자동화
   - `.claude/skills/brain180-schema-check/SKILL.md` 생성
   - `disallowed-tools: [Bash]` 등 최소 권한 설정

4. **[다음 주] Dynamic Workflows 파일럿**
   - CognitiveMap 데이터 스키마 일관성 전체 감사에 적용
   - `/workflows` 커맨드로 병렬 서브에이전트 오케스트레이션 테스트

5. **[다음 주] `disableBundledSkills` 설정 검토**
   - Alien Agentic 워크플로에 불필요한 번들 스킬 비활성화
   - `.claude/settings.json`에 `disableBundledSkills: true` + 필요 스킬만 명시적 활성화

---

> 📌 **참고**: multica CLI v0.3.22가 이 환경에서 설치되었으나 인증 토큰(mul_...) 부재로 자동 제출 불가. 이 보고서는 `/home/user/brain180/reply.md`에 저장됨. multica 토큰을 환경변수 또는 `.multica/config.json`에 설정 후 `multica login --token mul_...` 실행 필요.
>
> **조사 출처**: [Claude Code Docs Week 22](https://code.claude.com/docs/en/whats-new/2026-w22) · [Claude Code Skills Docs](https://code.claude.com/docs/en/skills) · [Dynamic Workflows](https://www.infoq.com/news/2026/06/dynamic-workflows-claude-code/)
