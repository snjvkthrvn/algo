/**
 * optimalReplay — pure logic for the post-clear ghost demonstration.
 *
 * The minimum-trade solve for adjacent swaps is exactly the inversion
 * count, achieved by always fixing the leftmost out-of-order pair. The
 * GhostReplay visual walks a spectral Bit through this sequence so the
 * player SEES the optimal technique instead of reading about it.
 */

import {
  firstInversionIndex,
  swapAdjacent,
} from "../../data/puzzles/arrayPlainsPuzzleLogic";

/** Gap indices, in order, of the minimum-trade solve for `values`. */
export function optimalTradeSequence(
  values: ReadonlyArray<number>,
): number[] {
  const sequence: number[] = [];
  let row = [...values];
  let focus = firstInversionIndex(row);
  while (focus >= 0) {
    sequence.push(focus);
    row = swapAdjacent(row, focus);
    focus = firstInversionIndex(row);
  }
  return sequence;
}
