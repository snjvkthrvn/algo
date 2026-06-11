/**
 * orderPlan — the Basket Cellar's batches, derived from the first three
 * INDEXING_ROUNDS verbatim (items + indices), with the soft request timer
 * dropped entirely (serene wonder: no pressure outside bosses) and the
 * round-3 label fade recast as the lanterns guttering out.
 *
 * Par = one opening per order: the O(1) ideal the room teaches by feel.
 * Pure data + functions, no Phaser.
 */

import { INDEXING_ROUNDS } from "../../data/puzzles/arrayPlainsPuzzleLogic";

export interface CellarOrder {
  readonly item: string;
  readonly index: number;
}

export interface CellarBatch {
  readonly basketCount: number;
  readonly orders: ReadonlyArray<CellarOrder>;
  /** Final batch only: labels go dark and position is everything. */
  readonly lanternsOut: boolean;
}

export const CELLAR_BATCHES: ReadonlyArray<CellarBatch> =
  INDEXING_ROUNDS.slice(0, 3).map((round) => ({
    basketCount: round.basketCount,
    orders: round.requests.map((request) => ({
      item: request.item,
      index: request.index,
    })),
    lanternsOut: round.obscureLabels,
  }));

/** Minimum openings for the whole cellar: exactly one per order. */
export function cellarPar(): number {
  return CELLAR_BATCHES.reduce((sum, batch) => sum + batch.orders.length, 0);
}

/** Plain-words order tag: index 3 → "THE 4TH BASKET". Never "index 3". */
export function ordinalWords(index: number): string {
  const n = index + 1;
  const tens = n % 100;
  const suffix =
    tens >= 11 && tens <= 13
      ? "TH"
      : n % 10 === 1
        ? "ST"
        : n % 10 === 2
          ? "ND"
          : n % 10 === 3
            ? "RD"
            : "TH";
  return `THE ${n}${suffix} BASKET`;
}
