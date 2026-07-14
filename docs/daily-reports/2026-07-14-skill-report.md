## 🛸 스킬 발전 사항 일일 보고 — 2026-07-14 KST

### 📡 최신 동향

**Claude Code 2026-07-11 이후 신규 릴리즈 (v2.1.207 ~ v2.1.209)**

> 지난 보고(2026-07-11) 이후 3일간의 변경사항만 집중 정리

#### v2.1.209 (2026-07-14)
- **백그라운드 에이전트 다이얼로그 수정**: `claude agents` 백그라운드 세션에서 `/model` 및 기타 다이얼로그가 차단되던 버그 수정

#### v2.1.208 (2026-07-14)
- **스크린 리더 모드 추가**: `claude --ax-screen-reader` CLI 플래그, `CLAUDE_AX_SCREEN_READER=1` 환경변수, 또는 settings.json `"axScreenReader": true`로 활성화
- **vim 이중키 시퀀스 지원**: `vimInsertModeRemaps` 설정 추가 (예: `jj` → Escape 매핑)
- **기업용 런처 지원**: `CLAUDE_CODE_PROCESS_WRAPPER` 환경변수 추가
- **풀스크린 멀티셀렉트 마우스 클릭 지원**: 이전에 키보드만 지원하던 메뉴에 클릭 가능
- **버그 수정**:
  - fast mode가 모델 전환 후 꺼진 채로 유지되던 문제 해결
  - 백그라운드 에이전트 응답이 전달 실패 시 소실되던 문제 해결 ⚠️ 27인 에이전트 운영에 직접 영향
  - MCP stdio 서버 stderr 누적 버퍼 64MB 상한 도입 (무제한 메모리 증가 방지)
  - LSP 문서가 무기한 열린 채로 유지되던 문제 → LRU 방식으로 50개 문서 상한 적용
  - 단일 라인이 매우 긴 파일 읽기 시 메모리 폭증 문제 수정

#### v2.1.207 (2026-07-11, 이전 보고 직후)
- **Auto 모드 범위 확대**: Bedrock, Vertex AI, Foundry에서도 opt-in 없이 Auto 모드 사용 가능 (`disableAutoMode`로 비활성화)
- **터미널 스트리밍 프리징 해결**: 긴 리스트/테이블/단락/코드블록 스트리밍 시 터미널 멈춤 현상 수정
- **환경변수 파싱 수정**: `CLAUDE_CODE_MAX_OUTPUT_TOKENS`에서 `1e6` 같은 과학적 표기법 잘못 처리하던 버그 해결

---

### 🔍 현재 설치된 스킬 현황

#### brain180 프로젝트 레벨 (`.claude/skills/`)
- **없음** — 프로젝트에 스킬 디렉토리 미구성 (2026-07-07부터 반복 지적 중)

#### 전역 스킬 (`/root/.claude/skills/` 또는 `~/.claude/skills/`)
- `session-start-hook` — 세션 시작 훅 설정 스킬 (1개)

#### 설정 파일 현황
- `.claude/settings.local.json`: 퍼미션 허용 목록만 존재, 스킬 설정 없음
- `.claude/launch.json`: vite 개발 서버 설정 (포트 5173)

#### Claude Code 번들 스킬 (이번 세션 활성 — 26개)
| 스킬명 | 용도 |
|--------|------|
| `session-start-hook` | 웹 세션 startup hook |
| `deep-research` | 멀티소스 팩트체크 리서치 |
| `dataviz` | 차트/그래프 시각화 |
| `artifact-design` | Artifact 디자인 가이드 |
| `update-config` | settings.json 설정 |
| `keybindings-help` | 키보드 단축키 커스터마이징 |
| `verify` | end-to-end 코드 검증 |
| `code-review` | 버그 + 정리 코드 리뷰 |
| `simplify` | 코드 간소화 리뷰 |
| `fewer-permission-prompts` | 허용 목록 자동 생성 |
| `loop` | 반복 작업 예약 실행 |
| `claude-api` | Claude API/Anthropic SDK 참조 |
| `run` | 프로젝트 앱 실행 검증 |
| `learn` | 개념 학습/교육 가이드 |
| `doc-coauthoring` | 문서 공동 작성 워크플로 |
| `web-artifacts-builder` | 복잡한 HTML 아티팩트 빌더 |
| `skill-creator` | 새 스킬 생성 |
| `theme-factory` | 테마 팩토리 |
| `mcp-builder` | MCP 서버 빌더 |
| `internal-comms` | 내부 커뮤니케이션 |
| `canvas-design` | 캔버스 디자인 |
| `brand-guidelines` | 브랜드 가이드라인 |
| `init` | CLAUDE.md 초기화 |
| `review` | GitHub PR 리뷰 |
| `security-review` | 보안 리뷰 |

---

### 🚀 추천 업데이트

| 스킬명 | 유형 | 우선순위 | 이유 |
|-------|------|---------|-----|
| `brain180-analyze` | 커스텀 프로젝트 | 🔴 높음 | 3주 연속 지적 — `.claude/skills/` 디렉토리 자체가 없음. Brain180 핵심 분석 워크플로 표준화 시급 |
| `cognitive-map-extractor` | 커스텀 도메인 | 🔴 높음 | 텍스트 → CognitiveMap JSON 변환 패턴. seeds/ 디렉토리 7개 텍스트 분석에 즉시 활용 가능 |
| `agent-background-monitor` | 에이전트 운영 | 🔴 높음 | v2.1.208에서 백그라운드 에이전트 응답 소실 버그 수정됨 → 27인 에이전트 시스템이 이 버그 영향 받았을 가능성 확인 필요 [가설] |
| `doc-coauthoring` | 번들 스킬 활용 | 🟡 중간 | `methodology.md` 작성 시 이 번들 스킬 사용 권장 — docs/ 폴더에 빈 파일만 있음 |
| `multica-submit` | 커스텀 자동화 | 🟡 중간 | 매일 보고 파일을 multica로 제출하는 로컬 훅 스크립트 필요 (PAT 토큰 주입 방식) |
| `doctor-check` | 번들 기능 활용 | 🟡 중간 | v2.1.206에서 추가된 `/doctor`가 CLAUDE.md 크기 비대화 경고 — 현재 CLAUDE.md 점검 권장 |
| `vimInsertModeRemaps` | 설정 최적화 | 🟢 낮음 | v2.1.208 신기능 — vim 사용자라면 settings.json에 `jj → Escape` 등 추가 |

---

### 📋 오늘의 액션 아이템

1. **[즉시] `.claude/skills/` 디렉토리 생성** — 3주 연속 지적된 항목. `brain180-analyze` 스킬 최소 1개 작성:
   ```
   /home/user/brain180/.claude/skills/brain180-analyze/SKILL.md
   ```

2. **[즉시] `/doctor` 실행** — v2.1.206에서 추가. CLAUDE.md 최적화 및 미사용 설정 정리 제안 받기

3. **[오늘] 백그라운드 에이전트 응답 소실 버그 영향 확인** — 이번 보고 루틴도 백그라운드에서 실행되므로, 이전 보고 결과가 실제로 전달됐는지 확인 필요 [가설]

4. **[이번 주] multica PAT 토큰 발급 및 환경변수 설정** — `https://app.multica.ai/settings`에서 발급 후 `MULTICA_TOKEN` 환경변수로 주입하면 이 보고 루틴이 완전 자동화됨

5. **[이번 주] seeds/ 텍스트 7개로 `cognitive-map-extractor` 스킬 프로토타입** — `seeds/tao-te-ching-01.md`, `seeds/analects-01.md` 등을 이용해 Brain180 핵심 기능 PoC

---

### ⚠️ 보고 제출 제약 사항 (변동 없음)

multica CLI 이 환경(리모트 컨테이너)에서 설치 불가:
- `@multica/cli` npm 패키지 미존재
- GitHub Releases API / multica.ai 네트워크 프록시 차단 (403)
- PAT 토큰 없음 (`MULTICA_TOKEN` 환경변수 미설정)

**사용자 로컬에서 직접 제출:**
```bash
multica issue comment add 0b24f8af-4d32-4a73-b5f9-5cd9bfa83ef7 --content-file ./reply.md
```

---

_조사 소스: [Claude Code Changelog](https://code.claude.com/docs/en/changelog) · 버전 v2.1.207~v2.1.209 (2026-07-11 ~ 07-14)_
