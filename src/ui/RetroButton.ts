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

  const shadow = scene.add.rectangle(2, 2, width, height, 0x000000, 0.5).setOrigin(0.5);
  const bg = scene.add.rectangle(0, 0, width, height, color, 1).setOrigin(0.5);
  bg.setStrokeStyle(2, adjustBrightness(color, 0.7));

  const btnText = scene.add.text(0, 0, text, {
    fontSize: '10px',
    fontFamily: FONTS.RETRO,
    color: '#ffffff',
  }).setOrigin(0.5);

  container.add([shadow, bg, btnText]);

  bg.setInteractive({ useHandCursor: true });

  bg.on('pointerover', () => {
    bg.setFillStyle(adjustBrightness(color, 1.2));
    scene.tweens.add({ targets: container, scale: 1.05, duration: 100 });
  });

  bg.on('pointerout', () => {
    bg.setFillStyle(color);
    scene.tweens.add({ targets: container, scale: 1, duration: 100 });
  });

  bg.on('pointerdown', () => {
    audioManager.playClickTone();
    callback();
  });

  return container;
}

export function updateButtonText(button: Phaser.GameObjects.Container, text: string): void {
  const btnText = button.getAt(2) as Phaser.GameObjects.Text;
  btnText.setText(text);
}

export function disableButton(button: Phaser.GameObjects.Container): void {
  const bg = button.getAt(1) as Phaser.GameObjects.Rectangle;
  bg.setFillStyle(COLORS.FRAME_BORDER);
  bg.disableInteractive();
}
