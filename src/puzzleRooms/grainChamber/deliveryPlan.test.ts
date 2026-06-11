import { describe, expect, it } from "vitest";
import { inversionCount } from "../../data/puzzles/arrayPlainsPuzzleLogic";
import {
  DELIVERIES,
  applyDelivery,
  fieldPar,
  initialRow,
} from "./deliveryPlan";

describe("deliveryPlan", () => {
  it("starts with the classic 4-crate scramble", () => {
    expect(initialRow()).toEqual([3, 1, 4, 2]);
  });

  it("has two follow-up deliveries growing the row 4→6→8", () => {
    expect(DELIVERIES).toHaveLength(2);
    const afterFirst = applyDelivery([1, 2, 3, 4], DELIVERIES[0]);
    expect(afterFirst).toHaveLength(6);
    const afterSecond = applyDelivery(
      [...afterFirst].sort((a, b) => a - b),
      DELIVERIES[1],
    );
    expect(afterSecond).toHaveLength(8);
  });

  it("applyDelivery inserts at the declared positions without mutating input", () => {
    const sorted = [1, 2, 3, 4];
    const next = applyDelivery(sorted, { crates: [6, 5], positions: [1, 3] });
    expect(sorted).toEqual([1, 2, 3, 4]);
    expect(next).toEqual([1, 6, 2, 5, 3, 4]);
  });

  it("every delivery leaves real work: at least 3 inversions", () => {
    let row = initialRow();
    expect(inversionCount(row)).toBeGreaterThanOrEqual(3);
    for (const delivery of DELIVERIES) {
      row = applyDelivery([...row].sort((a, b) => a - b), delivery);
      expect(inversionCount(row)).toBeGreaterThanOrEqual(3);
    }
  });

  it("fieldPar is the sum of inversion counts of each working row", () => {
    let expected = inversionCount(initialRow());
    let row = initialRow();
    for (const delivery of DELIVERIES) {
      row = applyDelivery([...row].sort((a, b) => a - b), delivery);
      expected += inversionCount(row);
    }
    expect(fieldPar()).toBe(expected);
  });
});
