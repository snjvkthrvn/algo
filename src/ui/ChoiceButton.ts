/**
 * Shared retro option button for puzzle choice rows.
 */

import Phaser from 'phaser';
import { FONTS } from '../config/constants';
import { PANEL_PALETTE } from './panel';

interface ChoiceButtonConfig {
  strokeColor: number;
  width?: number;
  height?: number;
  wrapWidth?: number;
  onChoose: () => void;
}

export function createChoiceButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  index: number,
  labelText: string,
  config: ChoiceButtonConfig
): Phaser.GameObjects.Container {
  const width = config.width ?? 256;
  const height = config.height ?? 64;
  const wrapWidth = config.wrapWidth ?? width - 48;
  const container = scene.add.container(x, y);

  const shadow = scene.add.rectangle(4, 4, width, height, PANEL_PALETTE.FRAME).setOrigin(0.5);
  const bg = scene.add.rectangle(0, 0, width, height, PANEL_PALETTE.FILL)
    .setOrigin(0.5)
    .setStrokeStyle(4, config.strokeColor);
  const topRule = scene.add.rectangle(0, -height / 2 + 6, width - 16, 2, config.strokeColor)
    .setOrigin(0.5);
  
  const numberText = scene.add.text(-width / 2 + 16, -height / 2 + 16, `${index + 1}`, {
    fontSize: '12px',
    fontFamily: FONTS.RETRO,
    color: '#081820',
  }).setOrigin(0.5);
  
  const label = scene.add.text(0, 0, labelText, {
    fontSize: '12px',
    fontFamily: FONTS.MONO,
    color: '#081820',
    align: 'center',
    wordWrap: { width: wrapWidth },
  }).setOrigin(0.5);

  container.add([shadow, bg, topRule, numberText, label]);
  container.setSize(width, height);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains
  );

  const startY = y;

  const setHovered = (hovered: boolean) => {
    scene.tweens.killTweensOf(container);
    bg.setStrokeStyle(4, hovered ? PANEL_PALETTE.ACCENT : config.strokeColor);
    container.setY(hovered ? startY - 4 : startY);
    shadow.setY(hovered ? 8 : 4);
  };

  container.on('pointerover', () => setHovered(true));
  container.on('pointerout', () => setHovered(false));
  container.on('pointerdown', () => {
    container.setY(startY + 4);
    shadow.setY(0);
    
    scene.time.delayedCall(80, () => {
      container.setY(startY);
      shadow.setY(4);
      config.onChoose();
    });
  });

  return container;
}
