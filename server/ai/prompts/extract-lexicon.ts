// System + user prompt builders for the per-lesson relation lexicon
// extractor. The instructions force a single JSON object so the server-side
// validator (server/ai/lexicon-extractor.ts) can JSON.parse() the raw reply
// with no markdown-fence stripping.

import type { LexiconLang } from "../../lib/lang-detect.js";

export const EXTRACT_LEXICON_SYSTEM_PROMPT = `당신은 텍스트 분석가다. 입력 텍스트에서 *저자가 개념을 연결할 때 쓰는 관계어*를 추출한다.

추출 규칙:
1. 접속사·연결 어미·관계 표현·핵심 동사구만 추출. 일반 명사·형용사 제외.
2. 한자 텍스트는 한자 그대로(예: "故", "而", "之", "以"). 한국어/영어는 표층 형태(예: "그래서", "하지만", "therefore").
3. 같은 의미의 변형은 1개로 통합 (예: "그래서/그러므로/그러니까" → "그래서" 1개).
4. 각 관계어를 다음 6종 정규형 중 하나로 매핑:
   - causes      (원인·이유·조건)
   - supports    (뒷받침·근거·유사·예시)
   - contrasts   (대비·반대·예외·부정)
   - transforms  (변환·되기·이름붙이기)
   - contains    (소속·전체-부분·범위)
   - other       (위 5종으로 명확히 매핑 안 되는 경우)
5. 각 관계어마다 *본문에서 실제 등장한* 문장 1개를 example로 발췌 (200자 이내). 본문에 없는 예시 절대 생성 금지.
6. 최소 5개, 최대 12개.
7. 출력은 *반드시* 다음 JSON 한 덩어리. 다른 설명·머리말·markdown 코드펜스 일절 금지.

{
  "lexicon": [
    { "token": "그래서", "canonical": "causes", "example": "닭들은 다 똑같고 사람들도 다 똑같아. 그래서 나는 좀 지루해." }
  ]
}`;

export interface ExtractLexiconUserInputs {
  author: string;
  title: string;
  lang: LexiconLang;
  textBody: string;
}

export function buildExtractLexiconUserMessage(
  inputs: ExtractLexiconUserInputs,
): string {
  return [
    `저자: ${inputs.author}`,
    `제목: ${inputs.title}`,
    `원문 언어: ${inputs.lang}`,
    "",
    "본문:",
    '"""',
    inputs.textBody,
    '"""',
  ].join("\n");
}
