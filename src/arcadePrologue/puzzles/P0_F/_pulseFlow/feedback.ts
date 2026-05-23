import Phaser from 'phaser';
import { COLORS, HEX_RADIUS, s } from '../../P0_1/tokens';
import { MOTION } from '../../P0_1/motion';
import { coordsOf, type FlowBoard } from './board';

/**
 * Pulse-flow feedback effects shared between the Prologue Finale and the
 * (now-deleted) original P0_2 pulse-flow puzzle.
 */

export function deadEndShimmer(scene: Phaser.Scene, board: FlowBoard, key: string): void {
  const at = coordsOf(board, key);
  const ring = scene.add
    .circle(at.x, at.y, HEX_RADIUS + s(4), 0, 0)
    .setStrokeStyle(s(1.5), COLORS.warn, 0.62)
    .setDepth(12);
  scene.tweens.add({
    targets: ring,
    scale: 1.16,
    alpha: 0,
    duration: 380,
    ease: MOTION.mistake.ease,
    onComplete: () => ring.destroy(),
  });
}

export function sinkBloom(scene: Phaser.Scene, at: Phaser.Math.Vector2): void {
  for (let i = 0; i < 3; i += 1) {
    const ring = scene.add
      .circle(at.x, at.y, HEX_RADIUS + s(4), 0, 0)
      .setStrokeStyle(s(1.5), COLORS.accent, 0.72 - i * 0.18)
      .setDepth(12);
    scene.tweens.add({
      targets: ring,
      scale: 1.18 + i * 0.1,
      alpha: 0,
      duration: 580 + i * 70,
      delay: i * 80,
      ease: MOTION.win.ease,
      onComplete: () => ring.destroy(),
    });
  }
}

export function forkPressPulse(
  scene: Phaser.Scene,
  glyph: Phaser.GameObjects.Image,
  reduceMotion: boolean,
): void {
  if (reduceMotion) return;
  scene.tweens.killTweensOf(glyph);
  scene.tweens.add({
    targets: glyph,
    scaleX: { from: 0.96, to: 1 },
    scaleY: { from: 0.96, to: 1 },
    duration: MOTION.settle.duration,
    ease: MOTION.settle.ease,
  });
}
