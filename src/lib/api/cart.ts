import { api } from "@/lib/api/client";
import type { CartDTO } from "@/lib/api/types";
import { requireId } from "@/lib/ids";

const qty = (n: number) => {
  if (!Number.isInteger(n) || n < 1 || n > 10) throw new RangeError(`Invalid quantity: ${n}`);
  return n;
};

export const cartApi = {
  get: () => api<CartDTO>("/api/carts/users/cart"),
  add: async (productId: number, quantity: number) =>
    api<CartDTO>(`/api/carts/products/${requireId(productId, "product")}/quantity/${qty(quantity)}`, { method: "POST" }),
  step: async (productId: number, op: "add" | "delete") => api<CartDTO>(`/api/cart/products/${requireId(productId, "product")}/quantity/${op}`, { method: "PUT" }),
  remove: async (cartId: number, productId: number) =>
    api<string>(`/api/carts/${requireId(cartId, "cart")}/product/${requireId(productId, "product")}`, { method: "DELETE" }),
};
