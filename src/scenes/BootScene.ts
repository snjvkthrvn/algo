/**
 * BootScene - Asset preloading with retro Game Boy boot screen.
 */

import Phaser from 'phaser';
import { COLORS, FONTS, SCENE_KEYS } from '../config/constants';
// Boot stays intentionally tiny. Region, puzzle, and player art is queued by
// the scene that owns it so production Firefox does not block menu startup on
// dozens of large image decodes.
import { BOOT_IMAGE_ASSETS, BOOT_SPRITE_ASSETS, TILEMAP_ASSETS, AUDIO_ASSETS } from '../config/assets';

const GLYPHS = '0123456789#%&*!?<>=+~^@$';
const GAME_VERSION = 'v1.0.0';
const BAR_WIDTH = 512;
const BAR_HEIGHT = 16;

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor(COLORS.VOID_BLACK);

    const totalAssets =
      BOOT_SPRITE_ASSETS.length + BOOT_IMAGE_ASSETS.length + TILEMAP_ASSETS.length + AUDIO_ASSETS.length;

    // Layout — all snapped to 8px grid
    const titleY = Math.round(height / 2 - 96);
    const accentY = titleY + 40;
    const subtitleY = accentY + 16;
    const barX = Math.round((width - BAR_WIDTH) / 2);
    const barY = Math.round(height / 2 + 80);

    // Title — glitch-assembles into "ALGORITHMIA"
    const titleTarget = 'ALGORITHMIA';
    const titleDisplay: string[] = new Array(titleTarget.length).fill(' ');
    const title = this.add.text(width / 2, titleY, '', {
      fontSize: '40px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
      stroke: '#081820',
      strokeThickness: 4,
    }).setOrigin(0.5);

    titleTarget.split('').forEach((finalChar, i) => {
      this.time.delayedCall(160 + i * 56, () => {
        const scramble = this.time.addEvent({
          delay: 32,
          repeat: 5,
          callback: () => {
            titleDisplay[i] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            title.setText(titleDisplay.join(''));
          },
        });
        this.time.delayedCall(32 * 7, () => {
          scramble.remove();
          titleDisplay[i] = finalChar;
          title.setText(titleDisplay.join(''));
        });
      });
    });

    // Accent line — grows from center after title settles
    const accent = this.add.rectangle(width / 2, accentY, 0, 2, 0x88c070, 0.9);
    this.tweens.add({
      targets: accent,
      width: 320,
      duration: 600,
      delay: 320,
      ease: 'Expo.easeOut',
    });

    this.add.text(width / 2, subtitleY, 'THE PATH OF LOGIC', {
      fontSize: '14px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
      stroke: '#081820',
      strokeThickness: 1,
    }).setOrigin(0.5);

    // Progress chrome — sharp pixel border, no rounding
    const barFrame = this.add.graphics();
    barFrame.lineStyle(2, 0x88c070, 0.85);
    barFrame.strokeRect(barX - 4, barY - 4, BAR_WIDTH + 8, BAR_HEIGHT + 8);
    barFrame.lineStyle(1, 0x346856, 0.6);
    barFrame.strokeRect(barX - 2, barY - 2, BAR_WIDTH + 4, BAR_HEIGHT + 4);

    const barBg = this.add.graphics();
    barBg.fillStyle(0x081820, 1);
    barBg.fillRect(barX, barY, BAR_WIDTH, BAR_HEIGHT);

    const barFill = this.add.graphics();

    const statusText = this.add.text(width / 2, barY - 24, '> INITIALIZING SYSTEMS', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
    }).setOrigin(0.5);

    const countText = this.add.text(width / 2, barY + BAR_HEIGHT + 16, `[ 0 / ${totalAssets} ]`, {
      fontSize: '9px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      const filled = Math.floor(BAR_WIDTH * value);
      barFill.clear();
      barFill.fillStyle(0x88c070, 1);
      barFill.fillRect(barX, barY, filled, BAR_HEIGHT);
      // Brighter leading edge — reads as a sweeping scan tick
      if (filled > 4 && filled < BAR_WIDTH - 1) {
        barFill.fillStyle(0xe0f8d0, 1);
        barFill.fillRect(barX + filled - 2, barY, 2, BAR_HEIGHT);
      }
      const loaded = Math.floor(totalAssets * value);
      countText.setText(`[ ${loaded} / ${totalAssets} ]`);

      if (value < 0.33) statusText.setText('> INITIALIZING SYSTEMS');
      else if (value < 0.66) statusText.setText('> LOADING ASSETS');
      else if (value < 1) statusText.setText('> CALIBRATING WORLD');
      else statusText.setText('> SYSTEMS ONLINE');
    });

    this.load.on('complete', () => {
      barFill.clear();
      barFill.fillStyle(0x88c070, 1);
      barFill.fillRect(barX, barY, BAR_WIDTH, BAR_HEIGHT);
      countText.setText(`[ ${totalAssets} / ${totalAssets} ]`);
      statusText.setText('> SYSTEMS ONLINE');
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn('Failed to load asset:', file.key, file.url);
    });

    for (const asset of BOOT_SPRITE_ASSETS) {
      this.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth || 32,
        frameHeight: asset.frameHeight || 48,
      });
    }
    for (const asset of BOOT_IMAGE_ASSETS) this.load.image(asset.key, asset.path);
    for (const asset of TILEMAP_ASSETS) this.load.tilemapTiledJSON(asset.key, asset.path);
    for (const asset of AUDIO_ASSETS) this.load.audio(asset.key, asset.path);

    if (totalAssets === 0) {
      barFill.fillStyle(0x88c070, 1);
      barFill.fillRect(barX, barY, BAR_WIDTH, BAR_HEIGHT);
      statusText.setText('> SYSTEMS ONLINE');
      countText.setText('[ 0 / 0 ]');
    }

    this.add.text(width - 24, height - 24, `${GAME_VERSION}  //  BUILD 2026.05`, {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: '#346856',
    }).setOrigin(1, 1);

    this.add.text(width / 2, height - 40, 'A world of algorithms awaits', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#346856',
    }).setOrigin(0.5);

    // CRT power-on — two black bars slide apart from center
    const topCover = this.add.rectangle(0, 0, width, height / 2, 0x000000).setOrigin(0, 0).setDepth(8000);
    const botCover = this.add.rectangle(0, height / 2, width, height / 2, 0x000000).setOrigin(0, 0).setDepth(8000);

    this.tweens.add({ targets: topCover, y: -height / 2, duration: 380, ease: 'Expo.easeOut' });
    this.tweens.add({
      targets: botCover,
      y: height,
      duration: 380,
      ease: 'Expo.easeOut',
      onComplete: () => {
        topCover.destroy();
        botCover.destroy();
        const flash = this.add.rectangle(0, 0, width, height, 0xe0f8d0, 0.18).setOrigin(0).setDepth(8000);
        this.tweens.add({ targets: flash, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
      },
    });
  }

  create(): void {
    this.scene.launch(SCENE_KEYS.CRT_OVERLAY);

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
