## 🛸 스킬 발전 사항 일일 보고 — 2026-05-20 KST

### 📡 최신 동향

#### Claude Code Skills 시스템 핵심 변화 (2026)

1. **Skills 2.0 아키텍처 통합**: 기존에 분리되어 있던 "commands"와 "skills" 개념이 완전히 통합됨. `.claude/skills/` 폴더의 파일이 동일한 `/slash-command` 인터페이스를 생성. **스킬은 단순 마크다운 파일이 아닌 폴더 단위**로 관리되며, 스크립트·참조문서·템플릿·예제파일·설정을 포함할 수 있음.

2. **`SKILL.md` 루트 지원** (v2.1.142): 플러그인에 `skills/` 서브디렉토리 없이 루트 `SKILL.md`만 있어도 스킬로 인식됨.

3. **서브에이전트 스킬 접근 수정** (v2.1.133): 서브에이전트가 프로젝트/유저/플러그인 스킬을 Skill 도구를 통해 탐색하지 못하던 버그 수정 완료.

4. **모델의 빌트인 스킬 자동 발견** (v2.1.108): 모델이 `/init`, `/review`, `/security-review` 등 내장 슬래시 커맨드를 Skill 도구를 통해 자동 발견·실행 가능해짐.

5. **`skillOverrides` 설정 강화** (v2.1.129):
   - `"off"` — 모델 및 `/` 목록에서 완전 숨김
   - `"user-invocable-only"` — 모델에서만 숨김
   - `"name-only"` — 설명 축소

6. **Skills 2.0 평가(Eval) 기능** (2026년 3월~4월):
   - 스킬 테스트 프롬프트에 대해 Claude가 출력을 평가하는 eval 시스템 도입
   - trigger-description 최적화 루프: 스킬 설명 자동 재작성 + 버전별 벤치마크(pass rate·시간·토큰)

7. **`claude_code.skill_activated` OpenTelemetry 이벤트 강화** (v2.1.126): `invocation_trigger` 속성 추가
   - `"user-slash"` — 사용자가 직접 입력
   - `"claude-proactive"` — 모델이 자율 호출
   - `"nested-skill"` — 다른 스킬 내부에서 호출

8. **`${CLAUDE_EFFORT}` 플레이스홀더 지원** (v2.1.141): 스킬 콘텐츠에서 현재 effort 레벨 참조 가능.

9. **`Skill(name *)` 와일드카드 권한** (v2.1.139): prefix 매칭으로 스킬 권한 일괄 허용 가능.

#### 새로운 빌트인 스킬/커맨드 추가 (2026년 5월 기준)

| 커맨드 | 목적 | 버전 |
|--------|------|------|
| `/goal` | 완료 조건 설정, 자동으로 달성까지 작업 지속 | v2.1.139 |
| `/loop` | 프롬프트/커맨드를 주기적으로 반복 실행 | 빌트인 추가 |
| `/batch` | 여러 작업 일괄 처리 | 빌트인 추가 |
| `/less-permission-prompts` | transcript 스캔 → allowlist 자동 제안 | v2.1.111 |
| `/ultrareview` | 멀티에이전트 병렬 코드 리뷰 | v2.1.111 |
| `/recap` | 긴 세션 복귀 시 수동 컨텍스트 요약 | v2.1.108 |
| `/focus` | 포커스 뷰 토글 | v2.1.110 |

---

### 🔍 현재 설치된 스킬 현황 (brain180 리포)

```
/home/user/brain180/.claude/
├── launch.json         # Vite dev server 실행 설정 (port 5173)
└── settings.local.json # 권한 설정 (Bash, Read 일부 허용)
```

**현황 요약:**
- `.claude/skills/` 폴더 **없음** — 프로젝트 스킬 0개
- `settings.local.json`에 기본 Bash/Read 권한만 정의
- 글로벌 `~/.claude/` 디렉토리 **없음** — 유저 레벨 스킬도 0개
- 플러그인 미설치

**시스템에 현재 활성화된 빌트인 스킬:**
`session-start-hook`, `update-config`, `keybindings-help`, `verify`, `simplify`, `fewer-permission-prompts`, `loop`, `claude-api`, `run`, `init`, `review`, `security-review`

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `why-how-what-analysis` | 신규 프로젝트 스킬 | 🔴 높음 | Alien Agentic WHY-HOW-WHAT 컨설팅 워크플로 표준화 — 매 세션 재설명 불필요 |
| `cognitive-map-generator` | 신규 프로젝트 스킬 | 🔴 높음 | Brain180 핵심 기능인 뇌인지 구조 추출 패턴을 스킬로 정형화 |
| `agent-dispatch` | 신규 프로젝트 스킬 | 🟠 중간 | 27명 에이전트 시스템 — 서브에이전트 역할 분배 규칙을 스킬로 관리 |
| `multica-report` | 신규 프로젝트 스킬 | 🟠 중간 | 일일 보고 워크플로 자동화 (이 작업 자체를 스킬로 만들면 반복 가능) |
| `/goal` 활용 설정 | 설정 변경 | 🟡 낮음 | `Skill(* *)` 와일드카드를 `settings.local.json`에 추가해 스킬 권한 일괄 허용 |
| `fewer-permission-prompts` 실행 | 빌트인 활용 | 🟡 낮음 | transcript 분석으로 현재 필요한 allowlist 자동 생성 |

**[가설]** Skills 2.0의 eval/벤치마크 기능을 활용하면 `cognitive-map-generator` 스킬의 출력 품질을 자동 평가할 수 있을 것으로 예상됨.

---

### 📋 오늘의 액션 아이템

1. **`.claude/skills/why-how-what-analysis/`** 폴더 생성 — WHY-HOW-WHAT 컨설팅 프레임워크를 SKILL.md로 문서화
2. **`.claude/skills/cognitive-map-generator/`** 폴더 생성 — Brain180의 뇌인지 구조 추출 프로세스(CognitiveNode/CognitiveEdge 타입, 패턴 종류) 정의
3. **`settings.local.json` 업데이트** — `"Skill(* *)"` 와일드카드 권한 추가로 스킬 자동 승인
4. **`/fewer-permission-prompts`** 실행 — 현재 필요한 Bash 명령어들을 allowlist에 추가
5. **multica personal access token 설정** — `MULTICA_TOKEN` 환경변수 또는 `multica login --token mul_...`으로 인증 후 이 보고 자동화 완성

---

*조사 출처:*
- [Claude Code 공식 Changelog](https://code.claude.com/docs/en/changelog)
- [Claude Code May 2026 Updates - Releasebot](https://releasebot.io/updates/anthropic/claude-code)
- [Claude Code Skills - DEV Community 2026 가이드](https://dev.to/muhammad_moeed/claude-code-skills-a-practical-guide-for-2026-3f6p)
- [Claude Code MCP & Plugins 완전 가이드](https://www.clarista.io/blog/claude-code-mcp-plugins-guide)
