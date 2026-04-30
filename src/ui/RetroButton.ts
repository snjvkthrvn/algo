/**
 * RetroButton - Reusable styled button with hover/click effects.
 */

import Phaser from 'phaser';
import { FONTS, COLORS } from '../config/constants';
import { adjustBrightness } from '../utils/colors';
import { audioManager } from '../core/AudioManager';

export function createRetroButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: number,
  callback: () => void,
  width: number = 90,
  height: number = 30
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);

  const shadow = scene.add.rectangle(2, 2, width, height, 0x081820, 0.28).setOrigin(0.5);
  const bg = scene.add.rectangle(0, 0, width, height, 0xe0f8d0, 1).setOrigin(0.5);
  bg.setStrokeStyle(2, color, 0.95);
  const accent = scene.add.rectangle(-width / 2 + 5, 0, 4, height - 8, color, 0.95).setOrigin(0.5);

  const btnText = scene.add.text(0, 0, text, {
    fontSize: '10px',
    fontFamily: FONTS.RETRO,
    color: '#081820',
  }).setOrigin(0.5);

  container.add([shadow, bg, accent, btnText]);

  bg.setInteractive({ useHandCursor: true });

  bg.on('pointerover', () => {
    bg.setFillStyle(0xf0ffe4);
    bg.setStrokeStyle(2, adjustBrightness(color, 1.15));
    scene.tweens.add({ targets: container, scale: 1.1, duration: 80 });
  });

  bg.on('pointerout', () => {
    bg.setFillStyle(0xe0f8d0);
    bg.setStrokeStyle(2, color, 0.95);
    scene.tweens.add({ targets: container, scale: 1, duration: 80 });
  });

  bg.on('pointerdown', () => {
    audioManager.playClickTone();
    callback();
  });

  return container;
}

export function updateButtonText(button: Phaser.GameObjects.Container, text: string): void {
  const btnText = button.getAt(3) as Phaser.GameObjects.Text;
  btnText.setText(text);
}

export function disableButton(button: Phaser.GameObjects.Container): void {
  const bg = button.getAt(1) as Phaser.GameObjects.Rectangle;
  bg.setFillStyle(0xc7d8bd);
  bg.setStrokeStyle(2, COLORS.FRAME_BORDER);
  bg.disableInteractive();
}
