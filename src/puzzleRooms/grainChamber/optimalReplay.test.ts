import { describe, expect, it } from "vitest";
import {
  inversionCount,
  isSortedAscending,
  swapAdjacent,
} from "../../data/puzzles/arrayPlainsPuzzleLogic";
import { optimalTradeSequence } from "./optimalReplay";

describe("optimalTradeSequence", () => {
  it("returns the gap indices that sort the row", () => {
    const start = [3, 1, 4, 2];
    let row = [...start];
    for (const gap of optimalTradeSequence(start)) {
      row = swapAdjacent(row, gap);
    }
    expect(isSortedAscending(row)).toBe(true);
  });

  it("uses exactly the minimum number of trades (inversion count)", () => {
    for (const start of [
      [3, 1, 4, 2],
      [8, 7, 6, 5, 4, 3, 2, 1],
      [1, 2, 3, 4],
      [5, 2, 4, 1, 6, 3],
    ]) {
      expect(optimalTradeSequence(start)).toHaveLength(inversionCount(start));
    }
  });

  it("does not mutate its input", () => {
    const start = [3, 1, 4, 2];
    optimalTradeSequence(start);
    expect(start).toEqual([3, 1, 4, 2]);
  });
});
