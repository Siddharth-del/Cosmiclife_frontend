import { describe, expect, it } from "vitest";
import { NO_PREFERENCES, bestValue, budgetBands, hasPreferences, newIn, niceRound, rankByPreferences, recommendFromSignals } from "@/lib/recommend";
import type { Product } from "@/types";

const fmt = (n: number) => `₹${n}`;

let seq = 0;
function product(o: Partial<Product> & { price?: number } = {}): Product {
  const id = ++seq;
  const { price = 1000, ...rest } = o;
  return {
    id: String(id),
    productId: id,
    slug: `p-${id}`,
    name: `Product ${id}`,
    type: "other",
    world: "other",
    gender: "unisex",
    family: "",
    families: [],
    description: "",
    variants: [{ id: String(id), size: "", price, inStock: true }],
    images: [],
    stock: 5,
    active: true,
    discount: 0,
    badges: [],
    ...rest,
  };
}

describe("rankByPreferences", () => {
  const attar = product({ categoryId: 1, categoryName: "Attar", type: "attar", families: ["woody"], gender: "him", price: 900 });
  const floral = product({ categoryId: 1, categoryName: "Attar", type: "attar", families: ["floral"], gender: "her", price: 1400 });
  const drum = product({ categoryId: 2, categoryName: "Musical Instrument", price: 7000 });
  const soldOut = product({ categoryId: 1, categoryName: "Attar", type: "attar", families: ["woody"], variants: [{ id: "x", size: "", price: 900, inStock: false }] });
  const all = [attar, floral, drum, soldOut];

  it("recommends any category the admin created, not just fragrances", () => {
    const out = rankByPreferences(all, { ...NO_PREFERENCES, categoryId: 2 }, fmt);
    expect(out.map((p) => p.product.id)).toEqual([drum.id]);
  });

  it("never recommends sold-out products", () => {
    expect(rankByPreferences(all, NO_PREFERENCES, fmt).some((p) => p.product.id === soldOut.id)).toBe(false);
  });

  it("filters by budget and explains the match", () => {
    const out = rankByPreferences(all, { ...NO_PREFERENCES, min: 0, max: 1000 }, fmt);
    expect(out.map((p) => p.product.id)).toEqual([attar.id]);
    expect(out[0].reasons).toContain("Under ₹1000");
  });

  it("matches scent family and gender, and says why", () => {
    const out = rankByPreferences(all, { ...NO_PREFERENCES, families: ["woody"], genders: ["him"] }, fmt);
    expect(out).toHaveLength(1);
    expect(out[0].reasons).toEqual(expect.arrayContaining(["Woody", "For him"]));
  });

  it("drops a fragrance for the other gender but keeps unisex ones", () => {
    const unisex = product({ type: "perfume", families: ["woody"], gender: "unisex" });
    const out = rankByPreferences([floral, unisex], { ...NO_PREFERENCES, genders: ["him"] }, fmt);
    expect(out.map((p) => p.product.id)).toEqual([unisex.id]);
  });

  it("reports whether anything is chosen", () => {
    expect(hasPreferences(NO_PREFERENCES)).toBe(false);
    expect(hasPreferences({ ...NO_PREFERENCES, max: 500 })).toBe(true);
  });
});

describe("recommendFromSignals", () => {
  const saved = product({ categoryId: 1, categoryName: "Attar", type: "attar", families: ["woody"], price: 1000 });
  const sameCategory = product({ categoryId: 1, categoryName: "Attar", price: 1100 });
  const sameScent = product({ categoryId: 3, families: ["woody"], price: 5000 });
  const unrelated = product({ categoryId: 9, price: 90000 });

  it("returns nothing without signals", () => {
    expect(recommendFromSignals([], [saved, sameCategory])).toEqual([]);
  });

  it("leaves out the products it learned from and unrelated ones", () => {
    const ids = recommendFromSignals([saved], [saved, sameCategory, sameScent, unrelated]).map((p) => p.product.id);
    expect(ids).toEqual([sameCategory.id, sameScent.id]);
  });

  it("gives a reason", () => {
    const [first] = recommendFromSignals([saved], [sameCategory]);
    expect(first.reasons[0]).toMatch(/More from Attar/);
  });
});

describe("shelves", () => {
  it("lists newest first and only what is in stock", () => {
    const a = product();
    const b = product();
    const gone = product({ variants: [{ id: "g", size: "", price: 1, inStock: false }] });
    expect(newIn([a, b, gone]).map((p) => p.id)).toEqual([b.id, a.id]);
  });

  it("orders best value by discount", () => {
    const small = product({ discount: 10 });
    const big = product({ discount: 40 });
    expect(bestValue([small, product(), big]).map((p) => p.id)).toEqual([big.id, small.id]);
  });
});

describe("budget bands", () => {
  it("rounds to tidy figures", () => {
    expect(niceRound(1480)).toBe(1500);
    expect(niceRound(399)).toBe(400);
    expect(niceRound(36)).toBe(35);
  });

  it("builds bands from the real prices and covers every price once", () => {
    const prices = [299, 399, 549, 899, 1299, 1499, 2499, 4999];
    const bands = budgetBands(prices, fmt);
    expect(bands.length).toBeGreaterThanOrEqual(2);
    for (const price of prices) expect(bands.filter((b) => price >= b.min && price < b.max)).toHaveLength(1);
  });

  it("offers no bands when there are too few products to split", () => {
    expect(budgetBands([100, 200], fmt)).toEqual([]);
  });
});
