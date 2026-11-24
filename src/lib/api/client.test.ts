import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api/client";
import { useAuth } from "@/store/auth";

const BOILERPLATE = { status: 401, error: "Unauthorized", message: "Full authentication is required to access this resource", path: "/error" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const fetchMock = vi.fn();
const signedIn = (roles = ["ROLE_USER"]) => useAuth.setState({ token: "jwt", user: { id: 1, username: "u", email: "u@example.com", roles }, expiresAt: Date.now() + 60_000, endedBecause: null });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { location: { origin: "http://shop.test" } });
  useAuth.setState({ token: null, user: null, expiresAt: null, endedBecause: null });
});
afterEach(() => vi.unstubAllGlobals());

const fail = (p: Promise<unknown>) => p.then(() => null, (e: ApiError) => e);

describe("api() against this backend's error handling", () => {
  it("keeps sign-in's own 401 and its message", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { message: "Invalid email or password", status: false }));
    const e = await fail(api("/api/auth/signin", { method: "POST", auth: false, body: {} }));
    expect(e).toMatchObject({ status: 401, message: "Invalid email or password" });
  });

  it("reads the 401 boilerplate on a public path as a server failure (e.g. the reset email couldn't be sent)", async () => {
    fetchMock.mockResolvedValueOnce(json(401, BOILERPLATE));
    const e = await fail(api("/api/auth/forgot/password", { method: "POST", auth: false, query: { email: "a@b.co" } }));
    expect(e?.status).toBe(500);
  });

  it("a signed-in 401 with the session still valid is that request failing, not a sign-out", async () => {
    signedIn();
    fetchMock.mockResolvedValueOnce(json(401, BOILERPLATE)).mockResolvedValueOnce(json(200, { id: 1, username: "u", email: "u@example.com", roles: ["ROLE_USER"] }));
    const e = await fail(api("/api/addresses/4", { method: "DELETE" }));
    expect(e?.status).toBe(500);
    expect(useAuth.getState().token).toBe("jwt");
  });

  it("a signed-in 401 on an admin path for an account without ROLE_ADMIN is a 403", async () => {
    signedIn(["ROLE_USER"]);
    fetchMock.mockResolvedValueOnce(json(401, BOILERPLATE)).mockResolvedValueOnce(json(200, { id: 1, roles: ["ROLE_USER"] }));
    const e = await fail(api("/api/admin/orders"));
    expect(e?.status).toBe(403);
  });

  it("signs out when the session itself is no longer accepted", async () => {
    signedIn();
    fetchMock.mockResolvedValueOnce(json(401, BOILERPLATE)).mockResolvedValueOnce(json(401, BOILERPLATE));
    const e = await fail(api("/api/orders"));
    expect(e?.status).toBe(401);
    expect(useAuth.getState()).toMatchObject({ token: null, user: null, endedBecause: "expired" });
  });

  it("sends the Bearer token and never cookies (the backend would let a stale cookie win)", async () => {
    signedIn();
    fetchMock.mockResolvedValueOnce(json(200, []));
    await api("/api/orders");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe("omit");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jwt");
  });

  it("returns text bodies as they are (e.g. 'Royal Oud removed from cart')", async () => {
    signedIn();
    fetchMock.mockResolvedValueOnce(new Response("Royal Oud removed from cart", { status: 200, headers: { "Content-Type": "text/plain;charset=UTF-8" } }));
    expect(await api<string>("/api/carts/1/product/1", { method: "DELETE" })).toBe("Royal Oud removed from cart");
  });
});
