## 🛸 스킬 발전 사항 일일 보고 — 2026-05-18 KST

---

### 📡 최신 동향

**Claude Code v2.1.139 ~ v2.1.143 (2026-05-11 ~ 05-15) 핵심 변경:**

**Agent View (Research Preview) — 신규:**
- `claude agents` 명령어로 모든 세션(실행 중/대기/완료) 단일 목록 관리
- running/blocked/done 상태, 경과시간/턴수/토큰 오버레이 실시간 표시
- `claude agents` 실행 시 `--add-dir`, `--settings`, `--mcp-config`, `--permission-mode`, `--model`, `--effort` 등 전 플래그 지원
- 백그라운드 에이전트가 idle 재개 후에도 모델·effort 레벨 유지

**`/goal` 커맨드 — 신규 (v2.1.139+):**
- 완료 조건 설정 → Claude가 목표 달성까지 여러 턴에 걸쳐 자율 작업
- interactive / `-p` (headless) / Remote Control 모드 전체 지원
- [Alien Agentic 활용 가능] 27명 에이전트 시스템에서 "골 기반 장시간 태스크" 위임에 즉시 적용 가능

**Hooks 시스템 신규 기능 (v2.1.139~141):**
- `args: string[]` 필드 (exec form): 쉘 없이 커맨드 직접 실행 — 인젝션 위험 제거, 예측 가능한 파싱
- `continueOnBlock` 옵션 (`PostToolUse`): 거부 사유를 Claude에 피드백하면서 턴 계속 진행
- `terminalSequence` 필드: 데스크탑 알림·창 제목·벨 신호를 터미널 제어 없이 출력
- Stop 훅이 8회 연속 블록 시 경고 후 자동 종료 (무한루프 방지)
- 훅에서 `effort.level` JSON 필드 및 `$CLAUDE_EFFORT` 환경변수로 현재 effort 레벨 접근 가능

**Plugin 시스템 성숙:**
- `claude plugin disable` — 의존하는 플러그인이 있으면 비활성화 거부 (의존성 체인 힌트 제공)
- `claude plugin enable` — 전이 의존성 자동 강제 활성화
- `claude plugin details <name>` — 컴포넌트 목록 및 예상 토큰 비용 표시
- 루트 레벨 `SKILL.md` 보유 플러그인 (별도 `skills/` 디렉토리 없어도) 자동 스킬로 인식

**MCP 연동 강화 (v2.1.139):**
- MCP stdio 서버에 `CLAUDE_PROJECT_DIR` 환경변수 자동 주입
- 플러그인 설정에서 `${CLAUDE_PROJECT_DIR}` 참조 가능
- `/mcp` Reconnect — `.mcp.json` 수정 내용 재시작 없이 즉시 반영

**Subagent 추적 (v2.1.139):**
- API 요청 헤더에 `x-claude-code-agent-id` / `x-claude-code-parent-agent-id` 포함
- OTEL span에 `agent_id` / `parent_agent_id` 속성 추가 → 27명 에이전트 분산 추적 가능

**Skills 컨텍스트 예산 관리 (공식 문서 확인):**
- 스킬 설명 목록은 모델 컨텍스트 윈도우의 1% 예산 (기본값) → `skillListingBudgetFraction` 설정으로 조정 가능
- 컴팩션 후 스킬 재첨부: 최근 호출 스킬부터 최대 5,000 토큰, 공유 예산 25,000 토큰
- 각 스킬 설명+when_to_use 최대 1,536자 (`maxSkillDescriptionChars`로 변경 가능)
- `/doctor` 명령으로 예산 초과 여부 및 영향받은 스킬 확인 가능
- `skillOverrides`에서 `"name-only"` 설정 시 설명 없이 이름만 목록에 포함 → 예산 절감

---

### 🔍 현재 설치된 스킬 현황

**brain180 프로젝트 (`.claude/`):**

| 항목 | 내용 |
|------|------|
| `.claude/skills/` | **없음** — 스킬 디렉토리 미생성 (어제와 동일) |
| `.claude/commands/` | **없음** |
| `settings.local.json` | 허용 권한 3개만 존재, 스킬 관련 설정 전무 |
| `launch.json` | vite dev server 설정만 포함 |

**현재 세션에서 사용 가능한 번들 스킬:**
- `/session-start-hook` — 웹 환경 SessionStart 훅 설정
- `/update-config` — settings.json 자동화/훅 설정
- `/keybindings-help` — 키보드 단축키 커스터마이징
- `/simplify` — 코드 리뷰 및 품질 개선
- `/fewer-permission-prompts` — 반복 허용 목록 자동 추가
- `/loop` — 반복 실행 태스크 설정
- `/claude-api` — Claude API / Anthropic SDK 앱 빌드
- `/init` — CLAUDE.md 초기화
- `/review` — PR 코드 리뷰
- `/security-review` — 보안 검토

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `cognitive-map-extract` | 신규 프로젝트 스킬 | 🔴 최우선 | Brain180 핵심 — 텍스트→뇌인지 구조 노드/엣지 추출. `context: fork` + `agent: Explore`로 분리 실행 권장. `!`git diff HEAD`` 패턴으로 동적 텍스트 주입 |
| `goal-driven-agent` | 신규 개인 스킬 | 🔴 최우선 | `/goal` 신규 커맨드 활용 — 27명 에이전트에 "장기 목표" 위임 표준화. 목표 조건 정의 템플릿화 |
| `why-how-what` | 신규 개인 스킬 | 🔴 높음 | Alien Agentic WHY→HOW→WHAT 컨설팅 프레임워크 스킬화. `disable-model-invocation: true`로 의도적 실행만 허용 |
| `agent-orchestrate` | 신규 개인 스킬 | 🟠 높음 | 27명 에이전트 조율 패턴 + `x-claude-code-agent-id` OTEL 추적 연계. 의존성 확인·병렬 실행 체크리스트 |
| `daily-report` | 신규 개인 스킬 | 🟠 높음 | 오늘처럼 반복되는 일일 보고 자동화. `$ARGUMENTS`로 이슈 ID 전달. `continueOnBlock` 훅으로 multica 제출 실패 시 재시도 로직 연동 가능 |
| `multica-submit` | 신규 개인 스킬 | 🟠 높음 | multica CLI 제출 절차 캡슐화. `allowed-tools: Bash(multica *)` + `disable-model-invocation: true`. ⚠️ 현재 multica CLI npm 미등록 — 로컬 설치 경로 확인 필요 |
| `brain180-viz-review` | 신규 프로젝트 스킬 | 🟡 중간 | 시각화/텍스트 레이어 분리 원칙 자동 검증. CLAUDE.md의 `grep` 체크리스트를 스킬로 이식. `paths: ["src/components/**"]` 로 해당 디렉토리 작업 시 자동 발동 |
| `effort-adaptive` | 참조 스킬 업데이트 | 🔵 낮음 | `${CLAUDE_EFFORT}` 변수 활용. 뇌인지 구조 분석(깊은 추론 필요) 시 `effort: xhigh` 자동 적용 패턴 |

---

### ⚠️ multica CLI 이슈 리포트

```
$ npm install -g @multica/cli
npm error 404  '@multica/cli@*' is not in this registry.
```

**상황**: `@multica/cli` 패키지가 npm 공개 레지스트리에 존재하지 않음.
**조치**: 본 보고서는 `reply.md`에 저장. 수동 제출 또는 multica 설치 경로 확인 후 재시도 필요.
**이슈 ID**: `0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7` (ALI-14)

제출 재시도 명령 (multica 설치 후):
```bash
multica issue comment add 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7 --content-file ./reply.md
```

---

### 📋 오늘의 액션 아이템

1. **[즉시] multica CLI 설치 경로 확인**: npm 레지스트리 외 로컬 바이너리/pip/brew 경로 확인 후 보고서 제출
2. **[즉시] `/goal` 커맨드 활용 테스트**: 뇌인지 구조 추출 장기 태스크에 `/goal` 적용 — "모든 philosopher 텍스트의 CognitiveMap 생성 완료"를 목표 조건으로 설정
3. **[이번 주] `cognitive-map-extract` 스킬 작성**: `.claude/skills/cognitive-map-extract/SKILL.md` + `context: fork` + `agent: Explore`. 동적 컨텍스트 주입(`!`cat $0``)으로 텍스트 파일 직접 로드
4. **[이번 주] `goal-driven-agent` 스킬 작성**: `~/.claude/skills/goal-driven-agent/SKILL.md`. WHY-HOW-WHAT → `/goal` 목표 조건 변환 템플릿
5. **[이번 주] `claude agents` 활용 실험**: 27명 에이전트 태스크를 Agent View로 모니터링. OTEL `agent_id` 추적 로그 연결
6. **[이번 주] `brain180-viz-review` 스킬 작성**: CLAUDE.md `grep` 체크리스트 → `paths: ["src/components/**"]` 스킬로 자동화. `allowed-tools: Bash(grep *)` 설정
7. **[다음 주] Hook `continueOnBlock` 도입**: PostToolUse 훅에 multica 제출 실패 시 Claude에 재시도 피드백 → 자동 재시도 루프 구현
8. **[다음 주] `/doctor` 진단 정례화**: 스킬 예산 초과 여부 주간 점검 루틴화

---

*보고: Alien Agentic subagent-builder | 환경: brain180 원격 실행 컨테이너 | multica CLI 미설치(npm 404) | 날짜: 2026-05-18*
