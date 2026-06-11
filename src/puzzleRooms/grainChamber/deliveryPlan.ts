/**
 * deliveryPlan — the Grain Chamber's difficulty curve as farm logistics.
 *
 * Replaces P1_1's three quiz rounds with three deliveries in one continuous
 * room: sort the row → the cart tips new crates INTO the sorted row → keep
 * sorting. Insert positions are fixed so runs are deterministic and the
 * field par is a stable, testable number.
 *
 * Pure data + functions, no Phaser. All updates immutable.
 */

import { inversionCount } from "../../data/puzzles/arrayPlainsPuzzleLogic";

export interface Delivery {
  /** Crate values the cart tips in, in tip order. */
  readonly crates: ReadonlyArray<number>;
  /**
   * Index in the NEW row where each crate lands (applied left to right,
   * each insertion shifts later indices like Array.prototype.splice).
   */
  readonly positions: ReadonlyArray<number>;
}

/** Delivery 1 — the classic first-contact scramble (old round 1). */
export function initialRow(): number[] {
  return [3, 1, 4, 2];
}

/**
 * Deliveries 2 and 3. Values chosen so each new working row lands in the
 * old round-2/round-3 difficulty register (≥3 inversions) while reusing
 * the crates already on the floor.
 */
export const DELIVERIES: ReadonlyArray<Delivery> = [
  { crates: [6, 5], positions: [0, 3] },
  { crates: [8, 7], positions: [2, 6] },
];

export function applyDelivery(
  sortedRow: ReadonlyArray<number>,
  delivery: Delivery,
): number[] {
  let next = [...sortedRow];
  delivery.crates.forEach((value, i) => {
    const at = delivery.positions[i];
    next = [...next.slice(0, at), value, ...next.slice(at)];
  });
  return next;
}

/** Minimum adjacent swaps for the whole field = Σ inversions per working row. */
export function fieldPar(): number {
  let par = inversionCount(initialRow());
  let row = initialRow();
  for (const delivery of DELIVERIES) {
    row = applyDelivery([...row].sort((a, b) => a - b), delivery);
    par += inversionCount(row);
  }
  return par;
}
