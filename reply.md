## 🛸 스킬 발전 사항 일일 보고 — 2026-06-22 KST

### 📡 최신 동향 (Claude Code Skills — 2026년 6월 22일)

**최신 버전: v2.1.186** (2026-06-22 오늘 릴리즈)

#### 이번 주 요약 (Jun 16-22, 2026 · v2.1.179~v2.1.186)

| 버전 | 날짜 | 스킬/훅/MCP 관련 핵심 변경 |
|------|------|--------------------------|
| v2.1.186 | Jun 22 | **오늘** MCP CLI auth (`claude mcp login/logout`), `!` bash 자동응답, 스킬 frontmatter kebab/snake/camelCase 통합 지원, 말형성 SKILL.md 오류 시 body는 로드 |
| v2.1.185 | Jun 20 | Stream stall 힌트 타이밍 10초→20초, 오탐 감소 |
| v2.1.183 | Jun 19 | Auto mode 파괴 명령 차단 강화; `/config --help` 신규 |
| v2.1.181 | Jun 17 | `/config key=value` 인라인 문법; MCP OAuth 스타일 통합; `sandbox.allowAppleEvents` |
| v2.1.179 | Jun 16 | Connection drop 재연결 개선 |

#### 오늘 (v2.1.186) 스킬 관련 핵심 변경 상세

**1. SKILL.md frontmatter 포맷 유연성 향상**
```yaml
# 이제 세 가지 모두 동일하게 동작
display-name: My Skill     # kebab-case
display_name: My Skill     # snake_case  
displayName: My Skill      # camelCase

default-enabled: true      # kebab
default_enabled: true      # snake
defaultEnabled: true       # camel
```

**2. 말형성(Malformed) SKILL.md 처리 개선**
- 이전: YAML 오류 시 스킬 전체 로드 실패 + 조용히 무시
- 현재: YAML 오류 시 frontmatter는 비워두고 **body는 로드** → 스킬 실행 가능

**3. MCP CLI 인증 명령어 신규 (비대화형 자동화용)**
```bash
claude mcp login <name>        # 대화형 메뉴 없이 인증
claude mcp logout <name>       # CLI에서 로그아웃
# --no-browser: SSH stdin 리디렉션 환경용
```

**4. `!` bash 명령 자동응답**
- 프롬프트에서 `!command` 실행 시 Claude가 자동 응답
- 비활성화: `"respondToBashCommands": false`
- [Alien Agentic 관련] 27명 에이전트 시스템에서 bash 트리거 자동화 가능

**5. `--fallback-model`과 스킬 컴팩션 연동**
- 스킬 컴팩션이 `--fallback-model` 설정 시에도 올바르게 동작

#### 이번 주 누적 주요 업데이트 요약 (어제 보고 이후)

- **v2.1.178** (Jun 15): Agent Teams 오버홀 (`TeamCreate`/`TeamDelete` 제거, 암묵적 팀), 중첩 스킬 디렉토리, `Tool(param:value)` 권한 문법
- **v2.1.172** (Jun 10): 중첩 Sub-Agent 5단계 깊이 지원
- **v2.1.170** (Jun 9): Claude Fable 5 릴리즈
- **v2.1.169** (Jun 8): Post-session 훅, `/cd` 명령어, `--safe-mode` 플래그

---

### 🔍 현재 설치된 스킬 현황

#### 글로벌 스킬 (`~/.claude/skills/`)
| 스킬명 | 파일 | 상태 |
|--------|------|------|
| `session-start-hook` (= `startup-hook-skill`) | `~/.claude/skills/session-start-hook/SKILL.md` | ✅ 설치됨 |

#### 프로젝트 스킬 (`brain180/.claude/skills/`)
| 스킬명 | 상태 |
|--------|------|
| (없음) | ❌ 미설치 |

#### 세션 Bundled Skills (이 세션 전체 목록)
| 스킬 | 설명 |
|------|------|
| `/session-start` | 세션 시작 시 의존성 설치 훅 자동 생성 |
| `/deep-research` | 다중 소스 팩트체크 리서치 보고서 |
| `/update-config` | settings.json 훅/자동화 구성 |
| `/keybindings-help` | 키보드 단축키 커스터마이징 |
| `/verify` | 코드 변경사항 실제 동작 검증 |
| `/code-review` | diff 버그·효율성 리뷰 |
| `/simplify` | 코드 간소화 및 정리 |
| `/fewer-permission-prompts` | 허용리스트 추가로 권한 프롬프트 최소화 |
| `/loop` | 주기적 반복 프롬프트 실행 |
| `/run` | 앱 실행 및 동작 확인 |
| `/review` | PR 리뷰 |
| `/security-review` | 보안 리뷰 |
| `/init` | CLAUDE.md 초기화 |
| `/claude-api` | Claude API 레퍼런스 (Fable 5, Opus 4.8 포함 최신 모델) |

#### 현재 설정 파일 현황 (brain180)
- `.claude/settings.local.json`: 기본 권한 설정만 존재, skills 관련 설정 없음
- `.claude/launch.json`: 실행 환경 설정만 존재
- `disableBundledSkills`: 미설정 (번들 스킬 전체 활성 상태)

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `.claude/skills/why-how-what/SKILL.md` | 커스텀 신규 | 🔴 HIGH | Alien Agentic 핵심 컨설팅 프레임워크. `disallowed-tools: [Edit, Write]`로 분석 전용 모드 보장. v2.1.186 frontmatter 포맷 자유도 활용 가능 |
| `SessionStart` 훅 → `reloadSkills: true` | 훅 업데이트 | 🔴 HIGH | 새 스킬 자동 설치 후 세션 재시작 없이 즉시 활성화. 27명 에이전트 시스템 필수 |
| `.claude/skills/multica-report/SKILL.md` | 커스텀 신규 | 🔴 HIGH | 이 보고 루틴 스킬화. `disallowed-tools: [Bash(rm*)]` 안전 보장 |
| v2.1.186 `!bash` 자동응답 활용 | 신기능 적용 | 🟡 MEDIUM | 에이전트 출력에서 `!multica issue comment add ...` 트리거로 자동 제출 파이프라인 구성 가능 |
| 중첩 스킬 디렉토리 구조 도입 | v2.1.178 신기능 | 🟡 MEDIUM | `.claude/skills/brain180/`, `.claude/skills/alien-agentic/` 분류. `brain180:cognitive-map` 형식 네임스페이싱 |
| `.claude/skills/cognitive-map-gen/SKILL.md` | 커스텀 신규 | 🟡 MEDIUM | brain180 텍스트 → CognitiveMap JSON 자동 추출 보조 스킬 |
| `Agent(model:opus)` 권한 규칙 적용 | v2.1.178 신기능 | 🟡 MEDIUM | 27명 에이전트 시스템에서 모델별 허용/차단 정책 세밀하게 제어 |
| MCP CLI 비대화형 인증 활용 | v2.1.186 신기능 | 🟢 LOW | `claude mcp login --no-browser`로 자동화된 MCP 서버 인증 가능 |

#### 오늘 당장 적용 가능한 `.claude/skills/multica-report/SKILL.md` 초안 (v2.1.186 반영)
```markdown
---
name: multica-report
display-name: Multica Daily Report
description: Claude Code 스킬 발전 사항을 조사하고 Multica ALI-14 이슈에 일일 보고합니다
disallowed-tools: [Bash(rm*), Bash(git reset*), Bash(git clean*)]
default-enabled: true
---

1. 최신 Claude Code changelog 조사 (https://code.claude.com/docs/en/changelog)
2. 현재 설치 스킬 현황 파악 (~/.claude/skills/, .claude/skills/)
3. 오늘 날짜 KST 기준 보고서를 reply.md에 작성
4. multica issue comment add 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7 --content-file ./reply.md 로 제출
5. 제출 실패 시 reply.md를 git commit 및 push로 기록 보존
```

---

### 📋 오늘의 액션 아이템

1. **[즉시]** multica 서버 URL 및 인증 토큰을 환경변수(`MULTICA_SERVER_URL`, `MULTICA_TOKEN`)로 설정 — multica v0.3.27 설치 완료, 인증만 미완료
2. **[즉시]** v2.1.186 `!bash` 자동응답 기능 테스트 — `"respondToBashCommands": true` 기본값 확인
3. **[단기]** `.claude/skills/why-how-what/SKILL.md` 생성 — WHY-HOW-WHAT 컨설팅 프레임워크 스킬화 (v2.1.186 kebab/snake/camelCase frontmatter 자유 선택)
4. **[단기]** `.claude/skills/multica-report/SKILL.md` 생성 — 이 보고 루틴 자동화
5. **[단기]** `SessionStart` 훅에 `reloadSkills: true` 반환 추가
6. **[단기]** brain180 `.claude/skills/cognitive-map-gen/` 스킬 생성 (뇌인지 구조 분석 보조)
7. **[중기]** 중첩 스킬 디렉토리 구조 (`brain180:*` vs `alien-agentic:*`) 확립
8. **[중기]** v2.1.172 5단계 중첩 Sub-Agent 구조를 27명 에이전트 계층에 매핑

---

### ⚠️ 인프라 이슈

- **multica CLI v0.3.27**: 오늘 최신 버전으로 재설치 성공 — 단, 서버 URL·인증 미설정으로 이슈 코멘트 제출 불가
- **MULTICA_SERVER_URL 환경변수**: 세션 환경에 설정되지 않음 (운영자 설정 필요)
- **자동 제출 실패**: `multica issue comment add 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7` 실행 불가
- **대안 실행**: 이 reply.md를 brain180 리포에 커밋하여 기록 보존

---

*조사 소스: [Claude Code Changelog](https://code.claude.com/docs/en/changelog), multica CLI v0.3.27 (`--help`), 현재 세션 번들 스킬 목록*
