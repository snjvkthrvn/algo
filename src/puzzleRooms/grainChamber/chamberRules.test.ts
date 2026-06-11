import { describe, expect, it } from "vitest";
import { gapIndexAtX, shouldGlitchScramble } from "./chamberRules";

describe("gapIndexAtX", () => {
  // Lane of 4 crates starting at x=100, crate width 64, gap 24:
  // centers at 132, 220, 308, 396; gap midpoints at 176, 264, 352.
  const lane = { startX: 100, crateW: 64, gapW: 24, count: 4 };

  it("returns the gap whose midpoint is nearest the player", () => {
    expect(gapIndexAtX(176, lane)).toBe(0);
    expect(gapIndexAtX(270, lane)).toBe(1);
    expect(gapIndexAtX(351, lane)).toBe(2);
  });

  it("returns -1 when the player is past the lane ends", () => {
    expect(gapIndexAtX(40, lane)).toBe(-1);
    expect(gapIndexAtX(520, lane)).toBe(-1);
  });
});

describe("shouldGlitchScramble", () => {
  it("never fires before the final delivery", () => {
    expect(
      shouldGlitchScramble({ deliveryIndex: 0, idleMs: 60_000, scrambles: 0 }),
    ).toBe(false);
    expect(
      shouldGlitchScramble({ deliveryIndex: 1, idleMs: 60_000, scrambles: 0 }),
    ).toBe(false);
  });

  it("fires on the final delivery after 10s idle, once only", () => {
    expect(
      shouldGlitchScramble({ deliveryIndex: 2, idleMs: 9_999, scrambles: 0 }),
    ).toBe(false);
    expect(
      shouldGlitchScramble({ deliveryIndex: 2, idleMs: 10_000, scrambles: 0 }),
    ).toBe(true);
    expect(
      shouldGlitchScramble({ deliveryIndex: 2, idleMs: 30_000, scrambles: 1 }),
    ).toBe(false);
  });
});
