/**
 * TransitionManager - Scene transition effects.
 * Provides geometric swirl, fade, and flash transitions.
 */

import Phaser from 'phaser';
import { COLORS } from '../config/constants';

export class TransitionManager {
  /**
   * Geometric swirl transition (~1.2s total)
   * Uses a tween for reliable timing instead of delayedCall.
   */
  static swirl(scene: Phaser.Scene, targetScene: string, data?: object): void {
    const { width, height } = scene.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;
    const graphics = scene.add.graphics().setDepth(10000);

    // Generate hexagonal shapes
    const numShapes = 24;
    const shapes: { size: number; baseAngle: number }[] = [];
    for (let i = 0; i < numShapes; i++) {
      shapes.push({
        baseAngle: (i / numShapes) * Math.PI * 2,
        size: 80 + Math.random() * 40,
      });
    }

    // Flash
    const flash = scene.add.rectangle(0, 0, width, height, 0xffffff, 0).setOrigin(0).setDepth(9999);
    scene.tweens.add({
      targets: flash,
      alpha: 0.4,
      duration: 100,
      yoyo: true,
      onComplete: () => flash.destroy(),
    });

    // Animate using a single tween driving a progress value
    const tracker = { progress: 0 };
    scene.tweens.add({
      targets: tracker,
      progress: 1,
      duration: 800,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        const t = tracker.progress;
        graphics.clear();

        for (const shape of shapes) {
          const dist = 600 * (1 - t);
          const angle = shape.baseAngle + t * 1.5;
          const sx = centerX + Math.cos(angle) * dist;
          const sy = centerY + Math.sin(angle) * dist;
          const currentSize = shape.size * (0.5 + t * 0.5);

          // Interpolate color cyan → purple
          const r = Math.floor(6 + (139 - 6) * t);
          const g = Math.floor(182 + (92 - 182) * t);
          const b = Math.floor(212 + (246 - 212) * t);
          const color = (r << 16) | (g << 8) | b;

          graphics.fillStyle(color, 0.7 + t * 0.3);
          TransitionManager.drawHexagon(graphics, sx, sy, currentSize);
        }
      },
      onComplete: () => {
        // Fill screen solid
        graphics.clear();
        graphics.fillStyle(COLORS.COSMIC_PURPLE, 1);
        graphics.fillRect(0, 0, width, height);

        // Brief hold then transition
        scene.tweens.add({
          targets: graphics,
          alpha: 1,
          duration: 200,
          onComplete: () => {
            graphics.destroy();
            scene.scene.start(targetScene, data);
          },
        });
      },
    });
  }

  /**
   * Simple fade transition
   */
  static fade(scene: Phaser.Scene, targetScene: string, data?: object, duration: number = 500): void {
    const { width, height } = scene.cameras.main;
    const overlay = scene.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0).setDepth(10000);

    scene.tweens.add({
      targets: overlay,
      alpha: 1,
      duration,
      onComplete: () => {
        overlay.destroy();
        scene.scene.start(targetScene, data);
      },
    });
  }

  /**
   * White flash transition
   */
  static flash(scene: Phaser.Scene, targetScene: string, data?: object): void {
    const { width, height } = scene.cameras.main;
    const flashRect = scene.add.rectangle(0, 0, width, height, 0xffffff, 0).setOrigin(0).setDepth(10000);

    scene.tweens.add({
      targets: flashRect,
      alpha: 1,
      duration: 200,
      onComplete: () => {
        flashRect.destroy();
        scene.scene.start(targetScene, data);
      },
    });
  }

  /**
   * Fade in effect for arriving at a new scene
   */
  static fadeIn(scene: Phaser.Scene, duration: number = 500): void {
    const { width, height } = scene.cameras.main;
    const overlay = scene.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0).setDepth(10000);

    scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration,
      onComplete: () => overlay.destroy(),
    });
  }

  private static drawHexagon(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      points.push({
        x: x + size * Math.cos(angle),
        y: y + size * Math.sin(angle),
      });
    }

    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
  }
}
