/**
 * GlitchPairer — Glitch grinding the same round at his corner mini-dais:
 * pair after pair after pair, in order, at his tiny scale. His check count
 * explodes as the field grows while the anchored player offers once. This
 * is the contrast his scripted NAME_IT moment finally names — keep him
 * visibly working, never interfering.
 *
 * Texture-guarded: maroon Glitch + pebble rects until art lands.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { VISUAL_REVAMP_KEYS } from "../../config/assets";
import { GLITCH_FAILURE_TAUNTS } from "../../data/dialogue/glitch_dialogue";

const PEBBLE_W = 16;
const PEBBLE_GAP = 6;
const CHECK_MS = 800;

function pick(lines: ReadonlyArray<string>): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

export class GlitchPairer {
  private scene: Phaser.Scene;
  private originX: number;
  private originY: number;
  private pebbles: Phaser.GameObjects.Rectangle[] = [];
  private glitch: Phaser.GameObjects.GameObject &
    Phaser.GameObjects.Components.Transform;
  private grinding = false;
  private stopped = false;

  constructor(scene: Phaser.Scene, originX: number, originY: number) {
    this.scene = scene;
    this.originX = originX;
    this.originY = originY;
    this.glitch = scene.textures.exists(VISUAL_REVAMP_KEYS.GLITCH)
      ? scene.add
          .image(originX - 24, originY - 30, VISUAL_REVAMP_KEYS.GLITCH)
          .setDisplaySize(30, 38)
          .setDepth(22)
      : scene.add
          .rectangle(originX - 24, originY - 30, 18, 26, 0x8a3a3a, 1)
          .setStrokeStyle(2, 0x5a2424, 1)
          .setDepth(22);
    scene.tweens.add({
      targets: this.glitch,
      y: originY - 34,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** Lay out his pebble copies of the round's stones. */
  setRound(values: ReadonlyArray<number>): void {
    this.pebbles.forEach((pebble) => pebble.destroy());
    this.pebbles = values.map((_, i) =>
      this.scene.add
        .rectangle(
          this.originX + (i % 6) * (PEBBLE_W + PEBBLE_GAP),
          this.originY + Math.floor(i / 6) * (PEBBLE_W + 4),
          PEBBLE_W,
          PEBBLE_W - 4,
          0x8d8d96,
          0.9,
        )
        .setStrokeStyle(1, 0x5a5a64, 1)
        .setDepth(20),
    );
    this.grindRound(values);
  }

  /** Try pair (i,j) in sequence until the first valid pair; loop forever. */
  private grindRound(values: ReadonlyArray<number>): void {
    if (this.grinding) return;
    this.grinding = true;
    let checks = 0;
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < values.length; i++)
      for (let j = i + 1; j < values.length; j++) pairs.push([i, j]);

    const tryPair = (step: number): void => {
      if (this.stopped || step >= pairs.length) {
        this.grinding = false;
        return;
      }
      const [i, j] = pairs[step];
      checks++;
      if (checks === 7) this.bark();
      const a = this.pebbles[i];
      const b = this.pebbles[j];
      if (!a || !b) {
        this.grinding = false;
        return;
      }
      a.setFillStyle(0xd8a05a, 0.95);
      b.setFillStyle(0xd8a05a, 0.95);
      this.scene.time.delayedCall(CHECK_MS * 0.5, () => {
        a.setFillStyle(0x8d8d96, 0.9);
        b.setFillStyle(0x8d8d96, 0.9);
        this.scene.time.delayedCall(CHECK_MS * 0.5, () => tryPair(step + 1));
      });
    };
    tryPair(0);
  }

  stop(): void {
    this.stopped = true;
  }

  private bark(): void {
    const bark = this.scene.add
      .text(this.originX + 30, this.originY - 56, pick(GLITCH_FAILURE_TAUNTS), {
        fontSize: "9px",
        fontFamily: FONTS.RETRO,
        color: "#d8a0a0",
        backgroundColor: "#2e1a1a",
        padding: { x: 6, y: 4 },
        wordWrap: { width: 170 },
      })
      .setOrigin(0.5, 1)
      .setDepth(50);
    const cam = this.scene.cameras.main;
    bark.x = Phaser.Math.Clamp(
      bark.x,
      bark.width / 2 + 8,
      cam.width - bark.width / 2 - 8,
    );
    this.scene.tweens.add({
      targets: bark,
      alpha: 0,
      delay: 2400,
      duration: 400,
      onComplete: () => bark.destroy(),
    });
  }
}
