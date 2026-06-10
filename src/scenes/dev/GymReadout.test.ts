import { describe, expect, it, vi } from "vitest";

// GymReadout imports Phaser (and Player, which imports Phaser) for the
// panel class; the pure formatting under test never touches it. Same
// pattern as Player.test.ts — vitest runs in a Node environment.
vi.mock("phaser", () => ({ default: {} }));

import { formatReadoutLines, type ReadoutData } from "./GymReadout";

const sample: ReadoutData = {
  x: 1283.4,
  y: 717.9,
  state: "walking",
  facing: "right",
  animKey: "player-walk-right",
  frameIndex: 3,
  fps: 59.7,
};

describe("formatReadoutLines", () => {
  it("formats position with grid cell (32px tiles)", () => {
    const lines = formatReadoutLines(sample);
    expect(lines[0]).toBe("pos 1283,718  cell 40,22");
  });

  it("formats state, facing, animation, and fps", () => {
    expect(formatReadoutLines(sample)).toEqual([
      "pos 1283,718  cell 40,22",
      "state walking  facing right",
      "anim player-walk-right #3",
      "fps 60",
    ]);
  });
});
