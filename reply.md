## 🛸 스킬 발전 사항 일일 보고 — 2026-05-22 (KST)

### 📡 최신 동향

#### Claude Code Skills 시스템 주요 업데이트 (2026년 5월)

| 날짜 | 버전 | 주요 변경 |
|------|------|---------|
| 2026-05-22 | v2.1.149 | `/usage` 카테고리별 비용 분류 (skills/subagents/plugins/MCP) 신규 |
| 2026-05-21 | v2.1.147 | `/code-review` 신규 (구 `/simplify` 대체), `--comment` 플래그로 GitHub PR 인라인 코멘트 가능 |
| 2026-05-19 | v2.1.145 | `/goal [condition]` 신규 — 조건 달성 시까지 Claude가 자율 작업 지속 |
| 2026-05-19 | v2.1.145 | `/plugin` Discover에 스킬 메타데이터 및 컨텍스트 비용 추정 추가 |
| 2026-05-22 | v2.1.149 | `/ultrareview` 신규 — 멀티 에이전트 병렬 코드 리뷰 |
| 2026-05-22 | v2.1.149 | `/scroll-speed` 신규 — 터미널 스크롤 속도 조정 |

#### Skills 시스템 아키텍처 변화
- `.claude/commands/` **deprecated** → `.claude/skills/` 형식으로 마이그레이션 필요
- 스킬 frontmatter에 `${CLAUDE_EFFORT}` 환경 변수 지원 추가 (적응형 심도 조절 가능)
- 스킬이 플러그인 의존성 선언 가능 (`allowed-tools` frontmatter)
- 커뮤니티 스킬 수 1,000개 돌파 (skills.sh 기준, 2026년 초)

#### MCP 통합 개선
- 다중 stdio 서버 병렬 초기화 (시작 속도 개선)
- OAuth 토큰 자동 갱신 (1시간마다 재인증 불필요)
- `/mcp` 명령으로 `.mcp.json` 변경사항 CLI 재시작 없이 반영
- `CLAUDE_PROJECT_DIR` 환경변수 stdio MCP 서버 및 hooks에서 접근 가능
- 스킬당 MCP 비용 추적 (`/usage`에서 확인)

---

### 🔍 현재 설치된 스킬 현황

#### brain180 프로젝트 스킬 (`/home/user/brain180/.claude/skills/`)
- **없음** — 프로젝트 레벨 커스텀 스킬 미설치

#### 개인 글로벌 스킬 (`~/.claude/skills/`)
| 스킬명 | 상태 | 설명 |
|-------|------|-----|
| `session-start-hook` | ✅ 설치됨 | Claude Code 웹 세션 시작 시 환경 초기화 |

#### 현재 시스템에서 사용 가능한 빌트인 스킬
| 스킬명 | 유형 | 설명 |
|-------|------|-----|
| `session-start-hook` | Built-in | 세션 시작 훅 설정 |
| `update-config` | Built-in | settings.json 설정 관리 |
| `keybindings-help` | Built-in | 키보드 단축키 커스터마이징 |
| `verify` | Built-in | 코드 변경 검증 |
| `code-review` | Built-in | 코드 리뷰 (effort 레벨 지원) |
| `fewer-permission-prompts` | Built-in | 권한 프롬프트 감소 설정 |
| `loop` | Built-in | 반복 작업 자동화 |
| `claude-api` | Built-in | Claude API 앱 개발 |
| `run` | Built-in | 프로젝트 앱 실행 |
| `init` | Built-in | CLAUDE.md 초기화 |
| `review` | Built-in | PR 리뷰 |
| `security-review` | Built-in | 보안 리뷰 |

#### `.claude/settings.local.json` 현재 권한 설정
```json
{
  "permissions": {
    "allow": [
      "Bash(node -e ' *)",
      "Read(//e/e/**)"
    ]
  }
}
```
> ⚠️ 일부 allow 규칙이 Windows 경로(`//e/e/**`)를 참조하고 있어 현재 Linux 환경에서 불필요할 수 있음

---

### 🚀 추천 업데이트

#### Alien Agentic WHY-HOW-WHAT 컨설팅 워크플로에 필요한 스킬

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| `why-how-what-analyzer` | 신규 커스텀 | 🔴 HIGH | WHY-HOW-WHAT 프레임워크로 텍스트/코드 분석 자동화 — Brain180 핵심 워크플로 |
| `cognitive-map-extractor` | 신규 커스텀 | 🔴 HIGH | 텍스트에서 인지 구조 노드/엣지 자동 추출 → CognitiveMap JSON 생성 |
| `agent-orchestrator` | 신규 커스텀 | 🟡 MEDIUM | 27명 에이전트 시스템 태스크 라우팅 및 상태 조회 자동화 |
| `daily-report` | 신규 커스텀 | 🟡 MEDIUM | 일일 보고서 작성 → multica 이슈 자동 제출 파이프라인 |
| `genius-text-loader` | 신규 커스텀 | 🟡 MEDIUM | `src/data/geniuses/`에서 텍스트 로드, Brain180 데이터 모델 검증 |
| `security-review` | Built-in 활성화 | 🟡 MEDIUM | 컨설팅 코드 보안 감사 — 현재 미활용 |
| `/goal` 워크플로 | Built-in 신규 | 🟡 MEDIUM | "모든 테스트 통과할 때까지 작업" 등 자율 작업 사이클 구현 |
| `visualization-validator` | 신규 커스텀 | 🟢 LOW | D3.js/Three.js 시각화 컴포넌트 레이어 독립성 자동 검증 |
| `data-hardcode-checker` | 신규 커스텀 | 🟢 LOW | `grep`으로 텍스트 하드코딩 위반 사전 탐지 (CLAUDE.md 커밋 전 체크리스트 자동화) |

#### 즉시 도입 가능한 빌트인 스킬 업그레이드
- **`/ultrareview`**: PR 리뷰 품질 대폭 향상 — 멀티 에이전트 병렬 분석
- **`/goal`**: "Brain180 모든 컴포넌트 테스트 통과" 같은 장기 작업에 활용
- **`fewer-permission-prompts`**: 현재 빈번한 권한 프롬프트를 settings.json으로 영구 허용

---

### 📋 오늘의 액션 아이템

1. **[즉시] `.claude/commands/` 형식이 있다면 `.claude/skills/`로 마이그레이션** — deprecated 경고 방지
2. **[즉시] `fewer-permission-prompts` 스킬 실행** — `/fewer-permission-prompts` 로 현재 세션 분석 후 settings.json 업데이트
3. **[이번 주] `why-how-what-analyzer` 커스텀 스킬 작성** — Brain180 분석 모드의 핵심 자동화
4. **[이번 주] `cognitive-map-extractor` 커스텀 스킬 작성** — CognitiveMap 스키마에 맞춰 자동 JSON 생성
5. **[이번 주] `daily-report` 커스텀 스킬 작성** — multica CLI 대안으로 GitHub Issues API 또는 MCP 통해 보고 자동화
6. **[검토] settings.local.json 정리** — Windows 경로 참조(`//e/e/**`) 제거, 현재 Linux 환경에 맞게 업데이트
7. **[검토] multica CLI 설치 방법 확인** — npm `@multica/cli` 패키지 미존재, 공식 설치 경로 확인 필요

---

### 🔧 multica CLI 설치 이슈

오늘 보고 제출 과정에서 `@multica/cli`가 npm 레지스트리에 없어 CLI 설치 실패. 다음 대안 확인 필요:
- multica 공식 설치 가이드 URL 확인
- Python `pip` 기반 설치 가능 여부
- GitHub 직접 설치 (`npm install -g github:multica/cli`)
- 또는 curl 기반 바이너리 설치 스크립트

---

_조사 기준: 2026-05-22 | 출처: Anthropic 공식 문서, Claude Code changelog, 커뮤니티 보고_
_[가설] 표시 없는 항목은 조사된 사실에 기반_
