import Phaser from 'phaser';
import { COLORS, px, s, STAGE, TYPE } from '../../P0_1/tokens';

/**
 * Full-screen dramatic title overlay shown before the boss begins.
 * Fades in, holds, fades out — resolves once the overlay is fully gone.
 */

export type Intro = {
  show(eyebrow: string, title: string, subtitle: string): Promise<void>;
};

const FADE_IN_MS = 380;
const HOLD_MS = 1400;
const FADE_OUT_MS = 520;

export function createIntro(scene: Phaser.Scene): Intro {
  function show(eyebrow: string, title: string, subtitle: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const cover = scene.add
        .rectangle(STAGE.width / 2, STAGE.height / 2, STAGE.width, STAGE.height, COLORS.bg.deep, 0.94)
        .setDepth(30)
        .setAlpha(0);

      const eyebrowText = scene.add
        .text(STAGE.width / 2, STAGE.height / 2 - s(56), eyebrow, {
          ...TYPE.eyebrow,
          color: COLORS.text.accent,
          letterSpacing: s(4),
        })
        .setOrigin(0.5)
        .setDepth(31)
        .setAlpha(0);

      const titleText = scene.add
        .text(STAGE.width / 2, STAGE.height / 2 - s(6), title, {
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          fontSize: px(46),
          fontStyle: '600',
          color: COLORS.text.primary,
        })
        .setOrigin(0.5)
        .setDepth(31)
        .setAlpha(0)
        .setShadow(0, s(2), '#0b1020', s(14), true, true);

      const subText = scene.add
        .text(STAGE.width / 2, STAGE.height / 2 + s(38), subtitle, {
          ...TYPE.body,
          align: 'center',
          wordWrap: { width: STAGE.width - s(160) },
        })
        .setOrigin(0.5)
        .setDepth(31)
        .setAlpha(0);

      const everything = [cover, eyebrowText, titleText, subText];

      scene.tweens.add({
        targets: everything,
        alpha: { from: 0, to: 1 },
        duration: FADE_IN_MS,
        ease: 'Sine.easeOut',
        onComplete: () => {
          scene.time.delayedCall(HOLD_MS, () => {
            scene.tweens.add({
              targets: everything,
              alpha: 0,
              duration: FADE_OUT_MS,
              ease: 'Sine.easeIn',
              onComplete: () => {
                everything.forEach((o) => o.destroy());
                resolve();
              },
            });
          });
        },
      });
    });
  }

  return { show };
}
