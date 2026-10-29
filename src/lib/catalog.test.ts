import { describe, expect, it } from "vitest";
import type { ProductDTO } from "@/lib/api/types";
import { collectionRules, isFragrance, productMaterial, productWorld, toProduct } from "@/lib/catalog";
import { mapCart } from "@/lib/cart";

const dto = (id: number, over: Partial<ProductDTO> = {}): ProductDTO => ({
  productId: id, name: `P${id}`, slug: `p${id}`, description: null, category: "PERFUME", gender: "UNISEX", fragranceFamily: "WOODY",
  quantity: null, mrp: 150000, price: 120000, discount: 20, stock: 5, image: null, active: true, ...over,
});
const craft = (id: number, name: string, material: ProductDTO["material"] = "BRASS") =>
  dto(id, { name, category: "HANDICRAFT", material, gender: null, fragranceFamily: null });

describe("the Handicraft Collection (category HANDICRAFT, with a material)", () => {
  it("classifies a product by its backend category", () => {
    expect(productWorld(dto(1, { category: "ATTAR" }))).toBe("attar");
    expect(productWorld(dto(2))).toBe("perfume");
    expect(productWorld(craft(3, "Brass Pedestal Stand"))).toBe("handicraft");
    expect(productWorld(dto(4, { category: null }))).toBe("perfume");
  });

  it("treats a product saved with no category and no family as a handicraft", () => {
    expect(productWorld(dto(5, { category: null, fragranceFamily: null }))).toBe("handicraft");
    expect(productMaterial(dto(5, { category: null, fragranceFamily: null }))).toBe("others");
  });

  it("reads the material, defaulting an unset one to others", () => {
    expect(productMaterial(craft(6, "Brass Stand", "BRASS"))).toBe("brass");
    expect(productMaterial(craft(7, "Copper Tumbler", "COPPER"))).toBe("copper");
    expect(productMaterial(craft(8, "Carved Tray", "OTHERS"))).toBe("others");
    expect(productMaterial(craft(9, "Unset Piece", null))).toBe("others");
    expect(productMaterial(dto(10))).toBeUndefined();
  });

  it("keeps handicraft pieces out of every fragrance collection", () => {
    const all = [
      toProduct(dto(1, { category: "ATTAR", name: "Royal Oud" })),
      toProduct(dto(2)),
      toProduct(craft(3, "Brass Oud Stand")),
      toProduct(craft(4, "Copper Water Tumbler", "COPPER")),
    ];
    const ids = (slug: string) => all.filter((p) => collectionRules[slug](p, all)).map((p) => p.productId);
    expect(ids("handicraft")).toEqual([3, 4]);
    expect(ids("all")).toEqual([1, 2]);
    expect(ids("oud")).toEqual([1]);
    expect(ids("him")).toEqual([1, 2]);
    expect(ids("new-arrivals")).toEqual([1, 2]);
    expect(all.filter(isFragrance).map((p) => p.productId)).toEqual([1, 2]);
  });

  it("carries the world and the material onto the storefront product", () => {
    const piece = toProduct(craft(3, "Copper Water Tumbler", "COPPER"));
    expect(piece.world).toBe("handicraft");
    expect(piece.material).toBe("copper");
  });

  it("carries the world into the bag", () => {
    const cart = mapCart({ cartId: 1, totalPrice: 0, products: [{ ...craft(3, "Brass Pedestal Stand"), quantity: 1 }] });
    expect(cart.lines[0].world).toBe("handicraft");
  });
});
