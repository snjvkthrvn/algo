/**
 * runPlan — the Current Run's streams and honest par.
 *
 * Par comes from the canonical variable-window ride: the right edge moves
 * downstream once per float; every duplicate forces left-tie releases
 * until the snag clears; one claim ends the round. A rider who recognizes
 * the longest clean run early and claims beats par.
 *
 * Pure data + functions, no Phaser.
 */

import { CURRENT_RIDER_ROUNDS } from "../../data/puzzles/twinRiversPuzzleLogic";

export interface RunRound {
  readonly letters: ReadonlyArray<string>;
}

export const RUN_ROUNDS: ReadonlyArray<RunRound> =
  CURRENT_RIDER_ROUNDS.map((round) => ({ letters: round.letters }));

export interface RiderWalk {
  readonly rights: number;
  readonly lefts: number;
  readonly bestStart: number;
  readonly bestLength: number;
}

/** The canonical expand-right / shrink-left-on-duplicate ride. */
export function riderWalk(letters: ReadonlyArray<string>): RiderWalk {
  let left = 0;
  let lefts = 0;
  let bestStart = 0;
  let bestLength = letters.length > 0 ? 1 : 0;
  const inWindow = new Set<string>();
  if (letters.length > 0) inWindow.add(letters[0]);

  for (let right = 1; right < letters.length; right++) {
    while (inWindow.has(letters[right])) {
      inWindow.delete(letters[left]);
      left++;
      lefts++;
    }
    inWindow.add(letters[right]);
    const length = right - left + 1;
    if (length > bestLength) {
      bestLength = length;
      bestStart = left;
    }
  }
  return {
    rights: Math.max(0, letters.length - 1),
    lefts,
    bestStart,
    bestLength,
  };
}

/**
 * The duplicate pair snagging the window [left..right], or null when the
 * net is clean. Returns the earliest offending pair's indices.
 */
export function firstSnag(
  letters: ReadonlyArray<string>,
  left: number,
  right: number,
): [number, number] | null {
  const seen = new Map<string, number>();
  for (let i = left; i <= right; i++) {
    const at = seen.get(letters[i]);
    if (at !== undefined) return [at, i];
    seen.set(letters[i], i);
  }
  return null;
}

/** One full ride plus the claim. */
export function roundPar(letters: ReadonlyArray<string>): number {
  const walk = riderWalk(letters);
  return walk.rights + walk.lefts + 1;
}

/** Total minimum moves across all rounds. */
export function runPar(): number {
  return RUN_ROUNDS.reduce((sum, round) => sum + roundPar(round.letters), 0);
}
