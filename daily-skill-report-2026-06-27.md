## 🛸 스킬 발전 사항 일일 보고 — 2026-06-27 KST

### 📡 최신 동향

**Claude Code v2.1.195 (2026-06-26 최신)** 기준 핵심 변경 사항:

- **`/rewind` 명령 추가** (v2.1.191): `/clear` 실행 이전 대화로 되돌아갈 수 있는 새 빌트인 커맨드. 실수로 컨텍스트를 날린 경우 복구 가능.
- **`/reload-skills` 명령 추가** (v2.1.178): 세션 재시작 없이 스킬 디렉토리 재스캔. SessionStart 훅에서 `reloadSkills: true` 반환 시 자동 트리거.
- **`/cd` 명령 추가** (v2.1.169): 프롬프트 캐시 깨지 않고 세션 작업 디렉토리 이동.
- **`/run`, `/verify`, `/run-skill-generator`** (v2.1.145): 앱 직접 실행 후 코드 변경 검증하는 번들 스킬 3종. 테스트 없이 실제 앱 동작으로 확인.
- **중첩 서브에이전트 지원** (v2.1.172): 서브에이전트가 자신의 서브에이전트를 최대 5레벨까지 생성 가능.
- **Agent 스폰 방식 변경** (v2.1.178): `TeamCreate`/`TeamDelete` 툴 제거. Agent 툴의 `name` 파라미터로 직접 팀원 생성.
- **[가설] Fable 5 모델** (v2.1.170): Mythos급 신모델 출시. 가장 높은 능력치이나 현재 세션은 Sonnet 4.6 사용 중.
- **`disallowed-tools` frontmatter** (v2.1.152): 스킬/슬래시 커맨드에서 특정 툴을 모델에게 숨길 수 있음.
- **스킬 Frontmatter 개선** (v2.1.186): `display-name`, `default-enabled`, `fallback`, `metadata.*` 키가 kebab-case, snake_case, camelCase 모두 허용.
- **동적 워크플로우** (v2.1.154): `/workflows` 커맨드로 수십~수백 에이전트가 백그라운드에서 협업. 트리거 키워드: `ultracode`.

**스킬 시스템 구조 변경:**
- `.claude/commands/` 와 `.claude/skills/` 가 통합 — 동일한 슬래시 커맨드로 작동
- 스킬이 [Agent Skills](https://agentskills.io) 오픈 스탠더드 준수 (다른 AI 툴과 호환)
- 중첩 디렉토리의 `.claude/skills/`도 자동 로드 (모노레포 지원)
- Live Change Detection: 스킬 파일 수정 시 세션 재시작 없이 즉시 반영

---

### 🔍 현재 설치된 스킬 현황 (brain180 / alienkky)

**프로젝트 레벨 (brain180/.claude/):**
- 스킬 없음 (`.claude/skills/` 디렉토리 미존재)
- `settings.local.json`: 일부 허용 퍼미션만 존재
- `launch.json`: Vite 개발 서버 설정만 존재

**사용자 전역 레벨 (~/.claude/skills/):**
| 스킬명 | 설명 |
|--------|------|
| `session-start-hook` | 웹 세션의 SessionStart 훅 생성/개발용 스킬 |

**번들 스킬 (Claude Code 내장):**
| 스킬 | 용도 |
|------|------|
| `/code-review` | 코드 정확성 버그 검토 (effort 레벨 조절) |
| `/debug` | 디버깅 지원 |
| `/loop` | 반복 실행 스케줄 |
| `/batch` | 배치 작업 |
| `/claude-api` | Claude API 레퍼런스 |
| `/run` | 앱 실제 실행 및 확인 |
| `/verify` | 코드 변경사항 앱 기준 검증 |
| `/run-skill-generator` | run/verify용 프로젝트 레시피 생성 |
| `/deep-research` | 다중 소스 팩트체크 리서치 리포트 |
| `/update-config` | settings.json 구성 변경 |
| `/security-review` | 보안 검토 |
| `/simplify` | 코드 간소화 리뷰 |
| `/init` | CLAUDE.md 초기화 |
| `/review` | GitHub PR 검토 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `why-how-what-analyzer` | 커스텀 스킬 | 🔴 높음 | Alien Agentic 핵심 WHY-HOW-WHAT 컨설팅 워크플로를 스킬화. 매번 프롬프트 반복 방지 |
| `agent-dispatch` | 커스텀 스킬 | 🔴 높음 | 27명 에이전트 시스템에서 올바른 에이전트 배정 로직을 스킬로 추출 |
| `brain180-visualize` | 프로젝트 스킬 | 🔴 높음 | 텍스트 → 인지 구조 시각화 분석 워크플로 (brain180 핵심 기능) |
| `run-skill-generator` | 번들 스킬 활성화 | 🟡 중간 | brain180의 `/run`, `/verify` 지원을 위해 프로젝트 레시피 먼저 생성 권장 |
| `multica-report` | 커스텀 스킬 | 🟡 중간 | 일일 보고서 작성 및 Multica 이슈 코멘트 제출 자동화 |
| `cognitive-pattern-extractor` | 커스텀 스킬 | 🟡 중간 | 고전 텍스트에서 뇌인지 패턴(노드/엣지/레이어) 자동 추출 AI 스킬 |
| `session-start-hook` (업그레이드) | 기존 스킬 개선 | 🟢 낮음 | brain180 프로젝트용 `CLAUDE_CODE_REMOTE` 조건부 `npm install` 훅 추가 |
| `ultracode-workflow` | 워크플로 스킬 | 🟢 낮음 | 27에이전트 병렬 작업을 동적 워크플로로 구조화 (v2.1.154+ 필요) |

---

### 📋 오늘의 액션 아이템

1. **brain180 프로젝트 스킬 디렉토리 생성**: `.claude/skills/` 폴더 없음 → `brain180-visualize` 스킬부터 추가
2. **`/run-skill-generator` 실행**: brain180이 Vite 기반이므로 `/run`, `/verify` 연동 레시피 생성 (v2.1.145+ 환경에서)
3. **WHY-HOW-WHAT 스킬 설계**: Alien Agentic 컨설팅의 핵심 3단계 분석을 `~/.claude/skills/why-how-what/SKILL.md`로 정의
4. **에이전트 배정 스킬 설계**: 27명 에이전트 라우팅 로직을 `disallowed-tools` frontmatter와 함께 스킬화
5. **multica 인증 설정**: 현재 원격 실행 환경에서 multica CLI 인증이 미설정 상태 → `MULTICA_SERVER_URL` + `MULTICA_AUTH_TOKEN` 환경 변수 또는 `multica login` 필요
6. **`/rewind` 활용 교육**: 에이전트들이 실수로 `/clear` 실행 시 `/rewind`로 복구 가능함을 팀에 공유
7. **Nested Subagent 5레벨 아키텍처 검토**: v2.1.172의 중첩 서브에이전트 기능을 27명 에이전트 계층 구조 설계에 활용

---

### 🔗 참고 자료
- [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills)
- [Claude Code Changelog](https://code.claude.com/docs/en/changelog)
- [Agent Skills 오픈 스탠더드](https://agentskills.io)
- [Multica GitHub](https://github.com/multica-ai/multica)
