/**
 * MirrorTwin — the player's watery reflection on the north boardwalk.
 *
 * The twin stands always at the player's x reflected across the rack's
 * center: walk left and it walks right, meet in the middle and you stand
 * face to face. It IS the second pointer — embodied, never explained
 * (VISION §3). A faint ripple trail keeps it reading as reflection, not
 * a second character.
 */

import Phaser from "phaser";

export class MirrorTwin {
  private scene: Phaser.Scene;
  private body: Phaser.GameObjects.Container;
  private walkY: number;
  private lastRippleAt = 0;

  constructor(scene: Phaser.Scene, northWalkY: number) {
    this.scene = scene;
    this.walkY = northWalkY;
    this.body = scene.add.container(0, northWalkY).setDepth(22).setAlpha(0.65);
    // A tinted, simplified double: teal-washed silhouette, flipped.
    const torso = scene.add
      .rectangle(0, 0, 16, 22, 0x5ad8d8, 0.55)
      .setStrokeStyle(1, 0x9ff7f7, 0.7);
    const head = scene.add.ellipse(0, -16, 12, 10, 0x9ff7f7, 0.5);
    this.body.add([torso, head]);
    this.body.setScale(1, -1).setAngle(0);
    this.body.setScale(1, 1);
    // Gentle shimmer so it reads as water-born.
    scene.tweens.add({
      targets: this.body,
      alpha: 0.45,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** Keep the twin at the player's x mirrored across `centerX`. */
  update(playerX: number, centerX: number): void {
    const mirroredX = 2 * centerX - playerX;
    this.body.setPosition(mirroredX, this.walkY);
    const now = this.scene.time.now;
    if (now - this.lastRippleAt > 420) {
      this.lastRippleAt = now;
      const ripple = this.scene.add
        .ellipse(mirroredX, this.walkY + 14, 14, 4, 0x5ad8d8, 0.0)
        .setStrokeStyle(1, 0x5ad8d8, 0.5)
        .setDepth(8);
      this.scene.tweens.add({
        targets: ripple,
        scaleX: 2,
        alpha: 0,
        duration: 700,
        ease: "Sine.easeOut",
        onComplete: () => ripple.destroy(),
      });
    }
  }

  /** The clear: the reflection bows and stills. */
  celebrate(): void {
    this.scene.tweens.add({
      targets: this.body,
      y: this.walkY + 4,
      alpha: 0.8,
      duration: 600,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }

  /** Dissolve the reflection — used when a phase board retires. */
  teardown(): void {
    this.body.destroy();
  }
}
