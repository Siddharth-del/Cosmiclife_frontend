import { optimisedImage, productWorld } from "@/lib/catalog";
import { isIntl } from "@/lib/market";
import type { CartDTO, ProductDTO } from "@/lib/api/types";
import type { World } from "@/types";

export const MAX_PER_LINE = 10;

export interface CartLine {
  key: string;
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  world: World;
  price: number;
  mrp: number | null;
  stock: number;
  active: boolean;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  id: number | null;
  lines: CartLine[];
  count: number;
  subtotal: number;
  savings: number;
}

export const emptyCart: Cart = { id: null, lines: [], count: 0, subtotal: 0, savings: 0 };

const image = (src: string | null | undefined) => (src && /^(https?:)?\/\//i.test(src.trim()) ? optimisedImage(src.trim(), 400) : null);

function toLine(raw: ProductDTO, quantity: number): CartLine {
  const price = (isIntl ? raw.priceUsd : raw.price) ?? 0;
  return {
    key: `P:${raw.productId}`,
    productId: raw.productId,
    slug: raw.slug || `product-${raw.productId}`,
    name: raw.name ?? "",
    image: image(raw.image),
    world: productWorld(raw),
    price,
    mrp: (isIntl ? raw.mrpUsd : raw.mrp) ?? null,
    stock: typeof raw.stock === "number" ? Math.max(0, raw.stock) : 0,
    active: raw.active !== false,
    quantity,
    lineTotal: price * quantity,
  };
}

export function mapCart(c: CartDTO | null | undefined): Cart {
  if (!c) return emptyCart;
  const byId = new Map<number, CartLine>();
  for (const raw of c.products ?? []) {
    const qty = Number.isInteger(raw.quantity) && (raw.quantity ?? 0) > 0 ? (raw.quantity as number) : 1;
    const line = byId.get(raw.productId);
    if (line) {
      line.quantity += qty;
      line.lineTotal = line.price * line.quantity;
    } else byId.set(raw.productId, toLine(raw, qty));
  }
  const lines = [...byId.values()];
  return {
    id: c.cartId ?? null,
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
    savings: lines.reduce((n, l) => n + (l.mrp && l.mrp > l.price ? (l.mrp - l.price) * l.quantity : 0), 0),
  };
}

export function availableQuantity(l: CartLine): number {
  return l.active ? Math.min(MAX_PER_LINE, l.stock) : 0;
}

export interface LineProblem {
  message: string;
  canOrder: number;
}

export function lineProblem(l: CartLine): LineProblem | null {
  if (!l.active) return { message: `${l.name} is no longer available.`, canOrder: 0 };
  if (isIntl && l.price <= 0) return { message: `${l.name} can't be shipped internationally yet.`, canOrder: 0 };
  if (l.stock <= 0) return { message: `${l.name} is out of stock.`, canOrder: 0 };
  if (l.quantity > l.stock) return { message: `Only ${l.stock} left of ${l.name}.`, canOrder: l.stock };
  return null;
}

export function cartProblems(cart: Cart): { key: string; name: string; message: string; canOrder: number }[] {
  return cart.lines.flatMap((l) => {
    const p = lineProblem(l);
    return p ? [{ key: l.key, name: l.name, ...p }] : [];
  });
}

export const cartSignature = (cart: Cart) =>
  cart.lines
    .map((l) => `${l.key}x${l.quantity}`)
    .sort()
    .join(",");
