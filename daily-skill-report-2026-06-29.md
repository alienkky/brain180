## 🛸 스킬 발전 사항 일일 보고 — 2026년 6월 29일 KST

> **보고 주체**: Alien Agentic subagent-builder
> **대상 이슈**: ALI-14 (Multica 이슈 ID: `0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7`)
> **비고**: multica CLI v0.3.32 **이번 세션 설치 성공** — 그러나 인증 토큰(`mul_...` PAT) 환경 미설정으로 4회 연속 GitHub 파일 대체 보고. `multica login --token <PAT>` 실행을 위해 Settings → Personal Access Tokens에서 발급 필요.

---

### 📡 최신 동향

#### Claude Code 릴리즈 현황

| 버전 | 일자 | 상태 |
|------|------|------|
| **v2.1.195** | 2026-06-26 | 현재 최신 (전회 보고 이후 신규 릴리즈 없음) |

> v2.1.196 이상은 2026-06-29 기준 아직 미출시. 전회(06-27) 보고 이후 **새 릴리즈 없음**.

#### 스킬 생태계 성장 (주요 지표)

| 지표 | 현황 |
|------|------|
| AgentSkills.io 등록 플러그인 | **432개** |
| 공개 스킬 수 | **2,769개** |
| 공개 에이전트 수 | **297개** |
| Anthropic 공식 오픈소스 스킬 | **17개** (`anthropics/skills` 리포) |

#### 공식 문서 신기능 확인 (이번 회차 발견)

이번 조사에서 공식 Skills 문서([code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills))를 전체 분석하여 아래 기능들을 확인:

**새 Frontmatter 필드**
| 필드 | 기능 |
|------|------|
| `paths` | 특정 파일 glob 패턴에서만 스킬 자동 활성화 (모노레포 범위 제한) |
| `shell` | `bash` 또는 `powershell` 지정 — Windows PowerShell 지원 |
| `hooks` | 스킬 생명주기 훅 (PreToolUse 등) 스킬 단위로 스코핑 |
| `disallowed-tools` | 스킬 활성 중 특정 툴 풀에서 제거 |
| `effort` | 스킬 실행 시 추론 effort 강제 설정 (`low`~`max`) |
| `model` | 스킬 실행 시 모델 강제 변경 (턴 종료 후 원래 모델 복원) |

**새 String Substitution 변수**
| 변수 | 의미 |
|------|------|
| `${CLAUDE_SKILL_DIR}` | 현재 스킬의 디렉토리 절대 경로 (번들 스크립트 참조용) |
| `${CLAUDE_EFFORT}` | 현재 effort 레벨 (스킬 내 동적 분기 가능) |
| `$0`, `$1`... | `$ARGUMENTS[N]` 단축 표현 |
| `$name` | `arguments:` frontmatter로 정의한 이름 인자 |

**`skill-creator` 플러그인 (공식 마켓플레이스)**
```bash
/plugin install skill-creator@claude-plugins-official
```
- eval 기반 자동 품질 테스트 (pass rate, token, time 비교)
- A/B 버전 비교, description 튜닝, HTML 리뷰어 제공
- [agentskills.io/skill-creation/evaluating-skills](https://agentskills.io/skill-creation/evaluating-skills)

**`skillOverrides` 설정 신규 지원**
```json
{
  "skillOverrides": {
    "legacy-context": "name-only",
    "deploy": "off"
  }
}
```
- `/skills` 메뉴에서 스페이스 키로 토글 후 로컬 settings에 자동 저장

**새 설정 키**
| 설정 | 기능 |
|------|------|
| `disableBundledSkills` | 모든 번들 스킬 숨김 |
| `skillListingBudgetFraction` | 스킬 설명 컨텍스트 예산 비율 (기본 1%) |
| `maxSkillDescriptionChars` | 스킬 설명 최대 문자 수 (기본 1,536) |
| `disableSkillShellExecution` | `` !`command` `` 인라인 실행 비활성화 |

**`multica-cli` v0.3.32 출시 (2026-06-29)**
- 이번 세션에서 `/usr/local/bin/multica`에 설치 완료
- `multica issue comment add <id> --content-file ./file.md` 지원 확인

---

### 🔍 현재 설치된 스킬 현황 (brain180 / alienkky)

**프로젝트 레벨 (brain180/.claude/):**
- 스킬 **없음** — `.claude/skills/` 디렉토리 미존재 (**4회 연속 미해결**)
- `settings.local.json`: 일부 Bash 허용 퍼미션만 존재
- `launch.json`: Vite 개발 서버 설정만

**사용자 전역 레벨 (~/.claude/skills/):**
| 스킬명 | 설명 |
|--------|------|
| `session-start-hook` | 웹 세션의 SessionStart 훅 생성/개발용 스킬 |

**번들 스킬 (Claude Code 내장, v2.1.195 기준):**

| 스킬 | 유형 | 용도 |
|------|------|------|
| `/session-start-hook` | 스킬 | SessionStart 훅 설정 |
| `/deep-research` | 워크플로 | 멀티소스 팩트체크 리서치 |
| `/update-config` | 스킬 | settings.json 구성 업데이트 |
| `/keybindings-help` | 스킬 | 키바인딩 커스터마이즈 |
| `/verify` | 스킬 | 코드 변경사항 앱 실행 검증 |
| `/code-review` | 스킬 | 코드 리뷰 (diff 분석, --fix/--comment/ultra) |
| `/simplify` | 스킬 | 코드 단순화 리팩토링 |
| `/fewer-permission-prompts` | 스킬 | 권한 프롬프트 자동 허용 설정 |
| `/loop` | 스킬 | 반복 실행 스케줄링 |
| `/claude-api` | 스킬 | Claude/Anthropic API 레퍼런스 |
| `/run` | 스킬 | 앱 실행 및 확인 (v2.1.145+) |
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
| **multica PAT 등록** | 인프라 | 🔴 긴급 (4회 연속) | `mul_...` PAT를 환경변수로 등록 → `multica login --token $MULTICA_PAT` → 이슈 직접 코멘트 가능 |
| `component-checker` | 신규 프로젝트 스킬 | 🔴 높음 (4회 연속) | CLAUDE.md 커밋 전 grep 체크리스트 4개 자동 실행. `disable-model-invocation: true` + `allowed-tools: Bash(grep *)` |
| `skill-creator` 플러그인 설치 | 번들 확장 | 🔴 높음 | `/plugin install skill-creator@claude-plugins-official` — 신규 스킬 품질 eval 자동화. brain180 스킬 개발 품질 보장 |
| `brain180-visualize` | 신규 프로젝트 스킬 | 🔴 높음 | brain180 핵심 기능: 텍스트 → CognitiveMap 자동 분석. `paths: src/data/**` frontmatter로 데이터 파일 작업 시만 활성화 |
| `run-skill-generator` 실행 | 번들 스킬 활성화 | 🟡 중간 | brain180 Vite+Express 레시피 기록 → `/run`, `/verify` 자동 연동 |
| `why-how-what` | 신규 글로벌 스킬 | 🟡 중간 | Alien Agentic 핵심 WHY-HOW-WHAT 3단계 분석 템플릿. `effort: high` + `context: fork` 로 독립 서브에이전트 실행 |
| `agent-dispatch` | 신규 글로벌 스킬 | 🟡 중간 | 27명 에이전트 라우팅 로직 스킬화. `user-invocable: false`로 Claude만 자동 호출 |
| `multica-report` | 신규 프로젝트 스킬 | 🟢 낮음 | 이 보고서 생성 프로세스 스킬화. `disable-model-invocation: true` + `${CLAUDE_SKILL_DIR}` 활용해 템플릿 외부 파일 참조 |
| Anthropic 공식 스킬 탐색 | 커뮤니티 리소스 | 🟢 낮음 | `github.com/anthropics/skills` — 17개 오픈소스 스킬 중 brain180에 적용 가능한 것 식별 |

---

### 📋 오늘의 액션 아이템

1. **[긴급 — 4회 연속]** Multica Settings → Personal Access Tokens에서 `mul_...` PAT 발급 → Claude Code 원격 세션 환경변수 `MULTICA_PAT`로 등록 → `multica login --token $MULTICA_PAT` 실행
   > 이번 세션에서 multica v0.3.32 설치 성공. 토큰만 있으면 즉시 이슈 코멘트 가능.

2. **[HIGH — 4회 연속]** brain180 프로젝트 스킬 디렉토리 생성:
   ```bash
   mkdir -p /home/user/brain180/.claude/skills/component-checker
   ```
   `SKILL.md` 내용: CLAUDE.md의 커밋 전 grep 체크리스트 4개 자동 실행

3. **[HIGH]** `skill-creator` 플러그인 설치 (다음 interactive 세션에서):
   ```
   /plugin install skill-creator@claude-plugins-official
   /reload-plugins
   ```

4. **[HIGH]** `brain180-visualize` 스킬 초안 작성:
   - `paths: src/data/**,src/core/**` frontmatter로 범위 제한
   - `context: fork` + `agent: general-purpose`로 독립 실행
   - 텍스트 → CognitiveNode/CognitiveEdge 추출 지시 포함

5. **[MEDIUM]** `/run-skill-generator` 실행 → `.claude/skills/run-brain180/` 자동 생성

6. **[MEDIUM]** `skillListingBudgetFraction: 0.02` 를 settings에 추가 — 스킬 수 증가에 따른 설명 잘림 방지

7. **[LOW]** `github.com/anthropics/skills` 에서 17개 공식 스킬 목록 확인 후 적용 후보 선정

---

### ⚠️ 지속 리스크

| 항목 | 현황 | 조치 |
|------|------|------|
| multica 인증 | 4회 연속 미설정 (CLI는 설치됨) | PAT 발급 후 환경변수 등록 1회만 하면 해결 |
| `.claude/skills/` 미생성 | 4회 연속 미이행 | `mkdir -p` 명령 1줄로 해결 가능 |
| brain180 스킬 부재 | 핵심 기능 미스킬화 | 위 액션 아이템 2~4번 순서대로 실행 |

---

### 🔗 참고 자료

- [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills)
- [Claude Code Commands 레퍼런스](https://code.claude.com/docs/en/commands)
- [Agent Skills 오픈 스탠더드](https://agentskills.io)
- [Anthropic 공식 오픈소스 스킬](https://github.com/anthropics/skills)
- [Awesome Claude Code 커뮤니티](https://github.com/hesreallyhim/awesome-claude-code)
- [Multica CLI 설치 가이드](https://github.com/multica-ai/multica/blob/main/CLI_INSTALL.md)
