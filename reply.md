## 🛸 스킬 발전 사항 일일 보고 — 2026-05-28 (KST)

### 📡 최신 동향

**Claude Code v2.1.152~v2.1.154 주요 업데이트 (2026년 5월)**

1. **Skills 2.0 통합 완료**: custom commands와 skills가 완전히 통합됨. `.claude/commands/deploy.md`와 `.claude/skills/deploy/SKILL.md`가 동일하게 `/deploy`를 생성하며 동작함. 기존 commands 파일은 자동 호환.

2. **신규 보안 플러그인 출시 (2026-05-27)**: `security-guidance` 플러그인이 공식 출시됨 (무료, 전체 플랜 지원). `eval()`, `os.system()`, SQL 인젝션, XSS 등 25개 고위험 취약점 클래스를 실시간 탐지. 내부 테스트에서 PR 보안 리뷰 코멘트 **30~40% 감소** 효과 확인.

3. **Opus 4.8 기본 모델 채택**: `/effort xhigh` 레벨에서 Opus 4.8 사용 가능. Fast mode에서 2x 요금으로 2.5x 속도 제공.

4. **`/simplify` 재설계**: 전체 코드 리뷰가 아닌 정리(cleanup) 전용으로 변경됨 (재사용, 단순화, 효율, 고도 정리 후 자동 적용).

5. **`/goal` 명령 추가**: 완료 조건을 설정하면 Claude가 목표 달성까지 자동 실행. 경과 시간/턴/토큰 실시간 추적.

6. **Plugin 생태계 성숙**: `disallowed-tools` frontmatter, `skillOverrides` 설정, plugin 의존성 관리(`prune`, `enable`, `disable` 강제), 테마 번들 지원 추가.

7. **MCP 개선**: `alwaysLoad` 옵션 추가로 도구 검색 없이 항상 로드 가능. stdio 서버에 `CLAUDE_PROJECT_DIR` 환경변수 자동 주입.

8. **OpenTelemetry 강화**: `claude_code.skill_activated` 이벤트, `agent_id`/`parent_agent_id` span 속성 추가로 멀티에이전트 추적 개선.

---

### 🔍 현재 설치된 스킬 현황

**글로벌 스킬 (`~/.claude/skills/`)**
| 스킬명 | 상태 | 설명 |
|-------|------|-----|
| `session-start-hook` | ✅ 설치됨 | Claude Code 웹 세션 시작 훅 생성 지원 |

**시스템 번들 스킬 (현재 세션 기준)**
| 스킬명 | 유형 | 설명 |
|-------|------|-----|
| `autopilot` | 번들 | 엔드투엔드 작업 자동 실행 + PR 생성 |
| `bugfix` | 번들 | 재현 우선 버그 수정 워크플로 |
| `dashboard` | 번들 | 데이터 소스 기반 대시보드 생성 |
| `docs` | 번들 | 문서 생성 및 업데이트 |
| `investigate` | 번들 | 근본 원인 조사 보고서 |
| `deep-research` | 번들 | 멀티소스 팩트체크 리서치 보고서 |
| `update-config` | 번들 | settings.json 설정 자동화 |
| `keybindings-help` | 번들 | 키보드 단축키 설정 |
| `verify` | 번들 | 코드 변경 사항 검증 |
| `code-review` | 번들 | 코드 리뷰 (--fix, --comment 옵션) |
| `simplify` | 번들 | 코드 정리 자동 적용 |
| `fewer-permission-prompts` | 번들 | 권한 프롬프트 최소화 설정 |
| `loop` | 번들 | 반복 작업 예약 실행 |
| `claude-api` | 번들 | Claude API/Anthropic SDK 개발 지원 |
| `run` | 번들 | 앱 실행 및 동작 확인 |
| `init` | 번들 | CLAUDE.md 초기화 |
| `review` | 번들 | PR 리뷰 |
| `security-review` | 번들 | 보안 리뷰 |

**프로젝트 수준 스킬 (brain180)**
- 없음 (`.claude/commands/` 또는 `.claude/skills/` 디렉토리 미존재)

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| `security-guidance` plugin | 신규 플러그인 | 🔴 긴급 | 2026-05-27 공식 출시. Brain180 Claude API 코드 개발 시 보안 취약점 실시간 탐지. PR 보안 이슈 30~40% 감소 효과 확인됨 |
| `alien-consulting` | 프로젝트 커스텀 스킬 | 🟠 높음 | WHY-HOW-WHAT 컨설팅 워크플로를 스킬로 정의하면 27명 에이전트 시스템에서 일관된 컨설팅 패턴 실행 가능 |
| `cognitive-map-extractor` | 프로젝트 커스텀 스킬 | 🟠 높음 | Brain180 핵심 기능인 텍스트→인지구조 추출을 `/extract-cognitive-map` 스킬로 표준화. Claude API 호출 패턴 재사용 |
| `agent-orchestrator` | 프로젝트 커스텀 스킬 | 🟡 중간 | 27명 에이전트 시스템 오케스트레이션을 `/orchestrate` 스킬로 정의. `/goal` 명령과 연계하여 자동화 가능 |
| `multica-reporter` | 프로젝트 커스텀 스킬 | 🟡 중간 | 이 일일 보고 작업 자체를 스킬로 표준화. `/daily-report` 명령으로 매일 같은 절차 자동 실행 |
| Skills Eval 테스트 | 기존 스킬 개선 | 🟡 중간 | Skills 2.0의 A/B 테스트 및 eval 기능을 사용하여 `session-start-hook` 스킬 효과 측정 |
| `OTel + multica` 통합 | 인프라 | 🔵 낮음 | [가설] Claude Code의 `claude_code.skill_activated` OpenTelemetry 이벤트를 multica 이슈 자동 업데이트에 연결 가능성 검토 필요 |

---

### 📋 오늘의 액션 아이템

1. **[즉시] `security-guidance` 플러그인 설치**
   ```bash
   # Claude Code 세션에서 실행
   /plugins
   # Marketplace에서 security-guidance 검색 후 설치
   ```
   Brain180 Claude API 코드 및 JS/TS 컴포넌트 개발 시 즉시 적용 가능.

2. **[이번 주] `alien-consulting` 커스텀 스킬 초안 작성**
   WHY-HOW-WHAT 3레이어 컨설팅 프레임워크를 스킬 frontmatter와 함께 정의.
   `user-invocable: true` 설정으로 `/alien-consulting` 명령 생성.

3. **[이번 주] `cognitive-map-extractor` 스킬 작성**
   Brain180 프로젝트 내 `.claude/skills/cognitive-map-extractor/SKILL.md` 생성.
   `PatternExtractor.ts`와 연동하는 표준 프롬프트 템플릿 포함.

4. **[다음 주] `/goal` 명령 활용 자동화 워크플로 설계**
   `/goal` 명령으로 "Brain180 MVP 완성"을 목표로 설정하고 멀티에이전트 오케스트레이션 실험.

5. **[확인 필요] multica 0.3.11 인증 설정**
   이 환경에서 `multica login`으로 인증 후 알림 수신 설정 검토.

---

*조사 출처: [Claude Code Changelog](https://code.claude.com/docs/en/changelog) · [Skills Docs](https://code.claude.com/docs/en/skills) · [Security Plugin 발표](https://cybersecuritynews.com/anthropic-updates-claude-code/) · [Releasebot May 2026](https://releasebot.io/updates/anthropic/claude-code)*
