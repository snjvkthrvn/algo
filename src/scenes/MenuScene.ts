/**
 * MenuScene - Title screen with New Game / Continue / Settings.
 */

import Phaser from 'phaser';
import { COLORS, FONTS, SCENE_BY_REGION, SCENE_KEYS } from '../config/constants';
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

  private readonly onMenuUp = () => this.moveSelectedMenuItem(-1);
  private readonly onMenuW = () => this.moveSelectedMenuItem(-1);
  private readonly onMenuDown = () => this.moveSelectedMenuItem(1);
  private readonly onMenuS = () => this.moveSelectedMenuItem(1);
  private readonly onMenuActivate = () => this.activateSelectedMenuItem();
  private readonly onMenuEsc = () => this.closeSettingsModal?.();

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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.closeSettingsModal?.();
      this.unregisterKeyboardMenuControls();
    });

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
    const kbd = this.input.keyboard;
    kbd?.on('keydown-UP', this.onMenuUp);
    kbd?.on('keydown-W', this.onMenuW);
    kbd?.on('keydown-DOWN', this.onMenuDown);
    kbd?.on('keydown-S', this.onMenuS);
    kbd?.on('keydown-ENTER', this.onMenuActivate);
    kbd?.on('keydown-SPACE', this.onMenuActivate);
    kbd?.on('keydown-ESC', this.onMenuEsc);
  }

  private unregisterKeyboardMenuControls(): void {
    const kbd = this.input.keyboard;
    kbd?.off('keydown-UP', this.onMenuUp);
    kbd?.off('keydown-W', this.onMenuW);
    kbd?.off('keydown-DOWN', this.onMenuDown);
    kbd?.off('keydown-S', this.onMenuS);
    kbd?.off('keydown-ENTER', this.onMenuActivate);
    kbd?.off('keydown-SPACE', this.onMenuActivate);
    kbd?.off('keydown-ESC', this.onMenuEsc);
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
      const sceneKey = SCENE_BY_REGION[state.player.region];
      if (!sceneKey) {
        console.warn(`[Continue] Unknown saved region "${state.player.region}", falling back to Prologue`);
      }
      TransitionManager.fade(this, sceneKey ?? SCENE_KEYS.PROLOGUE, {
        spawnX: state.player.x,
        spawnY: state.player.y,
      });
    }
  }

  private openSettings(): void {
    if (this.closeSettingsModal) return;

    const { width, height } = this.cameras.main;

    const PANEL_W = 416;
    const PANEL_H = 280;
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

    // Slider state — stored as 0–100 integers for display, converted to 0–1 when saving
    const volumes = [
      Math.round(gameState.getSettings().musicVolume * 100),
      Math.round(gameState.getSettings().sfxVolume * 100),
    ];
    let focusedRow = 0;

    const BAR_X = panelX + 168;
    const BAR_W = 140;
    const BAR_H = 10;
    const ROW_Y = [panelY + 104, panelY + 152];
    const LABELS = ['Music Volume', 'SFX Volume'];

    const rowLabelTexts = LABELS.map((label, i) =>
      this.add.text(panelX + 32, ROW_Y[i], label, {
        fontSize: '10px',
        fontFamily: FONTS.RETRO,
        color: '#081820',
      }).setDepth(102)
    );

    const barGraphics = [
      this.add.graphics().setDepth(102),
      this.add.graphics().setDepth(102),
    ];
    const pctTexts = [
      this.add.text(BAR_X + BAR_W + 12, ROW_Y[0], '', {
        fontSize: '10px', fontFamily: FONTS.RETRO, color: '#081820',
      }).setDepth(102),
      this.add.text(BAR_X + BAR_W + 12, ROW_Y[1], '', {
        fontSize: '10px', fontFamily: FONTS.RETRO, color: '#081820',
      }).setDepth(102),
    ];

    const redrawSliders = () => {
      for (let i = 0; i < 2; i++) {
        const g = barGraphics[i];
        g.clear();
        const fillColor = i === focusedRow ? COLORS.CYAN_GLOW : COLORS.FRAME_BORDER;
        const fillW = Math.round(BAR_W * volumes[i] / 100);
        g.fillStyle(fillColor, 1);
        g.fillRect(BAR_X, ROW_Y[i] - 1, fillW, BAR_H);
        g.fillStyle(COLORS.FRAME_BORDER_DARK, 1);
        g.fillRect(BAR_X + fillW, ROW_Y[i] - 1, BAR_W - fillW, BAR_H);
        g.lineStyle(1, COLORS.FRAME_BORDER_LIGHT, 0.8);
        g.strokeRect(BAR_X, ROW_Y[i] - 1, BAR_W, BAR_H);
        pctTexts[i].setText(`${volumes[i]}%`);
      }
    };

    redrawSliders();

    const adjust = (delta: number) => {
      volumes[focusedRow] = Phaser.Math.Clamp(volumes[focusedRow] + delta, 0, 100);
      gameState.updateSettings({
        musicVolume: volumes[0] / 100,
        sfxVolume: volumes[1] / 100,
      });
      audioManager.applyVolumeSettings();
      redrawSliders();
    };

    const hintText = this.add.text(width / 2, panelY + 192, 'Tab to switch  ◄ ► to adjust', {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: '#4a5568',
    }).setOrigin(0.5).setDepth(102);

    const closeBtn = this.add.text(width / 2, panelY + PANEL_H - 36, 'CLOSE', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    }).setOrigin(0.5, 0).setDepth(102).setInteractive({ useHandCursor: true });

    const onLeft = () => adjust(-10);
    const onRight = () => adjust(10);
    const onTab = () => {
      focusedRow = focusedRow === 0 ? 1 : 0;
      redrawSliders();
    };

    this.input.keyboard?.on('keydown-LEFT', onLeft);
    this.input.keyboard?.on('keydown-RIGHT', onRight);
    this.input.keyboard?.on('keydown-TAB', onTab);

    const preventBrowserDefault = (e: KeyboardEvent) => {
      if (['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', preventBrowserDefault);

    const allObjects = [
      overlay, panel, settingsTitle, hintText, closeBtn,
      ...rowLabelTexts, ...barGraphics, ...pctTexts,
    ];

    this.closeSettingsModal = () => {
      this.input.keyboard?.off('keydown-LEFT', onLeft);
      this.input.keyboard?.off('keydown-RIGHT', onRight);
      this.input.keyboard?.off('keydown-TAB', onTab);
      window.removeEventListener('keydown', preventBrowserDefault);
      for (const obj of allObjects) obj.destroy();
      this.closeSettingsModal = null;
    };

    closeBtn.on('pointerdown', () => this.closeSettingsModal?.());
  }
}
