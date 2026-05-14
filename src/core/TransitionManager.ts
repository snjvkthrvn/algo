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

  /**
   * Pixel dissolve transition — RGB-split glitch frame, then 32px tiles fill the screen in
   * random order, then cuts. Reads as a "rupture" when stepping into a focused puzzle state.
   */
  static pixelDissolve(scene: Phaser.Scene, targetScene: string, data?: object): void {
    const { width, height } = scene.cameras.main;

    // Glitch frame — two color slices kick apart and snap back, selling the rupture
    const sliceR = scene.add.rectangle(0, 0, width, height, 0xff0044, 0.18).setOrigin(0).setDepth(9998);
    const sliceC = scene.add.rectangle(0, 0, width, height, 0x06b6d4, 0.18).setOrigin(0).setDepth(9999);
    scene.tweens.add({ targets: sliceR, x: -8, duration: 60, yoyo: true });
    scene.tweens.add({
      targets: sliceC,
      x: 8,
      duration: 60,
      yoyo: true,
      onComplete: () => {
        sliceR.destroy();
        sliceC.destroy();
      },
    });

    scene.time.delayedCall(140, () => {
      TransitionManager.runTileFill(scene, 0x081820, () => scene.scene.start(targetScene, data));
    });
  }

  /**
   * Cinematic boot transition — typewriter status line + pixel dissolve.
   * For the Menu → Game handoff: emphasizes "you are entering the world".
   */
  static cinematicBoot(
    scene: Phaser.Scene,
    targetScene: string,
    data?: object,
    statusLine: string = 'BOOTING WORLD'
  ): void {
    const { width, height } = scene.cameras.main;

    const flash = scene.add.rectangle(0, 0, width, height, 0xe0f8d0, 0).setOrigin(0).setDepth(10000);
    scene.tweens.add({
      targets: flash,
      alpha: 0.55,
      duration: 90,
      yoyo: true,
      onComplete: () => flash.destroy(),
    });

    const overlay = scene.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0).setDepth(10001);
    scene.tweens.add({ targets: overlay, alpha: 0.92, duration: 280, ease: 'Power2.easeIn' });

    scene.time.delayedCall(220, () => {
      const status = scene.add.text(width / 2, height / 2, '> ', {
        fontSize: '14px',
        fontFamily: 'monospace, "Courier New", "Press Start 2P"',
        color: '#88c070',
      }).setOrigin(0.5).setDepth(10002);
      const cursor = scene.add.rectangle(0, height / 2, 8, 14, 0x88c070, 1).setOrigin(0, 0.5).setDepth(10002);
      const reposition = () => {
        cursor.x = status.x + status.width / 2 + 2;
      };

      let i = 0;
      const typer = scene.time.addEvent({
        delay: 32,
        repeat: statusLine.length - 1,
        callback: () => {
          i++;
          status.setText(`> ${statusLine.substring(0, i)}`);
          reposition();
        },
      });
      reposition();

      const cursorBlink = scene.tweens.add({
        targets: cursor,
        alpha: 0.25,
        duration: 320,
        yoyo: true,
        repeat: -1,
        ease: 'Power0',
      });

      scene.time.delayedCall(820, () => {
        typer.remove();
        cursorBlink.stop();
        cursor.destroy();
        TransitionManager.runTileFill(scene, 0x000000, () => {
          status.destroy();
          overlay.destroy();
          scene.scene.start(targetScene, data);
        });
      });
    });
  }

  private static runTileFill(scene: Phaser.Scene, fillColor: number, onComplete: () => void): void {
    const { width, height } = scene.cameras.main;
    const TILE = 32;
    const cols = Math.ceil(width / TILE);
    const rows = Math.ceil(height / TILE);
    const tiles: { col: number; row: number }[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        tiles.push({ col: c, row: r });
      }
    }

    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    const g = scene.add.graphics().setDepth(10010);
    g.fillStyle(fillColor, 1);

    const chunkSize = Math.ceil(tiles.length / 16);
    let tick = 0;

    const timer = scene.time.addEvent({
      delay: 18,
      repeat: 15,
      callback: () => {
        const start = tick * chunkSize;
        const end = Math.min(start + chunkSize, tiles.length);
        for (let i = start; i < end; i++) {
          g.fillRect(tiles[i].col * TILE, tiles[i].row * TILE, TILE, TILE);
        }
        tick++;
        if (tick >= 16) {
          timer.remove();
          scene.time.delayedCall(60, () => {
            g.destroy();
            onComplete();
          });
        }
      },
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
