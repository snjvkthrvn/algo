/**
 * groundsPlan — the Pairing Grounds' rounds, mirroring TWO_SUM_ROUND_CONFIGS
 * verbatim (values, targets, valid pairs) with the soft timer dropped
 * (serene wonder: no pressure outside bosses).
 *
 * Par = one offer per round: anchor a stone, know its complement, seek
 * exactly that. Pure data + functions, no Phaser.
 */

import { TWO_SUM_ROUND_CONFIGS } from "../../data/puzzles/arrayPlainsPuzzleLogic";

export interface GroundsRound {
  readonly values: ReadonlyArray<number>;
  readonly target: number;
  readonly validPairs: ReadonlyArray<readonly [number, number]>;
}

export const GROUNDS_ROUNDS: ReadonlyArray<GroundsRound> =
  TWO_SUM_ROUND_CONFIGS.map((config) => ({
    values: config.values,
    target: config.target,
    validPairs: config.validPairs,
  }));

/** Minimum offers for the whole grounds: exactly one per round. */
export function groundsPar(): number {
  return GROUNDS_ROUNDS.length;
}

/**
 * Whether an anchored value can EVER be completed from these stones.
 * A value only partners with itself when it appears at least twice.
 */
export function hasPartner(
  anchor: number,
  values: ReadonlyArray<number>,
  target: number,
): boolean {
  const need = target - anchor;
  if (need !== anchor) return values.includes(need);
  return values.filter((value) => value === anchor).length >= 2;
}
