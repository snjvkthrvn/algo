/**
 * coilPlan — the Serpent's Coil reprise data and honest par.
 *
 * The Twin Rivers finale replays the region's three verbs with the rooms'
 * own kits: turn the river (mirror trades), lash the bridge (convergent
 * walk + lock), net the coil (fixed-window haul). The serpent's sabotage
 * stays honest: every coil un-trade, buoy push, and basket swap raises
 * par by exactly one, so the tally never blames the player for the
 * serpent's mischief.
 *
 * Pure data + functions, no Phaser.
 */

import { MIRROR_SERPENT_PHASES } from "../../data/puzzles/twinRiversPuzzleLogic";
import { roundPar as crossingRoundPar } from "../mirrorCrossing/crossingPlan";
import { optimalWalk } from "../pointerBridge/bridgePlan";
import { roundPar as dockRoundPar } from "../fishingDock/dockPlan";

export const COIL_PHASES = {
  reverse: { values: MIRROR_SERPENT_PHASES.reverse.values },
  twoSum: {
    values: MIRROR_SERPENT_PHASES.twoSum.values,
    target: MIRROR_SERPENT_PHASES.twoSum.target,
  },
  window: {
    values: MIRROR_SERPENT_PHASES.fixedWindow.values,
    windowSize: MIRROR_SERPENT_PHASES.fixedWindow.windowSize,
  },
} as const;

/**
 * Honest minimum moves across the three phases, given how much sabotage
 * the serpent landed (untrades / buoy pushes / basket swaps).
 */
export function serpentPar(
  untrades: number,
  pushes: number,
  swaps: number,
): number {
  const phaseOne = crossingRoundPar(COIL_PHASES.reverse.values);
  const phaseTwo =
    optimalWalk(COIL_PHASES.twoSum.values, COIL_PHASES.twoSum.target).steps
      .length + 1;
  const phaseThree = dockRoundPar(
    COIL_PHASES.window.values.length,
    COIL_PHASES.window.windowSize,
  );
  return phaseOne + phaseTwo + phaseThree + untrades + pushes + swaps;
}
