/**
 * Shared retro option button for puzzle choice rows.
 *
 * Returns a handle so the caller can paint post-choice state directly on the
 * button the player pressed (correct = green ring + pulse, wrong = red shake),
 * which gives a stronger input->feedback link than a generic screen burst.
 */

import Phaser from 'phaser';
import { COLORS, COLOR_HEX, FONTS } from '../config/constants';
import { PANEL_PALETTE } from './panel';

interface ChoiceButtonConfig {
  strokeColor: number;
  width?: number;
  height?: number;
  wrapWidth?: number;
  onPreviewStart?: () => void;
  onPreviewEnd?: () => void;
  onChoose: () => void;
}

export interface ChoiceButtonHandle {
  container: Phaser.GameObjects.Container;
  setCorrect: () => void;
  setWrong: () => void;
  disable: () => void;
  reveal: (delayMs: number) => void;
}

export function createChoiceButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  index: number,
  labelText: string,
  config: ChoiceButtonConfig
): ChoiceButtonHandle {
  const width = config.width ?? 256;
  const height = config.height ?? 64;
  const wrapWidth = config.wrapWidth ?? width - 48;
  const container = scene.add.container(x, y);

  const hoverGlow = scene.add.rectangle(0, 0, width + 12, height + 12, COLORS.CYAN_GLOW, 0)
    .setOrigin(0.5);
  const shadow = scene.add.rectangle(5, 5, width, height, PANEL_PALETTE.FRAME).setOrigin(0.5);
  const bg = scene.add.rectangle(0, 0, width, height, PANEL_PALETTE.FILL)
    .setOrigin(0.5)
    .setStrokeStyle(3, config.strokeColor);
  const sideRule = scene.add.rectangle(-width / 2 + 8, 0, 4, height - 16, config.strokeColor)
    .setOrigin(0.5);
  const topRule = scene.add.rectangle(0, -height / 2 + 7, width - 18, 2, config.strokeColor)
    .setOrigin(0.5);

  // Number badge: dark inset square so the digit reads as a chip rather than floating text.
  const numberBadge = scene.add.rectangle(-width / 2 + 18, -height / 2 + 14, 18, 18, PANEL_PALETTE.FRAME).setOrigin(0.5);
  const numberText = scene.add.text(-width / 2 + 18, -height / 2 + 14, `${index + 1}`, {
    fontSize: '11px',
    fontFamily: FONTS.RETRO,
    color: COLOR_HEX.TEXT_LIGHT,
  }).setOrigin(0.5);

  const label = scene.add.text(0, 0, labelText, {
    fontSize: '12px',
    fontFamily: FONTS.MONO,
    color: COLOR_HEX.TEXT_DARK,
    align: 'center',
    wordWrap: { width: wrapWidth },
  }).setOrigin(0.5);

  // Subtle glow ring used for "correct" feedback — invisible by default.
  const resolveGlow = scene.add.rectangle(0, 0, width + 14, height + 14, COLORS.SUCCESS, 0)
    .setOrigin(0.5);

  container.add([hoverGlow, resolveGlow, shadow, bg, sideRule, topRule, numberBadge, numberText, label]);
  container.setSize(width, height);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains
  );

  let disabled = false;
  let resolved = false; // Set true once setCorrect/setWrong has rendered.
  const startY = y;

  const setHovered = (hovered: boolean) => {
    if (disabled || resolved) return;
    scene.tweens.killTweensOf(container);
    bg.setStrokeStyle(3, hovered ? COLORS.CYAN_GLOW : config.strokeColor);
    sideRule.setFillStyle(hovered ? COLORS.CYAN_GLOW : config.strokeColor);
    topRule.setFillStyle(hovered ? COLORS.CYAN_GLOW : config.strokeColor);
    hoverGlow.setFillStyle(COLORS.CYAN_GLOW, hovered ? 0.16 : 0);
    container.setY(hovered ? startY - 4 : startY);
    shadow.setY(hovered ? 8 : 5);
    if (hovered) {
      container.setScale(1.02);
      bg.setFillStyle(0xf0f8e0);
    } else {
      container.setScale(1);
      bg.setFillStyle(PANEL_PALETTE.FILL);
    }
  };

  container.on('pointerover', () => {
    setHovered(true);
    if (!disabled && !resolved) config.onPreviewStart?.();
  });
  container.on('pointerout', () => {
    setHovered(false);
    config.onPreviewEnd?.();
  });
  container.on('pointerdown', () => {
    if (disabled || resolved) return;
    container.setY(startY + 4);
    shadow.setY(0);

    scene.time.delayedCall(80, () => {
      container.setY(startY);
      shadow.setY(5);
      config.onChoose();
    });
  });

  // Slide-up entrance: stack starts at +18 transparent, lifts into place.
  container.setAlpha(0);
  container.setY(startY + 18);

  return {
    container,
    reveal: (delayMs: number) => {
      scene.tweens.add({
        targets: container,
        y: startY,
        alpha: 1,
        duration: 320,
        delay: delayMs,
        ease: 'Back.easeOut',
      });
    },
    setCorrect: () => {
      resolved = true;
      bg.setStrokeStyle(3, COLORS.SUCCESS);
      bg.setFillStyle(0xf3fbe5);
      sideRule.setFillStyle(COLORS.SUCCESS);
      topRule.setFillStyle(COLORS.SUCCESS);
      numberBadge.setFillStyle(COLORS.SUCCESS);
      numberText.setColor(COLOR_HEX.TEXT_DARK);
      resolveGlow.setFillStyle(COLORS.SUCCESS, 0.32);
      scene.tweens.add({
        targets: resolveGlow,
        alpha: 0,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 540,
        ease: 'Sine.easeOut',
      });
      scene.tweens.add({
        targets: container,
        scale: 1.06,
        duration: 160,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    },
    setWrong: () => {
      resolved = true;
      bg.setStrokeStyle(3, COLORS.BRIDGE_WRONG);
      bg.setFillStyle(0xfde2e2);
      sideRule.setFillStyle(COLORS.BRIDGE_WRONG);
      topRule.setFillStyle(COLORS.BRIDGE_WRONG);
      numberBadge.setFillStyle(COLORS.BRIDGE_WRONG);
      // Quick shake — left/right for "no."
      const baseX = container.x;
      scene.tweens.add({
        targets: container,
        x: { from: baseX - 6, to: baseX + 6 },
        duration: 60,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          container.setX(baseX);
          container.setAlpha(0.68);
        },
      });
    },
    disable: () => {
      disabled = true;
      container.setAlpha(0.55);
    },
  };
}
