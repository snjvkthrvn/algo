/**
 * BootScene - Asset preloading with retro progress bar.
 */

import Phaser from 'phaser';
import { COLORS, FONTS, SCENE_KEYS } from '../config/constants';
import { SPRITE_ASSETS, IMAGE_ASSETS, TILEMAP_ASSETS, AUDIO_ASSETS } from '../config/assets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    const { width, height } = this.cameras.main;

    // Background
    this.cameras.main.setBackgroundColor(COLORS.VOID_BLACK);

    // Title
    this.add.text(width / 2, height / 2 - 80, 'ALGORITHMIA', {
      fontSize: '28px',
      fontFamily: FONTS.RETRO,
      color: '#06b6d4',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 45, 'The Path of Logic', {
      fontSize: '14px',
      fontFamily: FONTS.RETRO,
      color: '#8b5cf6',
    }).setOrigin(0.5);

    // Progress bar background
    const barWidth = 400;
    const barHeight = 20;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2 + 20;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a1a2e, 1);
    barBg.fillRoundedRect(barX, barY, barWidth, barHeight, 4);
    barBg.lineStyle(2, 0x4a4a6a, 1);
    barBg.strokeRoundedRect(barX, barY, barWidth, barHeight, 4);

    // Progress bar fill
    const barFill = this.add.graphics();

    // Loading text
    const loadingText = this.add.text(width / 2, barY + barHeight + 20, 'Initializing...', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#9ca3af',
    }).setOrigin(0.5);

    // Progress events
    this.load.on('progress', (value: number) => {
      barFill.clear();
      barFill.fillStyle(COLORS.CYAN_GLOW, 1);
      barFill.fillRoundedRect(barX + 2, barY + 2, (barWidth - 4) * value, barHeight - 4, 3);
      loadingText.setText(`Loading... ${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      loadingText.setText('Systems Online');
    });

    // Load all registered assets
    for (const asset of SPRITE_ASSETS) {
      this.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth || 32,
        frameHeight: asset.frameHeight || 48,
      });
    }

    for (const asset of IMAGE_ASSETS) {
      this.load.image(asset.key, asset.path);
    }

    for (const asset of TILEMAP_ASSETS) {
      this.load.tilemapTiledJSON(asset.key, asset.path);
    }

    for (const asset of AUDIO_ASSETS) {
      this.load.audio(asset.key, asset.path);
    }

    // Keep the boot flow stable even when the asset manifest is empty.
    if (SPRITE_ASSETS.length + IMAGE_ASSETS.length + TILEMAP_ASSETS.length + AUDIO_ASSETS.length === 0) {
      barFill.fillStyle(COLORS.CYAN_GLOW, 1);
      barFill.fillRoundedRect(barX + 2, barY + 2, barWidth - 4, barHeight - 4, 3);
      loadingText.setText('Systems Online');
    }
  }

  create(): void {
    // Brief hold then fade to menu using tween (delayedCall + fadeOut are unreliable)
    const { width, height } = this.cameras.main;
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0).setDepth(10000);

    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 500,
      delay: 800,
      onComplete: () => {
        overlay.destroy();
        this.scene.start(SCENE_KEYS.MENU);
      },
    });
  }
}
