## 🛸 스킬 발전 사항 일일 보고 — 2026-06-23 KST

### 📡 최신 동향 (Claude Code Skills — 2026년 6월 23일)

**최신 버전: v2.1.187** (2026-06-23 릴리즈 — 오늘 기준)

#### 이번 주 요약 (Jun 17-23, 2026 · v2.1.181~v2.1.187)

| 버전 | 날짜 | 스킬/훅 관련 핵심 변경 |
|------|------|----------------------|
| v2.1.187 | Jun 23 | 최신 릴리즈 — 안정성 패치 |
| v2.1.186 | Jun 22 | MCP 인증 CLI 강화; `/workflows` 필터링 UI 추가 |
| v2.1.185 | Jun 20 | Stream stall 힌트 타이밍 10초→20초, 오탐 감소 |
| v2.1.183 | Jun 19 | Auto mode 파괴 명령 자동 차단 강화; `/config --help` 신규 |
| v2.1.181 | Jun 17 | `/config key=value` 인라인 문법 추가; MCP OAuth 개선; `sandbox.allowAppleEvents` |

#### 6월 초 핵심 업데이트

| 버전 | 날짜 | 내용 |
|------|------|------|
| v2.1.178 | Jun 15 | **스킬 중첩 디렉토리 지원**; `Tool(param:value)` 퍼미션 문법 |
| v2.1.176 | Jun 12 | 세션 제목 언어 자동 감지; 훅 패턴 버그 수정 |

#### 5월 핵심 업데이트

| 버전 | 날짜 | 내용 |
|------|------|------|
| v2.1.157 | May 29 | `.claude/skills/` 자동 로드; `claude plugin init` |
| v2.1.152 | May 27 | `disallowed-tools` frontmatter; `/reload-skills`; `MessageDisplay` 훅 신설 |
| v2.1.147 | May 21 | `Stop` 훅 `additionalContext` 반환; MCP `CLAUDE_CODE_SESSION_ID` 수신 |

---

### 🔍 현재 설치된 스킬 현황

#### 글로벌 스킬 (~/.claude/skills/)
| 스킬명 | 상태 |
|--------|------|
| session-start-hook | ✅ 설치됨 |

#### 프로젝트 스킬 (brain180/.claude/skills/)
없음 ❌

#### 세션 Bundled Skills (14개)
session-start-hook, deep-research, update-config, keybindings-help, verify, code-review, simplify, fewer-permission-prompts, loop, run, review, security-review, init, claude-api

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `.claude/skills/why-how-what/SKILL.md` | 커스텀 신규 | 🔴 HIGH | Alien Agentic WHY-HOW-WHAT 컨설팅 프레임워크 스킬화 |
| SessionStart 훅 → reloadSkills: true | 훅 업데이트 | 🔴 HIGH | 새 스킬 동적 로딩 — 27명 에이전트 시스템 필수 |
| `.claude/skills/multica-report/SKILL.md` | 커스텀 신규 | 🔴 HIGH | 이 보고 루틴 스킬화 + multica CLI 인증 자동화 |
| 중첩 스킬 디렉토리 구조 | v2.1.178 신기능 | 🟡 MEDIUM | brain180:*, alien-agentic:* 분류 |
| `.claude/skills/cognitive-map-gen/SKILL.md` | 커스텀 신규 | 🟡 MEDIUM | brain180 CognitiveMap JSON 자동 추출 보조 |
| sandbox.credentials 적용 | v2.1.186+ | 🟡 MEDIUM | 27명 에이전트 credential 보호 강화 |
| Tool(param:value) 퍼미션 | v2.1.178 | 🟢 LOW | Agent(model:opus) 파라미터 기반 모델 제어 |

---

### 📋 오늘의 액션 아이템

1. **[즉시]** multica setup 실행 — CLI v0.3.28 설치됨, 인증 미완료
2. **[단기]** .claude/skills/why-how-what/SKILL.md 생성
3. **[단기]** .claude/skills/multica-report/SKILL.md 생성
4. **[단기]** SessionStart 훅에 reloadSkills: true 반환 추가
5. **[단기]** brain180 .claude/skills/cognitive-map-gen/ 스킬 생성
6. **[중기]** 중첩 스킬 디렉토리 구조 확립
7. **[중기]** MessageDisplay 훅 프로토타입 — WHY-HOW-WHAT 포맷 변환
8. **[중기]** sandbox.credentials 설정으로 에이전트 credential 보호

---

### ⚠️ 인프라 이슈

- **multica CLI v0.3.28**: 설치 성공 (GitHub 릴리즈), 서버 URL·인증 미설정으로 이슈 코멘트 자동 제출 불가
- **인증 방법**: multica setup (대화형) 또는 multica login --token TOKEN (헤드리스 CI용)
- **대안**: reply.md를 brain180 리포에 커밋하여 추적

---

*조사 소스: GitHub Releases (claude-code v2.1.187), multica-ai/multica (v0.3.28), agentskills.io*
