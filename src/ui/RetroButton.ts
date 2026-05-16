/**
 * RetroButton - Reusable styled button with hover/click effects.
 */

import Phaser from 'phaser';
import { COLORS, COLOR_HEX, FONTS } from '../config/constants';
import { audioManager } from '../core/AudioManager';

export function createRetroButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: number,
  callback: () => void,
  width: number = 96,
  height: number = 48
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);

  const glow = scene.add.rectangle(0, 0, width + 10, height + 10, COLORS.CYAN_GLOW, 0)
    .setOrigin(0.5);
  const shadow = scene.add.rectangle(5, 5, width, height, COLORS.PURE_BLACK, 0.38).setOrigin(0.5);
  const bg = scene.add.rectangle(0, 0, width, height, COLORS.ERROR, 0.96).setOrigin(0.5);
  bg.setStrokeStyle(2, color);
  const accent = scene.add.rectangle(-width / 2 + 7, 0, 5, height - 14, color).setOrigin(0.5);
  const topRule = scene.add.rectangle(0, -height / 2 + 7, width - 18, 1, COLORS.FRAME_BORDER_LIGHT, 0.85)
    .setOrigin(0.5);

  const btnText = scene.add.text(0, 0, text, {
    fontSize: width <= 120 ? '12px' : '14px',
    fontFamily: FONTS.RETRO,
    color: COLOR_HEX.TEXT_LIGHT,
    align: 'center',
    wordWrap: { width: width - 24, useAdvancedWrap: true },
  }).setOrigin(0.5);

  container.add([glow, shadow, bg, accent, topRule, btnText]);
  container.setData('label', btnText);
  container.setData('background', bg);
  container.setData('accent', accent);

  bg.setInteractive({ useHandCursor: true });

  const startY = y;

  bg.on('pointerover', () => {
    bg.setStrokeStyle(2, COLORS.CYAN_GLOW);
    bg.setFillStyle(COLORS.WARNING, 0.98);
    accent.setFillStyle(COLORS.CYAN_GLOW);
    glow.setFillStyle(COLORS.CYAN_GLOW, 0.22);
    container.setY(startY - 3);
    shadow.setY(8);
    btnText.setColor(COLOR_HEX.TEXT_LIGHT);
  });

  bg.on('pointerout', () => {
    bg.setStrokeStyle(2, color);
    bg.setFillStyle(COLORS.ERROR, 0.96);
    accent.setFillStyle(color);
    glow.setFillStyle(COLORS.CYAN_GLOW, 0);
    container.setY(startY);
    shadow.setY(5);
  });

  bg.on('pointerdown', () => {
    audioManager.playClickTone();
    container.setY(startY + 2);
    shadow.setY(2);
    
    scene.time.delayedCall(80, () => {
      container.setY(startY);
      shadow.setY(5);
      callback();
    });
  });

  return container;
}

export function updateButtonText(button: Phaser.GameObjects.Container, text: string): void {
  const btnText = (button.getData('label') as Phaser.GameObjects.Text | undefined)
    ?? (button.getAt(button.list.length - 1) as Phaser.GameObjects.Text);
  btnText.setText(text);
}

export function disableButton(button: Phaser.GameObjects.Container): void {
  const bg = (button.getData('background') as Phaser.GameObjects.Rectangle | undefined)
    ?? (button.getAt(2) as Phaser.GameObjects.Rectangle);
  const accent = button.getData('accent') as Phaser.GameObjects.Rectangle | undefined;
  bg.setFillStyle(COLORS.WARNING, 0.72);
  bg.setStrokeStyle(2, COLORS.FRAME_BORDER_LIGHT);
  accent?.setFillStyle(COLORS.FRAME_BORDER_LIGHT);
  bg.disableInteractive();
  button.setAlpha(0.62);
}
