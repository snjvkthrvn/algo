/**
 * cropVisual — one place that knows what a crop looks like.
 *
 * The art sheet carries the eight staple crops; the round data also streams
 * five extras (FIG, PLUM, BEET, NUT, RYE). Mapped crops render from the
 * sheet, the rest as palette-toned bundles with their initial — so every
 * crop stays visually distinct without stretching the sheet's frames onto
 * the wrong vegetables.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { SORTING_MILL_KEYS } from "../../config/assets";

/** Frame order matches the crops.png sheet contract (plan Task 7). */
const SHEET_FRAMES: Record<string, number> = {
  WHEAT: 0,
  BEAN: 1,
  CORN: 2,
  RICE: 3,
  OAT: 4,
  PEA: 5,
  KALE: 6,
  YAM: 7,
};

const PALETTE: Record<string, { fill: number; stroke: number }> = {
  FIG: { fill: 0xa78bfa, stroke: 0x5b21b6 },
  PLUM: { fill: 0x9333ea, stroke: 0x581c87 },
  BEET: { fill: 0xb91c1c, stroke: 0x7f1d1d },
  NUT: { fill: 0x92400e, stroke: 0x451a03 },
  RYE: { fill: 0xd4d4d8, stroke: 0x52525b },
};

export type CropSprite = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform &
  Phaser.GameObjects.Components.AlphaSingle & { destroy(): void };

export function makeCropSprite(
  scene: Phaser.Scene,
  crop: string,
  x: number,
  y: number,
): CropSprite {
  const frame = SHEET_FRAMES[crop];
  if (
    frame !== undefined &&
    scene.textures.exists(SORTING_MILL_KEYS.CROP_SHEET)
  ) {
    return scene.add.image(x, y, SORTING_MILL_KEYS.CROP_SHEET, frame);
  }
  const tone = PALETTE[crop] ?? { fill: 0x9bbf5a, stroke: 0x5e7a34 };
  const bundle = scene.add.container(x, y);
  bundle.add(
    scene.add.ellipse(0, 0, 18, 14, tone.fill, 1).setStrokeStyle(1, tone.stroke, 1),
  );
  bundle.add(
    scene.add
      .text(0, 0, crop[0] ?? "?", {
        fontSize: "9px",
        fontFamily: FONTS.RETRO,
        color: "#2e2417",
      })
      .setOrigin(0.5),
  );
  return bundle as unknown as CropSprite;
}
