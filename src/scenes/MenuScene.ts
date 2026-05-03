/**
 * MenuScene - Title screen with New Game / Continue / Settings.
 */

import Phaser from 'phaser';
import { VISUAL_REVAMP_KEYS } from '../config/assets';
import { COLORS, FONTS, REGION_DISPLAY_NAMES, SCENE_BY_REGION, SCENE_KEYS } from '../config/constants';
import { saveLoadManager } from '../core/SaveLoadManager';
import { gameState } from '../core/GameStateManager';
import { audioManager } from '../core/AudioManager';
import { TransitionManager } from '../core/TransitionManager';
import { moveMenuSelection } from '../input/MenuNavigation';
import { drawPanel } from '../ui/panel';

// Persists for the entire browser session — scramble plays once only
let menuTitleAssembled = false;

const GLYPHS = '0123456789#%&*!?<>=+~^@$';

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  speed: number;
  radius: number;
}

interface MenuItem {
  text: string;
  callback: () => void;
}

export class MenuScene extends Phaser.Scene {
  private stars: Star[] = [];
  private starGraphics!: Phaser.GameObjects.Graphics;
  private menuItems: MenuItem[] = [];
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private saveSummaryText: Phaser.GameObjects.Text | null = null;
  private selectedMenuIndex = 0;
  private closeSettingsModal: (() => void) | null = null;
  private closeConfirmModal: (() => void) | null = null;

  private readonly onMenuUp = () => this.moveSelectedMenuItem(-1);
  private readonly onMenuW = () => this.moveSelectedMenuItem(-1);
  private readonly onMenuDown = () => this.moveSelectedMenuItem(1);
  private readonly onMenuS = () => this.moveSelectedMenuItem(1);
  private readonly onMenuActivate = () => this.activateSelectedMenuItem();
  private readonly onMenuEsc = () => {
    if (this.closeConfirmModal) {
      this.closeConfirmModal();
      return;
    }
    this.closeSettingsModal?.();
  };

  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.selectedMenuIndex = 0;
    this.saveSummaryText = null;
    audioManager.setScene(this);

    // Fade in
    const fadeIn = this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0).setDepth(10000);
    this.tweens.add({ targets: fadeIn, alpha: 0, duration: 500, onComplete: () => fadeIn.destroy() });

    this.createTitleBackdrop(width, height);

    // Pixel ornament above title
    const ox = Math.round(width / 2);
    const oy = 152;
    const ps = 4;
    const orn = this.add.graphics();
    orn.fillStyle(0xe0f8d0, 0.9);
    orn.fillRect(ox - ps / 2, oy - ps / 2, ps, ps);
    orn.fillStyle(0x88c070, 0.75);
    orn.fillRect(ox - ps / 2 - ps * 2, oy - ps / 2, ps, ps);
    orn.fillRect(ox - ps / 2 + ps * 2, oy - ps / 2, ps, ps);
    orn.fillRect(ox - ps / 2, oy - ps / 2 - ps * 2, ps, ps);
    orn.fillRect(ox - ps / 2, oy - ps / 2 + ps * 2, ps, ps);

    const titleText = this.add.text(width / 2, 184, menuTitleAssembled ? 'ALGORITHMIA' : '', {
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

    const line = this.add.graphics();
    line.lineStyle(2, 0x88c070, 0.8);
    line.beginPath();
    line.moveTo(width / 2 - 200, 264);
    line.lineTo(width / 2 + 200, 264);
    line.strokePath();

    // Menu items — built but rendered invisible for slide-up entrance
    this.menuItems = [{ text: 'NEW GAME', callback: () => this.startNewGame() }];
    if (saveLoadManager.hasSave()) {
      this.menuItems.push({ text: 'CONTINUE', callback: () => this.continueGame() });
    }
    this.menuItems.push({ text: 'SETTINGS', callback: () => this.openSettings() });

    this.menuTexts = [];
    this.menuItems.forEach((item, index) => {
      const finalY = 320 + index * 48;
      const text = this.add.text(width / 2, menuTitleAssembled ? finalY : finalY + 32, item.text, {
        fontSize: '16px',
        fontFamily: FONTS.RETRO,
        color: '#88c070',
      })
        .setOrigin(0.5)
        .setAlpha(menuTitleAssembled ? 1 : 0)
        .setInteractive({ useHandCursor: true });

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
    this.createSaveSummary(width);
    this.registerKeyboardMenuControls();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.closeSettingsModal?.();
      this.closeConfirmModal?.();
      this.unregisterKeyboardMenuControls();
    });

    this.add.text(width - 24, height - 24, 'v1.0.0', {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: '#7a7aaa',
    }).setOrigin(1, 1);

    this.add.text(width / 2, height - 56, 'A world of algorithms awaits', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: '#7a7aaa',
    }).setOrigin(0.5);

    if (!menuTitleAssembled) {
      this.animateTitleAssembly(titleText);
    }
  }

  private createTitleBackdrop(width: number, height: number): void {
    const bg = this.add.image(width / 2, height / 2, VISUAL_REVAMP_KEYS.TITLE_BG)
      .setOrigin(0.5)
      .setDepth(-4);
    const source = bg.texture.getSourceImage() as HTMLImageElement;
    const coverScale = Math.max(width / source.width, height / source.height);
    bg.setScale(coverScale);

    this.add.rectangle(0, 0, width, height, 0x081820, 0.34)
      .setOrigin(0)
      .setDepth(-3);
    this.add.rectangle(0, 0, width, 360, 0x081820, 0.22)
      .setOrigin(0)
      .setDepth(-2);

    this.createStarfield(width, height);
    this.starGraphics.setDepth(-1);
  }

  update(_time: number, _delta: number): void {
    const { width, height } = this.cameras.main;
    this.starGraphics.clear();
    for (const star of this.stars) {
      star.x += star.vx;
      star.y += star.vy;
      if (star.x < 0) star.x += width;
      if (star.x > width) star.x -= width;
      if (star.y < 0) star.y += height;
      if (star.y > height) star.y -= height;

      star.alpha += Math.sin(this.time.now * star.speed * 0.001) * 0.01;
      star.alpha = Math.max(0.1, Math.min(0.8, star.alpha));
      this.starGraphics.fillStyle(0xffffff, star.alpha);
      this.starGraphics.fillCircle(star.x, star.y, star.radius);
    }
  }

  private createStarfield(width: number, height: number): void {
    this.starGraphics = this.add.graphics();
    this.stars = [];

    // Three layers: small faint, small mid, large bright
    const layers: { count: number; radius: number; speed: number; maxAlpha: number }[] = [
      { count: 60, radius: 1, speed: 0.5, maxAlpha: 0.4 },
      { count: 30, radius: 1, speed: 1.2, maxAlpha: 0.65 },
      { count: 10, radius: 2, speed: 2.0, maxAlpha: 0.85 },
    ];

    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const driftSpeed = 0.02 + Math.random() * 0.04;
        this.stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * driftSpeed,
          vy: Math.sin(angle) * driftSpeed * 0.4,
          alpha: Math.random() * layer.maxAlpha + 0.1,
          speed: Math.random() * (layer.speed - 0.3) + 0.3,
          radius: layer.radius,
        });
      }
    }
  }

  private animateTitleAssembly(titleText: Phaser.GameObjects.Text): void {
    const FINAL = 'ALGORITHMIA';
    const displayed: string[] = new Array(FINAL.length).fill(' ');
    const resolved: boolean[] = new Array(FINAL.length).fill(false);

    const redraw = () => titleText.setText(displayed.join(''));

    FINAL.split('').forEach((finalChar, i) => {
      this.time.delayedCall(i * 72, () => {
        // 8 scramble ticks at 40ms each
        const scramble = this.time.addEvent({
          delay: 40,
          repeat: 7,
          callback: () => {
            displayed[i] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            redraw();
          },
        });

        this.time.delayedCall(40 * 9, () => {
          scramble.remove();
          displayed[i] = finalChar;
          resolved[i] = true;
          redraw();

          if (resolved.every(Boolean)) {
            menuTitleAssembled = true;
            this.slideInMenuItems();
          }
        });
      });
    });

    redraw();
  }

  private slideInMenuItems(): void {
    this.menuTexts.forEach((text, i) => {
      const finalY = 320 + i * 48;
      this.tweens.add({
        targets: text,
        y: finalY,
        alpha: 1,
        duration: 320,
        delay: i * 70,
        ease: 'Expo.easeOut',
      });
    });

    if (this.saveSummaryText) {
      this.tweens.add({
        targets: this.saveSummaryText,
        y: 478,
        alpha: 1,
        duration: 320,
        delay: this.menuTexts.length * 70 + 90,
        ease: 'Expo.easeOut',
      });
    }
  }

  private createSaveSummary(width: number): void {
    const savedState = saveLoadManager.getSavedState();
    if (!savedState) return;

    const regionName = REGION_DISPLAY_NAMES[savedState.player.region] ?? savedState.player.region.split('_').join(' ');
    const solvedCount = Object.keys(savedState.puzzleResults).length;
    const solvedLabel = solvedCount === 1 ? 'PUZZLE' : 'PUZZLES';
    const finalY = 478;

    this.saveSummaryText = this.add.text(width / 2, menuTitleAssembled ? finalY : finalY + 28, `CONTINUE: ${regionName.toUpperCase()} | ${solvedCount} ${solvedLabel}`, {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
      backgroundColor: '#081820',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setAlpha(menuTitleAssembled ? 1 : 0);
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
    if (this.closeSettingsModal || this.closeConfirmModal) return;
    this.selectedMenuIndex = moveMenuSelection(this.selectedMenuIndex, direction, this.menuItems.length);
    audioManager.playTone(220, 50, 'square');
    this.renderMenuSelection();
  }

  private setSelectedMenuIndex(index: number): void {
    this.selectedMenuIndex = index;
    this.renderMenuSelection();
  }

  private activateSelectedMenuItem(): void {
    if (this.closeConfirmModal) return;
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
    if (saveLoadManager.hasSave()) {
      this.openOverwriteConfirm();
      return;
    }
    this.beginNewGame();
  }

  private beginNewGame(): void {
    gameState.resetState();
    saveLoadManager.deleteSave();
    TransitionManager.swirl(this, SCENE_KEYS.PROLOGUE);
  }

  private openOverwriteConfirm(): void {
    if (this.closeConfirmModal) return;

    const { width, height } = this.cameras.main;
    const PANEL_W = 480;
    const PANEL_H = 220;
    const panelX = Math.round(width / 2 - PANEL_W / 2);
    const panelY = Math.round(height / 2 - PANEL_H / 2);

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0).setDepth(100);
    const panel = drawPanel(this, panelX, panelY, PANEL_W, PANEL_H, {
      depth: 101,
      scrollFactor: 0,
      inner: 0x346856,
    });

    const title = this.add.text(width / 2, panelY + 32, 'OVERWRITE SAVE?', {
      fontSize: '14px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    }).setOrigin(0.5, 0).setDepth(102);

    const body = this.add.text(width / 2, panelY + 72, 'Starting a new game will erase\nyour existing save permanently.', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5, 0).setDepth(102);

    const choices = ['CANCEL', 'OVERWRITE'];
    let selected = 0;

    const choiceTexts = choices.map((label, i) =>
      this.add.text(panelX + (i === 0 ? 96 : PANEL_W - 96), panelY + PANEL_H - 56, label, {
        fontSize: '12px',
        fontFamily: FONTS.RETRO,
        color: '#081820',
      }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true }),
    );

    const renderSelection = () => {
      choiceTexts.forEach((text, i) => {
        const isSelected = i === selected;
        text.setText(`${isSelected ? '> ' : '  '}${choices[i]}${isSelected ? ' <' : '  '}`);
        text.setColor(isSelected ? '#081820' : '#346856');
        text.setBackgroundColor(isSelected ? '#e0f8d0' : 'transparent');
        text.setPadding(isSelected ? 6 : 0, isSelected ? 4 : 0, isSelected ? 6 : 0, isSelected ? 4 : 0);
      });
    };
    renderSelection();

    const move = (dir: -1 | 1) => {
      selected = (selected + dir + choices.length) % choices.length;
      audioManager.playTone(220, 50, 'square');
      renderSelection();
    };
    const onLeft = () => move(-1);
    const onRight = () => move(1);
    const onActivate = () => {
      audioManager.playClickTone();
      const wasOverwrite = selected === 1;
      this.closeConfirmModal?.();
      if (wasOverwrite) this.beginNewGame();
    };

    this.input.keyboard?.on('keydown-LEFT', onLeft);
    this.input.keyboard?.on('keydown-RIGHT', onRight);
    this.input.keyboard?.on('keydown-A', onLeft);
    this.input.keyboard?.on('keydown-D', onRight);
    this.input.keyboard?.on('keydown-ENTER', onActivate);
    this.input.keyboard?.on('keydown-SPACE', onActivate);

    choiceTexts.forEach((text, i) => {
      text.on('pointerover', () => { selected = i; renderSelection(); });
      text.on('pointerdown', () => { selected = i; onActivate(); });
    });

    const allObjects = [overlay, panel, title, body, ...choiceTexts];

    this.closeConfirmModal = () => {
      this.input.keyboard?.off('keydown-LEFT', onLeft);
      this.input.keyboard?.off('keydown-RIGHT', onRight);
      this.input.keyboard?.off('keydown-A', onLeft);
      this.input.keyboard?.off('keydown-D', onRight);
      this.input.keyboard?.off('keydown-ENTER', onActivate);
      this.input.keyboard?.off('keydown-SPACE', onActivate);
      for (const obj of allObjects) obj.destroy();
      this.closeConfirmModal = null;
    };
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
      return;
    }

    this.showMenuNotice('SAVE COULD NOT BE LOADED');
  }

  private showMenuNotice(text: string): void {
    const { width, height } = this.cameras.main;
    const notice = this.add.text(width / 2, height - 96, text, {
      fontSize: '9px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 10, y: 7 },
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: notice,
      alpha: 0,
      y: notice.y - 10,
      duration: 220,
      delay: 1400,
      onComplete: () => notice.destroy(),
    });
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

    const settingsTitle = this.add.text(width / 2, panelY + 32, 'SETTINGS', {
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

    const hintText = this.add.text(width / 2, panelY + 192, 'Tab switch | arrows adjust', {
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
      if (['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', preventBrowserDefault);

    const allObjects = [overlay, panel, settingsTitle, hintText, closeBtn, ...rowLabelTexts, ...barGraphics, ...pctTexts];

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
