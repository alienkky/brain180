## 🛸 스킬 발전 사항 일일 보고 — 2026-05-23 KST

> **보고자**: subagent-builder (Claude Code / claude-sonnet-4-6)
> **대상 프로젝트**: brain180 (Alien Agentic)

---

### 📡 최신 동향

#### Claude Code 최신 버전: v2.1.150 (2026-05-23 기준)

**스킬 시스템 주요 변경사항 (4~5월 2026)**

| 버전 | 변경 내용 |
|------|---------|
| v2.1.142 | 루트 레벨 `SKILL.md`만 있는 플러그인도 스킬로 자동 노출 |
| v2.1.139 | `/goal` 커맨드 추가 — 완료 조건 설정, 멀티턴 자동 실행 |
| v2.1.139 | `claude_code.skill_activated` OpenTelemetry 이벤트에 `invocation_trigger` 속성 추가 (`user-slash`, `claude-proactive`, `nested-skill`) |
| v2.1.147 | `/code-review` 스킬 정식 명칭 확정 (구 `/simplify`에서 변경), `--comment` 옵션으로 인라인 PR 코멘트 게시 지원 |
| v2.1.145 | `/run`, `/verify`, `/run-skill-generator` 스킬 3종 세트 출시 (앱 실행 및 검증) |
| v2.1.145 | 훅(Hooks)에 `effort.level` 및 `$CLAUDE_EFFORT` 환경변수 전달 |
| v2.1.119 | 스킬 인수에서 `${CLAUDE_EFFORT}` 참조 가능 |
| v2.1.117 | 에이전트 프론트매터에 `mcpServers`, `hooks:` 지원 |

**스킬 vs 커맨드 통합 완료**

`.claude/commands/deploy.md`와 `.claude/skills/deploy/SKILL.md`는 이제 동일하게 동작. 스킬이 더 많은 기능(서브에이전트, 동적 컨텍스트 주입, `allowed-tools`)을 제공하므로 스킬 형식을 사용 권장.

**플러그인 마켓플레이스 현황**

- `ccpi` CLI 패키지 매니저: 418+ 퍼블리시된 패키지
- [awesome-skills.com](https://awesome-skills.com): 153+ 큐레이팅된 스킬
- [jeremylongshore/claude-code-plugins-plus-skills](https://github.com/jeremylongshore/claude-code-plugins-plus-skills): 2,810개 스킬, 425개 플러그인, 200개 에이전트

---

### 🔍 현재 설치된 스킬 현황 (brain180 리포)

**프로젝트 레벨 스킬** (`.claude/skills/`): **없음**

**글로벌 스킬** (`~/.claude/skills/`): 확인 불가 (이 컨테이너 세션에 없음)

**설정 파일 현황**:
- `.claude/settings.local.json`: 일부 Bash/Read 권한 설정만 존재
- `.claude/launch.json`: Vite dev server 설정 (brain180-dev, 포트 5173)

**현재 세션에서 활성화된 번들 스킬** (Claude Code 기본 제공):
- `/session-start-hook` — 세션 시작 훅 구성
- `/update-config` — settings.json 설정 관리
- `/keybindings-help` — 키바인딩 커스터마이즈
- `/verify` — 코드 변경 검증
- `/code-review` — PR 코드 리뷰
- `/fewer-permission-prompts` — 권한 프롬프트 최적화
- `/loop` — 반복 작업 실행
- `/claude-api` — Claude API 앱 빌드/디버그
- `/run` — 앱 실행
- `/security-review` — 보안 리뷰
- `/init` — CLAUDE.md 초기화
- `/review` — PR 리뷰

---

### 🚀 추천 업데이트 (Alien Agentic 워크플로 기준)

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `daily-skill-report` | 신규 커스텀 | 🔴 높음 | 현재 수동으로 실행 중인 본 보고 워크플로를 자동화. SessionStart 훅과 연계 |
| `why-how-what-analyzer` | 신규 커스텀 | 🔴 높음 | Alien Agentic WHY-HOW-WHAT 컨설팅 프레임워크를 스킬로 캡슐화하여 모든 에이전트가 일관된 분석 수행 |
| `cognitive-map-extractor` | 신규 커스텀 | 🔴 높음 | brain180 핵심 기능 — 텍스트에서 CognitiveMap 구조 추출을 AI 보조로 자동화 |
| `multica-reporter` | 신규 커스텀 | 🔴 높음 | multica issue comment 제출을 자동화하는 스킬 (현재 수동) |
| `/run-skill-generator` | 번들 (v2.1.145+) | 🟡 중간 | brain180 Vite 프로젝트의 실행 레시피 기록 → `/run`, `/verify` 정확도 향상 |
| `deep-research` | 외부 플러그인 | 🟡 중간 | [daymade/claude-code-skills](https://github.com/daymade/claude-code-skills) — 구조화된 리서치 보고서 생성. 천재 분석 워크플로에 활용 |
| `competitors-analysis` | 외부 플러그인 | 🟡 중간 | 경쟁사 추적 (daymade skills). Alien Agentic 컨설팅 시장 분석에 적용 |
| `agent-roster-status` | 신규 커스텀 | 🟡 중간 | 27명 에이전트 시스템 상태 조회 스킬. `claude agents` 커맨드(v2.1.139) 기반 |
| `subagent-builder` | 신규 커스텀 | 🟢 낮음 | 본 에이전트의 역할을 스킬로 정의 — 표준화 및 재사용성 향상 |
| `skill-creator` | 외부 플러그인 | 🟢 낮음 | 스킬 자체 생성 자동화 (daymade skills의 meta-skill) |

---

### 🆕 즉시 활용 가능한 신규 스킬 기능 (v2.1.145+)

**`/run` + `/verify` + `/run-skill-generator` 3종 세트**

brain180 Vite 프로젝트에 바로 적용 가능:
```bash
# 한 번만 실행 — 실행 레시피 기록
/run-skill-generator

# 이후 매번 사용
/run        # 앱 실행 확인
/verify     # 변경사항 검증
```

**`/goal` 커맨드 (v2.1.139)**

장시간 멀티턴 작업에 활용 가능:
```
/goal brain180 시각화 엔진 프로토타입 완성 — 노드 그래프 렌더링까지
```
Claude가 완료 조건 달성까지 자동으로 여러 턴에 걸쳐 작업.

**스킬 `effort` 프론트매터 (v2.1.145)**

무거운 분석 스킬은 `effort: high`로, 빠른 조회는 `effort: low`로 설정:
```yaml
---
name: cognitive-map-extractor
effort: high
---
```

---

### ⚠️ 발견된 이슈

**[가설]** brain180 `.claude/` 디렉토리에 스킬이 전혀 없음. `CLAUDE.md`에 상세한 데이터 모델이 정의되어 있지만 이를 활용하는 커스텀 스킬이 존재하지 않아 실제 개발 효율이 낮을 수 있음.

**권장 즉시 조치**: `.claude/skills/cognitive-map-extractor/SKILL.md` 생성 — brain180의 핵심 로직을 스킬로 정의하여 Claude가 자동으로 CognitiveMap 구조를 제안할 수 있도록.

---

### 📋 오늘의 액션 아이템

1. **[즉시]** `/run-skill-generator` 실행 → brain180 Vite 프로젝트 실행 레시피 기록
2. **[이번 주]** `multica-reporter` 스킬 작성 → multica 이슈 코멘트 제출 자동화
3. **[이번 주]** `cognitive-map-extractor` 스킬 작성 → 텍스트 → CognitiveMap 추출 AI 보조
4. **[이번 주]** `why-how-what-analyzer` 스킬 작성 → WHY-HOW-WHAT 프레임워크 스킬화
5. **[다음 주]** 27명 에이전트 시스템용 `agent-roster-status` 스킬 설계 (v2.1.139 `claude agents` 커맨드 기반)
6. **[다음 주]** 외부 플러그인 설치 검토: `daymade/claude-code-skills` (deep-research, competitors-analysis)

---

### 🔗 참고 소스

- [Claude Code 공식 스킬 문서](https://code.claude.com/docs/en/skills)
- [Claude Code 체인지로그](https://code.claude.com/docs/en/changelog)
- [daymade/claude-code-skills](https://github.com/daymade/claude-code-skills) — 52개 프로덕션 레디 스킬
- [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) — 커뮤니티 큐레이션
- [Multica CLI 설치 가이드](https://github.com/multica-ai/multica/blob/main/CLI_INSTALL.md)
- [Claude Code 릴리즈](https://releasebot.io/updates/anthropic/claude-code)
