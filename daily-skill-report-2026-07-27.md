## 🛸 스킬 발전 사항 일일 보고 — 2026-07-27 KST

### 📡 최신 동향

**2026년 7월 하순 Claude Code 주요 업데이트 (v2.1.212 ~ v2.1.219)**

| 버전 | 변경 사항 |
|------|-----------|
| **v2.1.215** (7/20) | `/verify`, `/code-review` **수동 호출 전용으로 전환** — 이전에는 자동 실행되었으나, 이제 사용자가 명시적으로 호출해야만 실행됨 |
| **v2.1.218-219** (7/22-23) | `/code-review` 백그라운드 서브에이전트로 실행 — 대화창을 깨끗하게 유지하면서 리뷰 진행 |
| **v2.1.212** (7/15) | `/fork` 동작 변경: 대화를 새 **백그라운드 세션으로 복사**. `/subtask` 새 커맨드 추가 — 현재 세션 내 서브에이전트 실행용 |
| **v2.1.101** (4/11) | 커스텀 슬래시 커맨드와 스킬 시스템 **완전 통합** — 같은 이름이면 스킬이 우선 적용 |
| **v2.1.186** (확인) | `/dataviz` 스킬 업데이트: OKLab 지각적 색상 차이 검증 로직 개선, `references/palette.md`에 검증 기본 팔레트 문서화 |

**스킬 프론트매터(Frontmatter) 개선:**
- 중첩 `.claude/skills/` 디렉토리 **근접성 우선순위** 지원 (모노레포에서 하위 패키지 스킬이 상위보다 우선)
- 프론트매터 키: kebab-case, snake_case, camelCase **모두 허용**
- 불리언 값: `true/false` 외에 `yes/no/on/off/1/0` (대소문자 무관) 허용

**MCP 업데이트:**
- MCP 서버 시작 시 일시적 오류 발생 시 **최대 3회 자동 재시도**
- Managed MCP allowlist/denylist의 `${VAR}` 항목이 **시작 환경에서 자동 해석**
- 수정: OAuth `client_secret_post` 미전송 버그, MCP 헤더 `${ENV_VAR}` 미치환 버그, 잘못된 OAuth 오류 응답(non-JSON body) 처리

---

### 🔍 현재 설치된 스킬 현황 (brain180 리포)

**`.claude/` 디렉토리 분석:**

| 항목 | 상태 |
|------|------|
| `.claude/skills/` 디렉토리 | ❌ 없음 (**6회 연속 미이행**) |
| `.claude/settings.json` | ❌ 없음 (settings.local.json만 존재) |
| `.claude/settings.local.json` | ✅ 존재 (Bash/Read 일부 권한만 설정) |
| `.claude/launch.json` | ✅ 존재 (Vite dev server, 포트 5173) |

**현재 설치된 커스텀 스킬: 없음** (6회 연속)

**계정 레벨 번들 스킬 (현재 세션 기준, v2.1.219 추정):**

| 스킬 | 변경 이력 |
|------|-----------|
| `session-start-hook` | 안정 |
| `dataviz` | v2.1.186 업데이트 (OKLab 팔레트 검증 강화) |
| `artifact-design`, `artifact-capabilities` | 안정 |
| `update-config`, `keybindings-help` | 안정 |
| `simplify`, `review`, `security-review` | 안정 |
| `code-review` | **v2.1.215** 수동 호출 전용; **v2.1.218** 백그라운드 서브에이전트 |
| `fewer-permission-prompts` | 안정 |
| `loop` | 안정 |
| `claude-api` | 안정 (Sonnet 5/Haiku 4.5 최신 모델 반영) |
| `run`, `verify` | **v2.1.215** 수동 호출 전용으로 전환 |
| `morning`, `learn`, `doc-coauthoring` | 안정 |
| `web-artifacts-builder`, `skill-creator` | 안정 |
| `theme-factory`, `brand-guidelines`, `canvas-design`, `algorithmic-art` | 안정 |
| `mcp-builder` | MCP 자동 재시도 기능 활용 가능 |
| `internal-comms`, `slack-gif-creator` | 안정 |
| `xlsx`, `pptx`, `pdf`, `docx` | 안정 |
| `init` | 안정 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| **Multica PAT 등록** | 인프라 설정 | 🔴 긴급 (6회 연속) | `mul_...` PAT를 Claude Code 원격 세션 환경변수로 설정 → 자동 이슈 보고 가능. multica CLI 다운로드는 반복 시도 가능하나 PAT 없이는 무의미 |
| `component-checker` | 커스텀 신규 | 🔴 긴급 (6회 연속) | CLAUDE.md의 커밋 전 grep 체크리스트 4개 자동화. `disable-model-invocation: true` 설정 |
| `cognitive-map-generator` | 커스텀 신규 | 🔴 높음 | Brain180 핵심: 텍스트 → CognitiveNode/CognitiveEdge 구조 추출. CLAUDE.md 데이터 모델 기반 |
| `why-how-what-extractor` | 커스텀 신규 | 🟠 높음 | Alien Agentic WHY-HOW-WHAT 컨설팅 프레임워크를 SKILL.md로 표준화 |
| `agent-squad-coordinator` | 커스텀 신규 | 🟠 높음 | 27명 에이전트 팀 태스크 분배/결과 병합. `/subtask` 신규 커맨드 활용 |
| `brain180-visualize` | 커스텀 신규 | 🟠 높음 | Sonnet 5 1M 컨텍스트 활용, 전체 고전 텍스트 → CognitiveMap 일괄 처리 |
| `multica-reporter` | 커스텀 신규 | 🟡 중간 | 이 일일 보고 프로세스를 재사용 가능한 스킬로 패키징. PAT 토큰 로직 포함 |
| `context-forker` | 커스텀 신규 | 🟡 중간 | v2.1.212의 `/fork` 백그라운드 실행 활용. Brain180 장시간 시각화 작업 비동기 처리 |
| `mcp-retry-config` | 설정 | 🟢 낮음 | MCP 서버 3회 자동 재시도 기능을 brain180 MCP 설정에 명시적으로 활용 |

---

### 📋 오늘의 액션 아이템

1. **[긴급 — 6회 연속]** Multica 웹 → Settings → Personal Access Tokens에서 `mul_...` PAT 발급  
   → Claude Code 원격 세션 환경변수에 `MULTICA_TOKEN` 등록  
   > multica CLI 바이너리는 GitHub Releases에서 매 세션마다 다운로드 가능하나, 토큰 미설정으로 6회 연속 이슈 코멘트 불가.

2. **[HIGH — 6회 연속]** `.claude/skills/` 디렉토리 생성:
   ```bash
   mkdir -p /home/user/brain180/.claude/skills/component-checker
   # SKILL.md 작성 후 커밋
   ```

3. **[HIGH]** `/code-review` 워크플로 업데이트 확인:
   - v2.1.215 이후 자동 실행 없음 → brain180 PR 리뷰 시 수동 `/code-review` 호출 필요
   - 백그라운드 서브에이전트 실행으로 대화 컨텍스트 절약 가능

4. **[HIGH]** `/subtask` 커맨드 활용 계획:
   - 27명 에이전트 시스템에서 현재 세션 내 서브에이전트 실행에 `/subtask` 사용
   - `/fork`는 새 백그라운드 세션 생성 (독립 컨텍스트 필요 시)

5. **[MEDIUM]** `dataviz` 스킬 팔레트 적용:
   - `references/palette.md`의 OKLab 검증 팔레트를 brain180 시각화 컴포넌트에 적용
   - CognitiveMap 노드 색상 시스템에 적용 가능

---

### ⚠️ 지속 리스크

| 항목 | 현황 | 조치 |
|------|------|------|
| multica 인증 | **6회 연속** PAT 미설정 | Multica 웹에서 PAT 발급 후 `MULTICA_TOKEN` 환경변수 등록 |
| `.claude/skills/` 미생성 | **6회 연속** 미이행 | `mkdir -p .claude/skills/component-checker` 1줄로 즉시 해결 |
| Multica CLI | npm 미등록, GitHub Releases 다운로드 필요 | PAT 등록 후 함께 해결 |

---

### 🔗 참고 자료

- [Claude Code Changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- [Claude Code GitHub Releases](https://github.com/anthropics/claude-code/releases)
- [Claude Code Docs — Skills](https://code.claude.com/docs/en/skills)

---

_자동 생성: Alien Agentic subagent-builder | Claude Code 스케줄 태스크 | 2026-07-27_
