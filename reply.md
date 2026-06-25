## 🛸 스킬 발전 사항 일일 보고 — 2026년 6월 25일 KST

### 📡 최신 동향

**Claude Code v2.1.191** (2026-06-25 릴리즈 — 오늘 최신):
- **`/rewind` 명령어 추가**: `/clear` 실행 취소 및 이전 컨텍스트 복원 가능
- **CPU 37% 절감**: 스트리밍 업데이트 병합(coalesce)으로 성능 개선
- 백그라운드 에이전트가 stop 후 재시작되는 버그 수정
- 샌드박스 credential 차단 기능 추가
- 조직 단위 모델 제한(`availableModels`) 기능

**스킬 시스템 주요 업데이트** (공식 문서 기준):
- **커스텀 commands와 skills 통합 완료**: `.claude/commands/deploy.md`와 `.claude/skills/deploy/SKILL.md`가 동일하게 동작. 기존 commands 파일은 그대로 작동함
- **[Agent Skills 오픈 스탠다드](https://agentskills.io) 준수**: 여러 AI 툴에서 호환되는 표준
- **신규 번들 스킬**: `/run`, `/verify`, `/run-skill-generator` (v2.1.145 이상 필요)
  - `/run-skill-generator`: 프로젝트 실행 레시피를 `.claude/skills/run-<name>/`에 기록
- **`/reload-skills`**: 세션 재시작 없이 스킬 디렉토리 재스캔
- **`/cd`**: 세션 중 작업 디렉토리 변경 (프롬프트 캐시 유지)
- **[`skill-creator` 플러그인](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-creator)**: 스킬 품질 자동 평가 도구 (A/B 비교, pass rate 측정)
- **실시간 스킬 변경 감지**: 스킬 파일 수정 시 세션 재시작 없이 즉시 반영
- **컨텍스트 압축 후 스킬 유지**: 최근 호출된 스킬을 압축 후에도 재첨부 (최대 25,000 토큰)
- **`/doctor` 명령어**: 스킬 description이 잘려나가는 문제 진단

**신규 frontmatter 필드**:
| 필드 | 설명 |
|------|------|
| `paths` | 특정 파일 패턴 작업 시에만 스킬 활성화 |
| `hooks` | 스킬 라이프사이클 훅 |
| `disallowed-tools` | 스킬 활성 중 사용 금지 툴 지정 |
| `effort` | 스킬 실행 시 reasoning 수준 지정 |
| `shell` | inline 명령어 실행 셸 지정 (bash/powershell) |

**신규 문자열 치환 변수**:
- `${CLAUDE_SKILL_DIR}`: 스킬 파일 위치 (스크립트 번들 경로 참조용)
- `${CLAUDE_EFFORT}`: 현재 effort 레벨
- `${CLAUDE_SESSION_ID}`: 현재 세션 ID

---

### 🔍 현재 설치된 스킬 현황

**글로벌 번들 스킬** (모든 세션에서 사용 가능):
| 스킬 | 유형 | 설명 |
|------|------|------|
| `session-start-hook` | 번들 | SessionStart 훅 설정 |
| `deep-research` | 번들 | 멀티소스 팩트체크 리서치 |
| `update-config` | 번들 | settings.json 구성 업데이트 |
| `keybindings-help` | 번들 | 키바인딩 커스터마이즈 |
| `verify` | 번들 | 코드 변경사항 앱 실행 검증 |
| `code-review` | 번들 | 코드 리뷰 (diff 분석) |
| `simplify` | 번들 | 코드 단순화 리팩토링 |
| `fewer-permission-prompts` | 번들 | 권한 프롬프트 자동 허용 설정 |
| `loop` | 번들 | 반복 실행 스케줄링 |
| `claude-api` | 번들 | Claude/Anthropic API 레퍼런스 |
| `run` | 번들 | 앱 실행 및 확인 |
| `init` | 번들 | CLAUDE.md 초기화 |
| `review` | 번들 | GitHub PR 리뷰 |
| `security-review` | 번들 | 보안 리뷰 |

**프로젝트 레벨 스킬** (brain180):
- **없음** — `.claude/skills/` 디렉토리 미생성

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| `cognitive-map-analyzer` | 신규 프로젝트 스킬 | 🔴 HIGH | Brain180의 핵심 기능: 텍스트에서 인지 패턴 추출 자동화. CLAUDE.md에 기반한 CognitiveMap 스키마로 분석 워크플로 표준화 |
| `run-skill-generator` (설정) | 번들 스킬 활용 | 🔴 HIGH | `/run-skill-generator` 실행하여 brain180 dev 환경(Vite:5173) 레시피 기록. 현재 `.claude/launch.json` 있지만 스킬화 미완료 |
| `genius-text-extractor` | 신규 프로젝트 스킬 | 🟠 MEDIUM | 천재 텍스트 입력 → CognitiveNode/Edge 자동 추출 → JSON 출력. PatternExtractor.ts 개발 시 표준 워크플로 제공 |
| `component-checker` | 신규 프로젝트 스킬 | 🟠 MEDIUM | CLAUDE.md의 커밋 전 체크리스트(grep 4개) 자동 실행. 현재 수동 체크 → `/component-checker`로 자동화 |
| `skill-creator` 플러그인 설치 | 플러그인 | 🟡 LOW | `/plugin install skill-creator@claude-plugins-official` — 스킬 A/B 테스트 및 품질 측정 자동화 |
| `visualization-review` | 신규 프로젝트 스킬 | 🟡 LOW | D3.js/Three.js/Cytoscape.js 시각화 코드 검토 기준 표준화. `paths: src/core/VisualizationEngine/**` 설정 |

**[가설] 에이전트 시스템용 스킬** (27명 시스템 운영 관련):
- `agent-health-check`: 에이전트 상태 모니터링 워크플로 (multica autopilot과 연동)
- `daily-report`: 현재 이 보고서처럼 정형화된 일일 보고 자동화 (`disable-model-invocation: true`)

---

### 📋 오늘의 액션 아이템

1. **즉시**: `brain180/.claude/skills/` 디렉토리 생성 및 `component-checker` 스킬 추가
   ```bash
   mkdir -p .claude/skills/component-checker
   ```
   → CLAUDE.md의 grep 체크리스트 4개를 자동 실행하는 스킬

2. **이번 주**: `/run-skill-generator` 실행하여 brain180 Vite 개발환경 레시피 기록

3. **이번 주**: `skill-creator` 플러그인 설치 후 `cognitive-map-analyzer` 스킬 개발 및 품질 평가
   ```
   /plugin install skill-creator@claude-plugins-official
   ```

4. **확인 필요**: multica 자동화 세션에서 `MULTICA_TOKEN` 환경변수 설정 필요 (현재 multica 인증 불가 — OAuth 브라우저 플로우 필요). Settings → Personal Access Tokens에서 PAT 발급 후 환경 변수 등록 권장

---

*조사 출처: [Claude Code Skills 공식 문서](https://code.claude.com/docs/en/skills), [agentskills.io](https://agentskills.io), [multica-ai/multica GitHub](https://github.com/multica-ai/multica), [Claude Code 릴리즈 노트](https://claudefa.st/blog/guide/changelog)*
