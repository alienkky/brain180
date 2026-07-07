## 🛸 스킬 발전 사항 일일 보고 — 2026-07-07 KST

### 📡 최신 동향

**Claude Code 스킬 시스템 주요 업데이트 (2026년 7월 기준)**

1. **커맨드와 스킬 통합 완료** — `.claude/commands/*.md`와 `.claude/skills/*/SKILL.md`가 동일한 `/slash-command` 인터페이스로 통합됨. 기존 commands 파일은 그대로 동작하지만, 추가 기능(supporting files, frontmatter 제어)을 위해 skills 디렉토리 사용 권장 (v2.1.x)

2. **스킬 체이닝 지원** — `/skill-a /skill-b do XYZ` 형태로 최대 5개 스킬을 한 번에 로드 가능. 첫 번째만 로드되던 방식에서 개선됨 (v2.1.199+)

3. **신규 번들 스킬 추가**:
   - `/dataviz` — 차트/그래프/대시보드 디자인 가이드 스킬 (v2.1.198, 2026-06-30)
   - `/run` — 앱 실행 및 변경사항 검증 스킬 (v2.1.145)
   - `/verify` — 코드 변경이 실제로 동작하는지 앱을 구동해 검증 (v2.1.145)
   - `/simplify` — 버그 탐색 없이 코드 정리/단순화만 수행 (v2.1.154, `/code-review`에서 분리)

4. **`/reload-skills` 커맨드 추가** — 세션 재시작 없이 스킬 디렉토리 재스캔 (v2.1.152). `SessionStart` 훅에서 `reloadSkills: true` 반환 시 동일 세션 내 스킬 즉시 사용 가능

5. **스킬 frontmatter 신규 필드**:
   - `disallowed-tools`: 스킬 실행 중 특정 도구 비활성화 (v2.1.152)
   - `display-name` / `displayName`, `default-enabled` / `defaultEnabled`: kebab-case·snake_case·camelCase 모두 수용 (v2.1.186)
   - YAML 파싱 실패 시 조용히 무시하지 않고 빈 메타데이터로 로드 → 디버깅 용이 (v2.1.186)

6. **중첩 스킬 디렉토리 지원** (v2.1.178+):
   - 하위 `.claude/skills/` 디렉토리 작업 시 해당 스킬 자동 로드
   - 이름 충돌 시 `<dir>:<name>` 형태로 두 버전 모두 사용 가능

7. **플러그인 자동 로드** (v2.1.157):
   - `.claude/skills/` 디렉토리 플러그인이 마켓플레이스 없이 자동 로드
   - `claude plugin init <name>` 으로 새 플러그인 스캐폴딩
   - `/plugin` 설치 탭에 "Skills" 섹션 추가 (v2.1.186)

8. **Claude Sonnet 5 기본 모델 전환** — 1M 토큰 컨텍스트 (v2.1.197, 2026-06-30). 프로모션 가격 $2/$10 per Mtok (~ 2026-08-31)

9. **에이전트 시스템 강화**:
   - 백그라운드 에이전트: 코드 완료 시 자동 커밋·푸시·Draft PR 생성 (v2.1.198)
   - 서브에이전트 기본 백그라운드 실행 (v2.1.198)
   - 계층적 에이전트 스폰 최대 3단계 지원
   - `--attribution` 플래그로 에이전트별 토큰/비용 세부 추적

10. **`/review` vs `/code-review` 분리** (v2.1.202, 2026-07-06):
    - `/review <pr>`: 빠른 단일 패스 리뷰로 복귀
    - `/code-review <level> <pr#>`: 멀티 에이전트 심층 리뷰 (low/medium/high)

---

### 🔍 현재 설치된 스킬 현황

**brain180 프로젝트 (`.claude/skills/`)**: 없음

**개인 글로벌 스킬 (`~/.claude/skills/`)**:
- `session-start-hook` — SessionStart 훅 설정 스킬 (1개)

**`.claude/settings.local.json` 등록 스킬**: 없음 (permissions만 설정됨)

**번들 스킬 (Claude Code 기본 제공 — 이번 세션 활성)**:
| 스킬명 | 용도 |
|--------|------|
| `/claude-api` | Claude API 참조 및 코드 마이그레이션 |
| `/code-review` | 코드 리뷰 (버그 + 정리, effort 레벨 지원) |
| `/dataviz` | 차트/시각화 디자인 가이드 ⭐ v2.1.198 |
| `/deep-research` | 멀티소스 심층 조사 보고서 |
| `/fewer-permission-prompts` | 퍼미션 프롬프트 최소화 |
| `/loop` | 반복/스케줄 실행 |
| `/run` | 앱 구동 및 변경 검증 |
| `/verify` | 코드 변경 동작 end-to-end 검증 |
| `/simplify` | 코드 정리 전용 리뷰 |
| `/security-review` | 보안 취약점 분석 |
| `/review` | GitHub PR 빠른 리뷰 |
| `/init` | CLAUDE.md 초기화 |
| `/artifact-design` | 아티팩트 디자인 가이드 |
| `/update-config` | settings.json 설정 관리 |
| `/keybindings-help` | 키보드 단축키 커스터마이즈 |
| `/session-start-hook` | 세션 시작 훅 생성 |

**[참고] multica 내장 스킬** (`/opt/node22/lib/node_modules/multica/.agents/skills/`):
- `web-design-guidelines` — Vercel 웹 인터페이스 가이드라인 기반 UI 코드 리뷰

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `brain180-analyze` | 프로젝트 커스텀 | 🔴 높음 | 텍스트 → 뇌인지 구조 추출 워크플로 반복 실행용 (Brain180 핵심) |
| `cognitive-map-gen` | 프로젝트 커스텀 | 🔴 높음 | CognitiveMap JSON 생성 표준화, 스키마 검증 포함 |
| `web-design-guidelines` | 기존 스킬 이식 | 🟡 중간 | multica 내장 스킬을 brain180 `.claude/skills/`에 복사해 VisualLayer UI 리뷰 활용 |
| `genius-research` | 프로젝트 커스텀 | 🟡 중간 | `/deep-research` 기반 특정 천재 인지 패턴 조사 자동화 |
| `data-validate` | 프로젝트 커스텀 | 🟡 중간 | CLAUDE.md 체크리스트(하드코딩 금지, 레이어 분리 등) 자동 실행 |
| `subagent-daily-report` | 에이전트 자동화 | 🟡 중간 | 이 루틴 자체를 스킬로 공식화 + `/loop` 연동 |
| `layer-separation-check` | 프로젝트 커스텀 | 🟢 낮음 | TextLayer ↔ VisualLayer 크로스 의존 자동 감지 |
| `agent-cost-report` | 에이전트 운영 | 🟢 낮음 | `--attribution` 플래그 활용 27인 에이전트 토큰/비용 분석 |

**brain180에 즉시 적용 가능한 스킬 템플릿**:

```yaml
# .claude/skills/brain180-analyze/SKILL.md
---
name: brain180-analyze
description: >
  Brain180 분석 모드 실행 — 고전 텍스트에서 뇌인지 구조 추출 후
  CognitiveMap JSON 생성. 텍스트 분석, 새 천재 추가, 인지 패턴
  시각화 작업 시 자동 활성화.
disallowed-tools:
  - AskUserQuestion
---
```

**Alien Agentic 27인 에이전트 시스템 자동화 추천**:

```yaml
# ~/.claude/skills/subagent-daily-report/SKILL.md
---
name: subagent-daily-report
description: >
  매일 아침 subagent-builder 역할 수행 — 스킬 마켓플레이스 동향
  조사, 현황 파악, Multica 이슈 ALI-14 보고 자동화
disallowed-tools:
  - AskUserQuestion
---
```

---

### 📋 오늘의 액션 아이템

1. **[즉시]** brain180 프로젝트에 `.claude/skills/` 디렉토리 생성 및 프로젝트 전용 스킬 최소 2개 작성
   - `brain180-analyze` — 텍스트 분석 → CognitiveMap 생성 워크플로
   - `data-validate` — CLAUDE.md 체크리스트 자동 실행

2. **[즉시]** `session-start-hook` 업데이트: `reloadSkills: true` 반환 추가 (v2.1.152 신기능)으로 세션 시작 시 스킬 자동 리로드

3. **[이번 주]** multica `web-design-guidelines` 스킬을 brain180 `.claude/skills/`에 복사해 VisualLayer 컴포넌트 개발 시 UI 가이드라인 자동 체크

4. **[이번 주]** `subagent-daily-report` 스킬 작성 및 `/loop 24h` 연동으로 이 루틴 공식화

5. **[참고]** 스킬 체이닝 활용 — `/brain180-analyze /code-review` 형태로 분석 + 리뷰 동시 실행 가능

---

> **비고**: multica CLI가 이 환경(리모트 컨테이너)에서 설치 불가 (GitHub Releases API 및 multica.ai 네트워크 프록시 차단됨). 이 보고서는 brain180 리포 `reply.md`에 저장됨. 사용자가 로컬에서 `multica issue comment add 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7 --content-file ./reply.md` 명령으로 직접 제출 필요.

**조사 소스**: [Claude Code Changelog (code.claude.com)](https://code.claude.com/docs/en/changelog) · [GitHub Releases (anthropics/claude-code)](https://github.com/anthropics/claude-code/releases) · [claudefa.st changelog](https://claudefa.st/blog/guide/changelog)
