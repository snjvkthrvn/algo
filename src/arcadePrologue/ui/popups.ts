import Phaser from 'phaser';
import { COLORS, s } from '../puzzles/P0_1/tokens';

/**
 * Floating score popup. Spawns at world coordinates, drifts upward, fades.
 * Use `accent` for normal awards, `warn` for big finale awards.
 */

export type PopupOptions = {
  color?: string;
  size?: number;
  rise?: number;
  duration?: number;
};

export function scorePopup(
  scene: Phaser.Scene,
  worldX: number,
  worldY: number,
  text: string,
  options: PopupOptions = {},
): void {
  const color = options.color ?? COLORS.text.accent;
  const size = options.size ?? 15;
  const rise = options.rise ?? 30;
  const duration = options.duration ?? 780;

  const t = scene.add
    .text(worldX, worldY, text, {
      fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
      fontSize: `${Math.round(s(size))}px`,
      fontStyle: '700',
      color,
    })
    .setOrigin(0.5)
    .setDepth(20)
    .setShadow(0, s(1), '#0b1020', s(6), false, true);

  scene.tweens.add({
    targets: t,
    y: worldY - s(rise),
    duration,
    ease: 'Cubic.easeOut',
  });
  scene.tweens.add({
    targets: t,
    alpha: { from: 1, to: 0 },
    duration,
    ease: 'Sine.easeIn',
    onComplete: () => t.destroy(),
  });
}
