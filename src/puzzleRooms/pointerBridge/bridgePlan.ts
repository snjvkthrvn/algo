/**
 * bridgePlan — the Rope Bridge's rounds and honest par.
 *
 * Par comes from the canonical convergent walk: start at both ends; when
 * the buoyed pair weighs too little only the left buoy can help, too much
 * only the right — step it, repeat, lock on the match. The player is free
 * to step either buoy (and to dead-end), but the tally measures them
 * against the walk the river itself would take.
 *
 * Pure data + functions, no Phaser.
 */

import { POINTER_BRIDGE_ROUNDS } from "../../data/puzzles/twinRiversPuzzleLogic";

export interface BridgeRound {
  readonly values: ReadonlyArray<number>;
  readonly target: number;
}

export const BRIDGE_ROUNDS: ReadonlyArray<BridgeRound> =
  POINTER_BRIDGE_ROUNDS.map((round) => ({
    values: round.values,
    target: round.target,
  }));

export type BridgeStep = "left" | "right";

export interface BridgeWalk {
  readonly steps: ReadonlyArray<BridgeStep>;
  readonly finalLeft: number;
  readonly finalRight: number;
}

/** The canonical convergent walk over a sorted row with a known answer. */
export function optimalWalk(
  values: ReadonlyArray<number>,
  target: number,
): BridgeWalk {
  const steps: BridgeStep[] = [];
  let left = 0;
  let right = values.length - 1;
  while (left < right) {
    const sum = values[left] + values[right];
    if (sum === target) break;
    if (sum < target) {
      steps.push("left");
      left++;
    } else {
      steps.push("right");
      right--;
    }
  }
  return { steps, finalLeft: left, finalRight: right };
}

/** Minimum moves for the whole bridge: each round's walk plus its lock. */
export function bridgePar(): number {
  return BRIDGE_ROUNDS.reduce(
    (sum, round) =>
      sum + optimalWalk(round.values, round.target).steps.length + 1,
    0,
  );
}
