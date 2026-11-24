export interface CategoryPalette {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  tone: "light" | "dark";
}

export const DEFAULT_PALETTE: CategoryPalette = {
  bg: "#F7F3EC",
  surface: "#EFE7DA",
  ink: "#15100C",
  muted: "#5E5048",
  accent: "#A87945",
  tone: "light",
};

const NAMED: Record<string, CategoryPalette> = {
  attar: { bg: "#2A1309", surface: "#3A1D10", ink: "#F7F3EC", muted: "#CBB9A5", accent: "#C49A62", tone: "dark" },
  attars: { bg: "#2A1309", surface: "#3A1D10", ink: "#F7F3EC", muted: "#CBB9A5", accent: "#C49A62", tone: "dark" },
  oud: { bg: "#1F0F08", surface: "#32180E", ink: "#F7F3EC", muted: "#C7B5A2", accent: "#E3CBA4", tone: "dark" },
  perfume: DEFAULT_PALETTE,
  perfumes: DEFAULT_PALETTE,
  handicraft: { bg: "#EFE7DA", surface: "#E5D9C7", ink: "#15100C", muted: "#5E5048", accent: "#6B432A", tone: "light" },
  handicrafts: { bg: "#EFE7DA", surface: "#E5D9C7", ink: "#15100C", muted: "#5E5048", accent: "#6B432A", tone: "light" },
  "gift-sets": { bg: "#32180E", surface: "#4A2817", ink: "#F7F3EC", muted: "#CDBCA8", accent: "#C49A62", tone: "dark" },
  "new-arrivals": { bg: "#F2EDE4", surface: "#E5D9C7", ink: "#15100C", muted: "#5E5048", accent: "#A87945", tone: "light" },
};

const LIGHT_POOL: CategoryPalette[] = [
  { bg: "#F4F1E8", surface: "#E8E1D3", ink: "#15100C", muted: "#5E5048", accent: "#A87945", tone: "light" },
  { bg: "#F1F0EC", surface: "#E2E0D8", ink: "#14161A", muted: "#53585F", accent: "#6B7A86", tone: "light" },
  { bg: "#F6F1EB", surface: "#EADFD1", ink: "#1A120C", muted: "#5F5146", accent: "#8C6239", tone: "light" },
  { bg: "#EFF1EE", surface: "#DFE3DD", ink: "#131814", muted: "#4F574F", accent: "#5F7259", tone: "light" },
];

const DARK_POOL: CategoryPalette[] = [
  { bg: "#241508", surface: "#352110", ink: "#F7F3EC", muted: "#C9B8A4", accent: "#C49A62", tone: "dark" },
  { bg: "#16181C", surface: "#23272D", ink: "#F2F3F5", muted: "#A9AFB7", accent: "#8FA3B0", tone: "dark" },
  { bg: "#1C1410", surface: "#2B211A", ink: "#F6F1EA", muted: "#C0B2A3", accent: "#B98E5E", tone: "dark" },
  { bg: "#121A16", surface: "#1E2A23", ink: "#F0F4F1", muted: "#AFBDB4", accent: "#7FA38C", tone: "dark" },
];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

export function categoryPalette(slug: string | null | undefined, theme?: "light" | "dark" | null): CategoryPalette {
  const key = (slug ?? "").trim().toLowerCase();
  if (!key) return DEFAULT_PALETTE;
  const named = NAMED[key];
  if (named && !theme) return named;
  if (named && named.tone === theme) return named;

  const pool = theme === "dark" ? DARK_POOL : theme === "light" ? LIGHT_POOL : named ? (named.tone === "dark" ? DARK_POOL : LIGHT_POOL) : LIGHT_POOL;
  return pool[hash(key) % pool.length];
}

export function paletteVars(p: CategoryPalette): Record<string, string> {
  return {
    "--cat-bg": p.bg,
    "--cat-surface": p.surface,
    "--cat-ink": p.ink,
    "--cat-muted": p.muted,
    "--cat-accent": p.accent,
  };
}
