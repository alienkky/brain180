## 🛸 스킬 발전 사항 일일 보고 — 2026-05-29 (KST)

### 📡 최신 동향

**Claude Code 스킬 시스템 공식 문서 기준 최신 확인 사항 (2026-05-29)**

1. **AgentSkills 오픈 스탠다드 채택 공식화**: Claude Code 스킬이 [agentskills.io](https://agentskills.io) 오픈 스탠다드를 따름. Claude Code, Codex, Gemini CLI, Cursor 등 여러 AI 도구에서 동일한 `SKILL.md` 형식으로 동작. **크로스 툴 스킬 재사용 가능**.

2. **`/run-skill-generator` 신규 번들 스킬 확인**: 프로젝트의 앱 실행 레시피를 자동으로 기록하여 `.claude/skills/run-<name>/`에 저장. 이후 `/run`, `/verify` 실행 시 재발견 없이 저장된 레시피 사용. v2.1.145 이상 필요.

3. **`paths:` 프론트매터 신규 필드**: 스킬이 활성화되는 파일 패턴(glob)을 지정. 특정 경로 파일 작업 시에만 스킬 자동 로드. **모노레포 지원 강화**.

4. **`${CLAUDE_SKILL_DIR}` 변수 추가**: 스킬의 `SKILL.md` 파일이 위치한 디렉토리 경로. 스킬에 번들된 스크립트/파일을 현재 작업 디렉토리에 관계없이 참조 가능.

5. **`${CLAUDE_EFFORT}` 변수 추가**: 현재 effort 수준(`low`/`medium`/`high`/`xhigh`/`max`)을 스킬 내에서 참조 가능. Ultracode는 `xhigh`로 보고됨.

6. **`disallowed-tools` 공식 문서 확인**: 특정 스킬 활성 중 도구 제거. 백그라운드 루프 스킬에서 `AskUserQuestion`을 금지하는 용도가 공식 예시. 제한은 사용자 다음 메시지 전송 시 해제.

7. **Anthropic 공식 11개 knowledge-work 플러그인 오픈소스화**: `anthropics/knowledge-work-plugins` 리포에서 영업, 법무, 재무, 데이터, 제품 관리 분야 커버.

8. **커뮤니티 스킬 생태계 급성장**: [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) 1,000+ 스킬, [Samarth0211/awesome-claude-skills-2026](https://github.com/Samarth0211/awesome-claude-skills-2026) 2,300+ 스킬. [awesomeskills.dev](https://www.awesomeskills.dev) 검색 디렉토리 운영 중.

---

### 🔍 현재 설치된 스킬 현황

**글로벌 스킬 (`~/.claude/skills/`)**
| 스킬명 | 상태 | 설명 |
|-------|------|-----|
| `session-start-hook` | ✅ 설치됨 | Claude Code 웹 세션 시작 훅 생성 지원 |

**시스템 번들 스킬 (2026-05-29 현재 세션 기준)**
| 스킬명 | 유형 | 설명 |
|-------|------|-----|
| `autopilot` | 번들 | 엔드투엔드 작업 자동 실행 + PR 생성 |
| `bugfix` | 번들 | 재현 우선 버그 수정 워크플로 |
| `deep-research` | 번들 | 멀티소스 팩트체크 리서치 보고서 |
| `update-config` | 번들 | settings.json 설정 자동화 |
| `keybindings-help` | 번들 | 키보드 단축키 설정 |
| `verify` | 번들 | 코드 변경 사항 검증 |
| `code-review` | 번들 | 코드 리뷰 (--fix, --comment 옵션) |
| `simplify` | 번들 | 코드 정리 자동 적용 (reuse/simplification/efficiency) |
| `fewer-permission-prompts` | 번들 | 권한 프롬프트 최소화 설정 |
| `loop` | 번들 | 반복 작업 예약 실행 |
| `claude-api` | 번들 | Claude API/Anthropic SDK + Opus 4.8 마이그레이션 |
| `run` | 번들 | 앱 실행 및 동작 확인 (v2.1.145+) |
| `verify` | 번들 | 변경 사항 실제 앱으로 검증 (v2.1.145+) |
| `init` | 번들 | CLAUDE.md 초기화 |
| `review` | 번들 | PR 리뷰 |
| `security-review` | 번들 | 보안 리뷰 |
| `session-start-hook` | 번들 | 웹 세션 시작 훅 생성 |

**프로젝트 수준 스킬 (brain180)**
- 없음 (`.claude/skills/` 디렉토리 미존재)

**어제(2026-05-28)와 비교한 변경사항**
- `run-skill-generator` 번들 스킬이 공식 문서에서 `/run`, `/verify`와 함께 묶음 확인됨 (어제 목록에 누락)

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| `run-skill-generator` 실행 | 기존 번들 활용 | 🔴 긴급 | brain180은 Vite 서버 + port 5173 구성. `/run-skill-generator` 실행 시 `.claude/skills/run-brain180/` 자동 생성. 이후 `/run`, `/verify` 재발견 없이 일관된 실행 보장 |
| `alien-consulting` | 프로젝트 커스텀 스킬 | 🟠 높음 | WHY-HOW-WHAT 3레이어 컨설팅 프레임워크를 `SKILL.md`로 정의. `disable-model-invocation: true`로 수동 트리거 전용 설정 권장 |
| `cognitive-map-extractor` | 프로젝트 커스텀 스킬 | 🟠 높음 | Brain180 핵심 기능. `paths: src/data/**` 프론트매터로 데이터 파일 작업 시 자동 활성화. `${CLAUDE_SKILL_DIR}/templates/` 활용 권장 |
| `agent-orchestrator` | 커스텀 스킬 (Alien Agentic) | 🟡 중간 | `context: fork` + `disallowed-tools: AskUserQuestion`으로 27명 에이전트 백그라운드 자율 실행 스킬. `/loop`와 조합하여 주기적 오케스트레이션 구현 |
| `multica-reporter` | 커스텀 스킬 (이 작업 자동화) | 🟡 중간 | 이 일일 보고 절차 전체를 `SKILL.md`로 작성. `disable-model-invocation: true` + `!git log --oneline -5` 동적 컨텍스트 주입으로 매일 자동화 가능 |
| `agentskills.io` 스킬 검토 | 외부 스킬 도입 | 🟡 중간 | agentskills.io 표준 준수 스킬은 Claude Code에서 바로 사용 가능. VoltAgent/awesome-agent-skills 내 consulting/automation 카테고리 검토 권장 |
| `disallowed-tools` 적용 | 기존 스킬 개선 | 🔵 낮음 | 현재 `session-start-hook` 스킬에 `disallowed-tools: Bash` 추가 검토. 훅 설정 스킬이 의도치 않은 Bash 실행 방지 |
| OpenTelemetry + multica 연동 | 인프라 | 🔵 낮음 | [가설] `claude_code.skill_activated` OTel 이벤트를 multica 이슈 자동 업데이트에 연결 가능성. multica daemon이 이 이벤트를 수신할 수 있다면 스킬 활성화마다 이슈 상태 자동 갱신 가능 |

---

### 📋 오늘의 액션 아이템

1. **[즉시] `/run-skill-generator` 실행**
   ```bash
   # brain180 프로젝트에서 Claude Code 세션 내 실행
   /run-skill-generator
   ```
   brain180의 Vite 개발 서버 실행 레시피를 자동 기록. `launch.json`의 `npx vite --port 5173` 설정을 참고하여 진행.

2. **[이번 주] `alien-consulting` 스킬 초안 작성**
   ```
   ~/.claude/skills/alien-consulting/SKILL.md
   ```
   WHY-HOW-WHAT 3레이어 + 고객 브리프 파싱 + 컨설팅 문서 생성 포함.
   `disable-model-invocation: true`로 수동 호출 전용 설정.

3. **[이번 주] `cognitive-map-extractor` 스킬 작성**
   ```
   /home/user/brain180/.claude/skills/cognitive-map-extractor/SKILL.md
   ```
   `paths: src/data/**,src/core/**` 프론트매터로 Brain180 핵심 파일 작업 시 자동 로드.

4. **[다음 주] agentskills.io 스킬 디렉토리 검토**
   [awesomeskills.dev](https://www.awesomeskills.dev/en) 방문 → consulting/automation 필터로 Alien Agentic에 바로 적용 가능한 스킬 선별.

5. **[확인 필요] multica CLI 인증 설정**
   이 원격 실행 환경에서 `multica setup cloud` 실행 후 브라우저 OAuth 인증 완료 필요.
   현재 환경: `server_url`, `workspace_id` 미설정 상태.

---

*조사 출처: [Claude Code Skills Docs](https://code.claude.com/docs/en/skills) · [Claude Code Changelog (raw)](https://raw.githubusercontent.com/anthropics/claude-code/refs/heads/main/CHANGELOG.md) · [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) · [awesomeskills.dev](https://www.awesomeskills.dev/en) · [Releasebot Anthropic](https://releasebot.io/updates/anthropic/claude-code)*
