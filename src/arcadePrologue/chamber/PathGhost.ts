/**
 * PathGhost — the post-clear demonstration for the rune walk: a spectral
 * walker glides the final chant start-to-end at a steady rhythm, lighting
 * a trail as it lands. Seeing the clean walk IS the lesson (VISION §3) —
 * no text explains it.
 */

import Phaser from "phaser";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";
import { cellWorldPos, type GridPos } from "../puzzles/P0_1/isogrid";

const STEP_MS = 380;

export class PathGhost {
  private scene: Phaser.Scene;
  private playing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  async play(path: ReadonlyArray<GridPos>): Promise<void> {
    if (this.playing || path.length === 0) return;
    this.playing = true;
    a11yManager.announce(
      "A spectral walker glides the chant from first rune to last, never missing a step.",
      false,
    );
    const start = cellWorldPos(path[0]!.row, path[0]!.col);
    const ghost = this.scene.add
      .circle(start.x, start.y - 14, 9, 0x9fe8f7, 0.85)
      .setDepth(64);
    const trail = this.scene.add.graphics().setDepth(63).setAlpha(0.7);

    for (let i = 1; i < path.length; i++) {
      const from = cellWorldPos(path[i - 1]!.row, path[i - 1]!.col);
      const to = cellWorldPos(path[i]!.row, path[i]!.col);
      audioManager.playTone(440 + i * 40, 60, "triangle");
      trail.lineStyle(2, 0x9fe8f7, 0.5);
      trail.lineBetween(from.x, from.y, to.x, to.y);
      await new Promise<void>((resolve) =>
        this.scene.tweens.add({
          targets: ghost,
          x: to.x,
          y: to.y - 14,
          duration: STEP_MS,
          ease: "Sine.easeInOut",
          onComplete: () => resolve(),
        }),
      );
    }
    await new Promise<void>((resolve) =>
      this.scene.time.delayedCall(700, () => resolve()),
    );
    this.scene.tweens.add({
      targets: [ghost, trail],
      alpha: 0,
      duration: 400,
      onComplete: () => {
        ghost.destroy();
        trail.destroy();
      },
    });
    this.playing = false;
  }
}
