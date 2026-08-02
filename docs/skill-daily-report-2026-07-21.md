## 🛸 스킬 발전 사항 일일 보고 — 2026-07-21 KST

### 📡 최신 동향

#### Claude Code 스킬 시스템 업데이트 (v2.1.178~v2.1.217)

**신규 번들 스킬 (2026년 추가 확인)**

| 스킬/명령어 | 내용 | 추가 버전 |
|-----------|------|---------|
| `/dataviz` | 차트·대시보드 디자인 가이드, 색맹 안전 색상 검증 | v2.1.198 (2026-07-01) |
| `/batch <instruction>` | 대규모 코드베이스 병렬 변경 — 5~30개 유닛 분해, 워크트리 서브에이전트 | 2026 |
| `/deep-research <question>` | 멀티소스 웹 검색·팩트체크·인용 보고서 자동 생성 | 2026 |
| `/doctor` | 환경 진단 — PATH, 미사용 스킬/MCP, 느린 훅, CLAUDE.md 정리 | v2.1.205 (2026-07-08) |
| `/run` | 프로젝트 타입별 앱 실행·스크린샷 검증 | v2.1.145+ |
| `/run-skill-generator` | `/run`·`/verify`가 프로젝트 빌드 방법을 학습하도록 레시피 기록 | v2.1.145+ |
| `/verify` | 앱 실행으로 코드 변경 확인 (v2.1.215부터 자동실행 중단) | 2026 |
| `/ultrareview` | 멀티패스 심층 코드 리뷰 | 2026 |
| `/commit-push-pr` | 커밋·푸시·PR 초안을 한 번에 | v2.1.206 |
| `/fewer-permission-prompts` | 트랜스크립트 분석해 allowlist 자동 추가 | 2026 |
| `/fork` | 현재 세션 유지하며 대화를 백그라운드 세션으로 분기 | v2.1.212 (2026-07-17) |
| `/subtask` | 인라인 서브에이전트 생성 | v2.1.212 |
| `/rewind` | `/clear` 이전 컨텍스트 복원 포함 | v2.1.191 (2026-06-24) |
| `/config key=value` | 인라인 설정 변경 (예: `/config thinking=false`) | v2.1.181 (2026-06-17) |

**SKILL.md 프론트매터 확장 (중요)**

```yaml
context: fork          # 격리된 서브에이전트에서 스킬 실행
agent: Explore|Plan    # 사용할 서브에이전트 타입
disable-model-invocation: true  # Claude 자동 호출 방지
user-invocable: false  # /메뉴에서 숨김 (Claude는 여전히 호출 가능)
allowed-tools: [...]   # 허용 도구 제한
model: claude-opus-4-8 # 이 스킬 전용 모델
effort: max            # 추론 노력 수준
hooks: { pre: "..." }  # 스킬 생명주기 훅
paths: ["src/**"]      # 특정 경로에서만 활성화
shell: bash            # ! 인젝션 쉘 지정
```

**기타 주요 변경사항**
- **스킬 체인 지원** (v2.1.199): 한 메시지에 최대 5개 스킬 연결 (`/code-review /fix-issue 123`)
- **중첩 `.claude/skills/`** (v2.1.178): 모노레포 패키지별 스킬, 이름 충돌 시 `apps/web:deploy` 형식
- **스킬 마켓플레이스** (2026-02 런칭): tonsofskills.com — 425개 플러그인, 2,810+ 스킬
- **SKILL.md 범용 표준** (agentskills.io): Claude Code, Cursor, Gemini CLI, Codex CLI 호환
- **Dynamic Workflows** (v2.1.154+, 2026-05-28 GA): JS 오케스트레이션으로 수십~수백 서브에이전트 병렬 실행. Opus 4.8과 함께 출시. 750,000줄 코드 6일 재작성 사례 보고

#### MCP(Model Context Protocol) 주요 업데이트

**MCP 2026-07-28 Release Candidate (다음주 최종 릴리즈 예정)**

| 변경사항 | 내용 |
|---------|------|
| **Stateless 코어** | `initialize` 핸드셰이크 제거 → 라운드로빈 로드밸런서로 수평 확장 가능 |
| **Extensions 프레임워크** | 리버스DNS 식별자, 독립 버전 관리, Standards Track 프로세스 |
| **MCP Apps** | 도구 응답으로 HTML UI → 샌드박스 iframe 렌더링 인터랙티브 인터페이스 |
| **Tasks Extension** | 도구 호출 → 태스크 핸들 응답, `tasks/get`·`tasks/cancel`로 제어 |
| **Multi Round-Trip** | SSE 대체, 서버→클라이언트 상호작용 새 패턴 |
| **인증 강화** | OAuth 2.0/OIDC 정렬, RFC 9207 준수, Dynamic Client Registration |
| **에러 코드** | `-32002` → `-32602` (JSON-RPC 표준 준수) |
| **Deprecated** | Roots, Sampling, Logging (2027까지는 지원 유지) |

**거버넌스**: 2025-12월 Anthropic이 MCP를 **Linux Foundation / AAIF**에 기증 → 벤더 중립 커뮤니티 거버넌스 전환

**Claude Code MCP 관련 업데이트**
- per-server `request_timeout_ms` 설정 지원 (v2.1.206)
- 2분 이상 도구 자동 백그라운드 처리 (`CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS`) (v2.1.212)
- OAuth 토큰 자동 갱신 실패 시 재인증 (v2.1.206)
- 퍼블리시된 아티팩트에 라이브 MCP 커넥터 데이터 지원 (v2.1.216)
- `Mcp-Method`/`Mcp-Name` 헤더 지원으로 로드밸런서 라우팅 개선 (v2.1.217)

#### 에이전트 시스템 업데이트

- **서브에이전트 백그라운드 기본화** (v2.1.198, 2026-07-01): 부모가 완료를 기다리지 않고 병렬 작업
- **동시 실행 상한** (v2.1.217): `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (기본 20)
- **세션별 서브에이전트 상한** (v2.1.212): `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` (기본 200)
- **중첩 깊이 제한** (v2.1.217): `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` (기본 비활성)
- **자동 PR 생성**: 워크트리 서브에이전트 완료 시 커밋·푸시·PR 자동 처리
- **`EndConversation` 도구** (v2.1.214): 에이전트 파이프라인 내 남용 차단용
- **Cowork 클라우드 세션** (2026-07-07 GA): 노트북 닫아도 클라우드에서 계속 실행
- **Claude Opus 4.8** (2026-05-28): Dynamic Workflows 헤드라인 기능
- **Claude Sonnet 5** (2026-06-30, v2.1.197): 기본 모델, 1M 토큰 컨텍스트

---

### 🔍 현재 설치된 스킬 현황

총 **17개** 스킬 설치 (`source: anthropic-example` 또는 `source: anthropic`):

| 스킬명 | 카테고리 | 최근 업데이트 |
|-------|---------|------------|
| morning | 생산성/브리핑 | 2026-07-21 |
| learn | 교육/설명 | 2026-07-21 |
| doc-coauthoring | 문서 협업 | 2026-07-21 |
| web-artifacts-builder | UI/아티팩트 | 2026-07-21 |
| skill-creator | 스킬 관리/평가 | 2026-07-21 |
| theme-factory | 디자인 테마 | 2026-07-21 |
| mcp-builder | MCP 서버 개발 | 2026-07-21 |
| internal-comms | 사내 커뮤니케이션 | 2026-07-21 |
| canvas-design | 시각 디자인 | 2026-07-21 |
| brand-guidelines | 브랜딩 | 2026-07-21 |
| slack-gif-creator | 슬랙 GIF | 2026-07-21 |
| algorithmic-art | 알고리즘 예술 | 2026-07-21 |
| xlsx | 스프레드시트 | 2026-07-21 |
| pptx | 프레젠테이션 | 2026-07-21 |
| pdf | PDF 처리 | 2026-07-21 |
| docx | Word 문서 | 2026-07-21 |
| session-start-hook | 개발 환경 셋업 | 2026-07-16 |

**미설치 확인 (시스템에서 로드 가능하나 미설치)**:
`dataviz`, `deep-research`, `artifact-design`, `artifact-capabilities`, `update-config`,
`keybindings-help`, `simplify`, `fewer-permission-prompts`, `loop`, `claude-api`,
`run`, `review`, `security-review`, `init`

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| `dataviz` | 신규 설치 | ⭐⭐⭐ HIGH | Brain180 인지구조 시각화(노드 그래프·레이어 맵) + Alien Agentic 데이터 보고서에 즉시 활용. 색상 팔레트 검증 내장 |
| `deep-research` | 신규 설치 | ⭐⭐⭐ HIGH | WHY-HOW-WHAT 컨설팅의 WHY 분석 단계 자동화. 멀티소스 팩트체크·인용 보고서 생성 |
| `fewer-permission-prompts` | 신규 설치 | ⭐⭐⭐ HIGH | 이 스케줄 자동화 태스크 포함 모든 루틴의 허가 프롬프트 제거. 즉시 효과 |
| `run` | 신규 설치 | ⭐⭐ MED | Brain180 Vite 앱 자동 실행·검증. launch.json 연동 |
| `review` / `security-review` | 신규 설치 | ⭐⭐ MED | PR 자동 리뷰 + 에이전트 시스템 보안 강화 |
| `claude-api` | 신규 설치 | ⭐⭐ MED | Brain180 Claude API 활용 코드 작성 시 최신 모델 ID·가격·파라미터 자동 참조 |
| `mcp-builder` | 콘텐츠 업데이트 | ⭐⭐ MED | MCP 2026 RC 스펙(Stateless, Tasks, MCP Apps) 반영 여부 확인 필요 |
| `init` | 신규 설치 | ⭐ LOW | Brain180 신규 서브프로젝트 초기화 자동화 |

**Alien Agentic 27명 에이전트 시스템 특화 추천**:
- `fewer-permission-prompts` — 에이전트별 허가 병목 제거 (즉시 효과)
- `deep-research` — WHY 분석 단계 리서치 자동화
- Dynamic Workflows 도입 검토 — 27명 에이전트를 JS 오케스트레이션으로 전환 시 병렬 효율 극대화 [가설: 현재 아키텍처와의 호환성 미검증]
- SKILL.md `context: fork` 패턴 — 무거운 스킬을 격리 서브에이전트로 분리하여 메인 컨텍스트 보호

---

### 📋 오늘의 액션 아이템

1. **`dataviz` + `deep-research` + `fewer-permission-prompts` 스킬 즉시 설치** — 가장 즉각적인 효과
2. **MCP 2026-07-28 RC 릴리즈 모니터링** — 다음주 최종 릴리즈. Stateless 전환 시 기존 MCP 서버 재구성 사전 검토
3. **Multica 스케줄 태스크 인증 설정** — 환경에 `mul_...` PAT 토큰 미설정. 스케줄 태스크 환경변수에 `MULTICA_TOKEN` 추가 후 `multica login --token $MULTICA_TOKEN` 실행 필요
4. **Dynamic Workflows 파일럿** — 반복성 높은 Alien Agentic 태스크에 시범 적용 검토
5. **`skill-creator`로 Alien Agentic 전용 커스텀 스킬 개발** — WHY-HOW-WHAT 워크플로 자동화 스킬

---

_자동 생성: 2026-07-21 23:09 KST | Alien Agentic subagent-builder_
_소스: code.claude.com/docs/en/changelog, blog.modelcontextprotocol.io, releasebot.io/updates/anthropic_
