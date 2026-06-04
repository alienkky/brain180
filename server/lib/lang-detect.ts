// Lightweight script-ratio detector used by the lexicon extractor to decide
// which language the system prompt should advertise to Kimi. Not a general
// language detector — we only need to distinguish four buckets the extractor
// prompt understands: ko / en / zh-classical / mixed.
//
// Why not a library: the inputs are short curated lesson bodies (≤ ~10k chars)
// and we want zero-dep + offline-safe + deterministic so the unit tests can
// snapshot the outputs.

export type LexiconLang = "ko" | "en" | "zh-classical" | "mixed";

const HANGUL_RE = /[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힣]/g;
// CJK Unified + extensions A-F (covers classical Chinese characters used by
// 도덕경/논어/손자병법). Kana is excluded — the lesson set has no Japanese yet.
const HANZI_RE = /[㐀-䶿一-鿿豈-﫿\u{20000}-\u{2EBEF}]/gu;
const LATIN_RE = /[A-Za-z]/g;

export function detectLang(text: string): LexiconLang {
  const total = text.length;
  if (total === 0) return "mixed";

  const ko = (text.match(HANGUL_RE) || []).length;
  const zh = (text.match(HANZI_RE) || []).length;
  const en = (text.match(LATIN_RE) || []).length;

  const koRatio = ko / total;
  const zhRatio = zh / total;
  const enRatio = en / total;

  // Classical Chinese first: even a relatively low hanzi ratio is decisive
  // because lesson bodies are dense with native-script chars, not isolated
  // loanwords.
  if (zhRatio > 0.3) return "zh-classical";
  if (koRatio > 0.5) return "ko";
  if (enRatio > 0.5) return "en";
  return "mixed";
}
