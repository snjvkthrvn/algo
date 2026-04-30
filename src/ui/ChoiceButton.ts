/**
 * Shared retro option button for puzzle choice rows.
 */

import Phaser from 'phaser';
import { FONTS } from '../config/constants';
import { colorToHex } from '../utils/colors';

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
  const width = config.width ?? 252;
  const height = config.height ?? 62;
  const wrapWidth = config.wrapWidth ?? width - 44;
  const strokeHex = colorToHex(config.strokeColor);
  const container = scene.add.container(x, y);

  const shadow = scene.add.rectangle(3, 3, width, height, 0x081820, 0.26).setOrigin(0.5);
  const bg = scene.add.rectangle(0, 0, width, height, 0xe0f8d0, 0.96)
    .setOrigin(0.5)
    .setStrokeStyle(3, config.strokeColor, 0.9);
  const topRule = scene.add.rectangle(0, -height / 2 + 5, width - 14, 2, config.strokeColor, 0.34)
    .setOrigin(0.5);
  const number = scene.add.text(-width / 2 + 18, -height / 2 + 12, `${index + 1}`, {
    fontSize: '9px',
    fontFamily: FONTS.RETRO,
    color: strokeHex,
  }).setOrigin(0.5);
  const label = scene.add.text(0, 0, labelText, {
    fontSize: '11px',
    fontFamily: FONTS.MONO,
    color: '#081820',
    align: 'center',
    wordWrap: { width: wrapWidth },
  }).setOrigin(0.5);

  container.add([shadow, bg, topRule, number, label]);
  container.setSize(width, height);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains
  );

  const setHovered = (hovered: boolean) => {
    scene.tweens.killTweensOf(container);
    bg.setFillStyle(hovered ? 0xf0ffe4 : 0xe0f8d0, hovered ? 1 : 0.96);
    bg.setStrokeStyle(3, config.strokeColor, hovered ? 1 : 0.9);
    topRule.setAlpha(hovered ? 0.8 : 0.34);
    shadow.setAlpha(hovered ? 0.36 : 0.26);
    scene.tweens.add({
      targets: container,
      scale: hovered ? 1.04 : 1,
      y: hovered ? y - 2 : y,
      duration: 80,
      ease: 'Quad.easeOut',
    });
  };

  container.on('pointerover', () => setHovered(true));
  container.on('pointerout', () => setHovered(false));
  container.on('pointerdown', () => {
    scene.tweens.add({
      targets: container,
      scaleX: 0.98,
      scaleY: 0.98,
      duration: 45,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    config.onChoose();
  });

  return container;
}
