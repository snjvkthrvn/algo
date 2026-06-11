/**
 * GrainFx — spill particles + persistent floor decals for the Grain Chamber.
 * The decal layer is the room's "score so far": it never cleans up mid-run.
 * Honors prefers-reduced-motion: decals appear without particle arcs.
 */

import Phaser from "phaser";
import { GRAIN_CHAMBER_KEYS } from "../../config/assets";
import { audioManager } from "../../core/AudioManager";

const GRAIN_COLOR = 0xd8b35a;
const KERNELS_PER_SPILL = 7;

type Kernel = Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

export class GrainFx {
  private scene: Phaser.Scene;
  private kernels: Kernel[] = [];
  private reduceMotion: boolean;

  constructor(scene: Phaser.Scene, reduceMotion: boolean) {
    this.scene = scene;
    this.reduceMotion = reduceMotion;
  }

  /** Spill from a crate position: arc kernels out, settle them as decals. */
  spill(x: number, y: number): void {
    audioManager.playSFX("grain_spill");
    // Procedural shaker rattle until foley assets exist (AUDIO_ASSETS is
    // empty project-wide; playTone is the house sfx pattern).
    audioManager.playTone(1800 + Math.random() * 400, 50, "sawtooth");
    for (let i = 0; i < KERNELS_PER_SPILL; i++) {
      const targetX = x + Phaser.Math.Between(-34, 34);
      const targetY = y + Phaser.Math.Between(10, 30);
      const kernel = this.makeKernel(targetX, targetY);
      this.kernels.push(kernel);
      if (this.reduceMotion) continue;
      kernel.setPosition(x, y - 10);
      this.scene.tweens.add({
        targets: kernel,
        x: targetX,
        y: targetY,
        duration: Phaser.Math.Between(260, 420),
        ease: "Quad.easeIn",
      });
    }
  }

  private makeKernel(x: number, y: number): Kernel {
    if (this.scene.textures.exists(GRAIN_CHAMBER_KEYS.GRAIN_DECALS)) {
      return this.scene.add
        .image(x, y, GRAIN_CHAMBER_KEYS.GRAIN_DECALS, Phaser.Math.Between(0, 3))
        .setDepth(6);
    }
    return this.scene.add.rectangle(x, y, 3, 2, GRAIN_COLOR, 0.9).setDepth(6);
  }

  /** Where the chickens should feast: every settled kernel. */
  decalPositions(): Array<{ x: number; y: number }> {
    return this.kernels.map((kernel) => ({ x: kernel.x, y: kernel.y }));
  }
}
