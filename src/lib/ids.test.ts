import { describe, expect, it } from "vitest";
import { InvalidIdError, requireId, toId } from "@/lib/ids";

describe("toId", () => {
  it("accepts positive whole numbers and their plain string form", () => {
    expect(toId(7)).toBe(7);
    expect(toId("42")).toBe(42);
    expect(toId(" 9 ")).toBe(9);
  });

  it.each([NaN, 0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 2, "", "box", "NaN", "0", "-3", "1e3", "12abc", "0x10", null, undefined, {}, []])(
    "rejects %s",
    (value) => {
      expect(toId(value)).toBeNull();
    },
  );
});

describe("requireId", () => {
  it("returns the id or throws before a URL can be built", () => {
    expect(requireId("5", "product")).toBe(5);
    expect(() => requireId("box", "product")).toThrow(InvalidIdError);
    expect(() => requireId(Number("abc"), "product")).toThrow("Invalid product id: NaN");
  });
});
