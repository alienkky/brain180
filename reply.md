## 🛸 스킬 발전 사항 일일 보고 — 2026-05-30 (KST)

### 📡 최신 동향

**Claude Code v2.1.139~v2.1.158 업데이트 종합 (2025년 말 ~ 2026년 5월)**

1. **Skills 2.0 통합 완료**: custom commands와 skills가 완전히 통합됨. `.claude/commands/deploy.md`와 `.claude/skills/deploy/SKILL.md`가 동일하게 `/deploy`를 생성하며 동작함. 기존 commands 파일은 자동 호환.

2. **`disallowed-tools` 프론트매터** (v2.1.152): 스킬 실행 중 특정 도구를 Claude 접근 풀에서 완전 제거 가능. 자율 실행 스킬에서 `AskUserQuestion` 차단 등 활용. 제한은 다음 메시지 전송 시 해제됨.

3. **`/reload-skills` 명령어** (v2.1.152): 세션 재시작 없이 스킬 디렉토리 즉시 재스캔.

4. **`SessionStart` 훅 개선** (v2.1.152): `reloadSkills: true` 반환으로 새 스킬 즉시 활성화, `hookSpecificOutput.sessionTitle`로 세션 제목 동적 설정 가능.

5. **`MessageDisplay` 훅** (v2.1.152): 어시스턴트 메시지 표시 전 변환/숨김 처리. 에이전트 출력 포맷 자동 변환 파이프라인 구축 가능.

6. **Plugin 자동 로딩** (v2.1.157): `.claude/skills` 디렉토리에서 플러그인 자동 감지 (마켓플레이스 불필요). `claude plugin init <name>` 스캐폴딩 명령 추가.

7. **MCP 강화** (v2.1.157): stdio 서버에 `CLAUDE_CODE_SESSION_ID`, `CLAUDECODE=1` 환경변수 자동 주입. `CLAUDE_PROJECT_DIR`로 서버-프로젝트 연동.

8. **`/run` + `/verify` + `/run-skill-generator`** (v2.1.145): 앱 실행-검증 번들 스킬 3종. `/run-skill-generator`가 빌드 레시피를 `.claude/skills/run-<name>/`에 자동 저장.

9. **`claude agents`** (v2.1.139~v2.1.145): 멀티에이전트 세션 뷰어. `--json` 플래그로 스크립팅 연동, `--add-dir`, `--model`, `--effort` 등 세부 플래그 지원.

10. **`/goal` 명령** (v2.1.139): 완료 조건 설정 후 Claude가 달성까지 자율 실행.

11. **Agent Skills 오픈 표준**: [agentskills.io](https://agentskills.io) — 다른 AI 도구와 스킬 호환. Claude Code에서 subagent 실행, 동적 컨텍스트 주입 등 확장 기능 제공.

12. **`defaultEnabled: false` 플러그인** (v2.1.154): 플러그인을 비활성 상태로 배포 후 필요 시 선택 활성화 가능.

---

### 🔍 현재 설치된 스킬 현황

**brain180 프로젝트 `.claude/` 구성**
```
/home/user/brain180/.claude/
├── launch.json          (dev server: vite --port 5173)
└── settings.local.json  (권한: Bash(node -e *), 특정 경로 Read)
```
- `.claude/skills/` 디렉토리: **없음**
- `.claude/commands/` 디렉토리: **없음**

**시스템 번들 스킬 (현재 세션 기준)**
| 스킬명 | 유형 | 설명 |
|-------|------|-----|
| `session-start-hook` | 번들 | Claude Code 웹 세션 시작 훅 생성 |
| `deep-research` | 번들 | 멀티소스 팩트체크 리서치 보고서 |
| `update-config` | 번들 | settings.json 설정 자동화 |
| `keybindings-help` | 번들 | 키보드 단축키 설정 |
| `verify` | 번들 | 코드 변경사항 검증 (앱 실행 기반) |
| `code-review` | 번들 | 코드 리뷰 (--fix, --comment 옵션) |
| `simplify` | 번들 | 코드 정리 자동 적용 |
| `fewer-permission-prompts` | 번들 | 권한 프롬프트 최소화 설정 |
| `loop` | 번들 | 반복 작업 예약 실행 |
| `claude-api` | 번들 | Claude API/Anthropic SDK 개발 지원 |
| `run` | 번들 | 앱 실행 및 동작 확인 |
| `init` | 번들 | CLAUDE.md 초기화 |
| `review` | 번들 | PR 리뷰 |
| `security-review` | 번들 | 보안 리뷰 |
| `statusline-setup` | 번들 | 상태바 설정 |

**프로젝트 수준 커스텀 스킬**
- **없음** — brain180에 아직 커스텀 스킬 없음

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| `cognitive-map-extractor` | 신규 프로젝트 스킬 | ⭐⭐⭐ 높음 | Brain180 핵심 — 텍스트→CognitiveMap JSON 추출 워크플로 표준화. `PatternExtractor.ts` 연동 |
| `genius-profiler` | 신규 프로젝트 스킬 | ⭐⭐⭐ 높음 | 천재 인물별 인지 패턴 분석 포맷 표준화 스킬 |
| `daily-skill-report` | 신규 개인 스킬 | ⭐⭐⭐ 높음 | 이 보고 루틴 자체를 `~/.claude/skills/daily-skill-report/` 스킬화. `disable-model-invocation: true` + multica CLI 연동 |
| `why-how-what-analyzer` | 신규 개인 스킬 | ⭐⭐⭐ 높음 | Alien Agentic WHY-HOW-WHAT 컨설팅 프레임워크 자동 분석. 27명 에이전트 공통 패턴 |
| `agent-squad-dispatcher` | 신규 개인 스킬 | ⭐⭐ 중간 | `claude agents --json` 출력 기반 태스크 배분 워크플로 자동화 |
| `run-brain180` | 신규 프로젝트 스킬 | ⭐⭐ 중간 | `/run-skill-generator` 실행으로 vite dev 레시피 `.claude/skills/run-brain180/`에 자동 저장 |
| `multica-issue-reporter` | 신규 개인 스킬 | ⭐⭐⭐ 높음 | multica CLI로 이슈 코멘트 자동 제출. `disallowed-tools: AskUserQuestion` 완전 자율 실행 |
| `disallowed-tools` 도입 | 기존 스킬 개선 | ⭐⭐ 중간 | 자율 실행 에이전트 스킬에 `disallowed-tools: AskUserQuestion` 적용 — 야간 무인 자동 실행 |

---

### 🆕 오늘 새로 발견한 핵심 패턴

**패턴 1: 자율 실행 스킬 (27명 에이전트 시스템 적용)**
```yaml
---
description: 야간 자동 분석 에이전트
disallowed-tools: AskUserQuestion  # 사람 개입 차단
context: fork
---
```

**패턴 2: SessionStart → reloadSkills (CI/CD 스킬 자동 배포)**
```json
{ "reloadSkills": true, "hookSpecificOutput": { "sessionTitle": "Brain180 Dev" } }
```
새 스킬 배포 후 세션 재시작 없이 즉시 적용 — CI 파이프라인과 연동 가능.

**패턴 3: MessageDisplay 훅 → Multica 포맷 자동 변환**
에이전트 출력을 multica 이슈 코멘트 마크다운으로 자동 변환하는 훅 구성 가능.

**패턴 4: `claude agents --json` + Multica 연동** [가설]
```bash
claude agents --json | multica issue update <id> --content-stdin
```
27명 에이전트 실행 상태를 Multica 이슈 보드와 실시간 연동 가능성 검토 필요.

---

### 📋 오늘의 액션 아이템

1. **[즉시]** `~/.claude/skills/daily-skill-report/SKILL.md` 생성 — 이 보고 루틴 스킬화
2. **[즉시]** `~/.claude/skills/why-how-what-analyzer/SKILL.md` 생성 — WHY-HOW-WHAT 분석 자동화
3. **[이번 주]** brain180 `.claude/skills/cognitive-map-extractor/` 추가 — 핵심 추출 워크플로 표준화
4. **[이번 주]** `/run-skill-generator` 실행 — brain180 vite dev 서버 실행 레시피 기록
5. **[이번 주]** 자율 실행 에이전트 스킬에 `disallowed-tools: AskUserQuestion` 패턴 도입
6. **[다음 주]** `SessionStart` 훅 → `reloadSkills: true`로 스킬 배포 자동화 파이프라인 구축
7. **[다음 주]** `MessageDisplay` 훅으로 에이전트 출력 → multica 이슈 포맷 자동 변환 설계
8. **[검토]** [가설] `claude agents --json` + multica CLI 연동으로 27명 에이전트 상태 대시보드 가능성 검토

---

> 📎 참고 소스:
> - [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills)
> - [Claude Code CHANGELOG v2.1.139~v2.1.158](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
> - [Agent Skills 오픈 표준](https://agentskills.io)
> - [Multica v0.3.12 공식 GitHub](https://github.com/multica-ai/multica)
