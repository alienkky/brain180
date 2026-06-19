## 🛸 스킬 발전 사항 일일 보고 — 2026-06-19 KST

### 📡 최신 동향

**Claude Code v2.1.183** (오늘 기준 최신 버전, 2026-06-19 릴리즈)

#### Week 25 주요 업데이트 (Jun 15-19, 2026 · v2.1.178~v2.1.183)

##### 🔧 스킬 & 퍼미션 시스템 변경 (v2.1.178, Jun 15)
- **`Tool(param:value)` 퍼미션 규칙 문법 추가**: 도구 입력 파라미터로 규칙 매칭 가능
  - 예: `Agent(model:opus)` → Opus 서브에이전트 차단
  - 예: `Bash(command:rm*)` → 위험 명령어 선택적 차단
- **중첩 `.claude/skills/` 디렉토리 지원**: 하위 디렉토리에서 작업 시 해당 스킬 자동 로드
  - 이름 충돌 시 `<dir>:<name>` 형식으로 구분 (예: `apps/web:deploy`)
  - 기존 버그 수정: 중첩 스킬이 퍼미션 프롬프트로 차단되던 문제 해결

##### 🤖 에이전트 팀 시스템 변경 (v2.1.178, Jun 15)
- **`TeamCreate` / `TeamDelete` 도구 제거**: 더 이상 팀을 명시적으로 생성할 필요 없음
- **암묵적 팀 모델**: 모든 세션이 자동으로 하나의 팀을 가짐
- **간소화된 teammate 생성**: Agent 도구의 `name` 파라미터로 직접 spawn (setup 단계 불필요)
- 에이전트 분류기로 서브에이전트 spawn 전 사전 평가 (auto mode)

##### ⚙️ 설정 시스템 개선 (v2.1.181, Jun 17)
- **`/config key=value` 문법 추가**: 프롬프트에서 즉시 설정 변경
  - 예: `/config thinking=false`, `/config model=sonnet-4-6`
  - interactive, `-p`, Remote Control 모드 전부 지원
- **`/config --help`** (v2.1.183): 사용 가능한 단축 키 전체 목록 표시
- **`/config` 토글 동작 변경**: Enter/Space로 변경, Esc로 저장 후 닫기
- **`attribution.sessionUrl`**: 커밋/PR에서 claude.ai 세션 링크 제거 설정

##### 🛡️ 안전성 강화 (v2.1.183, Jun 19)
- **파괴적 git 명령어 자동 차단** (사용자가 명시적으로 요청하지 않는 한):
  - `git reset --hard`, `git checkout -- .`, `git clean -fd`, `git stash drop`
  - `git commit --amend` (이번 세션에서 에이전트가 생성한 커밋이 아닌 경우)
  - `terraform destroy` / `pulumi destroy` / `cdk destroy`
- **WebSearch 서브에이전트 버그 수정**: 서브에이전트에서 WebSearch 빈 결과 반환 문제 해결
- **스킬 중복 표시 버그 수정**: 사용자 레벨 스킬이 slash-command 자동완성에 중복 표시되던 문제 해결
- **`--safe-mode`** (v2.1.169, Week 24): CLAUDE.md, 스킬, 플러그인, 훅, MCP, 커스텀 명령어 전부 비활성화하고 시작

#### Week 24 주요 업데이트 (Jun 8-12, 2026 · v2.1.166~v2.1.176)

- **`/cd` 명령어**: 프롬프트 캐시 재구성 없이 세션을 다른 디렉토리로 이동
- **서브에이전트의 서브에이전트 spawn**: 최대 5단계 깊이까지 중첩 가능 (`/agents`로 트리 시각화)
- **`fallbackModel`**: 기본 모델 과부하 시 순차적으로 시도할 최대 3개 대체 모델 설정
- **`disableBundledSkills`** 설정 + `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` 환경변수: 번들 스킬 전체 숨김
- **Deny 규칙 glob 지원**: `"*"` 로 모든 도구 차단 가능, 알 수 없는 도구명 경고
- **서브에이전트 패널 개선**: idle 30초 후 자동 숨김, 최대 5행 + 스크롤 힌트

---

### 🔍 현재 설치된 스킬 현황

#### 글로벌 스킬 (`~/.claude/skills/`)
| 스킬명 | 상태 |
|--------|------|
| `session-start-hook` | ✅ 설치됨 |

#### 프로젝트 스킬 (`.claude/skills/`) — brain180
| 스킬명 | 상태 |
|--------|------|
| (없음) | ❌ 미설치 |

#### 세션 Bundled Skills (현재 세션 기준)
`session-start-hook`, `deep-research`, `update-config`, `keybindings-help`, `verify`, `code-review`, `simplify`, `fewer-permission-prompts`, `loop`, `claude-api`, `run`, `init`, `review`, `security-review`

#### 현재 설정 파일 현황 (brain180)
- `.claude/settings.local.json`: 기존 프로젝트 권한 설정만 존재 (skills 관련 설정 없음)
- `.claude/launch.json`: Vite dev 서버 실행 설정만 존재
- `disableBundledSkills`: 미설정 (번들 스킬 활성화 상태)

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `Tool(param:value)` 퍼미션 규칙 적용 | 설정 업데이트 | 🔴 HIGH | 27개 에이전트 시스템에서 Opus 모델 과도 사용 방지, 위험 Bash 명령어 선택적 차단 가능 |
| `.claude/skills/why-how-what/` | 커스텀 신규 | 🔴 HIGH | WHY-HOW-WHAT 컨설팅 워크플로 스킬화 — `effort: high`, `model: claude-opus-4-8` 적용 |
| `.claude/skills/multica-report/` | 커스텀 신규 | 🔴 HIGH | 일일 보고서 multica 자동 제출 파이프라인 구축 |
| 중첩 `.claude/skills/` 디렉토리 활용 | 구조 개선 | 🟡 MEDIUM | brain180의 `src/core/`, `src/components/`별로 도메인 특화 스킬 분리 가능 |
| `.claude/skills/cognitive-map-gen/` | 커스텀 신규 | 🟡 MEDIUM | brain180 뇌인지 구조 → CognitiveMap JSON 자동 생성 보조 |
| `/config` 단축키 활용 | 워크플로 개선 | 🟡 MEDIUM | 에이전트별 effort 레벨 빠른 전환 (`/config effort=xhigh`) |
| `fallbackModel` 설정 | 설정 업데이트 | 🟢 LOW | 27개 에이전트 시스템에서 기본 모델 과부하 시 자동 대체 모델 설정 |
| `agent-squad-coordinator` | 커스텀 신규 | 🟡 MEDIUM | 암묵적 팀 모델 활용한 에이전트 분업 조율 (TeamCreate 제거로 구조 단순화) |

#### 즉시 적용 가능한 설정 (`.claude/settings.local.json` 업데이트)

**중요 퍼미션 규칙 — `Tool(param:value)` 신문법 활용**:
```json
{
  "permissions": {
    "deny": [
      "Bash(git reset --hard*)",
      "Bash(git clean -fd*)",
      "Bash(git checkout -- .)",
      "Agent(model:opus)"
    ]
  }
}
```

**brain180 중첩 스킬 디렉토리 구조 제안**:
```
brain180/
└── .claude/
    └── skills/
        ├── cognitive-map-gen/   ← 뇌인지 구조 데이터 생성
        │   └── SKILL.md
        └── multica-report/      ← 일일 보고서 자동 제출
            └── SKILL.md
```

---

### 📋 오늘의 액션 아이템

1. **[즉시]** `.claude/settings.local.json`에 `Tool(param:value)` 퍼미션 규칙 추가 — 27개 에이전트 시스템 안전성 강화
2. **[즉시]** `--safe-mode` 플래그 문서화 — 설정 문제 발생 시 즉시 활용 가능
3. **[단기]** brain180에 `.claude/skills/` 디렉토리 생성 및 `cognitive-map-gen` 스킬 추가
4. **[단기]** `.claude/skills/multica-report/SKILL.md` 생성 — multica 자동 보고 파이프라인
5. **[단기]** `TeamCreate`/`TeamDelete` 제거 확인 — 기존 에이전트 코드에서 해당 도구 사용 여부 검토
6. **[중기]** `fallbackModel` 설정 추가 — Opus 4.8 → Sonnet 4.6 → Haiku 4.5 순서로 대체
7. **[중기]** `/config key=value` 단축키 활용 패턴을 팀 워크플로에 표준화

---

*조사 소스: [Claude Code What's New](https://code.claude.com/docs/en/whats-new), [Week 24 Digest](https://code.claude.com/docs/en/whats-new/2026-w24), [Claude Code Changelog](https://code.claude.com/docs/en/changelog)*

*⚠️ 참고: 네트워크 이그레스 정책으로 multica.ai 직접 접속 차단 — multica CLI 설치 및 자동 제출 실패. 수동 제출 필요.*
