## 🛸 스킬 발전 사항 일일 보고 — 2026-06-21 KST

### 📡 최신 동향 (Claude Code Skills — 2026년 6월 21일)

**최신 버전: v2.1.185** (2026-06-20 릴리즈 — 오늘 기준)

#### 이번 주 요약 (Jun 15-20, 2026 · v2.1.176~v2.1.185)

| 버전 | 날짜 | 스킬/훅 관련 핵심 변경 |
|------|------|----------------------|
| v2.1.185 | Jun 20 | Stream stall 힌트 타이밍 10초→20초, 오탐 감소 |
| v2.1.183 | Jun 19 | Auto mode: `git reset --hard`, `terraform destroy` 등 파괴 명령 자동 차단 강화; `/config --help` 신규 |
| v2.1.181 | Jun 17 | `/config key=value` 인라인 문법 추가; MCP OAuth 개선; `sandbox.allowAppleEvents` |
| v2.1.178 | Jun 15 | **스킬 중첩 디렉토리 지원** `.claude/skills/sub/` 자동 로드; `Tool(param:value)` 퍼미션 문법 |
| v2.1.176 | Jun 12 | 세션 제목 언어 자동 감지; `footerLinksRegexes` 배지 설정; 훅 패턴(`Edit(src/**)`) 수정 |

#### 5월 핵심 업데이트 (스킬 시스템 대폭 강화)

| 버전 | 날짜 | 내용 |
|------|------|------|
| v2.1.157 | May 29 | 플러그인 마켓플레이스 없이 `.claude/skills/` 자동 로드; `claude plugin init <name>` |
| v2.1.152 | May 27 | **스킬 frontmatter `disallowed-tools`** 지원; **`/reload-skills`** 명령어; `MessageDisplay` 훅 신설; `SessionStart` → `reloadSkills: true` 반환 가능 |
| v2.1.147 | May 21 | `Stop`/`SubagentStop` 훅 `additionalContext` 반환; 스킬 `\$` 이스케이프 문법; MCP 서버 `CLAUDE_CODE_SESSION_ID` 수신 |
| v2.1.141 | May 13 | 훅 `terminalSequence` 필드 (데스크탑 알림·윈도우 제목); `CLAUDE_CODE_PLUGIN_PREFER_HTTPS` |

#### Agent Skills 오픈 표준 채택 확인
- Claude Code 스킬이 [agentskills.io](https://agentskills.io) 오픈 표준 준수
- 타 AI 툴(Open Code, Codex 등)과 스킬 파일 공유 가능 — 멀티 에이전트 시스템에서 이식성 확보

---

### 🔍 현재 설치된 스킬 현황

#### 글로벌 스킬 (`~/.claude/skills/`)
| 스킬명 | 상태 |
|--------|------|
| `session-start-hook` | ✅ 설치됨 |

#### 프로젝트 스킬 (`brain180/.claude/skills/`)
| 스킬명 | 상태 |
|--------|------|
| (없음) | ❌ 미설치 |

#### 세션 Bundled Skills (이 세션에서 확인된 전체 목록)
| 스킬 | 설명 |
|------|------|
| `/session-start` | 세션 시작 시 의존성 설치 훅 자동 생성 |
| `/deep-research` | 다중 소스 팩트체크 리서치 보고서 |
| `/update-config` | settings.json 훅/자동화 구성 |
| `/keybindings-help` | 키보드 단축키 커스터마이징 |
| `/verify` | 코드 변경사항 실제 동작 검증 |
| `/code-review` | diff 버그·효율성 리뷰 (effort level 설정 가능) |
| `/simplify` | 코드 간소화 및 정리 |
| `/fewer-permission-prompts` | 허용리스트 추가로 권한 프롬프트 최소화 |
| `/loop` | 주기적 반복 프롬프트 실행 |
| `/run` | 앱 실행 및 동작 확인 |
| `/review` | PR 리뷰 |
| `/security-review` | 보안 리뷰 |
| `/init` | CLAUDE.md 초기화 |
| `/claude-api` | Claude API 레퍼런스 (Fable 5, Opus 4.8 포함 최신 모델) |

#### 현재 설정 파일 현황 (brain180)
- `.claude/settings.local.json`: 기본 권한 설정만 존재, skills 관련 설정 없음
- `.claude/launch.json`: 실행 환경 설정만 존재
- `disableBundledSkills`: 미설정 (번들 스킬 전체 활성 상태)

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `.claude/skills/why-how-what/SKILL.md` | 커스텀 신규 | 🔴 HIGH | Alien Agentic 핵심 컨설팅 프레임워크. `disallowed-tools: [Edit, Write]`로 분석 전용 모드 보장 |
| `SessionStart` 훅 → `reloadSkills: true` | 훅 업데이트 | 🔴 HIGH | 새 스킬 자동 설치 후 세션 재시작 없이 즉시 활성화 — 27명 에이전트 시스템 운영에 필수 |
| `.claude/skills/multica-report/SKILL.md` | 커스텀 신규 | 🔴 HIGH | 이 보고 루틴 자체를 스킬화. `disallowed-tools: [Bash(rm*)]`로 안전 보장 |
| 중첩 스킬 디렉토리 구조 도입 | v2.1.178 신기능 | 🟡 MEDIUM | `.claude/skills/brain180/`, `.claude/skills/alien-agentic/` 분류. 이름 충돌 시 `brain180:cognitive-map` 형식 |
| `.claude/skills/cognitive-map-gen/SKILL.md` | 커스텀 신규 | 🟡 MEDIUM | brain180 텍스트 → CognitiveMap JSON 자동 추출 보조 스킬 |
| `MessageDisplay` 훅 활용 | v2.1.152 신기능 | 🟡 MEDIUM | [가설] 에이전트 출력을 WHY-HOW-WHAT 포맷으로 자동 변환 가능 |
| `Tool(param:value)` 퍼미션 적용 | v2.1.178 신기능 | 🟢 LOW | `Agent(model:opus)` 등 파라미터 기반 퍼미션으로 모델별 제어 |

#### `brain180/.claude/skills/multica-report/SKILL.md` 초안
```markdown
---
name: multica-report
description: Claude Code 스킬 발전 사항을 조사하고 Multica ALI-14 이슈에 일일 보고합니다
disallowed-tools: [Bash(rm*), Bash(git reset*), Bash(git clean*)]
---

오늘 날짜 KST 기준으로 Claude Code 스킬 발전 사항 일일 보고서를 작성하고
multica issue comment add 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7 --content-file ./reply.md 로 제출하세요.
```

---

### 📋 오늘의 액션 아이템

1. **[즉시]** `multica setup` 실행하여 서버 URL 및 인증 토큰 설정 — CLI 설치됨(v0.3.26)이나 인증 미완료
2. **[단기]** `.claude/skills/why-how-what/SKILL.md` 생성 — WHY-HOW-WHAT 컨설팅 프레임워크 스킬화
3. **[단기]** `.claude/skills/multica-report/SKILL.md` 생성 — 이 보고 루틴 스킬로 자동화
4. **[단기]** `SessionStart` 훅에 `reloadSkills: true` 반환 추가 — 스킬 동적 로딩 파이프라인
5. **[단기]** brain180 `.claude/skills/cognitive-map-gen/` 스킬 생성 (뇌인지 구조 분석 보조)
6. **[중기]** 중첩 스킬 디렉토리 구조 (`brain180:*` vs `alien-agentic:*`) 확립
7. **[중기]** `MessageDisplay` 훅 프로토타입 — 에이전트 출력 WHY-HOW-WHAT 포맷 변환

---

### ⚠️ 인프라 이슈

- **multica CLI v0.3.26**: GitHub 릴리즈에서 설치 성공 — 단, 서버 URL·인증 미설정으로 이슈 코멘트 제출 불가
- **npm `@multica/cli`**: 레지스트리에 없음 (404). GitHub 릴리즈 바이너리만 존재
- **자동 제출 실패**: `multica issue comment add 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7` 명령 실행 불가
- **대안**: 이 reply.md를 brain180 리포에 커밋하여 추적

---

*조사 소스: [Claude Code Changelog](https://code.claude.com/docs/en/changelog), [Agent Skills Standard](https://agentskills.io), [multica-ai/multica GitHub](https://github.com/multica-ai/multica), Claude Code 공식 docs*
