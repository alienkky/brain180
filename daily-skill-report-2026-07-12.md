## 🛸 스킬 발전 사항 일일 보고 — 2026-07-12 KST

> **보고 주체**: Alien Agentic subagent-builder
> **대상 이슈**: ALI-14 (Multica 이슈 ID: `0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7`)
> **비고**: multica CLI 이번 세션에서도 미설치 (네트워크 프록시 차단). GitHub `reply.md` 대체 보고. 사용자가 로컬에서 `multica issue comment add 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7 --content-file ./reply.md` 실행 필요.

---

### 📡 최신 동향

#### Claude Code 릴리즈 현황 (2026-07-07 ~ 2026-07-12)

이번 주 5일간 **6개 버전**이 연속 배포됨 — 특히 v2.1.206의 **데스크탑 내장 브라우저**와 v2.1.207의 **Opus 4.8 기본 모델 전환**이 주목.

| 버전 | 일자 | 핵심 변경 |
|------|------|----------|
| **v2.1.207** | 2026-07-11 | Opus 4.8 기본모델 (Bedrock/Vertex/AWS), Auto Mode 기본 활성화, 터미널 프리징 수정 |
| **v2.1.206** | 2026-07-10 | ⭐ **데스크탑 내장 브라우저** 탑재, `/doctor` 진단+수정 기능 강화, `/cd` 경로 자동완성 |
| **v2.1.205** | 2026-07-08 | Auto Mode 보안 규칙 추가, 에이전트 뷰 UI 개선, 워크트리 수정 |
| **v2.1.204** | 2026-07-08 | SessionStart 훅 헤드리스 세션 스트리밍 수정 |
| **v2.1.203** | 2026-07-07 | 로그인 만료 경고, MCP 루트 디렉토리 개선, 서브에이전트 재위임 방지 |

---

#### 🌐 v2.1.206 하이라이트: 데스크탑 내장 브라우저 (2026-07-10)

> "Claude Code on desktop now has a built-in browser."

- Claude가 문서, 디자인, 외부 사이트를 직접 열어 **읽기·클릭·상호작용** 가능
- 로컬 dev server 미리보기와 동일한 방식으로 외부 페이지 탐색
- **샌드박스 격리** + 안전 분류기(safety classifier)가 외부 사이트 액션 검토
- 브라우징 세션 지속 여부는 사용자가 설정 가능
- **[가설]** Brain180 VisualLayer 개발 시 D3.js 공식 문서, Cytoscape.js 예제를 Claude가 직접 참조하여 코드 생성 가능해질 전망

#### 🏥 `/doctor` → `/checkup` 업그레이드 (v2.1.205-206)

| 이전 | 이후 |
|------|------|
| 읽기 전용 상태 보고 | 진단 **+ 자동 수정** |
| 설치 상태 체크만 | 미사용 스킬·MCP·플러그인 vs 컨텍스트 비용 분석 |
| — | 체크인된 CLAUDE.md 파일 중복 제거 및 슬림화 제안 |
| — | `/checkup` 별칭 추가 |

#### 🤖 v2.1.207 주요 변경

| 항목 | 내용 |
|------|------|
| **기본 모델 전환** | Bedrock, Vertex, Claude Platform on AWS → **Claude Opus 4.8** |
| **Auto Mode** | Bedrock/Vertex/Foundry에서 opt-in 없이 기본 활성화 (`CLAUDE_CODE_ENABLE_AUTO_MODE` 불필요) |
| **Auto Mode 설정** | `.claude/settings.local.json` → `~/.claude/settings.json`으로 이동 (프로젝트 레벨 무시) |
| **플러그인 보안** | `${user_config.*}` shell-form 명령어에서 사용 차단 (셸 인젝션 방어) |
| **에이전트 팀** | 멀포메드 mailbox 메시지로 인한 크래시 루프 수정 |
| **/code-review** | Opus 4.8에서 전 effort 레벨 리뷰 품질 개선 |

#### 📡 v2.1.203 서브에이전트 개선 (2026-07-07)

- **서브에이전트 재위임 방지**: 에이전트가 전체 태스크를 다른 서브에이전트에 재위임하는 현상 감소
- **바이너리 최적화**: 크기 ~7MB, 시작 메모리 ~7MB 감소 (의존성 지연 로딩)
- **MCP 루트 통합**: 세션의 추가 작업 디렉토리를 MCP `roots/list`에 포함 + `notifications/roots/list_changed` 전송

---

### 🔍 현재 설치된 스킬 현황 (brain180 / alienkky)

**프로젝트 레벨 (brain180/.claude/):**
- 스킬 **없음** — `.claude/skills/` 디렉토리 미존재 (**7회 연속 미해결**)
- `settings.local.json`: 일부 Bash 허용 퍼미션만 존재
- `launch.json`: Vite 개발 서버 설정만

**사용자 전역 레벨 (~/.claude/skills/):**
| 스킬명 | 설명 |
|--------|------|
| `session-start-hook` | 웹 세션의 SessionStart 훅 생성/개발용 스킬 |

**번들 스킬 (Claude Code 내장, 이번 세션 활성 목록):**

| 스킬 | 용도 | 특이사항 |
|------|------|---------|
| `/session-start-hook` | SessionStart 훅 설정 | |
| `/deep-research` | 멀티소스 팩트체크 리서치 | |
| `/update-config` | settings.json 구성 업데이트 | |
| `/keybindings-help` | 키바인딩 커스터마이즈 | |
| `/verify` | 코드 변경사항 앱 실행 검증 | |
| `/code-review` | 코드 리뷰 (Opus 4.8에서 품질 향상) | v2.1.207 개선 |
| `/simplify` | 코드 단순화 리팩토링 | |
| `/fewer-permission-prompts` | 권한 프롬프트 자동 허용 설정 | |
| `/loop` | 반복 실행 스케줄링 | |
| `/claude-api` | Claude/Anthropic API 레퍼런스 | |
| `/run` | 앱 실행 및 확인 | |
| `/init` | CLAUDE.md 초기화 | |
| `/review` | GitHub PR 리뷰 | |
| `/security-review` | 보안 리뷰 | |
| `/dataviz` | 차트/시각화 디자인 가이드 | |
| `/artifact-design` | 아티팩트 디자인 가이드 | |

**변경 감지**: 지난 보고(06-30) 대비 `/run-skill-generator`, `/batch`, `/debug` 미확인 — 번들 제거 또는 이름 변경 [가설]

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| **multica PAT 등록** | 인프라 | 🔴 긴급 (7회 연속) | `mul_...` PAT 환경변수 `MULTICA_PAT` 등록 시 이슈 직접 코멘트 가능 |
| **`/doctor` 활용** | 즉시 활용 | 🔴 높음 (신규) | v2.1.206 업그레이드로 brain180 미사용 스킬·MCP 비용 자동 진단+수정 가능 — 즉시 실행 권장 |
| `component-checker` | 신규 프로젝트 스킬 | 🔴 높음 (7회 연속) | CLAUDE.md 커밋 전 grep 체크리스트 4개 자동 실행 |
| `brain180-visualize` | 신규 프로젝트 스킬 | 🔴 높음 (7회 연속) | 텍스트 → CognitiveMap 분석. 이제 내장 브라우저로 D3.js/Cytoscape 문서 실시간 참조 가능 |
| **Auto Mode 정책 업데이트** | 설정 | 🟡 중간 (신규) | v2.1.207: Auto Mode 설정이 `.claude/settings.local.json`에서 `~/.claude/settings.json`으로 이동. 기존 설정 확인 필요 |
| `browser-research` | 신규 프로젝트 스킬 | 🟡 중간 (신규) | 내장 브라우저 활용 — 고전 텍스트 원본 소스, 철학 사전, 과학 백과 자동 탐색 스킬 |
| `why-how-what` | 신규 글로벌 스킬 | 🟡 중간 (5회 연속) | Alien Agentic 핵심 3단계 분석 템플릿. `effort: high` + `context: fork` |
| `agent-dispatch` | 신규 글로벌 스킬 | 🟡 중간 (5회 연속) | 27명 에이전트 라우팅 로직. `user-invocable: false` |
| **플러그인 보안 점검** | 보안 | 🟢 낮음 (신규) | v2.1.207: `${user_config.*}` 사용 플러그인 있으면 업데이트 필요 |

---

### 📋 오늘의 액션 아이템

1. **[긴급 — 7회 연속]** Multica Settings → Personal Access Tokens에서 `mul_...` PAT 발급
   → Claude Code 원격 세션 환경변수 `MULTICA_PAT`로 등록
   → `multica login --token $MULTICA_PAT` 실행으로 이슈 직접 코멘트 가능

2. **[HIGH — 신규]** 내장 브라우저 활성화 테스트 (데스크탑 Claude Code v2.1.206+):
   - D3.js 공식 예제, Cytoscape.js 레이아웃 문서 직접 탐색 테스트
   - brain180 시각화 엔진 선택 시 브라우저로 실시간 문서 비교 가능

3. **[HIGH — 신규]** `/doctor` (또는 `/checkup`) 실행:
   - brain180 프로젝트 세션에서 `/doctor` 입력
   - 미사용 스킬·MCP 서버 컨텍스트 비용 분석 결과 확인
   - CLAUDE.md 슬림화 제안 검토

4. **[HIGH — 7회 연속]** brain180 프로젝트 스킬 디렉토리 생성:
   ```bash
   mkdir -p /home/user/brain180/.claude/skills/component-checker
   ```
   SKILL.md 내용: CLAUDE.md의 커밋 전 grep 체크리스트 4개 자동 실행

5. **[MEDIUM — 신규]** v2.1.207 Auto Mode 설정 마이그레이션 확인:
   - `.claude/settings.local.json`의 `autoMode` 관련 설정을 `~/.claude/settings.json`으로 이동
   - Alien Agentic 27인 에이전트 시스템의 각 세션 자동화 정책 재확인

6. **[MEDIUM]** `brain180-visualize` 스킬 + 내장 브라우저 연동 계획 수립:
   - `disallowed-tools: []` (브라우저 허용)
   - `paths: src/data/**,src/core/**` frontmatter로 범위 제한
   - 고전 텍스트 온라인 원문 자동 탐색 → CognitiveMap 생성 워크플로

---

### ⚠️ 지속 리스크

| 항목 | 현황 | 상태 |
|------|------|------|
| multica 인증 | **7회 연속** 미설정 | 🔴 긴급 |
| `.claude/skills/` 미생성 | **7회 연속** 미이행 | 🔴 높음 |
| Claude Code 버전 | v2.1.207 (2026-07-11 최신) 업데이트 필요 | 🟡 중간 |
| Auto Mode 설정 위치 변경 | `.local.json` → 글로벌 `settings.json` (v2.1.207) | 🟡 확인 필요 |

---

### 🔗 참고 자료

- [Claude Code Changelog 공식 문서](https://code.claude.com/docs/en/changelog)
- [GitHub Releases — anthropics/claude-code](https://github.com/anthropics/claude-code/releases)
- [Claude Code v2.1.207 상세 분석 (DevelopersIO)](https://dev.classmethod.jp/en/articles/20260711-cc-updates-v2-1-207/)
- [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills)
- [AgentSkills.io 오픈 스탠더드](https://agentskills.io)
- [Wondelai Skills 리포지토리](https://github.com/wondelai/skills)
- [Claude Code Desktop 브라우저 뉴스 (Jul 10)](https://jls42.org/en/news/ia-actualites-10-jul-2026)
