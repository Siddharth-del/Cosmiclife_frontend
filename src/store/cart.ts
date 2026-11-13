import { create } from "zustand";
import { cartApi } from "@/lib/api/cart";
import { errorKind, type ErrorKind } from "@/lib/api/client";
import type { CartDTO } from "@/lib/api/types";
import { mapCart, MAX_PER_LINE, type Cart, type CartLine } from "@/lib/cart";
import { errorMessage } from "@/lib/errors";
import { useAuth } from "@/store/auth";
import { toast } from "@/store/toast";

export type CartStatus = "signed-out" | "loading" | "ready" | "error";

interface CartState {
  cart: Cart | null;
  status: CartStatus;
  error: { message: string; kind: ErrorKind } | null;
  pending: string[];
  loadedAt: number;

  load: (opts?: { maxAge?: number }) => Promise<Cart | null>;
  add: (productId: number, quantity?: number) => Promise<boolean>;
  increment: (productId: number) => Promise<boolean>;
  decrement: (productId: number) => Promise<boolean>;
  setQuantity: (productId: number, quantity: number) => Promise<boolean>;
  remove: (productId: number) => Promise<boolean>;
  reset: () => void;
}

let chain: Promise<unknown> = Promise.resolve();
let generation = 0;
let inflightLoad: Promise<Cart | null> | null = null;

const signedIn = () => !!useAuth.getState().token;
const isCartDTO = (v: unknown): v is CartDTO => !!v && typeof v === "object" && "cartId" in v;

export const useCart = create<CartState>()((set, get) => {
  const fetchCart = async (): Promise<Cart | null> => {
    const gen = generation;
    if (!signedIn()) {
      set({ cart: null, status: "signed-out", error: null });
      return null;
    }
    if (!get().cart) set({ status: "loading", error: null });
    try {
      const cart = mapCart(await cartApi.get());
      if (gen !== generation) return null;
      set({ cart, status: "ready", error: null, loadedAt: Date.now() });
      return cart;
    } catch (e) {
      if (gen !== generation) return null;
      const kind = errorKind(e);
      if (kind === "session") {
        set({ cart: null, status: "signed-out", error: null });
        return null;
      }
      set({ status: get().cart ? "ready" : "error", error: { message: errorMessage(e), kind } });
      return null;
    }
  };

  const mutate = (key: string, task: () => Promise<unknown>, failure: string): Promise<boolean> => {
    if (!signedIn()) return Promise.resolve(false);
    const gen = generation;
    set((s) => ({ pending: [...s.pending, key] }));
    const run = async () => {
      try {
        const res = await task();
        if (gen !== generation) return false;
        if (isCartDTO(res)) set({ cart: mapCart(res), status: "ready", error: null, loadedAt: Date.now() });
        else await fetchCart();
        return true;
      } catch (e) {
        if (gen !== generation) return false;
        if (errorKind(e) === "session") {
          set({ cart: null, status: "signed-out", error: null });
          toast({ title: "Please sign in again", description: "Your session has ended.", tone: "error" });
          return false;
        }
        toast({ title: failure, description: errorMessage(e), tone: "error" });
        await fetchCart();
        return false;
      } finally {
        set((s) => {
          const i = s.pending.indexOf(key);
          return i < 0 ? s : { pending: [...s.pending.slice(0, i), ...s.pending.slice(i + 1)] };
        });
      }
    };
    const p = chain.then(run, run);
    chain = p.catch(() => undefined);
    return p;
  };

  const productLine = (id: number): CartLine | undefined => get().cart?.lines.find((l) => l.productId === id);

  const cartId = () => {
    const id = get().cart?.id;
    if (id == null) throw new Error("Your bag is still loading. Please try again.");
    return id;
  };

  const lowerTo = async (productId: number, target: number): Promise<unknown> => {
    const line = productLine(productId);
    const have = line?.quantity ?? 0;
    if (target >= have) return undefined;
    if (target <= 0) return cartApi.remove(cartId(), productId);
    if (line && have - 1 <= line.stock) {
      let res: unknown;
      for (let q = have; q > target; q--) res = await cartApi.step(productId, "delete");
      return res;
    }
    await cartApi.remove(cartId(), productId);
    return cartApi.add(productId, target);
  };

  return {
    cart: null,
    status: signedIn() ? "loading" : "signed-out",
    error: null,
    pending: [],
    loadedAt: 0,

    load: ({ maxAge } = {}) => {
      const s = get();
      if (maxAge && s.status === "ready" && s.cart && Date.now() - s.loadedAt < maxAge) return Promise.resolve(s.cart);
      if (inflightLoad) return inflightLoad;
      const p = chain.then(fetchCart, fetchCart).finally(() => {
        if (inflightLoad === p) inflightLoad = null;
      });
      inflightLoad = p;
      chain = p.catch(() => undefined);
      return p;
    },

    add: (productId, quantity = 1) => mutate(`P:${productId}`, () => cartApi.add(productId, quantity), "Couldn't add to your bag"),
    increment: (productId) => mutate(`P:${productId}`, () => cartApi.step(productId, "add"), "Couldn't change the quantity"),
    decrement: (productId) =>
      mutate(
        `P:${productId}`,
        () => {
          const line = productLine(productId);
          if (line && line.quantity - 1 > line.stock) return lowerTo(productId, line.active ? line.stock : 0);
          return cartApi.step(productId, "delete");
        },
        "Couldn't change the quantity",
      ),
    remove: (productId) => mutate(`P:${productId}`, async () => cartApi.remove(cartId(), productId), "Couldn't remove it from your bag"),
    setQuantity: (productId, quantity) =>
      mutate(
        `P:${productId}`,
        async () => {
          const target = Math.max(0, Math.min(MAX_PER_LINE, Math.floor(quantity)));
          const have = productLine(productId)?.quantity ?? 0;
          if (target === have) return undefined;
          if (target > have) return cartApi.add(productId, target - have);
          return lowerTo(productId, target);
        },
        "Couldn't change the quantity",
      ),

    reset: () => {
      generation++;
      inflightLoad = null;
      set({ cart: null, status: signedIn() ? "loading" : "signed-out", error: null, pending: [], loadedAt: 0 });
    },
  };
});

export const useCartCount = () => useCart((s) => s.cart?.count ?? 0);
