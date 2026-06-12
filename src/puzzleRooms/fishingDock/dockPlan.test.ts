import { describe, expect, it } from "vitest";
import { FIXED_WINDOW_ROUNDS } from "../../data/puzzles/twinRiversPuzzleLogic";
import {
  DOCK_ROUNDS,
  bestWindowStart,
  dockPar,
  roundPar,
  windowSum,
} from "./dockPlan";

describe("DOCK_ROUNDS", () => {
  it("keeps the four rounds verbatim (values and net width)", () => {
    expect(DOCK_ROUNDS).toHaveLength(4);
    DOCK_ROUNDS.forEach((round, i) => {
      expect(round.values).toEqual(FIXED_WINDOW_ROUNDS[i].values);
      expect(round.windowSize).toBe(FIXED_WINDOW_ROUNDS[i].windowSize);
    });
  });
});

describe("windowSum", () => {
  it("sums the framed slats", () => {
    expect(windowSum([2, 7, 1, 9, 4, 5, 3, 6], 0, 3)).toBe(10);
    expect(windowSum([2, 7, 1, 9, 4, 5, 3, 6], 2, 3)).toBe(14);
  });
});

describe("bestWindowStart", () => {
  it("finds the heaviest catch", () => {
    // [2,7,1,9,4,5,3,6] k=3: sums 10,17,14,18,12,14 → start 3.
    expect(bestWindowStart([2, 7, 1, 9, 4, 5, 3, 6], 3)).toBe(3);
  });

  it("breaks ties to the leftmost window", () => {
    expect(bestWindowStart([5, 5, 5, 5], 2)).toBe(0);
  });
});

describe("par", () => {
  it("round par is one full sweep plus the haul", () => {
    expect(roundPar(8, 3)).toBe(6); // (8-3) slides + 1 haul
  });

  it("dock par sums the rounds", () => {
    const expected = DOCK_ROUNDS.reduce(
      (sum, round) => sum + roundPar(round.values.length, round.windowSize),
      0,
    );
    expect(dockPar()).toBe(expected);
  });
});
