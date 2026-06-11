/**
 * millPlan — the Sorting Mill's batches, derived from HASH_ROUNDS verbatim
 * (crop names + letter-count weights) with the fall-pressure fields dropped
 * (serene wonder: no timers at first contact) and one new beat the round
 * data lacked: the FINAL batch delivers a fifth bin, so every crop's home
 * is recomputed — resizing a hash table rehashes its keys, felt as "a new
 * bin arrived and the whole mill re-learned its addresses."
 *
 * Par = one toss per crop. Pure data + functions, no Phaser.
 */

import {
  HASH_ROUNDS,
  hashBucket,
} from "../../data/puzzles/arrayPlainsPuzzleLogic";

export interface MillArrival {
  readonly crop: string;
  /** The crop's pace-count — shown as a numeral, never as a formula. */
  readonly weight: number;
  /** Home bin for THIS batch's bin count. */
  readonly bin: number;
}

export interface MillBatch {
  readonly binCount: number;
  readonly arrivals: ReadonlyArray<MillArrival>;
}

const FINAL_BATCH_BINS = 5;

export const MILL_BATCHES: ReadonlyArray<MillBatch> = HASH_ROUNDS.slice(
  0,
  3,
).map((round, i) => {
  const binCount = i === 2 ? FINAL_BATCH_BINS : round.bucketCount;
  return {
    binCount,
    arrivals: round.stream.map((crop) => ({
      crop: crop.crop,
      weight: crop.letterIndex,
      bin: hashBucket(crop.letterIndex, binCount),
    })),
  };
});

/** Minimum tosses for the whole mill: exactly one per crop. */
export function millPar(): number {
  return MILL_BATCHES.reduce((sum, batch) => sum + batch.arrivals.length, 0);
}
