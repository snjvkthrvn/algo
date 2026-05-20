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
  // Outer expanding ring
  const ring = scene.add
    .circle(at.x, at.y, HEX_RADIUS + s(2), 0, 0)
    .setStrokeStyle(s(1.2), COLORS.accent, 0.45)
    .setDepth(9);
  scene.tweens.add({
    targets: ring,
    scale: 1.4,
    alpha: 0,
    duration: TIMING.chantStep - 60,
    ease: MOTION.chant.ease,
    onComplete: () => ring.destroy(),
  });

  // Inner dot flash — gives the "pointer lands here" feel
  const dot = scene.add
    .circle(at.x, at.y, s(5), COLORS.accent, 0.7)
    .setDepth(9);
  scene.tweens.add({
    targets: dot,
    alpha: 0,
    scaleX: 2.5,
    scaleY: 2.5,
    duration: 280,
    ease: 'Power2.easeOut',
    onComplete: () => dot.destroy(),
  });
}

export function stepCorrect(scene: Phaser.Scene, at: Phaser.Math.Vector2): void {
  // Fast inner ring — snap of confirmation
  const inner = scene.add
    .circle(at.x, at.y, HEX_RADIUS + s(2), 0, 0)
    .setStrokeStyle(s(1.5), COLORS.accent, 0.8)
    .setDepth(12);
  scene.tweens.add({
    targets: inner,
    scale: 1.12,
    alpha: 0,
    duration: 200,
    ease: 'Power2.easeOut',
    onComplete: () => inner.destroy(),
  });

  // Slower outer ring — echo
  const outer = scene.add
    .circle(at.x, at.y, HEX_RADIUS + s(4), 0, 0)
    .setStrokeStyle(s(1), COLORS.accent, 0.35)
    .setDepth(12);
  scene.tweens.add({
    targets: outer,
    scale: 1.4,
    alpha: 0,
    duration: MOTION.settle.duration + 180,
    ease: MOTION.settle.ease,
    onComplete: () => outer.destroy(),
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
    // Filled flash — tile "completes"
    const flash = scene.add
      .circle(p.x, p.y, HEX_RADIUS + s(2), COLORS.accent, 0.25)
      .setDepth(12);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.3,
      duration: 320,
      ease: 'Power2.easeOut',
      onComplete: () => flash.destroy(),
    });

    // Expanding ring
    const ring = scene.add
      .circle(p.x, p.y, HEX_RADIUS + s(6), 0, 0)
      .setStrokeStyle(s(1.6), COLORS.accent, 0.8)
      .setDepth(12);
    scene.tweens.add({
      targets: ring,
      scale: 1.4,
      alpha: 0,
      duration: 580,
      ease: MOTION.win.ease,
      onComplete: () => ring.destroy(),
    });

    /* eslint-disable-next-line no-await-in-loop */
    await new Promise<void>((resolve) => scene.time.delayedCall(stagger, () => resolve()));
  }
}
