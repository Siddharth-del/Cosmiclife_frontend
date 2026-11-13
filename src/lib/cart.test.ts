import { describe, expect, it } from "vitest";
import type { CartDTO, ProductDTO } from "@/lib/api/types";
import { availableQuantity, cartProblems, cartSignature, lineProblem, mapCart } from "@/lib/cart";

const product = (id: number, quantity: number, over: Partial<ProductDTO> = {}): ProductDTO => ({
  productId: id, name: `P${id}`, slug: `p${id}`, description: null, category: id % 2 ? "ATTAR" : "PERFUME", gender: null, fragranceFamily: null,
  quantity, mrp: 250000, price: 199900, discount: 20, stock: 10, image: null, active: true, ...over,
});
const dto = (products: ProductDTO[]): CartDTO => ({ cartId: 7, totalPrice: 0, products });

describe("mapCart (ported from the ForgeX frontend)", () => {
  it("maps products with the server's prices, in paise", () => {
    const cart = mapCart(dto([product(1, 2), product(2, 1, { mrp: null })]));
    expect(cart.id).toBe(7);
    expect(cart.lines.map((l) => l.key)).toEqual(["P:1", "P:2"]);
    expect(cart.lines.map((l) => l.world)).toEqual(["attar", "perfume"]);
    expect(cart.count).toBe(3);
    expect(cart.subtotal).toBe(3 * 199900);
    expect(cart.savings).toBe(2 * (250000 - 199900));
  });

  it("groups repeated product entries and treats a missing quantity as 1, like ForgeX", () => {
    const cart = mapCart(dto([product(1, 2), product(1, 3), product(2, null as unknown as number)]));
    expect(cart.lines.map((l) => `${l.key}x${l.quantity}`)).toEqual(["P:1x5", "P:2x1"]);
    expect(cart.lines[0].lineTotal).toBe(5 * 199900);
  });

  it("gives an empty cart for no data", () => {
    expect(mapCart(null)).toEqual({ id: null, lines: [], count: 0, subtotal: 0, savings: 0 });
    expect(mapCart({ cartId: 3, totalPrice: 0, products: [] }).lines).toEqual([]);
  });

  it("only uses absolute image URLs, sized for the bag", () => {
    const cart = mapCart(dto([product(1, 1, { image: "https://res.cloudinary.com/demo/image/upload/v1/a.jpg" }), product(2, 1, { image: "images/local.png" })]));
    expect(cart.lines[0].image).toContain("w_400");
    expect(cart.lines[1].image).toBeNull();
  });
});

describe("what blocks an order", () => {
  it("flags inactive, sold-out and short lines with what can still be ordered", () => {
    const cart = mapCart(dto([product(1, 1, { active: false }), product(2, 1, { stock: 0 }), product(3, 4, { stock: 2 }), product(4, 1)]));
    expect(cart.lines.map((l) => lineProblem(l))).toEqual([
      { message: "P1 is no longer available.", canOrder: 0 },
      { message: "P2 is out of stock.", canOrder: 0 },
      { message: "Only 2 left of P3.", canOrder: 2 },
      null,
    ]);
    expect(cartProblems(cart).map((p) => p.key)).toEqual(["P:1", "P:2", "P:3"]);
  });

  it("caps what can be ordered at the stock and the 10-per-product limit", () => {
    const [a, b, c] = mapCart(dto([product(1, 1, { stock: 25 }), product(2, 1, { stock: 4 }), product(3, 1, { active: false })])).lines;
    expect([availableQuantity(a), availableQuantity(b), availableQuantity(c)]).toEqual([10, 4, 0]);
  });

  it("finds nothing wrong with an orderable cart", () => {
    expect(cartProblems(mapCart(dto([product(1, 2), product(2, 10)])))).toEqual([]);
  });
});

describe("cartSignature", () => {
  it("depends on contents, not order", () => {
    const a = mapCart(dto([product(1, 2), product(2, 1)]));
    const b = mapCart(dto([product(2, 1), product(1, 2)]));
    expect(cartSignature(a)).toBe(cartSignature(b));
    expect(cartSignature(a)).not.toBe(cartSignature(mapCart(dto([product(1, 3), product(2, 1)]))));
  });
});
