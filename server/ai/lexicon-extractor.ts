// Server-side extractor that asks Kimi (Moonshot) for a per-lesson relation
// lexicon and then validates the reply before persisting. The Kimi adapter
// (server/lib/kimi.ts) already provides retry, anonymization, and usage-log
// hooks, so this module focuses on prompt assembly and output discipline.

import type { LessonRelationLexiconEntry } from "../db/schema.js";
import { callKimi } from "../lib/kimi.js";
import { detectLang, type LexiconLang } from "../lib/lang-detect.js";
import {
  EXTRACT_LEXICON_SYSTEM_PROMPT,
  buildExtractLexiconUserMessage,
} from "./prompts/extract-lexicon.js";

const CANONICAL_VALUES: ReadonlySet<LessonRelationLexiconEntry["canonical"]> =
  new Set(["causes", "supports", "contrasts", "transforms", "contains", "other"]);

const MIN_ENTRIES = 5;
const MAX_ENTRIES = 12;
const TOKEN_MAX_LEN = 30;
const EXAMPLE_MAX_LEN = 200;

export class LexiconExtractionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "LexiconExtractionError";
  }
}

export interface ExtractLexiconInput {
  userId: string;
  title: string;
  author: string;
  textBody: string;
  lang?: LexiconLang;
  model?: string;
}

export interface ExtractLexiconResult {
  lexicon: LessonRelationLexiconEntry[];
  warnings: string[];
  lang: LexiconLang;
  model: string;
  rawResponse: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  };
}

// Strip an optional ```json ... ``` fence if Kimi ignored the no-fence rule.
function unwrapFence(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch?.[1]?.trim() ?? trimmed;
}

export function validateLexiconResponse(
  raw: string,
  textBody: string,
): { lexicon: LessonRelationLexiconEntry[]; warnings: string[] } {
  const cleaned = unwrapFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new LexiconExtractionError(
      "invalid_json",
      "Kimi reply was not parseable JSON",
    );
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { lexicon?: unknown }).lexicon)
  ) {
    throw new LexiconExtractionError(
      "missing_lexicon_array",
      "Kimi reply did not contain a top-level `lexicon` array",
    );
  }

  const rows = (parsed as { lexicon: unknown[] }).lexicon;
  const warnings: string[] = [];
  const out: LessonRelationLexiconEntry[] = [];
  const seen = new Set<string>();

  for (const row of rows.slice(0, MAX_ENTRIES)) {
    if (typeof row !== "object" || row === null) {
      warnings.push("row_not_object");
      continue;
    }
    const r = row as Record<string, unknown>;
    const token = String(r.token ?? "").trim().slice(0, TOKEN_MAX_LEN);
    if (!token) continue;
    if (seen.has(token)) {
      warnings.push(`duplicate:${token}`);
      continue;
    }
    seen.add(token);

    let canonical = String(r.canonical ?? "") as LessonRelationLexiconEntry["canonical"];
    if (!CANONICAL_VALUES.has(canonical)) {
      warnings.push(`unknown_canonical:${canonical || "(empty)"}→other`);
      canonical = "other";
    }

    const example = r.example !== undefined && r.example !== null
      ? String(r.example).trim().slice(0, EXAMPLE_MAX_LEN)
      : undefined;
    if (example && !textBody.includes(example)) {
      warnings.push(`example_not_in_body:${token}`);
    }

    const glyph = r.glyph !== undefined && r.glyph !== null
      ? String(r.glyph).trim().slice(0, TOKEN_MAX_LEN)
      : undefined;

    out.push({
      token,
      canonical,
      ...(example ? { example } : {}),
      ...(glyph ? { glyph } : {}),
    });
  }

  if (out.length < MIN_ENTRIES) {
    warnings.push(`too_few_extracted:${out.length}`);
  }

  return { lexicon: out, warnings };
}

export async function extractLexicon(
  input: ExtractLexiconInput,
): Promise<ExtractLexiconResult> {
  const lang = input.lang ?? detectLang(input.textBody);
  const userMessage = buildExtractLexiconUserMessage({
    author: input.author,
    title: input.title,
    lang,
    textBody: input.textBody,
  });

  const result = await callKimi({
    userId: input.userId,
    system: EXTRACT_LEXICON_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: 2048,
    model: input.model,
  });

  const { lexicon, warnings } = validateLexiconResponse(result.text, input.textBody);

  return {
    lexicon,
    warnings,
    lang,
    model: result.model,
    rawResponse: result.text,
    usage: {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    },
  };
}
