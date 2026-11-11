/**
 * Twin Rivers chamber shell — the river-stone dressing shared by the four
 * TR rooms and the Serpent Coil. Doors stay the generic wooden planks (the
 * docks are timber), but the par plaque swaps to the carved stone tablet
 * and its engraving lightens to read on stone.
 */

import Phaser from "phaser";
import { ChamberShell } from "./ChamberShell";
import { TWIN_RIVERS_CHAMBER_KEYS } from "../../config/assets";

export function createTwinRiversShell(
  scene: Phaser.Scene,
  fieldPar: number,
): ChamberShell {
  return new ChamberShell(scene, fieldPar, {
    plaqueTexture: TWIN_RIVERS_CHAMBER_KEYS.PAR_PLAQUE,
    plaqueTextColor: "#dfeaf4",
  });
}
