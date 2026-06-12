/**
 * trialGhost — the Echo Causeway's lever replay: a spectral walker glides
 * the full safe route tile-by-tile, lighting a trail. Seeing the clean
 * crossing IS the lesson (VISION §3) — no text explains it.
 */

import type Phaser from "phaser";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";
import type { TileXY } from "./memoryWalk";
import { TRIAL_TILE_PX } from "./trialTiles";

const STEP_MS = 340;

function worldOf(tile: TileXY): { x: number; y: number } {
  return {
    x: tile.tx * TRIAL_TILE_PX + TRIAL_TILE_PX / 2,
    y: tile.ty * TRIAL_TILE_PX + TRIAL_TILE_PX / 2,
  };
}

export class TrialGhost {
  private scene: Phaser.Scene;
  private playing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Glide the spectral walker along `tiles` (all legs concatenated).
   * `onStart` hands the walker to the caller (e.g. for a camera follow);
   * `onEnd` fires after the fade so the caller can restore its camera.
   */
  async play(
    tiles: ReadonlyArray<TileXY>,
    hooks: {
      onStart?: (walker: Phaser.GameObjects.Arc) => void;
      onEnd?: () => void;
    } = {},
  ): Promise<void> {
    if (this.playing || tiles.length === 0) return;
    this.playing = true;
    a11yManager.announce(
      "A spectral walker glides the causeway, never missing a stone.",
      false,
    );
    const start = worldOf(tiles[0]!);
    const ghost = this.scene.add
      .circle(start.x, start.y - 8, 8, 0x9fe8f7, 0.85)
      .setDepth(64);
    const trail = this.scene.add.graphics().setDepth(63).setAlpha(0.7);
    hooks.onStart?.(ghost);

    for (let i = 1; i < tiles.length; i++) {
      const from = worldOf(tiles[i - 1]!);
      const to = worldOf(tiles[i]!);
      audioManager.playTone(440 + i * 24, 55, "triangle");
      trail.lineStyle(2, 0x9fe8f7, 0.5);
      trail.lineBetween(from.x, from.y, to.x, to.y);
      await new Promise<void>((resolve) =>
        this.scene.tweens.add({
          targets: ghost,
          x: to.x,
          y: to.y - 8,
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
        hooks.onEnd?.();
      },
    });
    this.playing = false;
  }
}
