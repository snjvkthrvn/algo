/**
 * GhostReplay — the optional post-clear demonstration of the optimal solve.
 *
 * Pulled from the lever by the north door after the field is cleared: a
 * translucent ghost of the final delivery's scrambled row appears above
 * the real lane, and a spectral Bit hops gap to gap performing the
 * minimum-trade sequence (always the leftmost out-of-order pair). Seeing
 * the technique IS the lesson — no text explains it (VISION §3).
 */

import Phaser from "phaser";
import { COLORS, FONTS } from "../../config/constants";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";
import { swapAdjacent } from "../../data/puzzles/arrayPlainsPuzzleLogic";
import { optimalTradeSequence } from "./optimalReplay";

const GHOST_W = 40;
const GHOST_H = 32;
const GHOST_GAP = 12;
const STEP_MS = 420;

export class GhostReplay {
  private scene: Phaser.Scene;
  private playing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /** Play the optimal solve of `startValues` as a spectral row at y. */
  async play(startValues: ReadonlyArray<number>, y: number): Promise<void> {
    if (this.playing) return;
    this.playing = true;
    a11yManager.announce(
      "Bit demonstrates the fewest possible trades, always fixing the leftmost pair that stands out of order.",
      false,
    );

    const { width } = this.scene.cameras.main;
    const n = startValues.length;
    const rowW = n * GHOST_W + (n - 1) * GHOST_GAP;
    const startX = Math.round((width / 2 - rowW / 2) / 8) * 8 + GHOST_W / 2;
    const group: Phaser.GameObjects.Container[] = [];
    let values = [...startValues];

    const crateAt = (i: number): number => startX + i * (GHOST_W + GHOST_GAP);
    for (let i = 0; i < n; i++) {
      const ghost = this.scene.add.container(crateAt(i), y).setDepth(55).setAlpha(0);
      ghost.add(
        this.scene.add
          .rectangle(0, 0, GHOST_W, GHOST_H, COLORS.CYAN_GLOW, 0.22)
          .setStrokeStyle(1, COLORS.CYAN_GLOW, 0.8),
      );
      ghost.add(
        this.scene.add
          .text(0, 0, String(values[i]), {
            fontSize: "12px",
            fontFamily: FONTS.RETRO,
            color: "#9ff7f7",
          })
          .setOrigin(0.5),
      );
      group.push(ghost);
      this.scene.tweens.add({ targets: ghost, alpha: 1, duration: 240, delay: i * 50 });
    }

    const bit = this.scene.add
      .circle(crateAt(0), y - GHOST_H, 5, COLORS.CYAN_GLOW, 1)
      .setDepth(56)
      .setAlpha(0.9);

    const tweenTo = (
      target: Phaser.GameObjects.Components.Transform & object,
      props: Record<string, number>,
      duration: number,
    ): Promise<void> =>
      new Promise((resolve) =>
        this.scene.tweens.add({
          targets: target,
          ...props,
          duration,
          ease: "Sine.easeInOut",
          onComplete: () => resolve(),
        }),
      );

    for (const gap of optimalTradeSequence(startValues)) {
      const midX = (crateAt(gap) + crateAt(gap + 1)) / 2;
      await tweenTo(bit, { x: midX }, STEP_MS * 0.45);
      const left = group[gap];
      const right = group[gap + 1];
      audioManager.playTone(660, 50, "triangle");
      await Promise.all([
        tweenTo(left, { x: crateAt(gap + 1) }, STEP_MS * 0.55),
        tweenTo(right, { x: crateAt(gap) }, STEP_MS * 0.55),
      ]);
      group[gap] = right;
      group[gap + 1] = left;
      values = swapAdjacent(values, gap);
    }

    await tweenTo(bit, { y: y - GHOST_H - 14 }, 260);
    await new Promise((resolve) => this.scene.time.delayedCall(900, resolve));
    for (const ghost of [...group]) {
      this.scene.tweens.add({
        targets: ghost,
        alpha: 0,
        duration: 360,
        onComplete: () => ghost.destroy(),
      });
    }
    this.scene.tweens.add({
      targets: bit,
      alpha: 0,
      duration: 360,
      onComplete: () => bit.destroy(),
    });
    this.playing = false;
  }
}
