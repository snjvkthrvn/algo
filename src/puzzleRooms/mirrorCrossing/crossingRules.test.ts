import { describe, expect, it } from "vitest";
import { mirrorSlot, slotIndexAtX } from "./crossingRules";

describe("slotIndexAtX", () => {
  // Rack of 6 crates starting at x=300, crate width 56, gap 14:
  // centers at 328, 398, 468, 538, 608, 678.
  const rack = { startX: 300, crateW: 56, gapW: 14, count: 6 };

  it("returns the slot whose center is nearest the player", () => {
    expect(slotIndexAtX(328, rack)).toBe(0);
    expect(slotIndexAtX(470, rack)).toBe(2);
    expect(slotIndexAtX(678, rack)).toBe(5);
  });

  it("returns -1 past the rack ends", () => {
    expect(slotIndexAtX(180, rack)).toBe(-1);
    expect(slotIndexAtX(820, rack)).toBe(-1);
  });
});

describe("mirrorSlot", () => {
  it("reflects across the rack center", () => {
    expect(mirrorSlot(0, 6)).toBe(5);
    expect(mirrorSlot(2, 6)).toBe(3);
    expect(mirrorSlot(3, 7)).toBe(3); // odd row: the fixed centre
  });
});
