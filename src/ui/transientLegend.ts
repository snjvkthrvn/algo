/**
 * Transient control legend — a bottom keybinding line that dissolves shortly
 * after entry. Persistent keybinding chrome violates docs/VISION.md §5
 * ("legends/banners fade after entry"); every first-three-regions room mounts
 * its legend through this helper so the fade register stays uniform.
 */

import Phaser from 'phaser';
import { FONTS } from '../config/constants';

/** How long a control legend stays before dissolving (ms). */
export const LEGEND_HOLD_MS = 7000;

export function mountTransientLegend(
  scene: Phaser.Scene,
  y: number,
  text: string,
): void {
  const label = scene.add
    .text(scene.cameras.main.width / 2, y, text, {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
      align: 'center',
    })
    .setOrigin(0.5)
    .setDepth(20);
  scene.time.delayedCall(LEGEND_HOLD_MS, () => {
    if (!label.active) return;
    scene.tweens.add({
      targets: label,
      alpha: 0,
      duration: 600,
      ease: 'Sine.easeIn',
      onComplete: () => label.destroy(),
    });
  });
}
