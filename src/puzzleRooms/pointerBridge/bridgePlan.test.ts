import { describe, expect, it } from "vitest";
import { POINTER_BRIDGE_ROUNDS } from "../../data/puzzles/twinRiversPuzzleLogic";
import { BRIDGE_ROUNDS, bridgePar, optimalWalk } from "./bridgePlan";

describe("BRIDGE_ROUNDS", () => {
  it("keeps the four sorted rounds verbatim", () => {
    expect(BRIDGE_ROUNDS).toHaveLength(4);
    BRIDGE_ROUNDS.forEach((round, i) => {
      expect(round.values).toEqual(POINTER_BRIDGE_ROUNDS[i].values);
      expect(round.target).toBe(POINTER_BRIDGE_ROUNDS[i].target);
    });
  });
});

describe("optimalWalk", () => {
  it("round 1 needs zero steps: the end pair already sums to target", () => {
    const walk = optimalWalk([1, 3, 5, 8, 11, 14, 18], 19);
    expect(walk.steps).toEqual([]);
  });

  it("walks the canonical convergence on round 2", () => {
    // [2,4,6,9,12,15,20,23] target 21: 2+23=25>21 R--, 2+20=22>21 R--,
    // 2+15=17<21 L++, 4+15=19<21 L++, 6+15=21 ✓ → 4 steps.
    const walk = optimalWalk([2, 4, 6, 9, 12, 15, 20, 23], 21);
    expect(walk.steps).toEqual(["right", "right", "left", "left"]);
  });

  it("every shipped round converges on a valid pair", () => {
    for (const round of BRIDGE_ROUNDS) {
      const walk = optimalWalk(round.values, round.target);
      const sum =
        round.values[walk.finalLeft] + round.values[walk.finalRight];
      expect(sum).toBe(round.target);
    }
  });

  it("does not mutate its input", () => {
    const values = [1, 3, 5, 8, 11, 14, 18];
    optimalWalk(values, 19);
    expect(values).toEqual([1, 3, 5, 8, 11, 14, 18]);
  });
});

describe("bridgePar", () => {
  it("is each round's optimal steps plus one lock", () => {
    const expected = BRIDGE_ROUNDS.reduce(
      (sum, round) =>
        sum + optimalWalk(round.values, round.target).steps.length + 1,
      0,
    );
    expect(bridgePar()).toBe(expected);
  });
});
