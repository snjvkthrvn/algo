/**
 * JuiceSystem — Particle bursts, screen flash, and camera shake for player action feedback.
 * All methods are stateless — call them from any Phaser scene.
 */

import Phaser from 'phaser';

export const JuiceSystem = {

  burst(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color: number,
    count: number = 12,
    spread: number = 60,
  ): void {
    if (!scene?.add?.rectangle || !scene?.tweens) return;
    for (let i = 0; i < count; i++) {
      try {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * spread;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 38; // slight upward bias
        const size = Math.random() < 0.25 ? 4 : 2;
        const lifetime = 480 + Math.random() * 180;

        const p = scene.add.rectangle(x, y, size, size, color, 1);
        if (p && typeof p.setDepth === 'function') p.setDepth(5000);
        scene.tweens.add({
          targets: p,
          x: x + vx * 0.6,
          y: y + vy * 0.6 + 28,
          alpha: 0,
          duration: lifetime,
          ease: 'Power2.easeOut',
          onComplete: () => p?.destroy?.(),
        });
      } catch {
        // Silently skip in test mocks or edge cases
      }
    }
  },

  // Gold arc upward + green inner burst — for correct answers
  correctBurst(scene: Phaser.Scene, x: number, y: number): void {
    JuiceSystem.burst(scene, x, y, 0xfbbf24, 14, 72);
    JuiceSystem.burst(scene, x, y, 0x88c070, 8, 36);
  },

  // Red pixels drooping downward — for wrong answers
  wrongBurst(scene: Phaser.Scene, x: number, y: number): void {
    if (!scene?.add?.rectangle || !scene?.tweens) return;
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI * 0.2 + Math.random() * Math.PI * 0.8;
      const speed = 30 + Math.random() * 40;
      const p = scene.add
        .rectangle(x + (Math.random() - 0.5) * 18, y, 2, 2, 0xef4444, 1)
        .setDepth(5000);
      scene.tweens.add({
        targets: p,
        x: p.x + Math.cos(angle) * speed * 0.5,
        y: p.y + Math.abs(Math.sin(angle)) * speed + 32,
        alpha: 0,
        duration: 580,
        ease: 'Power2.easeIn',
        onComplete: () => p.destroy(),
      });
    }
  },

  // Gold pixels falling from top — for codex unlock celebration
  goldRain(scene: Phaser.Scene): void {
    if (!scene?.cameras?.main || !scene?.add?.rectangle || !scene?.tweens) return;
    const { width, height } = scene.cameras.main;
    for (let i = 0; i < 52; i++) {
      const delay = Math.random() * 900;
      const x = 80 + Math.random() * (width - 160);
      const size = Math.random() < 0.3 ? 4 : 2;
      const p = scene.add.rectangle(x, -8, size, size, 0xfbbf24, 0).setDepth(5000);
      scene.tweens.add({
        targets: p,
        y: height * 0.65 + Math.random() * 80,
        alpha: { from: 0.9, to: 0 },
        duration: 850 + Math.random() * 450,
        delay,
        ease: 'Power1.easeIn',
        onComplete: () => p.destroy(),
      });
    }
  },

  screenFlash(
    scene: Phaser.Scene,
    color: number = 0xffffff,
    alpha: number = 0.15,
    duration: number = 140,
  ): void {
    if (!scene?.cameras?.main || !scene?.add?.rectangle || !scene?.tweens) return;
    const { width, height } = scene.cameras.main;
    const flash = scene.add
      .rectangle(0, 0, width, height, color, alpha)
      .setOrigin(0)
      .setDepth(9000);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      ease: 'Power2.easeOut',
      onComplete: () => flash.destroy(),
    });
  },

  cameraShake(scene: Phaser.Scene, duration: number = 90, intensity: number = 0.004): void {
    if (!scene?.cameras?.main) return; // defensive for tests / headless / scenes without camera
    scene.cameras.main.shake(duration, intensity);
  },
};
