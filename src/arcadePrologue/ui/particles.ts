import Phaser from 'phaser';
import { COLORS, s } from '../puzzles/P0_1/tokens';

/**
 * Sparkle burst — small radial dots that expand outward and fade.
 * Used for correct-hop satisfaction, milestone celebrations, sink reached.
 */

export type SparkleOptions = {
  count?: number;
  color?: number;
  spread?: number;
  duration?: number;
  radius?: number;
};

export function sparkle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: SparkleOptions = {},
): void {
  const count = options.count ?? 6;
  const color = options.color ?? COLORS.accent;
  const spread = s(options.spread ?? 26);
  const duration = options.duration ?? 540;
  const radius = s(options.radius ?? 2.4);

  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = spread + Math.random() * s(12);
    const tx = x + Math.cos(angle) * dist;
    const ty = y + Math.sin(angle) * dist;
    const dot = scene.add.circle(x, y, radius, color, 1).setDepth(15);
    scene.tweens.add({
      targets: dot,
      x: tx,
      y: ty,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: duration + Math.random() * 200,
      ease: 'Cubic.easeOut',
      onComplete: () => dot.destroy(),
    });
  }
}

export function hexColorToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
