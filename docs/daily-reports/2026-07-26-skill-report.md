## 🛸 스킬 발전 사항 일일 보고 — 2026년 7월 26일 KST

> **보고 주체**: Alien Agentic subagent-builder
> **대상 이슈**: ALI-14 (Multica 이슈 ID: `0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7`)
> **보고 기간**: 2026-07-19 ~ 2026-07-26 (지난 보고 2026-07-18 이후 8일간)
> **비고**: multica CLI 미설치, `MULTICA_TOKEN` 미설정 — GitHub 파일 대체 보고

---

### 📡 최신 동향

#### Claude Code 릴리즈 현황 (2026-07-18 이후 — 6개 버전)

| 버전 | 일자 | 핵심 변경사항 |
|------|------|--------------|
| **v2.1.220** | 2026-07-25 | 버그 수정 및 안정성 개선 |
| **v2.1.219** | 2026-07-24 | 🔴 **Claude Opus 5 기본 모델 지정, 1M 컨텍스트**, 중첩 서브에이전트 depth 3, `DirectoryAdded` 훅 신설 |
| **v2.1.218** | 2026-07-22 | `/code-review` → 백그라운드 서브에이전트 전환, 접근성 개선 |
| **v2.1.217** | 2026-07-21 | 이모지 자동완성 (`:heart:` → ❤️), 트랜스크립트 쓰기 경고 추가 |
| **v2.1.216** | 2026-07-20 | `sandbox.filesystem.disabled` 설정, 장시간 세션 이차 지연(O(n²)) 수정 |
| **v2.1.215** | 2026-07-19 | `/verify`·`/code-review` 자동 실행 제거 — 수동 호출만 허용 |

---

#### v2.1.219 상세 (2026-07-24 — 이번 주 최대 업데이트)

**🆕 Claude Opus 5 기본 모델 전환:**
- 모델 ID: `claude-opus-5`
- 컨텍스트 창: **1M 토큰** (대폭 확장)
- 빠른 모드 가격: $10 / $50 per Mtok
- Opus 4.7은 빠른 모드에서 제거; `/fast`는 이제 Opus 5 및 Opus 4.8에만 적용
- `claude-api` 번들 스킬도 Opus 5 기준으로 업데이트됨

**🆕 중첩 서브에이전트 depth 3 허용 (⚠️ 27인 에이전트 시스템 직접 영향):**
- 이전: 서브에이전트가 자식 서브에이전트 spawn 불가 (depth 1)
- 지금: **depth 3까지 중첩 spawn 가능** — `orchestrator → worker → sub-worker` 3계층 구조 가능
- 환경변수로 조정: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`
- stream-json에 nested subagent forwarding 추가 (`--forward-subagent-text`)

**🆕 `DirectoryAdded` 훅 신설:**
- 세션 도중 새 작업 디렉토리가 등록될 때 실행되는 훅
- 용도: 다이나믹 프로젝트 전환 시 자동화된 초기화 작업 트리거 가능
- `.claude/settings.json` hooks 배열에 추가 가능

**기타 v2.1.219 변경:**
- `sandbox.network.strictAllowlist`: 허용 목록 외 호스트 프롬프트 없이 자동 차단
- `workflowSizeGuideline` 설정 키 추가
- `mcp_server_errors`를 stream-json init 이벤트에 포함

---

#### v2.1.218 (2026-07-22)
- `/code-review`가 메인 세션 차단 없이 백그라운드에서 실행됨
- `/ultrareview`: 설명형 인수 수용, `ultra` 플래그 비인터랙티브 세션 버그 수정

#### v2.1.216 (2026-07-20)
- 장시간 세션의 메시지 정규화 처리 O(n²) 지연 근본 수정 — 긴 대화 세션 성능 향상
- 워크트리 격리 서브에이전트가 공유 체크아웃에 접근하던 취약점 수정

---

### 🔍 현재 설치된 스킬 현황

#### brain180 프로젝트 레벨 (`.claude/skills/`)
- **없음** — 프로젝트에 스킬 디렉토리 미구성 (**4달 이상 연속 미이행**)

#### 전역 스킬 (`~/.claude/skills/`)
- `session-start-hook` (1개)

#### Claude Code 번들 스킬 (2026-07-26 기준 — **30개**, 07-18의 33개 대비 **3개 감소**)

**스킬 변동 비교 (07-18 → 07-26):**

| 변동 | 스킬명 | 비고 |
|------|--------|------|
| 🔴 미확인 | `deep-research` | 현재 세션에 없음 — 제거 또는 리네임 [가설] |
| 🔴 변경 | `verify` | v2.1.215 자동실행 제거 후 번들에서 미노출 [가설: 커맨드로 전환] |
| 🔴 변경 | `code-review` | v2.1.218 백그라운드 전환 후 번들에서 미노출 [가설: 내부 커맨드로 통합] |

**현재 30개 번들 스킬:**

| # | 스킬명 | Brain180 관련성 |
|---|--------|----------------|
| 1 | `session-start-hook` | 🟡 중간 |
| 2 | `dataviz` | 🔴 높음 — CognitiveMap 시각화 (색상 팔레트 최근 업데이트됨) |
| 3 | `artifact-design` | 🔴 높음 — 시각화 Artifact |
| 4 | `artifact-capabilities` | 🔴 높음 — 인터랙티브 CognitiveMap |
| 5 | `update-config` | 🟡 중간 |
| 6 | `keybindings-help` | 🟢 낮음 |
| 7 | `simplify` | 🟡 중간 |
| 8 | `fewer-permission-prompts` | 🟡 중간 |
| 9 | `loop` | 🔴 높음 — 이 보고 루틴 자체 |
| 10 | `claude-api` | 🔴 높음 — Opus 5 기준으로 업데이트됨 |
| 11 | `run` | 🟡 중간 |
| 12 | `morning` | 🟢 낮음 |
| 13 | `learn` | 🔴 높음 — Brain180 핵심 UX 패턴 |
| 14 | `doc-coauthoring` | 🟡 중간 |
| 15 | `web-artifacts-builder` | 🔴 높음 — 시각화 캔버스 |
| 16 | `skill-creator` | 🔴 높음 — brain180 커스텀 스킬 제작 |
| 17 | `theme-factory` | 🟡 중간 |
| 18 | `mcp-builder` | 🟡 중간 |
| 19 | `internal-comms` | 🟡 중간 |
| 20 | `canvas-design` | 🔴 높음 — 드래그 앤 드롭 캔버스 |
| 21 | `brand-guidelines` | 🟢 낮음 |
| 22 | `slack-gif-creator` | 🟢 낮음 |
| 23 | `algorithmic-art` | 🟡 중간 |
| 24 | `xlsx` | 🟢 낮음 |
| 25 | `pptx` | 🟢 낮음 |
| 26 | `pdf` | 🟡 중간 — 고전 원문 수집 |
| 27 | `docx` | 🟢 낮음 |
| 28 | `init` | 🟡 중간 |
| 29 | `review` | 🟡 중간 |
| 30 | `security-review` | 🟡 중간 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| **`brain180-analyze`** | 커스텀 프로젝트 스킬 | 🔴 긴급 | seeds/ 8개 텍스트 분석 워크플로 표준화. **4달 연속 미이행** — `skill-creator` 번들 스킬로 즉시 생성 가능 |
| **`cognitive-map-extractor`** | 커스텀 도메인 스킬 | 🔴 높음 | 텍스트 → CognitiveMap JSON 변환. CLAUDE.md 스키마 기반으로 즉시 적용 가능 |
| **중첩 서브에이전트 depth 설정 검토** | 환경 설정 | 🔴 높음 (신규) | v2.1.219: depth 1→3 확장. 27인 에이전트 시스템의 3계층 아키텍처 재설계 기회. `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` 값 설정 검토 |
| **`DirectoryAdded` 훅 활용** | 자동화 훅 | 🔴 높음 (신규) | v2.1.219 신규 훅 — brain180 작업 디렉토리 전환 시 자동 초기화 가능 |
| **Claude Opus 5 마이그레이션 점검** | 모델 설정 | 🟡 중간 (신규) | 27인 에이전트 스크립트 내 모델 ID 하드코딩 부분 (`claude-opus-4.*`) 점검 필요 |
| **`deep-research` 스킬 행방 확인** | 스킬 관리 | 🟡 중간 (신규) | 07-18 보고에 있던 스킬이 현재 세션에 없음. 공식 changelog 확인 필요 |
| **`multica-submit` 자동화** | 커스텀 자동화 | 🟡 중간 — **최장기 미해결** | `MULTICA_TOKEN` 환경변수 1회 설정으로 완성 |
| **`sandbox.network.strictAllowlist` 설정** | 보안 설정 | 🟡 중간 (신규) | brain180 허용 API 호스트 화이트리스트 구성으로 보안 강화 |

---

### 📋 오늘의 액션 아이템

1. **[즉시 — 4달 연속 미이행]** `.claude/skills/` 디렉토리 생성 및 커스텀 스킬 작성:
   ```bash
   mkdir -p /home/user/brain180/.claude/skills/
   # /skill-creator 호출로 brain180-analyze 스킬 즉시 생성 가능
   ```

2. **[오늘 — 신규 중요] 중첩 서브에이전트 depth 3 활용 검토**:
   - 27인 에이전트 시스템에서 `orchestrator → worker → sub-worker` 3계층 구조 설계 가능
   ```bash
   export CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=3  # 기본값 확인
   ```

3. **[오늘 — 신규] `DirectoryAdded` 훅 설정 추가**:
   - `.claude/settings.json`에 새 훅 유형 활용

4. **[이번 주] Claude Opus 5 전환 영향 점검**:
   ```bash
   grep -rn "claude-opus-4\|opus-4.7\|opus-4.8" .
   ```

5. **[이번 주] multica PAT 토큰 발급** (3달 연속 미이행):
   - `MULTICA_TOKEN` 환경변수 등록 → 이 보고 루틴 완전 자동화

6. **[다음 스프린트] seeds/ 8개 텍스트 CognitiveMap 변환 착수**:
   - `seeds/tao-te-ching-01.md`, `seeds/analects-01.md`, `seeds/kant-categorical-imperative.md` 등

---

### ⚠️ 지속 리스크

| 항목 | 현황 | 심각도 | 조치 |
|------|------|--------|------|
| `.claude/skills/` 미생성 | **4달 연속 미이행** | 🔴 | `mkdir -p .claude/skills/` 1줄 |
| multica 인증 | 미설정 (CLI 없음, TOKEN 없음) | 🔴 | PAT 발급 1회 |
| `deep-research` 스킬 소실 | 현재 세션 미확인 | 🟡 | changelog 공식 확인 필요 [가설] |
| 서브에이전트 스폰 한도 | v2.1.212 기본값 200개/세션 유효 | 🔴 | 27인 에이전트 스폰 패턴 점검 |
| seeds/ 텍스트 미처리 | 8개 파일 방치 중 | 🟡 | `cognitive-map-extractor` 스킬 작성 후 처리 |

---

### 🔗 참고 자료

- [Claude Code Changelog (공식)](https://code.claude.com/docs/en/changelog)
- [GitHub Releases](https://github.com/anthropics/claude-code/releases)
- [Claude Code Updates July 2026 — Releasebot](https://releasebot.io/updates/anthropic/claude-code)
- [Claude Code Changelog — ClaudeLog](https://claudelog.com/claude-code-changelog/)

---

_조사 소스: Claude Code GitHub Releases v2.1.215~v2.1.220 (2026-07-19~07-25), 현재 세션 스킬 목록 직접 추출, 이전 보고서(2026-07-18) 비교_
