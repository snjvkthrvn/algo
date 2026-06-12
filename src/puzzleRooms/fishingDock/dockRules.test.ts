import { describe, expect, it } from "vitest";
import { frameStartAtX } from "./dockRules";

describe("frameStartAtX", () => {
  // 8 baskets from x=200, pitch 70, net width 3 → starts 0..5.
  const geo = { startX: 200, pitch: 70, count: 8, windowSize: 3 };

  it("maps the player's x to the nearest valid window start", () => {
    expect(frameStartAtX(200, geo)).toBe(0);
    expect(frameStartAtX(345, geo)).toBe(2);
    expect(frameStartAtX(900, geo)).toBe(5); // clamped to the last start
  });

  it("clamps below the dock to the first start", () => {
    expect(frameStartAtX(-50, geo)).toBe(0);
  });
});
