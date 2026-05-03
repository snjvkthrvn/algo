/**
 * PauseOverlayScene — global pause menu invoked from overworld scenes via ESC.
 * Pauses the parent scene so animations/timers freeze while the player is here.
 * Options: RESUME, SETTINGS, SAVE & QUIT TO TITLE.
 */

import Phaser from 'phaser';
import { COLORS, FONTS, SCENE_KEYS } from '../config/constants';
import { audioManager } from '../core/AudioManager';
import { gameState } from '../core/GameStateManager';
import { saveLoadManager } from '../core/SaveLoadManager';
import { TransitionManager } from '../core/TransitionManager';
import { moveMenuSelection } from '../input/MenuNavigation';
import { drawPanel } from '../ui/panel';

export const PAUSE_OVERLAY_KEY = 'PauseOverlayScene';

interface LaunchData {
  parentSceneKey: string;
}

interface MenuItem {
  text: string;
  callback: () => void;
}

export class PauseOverlayScene extends Phaser.Scene {
  private parentSceneKey: string = '';
  private menuItems: MenuItem[] = [];
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private closeSettingsModal: (() => void) | null = null;

  private readonly onUp = () => this.move(-1);
  private readonly onDown = () => this.move(1);
  private readonly onActivate = () => this.activate();
  private readonly onEsc = () => {
    if (this.closeSettingsModal) {
      this.closeSettingsModal();
      return;
    }
    this.resumeParent();
  };

  constructor() {
    super({ key: PAUSE_OVERLAY_KEY });
  }

  init(data: LaunchData): void {
    this.parentSceneKey = data.parentSceneKey;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0).setDepth(0);

    const PANEL_W = 416;
    const PANEL_H = 312;
    const panelX = Math.round(width / 2 - PANEL_W / 2);
    const panelY = Math.round(height / 2 - PANEL_H / 2);
    drawPanel(this, panelX, panelY, PANEL_W, PANEL_H, {
      depth: 1,
      scrollFactor: 0,
      inner: 0x346856,
    });

    this.add.text(width / 2, panelY + 32, 'PAUSED', {
      fontSize: '20px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    }).setOrigin(0.5, 0).setDepth(2);

    this.add.text(width / 2, panelY + 72, 'The world holds its breath.', {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: '#346856',
    }).setOrigin(0.5, 0).setDepth(2);

    this.menuItems = [
      { text: 'RESUME', callback: () => this.resumeParent() },
      { text: 'SETTINGS', callback: () => this.openSettings() },
      { text: 'SAVE & QUIT TO TITLE', callback: () => this.saveAndQuit() },
    ];

    this.menuTexts = this.menuItems.map((item, i) =>
      this.add.text(width / 2, panelY + 132 + i * 44, item.text, {
        fontSize: '12px',
        fontFamily: FONTS.RETRO,
        color: '#346856',
      })
        .setOrigin(0.5)
        .setDepth(2)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => { this.selectedIndex = i; this.render(); })
        .on('pointerdown', () => { this.selectedIndex = i; this.activate(); }),
    );

    this.selectedIndex = 0;
    this.render();
    this.registerKeys();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.closeSettingsModal?.();
      this.unregisterKeys();
    });
  }

  private registerKeys(): void {
    const kbd = this.input.keyboard;
    kbd?.on('keydown-UP', this.onUp);
    kbd?.on('keydown-W', this.onUp);
    kbd?.on('keydown-DOWN', this.onDown);
    kbd?.on('keydown-S', this.onDown);
    kbd?.on('keydown-ENTER', this.onActivate);
    kbd?.on('keydown-SPACE', this.onActivate);
    kbd?.on('keydown-ESC', this.onEsc);
  }

  private unregisterKeys(): void {
    const kbd = this.input.keyboard;
    kbd?.off('keydown-UP', this.onUp);
    kbd?.off('keydown-W', this.onUp);
    kbd?.off('keydown-DOWN', this.onDown);
    kbd?.off('keydown-S', this.onDown);
    kbd?.off('keydown-ENTER', this.onActivate);
    kbd?.off('keydown-SPACE', this.onActivate);
    kbd?.off('keydown-ESC', this.onEsc);
  }

  private move(direction: -1 | 1): void {
    if (this.closeSettingsModal) return;
    this.selectedIndex = moveMenuSelection(this.selectedIndex, direction, this.menuItems.length);
    audioManager.playTone(220, 50, 'square');
    this.render();
  }

  private activate(): void {
    if (this.closeSettingsModal) {
      this.closeSettingsModal();
      return;
    }
    audioManager.playClickTone();
    this.menuItems[this.selectedIndex]?.callback();
  }

  private render(): void {
    this.menuTexts.forEach((text, i) => {
      const selected = i === this.selectedIndex;
      text.setText(`${selected ? '> ' : '  '}${this.menuItems[i].text}`);
      text.setColor(selected ? '#081820' : '#346856');
      text.setBackgroundColor(selected ? '#e0f8d0' : 'transparent');
      text.setPadding(selected ? 6 : 0, selected ? 4 : 0, selected ? 6 : 0, selected ? 4 : 0);
    });
  }

  private resumeParent(): void {
    this.scene.resume(this.parentSceneKey);
    this.scene.stop();
  }

  private saveAndQuit(): void {
    saveLoadManager.save();
    // Stop the paused parent first so it tears down. Then fade-transition this
    // scene to the menu — TransitionManager.fade ends with scene.start(MENU),
    // which automatically stops PauseOverlayScene as part of the swap.
    this.scene.stop(this.parentSceneKey);
    TransitionManager.fade(this, SCENE_KEYS.MENU, undefined, 400);
  }

  private openSettings(): void {
    if (this.closeSettingsModal) return;

    const { width, height } = this.cameras.main;
    const PANEL_W = 416;
    const PANEL_H = 280;
    const panelX = Math.round(width / 2 - PANEL_W / 2);
    const panelY = Math.round(height / 2 - PANEL_H / 2);

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setDepth(100);
    const panel = drawPanel(this, panelX, panelY, PANEL_W, PANEL_H, {
      depth: 101,
      scrollFactor: 0,
      inner: 0x346856,
    });

    const title = this.add.text(width / 2, panelY + 32, 'SETTINGS', {
      fontSize: '16px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    }).setOrigin(0.5, 0).setDepth(102);

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
      }).setDepth(102),
    );

    const barGraphics = [this.add.graphics().setDepth(102), this.add.graphics().setDepth(102)];
    const pctTexts = [
      this.add.text(BAR_X + BAR_W + 12, ROW_Y[0], '', { fontSize: '10px', fontFamily: FONTS.RETRO, color: '#081820' }).setDepth(102),
      this.add.text(BAR_X + BAR_W + 12, ROW_Y[1], '', { fontSize: '10px', fontFamily: FONTS.RETRO, color: '#081820' }).setDepth(102),
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
      gameState.updateSettings({ musicVolume: volumes[0] / 100, sfxVolume: volumes[1] / 100 });
      audioManager.applyVolumeSettings();
      redrawSliders();
    };

    const hint = this.add.text(width / 2, panelY + 192, 'Tab switch | arrows adjust', {
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
    const onTab = () => { focusedRow = focusedRow === 0 ? 1 : 0; redrawSliders(); };

    this.input.keyboard?.on('keydown-LEFT', onLeft);
    this.input.keyboard?.on('keydown-RIGHT', onRight);
    this.input.keyboard?.on('keydown-TAB', onTab);

    const preventBrowserDefault = (e: KeyboardEvent) => {
      if (['Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', preventBrowserDefault);

    const allObjects = [overlay, panel, title, hint, closeBtn, ...rowLabelTexts, ...barGraphics, ...pctTexts];

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
