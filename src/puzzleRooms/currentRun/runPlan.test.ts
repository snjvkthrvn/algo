import { describe, expect, it } from "vitest";
import { CURRENT_RIDER_ROUNDS } from "../../data/puzzles/twinRiversPuzzleLogic";
import {
  RUN_ROUNDS,
  firstSnag,
  riderWalk,
  roundPar,
  runPar,
} from "./runPlan";

describe("RUN_ROUNDS", () => {
  it("keeps the four letter streams verbatim", () => {
    expect(RUN_ROUNDS).toHaveLength(4);
    RUN_ROUNDS.forEach((round, i) => {
      expect(round.letters).toEqual(CURRENT_RIDER_ROUNDS[i].letters);
    });
  });
});

describe("riderWalk", () => {
  it("hand-checks the teach stream", () => {
    // A B C A D B E F: best clean run is C A D B E F? No — walk it:
    // window grows ABC, A arrives → shrink past first A → BCA(D)…
    // grows to C A D B? B duplicates at idx5 vs idx1: by then left=1 (BCAD),
    // B arrives → shrink past B(idx1) → left=2 (CADB), then E, F →
    // CADBEF len 6, start 2. Rights = 7 (idx 1..7). Lefts = 2 (past A0, B1).
    const walk = riderWalk(["A", "B", "C", "A", "D", "B", "E", "F"]);
    expect(walk.bestStart).toBe(2);
    expect(walk.bestLength).toBe(6);
    expect(walk.rights).toBe(7);
    expect(walk.lefts).toBe(2);
  });

  it("breaks length ties to the earliest run", () => {
    // A B A B: runs AB (0,2) and BA (1,2) and AB (2,2) — best is (0,2).
    const walk = riderWalk(["A", "B", "A", "B"]);
    expect(walk.bestStart).toBe(0);
    expect(walk.bestLength).toBe(2);
  });

  it("does not mutate its input", () => {
    const letters = ["A", "B", "A"];
    riderWalk(letters);
    expect(letters).toEqual(["A", "B", "A"]);
  });
});

describe("firstSnag", () => {
  const letters = ["A", "B", "C", "A", "D"];

  it("finds the offending duplicate pair inside the window", () => {
    expect(firstSnag(letters, 0, 3)).toEqual([0, 3]);
  });

  it("returns null for a clean window", () => {
    expect(firstSnag(letters, 1, 3)).toBe(null);
    expect(firstSnag(letters, 0, 2)).toBe(null);
  });
});

describe("par", () => {
  it("round par is rights + lefts + the claim", () => {
    expect(roundPar(["A", "B", "C", "A", "D", "B", "E", "F"])).toBe(7 + 2 + 1);
  });

  it("run par sums the rounds", () => {
    const expected = RUN_ROUNDS.reduce(
      (sum, round) => sum + roundPar(round.letters),
      0,
    );
    expect(runPar()).toBe(expected);
  });
});
