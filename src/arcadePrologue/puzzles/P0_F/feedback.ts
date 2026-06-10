import Phaser from 'phaser';
import { COLORS, HEX_RADIUS, s } from '../P0_1/tokens';
import { MOTION } from '../P0_1/motion';

type PulseScene = Phaser.Scene & {
  emitPuzzleActionPulse?: (x: number, y: number, kind?: 'neutral' | 'correct' | 'wrong' | 'hint' | 'complete') => void;
};

/**
 * Boss-specific feedback. The reached-sink case escalates relative to P0_2's
 * sinkBloom — three rings + a slow halo — because this is the climax.
 */

export function finalCascade(scene: Phaser.Scene, at: Phaser.Math.Vector2): Promise<void> {
  (scene as PulseScene).emitPuzzleActionPulse?.(at.x, at.y, 'complete');
  return new Promise<void>((resolve) => {
    for (let i = 0; i < 4; i += 1) {
      const ring = scene.add
        .circle(at.x, at.y, HEX_RADIUS + s(4), 0, 0)
        .setStrokeStyle(s(2), COLORS.accent, 0.78 - i * 0.16)
        .setDepth(13);
      scene.tweens.add({
        targets: ring,
        scale: 1.25 + i * 0.16,
        alpha: 0,
        duration: 720 + i * 90,
        delay: i * 110,
        ease: MOTION.win.ease,
        onComplete: () => ring.destroy(),
      });
    }
    const halo = scene.add
      .circle(at.x, at.y, HEX_RADIUS + s(20), COLORS.accent, 0.18)
      .setDepth(12);
    scene.tweens.add({
      targets: halo,
      scale: 1.4,
      alpha: 0,
      duration: 1100,
      ease: 'Sine.easeOut',
      onComplete: () => {
        halo.destroy();
        resolve();
      },
    });
  });
}

