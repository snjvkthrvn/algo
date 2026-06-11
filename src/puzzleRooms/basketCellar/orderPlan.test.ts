import { describe, expect, it } from "vitest";
import { INDEXING_ROUNDS } from "../../data/puzzles/arrayPlainsPuzzleLogic";
import { CELLAR_BATCHES, cellarPar, ordinalWords } from "./orderPlan";

describe("CELLAR_BATCHES", () => {
  it("derives three batches from the first three indexing rounds", () => {
    expect(CELLAR_BATCHES).toHaveLength(3);
    expect(CELLAR_BATCHES.map((b) => b.basketCount)).toEqual([5, 8, 10]);
    expect(CELLAR_BATCHES.map((b) => b.orders.length)).toEqual([1, 3, 5]);
  });

  it("keeps the round data's items and indices verbatim", () => {
    expect(CELLAR_BATCHES[0].orders[0]).toEqual({ item: "rope", index: 3 });
    expect(CELLAR_BATCHES[1].orders[2]).toEqual({ item: "wrench", index: 7 });
  });

  it("guts the lanterns only on the final batch", () => {
    expect(CELLAR_BATCHES.map((b) => b.lanternsOut)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("does not expose or depend on the soft request timer", () => {
    for (const batch of CELLAR_BATCHES) {
      expect(batch).not.toHaveProperty("secondsPerRequest");
    }
  });

  it("never mutates INDEXING_ROUNDS", () => {
    expect(INDEXING_ROUNDS[0].requests[0]).toEqual({ item: "rope", index: 3 });
  });
});

describe("cellarPar", () => {
  it("is one opening per order: 9 total", () => {
    expect(cellarPar()).toBe(9);
  });
});

describe("ordinalWords", () => {
  it("renders plain-words order tags", () => {
    expect(ordinalWords(0)).toBe("THE 1ST BASKET");
    expect(ordinalWords(1)).toBe("THE 2ND BASKET");
    expect(ordinalWords(2)).toBe("THE 3RD BASKET");
    expect(ordinalWords(3)).toBe("THE 4TH BASKET");
    expect(ordinalWords(10)).toBe("THE 11TH BASKET");
    expect(ordinalWords(20)).toBe("THE 21ST BASKET");
  });
});
