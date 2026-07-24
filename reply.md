## 🛸 스킬 발전 사항 일일 보고 — 2026-07-24 KST

### 📡 최신 동향

**2026년 7월 Claude Code 주요 업데이트**
- **중첩 서브에이전트 기본 3레벨 깊이**: 부모 에이전트가 자식 에이전트를 최대 3레벨까지 생성 가능 — 계층적 태스크 분해에 활용 가능
- **세션 범위 캡 도입**: WebSearch 및 서브에이전트 스폰 각각 기본 200회 제한 (`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`, `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` 조정 가능)
- **`/fork` 백그라운드 실행 기본화**: `context: fork` 포함 스킬이 이제 기본적으로 백그라운드에서 실행
- **에이전트 이름 `:` 금지**: `:` 포함 에이전트 이름 거부됨 (플러그인 네임스페이싱용으로 예약)
- **Microsoft 365 커넥터 쓰기 도구 추가**: 이메일 초안/전송, 캘린더 이벤트 관리, OneDrive/SharePoint 파일 생성·수정
- **서브에이전트 텍스트 스트리밍**: 실시간 출력 가시성 향상
- **보안 강화**: 권한 체크 강화, `EndConversation` 도구 추가, 장기 작업 프로그레스 하트비트

**2026년 6월 업데이트**
- 커뮤니티 툴 마켓플레이스 출시
- 에이전트별 비용 귀속(per-agent cost attribution) 도입
- 스코프 권한(scoped permissions) 적용
- Claude Fable 5, Claude Mythos 5 출시
- Anthropic 청구 정책: 출력 없는 거부 응답에 과금 중단

**스킬 에코시스템 현황**
- Claude Skills Hub 12,980+ 엔트리 (1년 미만에서 성장)
- SKILL.md 오픈 표준이 Claude Code, Cursor, GitHub Copilot, Gemini CLI 등 8개 이상 도구에서 상호운용 가능
- Anthropic 공식 스킬 리포지터리 157,000+ GitHub 스타
- `skill-creator` 플러그인: 스킬 eval 자동화 (A/B 비교, 패스율 측정, 설명 튜닝 등)

---

### 🔍 현재 설치된 스킬 현황 (brain180 리포)

**`.claude/` 디렉토리 분석:**

| 항목 | 상태 |
|------|------|
| `.claude/skills/` 디렉토리 | ❌ 없음 |
| `.claude/settings.json` | ❌ 없음 (settings.local.json만 존재) |
| `.claude/settings.local.json` | ✅ 존재 (Bash/Read 일부 권한만 설정) |
| `.claude/launch.json` | ✅ 존재 (Vite 개발 서버, 포트 5173) |

**현재 설치된 커스텀 스킬: 없음** ← 스킬 파일(.md) 없음

**계정 레벨 로드된 번들/내장 스킬 (현재 세션 기준):**

| 스킬 | 카테고리 |
|------|---------|
| `session-start-hook` | 인프라 |
| `dataviz` | 시각화 |
| `artifact-design`, `artifact-capabilities` | UI·아티팩트 |
| `update-config` | 설정 관리 |
| `keybindings-help` | 단축키 |
| `simplify`, `review`, `security-review`, `code-review` | 코드 품질 |
| `fewer-permission-prompts` | 권한 최적화 |
| `loop` | 자동화 |
| `claude-api` | API 참조 |
| `run` | 앱 실행 |
| `morning` | 브리핑 |
| `learn` | 학습 |
| `doc-coauthoring` | 문서화 |
| `web-artifacts-builder` | 프론트엔드 |
| `skill-creator` | 스킬 개발 |
| `theme-factory`, `brand-guidelines`, `canvas-design`, `algorithmic-art` | 디자인·창작 |
| `mcp-builder` | MCP 통합 |
| `internal-comms`, `slack-gif-creator` | 커뮤니케이션 |
| `xlsx`, `pptx`, `pdf`, `docx` | 오피스 문서 |
| `init` | 프로젝트 초기화 |
| `morning` | 모닝 브리핑 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| `why-how-what-extractor` | 커스텀 신규 | 🔴 긴급 | Alien Agentic 핵심 WHY-HOW-WHAT 컨설팅 워크플로를 SKILL.md로 표준화. 모든 에이전트 세션에서 일관된 프레임워크 적용 가능 |
| `cognitive-map-generator` | 커스텀 신규 | 🔴 긴급 | Brain180 CognitiveMap 스키마(CLAUDE.md 정의)를 기반으로 텍스트 → 노드/엣지 구조 변환 플로우 정형화 |
| `agent-squad-coordinator` | 커스텀 신규 | 🟠 높음 | 27명 에이전트 팀 운영 최적화. 태스크 분배, 결과 병합, 진행 추적. 새 3레벨 중첩 서브에이전트 기능 활용 |
| `multica-reporter` | 커스텀 신규 | 🟠 높음 | Multica 이슈 자동 보고 스킬. 현재 이 자동화 태스크를 재사용 가능한 스킬로 패키징. PAT 토큰 설정 포함 |
| `truth-first` | 커뮤니티 설치 | 🟠 높음 | 코드 실행 없이 성공 주장하는 에이전트 패턴 방지. 에이전트 신뢰성 향상. 27명 운영 환경에 필수 |
| `context-forker` | 커스텀 신규 | 🟡 중간 | 7월 신규 `/fork` 백그라운드 실행 기능 활용. Brain180 장시간 시각화 생성 작업 비동기 처리 |
| `changelog-generator` | 커뮤니티 설치 | 🟡 중간 | Brain180 개발 릴리즈 노트 자동화. semver CHANGELOG 생성 |
| `env-doctor` | 커뮤니티 설치 | 🟡 중간 | Vite/Node 로컬 개발환경 디버깅 자동화 |
| `genius-profile-loader` | 커스텀 신규 | 🟡 중간 | 분야별 천재 인지 패턴 데이터를 스킬 참조 파일로 제공. Brain180 콘텐츠 확장 시 활용 |

**[가설]** `skill-creator` 플러그인의 eval 자동화로 `cognitive-map-generator` 스킬 품질을 A/B 테스트로 검증 가능할 것으로 추정.

---

### 📋 오늘의 액션 아이템

1. **[즉시] `.claude/skills/` 디렉토리 생성** — brain180 프로젝트 레벨 스킬 기반 마련
2. **[즉시] `why-how-what-extractor` 스킬 초안 작성** — `/skill-creator` 활용해 Alien Agentic 핵심 프레임워크 SKILL.md 정의
3. **[즉시] `cognitive-map-generator` 스킬 초안 작성** — Brain180 CLAUDE.md 데이터 모델 기반으로 텍스트 분석 플로우 정의
4. **[이번 주] Multica PAT 환경변수 설정** — `multica login --token mul_YOUR_TOKEN` 으로 인증. 이후 자동 이슈 보고 가능 ⚠️
5. **[이번 주] `agent-squad-coordinator` 스킬 설계** — 27명 에이전트 팀 역할 분담 매트릭스를 스킬 파일로 문서화
6. **[다음 주] 7월 새 기능 통합** — 3레벨 중첩 서브에이전트와 세션 캡 설정을 Brain180 워크플로에 통합

---

### ⚠️ 운영 이슈

**multica CLI 인증 실패**: Multica CLI v0.3.26 설치는 성공했으나(GitHub Releases에서 직접 다운로드), PAT(개인 액세스 토큰)가 환경에 설정되지 않아 이슈 코멘트 게시 불가.

해결 방법:
```bash
multica login --token mul_YOUR_TOKEN_HERE
# 또는 환경변수로 사전 구성:
export MULTICA_TOKEN=mul_YOUR_TOKEN_HERE
```

**권고**: `session-start-hook` 또는 Claude Code 설정에서 `MULTICA_TOKEN` 환경변수를 미리 구성하거나, `multica-reporter` 커스텀 스킬에 토큰 설정 로직 포함.

---
_자동 생성: Alien Agentic subagent-builder | Claude Code 스케줄 태스크 | 2026-07-24_
