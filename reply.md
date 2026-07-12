## 🛸 스킬 발전 사항 일일 보고 — 2026년 7월 9일 KST

> **보고 주체**: Alien Agentic subagent-builder  
> **대상 이슈**: ALI-14 (Multica 이슈 ID: `0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7`)  
> **비고**: multica CLI가 이 원격 컨테이너 환경에서 설치 불가 (네트워크 프록시 차단). brain180 리포 `reply.md`에 저장. 사용자가 로컬에서 `multica issue comment add 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7 --content-file ./reply.md` 명령으로 직접 제출 필요.

---

### 📡 최신 동향

#### Claude Code 릴리즈 현황 (2026-07-07 ~ 2026-07-09 KST)

| 버전 | 일자 | 상태 |
|------|------|------|
| **v2.1.205** | 2026-07-08 21:22 UTC | 🔴 최신 — 대규모 버그픽스 + `/doctor` 번들 스킬 승격 |
| **v2.1.204** | 2026-07-08 00:27 UTC | SessionStart 훅 headless 실행 버그픽스 |
| v2.1.203 | 2026-07-07 (이전 보고 기준선) | 백그라운드 에이전트 안정성 30개+ 수정 |

**현재 설치 버전**: `claude 2.1.205` ✅ (최신)

---

#### v2.1.205 주요 변경사항 (2026-07-08)

**🔐 보안 강화**
- Auto 모드: 세션 트랜스크립트 파일 변조 차단 규칙 추가
- 백그라운드 작업 알림에 "인간의 승인이 없었음" 명시 (가짜 승인 방지)
- Auto 모드: 컨텍스트 분석 불가 변수에 `rm -rf` 실행 시 사전 확인 요청

**🩺 `/doctor` 번들 스킬 승격**
- `/doctor`가 단순 진단에서 **전체 설정 점검 및 수정 도구**로 승격됨
- `/checkup` 별칭 추가
- v2.1.205부터 **번들 스킬로 전환** — `disableBundledSkills` 설정의 예외 대상
- `DISABLE_DOCTOR_COMMAND` 환경변수 또는 `skillOverrides: {"doctor": "off"}`로 개별 비활성화 가능

**🌐 MCP 업데이트**
- "Claude Browser" 및 "Claude Preview" MCP 서버 이름 예약됨 (사용자 정의 서버에서 이 이름 사용 불가)
- `claude mcp add-from-claude-desktop`: 지원되지 않는 문자 포함 서버 이름 처리 개선 (중단 → 오류 보고 후 계속)
- 플러그인 LSP 서버 초기화 실패 시 동일 확장자 처리 다른 서버 차단 문제 수정

**🤖 에이전트 뷰 개선**
- PR 편집/병합/댓글/푸시한 세션이 `claude agents`에서 링크됨
- 에이전트 뷰 행에 컬러 상태 단어 + 분류기 헤드라인 표시 (기존: raw 툴 콜 텍스트)
- 백그라운드 작업 Remote Control 웹/모바일 패널 "Running" 상태 장기 표시 문제 수정

**⚡ 성능**
- 자동 업데이트 바이너리: 메모리 버퍼링 → 디스크 스트리밍 전환 → **피크 메모리 약 400MB 절감**

**🔧 비대화형 모드 지원 확장**
- `/color`, `/effort`, `/model`, `/rename` 명령어가 비대화형(headless) 모드에서 동작

**🐛 스킬 관련 버그픽스**
- **Project verify skills**: 명령어 변경 없이 매 세션마다 재작성되던 문제 수정 ← brain180에 직접 영향
- `--json-schema`에 잘못된 스키마 전달 시 비구조적 출력 생성 문제 수정
- `format` 키워드 사용 스키마 거부 문제 수정

---

#### v2.1.204 (2026-07-08 새벽)

- **단일 버그픽스**: headless 세션의 SessionStart 훅 실행 중 훅 이벤트가 스트리밍되지 않던 문제 수정 (원격 워커가 훅 실행 중 유휴 상태로 회수되는 현상 방지) ← **뇌180 원격 세션에 직접 영향**

---

#### 번들 스킬 전체 현황 업데이트 (v2.1.205 기준)

지난 보고 대비 **신규 발견** 스킬 2개:

| 스킬 | 추가 시점 | 설명 |
|------|-----------|------|
| **`/doctor`** | v2.1.205 (번들 승격) | 설정 진단 + 수정 도구. `/checkup` 별칭 |
| **`/design-sync`** | 공식 문서 확인 | React 디자인 시스템 → Claude Design 업로드 변환 |
| **`/schedule`** | 공식 문서 확인 | Anthropic 관리 클라우드 루틴 생성. `/routines` 별칭 |

---

#### 스킬 Frontmatter 신규 필드 (v2.1.205 기준 전체 목록)

지난 보고 대비 **신규 확인** 필드:

| 필드 | 설명 | 비고 |
|------|------|------|
| `hooks` | 스킬 라이프사이클에 스코프된 훅 | **신규 확인** |
| `shell` | 인라인 `!` 블록에 사용할 셸 (`bash`/`powershell`) | **신규 확인** |
| `paths` | 스킬 자동 활성화 파일 패턴 (glob) | 이전 보고에서 언급됨 |
| `argument-hint` | 자동완성 인수 힌트 (`[issue-number]` 등) | **신규 확인** |
| `arguments` | `$name` 대체용 위치 기반 명명 인수 | **신규 확인** |
| `model` | 스킬 활성화 중 모델 오버라이드 | 이전 보고에서 언급됨 |
| `effort` | 스킬 effort 레벨 오버라이드 | 이전 보고에서 언급됨 |
| `context` + `agent` | `fork` 시 서브에이전트 유형 지정 | 이전 보고에서 언급됨 |

`description` + `when_to_use` 합산 **1,536자 상한** 확인됨.

---

### 🔍 현재 설치된 스킬 현황 (brain180 / alienkky)

**프로젝트 레벨 (`brain180/.claude/skills/`)**: 없음 ⚠️ (6회 연속 미이행)

**사용자 글로벌 (`~/.claude/skills/`)**:

| 스킬명 | 설명 |
|--------|------|
| `session-start-hook` | 웹 세션 SessionStart 훅 생성/개발용 |

**번들 스킬 (이번 세션 활성, v2.1.205 기준)**:

| 스킬명 | 용도 |
|--------|------|
| `/doctor` | 설정 진단 + 수정 ⭐ **v2.1.205 번들 신규** |
| `/code-review` | 코드 리뷰 (버그+정리, `ultra` 클라우드 옵션 포함) |
| `/dataviz` | 차트/시각화 디자인 가이드 |
| `/deep-research` | 멀티소스 팩트체크 심층 리서치 |
| `/design-sync` | React 디자인 시스템 → Claude Design 변환 ⭐ 신규 확인 |
| `/schedule` | Anthropic 관리 루틴 생성 (`/routines` 별칭) ⭐ 신규 확인 |
| `/run` | 앱 실행 및 변경사항 검증 |
| `/run-skill-generator` | `/run`/`/verify` 레시피 생성 |
| `/verify` | end-to-end 코드 변경 동작 확인 |
| `/simplify` | 코드 정리 전용 |
| `/batch` | 병렬 대규모 변경 오케스트레이션 |
| `/debug` | 디버그 로깅 및 런타임 분석 |
| `/loop` | 반복/스케줄 실행 (`/proactive` 별칭) |
| `/fewer-permission-prompts` | 권한 프롬프트 자동 허용 설정 |
| `/security-review` | 보안 취약점 분석 |
| `/review` | GitHub PR 빠른 단일 패스 리뷰 |
| `/init` | CLAUDE.md 초기화 |
| `/artifact-design` | 아티팩트 디자인 가이드 |
| `/update-config` | settings.json 설정 관리 |
| `/keybindings-help` | 키보드 단축키 커스터마이즈 |
| `/session-start-hook` | 세션 시작 훅 생성 |
| `/claude-api` | Claude API 레퍼런스 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| **프로젝트 스킬 디렉토리 생성** | 인프라 | 🔴 긴급 (6회 연속) | `mkdir -p .claude/skills/brain180-analyze` 1줄로 해결. v2.1.205 버그픽스로 verify 스킬이 매 세션 재작성 문제 해결됨 — 지금이 적기 |
| `brain180-analyze` | 신규 프로젝트 스킬 | 🔴 높음 | 텍스트 → CognitiveMap 추출 워크플로. `paths: seeds/**,src/data/**` + `effort: high` + `context: fork` + `hooks` 필드 활용 |
| `data-validate` | 신규 프로젝트 스킬 | 🔴 높음 | CLAUDE.md 커밋 전 grep 체크리스트 4개 자동 실행. `disable-model-invocation: true` + `argument-hint: [파일경로]` |
| `/doctor` 활용 | 기존 번들 스킬 | 🟡 중간 | brain180 `.claude/settings.json` 설정 오류 즉시 진단 가능. `skillOverrides: {"doctor": "off"}` 옵션도 파악해 둘 것 |
| `/schedule` 활용 | 기존 번들 스킬 | 🟡 중간 | 이 daily-report 루틴을 `/schedule` + Anthropic 관리 클라우드로 공식화. multica PAT 미해결 우회책으로도 유용 |
| `genius-research` | 신규 프로젝트 스킬 | 🟡 중간 | `/deep-research` 기반. `argument-hint: [천재이름]` 필드로 특정 인물 지정. brain180 텍스트 씨앗(seeds/) 확장 자동화 |
| `agent-hooks` 패턴 | 신규 스킬 설계 | 🟡 중간 | `hooks` frontmatter 필드(v2.1.205)를 활용해 brain180-analyze 완료 후 자동 커밋 훅 연결 |
| `subagent-daily-report` | 글로벌 스킬 | 🟢 낮음 | 이 루틴 자체를 `~/.claude/skills/`에 공식화 + `/schedule` 연동 |
| `layer-separation-check` | 신규 프로젝트 스킬 | 🟢 낮음 | TextLayer ↔ VisualLayer 크로스 의존 자동 감지. `paths: src/components/**` + `disable-model-invocation: true` |

---

### 📋 오늘의 액션 아이템

1. **[긴급 — 6회 연속]** brain180 프로젝트 스킬 디렉토리 생성:
   ```bash
   mkdir -p /home/user/brain180/.claude/skills/brain180-analyze
   mkdir -p /home/user/brain180/.claude/skills/data-validate
   ```
   > v2.1.205에서 verify 스킬 불필요 재작성 버그 수정 완료 — 이제 프로젝트 스킬을 만들면 안정적으로 유지됨.

2. **[HIGH]** `brain180-analyze` SKILL.md 작성 (신규 frontmatter 활용):
   ```yaml
   ---
   name: brain180-analyze
   description: >
     Brain180 분석 모드 — seeds/ 또는 src/data/의 고전 텍스트에서
     뇌인지 구조 추출 후 CognitiveMap JSON 생성.
     새 천재 텍스트 추가, 패턴 시각화 작업 시 자동 활성화.
   paths:
     - seeds/**
     - src/data/**
   effort: high
   context: fork
   hooks:
     PostToolUse:
       - matcher: "Write"
         command: "git add src/data/ && git diff --cached --quiet || git commit -m 'auto: CognitiveMap 업데이트'"
   ---
   ```

3. **[HIGH]** `/doctor` 즉시 실행하여 brain180 `.claude/` 설정 진단:
   - 현재 `settings.local.json`의 오래된 경로 참조 (`/e/bettermondaynodesystem`) 정리 가능 여부 확인

4. **[MEDIUM]** `/schedule` 스킬 탐색:
   - `multica issue comment add` 대체 방안으로 Anthropic 관리 클라우드 루틴 활용 가능 여부 확인
   - multica PAT 미해결 상황의 우회책이 될 수 있음

5. **[MEDIUM]** `session-start-hook` 업데이트 확인:
   - v2.1.204에서 headless SessionStart 훅 스트리밍 버그 수정 완료
   - 현재 `~/.claude/skills/session-start-hook/SKILL.md`가 최신 환경변수(`$CLAUDE_CODE_REMOTE`) 지원 여부 확인

---

### ⚠️ 지속 리스크

| 항목 | 현황 | 조치 |
|------|------|------|
| multica 인증 | **6회 연속** 미설정. CLI 원격 설치 불가 (프록시 차단) | 로컬에서 `multica issue comment add 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7 --content-file ./reply.md` 직접 실행 |
| `.claude/skills/` 미생성 | **6회 연속** 미이행 | `mkdir -p .claude/skills/brain180-analyze` 1줄로 즉시 해결 |
| `settings.local.json` 오래된 경로 | `/e/bettermondaynodesystem` 참조 잔존 | `/doctor` 실행으로 자동 진단 가능 |

---

### 🔗 참고 자료

- [Claude Code Changelog](https://code.claude.com/docs/en/changelog)
- [Claude Code GitHub Releases — v2.1.205](https://github.com/anthropics/claude-code/releases/tag/2.1.205)
- [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills)
- [Multica CLI GitHub](https://github.com/multica-ai/multica)
