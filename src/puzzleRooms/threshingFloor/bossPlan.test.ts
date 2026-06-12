import { describe, expect, it } from "vitest";
import {
  hashBucket,
  inversionCount,
} from "../../data/puzzles/arrayPlainsPuzzleLogic";
import {
  BUBBLE_START,
  HASH_ARRIVALS,
  PAIR_TARGETS,
  bossPar,
  inOrderAdjacentIndex,
} from "./bossPlan";

describe("bossPlan data", () => {
  it("opens phase I with the classic shuffler row", () => {
    expect(BUBBLE_START).toEqual([5, 2, 4, 1, 3]);
  });

  it("phase II arrivals carry four crops homed over four bins", () => {
    expect(HASH_ARRIVALS).toHaveLength(4);
    for (const arrival of HASH_ARRIVALS) {
      expect(arrival.bin).toBe(hashBucket(arrival.weight, 4));
    }
  });

  it("phase III reprises the three pair rounds verbatim", () => {
    expect(PAIR_TARGETS.map((r) => r.target)).toEqual([9, 10, 17]);
    expect(PAIR_TARGETS[0].values).toEqual([3, 6, 2, 7, 4]);
  });
});

describe("bossPar", () => {
  it("sums the honest minimum across phases", () => {
    const base = inversionCount(BUBBLE_START) + 4 + 3;
    expect(bossPar(0)).toBe(base);
  });

  it("each scramble the boss lands raises par by exactly one", () => {
    expect(bossPar(3)).toBe(bossPar(0) + 3);
  });
});

describe("inOrderAdjacentIndex", () => {
  it("returns a gap whose swap adds exactly one inversion", () => {
    const values = [1, 3, 2, 4];
    const gap = inOrderAdjacentIndex(values, () => 0);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(values[gap]).toBeLessThan(values[gap + 1]);
  });

  it("returns -1 when no in-order pair exists", () => {
    expect(inOrderAdjacentIndex([4, 3, 2, 1], () => 0)).toBe(-1);
  });

  it("uses the rng to pick among candidates deterministically", () => {
    // [1,2,3]: candidate gaps are 0 and 1.
    expect(inOrderAdjacentIndex([1, 2, 3], () => 0)).toBe(0);
    expect(inOrderAdjacentIndex([1, 2, 3], () => 0.99)).toBe(1);
  });
});
