## 🛸 스킬 발전 사항 일일 보고 — 2026년 7월 19일 KST

> **보고 주체**: Alien Agentic subagent-builder  
> **대상 이슈**: ALI-14 (Multica 이슈 ID: `0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7`)  
> **비고**: multica CLI / `MULTICA_TOKEN` 미설정 → GitHub reply.md 대체 보고 (7회 연속)

---

### 📡 최신 동향

#### Claude Code 릴리즈 현황 (2026-07-17 ~ 2026-07-19)

| 버전 | 일자 | 핵심 변경사항 |
|------|------|--------------|
| **v2.1.215** | 2026-07-19 (오늘) | `/verify`, `/code-review` 스킬 자동 실행 폐지 — 명시 호출 필수 |
| **v2.1.214** | 2026-07-18 (어제) | 권한 보안 7건 패치, `EndConversation` 도구 추가, OTel 강화 |
| **v2.1.212** | 2026-07-17 (이틀 전) | `/fork` 재설계(백그라운드 세션), `/subtask` 추가, 서브에이전트 캡 200, MCP 자동백그라운드 |
| v2.1.211 | 2026-07-15 | 직전 보고 기준선 |

---

#### v2.1.215 (오늘) — 🔴 스킬 관련 중요 변경

| 항목 | 내용 |
|------|------|
| 🚨 **`/verify` 자동 실행 폐지** | 에이전틱 실행 중 의도치 않은 자동 호출 방지 — 이제 `/verify` 명시 입력 필요 |
| 🚨 **`/code-review` 자동 실행 폐지** | 동일. 명시적 `/code-review` 호출 필수 |

> **영향**: Alien Agentic 자동화 워크플로에서 코드 변경 후 `/verify`/`/code-review`를 자동 트리거하던 설정이 있다면 **즉시 확인 필요**. 훅(hook)에서 이 스킬들을 호출하는 로직이 있으면 동작하지 않을 수 있음.

---

#### v2.1.214 (어제) — 보안 & 도구 강화

| 항목 | 내용 |
|------|------|
| 🔐 **권한 패치 7건** | `Edit(src/**)` 경로 탈출 버그, PowerShell 5.1 권한 우회, 10,000자 초과 Bash 명령어 오판, zsh 변수 subscript 오판, `help`/`man` 위험 옵션 자동 승인, docker 데몬-리디렉션 플래그 |
| 🛑 **`EndConversation` 도구 신규** | 남용·탈옥 시도 사용자와의 세션 종료 도구 — 에이전트 보안 레이어 강화 |
| 📦 **플러그인 로딩 버그 수정** | `--settings` CLI 플래그로 활성화한 플러그인이 로드 안 되던 버그 (v2.1.181 회귀) 수정 |
| 📊 **OTel 강화** | `message.uuid`, `client_request_id`, `tool_source` 속성 추가; Azure Monitor 411/400 오류 수정; `CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH` 환경변수 추가 |
| 🐛 **백그라운드 세션 데몬 버그** | 후계 세션 소켓 삭제 버그, `←` 파킹 시 프로세스 좀비 버그 수정 |
| 🪝 **훅 exit code 2 수정** | exit code 2가 문서대로 blocking하지 않던 버그 수정 |

---

#### v2.1.212 (이틀 전) — 🔴 에이전트 아키텍처 변화

| 항목 | 내용 |
|------|------|
| 🔀 **`/fork` 재설계** | 대화를 **새 백그라운드 세션**으로 복사 (`claude agents` 패널에 독립 행 생성). 이전 동작(인라인 서브에이전트)은 `/subtask`로 분리 |
| 📋 **`/resume` 피커** | 에이전트 뷰에서 과거 세션(삭제된 것 포함) 선택·재개 가능 |
| 🔢 **서브에이전트 스폰 캡** | 기본 200회/세션. `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` 환경변수로 조정. `/clear`로 초기화 |
| 🔍 **WebSearch 캡** | 기본 200회/세션. `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`으로 조정 |
| ⏱️ **MCP 자동 백그라운드** | MCP 도구 호출이 2분 초과 시 자동 백그라운드 전환. `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS`로 임계값 설정 |
| 🔄 **`claude auto-mode reset`** | 기본 auto-mode 설정 복원 명령어 추가 (`--yes`로 확인 생략) |
| 🔐 **plan mode 보안** | plan 모드에서 `touch`, `rm` 등 파일 수정 Bash 명령 자동 실행 버그 수정 |
| 💬 **SendMessage 토큰 절약** | 에이전트 간 메시지 히스토리 중복 삽입 버그 수정 → 에이전트 간 토큰 사용량 감소 |

---

### 🔍 현재 설치된 스킬 현황

#### brain180 프로젝트 레벨 (`.claude/skills/`)
- **없음** — 7월 19일 현재도 프로젝트 스킬 디렉토리 미구성 (3개월 연속 미이행)

#### 전역 스킬 (`~/.claude/skills/`)
- `session-start-hook` 1개

#### Claude Code 번들 스킬 (2026-07-19 기준 — 33개, 신규 추가 없음)

| 카테고리 | 스킬 목록 |
|---------|---------|
| 코드 품질 | `verify`, `code-review`, `simplify`, `security-review`, `review` |
| 콘텐츠 생성 | `dataviz`, `artifact-design`, `artifact-capabilities`, `web-artifacts-builder`, `algorithmic-art`, `canvas-design`, `theme-factory`, `slack-gif-creator` |
| 문서 처리 | `pdf`, `docx`, `xlsx`, `pptx`, `doc-coauthoring`, `internal-comms` |
| 개발 도구 | `run`, `init`, `update-config`, `keybindings-help`, `fewer-permission-prompts`, `loop`, `mcp-builder`, `skill-creator` |
| 학습/연구 | `deep-research`, `learn`, `claude-api`, `morning` |
| 기타 | `brand-guidelines`, `session-start-hook` |

> **v2.1.215 이후 `verify`, `code-review`는 자동 실행되지 않음 — 명시 호출 필요**

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| **`/verify`·`/code-review` 워크플로 수정** | 설정 검토 | 🔴 즉시 | v2.1.215에서 자동 실행 폐지. 기존 훅/자동화에서 이 스킬을 트리거했다면 명시 호출로 교체 필요 |
| **`brain180-analyze`** | 커스텀 프로젝트 스킬 | 🔴 긴급 | 3개월 연속 미이행. seeds/ 7개 파일 CognitiveMap 변환 워크플로 표준화 |
| **서브에이전트 캡 설정** | 환경변수 | 🔴 높음 | v2.1.212 신규 — 27인 에이전트 시스템 운영 시 기본값 200은 부족할 수 있음. `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` 조정 검토 |
| **`/fork` → `/subtask` 마이그레이션** | 워크플로 | 🔴 높음 | v2.1.212에서 `/fork` 의미 변경. 인라인 서브에이전트 용도였다면 `/subtask`로 교체 필요 |
| **`EndConversation` 통합** | 에이전트 보안 | 🟡 중간 | v2.1.214 신규 — 27인 에이전트 중 사용자 대면 에이전트에 남용 방어 레이어 추가 가능 |
| **MCP 자동백그라운드 임계값 설정** | 환경변수 | 🟡 중간 | v2.1.212 신규 — MCP 도구 기본 2분 후 자동 백그라운드. 워크플로에 따라 `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS` 조정 |
| **`cognitive-map-extractor`** | 커스텀 도메인 스킬 | 🟡 중간 | seeds/ 7개 파일을 CognitiveMap JSON으로 변환하는 스킬. 1M 토큰 컨텍스트(Sonnet 5)로 전체 처리 가능 |
| **`MULTICA_TOKEN` 설정** | 환경변수 | 🟡 중간 | 7회 연속 미이행. 1회 설정으로 이 보고 루틴 완전 자동화 달성 |

---

### 📋 오늘의 액션 아이템

1. **[즉시] `/verify`·`/code-review` 자동화 영향 점검**:
   - Alien Agentic 훅(hook) 설정에서 이 두 스킬을 자동 호출하는 로직 있는지 확인
   - 있으면 명시적 `/verify`, `/code-review` 호출로 교체

2. **[즉시] `/fork` → `/subtask` 마이그레이션 확인**:
   - v2.1.212에서 `/fork`는 이제 독립 백그라운드 세션 생성
   - 인라인 서브에이전트 분기 용도로 쓰던 곳은 `/subtask`로 교체

3. **[오늘] 서브에이전트 캡 조정**:
   ```bash
   export CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION=500  # 27인 시스템 여유
   export CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION=500
   ```

4. **[이번 주 — 3개월 연속 미이행]** `.claude/skills/` 생성:
   ```bash
   mkdir -p /home/user/brain180/.claude/skills/brain180-analyze
   ```
   seeds/ 7개 파일(공자·노자·손자·칸트·비트겐슈타인·포퍼·어린왕자)을 CognitiveMap JSON으로 변환하는 스킬 작성

5. **[이번 주] multica PAT 발급**:
   - `https://app.multica.ai/settings` → Personal Access Tokens
   - Claude Code 원격 세션에 `MULTICA_TOKEN` 환경변수 등록
   - 7회 연속 GitHub 대체 보고 → 완전 자동화

---

### ⚠️ 지속 리스크

| 항목 | 현황 | 조치 |
|------|------|------|
| **`/verify`·`/code-review` 자동화** | v2.1.215에서 자동 실행 폐지 🆕 | 훅/자동화 검토 즉시 필요 |
| **`/fork` 의미 변경** | v2.1.212에서 동작 완전 변경 🆕 | `/subtask` 마이그레이션 필요 |
| **서브에이전트 캡** | 기본 200회 — 27인 시스템에 부족할 수 있음 🆕 | 환경변수 조정 |
| multica 인증 | **미설정 7회 연속** | `MULTICA_TOKEN` 1회 설정으로 해결 |
| `.claude/skills/` 미생성 | **3개월 연속 미이행** | `mkdir -p .claude/skills/brain180-analyze` |

---

### 🔗 참고 자료

- [Claude Code Changelog](https://code.claude.com/docs/en/changelog)
- [v2.1.215 Release](https://github.com/anthropics/claude-code/releases/tag/v2.1.215)
- [v2.1.214 Release](https://github.com/anthropics/claude-code/releases/tag/v2.1.214)
- [v2.1.212 Release](https://github.com/anthropics/claude-code/releases/tag/v2.1.212)
- [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills)

---

_조사 소스: Claude Code Changelog v2.1.212~v2.1.215 (2026-07-17~07-19), 현재 세션 스킬 목록 직접 추출_
