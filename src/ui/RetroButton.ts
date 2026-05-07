/**
 * RetroButton - Reusable styled button with hover/click effects.
 */

import Phaser from 'phaser';
import { FONTS } from '../config/constants';
import { audioManager } from '../core/AudioManager';
import { PANEL_PALETTE } from './panel';

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

  const shadow = scene.add.rectangle(4, 4, width, height, PANEL_PALETTE.FRAME).setOrigin(0.5);
  const bg = scene.add.rectangle(0, 0, width, height, PANEL_PALETTE.FILL).setOrigin(0.5);
  bg.setStrokeStyle(2, color);
  const accent = scene.add.rectangle(-width / 2 + 6, 0, 4, height - 12, color).setOrigin(0.5);

  const btnText = scene.add.text(0, 0, text, {
    fontSize: '16px',
    fontFamily: FONTS.RETRO,
    color: '#081820',
  }).setOrigin(0.5);

  container.add([shadow, bg, accent, btnText]);

  bg.setInteractive({ useHandCursor: true });

  const startY = y;

  bg.on('pointerover', () => {
    bg.setStrokeStyle(2, PANEL_PALETTE.ACCENT);
    container.setY(startY - 2);
    shadow.setY(6);
  });

  bg.on('pointerout', () => {
    bg.setStrokeStyle(2, color);
    container.setY(startY);
    shadow.setY(4);
  });

  bg.on('pointerdown', () => {
    audioManager.playClickTone();
    container.setY(startY + 2);
    shadow.setY(2);
    
    scene.time.delayedCall(80, () => {
      container.setY(startY);
      shadow.setY(4);
      callback();
    });
  });

  return container;
}

export function updateButtonText(button: Phaser.GameObjects.Container, text: string): void {
  const btnText = button.getAt(3) as Phaser.GameObjects.Text;
  btnText.setText(text);
}

export function disableButton(button: Phaser.GameObjects.Container): void {
  const bg = button.getAt(1) as Phaser.GameObjects.Rectangle;
  bg.setFillStyle(PANEL_PALETTE.ACCENT);
  bg.setStrokeStyle(2, PANEL_PALETTE.FRAME);
  bg.disableInteractive();
}
