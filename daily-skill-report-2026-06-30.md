## 🛸 스킬 발전 사항 일일 보고 — 2026년 6월 30일 KST

> **보고 주체**: Alien Agentic subagent-builder  
> **대상 이슈**: ALI-14 (Multica 이슈 ID: `0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7`)  
> **비고**: multica CLI **v0.3.33 설치 완료** (GitHub 릴리즈에서 직접 다운로드) — 그러나 `mul_...` PAT 미설정으로 **5회 연속** 이슈 직접 코멘트 불가. GitHub 파일 대체 보고.

---

### 📡 최신 동향

#### Claude Code 릴리즈 현황 (2026-06-27 ~ 2026-06-30)

| 버전 | 일자 | 상태 |
|------|------|------|
| **v2.1.197** | 2026-06-30 (오늘) | 🔴 오늘 배포 — Claude Sonnet 5 기본 모델로 전환 |
| **v2.1.196** | 2026-06-29 (어제) | 조직 기본 모델, 성능 개선 |
| v2.1.195 | 2026-06-26 | 지난 보고 기준선 |

---

#### v2.1.197 (2026-06-30 — 오늘)

| 항목 | 내용 |
|------|------|
| 🤖 **Claude Sonnet 5 기본 모델 전환** | Claude Code의 기본 모델이 Sonnet 5로 변경. 네이티브 **1M 토큰 컨텍스트 윈도우** 지원 |
| 💰 **프로모션 가격** | $2 / $10 per Mtok (input/output) — 2026년 8월 31일까지 프로모션 적용 |
| ⬆️ **업데이트 필수** | v2.1.197 이상으로 업데이트해야 Sonnet 5 접근 가능 |

> **[가설]** 1M 토큰 컨텍스트 윈도우가 기본 활성화되면 brain180의 전체 텍스트 코퍼스를 단일 세션에서 처리 가능 — CognitiveMap 생성 워크플로 대폭 단순화 예상.

---

#### v2.1.196 (2026-06-29)

| 항목 | 내용 |
|------|------|
| 🏢 **조직 기본 모델** | 어드민이 조직 콘솔에서 기본 모델 설정 가능. `/model`에 "Org default" / "Role default" 표시 |
| 📝 **세션 기본 이름** | 세션 시작 시 읽기 좋은 기본 이름 자동 생성 |
| 📎 **파일 첨부 클릭 가능** | 채팅 내 첨부 파일을 Cmd/Ctrl-클릭 시 탐색기에서 바로 열기 |
| 🔐 **MCP 보안 강화** | MCP 서버 보안 개선 |
| ⚡ **`/code-review` 효율화** | 토큰 사용량 **25% 감소** |
| 🔄 **스트리밍 워치독 기본 활성화** | 5분간 응답 없으면 자동 중단·재시도 (모든 프로바이더 공통) |
| 🐛 **다수 버그 수정** | 백그라운드 작업 대화 보존, 레이트 리밋 경고 깜빡임, PowerShell git 명령어, `claude agents` 사이드패널, MCP OAuth 스코프, 음성 딕테이션 |

---

#### 스킬 생태계 동향

| 지표 | 현황 |
|------|------|
| SKILL.md 호환 툴 | Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, GitHub Copilot — **오픈 스탠더드 5개 플랫폼 지원** |
| 최고 인기 신규 스킬 | **Karpathy Behavioral Skill** — 2026년 최속 성장, GitHub 144K stars |
| 공식 스킬 제작 도구 | **Skill Creator** 플러그인 (대화형 Q&A → SKILL.md 자동 생성, eval 자동화) |
| multica CLI 최신 버전 | **v0.3.33** (2026-06-30 릴리즈, 이번 세션 설치 완료) |

---

### 🔍 현재 설치된 스킬 현황 (brain180 / alienkky)

**프로젝트 레벨 (brain180/.claude/):**
- 스킬 **없음** — `.claude/skills/` 디렉토리 미존재 (**5회 연속 미해결**)
- `settings.local.json`: 일부 Bash 허용 퍼미션만 존재
- `launch.json`: Vite 개발 서버 설정만

**사용자 전역 레벨 (~/.claude/skills/):**

| 스킬명 | 설명 |
|--------|------|
| `session-start-hook` | 웹 세션의 SessionStart 훅 생성/개발용 스킬 |

**번들 스킬 (Claude Code 내장, v2.1.197 기준):**

| 스킬 | 유형 | 용도 |
|------|------|------|
| `/session-start-hook` | 스킬 | SessionStart 훅 설정 |
| `/deep-research` | 워크플로 | 멀티소스 팩트체크 리서치 |
| `/update-config` | 스킬 | settings.json 구성 업데이트 |
| `/keybindings-help` | 스킬 | 키바인딩 커스터마이즈 |
| `/verify` | 스킬 | 코드 변경사항 앱 실행 검증 |
| `/code-review` | 스킬 | 코드 리뷰 (diff 분석, v2.1.196에서 25% 토큰 절감) |
| `/simplify` | 스킬 | 코드 단순화 리팩토링 |
| `/fewer-permission-prompts` | 스킬 | 권한 프롬프트 자동 허용 설정 |
| `/loop` | 스킬 | 반복 실행 스케줄링 |
| `/claude-api` | 스킬 | Claude/Anthropic API 레퍼런스 |
| `/run` | 스킬 | 앱 실행 및 확인 |
| `/run-skill-generator` | 스킬 | run/verify용 프로젝트 레시피 생성 |
| `/init` | 스킬 | CLAUDE.md 초기화 |
| `/review` | 스킬 | GitHub PR 리뷰 |
| `/security-review` | 스킬 | 보안 리뷰 |
| `/batch` | 스킬 | 대규모 병렬 코드베이스 변경 |
| `/debug` | 스킬 | 디버그 로깅 및 세션 분석 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| **multica PAT 등록** | 인프라 | 🔴 긴급 (5회 연속) | `mul_...` PAT를 Claude Code 원격 세션 환경변수로 등록 → `multica login --token $MULTICA_PAT` → 이슈 직접 코멘트 가능. multica v0.3.33 설치는 완료됨 |
| **Sonnet 5 기본모델 테스트** | 환경 | 🔴 높음 (오늘) | v2.1.197로 업데이트 후 1M 컨텍스트 윈도우 확인 — brain180 텍스트 전체 처리 가능 여부 검증 |
| `component-checker` | 신규 프로젝트 스킬 | 🔴 높음 (5회 연속) | CLAUDE.md 커밋 전 grep 체크리스트 4개 자동 실행. `disable-model-invocation: true` 설정 |
| `brain180-visualize` | 신규 프로젝트 스킬 | 🔴 높음 | brain180 핵심 기능: 텍스트 → CognitiveMap 분석 워크플로. 1M 컨텍스트로 전체 코퍼스 처리 가능해짐 |
| `skill-creator` 플러그인 | 번들 확장 | 🟡 중간 | 대화형 Q&A → SKILL.md 자동 생성 + eval 자동화 — brain180 스킬 품질 보장 |
| `why-how-what` | 신규 글로벌 스킬 | 🟡 중간 | Alien Agentic 핵심 3단계 분석 템플릿. `effort: high` + `context: fork` |
| `agent-dispatch` | 신규 글로벌 스킬 | 🟡 중간 | 27명 에이전트 라우팅 로직 스킬화. `user-invocable: false` |
| `multica-report` | 신규 프로젝트 스킬 | 🟢 낮음 | 이 보고서 생성 프로세스 스킬화 (`${CLAUDE_SKILL_DIR}` 활용 템플릿 참조) |
| Karpathy Behavioral Skill | 커뮤니티 스킬 | 🟢 낮음 | 2026년 최속 성장 스킬 — Alien Agentic 에이전트 행동 품질에 적용 가능 여부 검토 |

---

### 📋 오늘의 액션 아이템

1. **[긴급 — 5회 연속]** Multica 웹 → Settings → Personal Access Tokens에서 `mul_...` PAT 발급  
   → Claude Code 원격 세션에 `MULTICA_PAT` 환경변수 등록  
   → `multica login --token $MULTICA_PAT` 실행  
   > multica v0.3.33이 `/usr/local/bin/multica`에 설치 완료. 토큰 1개만 있으면 즉시 해결.

2. **[HIGH]** Claude Code v2.1.197 업데이트 후 Sonnet 5 기본모델 테스트:
   - `claude --version` 확인
   - 1M 토큰 컨텍스트 윈도우로 brain180 전체 텍스트 처리 테스트
   - 프로모션 가격 ($2/$10 per Mtok) 적용 여부 확인

3. **[HIGH — 5회 연속]** brain180 프로젝트 스킬 디렉토리 생성:
   ```bash
   mkdir -p /home/user/brain180/.claude/skills/component-checker
   ```
   SKILL.md 내용: CLAUDE.md의 커밋 전 grep 체크리스트 4개 자동 실행

4. **[HIGH]** `brain180-visualize` 스킬 초안 작성:
   - Sonnet 5의 1M 컨텍스트를 활용하여 전체 고전 텍스트 동시 처리
   - `paths: src/data/**,src/core/**` frontmatter로 범위 제한

5. **[MEDIUM]** 조직 기본 모델 설정 (v2.1.196):
   - Alien Agentic 조직 콘솔에서 27명 에이전트별 역할 기반 기본 모델 설정 가능

6. **[MEDIUM]** `/code-review` 25% 토큰 절감 활용:
   - brain180 PR 리뷰 비용 절감 확인
   - `--effort high` 옵션으로 심층 리뷰 시 비용 재검토

---

### ⚠️ 지속 리스크

| 항목 | 현황 | 조치 |
|------|------|------|
| multica 인증 | **5회 연속** 미설정 (CLI v0.3.33 설치는 완료) | PAT 발급 후 `MULTICA_PAT` 환경변수 등록 1회로 해결 |
| `.claude/skills/` 미생성 | **5회 연속** 미이행 | `mkdir -p .claude/skills/component-checker` 1줄로 즉시 해결 |
| Claude Code 버전 | v2.1.197 확인 필요 | `claude --version` 실행 후 최신 업데이트 |

---

### 🔗 참고 자료

- [Claude Code Changelog](https://code.claude.com/docs/en/changelog)
- [Claude Code GitHub Releases](https://github.com/anthropics/claude-code/releases)
- [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills)
- [Multica CLI GitHub](https://github.com/multica-ai/multica)
- [Multica CLI v0.3.33 릴리즈](https://github.com/multica-ai/multica/releases/tag/v0.3.33)
- [AgentSkills.io 오픈 스탠더드](https://agentskills.io)
- [Karpathy Behavioral Skill](https://github.com/anthropics/skills)
