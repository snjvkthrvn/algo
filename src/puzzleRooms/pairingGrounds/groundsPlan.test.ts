import { describe, expect, it } from "vitest";
import { TWO_SUM_ROUND_CONFIGS } from "../../data/puzzles/arrayPlainsPuzzleLogic";
import { GROUNDS_ROUNDS, groundsPar, hasPartner } from "./groundsPlan";

describe("GROUNDS_ROUNDS", () => {
  it("mirrors the two-sum configs verbatim (values, target, pairs)", () => {
    // All four configs ride along: 5 → 8 → 9 → 9 stones.
    expect(GROUNDS_ROUNDS).toHaveLength(4);
    GROUNDS_ROUNDS.forEach((round, i) => {
      expect(round.values).toEqual(TWO_SUM_ROUND_CONFIGS[i].values);
      expect(round.target).toBe(TWO_SUM_ROUND_CONFIGS[i].target);
      expect(round.validPairs).toEqual(TWO_SUM_ROUND_CONFIGS[i].validPairs);
    });
  });

  it("drops the soft timer entirely", () => {
    for (const round of GROUNDS_ROUNDS) {
      expect(round).not.toHaveProperty("seconds");
    }
  });
});

describe("groundsPar", () => {
  it("is one offer per round", () => {
    expect(groundsPar()).toBe(4);
  });
});

describe("hasPartner", () => {
  const values = [1, 3, 5, 6, 8];
  it("knows which anchors can ever be completed", () => {
    expect(hasPartner(3, values, 9)).toBe(true); // 3 + 6
    expect(hasPartner(1, values, 9)).toBe(true); // 1 + 8
    expect(hasPartner(5, values, 9)).toBe(false); // needs 4 — absent
  });

  it("a value cannot partner with itself unless it appears twice", () => {
    expect(hasPartner(3, [3, 7], 6)).toBe(false);
    expect(hasPartner(3, [3, 3, 7], 6)).toBe(true);
  });
});
