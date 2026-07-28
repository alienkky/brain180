## 🛸 스킬 발전 사항 일일 보고 — 2026-07-28 KST

> **보고 주체**: Alien Agentic subagent-builder  
> **대상 이슈**: ALI-14 (Multica ID: `0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7`)  
> **비고**: multica CLI **v0.4.0** 설치 완료 (이전 v0.3.33 → 신규) — PAT 미설정으로 이슈 직접 코멘트 불가. GitHub 파일 대체 보고.

---

### 📡 최신 동향

#### 🔴 오늘의 핵심 이벤트: MCP 2026-07-28 스펙 공식 출시

**오늘(2026-07-28) MCP 역사상 최대 규모 스펙 업데이트 발표됨.**

| 변경 | 내용 |
|------|------|
| **스테이트리스 코어** | 양방향 스테이트풀 프로토콜 → 요청/응답 무상태 모델. `initialize`/`initialized` 교환 및 세션 ID 제거. `_meta`에 프로토콜 버전·클라이언트 ID·기능 포함 |
| **MRTR (Multi Round-Trip Requests)** | 도구가 실행 도중 사용자 입력 요청 가능. `resultType: "input_required"` 반환 → 응답 첨부 재호출 패턴 |
| **Header-Based Routing** | `Mcp-Method` / `Mcp-Name` 헤더 — JSON 바디 파싱 없이 게이트웨이·레이트리미터 라우팅 |
| **캐시 가능 결과** | `tools/list`, `prompts/list`, `resources/list`에 `ttlMs` + `cacheScope` 추가 |
| **Extensions Framework** | Tasks, MCP Apps, Enterprise Managed Authorization(EMA) 공식 확장 아키텍처 편입 |
| **보안 강화** | RFC 9207 발급자 검증, DCR → CIMD(Client ID Metadata Documents) 전환, OAuth mix-up 공격 방지 |
| **Deprecated** | 세션 아키텍처, Roots, Sampling, Logging (12개월 제거 유예), HTTP+SSE 전송 |
| **SDK** | TypeScript·Python·Go·C# Tier 1 업데이트 완료; Rust SDK 베타 |

> **인프라 임팩트**: 서버리스·엣지 배포 가능, 스티키 세션 없이 라운드로빈 로드밸런서 적용 가능.  
> **현황**: MCP SDK 월 다운로드 4억회 돌파 (전년비 4배), 공식 커넥터 디렉토리 950+ 서버.

**[가설]** MCP가 스테이트리스화되면 brain180의 CognitiveMap API 레이어를 서버리스로 경량화할 수 있음. 기존 세션 관리 부담 제거 예상.

---

#### Claude Code 최신 업데이트 (2026-07-24 이후)

| 항목 | 내용 |
|------|------|
| **Opus 5 기본 모델 전환** | claude-opus-5가 Opus 기본 모델로 공식 전환 (claude-api 스킬 기준) |
| **/verify, /code-review 자동 실행 중단** | 직접 호출할 때만 동작. 에이전트가 임의로 실행하지 않음 — 토큰 절약 |
| **다중 스택 스킬 처리** | 첫 번째 스킬만 처리하던 문제 해결 → 여러 스킬 동시 실행 가능 |
| **MCP 터널 (리서치 프리뷰)** | 프라이빗 네트워크 MCP 서버를 인바운드 방화벽 규칙 없이 Claude에 연결. 퍼블릭 엔드포인트 불필요 |
| **이모지 단축코드 자동완성** | `:fire:` 형식 → 🔥 자동 변환 |
| **Claude for Government Desktop 공개 베타** | FedRAMP High 인증. 공공기관 Claude Code / Cowork 지원, 감사 로그, 지출 거버넌스 |
| **아티팩트 MCP 라이브 데이터** | 게시된 아티팩트에 MCP 커넥터 실시간 데이터 연동 |

---

#### 스킬 생태계 트렌드

| 항목 | 현황 |
|------|------|
| 인기 커뮤니티 스킬 | **Superpowers** (GitHub 243k stars, 1위), Claude Mem, Context7, Planning with Files |
| 팀 관행 변화 | `.agents/skills/` 디렉토리를 리포에 체크인 — 신규 기여자 자동 적용 |
| Awesome 목록 | `ComposioHQ/awesome-claude-skills`, `travisvn/awesome-claude-skills` — 커뮤니티 최대 큐레이션 |
| MCP 스킬 구성 | Skills(절차 지식) + MCP(시스템 접근) 조합 = MCP 스테이트리스로 더 가볍게 가능 |

---

### 🔍 현재 설치된 스킬 현황 (brain180 / alienkky)

**프로젝트 레벨 (brain180/.claude/):**

| 항목 | 상태 |
|------|------|
| `.claude/skills/` 디렉토리 | ❌ 없음 (**6회 연속 미이행**) |
| `.claude/settings.json` | ❌ 없음 |
| `.claude/settings.local.json` | ✅ 일부 Bash/Read 퍼미션만 |
| `.claude/launch.json` | ✅ Vite dev server 설정 |

**번들 내장 스킬 (현재 세션 로드됨):**

| 스킬 | 주요 용도 |
|------|---------|
| `session-start-hook` | 웹 세션 SessionStart 훅 |
| `dataviz` | 차트·시각화 디자인 |
| `artifact-design`, `artifact-capabilities` | 아티팩트 UI |
| `update-config` | settings.json 구성 |
| `simplify`, `review`, `security-review` | 코드 품질 |
| `fewer-permission-prompts` | 권한 자동화 |
| `loop` | 반복 실행 |
| `claude-api` | Claude API 레퍼런스 |
| `run` | 앱 실행 |
| `morning` | 모닝 브리핑 |
| `learn` | 학습 지원 |
| `doc-coauthoring` | 문서 공동작성 |
| `web-artifacts-builder` | 프론트엔드 아티팩트 |
| `skill-creator` | 스킬 개발 |
| `theme-factory`, `algorithmic-art` | 디자인·예술 |
| `mcp-builder` | MCP 통합 |
| `internal-comms` | 내부 커뮤니케이션 |
| `xlsx`, `pptx`, `pdf`, `docx` | 오피스 문서 |
| `init` | CLAUDE.md 초기화 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| **multica PAT 등록** | 인프라 | 🔴 긴급 (6회 연속) | `mul_...` PAT → Claude Code 원격 세션 환경변수 등록 → `multica login --token $MULTICA_PAT`. CLI v0.4.0 설치 완료, 토큰 1개만 필요 |
| **MCP 2026-07-28 마이그레이션** | 인프라 | 🔴 높음 (오늘 발표) | 세션 기반 MCP 서버 → 스테이트리스 재설계 권장. brain180 API 레이어에 적용 시 서버리스 배포 가능 |
| `component-checker` | 프로젝트 스킬 | 🔴 높음 (6회 연속) | CLAUDE.md 커밋 전 grep 체크리스트 4개 자동 실행. `.claude/skills/` 생성 즉시 추가 |
| `brain180-visualize` | 프로젝트 스킬 | 🔴 높음 | brain180 핵심 워크플로 — 텍스트 → CognitiveMap 분석. Opus 5 기반으로 품질 향상 기대 |
| `context7` | 커뮤니티 설치 | 🟠 높음 | 최신 라이브러리 문서 실시간 참조 — Vite/Drizzle/D3.js 버전 혼동 방지. brain180 개발에 즉시 유용 |
| **다중 스택 스킬 활용** | 기능 활용 | 🟠 높음 (이번 주) | 수정된 동작 (`/cognitive-map` + `/text-analysis` 동시 호출 패턴) brain180 워크플로에 즉시 적용 가능 |
| `mcp-tunnel-setup` | 커스텀 신규 | 🟡 중간 | MCP 터널 리서치 프리뷰 활용 — Alien Agentic 내부 MCP 서버를 외부 노출 없이 연결. 27명 에이전트팀 내부 도구 보안 강화 |
| `why-how-what` | 글로벌 스킬 | 🟡 중간 | Alien Agentic 3단계 분석 SKILL.md화. `effort: high` + `context: fork` 조합 |
| `agent-squad-coordinator` | 글로벌 스킬 | 🟡 중간 | 27명 에이전트 라우팅 스킬화. MCP MRTR 기능 활용하여 에이전트 간 중간 입력 처리 가능 |

---

### 📋 오늘의 액션 아이템

1. **[긴급 — 6회 연속]** Multica PAT 발급 및 환경변수 등록
   ```bash
   # Multica 웹 → Settings → Personal Access Tokens → 신규 발급
   export MULTICA_PAT="mul_YOUR_TOKEN"
   multica login --token $MULTICA_PAT
   # 이후 자동 이슈 코멘트 가능:
   multica issue comment add 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7 --content-file ./reply.md
   ```
   > multica v0.4.0 `/usr/local/bin/multica` 설치 완료. 토큰 1개로 즉시 해결.

2. **[오늘] MCP 2026-07-28 스펙 영향 평가**
   - brain180 서버의 현재 MCP 서버 사용 여부 확인 (`server/` 디렉토리 검토)
   - 세션 기반 → 스테이트리스 마이그레이션 체크리스트 작성
   - SDK 업데이트: `@modelcontextprotocol/sdk` → 2026-07-28 버전으로 업그레이드

3. **[오늘] brain180 `.claude/skills/` 디렉토리 생성 (6회 연속 미이행)**
   ```bash
   mkdir -p /home/user/brain180/.claude/skills/component-checker
   ```

4. **[이번 주] /verify · /code-review 동작 변경 적용**
   - 자동 실행 중단 → 워크플로에서 명시적 호출로 수정
   - brain180 CI/CD 스크립트 검토

5. **[이번 주] MCP 터널 테스트**
   - Alien Agentic 내부 도구를 MCP 터널로 연결 (리서치 프리뷰)
   - 프라이빗 네트워크 내 MCP 서버를 방화벽 규칙 없이 Claude에 노출

6. **[다음 주] Context7 스킬 설치**
   - brain180 개발 중 Vite / Drizzle / D3.js 최신 문서 실시간 참조

---

### ⚠️ 지속 리스크

| 항목 | 현황 | 조치 |
|------|------|------|
| multica 인증 | **6회 연속** 미설정 (CLI v0.4.0 설치 완료) | PAT 발급 → `MULTICA_PAT` 환경변수 등록 1회로 해결 |
| `.claude/skills/` 미생성 | **6회 연속** 미이행 | `mkdir -p .claude/skills/component-checker` 1줄로 즉시 해결 |
| MCP 세션 의존성 | 2026-07-28 스펙에서 deprecated | 12개월 유예 기간 내 스테이트리스 마이그레이션 계획 필요 |

---

### 🔗 참고 자료

- [MCP 2026-07-28 Specification](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [Claude brings MCP 2026-07-28 support](https://claude.com/blog/bringing-mcp-2026-07-28-to-claude)
- [Claude Code Changelog](https://code.claude.com/docs/en/changelog)
- [Best Claude Code Skills 2026 — Developers Digest](https://www.developersdigest.tech/blog/best-claude-code-skills-2026)
- [Awesome Claude Code Skills](https://claudeskills.info/best/)
- [Multica CLI Install Guide](https://github.com/multica-ai/multica/blob/main/CLI_INSTALL.md)

---

_자동 생성: Alien Agentic subagent-builder | Claude Code 스케줄 태스크 | 2026-07-28_
