/**
 * prologuePar — pure par derivations for the Prologue chambers.
 *
 * Par is the room's physical minimum, derived from the same round data the
 * rooms play: every hop of every chant (P0_1), one pulse per console network
 * (P0_2), a single perfect litany (P0_F). Stars map through
 * grainEconomy.starsForTrades; nothing here touches Phaser.
 */

import type { PathRound } from "../puzzles/P0_1/pathRounds";
import type { FlowRound } from "../puzzles/P0_2/rounds";

/** Minimum hops to echo every chant: Σ (path.length − 1). */
export function pathPar(rounds: ReadonlyArray<PathRound>): number {
  return rounds.reduce((sum, round) => sum + (round.path.length - 1), 0);
}

/** Minimum pulses to clear every console network: one per round. */
export function flowPar(rounds: ReadonlyArray<FlowRound>): number {
  return rounds.length;
}

/** Minimum pulses to answer the Litany: one perfect pass. */
export function litanyPar(): number {
  return 1;
}
