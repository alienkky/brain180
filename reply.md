## 🛸 스킬 발전 사항 일일 보고 — 2026-06-18 KST

### 📡 최신 동향

**Claude Code v2.1.170** (최신 버전, 2026년 6월 기준)

#### 스킬 시스템 주요 업데이트
- **Custom Commands → Skills 통합 완료**: `.claude/commands/deploy.md`와 `.claude/skills/deploy/SKILL.md`가 동일하게 동작. 기존 commands 파일 호환 유지, 신규는 skills 권장
- **Agent Skills 오픈 스탠다드** 채택: Claude Code가 [agentskills.io](https://agentskills.io) 표준을 따르며, 다른 AI 도구에서도 동작 가능한 포터블 스킬 구조
- **`skill-creator` 플러그인** 출시: 자동화된 스킬 평가 루프 — A/B 테스트, pass rate 측정, description 튜닝 자동화
  ```
  /plugin install skill-creator@claude-plugins-official
  ```
- **신규 Bundled Skills** (v2.1.145+ 필요):
  | 스킬 | 설명 |
  |-----|-----|
  | `/run` | 앱 실행 및 변경사항 확인 (테스트 아닌 실제 앱 구동) |
  | `/verify` | 코드 변경이 실제로 동작하는지 앱으로 검증 |
  | `/run-skill-generator` | 프로젝트별 실행 레시피 자동 생성 및 저장 |
  | `/batch` | 대규모 코드베이스 변경을 병렬 워크트리로 실행 |
  | `/debug` | 체계적 디버깅 워크플로 |
  | `/loop` | 반복 실행 (이미 설치됨) |
  | `/claude-api` | Claude API 레퍼런스 참조 |

#### 새로운 프론트매터 필드
```yaml
---
name: my-skill
description: 설명
when_to_use: 추가 트리거 컨텍스트       # 신규: 1,536자 예산에 합산
paths: ["src/**/*.ts", "*.py"]           # 신규: 특정 파일 작업시만 활성화
hooks: { PreToolUse: [...] }             # 신규: 스킬 생명주기 훅
model: claude-opus-4-8                   # 신규: 스킬별 모델 오버라이드
effort: high                             # 신규: 추론 노력 레벨 설정
disallowed-tools: AskUserQuestion        # 신규: 백그라운드 스킬에서 특정 도구 차단
agent: Explore                           # 신규: context: fork 시 에이전트 타입 지정
shell: powershell                        # 신규: Windows PowerShell 지원
---
```

#### 새로운 문자열 치환 변수
| 변수 | 설명 |
|-----|-----|
| `${CLAUDE_SKILL_DIR}` | 스킬 디렉토리 절대경로 (번들 스크립트 참조용) |
| `${CLAUDE_EFFORT}` | 현재 추론 노력 레벨 |
| `${CLAUDE_SESSION_ID}` | 현재 세션 ID |
| `$0`, `$1` ... | `$ARGUMENTS[N]` 단축 표기 |
| `$name` | frontmatter arguments 필드로 선언한 명명 인자 |

#### 기타 주요 변경
- **Live Change Detection**: `~/.claude/skills/` 또는 `.claude/skills/` 파일 수정 시 세션 재시작 없이 즉시 반영
- **Monorepo 지원**: 중첩 `.claude/skills/` 디렉토리 자동 발견 (e.g., `apps/web:deploy`)
- **`skillOverrides` 설정**: settings.json에서 스킬 가시성 제어 (on/name-only/user-invocable-only/off)
- **`skillListingBudgetFraction`**: 스킬 description 컨텍스트 예산 비율 설정
- **MCP Tunnels** (Research Preview): 프라이빗 네트워크의 MCP 서버 연결 가능
- **Post-session hooks**: 크론 기반 스케줄링으로 에이전트 자동 실행
- **Subagent panel 개선**: idle 서브에이전트 30초 후 자동 숨김, 최대 5행 + 스크롤

---

### 🔍 현재 설치된 스킬 현황

#### 글로벌 스킬 (`~/.claude/skills/`)
| 스킬명 | 상태 |
|--------|------|
| `session-start-hook` | ✅ 설치됨 |

#### 프로젝트 스킬 (`.claude/skills/`) — brain180
| 스킬명 | 상태 |
|--------|------|
| (없음) | ❌ 미설치 |

#### 세션에서 사용 가능한 Bundled Skills
`session-start-hook`, `deep-research`, `update-config`, `keybindings-help`, `verify`, `code-review`, `simplify`, `fewer-permission-prompts`, `loop`, `claude-api`, `run`, `init`, `review`, `security-review`

#### [가설] brain180 프로젝트 스킬 부재
현재 brain180에 `.claude/skills/` 디렉토리가 없음. 프로젝트 특화 스킬 없이 글로벌 기본값에만 의존 중.

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `batch` | Bundled (신규) | 🔴 HIGH | 27개 에이전트 병렬 대규모 코드 변경 시 필수 |
| `debug` | Bundled (신규) | 🔴 HIGH | 체계적 디버깅 워크플로 내재화 |
| `run-skill-generator` | Bundled (신규) | 🟡 MEDIUM | brain180 dev 서버 실행 레시피 자동 생성 |
| `why-how-what-analysis` | 커스텀 신규 | 🔴 HIGH | Alien Agentic WHY-HOW-WHAT 컨설팅 프레임워크 자동화 |
| `multica-report` | 커스텀 신규 | 🔴 HIGH | 일일 보고서 multica 이슈 자동 제출 |
| `cognitive-map-gen` | 커스텀 신규 | 🟡 MEDIUM | brain180 뇌인지 구조 시각화 데이터 생성 보조 |
| `agent-squad-coordinator` | 커스텀 신규 | 🟡 MEDIUM | 27명 에이전트 시스템 작업 분배 및 상태 추적 |
| `skill-creator` | Plugin (신규) | 🟡 MEDIUM | 기존/신규 스킬 품질 측정 및 반복 개선 자동화 |
| `pr-review-autopilot` | 커스텀 신규 | 🟢 LOW | PR 리뷰 자동화 및 코멘트 응답 |

#### 즉시 활용 가능한 신규 프론트매터 패턴

**WHY-HOW-WHAT 분석 스킬 (신규 필드 활용)**:
```yaml
---
name: why-how-what
description: Alien Agentic WHY-HOW-WHAT 컨설팅 프레임워크로 문제 분석. 목표 설정, 전략 수립, 실행 계획 도출 시 사용.
effort: high
model: claude-opus-4-8
context: fork
agent: general-purpose
---
```

**Multica 자동 보고 스킬**:
```yaml
---
name: multica-daily-report
description: 일일 작업 결과를 multica 이슈에 자동 보고
disable-model-invocation: true
allowed-tools: Bash(multica *)
---
```

---

### 📋 오늘의 액션 아이템

1. **[즉시]** `batch`와 `debug` bundled skills가 현재 세션에 없다면 Claude Code 업데이트 확인 (`/version`)
2. **[단기]** `.claude/skills/why-how-what/SKILL.md` 생성 — WHY-HOW-WHAT 컨설팅 워크플로 스킬화
3. **[단기]** `.claude/skills/multica-report/SKILL.md` 생성 — multica 자동 보고 파이프라인 구축
4. **[단기]** `/run-skill-generator` 실행하여 brain180 Vite dev 서버 실행 레시피 저장
5. **[중기]** `skill-creator` 플러그인 설치 및 기존 스킬 품질 측정 시작
6. **[중기]** 27개 에이전트 분업을 위한 `agent-squad-coordinator` 스킬 설계
7. **[확인 필요]** multica.ai 네트워크 이그레스 허용 설정 — 현재 원격 실행 환경에서 multica.ai 차단됨. 네트워크 정책에 multica.ai 추가 필요

---

*조사 소스: [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills), [Agent SDK Skills](https://code.claude.com/docs/en/agent-sdk/skills), [Releasebot Anthropic](https://releasebot.io/updates/anthropic/claude-code), 웹 검색 결과*

*⚠️ 참고: 이 보고서는 네트워크 이그레스 정책으로 multica.ai 직접 접속이 차단되어 자동 제출 실패. 수동 제출 필요.*
