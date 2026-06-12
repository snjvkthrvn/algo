/**
 * bossPlan — the Threshing Floor's reprise data and honest par math.
 *
 * The boss replays the region's three verbs with the chamber modules:
 * phase I sorts the classic shuffler row, phase II routes four crops over
 * four bins, phase III locks the three pair targets. The Shuffler's
 * interference stays honest: each scramble swaps an IN-ORDER adjacent pair
 * (always +1 inversion), so par grows by exactly one per scramble and the
 * tally never blames the player for the boss's mess.
 *
 * Pure data + functions, no Phaser.
 */

import {
  hashBucket,
  inversionCount,
} from "../../data/puzzles/arrayPlainsPuzzleLogic";

export const BUBBLE_START: ReadonlyArray<number> = [5, 2, 4, 1, 3];

export interface BossArrival {
  readonly crop: string;
  readonly weight: number;
  readonly bin: number;
}

const HASH_SOURCE: ReadonlyArray<{ crop: string; weight: number }> = [
  { crop: "WHEAT", weight: 22 },
  { crop: "BEAN", weight: 1 },
  { crop: "CORN", weight: 2 },
  { crop: "RICE", weight: 17 },
];

export const HASH_ARRIVALS: ReadonlyArray<BossArrival> = HASH_SOURCE.map(
  (entry) => ({
    crop: entry.crop,
    weight: entry.weight,
    bin: hashBucket(entry.weight, 4),
  }),
);

export interface PairTarget {
  readonly values: ReadonlyArray<number>;
  readonly target: number;
}

export const PAIR_TARGETS: ReadonlyArray<PairTarget> = [
  { values: [3, 6, 2, 7, 4], target: 9 },
  { values: [5, 1, 8, 4, 2], target: 10 },
  { values: [7, 11, 6, 13, 4], target: 17 },
];

/** Honest minimum actions, given how many scrambles the boss landed. */
export function bossPar(scrambles: number): number {
  return (
    inversionCount(BUBBLE_START) +
    HASH_ARRIVALS.length +
    PAIR_TARGETS.length +
    scrambles
  );
}

/**
 * Pick a gap whose swap adds exactly one inversion (values[g] < values[g+1]),
 * chosen by the supplied rng over all candidates. -1 when the row is
 * strictly descending (nothing left to ruin).
 */
export function inOrderAdjacentIndex(
  values: ReadonlyArray<number>,
  rng: () => number,
): number {
  const candidates: number[] = [];
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] < values[i + 1]) candidates.push(i);
  }
  if (candidates.length === 0) return -1;
  const pick = Math.min(
    candidates.length - 1,
    Math.floor(rng() * candidates.length),
  );
  return candidates[pick];
}
