/**
 * EndGameScene - Closure scene played after Boss Protocol Omega falls.
 *
 * Three beats:
 *   1. Triumph hold — title assembles, Bit-Core radiates
 *   2. Journey ledger — puzzles solved, time, stars, hints, shards
 *   3. Credits + return to menu
 *
 * The scene only fires once via the `endgame_pending` flag set by ProgressionSystem.
 * After it plays, `game_complete` is set so the player can replay the Core or back out
 * without retriggering the ending.
 */

import Phaser from 'phaser';
import { COLORS, COLOR_HEX, FONTS, SCENE_KEYS } from '../config/constants';
import { gameState } from '../core/GameStateManager';
import { audioManager } from '../core/AudioManager';
import { saveLoadManager } from '../core/SaveLoadManager';
import { TransitionManager } from '../core/TransitionManager';
import { drawPanel } from '../ui/panel';
import { a11yManager } from '../core/A11yManager';

interface JourneyLedger {
  puzzlesSolved: number;
  totalStars: number;
  maxStars: number;
  totalTimeSec: number;
  totalHints: number;
  shardCount: number;
  bitStage: string;
}

export class EndGameScene extends Phaser.Scene {
  private starField: Phaser.GameObjects.Arc[] = [];
  private isExiting = false;

  constructor() {
    super({ key: SCENE_KEYS.END_GAME });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    audioManager.setScene(this);

    // Mark as complete so subsequent loads don't retrigger and the player can return freely.
    gameState.setFlag('game_complete', true);
    gameState.setFlag('endgame_pending', false);
    saveLoadManager.save();

    a11yManager.announce(
      'You have completed Algorithmia. The path of logic resolves.',
      true
    );

    this.cameras.main.setBackgroundColor(0x05050f);
    this.createStarField(width, height);

    // Soft cyan-purple core glow centered above title — visual echo of Bit's CORE form.
    const coreGlow = this.add.graphics().setDepth(1);
    coreGlow.fillStyle(COLORS.CYAN_GLOW, 0.06);
    coreGlow.fillCircle(width / 2, 200, 200);
    coreGlow.fillStyle(COLORS.PURPLE_CRYSTAL, 0.08);
    coreGlow.fillCircle(width / 2, 200, 120);
    coreGlow.fillStyle(0xfbbf24, 0.22);
    coreGlow.fillCircle(width / 2, 200, 36);
    this.tweens.add({
      targets: coreGlow,
      alpha: 0.7,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const fadeIn = this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0).setDepth(10000);
    this.tweens.add({
      targets: fadeIn,
      alpha: 0,
      duration: 1400,
      onComplete: () => fadeIn.destroy(),
    });

    this.createTitle(width);
    this.createSubtitle(width);
    this.scheduleLedger(width);
    this.scheduleCredits(width, height);
    this.scheduleContinueButton(width, height);
  }

  update(_time: number, delta: number): void {
    const dt = delta / 16.67;
    for (const star of this.starField) {
      star.y += 0.06 * dt;
      if (star.y > this.cameras.main.height + 4) {
        star.y = -4;
        star.x = Math.random() * this.cameras.main.width;
      }
    }
  }

  private createStarField(width: number, height: number): void {
    for (let i = 0; i < 110; i++) {
      const star = this.add.circle(
        Math.random() * width,
        Math.random() * height,
        Math.random() < 0.85 ? 1 : 2,
        0xffffff,
        Math.random() * 0.6 + 0.15
      ).setDepth(0);
      this.starField.push(star);
    }
  }

  private createTitle(width: number): void {
    const title = this.add.text(width / 2, 156, 'THE PATH RESOLVES', {
      fontSize: '32px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
      stroke: '#081820',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(5);

    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 1200,
      delay: 400,
      ease: 'Power2.easeOut',
    });

    this.tweens.add({
      targets: title,
      scale: 1.04,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 1600,
    });
  }

  private createSubtitle(width: number): void {
    const subtitle = this.add.text(width / 2, 248, 'ALGORITHMIA - VOLUME I COMPLETE', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_MUTED,
      stroke: '#081820',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(5);

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 800,
      delay: 1400,
    });
  }

  private scheduleLedger(width: number): void {
    this.time.delayedCall(2200, () => this.renderLedger(width));
  }

  private renderLedger(width: number): void {
    const ledger = this.computeLedger();

    const PANEL_W = 560;
    const PANEL_H = 184;
    const panelX = Math.round(width / 2 - PANEL_W / 2);
    const panelY = 296;

    const panel = drawPanel(this, panelX, panelY, PANEL_W, PANEL_H, {
      depth: 4,
      fill: COLORS.ERROR,
      frame: COLORS.FRAME_BORDER_LIGHT,
      inner: COLORS.SUCCESS,
      alpha: 0.9,
      shadow: true,
      shadowAlpha: 0.26,
      accent: COLORS.GOLD_ACCENT,
      accentSide: 'top',
    });
    panel.setAlpha(0);

    const heading = this.add.text(width / 2, panelY + 16, 'JOURNEY LEDGER', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_LIGHT,
    }).setOrigin(0.5, 0).setAlpha(0).setDepth(5);

    const rows: Array<[string, string]> = [
      ['PUZZLES SOLVED', `${ledger.puzzlesSolved}`],
      ['STARS EARNED', `${ledger.totalStars} / ${ledger.maxStars}`],
      ['TOTAL TIME', this.formatDuration(ledger.totalTimeSec)],
      ['HINTS USED', `${ledger.totalHints}`],
      ['LOGIC SHARDS', `${ledger.shardCount}`],
      ['BIT FINAL FORM', ledger.bitStage.toUpperCase()],
    ];

    const colW = (PANEL_W - 64) / 2;
    const rowH = 22;
    const startY = panelY + 48;

    const rowObjects: Phaser.GameObjects.Text[] = [];
    rows.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const xLabel = panelX + 32 + col * colW;
      const xValue = panelX + 32 + col * colW + colW - 12;
      const y = startY + row * rowH;

      const labelText = this.add.text(xLabel, y, label, {
        fontSize: '9px',
        fontFamily: FONTS.RETRO,
        color: COLOR_HEX.TEXT_MUTED,
      }).setOrigin(0, 0.5).setAlpha(0).setDepth(5);

      const valueText = this.add.text(xValue, y, value, {
        fontSize: '11px',
        fontFamily: FONTS.RETRO,
        color: COLOR_HEX.TEXT_LIGHT,
      }).setOrigin(1, 0.5).setAlpha(0).setDepth(5);

      rowObjects.push(labelText, valueText);
    });

    this.tweens.add({
      targets: [panel, heading, ...rowObjects],
      alpha: (target: Phaser.GameObjects.GameObject) => (target === panel ? 0.9 : 1),
      duration: 700,
      ease: 'Power2.easeOut',
    });
  }

  private scheduleCredits(width: number, height: number): void {
    this.time.delayedCall(3400, () => this.renderCredits(width, height));
  }

  private renderCredits(width: number, height: number): void {
    const credits = [
      'DESIGN  -  algorithmic narrative',
      'CODE    -  Phaser 3 + TypeScript',
      'ART     -  GameBoy palette + CRT scanlines',
      'TEACHING -  the path itself',
      '',
      'A REGION FALLS. THE CORE HOLDS. THE PATTERN REPEATS.',
    ];

    const credit = this.add.text(width / 2, height - 96, credits.join('\n'), {
      fontSize: '9px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5, 1).setAlpha(0).setDepth(5);

    this.tweens.add({
      targets: credit,
      alpha: 0.85,
      duration: 1200,
    });
  }

  private scheduleContinueButton(width: number, height: number): void {
    this.time.delayedCall(4400, () => {
      const button = this.add.text(width / 2, height - 36, '> RETURN TO MENU <', {
        fontSize: '14px',
        fontFamily: FONTS.RETRO,
        color: COLOR_HEX.TEXT_DARK,
        backgroundColor: COLOR_HEX.CYAN_GLOW,
        padding: { x: 14, y: 8 },
      })
        .setOrigin(0.5, 1)
        .setAlpha(0)
        .setDepth(6)
        .setInteractive({ useHandCursor: true });

      this.tweens.add({
        targets: button,
        alpha: 1,
        duration: 600,
      });

      this.tweens.add({
        targets: button,
        scale: 1.04,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 800,
      });

      const exit = () => this.exitToMenu();
      button.on('pointerdown', exit);
      this.input.keyboard?.once('keydown-ENTER', exit);
      this.input.keyboard?.once('keydown-SPACE', exit);
      this.input.keyboard?.once('keydown-ESC', exit);

      a11yManager.announce('Press space or enter to return to the title.', false);
    });
  }

  private exitToMenu(): void {
    if (this.isExiting) return;
    this.isExiting = true;
    audioManager.playClickTone();
    audioManager.stopMusic(true);
    TransitionManager.fade(this, SCENE_KEYS.MENU, { preferResume: true }, 600);
  }

  private computeLedger(): JourneyLedger {
    const state = gameState.getState();
    const results = state.puzzleResults;
    const puzzleIds = Object.keys(results);
    let totalStars = 0;
    let totalTime = 0;
    let totalHints = 0;
    for (const id of puzzleIds) {
      const r = results[id];
      totalStars += r.stars ?? 0;
      totalTime += r.time ?? 0;
      totalHints += r.hintsUsed ?? 0;
    }

    return {
      puzzlesSolved: puzzleIds.length,
      totalStars,
      maxStars: puzzleIds.length * 3,
      totalTimeSec: totalTime,
      totalHints,
      shardCount: state.shardsCollected.length,
      bitStage: state.companion.stage,
    };
  }

  private formatDuration(seconds: number): string {
    if (seconds <= 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
