/**
 * GlitchRival - The rival character who appears briefly, taunts, and leaves.
 *
 * Visual only — dialogue is driven by PrologueScene via playCinematicSequence.
 */

import Phaser from 'phaser';
import { gameState } from '../core/GameStateManager';
import { VISUAL_REVAMP_KEYS } from '../config/assets';

const GLITCH_COLORS = [0x6b21a8, 0x7c3aed, 0x4c1d95, 0x1e1b4b];

export class GlitchRival {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private glitchSprite: Phaser.GameObjects.Image;
  private glitchTimer: Phaser.Time.TimerEvent | null = null;
  private isActive: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(-200, -200);
    this.container.setDepth(9).setAlpha(0).setVisible(false);

    this.glitchSprite = scene.add
      .image(0, 0, VISUAL_REVAMP_KEYS.GLITCH)
      .setDisplaySize(48, 76);
    const aura = scene.add.ellipse(0, 8, 54, 82, 0x8b5cf6, 0.13);

    this.container.add([aura, this.glitchSprite]);
    this.startGlitchFlicker();
  }

  /** Tween Glitch in at position and call onReady when the spawn animation completes. */
  spawnIn(x: number, y: number, onReady: () => void): void {
    if (this.isActive) return;
    this.isActive = true;
    gameState.advanceGlitchEncounter();
    this.container.setPosition(x, y).setVisible(true);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 180,
      ease: 'Linear',
      onComplete: () => onReady(),
    });
  }

  /** Tween Glitch off screen and call onDone when the departure animation completes. */
  exit(onDone?: () => void): void {
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + 300,
      duration: 800,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.container.setVisible(false).setAlpha(0);
        this.isActive = false;
        onDone?.();
      },
    });
  }

  destroy(): void {
    this.glitchTimer?.destroy();
    this.container.destroy();
  }

  private startGlitchFlicker(): void {
    this.glitchTimer = this.scene.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        if (!this.isActive) return;
        const color = Phaser.Utils.Array.GetRandom(GLITCH_COLORS) as number;
        this.glitchSprite.setTint(color);
        this.scene.time.delayedCall(70, () => this.glitchSprite.clearTint());

        if (Math.random() < 0.25) {
          const jx = Phaser.Math.Between(-2, 2);
          const jy = Phaser.Math.Between(-1, 1);
          this.container.setPosition(this.container.x + jx, this.container.y + jy);
          this.scene.time.delayedCall(60, () => {
            this.container.setPosition(this.container.x - jx, this.container.y - jy);
          });
        }
      },
    });
  }

}
