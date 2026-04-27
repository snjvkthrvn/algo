/**
 * MenuScene - Title screen with New Game / Continue / Settings.
 */

import Phaser from 'phaser';
import { FONTS, SCENE_KEYS } from '../config/constants';
import { saveLoadManager } from '../core/SaveLoadManager';
import { gameState } from '../core/GameStateManager';
import { audioManager } from '../core/AudioManager';
import { TransitionManager } from '../core/TransitionManager';
import { moveMenuSelection } from '../input/MenuNavigation';
import { drawPanel } from '../ui/panel';

interface MenuItem {
  text: string;
  callback: () => void;
}

export class MenuScene extends Phaser.Scene {
  private stars: { x: number; y: number; alpha: number; speed: number }[] = [];
  private starGraphics!: Phaser.GameObjects.Graphics;
  private menuItems: MenuItem[] = [];
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private selectedMenuIndex = 0;
  private closeSettingsModal: (() => void) | null = null;

  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    audioManager.setScene(this);

    // Fade in via tween overlay (camera fadeIn is unreliable)
    const fadeIn = this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0).setDepth(10000);
    this.tweens.add({
      targets: fadeIn,
      alpha: 0,
      duration: 500,
      onComplete: () => fadeIn.destroy(),
    });

    // Starfield background
    this.createStarfield(width, height);

    // Title (positions snapped to an 8-pixel grid for crisp rendering).
    this.add.text(width / 2, 184, 'ALGORITHMIA', {
      fontSize: '40px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
      stroke: '#081820',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, 232, 'THE PATH OF LOGIC', {
      fontSize: '16px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
      stroke: '#081820',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Decorative line
    const line = this.add.graphics();
    line.lineStyle(2, 0x88c070, 0.8);
    line.beginPath();
    line.moveTo(width / 2 - 200, 264);
    line.lineTo(width / 2 + 200, 264);
    line.strokePath();

    // Menu options
    this.menuItems = [
      { text: 'NEW GAME', callback: () => this.startNewGame() },
    ];

    if (saveLoadManager.hasSave()) {
      this.menuItems.push({ text: 'CONTINUE', callback: () => this.continueGame() });
    }

    this.menuItems.push({ text: 'SETTINGS', callback: () => this.openSettings() });

    this.menuTexts = [];
    this.menuItems.forEach((item, index) => {
      const y = 320 + index * 48;
      const text = this.add.text(width / 2, y, item.text, {
        fontSize: '16px',
        fontFamily: FONTS.RETRO,
        color: '#88c070',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      text.on('pointerover', () => {
        this.setSelectedMenuIndex(index);
        this.tweens.add({ targets: text, scale: 1.1, duration: 100 });
      });

      text.on('pointerout', () => {
        this.tweens.add({ targets: text, scale: 1, duration: 100 });
      });

      text.on('pointerdown', () => {
        audioManager.playClickTone();
        this.activateSelectedMenuItem();
      });

      this.menuTexts.push(text);
    });
    this.renderMenuSelection();
    this.registerKeyboardMenuControls();

    // Version text — slightly higher contrast so it's legible without shouting.
    this.add.text(width - 24, height - 24, 'v1.0.0', {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: '#7a7aaa',
    }).setOrigin(1, 1);

    // Subtitle
    this.add.text(width / 2, height - 56, 'A world of algorithms awaits', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: '#7a7aaa',
    }).setOrigin(0.5);
  }

  update(): void {
    // Animate starfield
    this.starGraphics.clear();
    for (const star of this.stars) {
      star.alpha += Math.sin(Date.now() * star.speed * 0.001) * 0.01;
      star.alpha = Math.max(0.1, Math.min(0.8, star.alpha));
      this.starGraphics.fillStyle(0xffffff, star.alpha);
      this.starGraphics.fillCircle(star.x, star.y, 1);
    }
  }

  private createStarfield(width: number, height: number): void {
    this.starGraphics = this.add.graphics();
    this.stars = [];

    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        alpha: Math.random() * 0.6 + 0.1,
        speed: Math.random() * 2 + 0.5,
      });
    }
  }

  private registerKeyboardMenuControls(): void {
    this.input.keyboard?.on('keydown-UP', () => this.moveSelectedMenuItem(-1));
    this.input.keyboard?.on('keydown-W', () => this.moveSelectedMenuItem(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSelectedMenuItem(1));
    this.input.keyboard?.on('keydown-S', () => this.moveSelectedMenuItem(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.activateSelectedMenuItem());
    this.input.keyboard?.on('keydown-SPACE', () => this.activateSelectedMenuItem());
    this.input.keyboard?.on('keydown-ESC', () => this.closeSettingsModal?.());
  }

  private moveSelectedMenuItem(direction: -1 | 1): void {
    if (this.closeSettingsModal) return;
    this.selectedMenuIndex = moveMenuSelection(this.selectedMenuIndex, direction, this.menuItems.length);
    audioManager.playTone(220, 50, 'square');
    this.renderMenuSelection();
  }

  private setSelectedMenuIndex(index: number): void {
    this.selectedMenuIndex = index;
    this.renderMenuSelection();
  }

  private activateSelectedMenuItem(): void {
    if (this.closeSettingsModal) {
      this.closeSettingsModal();
      return;
    }

    const item = this.menuItems[this.selectedMenuIndex];
    if (!item) return;
    audioManager.playClickTone();
    item.callback();
  }

  private renderMenuSelection(): void {
    this.menuTexts.forEach((text, index) => {
      const selected = index === this.selectedMenuIndex;
      text.setText(`${selected ? '> ' : '  '}${this.menuItems[index].text}`);
      text.setColor(selected ? '#081820' : '#88c070');
      text.setBackgroundColor(selected ? '#e0f8d0' : 'transparent');
      text.setPadding(selected ? 6 : 0, selected ? 4 : 0, selected ? 6 : 0, selected ? 4 : 0);
    });
  }

  private startNewGame(): void {
    gameState.resetState();
    TransitionManager.swirl(this, SCENE_KEYS.PROLOGUE);
  }

  private continueGame(): void {
    if (saveLoadManager.load()) {
      const state = gameState.getState();
      // Determine which scene to load based on save state
      TransitionManager.fade(this, SCENE_KEYS.PROLOGUE, {
        spawnX: state.player.x,
        spawnY: state.player.y,
      });
    }
  }

  private openSettings(): void {
    if (this.closeSettingsModal) return;

    const { width, height } = this.cameras.main;

    // Modal geometry on an 8-pixel grid.
    const PANEL_W = 416;
    const PANEL_H = 256;
    const panelX = Math.round(width / 2 - PANEL_W / 2);
    const panelY = Math.round(height / 2 - PANEL_H / 2);

    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0)
      .setDepth(100);

    const panel = drawPanel(this, panelX, panelY, PANEL_W, PANEL_H, {
      depth: 101,
      scrollFactor: 0,
      inner: 0x346856,
    });

    const settingsTitle = this.add.text(width / 2, panelY + 32, 'SETTINGS', {
      fontSize: '16px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    }).setOrigin(0.5, 0).setDepth(102);

    const musicLabel = this.add.text(panelX + 32, panelY + 96, 'Music Volume', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    }).setDepth(102);

    const sfxLabel = this.add.text(panelX + 32, panelY + 136, 'SFX Volume', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    }).setDepth(102);

    const closeBtn = this.add.text(width / 2, panelY + PANEL_H - 40, 'CLOSE', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    }).setOrigin(0.5, 0).setDepth(102).setInteractive({ useHandCursor: true });

    this.closeSettingsModal = () => {
      overlay.destroy();
      panel.destroy();
      settingsTitle.destroy();
      musicLabel.destroy();
      sfxLabel.destroy();
      closeBtn.destroy();
      this.closeSettingsModal = null;
    };

    closeBtn.on('pointerdown', () => this.closeSettingsModal?.());
  }
}
