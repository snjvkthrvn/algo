/**
 * RoundBanner — cinematic round-transition card.
 *
 * Replaces the in-puzzle "ROUND 2/3" text pill with a properly staged moment:
 * a wide horizontal banner sweeps in from off-screen, holds briefly,
 * then sweeps out the other side. The puzzle owns when to invoke it; this
 * primitive owns the look.
 *
 * Designed to be one-shot: instantiate, await `done`, drop the reference.
 * If the scene shuts down mid-banner, registered children are torn down.
 */

import Phaser from 'phaser';
import { COLORS, FONTS } from '../config/constants';

export interface RoundBannerOptions {
  /** Primary label, e.g. "ROUND 2 / 3". */
  label: string;
  /** Secondary subtitle, e.g. "TWIST · sort six furrows". */
  subtitle: string;
  /** Accent border colour (defaults to cyan glow). */
  accent?: number;
  /** Optional millisecond hold time on screen (default 240). */
  holdMs?: number;
  /** Optional sweep duration in/out (default 180). */
  sweepMs?: number;
}

export function showRoundBanner(scene: Phaser.Scene, options: RoundBannerOptions): Promise<void> {
  const accent = options.accent ?? COLORS.CYAN_GLOW;
  const holdMs = options.holdMs ?? 240;
  const sweepMs = options.sweepMs ?? 180;
  const { width, height } = scene.cameras.main;

  const targetY = Math.round(height / 2 - 132);
  const startX = -width;
  const exitX = width * 2;

  const container = scene.add.container(startX, targetY).setDepth(8000);

  // Wide dark plate
  const plateW = width + 200;
  const plateH = 64;
  const plate = scene.add.graphics();
  plate.fillStyle(0x081820, 0.94);
  plate.fillRect(-plateW / 2, -plateH / 2, plateW, plateH);
  plate.lineStyle(2, accent, 1);
  plate.beginPath();
  plate.moveTo(-plateW / 2, -plateH / 2);
  plate.lineTo(plateW / 2, -plateH / 2);
  plate.moveTo(-plateW / 2, plateH / 2);
  plate.lineTo(plateW / 2, plateH / 2);
  plate.strokePath();

  // Diagonal cyan rake stripes on the left bar to give it motion before it arrives.
  const rake = scene.add.graphics();
  rake.lineStyle(2, accent, 0.7);
  for (let i = -6; i < 6; i++) {
    rake.beginPath();
    const x = -plateW / 2 + 80 + i * 14;
    rake.moveTo(x, -plateH / 2);
    rake.lineTo(x + 26, plateH / 2);
    rake.strokePath();
  }
  const rakeMask = scene.make.graphics({ x: 0, y: 0 });
  rakeMask.fillStyle(0xffffff, 1);
  rakeMask.fillRect(-plateW / 2, -plateH / 2, 200, plateH);
  rake.setMask(rakeMask.createGeometryMask());

  const labelText = scene.add.text(0, -10, options.label, {
    fontSize: '20px',
    fontFamily: FONTS.RETRO,
    color: '#e0f8d0',
    stroke: '#06b6d4',
    strokeThickness: 2,
  }).setOrigin(0.5);

  const subtitleText = scene.add.text(0, 13, options.subtitle, {
    fontSize: '10px',
    fontFamily: FONTS.MONO,
    color: '#88c070',
    align: 'center',
  }).setOrigin(0.5);

  container.add([plate, rake, labelText, subtitleText]);

  return new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, finish);
      container.destroy();
      rakeMask.destroy();
      resolve();
    };

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, finish);

    // Sweep in
    scene.tweens.add({
      targets: container,
      x: width / 2,
      duration: sweepMs,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: container,
          x: exitX,
          delay: holdMs,
          duration: sweepMs,
          ease: 'Cubic.easeIn',
          onComplete: finish,
        });
      },
    });
  });
}
