import { describe, expect, it } from "vitest";
import {
  LexiconExtractionError,
  validateLexiconResponse,
} from "../../server/ai/lexicon-extractor.js";
import { detectLang } from "../../server/lib/lang-detect.js";

const TEXT_BODY = `여우가 어린왕자에게 말했다. 닭들은 다 똑같고 사람들도 다 똑같아. 그래서 나는 좀 지루해.\n하지만 네가 나를 길들인다면 내 생활은 햇살이 비치는 듯 환해질 거야.`;

describe("validateLexiconResponse", () => {
  it("strips ```json fences and parses", () => {
    const raw =
      "```json\n" +
      JSON.stringify({
        lexicon: [
          { token: "그래서", canonical: "causes", example: "그래서 나는 좀 지루해." },
        ],
      }) +
      "\n```";
    const { lexicon, warnings } = validateLexiconResponse(raw, TEXT_BODY);
    expect(lexicon).toHaveLength(1);
    expect(lexicon[0]?.token).toBe("그래서");
    expect(lexicon[0]?.canonical).toBe("causes");
    expect(warnings).toContain("too_few_extracted:1");
  });

  it("flags duplicate tokens and unknown canonicals", () => {
    const raw = JSON.stringify({
      lexicon: [
        { token: "그래서", canonical: "causes", example: "그래서 나는 좀 지루해." },
        { token: "그래서", canonical: "causes", example: "그래서 나는 좀 지루해." },
        { token: "그러나", canonical: "WEIRD", example: "" },
        { token: "하지만", canonical: "contrasts", example: "하지만 네가 나를 길들인다면 내 생활은 햇살이 비치는 듯 환해질 거야." },
      ],
    });
    const { lexicon, warnings } = validateLexiconResponse(raw, TEXT_BODY);
    expect(lexicon.map((e) => e.token)).toEqual(["그래서", "그러나", "하지만"]);
    expect(lexicon.find((e) => e.token === "그러나")?.canonical).toBe("other");
    expect(warnings).toContain("duplicate:그래서");
    expect(warnings.some((w) => w.startsWith("unknown_canonical:WEIRD"))).toBe(true);
  });

  it("flags examples that aren't substrings of the body", () => {
    const raw = JSON.stringify({
      lexicon: [
        { token: "그래서", canonical: "causes", example: "이 문장은 본문에 없습니다." },
      ],
    });
    const { warnings } = validateLexiconResponse(raw, TEXT_BODY);
    expect(warnings).toContain("example_not_in_body:그래서");
  });

  it("throws LexiconExtractionError on invalid JSON", () => {
    expect(() => validateLexiconResponse("not json {{{", TEXT_BODY)).toThrow(
      LexiconExtractionError,
    );
  });

  it("throws LexiconExtractionError when lexicon array is missing", () => {
    expect(() => validateLexiconResponse(JSON.stringify({ foo: 1 }), TEXT_BODY)).toThrow(
      LexiconExtractionError,
    );
  });

  it("caps at 12 entries", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      token: `토큰${i}`,
      canonical: "other",
      example: "",
    }));
    const { lexicon } = validateLexiconResponse(JSON.stringify({ lexicon: rows }), TEXT_BODY);
    expect(lexicon).toHaveLength(12);
  });
});

describe("detectLang", () => {
  it("classifies pure Korean as ko", () => {
    expect(detectLang(TEXT_BODY)).toBe("ko");
  });

  it("classifies dense hanzi as zh-classical", () => {
    expect(detectLang("道可道非常道。名可名非常名。")).toBe("zh-classical");
  });

  it("classifies dense English as en", () => {
    expect(
      detectLang("Therefore science requires falsifiability rather than certainty."),
    ).toBe("en");
  });

  it("falls back to mixed when no script dominates", () => {
    expect(detectLang("Hello 안녕 世界 123 456 789 ---")).toBe("mixed");
  });
});
