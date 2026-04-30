/**
 * HUDManager - Minimal retro HUD with region name and contextual prompts.
 *
 * All positions snap to an 8-pixel grid for crisp rendering.
 */

import Phaser from 'phaser';
import { FONTS } from '../config/constants';
import { drawPanel } from '../ui/panel';

export class HUDManager {
  private scene: Phaser.Scene;
  private regionText: Phaser.GameObjects.Text;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(3000).setScrollFactor(0);

    // Region badge (top-left).
    this.regionText = scene.add.text(24, 16, '', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 8, y: 8 },
    });
    this.regionText.setAlpha(0);
    this.container.add(this.regionText);
  }

  showRegionName(name: string): void {
    this.regionText.setText(name);
    this.regionText.setAlpha(0);

    this.scene.tweens.add({
      targets: this.regionText,
      alpha: 0.8,
      duration: 1000,
      hold: 3000,
      yoyo: true,
    });
  }

  showRegionCard(name: string, subtitle: string): void {
    const { width } = this.scene.cameras.main;

    const cardW = Math.min(width - 96, 560);
    const cardH = 104;
    const cardX = Math.round(width / 2 - cardW / 2);
    const cardY = 64;

    const cardBg = drawPanel(this.scene, cardX, cardY, cardW, cardH, {
      depth: 3001,
      scrollFactor: 0,
      inner: 0x346856,
    });

    const titleText = this.scene.add.text(width / 2, cardY + 24, name, {
      fontSize: '16px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3002);

    const subText = this.scene.add.text(width / 2, cardY + 56, subtitle, {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#346856',
      align: 'center',
      wordWrap: { width: cardW - 48, useAdvancedWrap: true },
      lineSpacing: 6,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3002);

    cardBg.setAlpha(0);
    titleText.setAlpha(0);
    subText.setAlpha(0);

    this.scene.tweens.add({
      targets: [cardBg, titleText, subText],
      alpha: 1,
      duration: 500,
      hold: 2500,
      yoyo: true,
      onComplete: () => {
        cardBg.destroy();
        titleText.destroy();
        subText.destroy();
      },
    });

    // Also set persistent region text
    this.regionText.setText(name);
    this.scene.time.delayedCall(4000, () => {
      this.regionText.setAlpha(0.6);
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
