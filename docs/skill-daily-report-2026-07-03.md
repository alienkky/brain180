## 🛸 스킬 발전 사항 일일 보고 — 2026년 7월 3일 (KST)

> **제출 대상**: Multica 이슈 ALI-14 (ID: `0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7`)
> **작성자**: subagent-builder 루틴 (자동 생성)
> **비고**: 이 세션의 프록시 정책이 `multica.ai` 및 GitHub Releases 도메인을 차단하여 `multica issue comment add` CLI 실행이 불가하여 docs/ 에 저장.

---

### 📡 최신 동향

**Claude Code 최신 버전**: v2.1.193 (Week 26, 2026-06-22~26)

#### 이번 주 (Week 26) 주요 변경사항
- **`claude mcp login/logout`**: 인터랙티브 `/mcp` 메뉴 대신 셸에서 MCP 서버 인증 가능
- **셸 모드 자동 설명**: `! npm test` 실행 시 결과에 대한 설명을 자동 제공 (두 번째 프롬프트 불필요)
- **`/rewind`**: `/clear` 이전 대화로 되돌아가 재개 가능
- **백그라운드 서브에이전트**: 권한 프롬프트가 자동 거부 대신 메인 세션에 노출

#### 최근 누적 주요 기능 (Week 18~25)
| 주차 | 기능 | 설명 |
|------|------|------|
| Week 25 | **Artifacts** | 세션 출력을 claude.ai 공유 페이지로 실시간 전환 (Team/Enterprise 베타) |
| Week 24 | **`/cd`** | 대화 중 작업 디렉토리 변경 (프롬프트 캐시 유지) |
| Week 24 | **5단계 서브에이전트 체인** | 서브에이전트가 자신의 서브에이전트 생성 가능 |
| Week 24 | **`fallbackModel`** | 최대 3개 폴백 모델 순차 시도 |
| Week 22 | **Dynamic Workflows** | 스크립트로 수십~수백 서브에이전트 오케스트레이션 |
| Week 22 | **Claude Opus 4.8** | Max/Team Premium 기본 모델, `/effort xhigh` 지원 |
| Week 21 | **`/usage`** | 스킬·서브에이전트·플러그인·MCP 서버별 사용량 분석 |
| Week 21 | **`/code-review`** | 정확성 버그 리포트 내장 스킬 |
| Week 20 | **`/goal`** | 완료 조건 만족까지 Claude가 자동으로 작업 지속 |
| Week 17 | **`/ultrareview`** | 클라우드 병렬 에이전트 플릿으로 버그 헌팅 |
| Week 13 | **Auto mode** | 권한 분류기로 안전한 작업 자동 승인, 위험 작업 차단 |

#### 스킬 시스템 구조 변경 [가설: 아직 공식 마이그레이션 완료 여부 미확인]
- **구 형식** (여전히 지원): `.claude/commands/<name>.md`
- **신 형식** (권장): `.claude/skills/<name>/SKILL.md`
- 신 형식 추가 기능: 자율 호출(Claude가 스스로 스킬 실행), frontmatter로 `model` 지정, 지원 파일 번들링

---

### 🔍 현재 설치된 스킬 현황

**프로젝트 레벨** (`brain180/.claude/`):
- `settings.local.json` — Bash 권한 3개 등록, 스킬 없음
- `launch.json` — Vite 개발서버 설정만 존재
- **설치된 스킬: 없음**

**글로벌 레벨** (`~/.claude/skills/`):
- `session-start-hook` — 세션 시작 훅만 존재

**세션에서 사용 가능한 번들 스킬** (시스템 프롬프트 기준):
| 스킬명 | 설명 |
|--------|------|
| `session-start-hook` | Claude Code 웹 환경 startup hook 설정 |
| `deep-research` | 멀티소스 팩트체크 리서치 리포트 생성 |
| `dataviz` | 차트/대시보드 시각화 디자인 가이드 |
| `artifact-design` | Artifact 디자인 가이드라인 |
| `update-config` | settings.json 설정 자동화/훅 구성 |
| `keybindings-help` | 키보드 단축키 커스터마이징 |
| `verify` | 코드 변경사항 end-to-end 검증 |
| `code-review` | 현재 diff 정확성·효율성 리뷰 |
| `simplify` | 코드 단순화·리팩토링 리뷰 |
| `fewer-permission-prompts` | 허용 명령어 allowlist 자동 생성 |
| `loop` | 주기적 반복 태스크 스케줄링 |
| `claude-api` | Claude API/Anthropic SDK 레퍼런스 |
| `run` | 앱 실행·스크린샷·기능 검증 |
| `init` | CLAUDE.md 초기화 |
| `review` | GitHub PR 리뷰 |
| `security-review` | 보안 취약점 리뷰 |
| `skill-creator` | 스킬 생성·수정·성능 측정 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| **multica-cli** | 신규 설치 | 🔴 높음 | 현재 이 루틴 자체가 Multica 이슈에 보고를 못하고 있음. `multica-ai/multica-cli` 리포의 SKILL.md를 `.claude/skills/multica-cli/SKILL.md`로 설치하면 이슈 코멘트 자동화 가능 |
| **deep-research** | 신규 설치 | 🔴 높음 | Alien Agentic WHY-HOW-WHAT 컨설팅에서 천재 인지 구조 리서치 자동화 핵심 |
| **dataviz** | 신규 설치 | 🟡 중간 | Brain180 시각화 (노드 그래프, 레이어 맵) 설계 시 디자인 일관성 확보 |
| **update-config** | 활성화 확인 | 🟡 중간 | 27명 에이전트 시스템 훅 자동화: `allowedTools`, 퍼미션 자동화 |
| **loop** | 활성화 확인 | 🟡 중간 | 현재 이 루틴 같은 스케줄 반복 태스크 관리에 활용 가능 |
| **auto mode** | 설정 변경 | 🟢 낮음 | [가설] Pro 플랜이라면 `/auto` 활성화로 루틴 실행 중 권한 프롬프트 제거 가능 |

---

### ⚠️ 오늘 발견된 장애

**multica CLI 설치 실패**: 이 루틴의 핵심 작업인 Multica 이슈 코멘트 제출이 아래 이유로 실패함.

1. `npm install -g @multica/cli` → npm 레지스트리에 패키지 없음 (E404)
2. `curl https://github.com/multica-ai/multica/releases/...` → 프록시 403 차단
3. `brew install multica-ai/tap/multica` → Homebrew 미설치 환경
4. `curl https://api.multica.ai/...` → 프록시 정책이 `multica.ai` 도메인 차단

**권장 조치**: `multica-ai/multica-cli` SKILL.md를 직접 클론하거나, 루틴 실행 환경에서 `multica.ai` 도메인을 허용 목록에 추가 필요.

---

### 📋 오늘의 액션 아이템

1. **[즉시] multica-cli 스킬 설치**: `https://github.com/multica-ai/multica-cli/blob/main/skills/multica-cli/SKILL.md` 내용을 `.claude/skills/multica-cli/SKILL.md`에 복사
2. **[즉시] 프록시 정책 검토**: `multica.ai` 도메인 접근 허용 여부 확인 (IT/운영팀)
3. **[이번 주] deep-research 스킬 활성화**: Brain180 천재 인지 구조 리서치 자동화
4. **[이번 주] dataviz 스킬 활성화**: Brain180 시각화 컴포넌트 설계 품질 향상
5. **[이번 주] Brain180 `.claude/skills/` 디렉토리 생성**: 프로젝트별 스킬 관리 체계화
6. **[다음 스프린트] Multica auto mode 설정**: 27명 에이전트 운영 시 권한 병목 제거

---

*Sources: [What's new - Claude Code Docs](https://code.claude.com/docs/en/whats-new) · [Slash Commands in the SDK](https://code.claude.com/docs/en/agent-sdk/slash-commands) · [multica-ai/multica-cli](https://github.com/multica-ai/multica-cli)*
