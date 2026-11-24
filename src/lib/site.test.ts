import { describe, expect, it } from "vitest";
import { footerNavFor, navWithCategories } from "@/lib/site";

describe("navigation is built from admin categories", () => {
  it("shows only the fixed pages when there are no categories", () => {
    expect(navWithCategories([]).map((n) => n.label)).toEqual(["Shop All", "For You", "Journal", "About"]);
  });

  it("adds any category the admin creates, in order, before the fixed pages", () => {
    const nav = navWithCategories([
      { slug: "attar", name: "Attar" },
      { slug: "musical-instrument", name: "Music Instrument" },
      { slug: "electronics", name: "Electronics" },
    ]);
    expect(nav.map((n) => n.label).slice(0, 3)).toEqual(["Attar", "Music Instrument", "Electronics"]);
    expect(nav[1].href).toBe("/collections/musical-instrument");
  });

  it("does not list the same category twice when slugs differ by a trailing s", () => {
    const nav = navWithCategories([
      { slug: "attar", name: "Attar" },
      { slug: "attars", name: "Attars" },
    ]);
    expect(nav.filter((n) => /attar/i.test(n.label))).toHaveLength(1);
  });

  it("links the recommendations page", () => {
    expect(navWithCategories([]).some((n) => n.href === "/recommendations")).toBe(true);
  });

  it("builds the footer Shop column from categories", () => {
    const shop = footerNavFor([{ slug: "electronics", name: "Electronics" }])[0];
    expect(shop.links.map((l) => l.label)).toEqual(["Electronics", "New Arrivals", "Shop All", "Recommendations"]);
  });
});
