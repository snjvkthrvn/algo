import { describe, expect, it } from "vitest";
import { MIRROR_SERPENT_PHASES } from "../../data/puzzles/twinRiversPuzzleLogic";
import { roundPar as crossingRoundPar } from "../mirrorCrossing/crossingPlan";
import { optimalWalk } from "../pointerBridge/bridgePlan";
import { roundPar as dockRoundPar } from "../fishingDock/dockPlan";
import { COIL_PHASES, serpentPar } from "./coilPlan";

describe("COIL_PHASES", () => {
  it("keeps the serpent's three phase boards verbatim", () => {
    expect(COIL_PHASES.reverse.values).toEqual(
      MIRROR_SERPENT_PHASES.reverse.values,
    );
    expect(COIL_PHASES.twoSum.values).toEqual(
      MIRROR_SERPENT_PHASES.twoSum.values,
    );
    expect(COIL_PHASES.twoSum.target).toBe(MIRROR_SERPENT_PHASES.twoSum.target);
    expect(COIL_PHASES.window.values).toEqual(
      MIRROR_SERPENT_PHASES.fixedWindow.values,
    );
    expect(COIL_PHASES.window.windowSize).toBe(
      MIRROR_SERPENT_PHASES.fixedWindow.windowSize,
    );
  });
});

describe("serpentPar", () => {
  it("sums the three reprise pars when the serpent lands nothing", () => {
    const expected =
      crossingRoundPar(MIRROR_SERPENT_PHASES.reverse.values) +
      (optimalWalk(
        MIRROR_SERPENT_PHASES.twoSum.values,
        MIRROR_SERPENT_PHASES.twoSum.target,
      ).steps.length +
        1) +
      dockRoundPar(
        MIRROR_SERPENT_PHASES.fixedWindow.values.length,
        MIRROR_SERPENT_PHASES.fixedWindow.windowSize,
      );
    expect(serpentPar(0, 0, 0)).toBe(expected);
  });

  it("each sabotage raises par by exactly its count", () => {
    expect(serpentPar(2, 0, 0)).toBe(serpentPar(0, 0, 0) + 2);
    expect(serpentPar(0, 3, 0)).toBe(serpentPar(0, 0, 0) + 3);
    expect(serpentPar(0, 0, 1)).toBe(serpentPar(0, 0, 0) + 1);
  });
});
