import { describe, expect, it } from "vitest";
import { binIndexAtX, paceTarget } from "./millRules";

describe("binIndexAtX", () => {
  // Row of 4 bins starting at x=200, bin width 80, gap 20:
  // centers at 240, 340, 440, 540.
  const row = { startX: 200, binW: 80, gapW: 20, count: 4 };

  it("returns the bin whose center is nearest the player", () => {
    expect(binIndexAtX(240, row)).toBe(0);
    expect(binIndexAtX(350, row)).toBe(1);
    expect(binIndexAtX(540, row)).toBe(3);
  });

  it("returns -1 when the player is past the row ends", () => {
    expect(binIndexAtX(80, row)).toBe(-1);
    expect(binIndexAtX(700, row)).toBe(-1);
  });
});

describe("paceTarget", () => {
  it("the wrapping walk IS modulo", () => {
    for (let count = 2; count <= 6; count++) {
      for (let weight = 0; weight <= 30; weight++) {
        expect(paceTarget(weight, count)).toBe(weight % count);
      }
    }
  });
});
