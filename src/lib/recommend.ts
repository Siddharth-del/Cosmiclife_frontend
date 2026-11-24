import type { Gender, Product, ScentFamily } from "@/types";

export interface Preferences {
  /** Admin category (its id), or null for any. A hard filter: the shopper chose it. */
  categoryId: number | null;
  /** The admin's product type within the category (its id), or null. Also a hard filter. */
  productTypeId: number | null;
  /** Budget band, in the shop's current currency. */
  min: number;
  max: number;
  genders: Gender[];
  families: ScentFamily[];
}

export const NO_PREFERENCES: Preferences = { categoryId: null, productTypeId: null, min: 0, max: Infinity, genders: [], families: [] };

export interface Recommendation {
  product: Product;
  score: number;
  /** Short, human reasons shown under the card, e.g. "Woody", "Under ₹1,500". */
  reasons: string[];
}

export const priceOf = (p: Product) => p.variants[0]?.price ?? 0;
export const inStock = (p: Product) => p.active && p.variants.some((v) => v.inStock);
const newest = (a: Product, b: Product) => b.productId - a.productId;

export function hasPreferences(prefs: Preferences): boolean {
  return prefs.categoryId !== null || prefs.productTypeId !== null || prefs.min > 0 || prefs.max !== Infinity || prefs.genders.length > 0 || prefs.families.length > 0;
}

const GENDER_WORD: Record<Gender, string> = { him: "For him", her: "For her", unisex: "Unisex" };
const family = (f: ScentFamily) => f.charAt(0).toUpperCase() + f.slice(1);

/**
 * Ranks products for what the shopper picked. Category, type and budget are hard filters (the shopper chose
 * them); scent families and gender narrow and order the rest. Sold-out products are never recommended.
 */
export function rankByPreferences(products: Product[], prefs: Preferences, fmt: (n: number) => string, limit = 8): Recommendation[] {
  const picks: Recommendation[] = [];
  for (const p of products) {
    if (!inStock(p)) continue;
    if (prefs.categoryId !== null && p.categoryId !== prefs.categoryId) continue;
    if (prefs.productTypeId !== null && p.productTypeId !== prefs.productTypeId) continue;
    const price = priceOf(p);
    if (price < prefs.min || price >= prefs.max) continue;

    let score = 0;
    const reasons: string[] = [];

    if (prefs.families.length) {
      const hits = p.families.filter((f) => prefs.families.includes(f));
      if (!hits.length) continue;
      score += hits.length * 3;
      reasons.push(...hits.map(family));
    }
    if (prefs.genders.length) {
      if (prefs.genders.includes(p.gender)) {
        score += 2;
        reasons.push(GENDER_WORD[p.gender]);
      } else if (p.gender === "unisex") {
        score += 1;
        reasons.push(GENDER_WORD.unisex);
      } else if (p.families.length || p.type === "perfume" || p.type === "attar") {
        continue;
      }
    }
    if (prefs.max !== Infinity || prefs.min > 0) {
      score += 1;
      reasons.push(prefs.min === 0 ? `Under ${fmt(prefs.max)}` : prefs.max === Infinity ? `${fmt(prefs.min)} and above` : `${fmt(prefs.min)} – ${fmt(prefs.max)}`);
    }
    if (p.discount > 0) {
      score += 0.5 + Math.min(p.discount, 50) / 100;
      reasons.push(`${p.discount}% off`);
    }
    picks.push({ product: p, score, reasons });
  }
  return picks.sort((a, b) => b.score - a.score || newest(a.product, b.product)).slice(0, limit);
}

/** What the shopper has shown they like: saved and in-bag products, weighted. */
export function recommendFromSignals(signals: Product[], all: Product[], limit = 8): Recommendation[] {
  if (!signals.length) return [];
  const signalIds = new Set(signals.map((s) => s.id));
  const prices = signals.map(priceOf).filter((n) => n > 0);
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  const picks: Recommendation[] = [];
  for (const p of all) {
    if (signalIds.has(p.id) || !inStock(p)) continue;
    let score = 0;
    let best: { weight: number; reason: string } | null = null;
    const note = (weight: number, reason: string) => {
      score += weight;
      if (!best || weight > best.weight) best = { weight, reason };
    };

    for (const s of signals) {
      if (s.categoryId !== undefined && s.categoryId === p.categoryId) note(3, `More from ${p.categoryName ?? "the same category"}`);
      if (s.productTypeId !== undefined && s.productTypeId === p.productTypeId) note(1.5, p.productTypeName ? `Another ${p.productTypeName}` : "Similar type");
      const shared = p.families.filter((f) => s.families.includes(f));
      if (shared.length) note(2 * shared.length, `${family(shared[0])}, like ${s.name}`);
    }
    if (avg > 0 && Math.abs(priceOf(p) - avg) <= avg * 0.3) note(1, "In your usual price range");
    if (score <= 0) continue;
    picks.push({ product: p, score, reasons: best ? [(best as { reason: string }).reason] : [] });
  }
  return picks.sort((a, b) => b.score - a.score || newest(a.product, b.product)).slice(0, limit);
}

export const newIn = (all: Product[], limit = 8): Product[] => all.filter(inStock).sort(newest).slice(0, limit);

export const bestValue = (all: Product[], limit = 8): Product[] =>
  all
    .filter((p) => inStock(p) && p.discount > 0)
    .sort((a, b) => b.discount - a.discount || newest(a, b))
    .slice(0, limit);

export interface BudgetBand {
  id: string;
  label: string;
  min: number;
  max: number;
}

/** Rounds to a tidy figure (1,480 becomes 1,500; 36 becomes 35) so band labels read naturally. */
export function niceRound(n: number): number {
  if (n <= 0) return 0;
  const step = Math.pow(10, Math.floor(Math.log10(n))) / 2;
  return Math.max(step, Math.round(n / step) * step);
}

/** Budget bands drawn from the prices actually on offer, so every band holds products. */
export function budgetBands(prices: number[], fmt: (n: number) => string): BudgetBand[] {
  const sorted = prices.filter((n) => n > 0).sort((a, b) => a - b);
  if (sorted.length < 4) return [];
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const edges = [...new Set([at(0.25), at(0.5), at(0.75)].map(niceRound))].filter((e) => e > sorted[0] && e <= sorted[sorted.length - 1]).sort((a, b) => a - b);
  if (!edges.length) return [];

  const bands: BudgetBand[] = [{ id: "b0", label: `Under ${fmt(edges[0])}`, min: 0, max: edges[0] }];
  edges.forEach((edge, i) => {
    const next = edges[i + 1];
    bands.push(next === undefined ? { id: `b${i + 1}`, label: `${fmt(edge)} and above`, min: edge, max: Infinity } : { id: `b${i + 1}`, label: `${fmt(edge)} – ${fmt(next)}`, min: edge, max: next });
  });
  return bands;
}
