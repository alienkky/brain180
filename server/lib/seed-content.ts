// Seed content loader — owner: ALI-67 방연동[MCP].
// Parses seeds/*.md YAML frontmatter into typed records consumed by
// server/db/seed.ts:seedLibraryContent(). Format is controlled by us
// (see seeds/README.md) so we use a small handwritten parser instead
// of pulling in a yaml dep.

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export interface SeedAxisWeights {
  cognition: number;
  value: number;
  time: number;
}

export type SeedField = "literature" | "philosophy" | "science" | "art" | "eastern-classics";
export type SeedAxis = "cognitive" | "value" | "time";

export interface SeedRecord {
  slug: string;
  title: string;
  author: string;
  era: string;
  field: SeedField;
  axisFocus: SeedAxis;
  axisWeights: SeedAxisWeights;
  targetNodes: string[];
  trapConcepts: string[];
  body: string;
}

// Korean field labels in seeds/*.md → contracts enum.
// "field" line value is the raw left-hand label; we lookup-prefix-match
// against the leading segment before "/".
const FIELD_MAP: Record<string, SeedField> = {
  문학: "literature",
  관계철학: "literature",
  철학: "philosophy",
  과학철학: "science",
  과학: "science",
  수학: "science",
  예술: "art",
  음악: "art",
  "동양 고전": "eastern-classics",
  동양고전: "eastern-classics",
  형이상학: "eastern-classics",
};

// "axis_focus" in seed frontmatter uses noun form "cognition" but our
// pg enum uses adjective "cognitive". Normalize on load.
const AXIS_FOCUS_MAP: Record<string, SeedAxis> = {
  cognition: "cognitive",
  cognitive: "cognitive",
  value: "value",
  time: "time",
};

function mapField(raw: string): SeedField {
  const first = raw.split("/")[0]!.trim();
  const direct = FIELD_MAP[first];
  if (direct) return direct;
  for (const segment of raw.split("/")) {
    const m = FIELD_MAP[segment.trim()];
    if (m) return m;
  }
  return "literature";
}

function splitFrontmatter(raw: string): { yaml: string; body: string } {
  const trimmed = raw.replace(/^\uFEFF/, "");
  if (!trimmed.startsWith("---")) {
    throw new Error("seed file missing frontmatter open `---`");
  }
  const closeIdx = trimmed.indexOf("\n---", 3);
  if (closeIdx === -1) {
    throw new Error("seed file missing frontmatter close `---`");
  }
  const yaml = trimmed.slice(3, closeIdx).replace(/^\r?\n/, "");
  const after = trimmed.slice(closeIdx + 4);
  const body = after.replace(/^\r?\n/, "");
  return { yaml, body };
}

function unquote(value: string): string {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

interface ParsedYaml {
  scalars: Record<string, string>;
  lists: Record<string, string[]>;
  maps: Record<string, Record<string, string>>;
}

// Tiny YAML subset parser sufficient for the controlled seed format.
// Supports: `key: value`, `key:` followed by `  - item` lines, and
// `key:` followed by `  child: value` lines (one nesting level).
function parseYaml(yaml: string): ParsedYaml {
  const out: ParsedYaml = { scalars: {}, lists: {}, maps: {} };
  const lines = yaml.split(/\r?\n/);
  let currentKey: string | null = null;
  let currentKind: "list" | "map" | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (line === "" || line.startsWith("#")) continue;

    if (!line.startsWith(" ") && !line.startsWith("\t")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (value === "") {
        currentKey = key;
        currentKind = null;
      } else {
        out.scalars[key] = unquote(value);
        currentKey = null;
        currentKind = null;
      }
      continue;
    }

    if (!currentKey) continue;
    const indented = line.replace(/^\s+/, "");
    if (indented.startsWith("- ")) {
      if (currentKind === null) currentKind = "list";
      if (currentKind !== "list") continue;
      const item = unquote(indented.slice(2));
      (out.lists[currentKey] ??= []).push(item);
    } else {
      const colonIdx = indented.indexOf(":");
      if (colonIdx === -1) continue;
      if (currentKind === null) currentKind = "map";
      if (currentKind !== "map") continue;
      const childKey = indented.slice(0, colonIdx).trim();
      const childValue = unquote(indented.slice(colonIdx + 1).trim());
      ((out.maps[currentKey] ??= {}))[childKey] = childValue;
    }
  }

  return out;
}

function parseAxisWeights(map: Record<string, string> | undefined): SeedAxisWeights {
  const c = Number(map?.cognition ?? "0");
  const v = Number(map?.value ?? "0");
  const t = Number(map?.time ?? "0");
  if (!Number.isFinite(c) || !Number.isFinite(v) || !Number.isFinite(t)) {
    throw new Error("axis_weights must be numeric");
  }
  return { cognition: c, value: v, time: t };
}

export function parseSeedFile(raw: string): SeedRecord {
  const { yaml, body } = splitFrontmatter(raw);
  const parsed = parseYaml(yaml);

  const slug = parsed.scalars.slug;
  const title = parsed.scalars.title;
  const author = parsed.scalars.author;
  const era = parsed.scalars.era;
  const fieldRaw = parsed.scalars.field;
  const axisFocusRaw = parsed.scalars.axis_focus;

  if (!slug || !title || !author || !fieldRaw || !axisFocusRaw) {
    throw new Error("seed file missing required scalar field(s)");
  }

  const axisFocus = AXIS_FOCUS_MAP[axisFocusRaw];
  if (!axisFocus) {
    throw new Error(`unrecognized axis_focus: ${axisFocusRaw}`);
  }

  return {
    slug,
    title,
    author,
    era: era ?? "",
    field: mapField(fieldRaw),
    axisFocus,
    axisWeights: parseAxisWeights(parsed.maps.axis_weights),
    targetNodes: parsed.lists.target_nodes ?? [],
    trapConcepts: parsed.lists.trap_concepts ?? [],
    body,
  };
}

function defaultSeedsDir(): string {
  // server/lib/seed-content.ts → ../../seeds
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "seeds");
}

export async function loadAllSeeds(dir: string = defaultSeedsDir()): Promise<SeedRecord[]> {
  const entries = await readdir(dir);
  const mdFiles = entries.filter((n) => n.endsWith(".md") && n !== "README.md").sort();
  const out: SeedRecord[] = [];
  for (const name of mdFiles) {
    const raw = await readFile(join(dir, name), "utf8");
    try {
      out.push(parseSeedFile(raw));
    } catch (err) {
      throw new Error(`failed to parse seed ${name}: ${(err as Error).message}`);
    }
  }
  return out;
}
