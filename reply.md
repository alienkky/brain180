## 🛸 스킬 발전 사항 일일 보고 — 2026년 7월 16일 KST

> **보고 주체**: Alien Agentic subagent-builder  
> **대상 이슈**: ALI-14 (Multica 이슈 ID: `0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7`)  
> **비고**: multica CLI 미설치, `MULTICA_TOKEN` 미설정 — GitHub 파일 대체 보고 (reply.md)

---

### 📡 최신 동향

#### Claude Code 릴리즈 현황 (2026-07-14 이후)

| 버전 | 일자 | 핵심 변경사항 |
|------|------|--------------|
| **v2.1.211** | 2026-07-15 | `--forward-subagent-text` 플래그 추가, 보안 강화, Bedrock 프롬프트 캐시 과금 오류 수정 |
| **v2.1.210** | 2026-07-14 | 장기 도구 호출 진행 카운터 추가, 서브에이전트 보안 격리 개선, 버그 23개 수정 |
| **v2.1.209** | 2026-07-14 | 백그라운드 에이전트 `/model` 다이얼로그 차단 버그 수정 (이전 보고 내용) |

#### 주요 기능 상세

**v2.1.211 (어제)**
- 🔧 `--forward-subagent-text` CLI 플래그 + `CLAUDE_CODE_FORWARD_SUBAGENT_TEXT` 환경변수 추가 → stream-json 출력에 서브에이전트 텍스트/thinking 블록 포함 가능
- 🔐 **권한 승인 메시지 보안**: 시각적 스푸핑 방지 — 양방향 오버라이드, 제로-너비, 유사 따옴표 문자 중화 처리
- 🐛 `PreToolUse` 훅의 `ask` 결정이 Auto 모드에서 무시되던 버그 수정
- 💰 **Bedrock/Vertex/Foundry 프롬프트 캐시 과금 오류 수정** — 신규 입력 토큰으로 잘못 청구되던 문제 해결

**v2.1.210 (어제)**
- ⏱️ 장기 도구 호출 실시간 진행 카운터 추가 (UI 멈춤 현상 개선)
- 🔐 서브에이전트/샌드박스 보안 격리 강화

#### 스킬 생태계 동향 (버전 비고정)
- **스킬 포지셔널 플레이스홀더 보존**: `$1`, `$2` 등 미매칭 플레이스홀더가 스킬/명령어에서 무시되던 버그 수정 → 이제 그대로 보존
- **`/plugin` 설치 탭 스킬 섹션 추가**: 설치된 스킬 탐색성 개선
- **스택 스킬 지원** (v2.1.199~): 여러 스킬 동시 활성화 지원
- **`/doctor` 미사용 스킬 탐지**: 스킬 컨텍스트 비용 플래그 기능 추가

#### MCP 업데이트
- `claude mcp login <name>` / `claude mcp logout <name>` 추가 — SSH 환경 포함 CLI 기반 MCP 서버 인증 (`--no-browser` 옵션)
- 세션 중간 MCP 재동기화 시 플러그인 제공 MCP 서버가 끊기던 버그 수정

---

### 🔍 현재 설치된 스킬 현황

#### brain180 프로젝트 레벨 (`.claude/skills/`)
- **없음** — 프로젝트에 스킬 디렉토리 미구성 (2026-06-16부터 반복 지적 중)

#### 전역 스킬 (`~/.claude/skills/`)
- `session-start-hook` — 웹 세션 startup 훅 설정 (1개)

#### Claude Code 번들 스킬 (2026-07-16 기준 — 33개)

**이전 보고(07-14) 대비 신규 추가 8개 스킬 🆕:**

| 스킬명 | 설명 | Brain180 관련성 |
|--------|------|----------------|
| `artifact-capabilities` | Artifact 런타임 능력 선언 (MCP 커넥터 호출 등) | 🔴 높음 — CognitiveMap 시각화 인터랙티브 Artifact 제작 시 필수 |
| `morning` | 조간 브리프 렌더링 / 반복 설정 | 🟢 낮음 — 이 보고 루틴과 유사한 패턴 참조 가능 |
| `slack-gif-creator` | Slack GIF 생성기 | 🟡 중간 — Alien Agentic 팀 커뮤니케이션 |
| `algorithmic-art` | 알고리즘 아트 생성 | 🟡 중간 — Brain180 시각화 창의적 탐색에 활용 가능 [가설] |
| `xlsx` | Excel 파일 처리 | 🟢 낮음 — 학습 진행도 데이터 내보내기 |
| `pptx` | PowerPoint 파일 처리 | 🟢 낮음 — 천재 인지구조 비교 프레젠테이션 |
| `pdf` | PDF 처리 | 🟡 중간 — 고전 텍스트 원문 PDF 수집/분석 |
| `docx` | Word 문서 처리 | 🟢 낮음 — 보고서 작성 |

**기존 유지 번들 스킬 (25개):**
session-start-hook, deep-research, dataviz, artifact-design, update-config, keybindings-help, verify, code-review, simplify, fewer-permission-prompts, loop, claude-api, run, learn, doc-coauthoring, web-artifacts-builder, skill-creator, theme-factory, mcp-builder, internal-comms, canvas-design, brand-guidelines, init, review, security-review

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| **`brain180-analyze`** | 커스텀 프로젝트 스킬 | 🔴 긴급 | seeds/ 8개 텍스트 분석 워크플로 표준화. 2달 연속 미이행 |
| **`artifact-capabilities` 활용** | 번들 스킬 | 🔴 높음 | 신규 추가 — CognitiveMap 노드 그래프를 인터랙티브 Artifact로 출력 시 MCP 커넥터 연동 가능. `window.claude.mcp` 코드 작성 전 반드시 로드 필요 |
| **`cognitive-map-extractor`** | 커스텀 도메인 스킬 | 🔴 높음 | 텍스트 → CognitiveMap JSON 변환. seeds/ 8개 파일 즉시 적용 가능 |
| **`pdf` 스킬 활용** | 번들 스킬 | 🟡 중간 | 신규 추가 — 고전 원문 PDF 업로드 및 분석 워크플로 즉시 활용 가능 |
| **`algorithmic-art` 스킬 검토** | 번들 스킬 | 🟡 중간 | 신규 추가 — Brain180 시각화 유형(노드 그래프, 흐름도) 생성에 활용 가능성 탐색 [가설] |
| **`multica-submit` 자동화** | 커스텀 자동화 | 🟡 중간 — **최장기 미해결** | reply.md → multica 자동 제출 스크립트. `MULTICA_TOKEN` 환경변수 1회 설정으로 즉시 완성 |
| **`pptx` 활용** | 번들 스킬 | 🟢 낮음 | 신규 추가 — 27인 에이전트 시스템 운영 현황 프레젠테이션 |
| **`--forward-subagent-text` 설정** | 환경 설정 | 🟡 중간 | v2.1.211 신기능 — 27인 에이전트 시스템 디버깅 시 서브에이전트 thinking 블록 가시성 확보 |

---

### 📋 오늘의 액션 아이템

1. **[즉시 — 2달 연속 미이행]** `.claude/skills/` 디렉토리 생성 및 `brain180-analyze` 스킬 작성:
   ```bash
   mkdir -p /home/user/brain180/.claude/skills/brain180-analyze
   ```
   seeds/ 8개 텍스트를 CognitiveMap JSON으로 변환하는 SKILL.md 작성

2. **[오늘] `artifact-capabilities` 스킬 활용 — 신규 번들 스킬**:
   - Brain180 CognitiveMap 시각화 Artifact 제작 시 이 스킬을 먼저 로드
   - `window.claude.mcp` 인터랙티브 기능 구현 가능 여부 탐색

3. **[오늘] Bedrock/Foundry 사용자라면 프롬프트 캐시 과금 확인** (v2.1.211):
   - 이전에 잘못 청구된 토큰 비용 있을 수 있음

4. **[이번 주] multica PAT 토큰 발급**:
   - `https://app.multica.ai/settings` → Personal Access Tokens
   - Claude Code 원격 세션에 `MULTICA_TOKEN` 환경변수 등록
   - 이 보고 루틴이 완전 자동화됨

5. **[이번 주] `pdf` 스킬로 고전 텍스트 원문 수집 워크플로 구축**:
   - seeds/ 디렉토리에 현재 8개 텍스트 존재
   - PDF 형식의 원문 추가 수집 가능

6. **[다음 스프린트] `--forward-subagent-text` 환경변수 설정**:
   - 27인 에이전트 시스템 디버깅 가시성 향상
   ```bash
   export CLAUDE_CODE_FORWARD_SUBAGENT_TEXT=1
   ```

---

### ⚠️ 지속 리스크

| 항목 | 현황 | 조치 |
|------|------|------|
| multica 인증 | **미설정** — CLI 없음, TOKEN 없음 | `MULTICA_TOKEN` 환경변수 1회 설정으로 해결 |
| `.claude/skills/` 미생성 | **2달 연속 미이행** | `mkdir -p .claude/skills/brain180-analyze` 1줄 명령 |
| 스킬 포지셔널 플레이스홀더 | **수정 완료** (버전 비고정) | 기존 스킬의 `$1/$2` 플레이스홀더 동작 재확인 권장 |
| Bedrock 프롬프트 캐시 과금 | v2.1.211에서 수정됨 | 이전 잘못 청구 내역 확인 필요 |

---

### 🔗 참고 자료

- [Claude Code Changelog](https://code.claude.com/docs/en/changelog)
- [GitHub Release v2.1.211](https://github.com/anthropics/claude-code/releases/tag/v2.1.211)
- [GitHub Release v2.1.210](https://github.com/anthropics/claude-code/releases/tag/v2.1.210)
- [Claude Code v2.1.210 Updates — DevelopersIO](https://dev.classmethod.jp/en/articles/20260715-cc-updates-v2-1-210/)
- [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills)

---

_조사 소스: Claude Code Changelog v2.1.209~v2.1.211 (2026-07-14~07-15), 현재 세션 스킬 목록 직접 추출_
