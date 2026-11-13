import { describe, expect, it } from "vitest";
import { legacyCodeFor, normaliseCategory } from "@/lib/api/categories";
import { productMaterial, productWorld, sameSlug } from "@/lib/catalog";
import { productKind } from "@/lib/scent";

describe("normaliseCategory", () => {
  it("reads the backend's categoryName", () => {
    const c = normaliseCategory({ categoryId: 1, categoryName: "Perfumes" });
    expect(c.name).toBe("Perfumes");
    expect(c.slug).toBe("perfumes");
    expect(c.legacyCode).toBe("PERFUME");
  });

  it("never leaves name undefined", () => {
    const c = normaliseCategory({ categoryId: 2 });
    expect(c.name).toBe("");
    expect(() => c.name.slice(0, 2)).not.toThrow();
  });

  it("still accepts a name field if the backend sends one", () => {
    expect(normaliseCategory({ categoryId: 3, name: "Attars" }).legacyCode).toBe("ATTAR");
  });

  it("gives a custom category no legacy code", () => {
    const c = normaliseCategory({ categoryId: 4, categoryName: "Home Decor" });
    expect(c.legacyCode).toBeNull();
    expect(c.slug).toBe("home-decor");
  });

  it("defaults active and theme when the backend omits them", () => {
    const c = normaliseCategory({ categoryId: 5, categoryName: "Gift Sets" });
    expect(c.active).toBe(true);
    expect(c.theme).toBe("light");
  });
});

describe("legacyCodeFor", () => {
  it("matches singular and plural", () => {
    expect(legacyCodeFor("Attar")).toBe("ATTAR");
    expect(legacyCodeFor("Attars")).toBe("ATTAR");
    expect(legacyCodeFor("Handicrafts")).toBe("HANDICRAFT");
  });

  it("returns null for anything else", () => {
    expect(legacyCodeFor("Oriental Oils")).toBeNull();
  });
});
describe("productWorld", () => {
  it("keeps the three legacy worlds", () => {
    expect(productWorld({ category: "ATTAR", fragranceFamily: null, categoryName: "Attar" })).toBe("attar");
    expect(productWorld({ category: "PERFUME", fragranceFamily: null, categoryName: "Perfumes" })).toBe("perfume");
    expect(productWorld({ category: "HANDICRAFT", fragranceFamily: null, categoryName: "Handicraft" })).toBe("handicraft");
  });

  it("does not file a non-legacy category under handicraft", () => {
    expect(productWorld({ category: null, fragranceFamily: null, categoryName: "Musical-Instrument" })).toBe("other");
    expect(productWorld({ category: null, fragranceFamily: null, categoryName: "Electronics" })).toBe("other");
  });

  it("leaves a product with no category on the legacy fallback", () => {
    expect(productWorld({ category: null, fragranceFamily: null, categoryName: null })).toBe("handicraft");
    expect(productWorld({ category: null, fragranceFamily: "WOODY", categoryName: null })).toBe("perfume");
  });
});

describe("productMaterial", () => {
  it("does not invent a material for a non-handicraft category", () => {
    expect(productMaterial({ category: null, fragranceFamily: null, categoryName: "Musical-Instrument", material: null })).toBeUndefined();
  });

  it("still defaults handicraft pieces to others", () => {
    expect(productMaterial({ category: "HANDICRAFT", fragranceFamily: null, categoryName: "Handicraft", material: null })).toBe("others");
  });
});

describe("productKind", () => {
  it("shows the real category name for a non-legacy product", () => {
    expect(productKind({ type: "other", categoryName: "Musical-Instrument" })).toBe("Musical-Instrument");
  });

  it("leaves the legacy labels alone", () => {
    expect(productKind({ type: "attar", categoryName: "Attar" })).toBe("Attar");
  });
});

describe("sameSlug", () => {
  it("matches a plural collection to a singular category and back", () => {
    expect(sameSlug("attars", "attar")).toBe(true);
    expect(sameSlug("attar", "attars")).toBe(true);
    expect(sameSlug("perfumes", "perfume")).toBe(true);
    expect(sameSlug("handicraft", "handicraft")).toBe(true);
  });

  it("keeps unrelated slugs apart", () => {
    expect(sameSlug("attars", "perfumes")).toBe(false);
    expect(sameSlug("electronics", "musical-instrument")).toBe(false);
  });
});
