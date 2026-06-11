import { describe, expect, it } from "vitest";
import {
  HASH_ROUNDS,
  hashBucket,
} from "../../data/puzzles/arrayPlainsPuzzleLogic";
import { MILL_BATCHES, millPar } from "./millPlan";

describe("MILL_BATCHES", () => {
  it("derives three batches with the fifth bin arriving last", () => {
    expect(MILL_BATCHES).toHaveLength(3);
    expect(MILL_BATCHES.map((b) => b.binCount)).toEqual([4, 4, 5]);
  });

  it("keeps each round's crop stream verbatim (names and weights)", () => {
    MILL_BATCHES.forEach((batch, i) => {
      expect(batch.arrivals.map((a) => a.crop)).toEqual(
        HASH_ROUNDS[i].stream.map((c) => c.crop),
      );
      expect(batch.arrivals.map((a) => a.weight)).toEqual(
        HASH_ROUNDS[i].stream.map((c) => c.letterIndex),
      );
    });
  });

  it("recomputes batch-3 homes for five bins (the felt rehash)", () => {
    const finalBatch = MILL_BATCHES[2];
    for (const arrival of finalBatch.arrivals) {
      expect(arrival.bin).toBe(hashBucket(arrival.weight, 5));
    }
    // At least one crop must land somewhere new vs its 4-bin home,
    // otherwise the rehash beat teaches nothing.
    const moved = finalBatch.arrivals.filter(
      (a) => a.bin !== hashBucket(a.weight, 4),
    );
    expect(moved.length).toBeGreaterThan(0);
  });

  it("exposes no fall-pressure fields", () => {
    for (const batch of MILL_BATCHES) {
      expect(batch).not.toHaveProperty("fallMs");
      expect(batch).not.toHaveProperty("spawnGapMs");
    }
  });

  it("never mutates HASH_ROUNDS", () => {
    expect(HASH_ROUNDS[2].stream[0].bucket).toBe(
      hashBucket(HASH_ROUNDS[2].stream[0].letterIndex, 4),
    );
  });
});

describe("millPar", () => {
  it("is one toss per crop across all batches", () => {
    const total = HASH_ROUNDS.slice(0, 3).reduce(
      (sum, round) => sum + round.stream.length,
      0,
    );
    expect(millPar()).toBe(total);
  });
});
