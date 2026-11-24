import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cartApi } from "@/lib/api/cart";
import { errorKind } from "@/lib/api/client";
import { InvalidIdError } from "@/lib/ids";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ cartId: 1, totalPrice: 0, products: [] }), { status: 200, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { location: { origin: "http://shop.test" } });
});
afterEach(() => vi.unstubAllGlobals());

describe("cart API client never builds a request from a bad id", () => {
  it.each([
    ["add with NaN", () => cartApi.add(Number("box"), 1)],
    ["add with 0", () => cartApi.add(0, 1)],
    ["step with a fraction", () => cartApi.step(1.5, "add")],
    ["remove with a bad cart id", () => cartApi.remove(Number.NaN, 3)],
    ["remove with a bad product id", () => cartApi.remove(7, -2)],
  ])("%s", async (_label, call) => {
    await expect(call()).rejects.toBeInstanceOf(InvalidIdError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects quantities outside 1–10 before sending", async () => {
    await expect(cartApi.add(1, 0)).rejects.toBeInstanceOf(RangeError);
    await expect(cartApi.add(1, 11)).rejects.toBeInstanceOf(RangeError);
    await expect(cartApi.add(1, 2.5)).rejects.toBeInstanceOf(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an invalid id is reported as an input problem, not a session problem", async () => {
    const err = await cartApi.add(Number.NaN, 1).catch((e) => e);
    expect(errorKind(err)).toBe("invalid");
  });

  it("sends valid requests to CartController's endpoints, with the Bearer token and no cookies", async () => {
    const { useAuth } = await import("@/store/auth");
    useAuth.setState({ token: "jwt-123" });
    await cartApi.get();
    await cartApi.add(3, 2);
    await cartApi.step(3, "add");
    await cartApi.step(3, "delete");
    await cartApi.remove(7, 3);
    const calls = fetchMock.mock.calls.map(([url, init]) => [new URL(String(url)).pathname, (init as RequestInit).method, (init as RequestInit).credentials]);
    expect(calls).toEqual([
      ["/api/carts/users/cart", "GET", "omit"],
      ["/api/carts/products/3/quantity/2", "POST", "omit"],
      ["/api/cart/products/3/quantity/add", "PUT", "omit"],
      ["/api/cart/products/3/quantity/delete", "PUT", "omit"],
      ["/api/carts/7/product/3", "DELETE", "omit"],
    ]);
    expect(((fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>).Authorization).toBe("Bearer jwt-123");
    useAuth.setState({ token: null });
  });
});

describe("errorKind", () => {
  it.each([
    [401, "session"],
    [403, "forbidden"],
    [404, "not-found"],
    [409, "conflict"],
    [400, "invalid"],
    [413, "invalid"],
    [500, "server"],
    [503, "server"],
  ] as const)("HTTP %i → %s", async (status, kind) => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: "nope", status: false }), { status, headers: { "Content-Type": "application/json" } }));
    const err = await cartApi.get().catch((e) => e);
    expect(errorKind(err)).toBe(kind);
  });

  it("a failed connection is a network problem", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const err = await cartApi.get().catch((e) => e);
    expect(errorKind(err)).toBe("network");
  });
});
