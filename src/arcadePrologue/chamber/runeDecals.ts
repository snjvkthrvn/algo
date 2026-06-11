/**
 * runeDecals — the floor's memory of every mistake (the cost economy's
 * persistent evidence). Cracks for wrong rune steps, scorches for pulses
 * that died. Decals never clean up mid-room. Texture-guarded: uses the
 * chamber decal art when loaded, procedural Graphics otherwise.
 */

import Phaser from "phaser";
import { PROLOGUE_CHAMBER_KEYS } from "../../config/assets";

export type DecalLayer = {
  crackAt(x: number, y: number): void;
  scorchAt(x: number, y: number): void;
  count(): number;
  destroy(): void;
};

const CRACK_COLOR = 0x7fd9e8;
const SCORCH_COLOR = 0x2c1b3a;

export function createDecalLayer(
  scene: Phaser.Scene,
  depth = 8,
  reduceMotion = false,
): DecalLayer {
  const items: Phaser.GameObjects.GameObject[] = [];
  let placed = 0;

  const settle = (
    obj: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics,
  ): void => {
    items.push(obj);
    placed += 1;
    if (reduceMotion) return;
    obj.setAlpha(0);
    scene.tweens.add({
      targets: obj,
      alpha: 0.9,
      duration: 320,
      ease: "Sine.easeOut",
    });
  };

  const proceduralCrack = (x: number, y: number): void => {
    const g = scene.add.graphics().setDepth(depth);
    g.lineStyle(2, CRACK_COLOR, 0.55);
    for (let i = 0; i < 4; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const len = Phaser.Math.Between(8, 18);
      g.lineBetween(
        x,
        y,
        x + Math.cos(angle) * len,
        y + Math.sin(angle) * len * 0.5,
      );
    }
    settle(g);
  };

  const proceduralScorch = (x: number, y: number): void => {
    const g = scene.add.graphics().setDepth(depth);
    g.fillStyle(SCORCH_COLOR, 0.6);
    g.fillEllipse(x, y, 30, 16);
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(x + 3, y + 2, 18, 9);
    settle(g);
  };

  return {
    crackAt(x, y) {
      if (scene.textures.exists(PROLOGUE_CHAMBER_KEYS.CRACK_DECALS)) {
        const frame = placed % 3;
        settle(
          scene.add
            .image(x, y, PROLOGUE_CHAMBER_KEYS.CRACK_DECALS, frame)
            .setDepth(depth)
            .setAngle(Phaser.Math.Between(0, 359)),
        );
        return;
      }
      proceduralCrack(x, y);
    },
    scorchAt(x, y) {
      if (scene.textures.exists(PROLOGUE_CHAMBER_KEYS.SCORCH_DECAL)) {
        settle(
          scene.add
            .image(x, y, PROLOGUE_CHAMBER_KEYS.SCORCH_DECAL)
            .setDepth(depth)
            .setAngle(Phaser.Math.Between(-12, 12)),
        );
        return;
      }
      proceduralScorch(x, y);
    },
    count: () => placed,
    destroy() {
      items.forEach((i) => i.destroy());
      items.length = 0;
    },
  };
}
