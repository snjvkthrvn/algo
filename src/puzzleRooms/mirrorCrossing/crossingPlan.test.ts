import { describe, expect, it } from "vitest";
import { MIRROR_WALK_ROUNDS } from "../../data/puzzles/twinRiversPuzzleLogic";
import {
  CROSSING_ROUNDS,
  crossingPar,
  isReversed,
  needsTrade,
  pairResolved,
  roundPar,
} from "./crossingPlan";

describe("CROSSING_ROUNDS", () => {
  it("keeps the four mirror-walk rows verbatim", () => {
    expect(CROSSING_ROUNDS).toHaveLength(4);
    CROSSING_ROUNDS.forEach((round, i) => {
      expect(round.values).toEqual(MIRROR_WALK_ROUNDS[i].values);
    });
  });
});

describe("needsTrade", () => {
  it("differing mirror pairs need a trade", () => {
    expect(needsTrade([3, 8, 1, 4, 7, 2], 0)).toBe(true); // 3 vs 2
    expect(needsTrade([3, 8, 1, 4, 7, 2], 2)).toBe(true); // 1 vs 4
  });

  it("equal mirror pairs are already mirrored — trading them is waste", () => {
    expect(needsTrade([3, 7, 3, 1, 4, 7, 2, 4, 8, 1, 6, 3], 0)).toBe(false); // 3 vs 3
  });

  it("the odd row's fixed centre never needs a trade", () => {
    expect(needsTrade([9, 1, 5, 3, 6, 4, 7], 3)).toBe(false);
  });
});

describe("roundPar / crossingPar", () => {
  it("round par counts only the differing pairs", () => {
    expect(roundPar([3, 8, 1, 4, 7, 2])).toBe(3);
    // Round 4 has TWO equal pairs — (3,3) at the ends and (4,4) inside —
    // so 6 pairs yield par 4 and two genuine skip decisions.
    expect(roundPar([3, 7, 3, 1, 4, 7, 2, 4, 8, 1, 6, 3])).toBe(4);
  });

  it("total par sums the rounds", () => {
    const expected = CROSSING_ROUNDS.reduce(
      (sum, round) => sum + roundPar(round.values),
      0,
    );
    expect(crossingPar()).toBe(expected);
  });
});

describe("pairResolved", () => {
  const start = [3, 8, 1, 4, 7, 2];

  it("a fresh differing pair is not resolved", () => {
    expect(pairResolved(start, start, 0)).toBe(false);
  });

  it("a traded pair is resolved — trading it again is waste", () => {
    const afterTrade = [2, 8, 1, 4, 7, 3];
    expect(pairResolved(afterTrade, start, 0)).toBe(true);
    expect(pairResolved(afterTrade, start, 5)).toBe(true); // mirror slot too
  });

  it("equal-value pairs are resolved from the start", () => {
    const dupes = [3, 7, 3, 1, 4, 7, 2, 4, 8, 1, 6, 3];
    expect(pairResolved(dupes, dupes, 0)).toBe(true);
  });

  it("the odd fixed centre is always resolved", () => {
    const odd = [9, 1, 5, 3, 6, 4, 7];
    expect(pairResolved(odd, odd, 3)).toBe(true);
  });
});

describe("isReversed", () => {
  it("recognises a fully reversed row", () => {
    expect(isReversed([2, 7, 4, 1, 8, 3], [3, 8, 1, 4, 7, 2])).toBe(true);
    expect(isReversed([3, 8, 1, 4, 7, 2], [3, 8, 1, 4, 7, 2])).toBe(false);
  });

  it("does not mutate its inputs", () => {
    const start = [1, 2, 3];
    const current = [3, 2, 1];
    isReversed(current, start);
    expect(start).toEqual([1, 2, 3]);
    expect(current).toEqual([3, 2, 1]);
  });
});
