import { describe, expect, it } from "vitest";
import { inClaimZone, rightEdgeAtX } from "./runRules";

describe("rightEdgeAtX", () => {
  // 8 floats from x=200, pitch 64; current left tie at index 2.
  const geo = { startX: 200, pitch: 64, count: 8 };

  it("maps the player's x to the nearest float, never left of the tie", () => {
    expect(rightEdgeAtX(520, geo, 2)).toBe(5);
    expect(rightEdgeAtX(200, geo, 2)).toBe(2); // clamped to the left tie
    expect(rightEdgeAtX(2000, geo, 2)).toBe(7); // clamped to the last float
  });
});

describe("inClaimZone", () => {
  const geo = { startX: 200, pitch: 64, count: 8 };
  // Last float at 200 + 7*64 = 648; the post stands east of it.
  it("is the strip past the last float around the post", () => {
    expect(inClaimZone(760, geo, 780, 70)).toBe(true);
    expect(inClaimZone(640, geo, 780, 70)).toBe(false); // still on the row
    expect(inClaimZone(900, geo, 780, 70)).toBe(false); // past the post
  });
});
