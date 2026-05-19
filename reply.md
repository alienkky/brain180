## 🛸 스킬 발전 사항 일일 보고 — 2026-05-19 (KST)

### 📡 최신 동향

**Claude Code Skills 주요 업데이트 (2026년 4~5월)**

- **커스텀 슬래시 커맨드 → 스킬로 통합 완료** (v2.1.101, 2026-04-11): `.claude/commands/` 방식은 레거시가 되었고, `.claude/skills/<name>/SKILL.md` 포맷이 공식 권장 방식으로 확정됨. 기존 commands/ 파일은 여전히 작동하나 스킬이 우선순위를 가짐.
- **라이브 변경 감지 기능 추가**: 스킬 파일 추가·편집·삭제 시 세션 재시작 없이 즉시 반영됨. (단, 처음 생성된 최상위 skills/ 디렉토리는 재시작 필요)
- **`context: fork` 격리 실행**: 프론트매터에 `context: fork`를 설정하면 스킬이 독립된 서브에이전트 컨텍스트에서 실행되어 메인 대화 상태에 영향을 주지 않음.
- **`paths` 필드 추가**: 특정 파일 패턴과 매칭될 때만 스킬이 자동 활성화되도록 glob 패턴으로 범위 지정 가능.
- **`effort` 및 `model` 프론트매터 필드 추가**: 스킬별로 모델(예: `claude-opus-4-7`)과 노력 수준(`xhigh` 등)을 지정 가능.
- **`${CLAUDE_SKILL_DIR}` 변수 추가**: 스킬 내에서 번들된 스크립트 경로를 설치 레벨(개인/프로젝트/플러그인)에 관계없이 올바르게 참조 가능.
- **스킬 문자 예산 제어**: `skillListingBudgetFraction` 설정 및 `maxSkillDescriptionChars`로 스킬 설명 컨텍스트 점유 최적화 가능.
- **[Agent Skills](https://agentskills.io) 오픈 표준 준수**: Claude Code 스킬이 여러 AI 도구에서 공통으로 사용 가능한 오픈 표준을 따름.

**번들 스킬 현황** (세션에서 기본 제공):
`/simplify`, `/batch`, `/debug`, `/loop`, `/claude-api`

**MCP(Model Context Protocol) 관련**:
- HTTP 서버 방식이 원격 MCP 서버 연결의 권장 전송 방식으로 확립
- Claude Code 내 MCP 도구들은 스킬과 연동하여 허용 툴 (`allowed-tools`) 지정 가능

---

### 🔍 현재 설치된 스킬 현황

**개인 스킬 (`~/.claude/skills/`)**:
| 스킬명 | 경로 | 상태 |
|--------|------|------|
| `session-start-hook` | `~/.claude/skills/session-start-hook/` | 설치됨 |

**프로젝트 스킬 (`brain180/.claude/skills/`)**:
- 없음 (미설치)

**세션에서 활성화된 내장 번들 스킬**:
| 스킬 | 설명 |
|------|------|
| `session-start-hook` | Claude Code on the web 시작 훅 설정 |
| `update-config` | settings.json 설정 변경 자동화 |
| `keybindings-help` | 키보드 단축키 커스터마이징 |
| `verify` | 코드 변경 사항 실제 동작 검증 |
| `simplify` | 변경된 코드 품질 리뷰 및 개선 |
| `fewer-permission-prompts` | 권한 프롬프트 최소화를 위한 allowlist 설정 |
| `loop` | 반복 주기적 태스크 실행 |
| `claude-api` | Claude API/Anthropic SDK 앱 빌드 및 디버그 |
| `run` | 앱 실행 및 변경 사항 실제 확인 |
| `init` | CLAUDE.md 초기화 |
| `review` | PR 리뷰 |
| `security-review` | 보안 리뷰 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `daily-report` | 신규 프로젝트 스킬 | 🔴 HIGH | 매일 아침 스킬 발전 사항 조사 → Multica 이슈 보고 현재 수동 실행 중. 자동화 스킬로 분리 권장 |
| `multica-report` | 신규 개인 스킬 | 🔴 HIGH | Multica CLI 이슈 코멘트 제출 워크플로 표준화 (`context: fork`, `disable-model-invocation: true`) |
| `cognitive-extractor` | 신규 프로젝트 스킬 | 🟠 MEDIUM | Brain180 핵심 기능: 텍스트 → CognitiveMap 패턴 추출 작업을 스킬화. Claude API 호출 포함 |
| `visualization-review` | 신규 프로젝트 스킬 | 🟠 MEDIUM | VisualLayer ↔ TextLayer 격리 원칙 준수 검증 자동화 (`paths: src/components/**`) |
| `agent-status` | 신규 개인 스킬 | 🟡 NORMAL | 27명 에이전트 시스템 상태 일괄 점검 (Multica `issue list` + `runs` 조합) |
| `pr-auto-fix` | 신규 개인 스킬 | 🟡 NORMAL | CI 실패 자동 진단 + 수정 (`context: fork`, `agent: general-purpose`) |
| `schema-validator` | 신규 프로젝트 스킬 | 🟡 NORMAL | Brain180 CognitiveMap 스키마 변경 시 타입 일관성 검증 자동화 |
| `content-hardcode-check` | 신규 프로젝트 스킬 | 🟢 LOW | CLAUDE.md 금지사항: 텍스트 콘텐츠 하드코딩 감지 (커밋 전 체크리스트 자동화) |

---

### 💡 핵심 발견 사항

**스킬 vs CLAUDE.md 활용 원칙** (Anthropic 공식 문서 기반):
- CLAUDE.md: 상시 로드되는 사실/규칙 (컨텍스트 비용 항상 발생)
- 스킬: 사용 시에만 로드되는 절차/작업 (컨텍스트 비용 절감)
- Brain180의 CLAUDE.md에 있는 절차성 내용(커밋 체크리스트, 데이터 주도 원칙 확인 등)을 스킬로 분리하면 컨텍스트 효율 향상 가능

**27명 에이전트 운영 관련** [가설]:
- `disable-model-invocation: true`로 배포/외부 전송 스킬을 보호하면 에이전트가 의도치 않게 실행하는 사고 방지 가능
- `context: fork`를 활용하면 각 에이전트가 독립된 컨텍스트에서 태스크 수행 가능 → 에이전트 간 상태 오염 방지

---

### 📋 오늘의 액션 아이템

1. **[즉시]** `~/.claude/skills/multica-report/SKILL.md` 생성 — Multica 이슈 보고 워크플로 표준화 (`--content-file` 방식, `disable-model-invocation: true`)
2. **[이번 주]** `brain180/.claude/skills/cognitive-extractor/SKILL.md` 생성 — Brain180 핵심 CognitiveMap 추출 작업 스킬화
3. **[이번 주]** `brain180/.claude/skills/content-hardcode-check/SKILL.md` 생성 — CLAUDE.md 금지사항 커밋 전 자동 검증
4. **[다음 주]** 27명 에이전트 시스템용 `agent-status` 스킬 설계 — Multica `issue list` + `runs` 조합으로 일괄 상태 점검
5. **[검토]** Brain180 CLAUDE.md의 절차성 섹션(커밋 체크리스트)을 스킬로 분리하여 컨텍스트 비용 절감 검토

---

*조사 기준: Claude Code 공식 문서 (code.claude.com), GitHub anthropics/claude-code, WebSearch (2026-05-19)*
*multica CLI 버전: 0.3.3 (built: 2026-05-19T10:23:13Z)*
