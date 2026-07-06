## 🛸 스킬 발전 사항 일일 보고 — 2026-07-06 KST

### 📡 최신 동향

**Claude Code 스킬 시스템 주요 업데이트 (2026년 상반기)**

1. **커맨드와 스킬 통합 완료** — `.claude/commands/*.md`와 `.claude/skills/*/SKILL.md`가 동일한 `/slash-command` 인터페이스로 통합됨. 기존 commands 파일은 그대로 동작하지만, 추가 기능(supporting files, frontmatter 제어)을 위해 skills 디렉토리 사용 권장 (v2.1.x)

2. **스킬 체이닝 지원** — `/skill-a /skill-b do XYZ` 형태로 최대 6개 스킬을 한 번에 로드 가능 (v2.1.199)

3. **신규 번들 스킬 추가**:
   - `/dataviz` — 차트/그래프/대시보드 디자인 가이드 스킬 (v2.1.198)
   - `/run` — 앱 실행 및 변경사항 검증 스킬 (v2.1.145)
   - `/verify` — 코드 변경이 실제로 동작하는지 앱을 구동해 검증 (v2.1.145)
   - `/run-skill-generator` — 프로젝트별 실행 레시피를 `.claude/skills/run-<name>/`에 저장 (v2.1.145)
   - `/simplify` — 버그 탐색 없이 코드 정리/단순화만 수행 (v2.1.154, `/code-review`에서 분리)

4. **`/reload-skills` 커맨드 추가** — 세션 재시작 없이 스킬 디렉토리 재스캔 (v2.1.152)

5. **스킬 frontmatter 신규 필드**:
   - `model`: 스킬 실행 시 모델 오버라이드
   - `effort`: 스킬 실행 시 추론 강도 설정 (`low`~`max`)
   - `hooks`: 스킬 라이프사이클에 훅 연결
   - `paths`: 특정 파일 경로에서만 스킬 자동 활성화
   - `disallowed-tools`: 스킬 실행 중 사용 불가 도구 지정
   - `disable-model-invocation`: 자동 호출 및 scheduled task 실행 방지 (v2.1.196)

6. **스킬 표준화** — Claude Code 스킬이 [Agent Skills](https://agentskills.io) 오픈 스탠다드 채택. 다른 AI 도구와 스킬 공유 가능

7. **스킬 마켓플레이스 확산** — 커뮤니티 스킬 30,000+개 이상 (claudeskills.info 등)

8. **Claude Sonnet 5 기본 모델 전환** — 1M 토큰 컨텍스트, 스킬 시스템과 통합 (v2.1.197)

9. **ultracode 레벨 추가** — `/effort ultracode` = xhigh 추론 + 자동 워크플로우 오케스트레이션

---

### 🔍 현재 설치된 스킬 현황

**brain180 프로젝트 (`.claude/skills/`)**: 없음

**개인 글로벌 스킬 (`~/.claude/skills/`)**:
- `session-start-hook` — SessionStart 훅 설정 스킬 (1개)

**`.claude/settings.local.json` 등록 스킬**: 없음 (permissions만 설정됨)

**번들 스킬 (Claude Code 기본 제공)**:
| 스킬명 | 용도 |
|--------|------|
| `/batch` | 코드베이스 대규모 병렬 변경 |
| `/claude-api` | Claude API 참조 및 코드 마이그레이션 |
| `/code-review` | 코드 리뷰 (버그 + 정리) |
| `/dataviz` | 차트/시각화 디자인 가이드 ⭐NEW |
| `/debug` | 디버그 로깅 분석 |
| `/design-sync` | React 디자인 시스템 업로드 |
| `/fewer-permission-prompts` | 퍼미션 프롬프트 최소화 |
| `/loop` | 반복/스케줄 실행 |
| `/run` | 앱 구동 및 변경 검증 ⭐NEW |
| `/run-skill-generator` | 프로젝트별 실행 레시피 생성 ⭐NEW |
| `/simplify` | 코드 정리 전용 리뷰 ⭐NEW |
| `/verify` | 코드 변경 동작 검증 ⭐NEW |
| `/security-review` | 보안 취약점 분석 |
| `/deep-research` | 멀티소스 조사 보고서 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `brain180-analyze` | 프로젝트 커스텀 | 🔴 높음 | 텍스트 → 뇌인지 구조 추출 워크플로 반복 실행용 |
| `cognitive-map-gen` | 프로젝트 커스텀 | 🔴 높음 | CognitiveMap JSON 생성 표준 절차화 |
| `genius-research` | 프로젝트 커스텀 | 🟡 중간 | `/deep-research` 기반 특정 천재 인지 패턴 조사 |
| `data-validate` | 프로젝트 커스텀 | 🟡 중간 | 콘텐츠 하드코딩 금지 규칙 준수 검증 (CLAUDE.md 체크리스트 자동화) |
| `/run-skill-generator` | 번들 (미사용) | 🟡 중간 | Vite dev 서버 기반 brain180 실행 레시피 생성 |
| `subagent-builder-daily` | 에이전트 자동화 | 🟡 중간 | 매일 아침 스킬 조사 루틴 공식 스킬화 (`/loop` 연동) |
| `layer-separation-check` | 프로젝트 커스텀 | 🟢 낮음 | TextLayer ↔ VisualLayer 크로스 의존 자동 감지 |
| `agent-cost-report` | 에이전트 운영 | 🟢 낮음 | `--attribution` 플래그 활용 27인 에이전트 비용 분석 |

**특히 brain180에 핵심인 스킬 제안**:

```markdown
# .claude/skills/brain180-analyze/SKILL.md
---
description: Brain180 분석 모드 실행 — 고전 텍스트에서 뇌인지 구조 추출 후 CognitiveMap JSON 생성. 텍스트 분석, 새 천재 추가, 인지 패턴 시각화 작업 시 자동 활성화.
allowed-tools: Read Write Glob Grep
---
```

**Alien Agentic 27인 에이전트 시스템 자동화 추천**:

```markdown
# .claude/skills/subagent-daily-report/SKILL.md
---
description: 매일 아침 subagent-builder 역할 수행 — 스킬 마켓플레이스 동향 조사, 현황 파악, Multica 이슈 보고 자동화
disable-model-invocation: true
context: fork
disallowed-tools: AskUserQuestion
---
```

---

### 📋 오늘의 액션 아이템

1. **[즉시]** brain180 프로젝트에 `.claude/skills/` 디렉토리 생성 및 프로젝트 전용 스킬 최소 2개 작성
   - `brain180-analyze` — 텍스트 분석 → CognitiveMap 생성 워크플로
   - `data-validate` — CLAUDE.md 체크리스트 자동 실행

2. **[즉시]** `/run-skill-generator` 실행하여 Vite 개발 서버 실행 레시피 `.claude/skills/run-brain180/` 에 저장

3. **[이번 주]** 개인 글로벌 스킬(`~/.claude/skills/`)에 `subagent-daily-report` 스킬 작성 및 `/loop` 연동으로 이 루틴 공식화

4. **[참고]** `disallowed-tools: AskUserQuestion` frontmatter 활용 → 백그라운드 루틴 스킬에서 대화 중단 방지

5. **[참고]** 스킬 체이닝 기능 활용 — `/brain180-analyze /code-review` 형태로 분석 + 리뷰 동시 실행 가능

---

> **비고**: multica CLI가 이 환경(리모트 컨테이너)에서 설치 불가 (GitHub releases 및 multica.ai 네트워크 차단됨). 이 보고서는 brain180 리포에 저장되었으며, 사용자가 로컬에서 `multica issue comment add 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7 --content-file ./reply.md` 명령으로 제출 필요.

**조사 소스**: [Claude Code Skills Docs](https://code.claude.com/docs/en/skills) · [Commands Reference](https://code.claude.com/docs/en/commands) · [Claude Code Changelog](https://claudefa.st/blog/guide/changelog) · [Skills Marketplaces](https://claudeskills.info/skills/)
