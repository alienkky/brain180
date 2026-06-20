## 🛸 스킬 발전 사항 일일 보고 — 2026-06-20 KST

### 📡 최신 동향

**Claude Code v2.1.185** (오늘 기준 최신 버전, 2026-06-20 릴리즈)

#### 오늘의 신규 릴리즈 (Jun 20, 2026 · v2.1.185)

##### ⏱️ 스트림 stall 메시지 개선
- 힌트 텍스트 변경: `"No response from API · Retrying in …"` → `"Waiting for API response · will retry in …"`
- 트리거 타이밍 변경: 무응답 10초 → **20초** 후 힌트 표시 (오탐 감소 목적)

#### 어제 이후 추가 확인된 스킬 관련 업데이트

##### 🔄 `/reload-skills` 명령어 (신규 확인)
- 세션 재시작 없이 스킬 디렉토리를 즉시 재스캔
- `SessionStart` 훅에서 `reloadSkills: true` 반환 시 새로 설치된 스킬 즉시 사용 가능
- [가설] 자동화 파이프라인에서 스킬 동적 설치 후 세션 재시작 없이 활성화 가능

##### 🛡️ 스킬 프론트매터 `disallowed-tools` 지원 (신규 확인)
- 스킬 활성화 중 모델의 특정 도구 접근 제한 가능
- 예: 보고서 스킬 활성화 중 `Bash` 도구 완전 차단
- 보안이 필요한 스킬(읽기 전용 조사 등)에 활용 가능

##### 💲 스킬 명령어 `$` 이스케이프 문법 (신규 확인)
- `\$` 문법으로 리터럴 `$` 문자 사용 가능 (숫자 앞 위치)
- 쉘 변수 참조와 스킬 내 리터럴 달러 표기 구분

#### 이번 주 요약 (Jun 15-20, 2026 · v2.1.178~v2.1.185)

| 버전 | 날짜 | 핵심 변경 |
|------|------|----------|
| v2.1.185 | Jun 20 | Stream stall 메시지 개선 |
| v2.1.183 | Jun 19 | 파괴적 git 명령 차단, WebSearch 서브에이전트 버그 수정 |
| v2.1.181 | Jun 17 | `/config key=value` 문법, Apple Events 샌드박스, 모바일 알림 제어 |
| v2.1.178 | Jun 15 | `Tool(param:value)` 퍼미션, 중첩 `.claude/skills/`, 팀 시스템 단순화 |
| v2.1.176 | Jun 12 | 언어 인식 세션 제목, `/cd` git 브랜치 보고 개선 |

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

#### 세션 Bundled Skills (현재 세션 기준)
`session-start-hook`, `deep-research`, `update-config`, `keybindings-help`, `verify`, `code-review`, `simplify`, `fewer-permission-prompts`, `loop`, `claude-api`, `run`, `init`, `review`, `security-review`

#### ⚠️ 신규 발견: `code-review`가 `simplify`를 대체
- `/code-review` 스킬이 `/simplify` 스킬을 공식 대체
- 설정 가능한 effort level + `--fix` / `--comment` 옵션 지원
- 번들 스킬 목록에 두 스킬 모두 표시되지만 `/simplify`는 레거시 상태 [가설]

#### 현재 설정 파일 현황 (brain180)
- `.claude/settings.local.json`: 기본 권한 설정만 존재, skills 관련 설정 없음
- `.claude/launch.json`: Vite dev 서버 실행 설정만 존재
- `disableBundledSkills`: 미설정 (번들 스킬 전체 활성 상태)
- `/reload-skills`: 미활용 (세션 내 스킬 동적 재로딩 미설정)

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `.claude/skills/multica-report/` + `disallowed-tools: [Bash]` | 커스텀 신규 | 🔴 HIGH | 오늘 확인된 `disallowed-tools` 프론트매터로 보고 스킬에 Bash 차단 → 읽기 전용 안전 보장 |
| `SessionStart` 훅 → `reloadSkills: true` 연동 | 훅 업데이트 | 🔴 HIGH | 새 스킬 자동 설치 후 세션 재시작 없이 즉시 활성화 — 27명 에이전트 시스템 운영에 필수 |
| `.claude/skills/why-how-what/` + `disallowed-tools: [Bash, Edit]` | 커스텀 신규 | 🔴 HIGH | WHY-HOW-WHAT 컨설팅 스킬에 파일 수정 차단으로 분석 전용 모드 보장 |
| `Tool(param:value)` 퍼미션 규칙 설정 업데이트 | 설정 업데이트 | 🟡 MEDIUM | 어제 분석 확인 — `.claude/settings.local.json`에 즉시 적용 가능 |
| `.claude/skills/cognitive-map-gen/` | 커스텀 신규 | 🟡 MEDIUM | brain180 뇌인지 구조 → CognitiveMap JSON 자동 생성 보조 (Cytoscape.js 사용 프로젝트) |
| `fallbackModel` 설정 | 설정 업데이트 | 🟢 LOW | 27개 에이전트 시스템에서 기본 모델 과부하 시 자동 대체 설정 |

#### 즉시 적용 가능한 설정 예시

**`brain180/.claude/settings.local.json` 권장 업데이트**:
```json
{
  "permissions": {
    "allow": [
      "Bash(node -e ' *)",
      "Read(//e/e/**)"
    ],
    "deny": [
      "Bash(git reset --hard*)",
      "Bash(git clean -fd*)",
      "Bash(git checkout -- .)",
      "Bash(git stash drop*)",
      "Agent(model:opus)"
    ]
  }
}
```

**`brain180/.claude/skills/multica-report/SKILL.md` 초안**:
```markdown
---
name: multica-report
description: Multica 이슈에 일일 보고서를 작성하고 코멘트로 제출합니다
disallowed-tools: [Bash(rm*), Edit, Write]
---

오늘 날짜 KST 기준으로 스킬 발전 사항 일일 보고서를 ./reply.md에 작성하세요.
이슈 UUID: 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7
```

---

### 📋 오늘의 액션 아이템

1. **[즉시]** `.claude/settings.local.json`에 파괴적 git 명령 차단 deny 규칙 추가
2. **[즉시]** `multica-report` 스킬 생성 시 `disallowed-tools` 프론트매터 활용 — 오늘 확인된 신기능
3. **[단기]** `SessionStart` 훅에서 `reloadSkills: true` 반환 로직 추가 — 스킬 동적 설치 파이프라인
4. **[단기]** `/code-review` 스킬 활용 패턴 확립 (`/simplify` 대신 `/code-review --fix` 사용)
5. **[단기]** brain180 `.claude/skills/cognitive-map-gen/` 스킬 생성 (Cytoscape.js 프로젝트와 연동)
6. **[중기]** `fallbackModel` 설정 — Opus 4.8 → Sonnet 4.6 → Haiku 4.5 순서
7. **[중기]** 중첩 `.claude/skills/` 디렉토리 구조 구축 (`src/core/`, `src/components/`별 도메인 스킬)

---

### ⚠️ 인프라 이슈

- **multica CLI**: npm 레지스트리에 `@multica/cli` 패키지 없음 (404 확인)
- **대안 패키지 발견**: `pi-multica-spine` (v0.1.0, Jun 17), `multica-slack-assistant` (v1.0.0, Jun 20) — multica 생태계 관련 패키지이나 CLI 대체품 아님
- **네트워크 이그레스**: multica.ai 직접 접속 차단 상태 유지
- **제출 방식**: reply.md 파일로 대체 보고 (GitHub 이슈를 통한 수동 제출 필요)

---

*조사 소스: [Claude Code GitHub Releases](https://github.com/anthropics/claude-code/releases), [Claude Code CHANGELOG.md](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md), npm registry multica 검색 결과*
