## 🛸 스킬 발전 사항 일일 보고 — 2026-07-29 KST

> **보고 주체**: Alien Agentic subagent-builder  
> **대상 이슈**: ALI-14 (Multica 이슈 ID: `0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7`)  
> **비고**: multica CLI 미설치 (`@multica/cli` npm 404 오류, GitHub Releases 프록시 차단) — **6회 연속** 이슈 직접 코멘트 불가. GitHub 파일 커밋으로 대체 보고.

---

### 📡 최신 동향

#### Claude Code 릴리즈 현황 (2026-07-24 ~ 2026-07-29)

| 버전 | 일자 | 주요 내용 |
|------|------|----------|
| **v2.1.220** | 2026-07-25 | 버그 수정 및 안정성 개선 |
| **v2.1.219** | 2026-07-24 | Claude Opus 5 기본 모델 전환, 보안 강화 (지난 보고 기준선) |

#### 스킬 관련 주요 변경사항 (이번 주 확인)

**1. `/verify` 및 `/code-review` 자동 실행 중단 (v2.1.215 이후)**
- Claude가 자체 판단으로 `/verify`, `/code-review`를 실행하던 동작이 제거됨
- 이제 사용자가 명시적으로 호출해야만 실행 → 토큰·시간 소비를 사용자가 통제
- Brain180 워크플로에서 리뷰 트리거 명시화 필요

**2. `/doctor` 번들 스킬 전환 (v2.1.205 이후)**
- `/doctor`가 기존 내장 커맨드에서 번들 스킬로 전환
- `disableBundledSkills` 설정 시에도 `/doctor`는 유지됨
- 완전히 숨기려면 `DISABLE_DOCTOR_COMMAND` 환경변수 또는 `skillOverrides: {"doctor": "off"}` 설정 필요

**3. 중요 발견: 클라우드 루틴과 스킬 로딩 규칙**
- **이 자동화 태스크(루틴)는 클라우드 세션으로 실행됨**
- 클라우드/Cowork 세션은 `~/.claude/skills/`를 읽지 않음
- 루틴에서 스킬을 사용하려면 반드시:
  - ① 리포지터리 `.claude/skills/`에 커밋, 또는
  - ② claude.ai 계정 설정에서 스킬 활성화
- Brain180 `.claude/skills/` 미존재 → 커스텀 스킬 **전혀 로드되지 않음** ← 6회 연속 미해결

**4. 중첩 `.claude/skills/` 디렉토리 지원 (v2.1.203 이후)**
- 모노레포 서브패키지별 스킬 가능: `apps/web/.claude/skills/deploy/SKILL.md`
- 네임스페이스: `apps/web:deploy`로 명시적 호출 가능
- Claude가 해당 서브디렉토리 파일 편집 시 자동 로드

**5. 스킬 라이브 감지 (Live Change Detection)**
- `~/.claude/skills/`, `.claude/skills/` 파일 변경 시 세션 재시작 없이 즉시 반영
- 단, 최초 스킬 디렉토리 생성 시에는 재시작 필요

**6. `dataviz` 스킬 업데이트**
- 번들 dataviz 스킬의 색상 팔레트 개선 (v2.1.219)

**7. `claude-api` 스킬 기본 모델 변경**
- Claude Opus 5 (`claude-opus-5`)가 기본 모델로 변경
- Opus 4.8에서 마이그레이션 경로 제공

**8. `DirectoryAdded` 훅 추가**
- `/add-dir` 또는 SDK `register_repo_root` 실행 후 훅 트리거 가능
- Brain180 다중 디렉토리 작업 시 자동 스킬 로드에 활용 가능

---

### 🔍 현재 설치된 스킬 현황 (brain180 / alienkky)

**프로젝트 레벨 (brain180/.claude/):**
- 스킬 **없음** — `.claude/skills/` 디렉토리 미존재 (**6회 연속 미해결**)
- `settings.local.json`: 일부 Bash/Read 허용 퍼미션만 존재
- `launch.json`: Vite 개발 서버 설정만

**사용자 전역 레벨 (claude.ai 계정 활성화 스킬):**

이번 세션에서 로드된 스킬 목록 (클라우드 루틴 기준):

| 카테고리 | 스킬 |
|---------|------|
| 인프라 | `session-start-hook`, `update-config`, `fewer-permission-prompts`, `init` |
| 코드 품질 | `simplify`, `review`, `security-review`, `code-review` |
| 시각화·UI | `dataviz`, `artifact-design`, `artifact-capabilities`, `web-artifacts-builder` |
| 자동화 | `loop`, `run`, `morning` |
| 참조 | `claude-api`, `learn`, `doc-coauthoring` |
| 스킬 개발 | `skill-creator` |
| 디자인 | `theme-factory`, `brand-guidelines`, `canvas-design`, `algorithmic-art` |
| MCP | `mcp-builder` |
| 커뮤니케이션 | `internal-comms`, `slack-gif-creator` |
| 오피스 문서 | `xlsx`, `pptx`, `pdf`, `docx` |
| 단축키 | `keybindings-help` |

**번들 스킬 (Claude Code 내장, v2.1.220 기준):**

| 스킬 | 특이사항 |
|------|---------|
| `/run`, `/verify`, `/run-skill-generator` | v2.1.215부터 자동 실행 안 됨 |
| `/code-review` | v2.1.215부터 자동 실행 안 됨 (토큰 25% 절감) |
| `/doctor` | v2.1.205부터 번들 스킬 전환 |
| `/batch` | 대규모 병렬 코드 변경 |
| `/debug` | 디버그 로깅 및 세션 분석 |
| `/loop` | 반복 스케줄링 |
| `/claude-api` | 현재 Opus 5 기본 |
| `/init` | CLAUDE.md 초기화 |
| `/deep-research` | 멀티소스 팩트체크 리서치 워크플로 |
| `/simplify`, `/security-review`, `/review` | 코드 품질 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| **multica PAT 등록** | 인프라 | 🔴 긴급 (6회 연속) | `MULTICA_TOKEN` 환경변수 없음 → 이슈 직접 보고 불가. PAT 발급 및 Claude Code 원격 세션 환경변수 등록 1회면 해결 |
| **`.claude/skills/` 디렉토리 생성** | 인프라 | 🔴 긴급 (6회 연속) | 클라우드 루틴은 계정 스킬 + 리포 `.claude/skills/`만 로드. 커스텀 스킬 사용 불가 상태 지속 |
| `component-checker` | 신규 프로젝트 스킬 | 🔴 높음 | CLAUDE.md 커밋 전 grep 체크리스트 4개 자동화. `disable-model-invocation: true` 설정 |
| `brain180-visualize` | 신규 프로젝트 스킬 | 🔴 높음 | 텍스트 → CognitiveMap 분석 워크플로. Opus 5의 1M 컨텍스트로 전체 코퍼스 처리 가능 |
| `why-how-what` | 신규 글로벌 스킬 | 🟠 높음 | Alien Agentic 핵심 3단계 분석 템플릿. `effort: high` + `context: fork` 설정 |
| `multica-reporter` | 신규 프로젝트 스킬 | 🟠 높음 | 이 보고서 생성 프로세스 스킬화. PAT 환경변수 체크 로직 포함 |
| `agent-dispatch` | 신규 글로벌 스킬 | 🟡 중간 | 27명 에이전트 라우팅 로직 스킬화. `user-invocable: false` 설정으로 Claude 자동 호출 |
| `run-skill-generator` 실행 | 번들 스킬 활용 | 🟡 중간 | `/run-skill-generator`로 brain180 Vite+Node.js 레시피 `.claude/skills/run-brain180/`에 기록 |
| `DirectoryAdded` 훅 연동 | 훅 신규 활용 | 🟢 낮음 | `/add-dir` 실행 시 자동으로 해당 디렉토리 스킬 로드 훅 작성 |

---

### 📋 오늘의 액션 아이템

1. **[긴급 — 6회 연속]** Multica PAT 등록:
   ```
   Multica 웹 → Settings → Personal Access Tokens → 토큰 생성
   Claude Code 원격 세션 환경변수: MULTICA_TOKEN=mul_YOUR_TOKEN
   ```

2. **[긴급 — 6회 연속]** Brain180 프로젝트 스킬 기반 구축:
   ```bash
   mkdir -p /home/user/brain180/.claude/skills/component-checker
   # SKILL.md 작성 후 git commit -m "add: component-checker skill"
   # git push → 다음 루틴 세션부터 자동 로드
   ```

3. **[높음]** `/run-skill-generator` 실행으로 Brain180 빌드 레시피 기록:
   - Vite 5173 포트, Node.js 백엔드 설정 자동 캡처
   - `.claude/skills/run-brain180/SKILL.md`로 커밋

4. **[높음]** `brain180-visualize` 스킬 초안 작성:
   - CognitiveNode/CognitiveEdge 스키마 기반 분석 플로우
   - Opus 5 1M 컨텍스트 활용

5. **[중간]** `/verify`, `/code-review` 명시적 호출 워크플로 반영:
   - 자동 실행이 제거됨 → CLAUDE.md에 "PR 전 `/code-review` 호출" 명기
   - brain180 CI에 통합 고려

6. **[중간]** `DirectoryAdded` 훅 테스트:
   - Brain180에서 `/add-dir src/data` 실행 시 자동 스킬 로드 동작 확인

---

### ⚠️ 지속 리스크

| 항목 | 현황 | 해결 방법 |
|------|------|---------|
| multica CLI 인증 | **6회 연속** 미설정, npm 패키지 없음 | PAT 발급 + 환경변수 등록 |
| `.claude/skills/` 미생성 | **6회 연속** 미이행 | `mkdir -p .claude/skills/` 후 커밋 |
| 클라우드 루틴 스킬 격리 | 루틴은 계정 스킬만 로드 | 커스텀 스킬을 리포에 커밋해야 함 |

---

### 🔗 참고 자료

- [Claude Code Changelog (공식)](https://code.claude.com/docs/en/changelog)
- [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills)
- [Cloud Sessions 스킬 로딩 규칙](https://code.claude.com/docs/en/skills#skills-in-cowork-and-cloud-sessions)
- [Claude Code v2.1.220 릴리즈](https://www.havoptic.com/tools/claude-code)
- [AgentSkills.io 오픈 스탠더드](https://agentskills.io)

---
_자동 생성: Alien Agentic subagent-builder | Claude Code 스케줄 태스크 | 2026-07-29_
