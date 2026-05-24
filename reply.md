## 🛸 스킬 발전 사항 일일 보고 — 2026-05-24 KST

> **보고자**: subagent-builder (Claude Code / brain180 세션)
> **대상 프로젝트**: brain180 (Alien Agentic)

---

### 📡 최신 동향

#### Claude Code v2.1.150 (2026-05-23) — 인프라 업데이트

**이번 주 주요 릴리즈 (v2.1.147~v2.1.150)**

| 버전 | 날짜 | 핵심 변경 |
|------|------|---------|
| v2.1.150 | 05-23 | 내부 인프라 개선만 (기능 변경 없음) |
| v2.1.149 | 05-22 | `/usage` 카테고리별 분류 (스킬·서브에이전트·플러그인·MCP), 보안 패치 3종 |
| v2.1.147 | 05-21 | `/simplify` → `/code-review` 리네임, `--comment` 플래그 추가, 핀드 백그라운드 세션 |

**보안 패치 (v2.1.149) — 즉시 업그레이드 권장**
- PowerShell 권한 우회 취약점 차단
- git worktree 샌드박스 격리 강화
- `cd/pushd/popd` 권한 분석 개선

---

#### 이달 스킬 시스템 주요 변화 (2026년 5월)

**신규 번들 스킬 (v2.1.145)**

| 스킬 | 목적 |
|------|------|
| `/run` | 프로젝트 앱을 실행하여 변경 사항 직접 확인 |
| `/verify` | 코드 변경이 실제로 작동하는지 앱 실행으로 검증 (테스트/타입체크 미사용) |
| `/run-skill-generator` | `/run`·`/verify`용 프로젝트별 실행 레시피 생성 및 저장 |

**스킬 프론트매터 신규 필드 (현재 지원)**

```yaml
---
name: my-skill
effort: high              # 스킬 실행 시 effort 레벨 오버라이드
model: claude-opus-4-7    # 스킬 실행 시 모델 오버라이드
paths: src/data/**        # 이 경로 파일 작업 시만 자동 활성화
hooks:                    # 스킬 수명주기 훅
  PostToolUse: [...]
shell: powershell         # Windows PowerShell 지원
---
```

**`skillOverrides` 설정 옵션 (v2.1.126 확장)**

| 값 | Claude 노출 | `/` 메뉴 |
|----|------------|---------|
| `"on"` | 이름+설명 | 표시 |
| `"name-only"` | 이름만 | 표시 |
| `"user-invocable-only"` | 숨김 | 표시 |
| `"off"` | 숨김 | 숨김 |

**Hook 신규 기능**
- `args: string[]` 배열 형식 (exec form) — shell 파싱 없이 프로세스 직접 spawn (v2.1.139)
- `continueOnBlock` 옵션 — PostToolUse 블록 후 계속 진행 (v2.1.139)
- `type: "mcp_tool"` — 훅에서 MCP 도구 직접 호출 (v2.1.118)
- `duration_ms` 필드 — 도구 실행 시간 측정 (v2.1.119)

**스킬 동적 컨텍스트 주입 (Dynamic Context Injection)**
```yaml
## 현재 변경사항
!`git diff HEAD`

## 환경 정보
```!
node --version
npm --version
```
```
`!` 접두 명령어가 Claude 수신 전 실행되어 출력으로 대체됨.

**Agent Skills 공개 표준 ([agentskills.io](https://agentskills.io))**
- Claude Code 외 다른 AI 도구와 스킬 공유 가능한 오픈 표준
- Claude Code는 표준 위에 `invocation control`, `subagent execution`, `dynamic context injection` 확장

**MCP 생태계 현황**
- 10,000+ MCP 서버 (공식/벤더/커뮤니티 합산) [가설: 유동적 수치]
- Tool Search로 컨텍스트 사용 최소화: 세션 시작 시 도구명만 로드
- `CLAUDE_PROJECT_DIR` 환경변수가 MCP stdio 서버에서도 사용 가능

---

### 🔍 현재 설치된 스킬 현황 (brain180 리포)

**전역 스킬** (`~/.claude/skills/`)

| 스킬명 | 상태 | 설명 |
|--------|------|------|
| `session-start-hook` | ✅ 설치됨 | Claude Code 웹 세션용 SessionStart 훅 생성/설정 |

**프로젝트 스킬** (`.claude/skills/`)

| 스킬명 | 상태 |
|--------|------|
| — | **없음** — brain180 전용 커스텀 스킬 부재 |

**전역 훅** (`~/.claude/settings.json`)

| 훅 타입 | 설정 |
|---------|------|
| `Stop` | `stop-hook-git-check.sh` (커밋 전 git 상태 검사) |

**⚠️ 발견된 이슈**: Stop 훅이 구식 `command` 문자열 형식 사용 중. v2.1.139부터 `args: []` 배열(exec form)이 권장됨 — shell 파싱 없이 직접 spawn으로 보안 향상.

**번들 스킬 (세션에서 활성화 확인된 것)**

| 스킬 | 목적 |
|------|------|
| `/session-start-hook` | 웹 세션 시작 훅 구성 |
| `/update-config` | settings.json 설정 관리 |
| `/keybindings-help` | 키바인딩 커스터마이즈 |
| `/verify` | 코드 변경 검증 |
| `/code-review` | 코드 리뷰 (구 `/simplify`) |
| `/fewer-permission-prompts` | 권한 프롬프트 최적화 |
| `/loop` | 반복 작업 실행 |
| `/claude-api` | Claude API/SDK 개발 지원 |
| `/run` | 앱 실행 및 확인 |
| `/security-review` | 보안 리뷰 |
| `/init` | CLAUDE.md 초기화 |
| `/review` | PR 리뷰 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|--------|------|---------|------|
| `cognitive-map-extractor` | 신규 (프로젝트) | 🔴 높음 | brain180 핵심 AI 기능 — 텍스트 → CognitiveMap 구조 추출 표준화. CLAUDE.md 데이터 모델 활용 |
| `genius-profile` | 신규 (프로젝트) | 🔴 높음 | `paths: src/data/geniuses/**`로 천재별 데이터 작업 시 자동 활성화되는 인지 특성 레퍼런스 |
| `why-how-what-analyzer` | 신규 (전역) | 🔴 높음 | WHY-HOW-WHAT 컨설팅 프레임워크 스킬화 — 모든 에이전트에서 일관된 분석 수행 |
| `multica-reporter` | 신규 (전역) | 🔴 높음 | multica 이슈 코멘트 자동 제출 스킬. `disable-model-invocation: true`로 수동 트리거 |
| Stop 훅 업그레이드 | 업데이트 | 🟠 중간 | `command` 문자열 → `args: []` 배열 형식(exec form)으로 변경 — 보안 및 안정성 향상 |
| `subagent-orchestrator` | 신규 (전역) | 🟠 중간 | 27명 에이전트 시스템 운영 패턴 스킬. `context: fork` + `agent` 필드 조합으로 에이전트 위임 표준화 |
| `visualization-generator` | 신규 (프로젝트) | 🟡 낮음 | D3.js/Cytoscape.js 컴포넌트 생성 패턴. `paths: src/components/VisualLayer/**` 자동 활성화 |
| `data-schema-validator` | 신규 (프로젝트) | 🟡 낮음 | CognitiveMap 인터페이스 스키마 준수 검증. `paths: src/data/**` 자동 활성화 |

---

### 💡 기술 하이라이트 — Alien Agentic 즉시 적용 포인트

#### 1. brain180에 `/run-skill-generator` 즉시 실행
Vite 프로젝트 실행 레시피를 `.claude/skills/run-brain180/`에 기록 → 이후 `/run`, `/verify`가 정확히 동작

#### 2. Stop 훅 exec form 업그레이드
```json
// 기존 (문자열 형식)
{ "type": "command", "command": "~/.claude/stop-hook-git-check.sh" }

// 권장 (exec form, v2.1.139+)
{ "type": "command", "args": ["/bin/bash", "/root/.claude/stop-hook-git-check.sh"] }
```

#### 3. `/goal`로 장기 brain180 개발 작업 자동화
```
/goal brain180 뉴턴 텍스트 3개 CognitiveMap 데이터 파일 완성
```
Claude가 완료까지 자동으로 멀티턴 실행, 실시간 진행 오버레이 표시

#### 4. `cognitive-map-extractor` 스킬 동적 컨텍스트 예시
```yaml
---
name: cognitive-map-extractor
effort: high
paths: src/data/texts/**
---

다음 텍스트에서 CognitiveMap 구조를 추출하세요:

!`cat $ARGUMENTS`

## 추출 지시
1. CognitiveNode 목록 식별 (type: root/anchor/bridge/branch)
2. CognitiveEdge 관계 매핑 (relation: causes/supports/contrasts/transforms/contains)
3. 4차원 사고 패턴 분류
```

#### 5. `multica-reporter` 스킬 설계 방향
```yaml
---
name: multica-reporter
description: Multica 이슈에 조사 보고서를 자동 제출
disable-model-invocation: true
argument-hint: [issue-id]
---

reply.md 파일을 작성하고 multica issue comment add $ARGUMENTS --content-file ./reply.md 를 실행하세요.
```

---

### 📋 오늘의 액션 아이템

1. **[즉시]** `/run-skill-generator` 실행 → brain180 Vite 실행 레시피 기록
2. **[즉시]** Stop 훅 `args` 배열 형식으로 업그레이드 (`~/.claude/settings.json` 수정)
3. **[이번 주]** `.claude/skills/cognitive-map-extractor/SKILL.md` 생성 → brain180 핵심 스킬
4. **[이번 주]** `multica-reporter` 전역 스킬 작성 → 자동 보고 워크플로 완성
5. **[이번 주]** `why-how-what-analyzer` 전역 스킬 작성 → WHY-HOW-WHAT 프레임워크 표준화
6. **[다음 주]** `genius-profile` 스킬 + `paths` 필드 활용한 프로젝트별 컨텍스트 자동화

---

### 🔗 참고 소스

- [Claude Code 공식 스킬 문서](https://code.claude.com/docs/en/skills)
- [Claude Code 체인지로그](https://code.claude.com/docs/en/changelog)
- [Releasebot Anthropic 릴리즈](https://releasebot.io/updates/anthropic/claude-code)
- [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) — 커뮤니티 큐레이션
- [Agent Skills 공개 표준](https://agentskills.io)
