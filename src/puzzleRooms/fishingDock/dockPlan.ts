/**
 * dockPlan — the Fishing Dock's rounds and honest par.
 *
 * The net frame follows the player along the dock; only the edges change
 * between slides — that's the whole lesson, shown every step. Par per
 * round is one full sweep plus the haul: a player who reads the carved
 * weights and walks straight to the heaviest window beats par, and the
 * 3★ headroom rewards exactly that.
 *
 * Pure data + functions, no Phaser.
 */

import { FIXED_WINDOW_ROUNDS } from "../../data/puzzles/twinRiversPuzzleLogic";

export interface DockRound {
  readonly values: ReadonlyArray<number>;
  readonly windowSize: number;
}

export const DOCK_ROUNDS: ReadonlyArray<DockRound> =
  FIXED_WINDOW_ROUNDS.map((round) => ({
    values: round.values,
    windowSize: round.windowSize,
  }));

/** Sum of the k slats framed from `start`. */
export function windowSum(
  values: ReadonlyArray<number>,
  start: number,
  k: number,
): number {
  let sum = 0;
  for (let i = start; i < start + k; i++) sum += values[i] ?? 0;
  return sum;
}

/** The leftmost start of a maximum-weight window. */
export function bestWindowStart(
  values: ReadonlyArray<number>,
  k: number,
): number {
  let best = 0;
  let bestSum = windowSum(values, 0, k);
  for (let start = 1; start <= values.length - k; start++) {
    const sum = windowSum(values, start, k);
    if (sum > bestSum) {
      best = start;
      bestSum = sum;
    }
  }
  return best;
}

/** One full sweep of the dock plus the haul. */
export function roundPar(n: number, k: number): number {
  return n - k + 1;
}

/** Total minimum moves across all rounds. */
export function dockPar(): number {
  return DOCK_ROUNDS.reduce(
    (sum, round) => sum + roundPar(round.values.length, round.windowSize),
    0,
  );
}
