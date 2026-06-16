# 🛸 스킬 발전 사항 일일 보고 — 2026-06-16 KST

> **보고 주체**: Alien Agentic subagent-builder  
> **대상 이슈**: ALI-14 (Multica 이슈 ID: `0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7`)  
> **비고**: multica CLI 인증 토큰 미설정으로 인해 GitHub 파일로 대체 보고

---

## 📡 최신 동향

### Claude Code v2.1.178–179 (2026-06-15~16) — 오늘 배포된 변경사항

| 버전 | 날짜 | 핵심 변경 |
|-----|------|----------|
| v2.1.179 | 2026-06-16 | 스트림 중간 끊김 복구, 플러그인 로드 성능 개선, sandbox glob 성능 수정 |
| v2.1.178 | 2026-06-15 | **중첩 디렉토리 스킬 로드** (`<dir>:<name>` 충돌 처리), `Tool(param:value)` 퍼미션 문법 추가, 중첩 `.claude/` 우선순위 확정 |

### 최근 2주 주요 업데이트 요약

#### 스킬(Skills) 시스템
- **v2.1.178**: `.claude/skills/` 중첩 디렉토리 자동 로드, 이름 충돌 시 `dir:name` 형식으로 구분
- **v2.1.169**: 스킬 프론트매터에 `disallowed-tools` 설정 지원 (활성화 시 특정 도구 제거)
- **v2.1.169**: `/reload-skills` 명령어 추가 (재시작 없이 스킬 디렉토리 재스캔)
- **v2.1.152**: `SessionStart` 훅이 `reloadSkills: true` 반환 가능
- **2026 통합**: 커스텀 명령어와 스킬이 동일 메커니즘으로 통합됨

#### 플러그인(Plugin) 시스템
- **v2.1.157+**: 플러그인이 `.claude/skills/` 디렉토리에서 자동 로드 (마켓플레이스 없이도 가능)
- `claude plugin init <name>` 스캐폴딩 명령어 신설
- `defaultEnabled: false` 설정으로 선택적 플러그인 지원
- `/plugin` UI: Discover / Installed / Marketplaces / Errors 탭 구성
- 플러그인 세부 정보에 **컨텍스트 비용** 토큰 수 표시

#### 훅(Hooks)
- **v2.1.169**: `post-session` 라이프사이클 훅 추가 (워크스페이스 스냅샷/로그 내보내기)
- `MessageDisplay` 훅: 어시스턴트 메시지 텍스트 변환
- `PostToolUse` 훅에 `continueOnBlock: true` 지원 (차단 이유를 Claude에게 피드백)
- 훅 `args: string[]` 필드 (exec form) 지원

#### 새 슬래시 명령어
- `/goal`: 완료 조건 설정, Claude가 조건 충족까지 자율 작업
- `/cd`: 세션 이동 (프롬프트 캐시 유지)
- `/reload-skills`: 스킬 디렉토리 재스캔
- `/code-review`: `/simplify` 이름 변경, `--comment` 플래그로 GitHub PR 인라인 코멘트 게시
- `/workflows`: 동적 워크플로 실행 현황 보기

#### 에이전트 시스템
- **v2.1.172**: 서브에이전트가 자체 서브에이전트 생성 가능 (최대 5단계 중첩)
- **v2.1.154**: 동적 워크플로 — 수십~수백 개 에이전트 오케스트레이션
- **v2.1.139**: `claude agents` — 통합 세션 대시보드

#### 새 모델
- **v2.1.170** (2026-06-09): **Claude Fable 5** (Mythos-class) — 현재까지 가장 강력한 범용 모델

---

## 🔍 현재 설치된 스킬 현황 (brain180 프로젝트)

### 프로젝트 레벨 (`.claude/`)
| 파일 | 내용 |
|------|------|
| `settings.local.json` | 퍼미션 허용 3개 (node 실행, find, Read) |
| `launch.json` | Vite dev 서버 설정 (포트 5173) |
| **`.claude/skills/` 디렉토리** | **없음 — 현재 프로젝트 전용 스킬 없음** |

### 세션 레벨 (현재 Claude Code 세션에 활성화된 번들 스킬)

| 스킬 이름 | 설명 |
|----------|------|
| `session-start-hook` | 세션 시작 훅 설정 |
| `deep-research` | 멀티소스 팩트체크 리서치 |
| `update-config` | settings.json 설정 관리 |
| `keybindings-help` | 키바인딩 커스터마이즈 |
| `verify` | 코드 변경 실제 동작 검증 |
| `code-review` | PR/코드 버그·최적화 리뷰 |
| `simplify` | 코드 정리/단순화 |
| `fewer-permission-prompts` | 퍼미션 프롬프트 최소화 |
| `loop` | 반복 실행 스케줄러 |
| `claude-api` | Claude/Anthropic API 참조 |
| `run` | 앱 실행 및 테스트 |
| `init` | CLAUDE.md 초기화 |
| `review` | PR 리뷰 |
| `security-review` | 보안 리뷰 |

---

## 🚀 추천 업데이트

### Alien Agentic 27명 에이전트 시스템에 필요한 스킬

| 스킬/플러그인명 | 유형 | 우선순위 | 이유 |
|--------------|------|---------|------|
| `post-session` 훅 | 훅 | 🔴 HIGH | 각 에이전트 세션 종료 시 로그 자동 내보내기 — 27명 운영 추적 필수 |
| `goal` 스킬 활용 | 내장 슬래시 | 🔴 HIGH | `/goal` 명령으로 에이전트별 완료 조건 설정, WHY-HOW-WHAT 컨설팅 단계별 자율 진행 |
| `agent-sdk-dev` 플러그인 | 공식 플러그인 | 🔴 HIGH | Claude Agent SDK 개발 도구 — 멀티에이전트 오케스트레이션 빌드에 직접 활용 |
| `commit-commands` 플러그인 | 공식 플러그인 | 🟠 MEDIUM | git 워크플로 자동화 (commit/push/PR) — 각 에이전트의 작업 결과물 관리 |
| `pr-review-toolkit` 플러그인 | 공식 플러그인 | 🟠 MEDIUM | PR 리뷰 전문 에이전트 — 코드 품질 게이트 자동화 |
| `security-guidance` 플러그인 | 공식 플러그인 | 🟠 MEDIUM | 코드 변경마다 자동 보안 리뷰 — Claude Code 번들 `security-review`보다 세밀 |
| `github` 플러그인 | 공식 플러그인 | 🟠 MEDIUM | MCP 서버 포함 GitHub 통합 — 이슈/PR 관리 자동화 |
| `linear` 플러그인 | 공식 플러그인 | 🟡 LOW | 프로젝트 관리 연동 (Linear 사용 시) |
| `slack` 플러그인 | 공식 플러그인 | 🟡 LOW | 에이전트 활동 알림 채널 연동 |
| 중첩 스킬 디렉토리 구조 | 아키텍처 | 🔴 HIGH | v2.1.178 신기능: `.claude/skills/<agent-name>/` 패턴으로 에이전트별 전문 스킬 분리 가능 |

### Alien Agentic WHY-HOW-WHAT 컨설팅 워크플로용 커스텀 스킬 제안

| 제안 스킬명 | 구현 방법 | 설명 |
|------------|---------|------|
| `why-analysis` | `.claude/skills/why-analysis.md` | 클라이언트 WHY 추출: 핵심 문제/목적 분석 프롬프트 템플릿 |
| `how-design` | `.claude/skills/how-design.md` | HOW 설계: 전략/방법론 설계 가이드 |
| `what-spec` | `.claude/skills/what-spec.md` | WHAT 명세: 구현 스펙 생성 및 검증 |
| `agent-handoff` | `.claude/skills/agent-handoff.md` | 에이전트 간 컨텍스트 이관 표준화 (27명 협업 구조) |
| `daily-standup` | `.claude/skills/daily-standup.md` | 일일 에이전트 현황 수집 및 요약 (본 보고와 유사) |

### 즉시 설치 가능한 공식 플러그인 명령어

```bash
# 에이전트 SDK 개발 도구
/plugin install agent-sdk-dev@claude-plugins-official

# Git 워크플로 자동화
/plugin install commit-commands@claude-plugins-official

# PR 리뷰 전문 에이전트
/plugin install pr-review-toolkit@claude-plugins-official

# 자동 보안 리뷰
/plugin install security-guidance@claude-plugins-official

# GitHub MCP 통합
/plugin install github@claude-plugins-official

# 커뮤니티 마켓플레이스 추가 (선택)
/plugin marketplace add anthropics/claude-plugins-community
```

---

## 📋 오늘의 액션 아이템

1. **[긴급] multica CLI 인증 설정** — `MULTICA_TOKEN` 환경변수를 Claude Code 원격 세션 환경변수로 등록 필요. 현재 스케줄 루틴이 multica에 직접 보고 불가.
2. **[HIGH] `post-session` 훅 구성** — 27명 에이전트 세션 로그 자동 수집 체계 구축
3. **[HIGH] `.claude/skills/` 디렉토리 생성** — brain180 프로젝트 전용 스킬 3개(why-analysis, how-design, what-spec) 우선 작성
4. **[HIGH] `/goal` 명령어 에이전트 워크플로 통합** — WHY→HOW→WHAT 각 단계별 완료 조건 명세 표준화
5. **[MEDIUM] `agent-sdk-dev` + `commit-commands` 플러그인 설치** — 현재 세션에서 즉시 가능
6. **[MEDIUM] `v2.1.178` 중첩 스킬 구조 활용** — 에이전트별 `.claude/skills/<role>/` 패턴 설계
7. **[LOW] `claude agents` 대시보드 활용** — 27명 에이전트 세션 통합 모니터링

---

## ⚠️ 기술 부채 및 리스크

| 항목 | 현황 | 조치 필요 |
|------|------|---------|
| multica 인증 | 스케줄 환경에 토큰 없음 | `MULTICA_TOKEN` 환경변수 등록 |
| 스킬 디렉토리 | brain180 프로젝트에 없음 | `.claude/skills/` 생성 필요 |
| Fable 5 모델 | 이번 달 출시 | 에이전트 모델 업그레이드 검토 |
| 동적 워크플로 | v2.1.154+ 지원 | 27명 에이전트 오케스트레이션 마이그레이션 검토 |

---

*Sources: [Claude Code Changelog](https://code.claude.com/docs/en/changelog) · [Discover Plugins Docs](https://code.claude.com/docs/en/discover-plugins) · [Toolradar Blog](https://toolradar.com/blog/best-claude-code-skills-2026) · [MarkTechPost](https://www.marktechpost.com/2026/06/14/claude-code-guide-2026-25-features-with-examples-demo/) · [Releasebot](https://releasebot.io/updates/anthropic/claude-code)*
