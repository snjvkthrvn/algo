/**
 * crossingPlan — the Mirror Crossing's rounds and honest par.
 *
 * The river must run reversed. The player and their mirror twin trade
 * FACING pairs (i ↔ n−1−i) in any order; a pair whose values already
 * mirror each other (duplicates — round 4 is full of them) needs nothing,
 * and the odd row's centre faces itself. Par counts only the pairs that
 * genuinely differ, so skip-judgment is the skill the tally rewards.
 *
 * Pure data + functions, no Phaser.
 */

import { MIRROR_WALK_ROUNDS } from "../../data/puzzles/twinRiversPuzzleLogic";

export interface CrossingRound {
  readonly values: ReadonlyArray<number>;
}

export const CROSSING_ROUNDS: ReadonlyArray<CrossingRound> =
  MIRROR_WALK_ROUNDS.map((round) => ({ values: round.values }));

/** Whether the mirror pair anchored at slot i actually needs trading. */
export function needsTrade(
  values: ReadonlyArray<number>,
  slot: number,
): boolean {
  const mirror = values.length - 1 - slot;
  if (slot >= mirror) return slot === mirror ? false : needsTrade(values, mirror);
  return values[slot] !== values[mirror];
}

/** Minimum trades to reverse this row: its differing mirror pairs. */
export function roundPar(values: ReadonlyArray<number>): number {
  let par = 0;
  for (let i = 0; i < Math.floor(values.length / 2); i++) {
    if (values[i] !== values[values.length - 1 - i]) par++;
  }
  return par;
}

/** Total minimum trades across all rounds. */
export function crossingPar(): number {
  return CROSSING_ROUNDS.reduce(
    (sum, round) => sum + roundPar(round.values),
    0,
  );
}

/**
 * Whether the mirror pair anchored at `slot` already holds its reversed
 * arrangement relative to the START row. Trading a resolved pair is waste
 * (equal-value pairs and the odd centre are resolved from the start; a
 * freshly traded pair becomes resolved — trading it back undoes work).
 */
export function pairResolved(
  current: ReadonlyArray<number>,
  start: ReadonlyArray<number>,
  slot: number,
): boolean {
  const n = current.length;
  const mirror = n - 1 - slot;
  return (
    current[slot] === start[mirror] && current[mirror] === start[slot]
  );
}

/** True when `current` is exactly `start` reversed (and not trivially so). */
export function isReversed(
  current: ReadonlyArray<number>,
  start: ReadonlyArray<number>,
): boolean {
  if (current.length !== start.length) return false;
  let differs = false;
  for (let i = 0; i < current.length; i++) {
    if (current[i] !== start[start.length - 1 - i]) return false;
    if (current[i] !== start[i]) differs = true;
  }
  return differs;
}
