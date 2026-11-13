import { useEffect } from "react";
import { categoryPalette, paletteVars, type CategoryPalette } from "@/lib/categoryTheme";

export function useCategoryTheme(slug: string | null | undefined, theme?: "light" | "dark" | null): CategoryPalette {
  const palette = categoryPalette(slug, theme);

  useEffect(() => {
    const root = document.documentElement;
    const vars = paletteVars(palette);
    for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
    root.dataset.categoryTone = palette.tone;
    return () => {
      for (const key of Object.keys(vars)) root.style.removeProperty(key);
      delete root.dataset.categoryTone;
    };
  }, [palette.bg, palette.surface, palette.ink, palette.muted, palette.accent, palette.tone, palette]);

  return palette;
}
