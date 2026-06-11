import { describe, expect, it } from "vitest";
import { basketIndexAtX } from "./cellarRules";

describe("basketIndexAtX", () => {
  // Shelf of 5 baskets starting at x=100, basket width 72, gap 16:
  // centers at 136, 224, 312, 400, 488.
  const shelf = { startX: 100, basketW: 72, gapW: 16, count: 5 };

  it("returns the basket whose center is nearest the player", () => {
    expect(basketIndexAtX(136, shelf)).toBe(0);
    expect(basketIndexAtX(150, shelf)).toBe(0);
    expect(basketIndexAtX(230, shelf)).toBe(1);
    expect(basketIndexAtX(488, shelf)).toBe(4);
  });

  it("returns -1 when the player is past the shelf ends", () => {
    expect(basketIndexAtX(20, shelf)).toBe(-1);
    expect(basketIndexAtX(620, shelf)).toBe(-1);
  });
});
