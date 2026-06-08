import { create } from "zustand";

// Brain180 v2 theme system — 3 skins handed off from Claude Design.
//   warm  = Brain180 brand (paper + terracotta + Fraunces) — default
//   slate = pure shadcn (Slate + Inter)
//   ivory = ivory + black, Monocle highlighter/post-it accents, skeuomorphism
// Skin remaps the --color-brain-* tokens at runtime via a [data-skin] scope on
// the shell root (see index.css). accent (warm) / hl (ivory) are applied inline.
export type Skin = "warm" | "slate" | "dark" | "ivory";
export type PaperBg = "paper" | "grid";

export interface ThemeState {
  skin: Skin;
  accent: string; // warm-skin primary
  hl: string; // ivory-skin highlighter / post-it point
  paper: PaperBg; // practice text-pane background texture
  setSkin: (s: Skin) => void;
  setAccent: (c: string) => void;
  setHl: (c: string) => void;
  setPaper: (p: PaperBg) => void;
}

// Accent (warm) + highlighter (ivory) swatch options — from the design handoff.
export const ACCENT_OPTIONS = ["#B85C3F", "#6E8F82", "#C68A3D", "#8F7FA8"];
export const HL_OPTIONS = ["#F5A088", "#FBD24E", "#BFD06A", "#EBA6B6"];

const KEY = "brain180-theme";

interface Persisted {
  skin: Skin;
  accent: string;
  hl: string;
  paper: PaperBg;
}

const DEFAULTS: Persisted = {
  skin: "warm",
  accent: "#B85C3F",
  hl: "#F5A088",
  paper: "paper",
};

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      skin: parsed.skin ?? DEFAULTS.skin,
      accent: parsed.accent ?? DEFAULTS.accent,
      hl: parsed.hl ?? DEFAULTS.hl,
      paper: parsed.paper ?? DEFAULTS.paper,
    };
  } catch {
    return DEFAULTS;
  }
}

function persist(s: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage may be unavailable (private mode) — theme stays in-memory */
  }
}

export const useTheme = create<ThemeState>((set, get) => ({
  ...load(),
  setSkin: (skin) => {
    set({ skin });
    const { accent, hl, paper } = get();
    persist({ skin, accent, hl, paper });
  },
  setAccent: (accent) => {
    set({ accent });
    const { skin, hl, paper } = get();
    persist({ skin, accent, hl, paper });
  },
  setHl: (hl) => {
    set({ hl });
    const { skin, accent, paper } = get();
    persist({ skin, accent, hl, paper });
  },
  setPaper: (paper) => {
    set({ paper });
    const { skin, accent, hl } = get();
    persist({ skin, accent, hl, paper });
  },
}));

// Inline CSS vars for the shell root, derived from the active theme.
export function rootThemeStyle(
  skin: Skin,
  accent: string,
  hl: string,
): React.CSSProperties {
  const style: Record<string, string> = {};
  if (skin === "warm") style["--color-brain-accent"] = accent;
  // slate / dark / ivory share the highlighter point color
  if (skin === "slate" || skin === "dark" || skin === "ivory")
    style["--brain-hl"] = hl;
  return style as React.CSSProperties;
}
