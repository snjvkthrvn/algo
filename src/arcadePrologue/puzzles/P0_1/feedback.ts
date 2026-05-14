import Phaser from 'phaser';
import { COLORS, HEX_RADIUS, s } from './tokens';
import { MOTION, TIMING } from './motion';
import type { Glyph } from './board';

/**
 * Effect primitives. Every duration and ease sources from motion.ts.
 * reduceMotion is respected at the glyph-scale level — rings still play (gameplay info),
 * but glyphs themselves don't pulse or shake.
 */

export function chantPulse(scene: Phaser.Scene, glyph: Glyph, reduceMotion: boolean): void {
  scene.tweens.killTweensOf(glyph);
  glyph.setScale(1).setAlpha(0.55);
  if (reduceMotion) {
    scene.tweens.add({
      targets: glyph,
      alpha: { from: 0.55, to: 1 },
      duration: MOTION.chant.duration,
      ease: MOTION.chant.ease,
      yoyo: true,
      onComplete: () => glyph.setAlpha(0.55),
    });
    return;
  }
  scene.tweens.add({
    targets: glyph,
    alpha: { from: 0.55, to: 1 },
    scaleX: { from: 1, to: 1.04 },
    scaleY: { from: 1, to: 1.04 },
    duration: MOTION.chant.duration,
    ease: MOTION.chant.ease,
    yoyo: true,
    onComplete: () => glyph.setScale(1).setAlpha(0.55),
  });
}

export function chantRing(scene: Phaser.Scene, at: Phaser.Math.Vector2): void {
  const ring = scene.add
    .circle(at.x, at.y, HEX_RADIUS + s(2), 0, 0)
    .setStrokeStyle(s(1), COLORS.accent, 0.35)
    .setDepth(9);
  scene.tweens.add({
    targets: ring,
    scale: 1.3,
    alpha: 0,
    duration: TIMING.chantStep - 60,
    ease: MOTION.chant.ease,
    onComplete: () => ring.destroy(),
  });
}

export function stepCorrect(scene: Phaser.Scene, at: Phaser.Math.Vector2): void {
  const ring = scene.add
    .circle(at.x, at.y, HEX_RADIUS + s(4), 0, 0)
    .setStrokeStyle(s(1.3), COLORS.accent, 0.55)
    .setDepth(12);
  scene.tweens.add({
    targets: ring,
    scale: 1.08,
    alpha: 0,
    duration: MOTION.settle.duration + 120,
    ease: MOTION.settle.ease,
    onComplete: () => ring.destroy(),
  });
}

export function stepMistake(
  scene: Phaser.Scene,
  glyph: Glyph,
  at: Phaser.Math.Vector2,
  reduceMotion: boolean,
): void {
  const ring = scene.add
    .circle(at.x, at.y, HEX_RADIUS + s(4), 0, 0)
    .setStrokeStyle(s(1.5), COLORS.warn, 0.6)
    .setDepth(12);
  scene.tweens.add({
    targets: ring,
    scale: 1.14,
    alpha: 0,
    duration: MOTION.mistake.duration + 100,
    ease: MOTION.mistake.ease,
    onComplete: () => ring.destroy(),
  });
  if (reduceMotion) return;
  const baseX = glyph.x;
  scene.tweens.killTweensOf(glyph);
  scene.tweens.add({
    targets: glyph,
    x: { from: baseX, to: baseX + s(3) },
    duration: 70,
    yoyo: true,
    repeat: 1,
    ease: 'Sine.easeInOut',
    onComplete: () => glyph.setX(baseX),
  });
}

export function pressPulse(scene: Phaser.Scene, glyph: Glyph, reduceMotion: boolean): void {
  if (reduceMotion) return;
  scene.tweens.killTweensOf(glyph);
  scene.tweens.add({
    targets: glyph,
    scaleX: { from: 0.97, to: 1 },
    scaleY: { from: 0.97, to: 1 },
    duration: MOTION.settle.duration,
    ease: MOTION.settle.ease,
  });
}

export async function winCascade(
  scene: Phaser.Scene,
  points: Phaser.Math.Vector2[],
  reduceMotion: boolean,
): Promise<void> {
  const stagger = reduceMotion ? 36 : TIMING.winStaggerStep;
  for (const p of points) {
    const ring = scene.add
      .circle(p.x, p.y, HEX_RADIUS + s(6), 0, 0)
      .setStrokeStyle(s(1.4), COLORS.accent, 0.75)
      .setDepth(12);
    scene.tweens.add({
      targets: ring,
      scale: 1.18,
      alpha: 0,
      duration: 560,
      ease: MOTION.win.ease,
      onComplete: () => ring.destroy(),
    });
    /* eslint-disable-next-line no-await-in-loop */
    await new Promise<void>((resolve) => scene.time.delayedCall(stagger, () => resolve()));
  }
}
