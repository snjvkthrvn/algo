/**
 * BasePuzzleScene - Abstract puzzle UI framework.
 * Provides retro frame, buttons, star rating, metrics, hint lifecycle.
 * Preserved and enhanced from original 485-line implementation.
 */

import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { PROLOGUE_REWORK_KEYS, VISUAL_REVAMP_KEYS } from '../../config/assets';
import { colorToHex } from '../../utils/colors';
import { createRetroButton, updateButtonText, disableButton } from '../../ui/RetroButton';
import { showStarRating } from '../../ui/StarRating';
import { drawPanel } from '../../ui/panel';
import { audioManager } from '../../core/AudioManager';
import { gameState } from '../../core/GameStateManager';
import { TransitionManager } from '../../core/TransitionManager';
import { JuiceSystem } from '../../systems/JuiceSystem';
import type { ConceptBridgeData } from '../../data/types';

export abstract class BasePuzzleScene extends Phaser.Scene {
  // UI Elements
  protected uiContainer!: Phaser.GameObjects.Container;
  protected puzzleFrame!: Phaser.GameObjects.Graphics;
  protected titleText!: Phaser.GameObjects.Text;
  protected instructionText!: Phaser.GameObjects.Text;
  protected hintButton!: Phaser.GameObjects.Container;
  protected exitButton!: Phaser.GameObjects.Container;
  protected starContainer!: Phaser.GameObjects.Container;

  // Puzzle State
  protected puzzleId: string = '';
  protected puzzleName: string = '';
  protected puzzleDescription: string = '';
  protected attempts: number = 0;
  protected startTime: number = 0;
  protected hintsUsed: number = 0;
  protected maxHints: number = 3;
  protected returnScene: string = SCENE_KEYS.PROLOGUE;

  private readonly onPuzzleEsc = () => this.exitPuzzle();
  private readonly onPuzzleH = () => this.showHint();
  private readonly onPuzzleR = () => this.restartPuzzle();

  constructor(config: { key: string }) {
    super(config);
  }

  init(data: {
    returnScene?: string;
    puzzleData?: Record<string, unknown>;
    previousAttempts?: number;
    previousHintsUsed?: number;
  }): void {
    this.returnScene = data.returnScene || SCENE_KEYS.PROLOGUE;
    this.startTime = Date.now();
    this.attempts = data.previousAttempts || 0;
    this.hintsUsed = data.previousHintsUsed || 0;
  }

  create(): void {
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);
    // Fade in via tween overlay
    const { width: fw, height: fh } = this.cameras.main;
    const fadeIn = this.add.rectangle(0, 0, fw, fh, 0x000000, 1).setOrigin(0).setDepth(10000);
    this.tweens.add({
      targets: fadeIn,
      alpha: 0,
      duration: 300,
      onComplete: () => fadeIn.destroy(),
    });

    audioManager.setScene(this);
    this.createPuzzleUI();
    this.setupKeyboardShortcuts();
  }

  protected createPuzzleUI(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(0, 0, width, height, COLORS.OVERLAY_BG, 1).setOrigin(0, 0).setDepth(-30);

    const backdropKey = this.getPuzzleBackdropKey();
    const resolvedBackdropKey = backdropKey && this.textures.exists(backdropKey)
      ? backdropKey
      : PROLOGUE_REWORK_KEYS.PUZZLE_CHAMBER_FRAME;
    const hasBackdrop = this.textures.exists(resolvedBackdropKey);

    if (hasBackdrop) {
      this.add
        .image(width / 2, height / 2, resolvedBackdropKey)
        .setDisplaySize(width, height)
        .setDepth(-29);
    }

    this.add.rectangle(0, 0, width, height, COLORS.OVERLAY_BG, hasBackdrop ? 0.04 : 0.18)
      .setOrigin(0, 0)
      .setDepth(-28);

    this.uiContainer = this.add.container(0, 0);

    this.createPuzzleFrame(width, height);
    this.createTitleArea(width);
    this.createControlButtons(width);
    this.createStarRatingContainer(width);
    this.addStatusIndicator(width, height);
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_FRAME;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.06;
  }

  protected createPuzzleFrame(width: number, height: number): void {
    const padding = 40;
    const frameWidth = width - padding * 2;
    const frameHeight = height - padding * 2;

    this.puzzleFrame = this.add.graphics();

    // Shadow
    this.puzzleFrame.fillStyle(0x000000, 0.5);
    this.puzzleFrame.fillRoundedRect(padding + 4, padding + 4, frameWidth, frameHeight, 8);

    // Keep the generated encounter art visible while giving primitive puzzle
    // objects a shared readable surface.
    this.puzzleFrame.fillStyle(0xe0f8d0, this.getPuzzleFrameFillAlpha());
    this.puzzleFrame.fillRoundedRect(padding, padding, frameWidth, frameHeight, 8);

    // Outer border
    this.puzzleFrame.lineStyle(3, 0x081820, 0.9);
    this.puzzleFrame.strokeRoundedRect(padding, padding, frameWidth, frameHeight, 8);

    // Inner border
    this.puzzleFrame.lineStyle(1, 0x346856, 0.78);
    this.puzzleFrame.strokeRoundedRect(padding + 6, padding + 6, frameWidth - 12, frameHeight - 12, 6);

    this.puzzleFrame.setAlpha(0);
    this.uiContainer.add(this.puzzleFrame);

    // CRT scanlines — added before title/buttons so they render underneath.
    this.addScanlines(width, height, padding);

    // Decorative line grows from center outward after frame fades in.
    const lineY = padding + 70;
    const lineRect = this.add.rectangle(width / 2, lineY, frameWidth - 240, 2, 0x346856, 0.5);
    lineRect.setScale(0, 1);
    this.uiContainer.add(lineRect);

    // Frame fade-in
    this.tweens.add({
      targets: this.puzzleFrame,
      alpha: 1,
      duration: 350,
      ease: 'Power2',
    });

    // Line grows after frame is visible
    this.tweens.add({
      targets: lineRect,
      scaleX: 1,
      duration: 500,
      delay: 280,
      ease: 'Power3.easeOut',
    });

    // Corner accents snap in after the frame settles
    this.time.delayedCall(200, () => this.addCornerAccents(width, height, padding));
  }

  private addScanlines(width: number, height: number, padding: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.08);
    for (let scanY = padding + 2; scanY < height - padding; scanY += 4) {
      g.fillRect(padding + 1, scanY, width - padding * 2 - 2, 1);
    }
    g.setAlpha(0);
    this.uiContainer.add(g);
    this.tweens.add({ targets: g, alpha: 1, duration: 400, delay: 300, ease: 'Power1' });
  }

  private addCornerAccents(width: number, height: number, padding: number): void {
    const arm = 22;
    const corners: { x: number; y: number; hDir: number; vDir: number }[] = [
      { x: padding, y: padding, hDir: 1, vDir: 1 },
      { x: width - padding, y: padding, hDir: -1, vDir: 1 },
      { x: padding, y: height - padding, hDir: 1, vDir: -1 },
      { x: width - padding, y: height - padding, hDir: -1, vDir: -1 },
    ];
    corners.forEach(({ x, y, hDir, vDir }, i) => {
      const g = this.add.graphics();
      g.lineStyle(3, COLORS.CYAN_GLOW, 1);
      g.beginPath();
      g.moveTo(x + hDir * arm, y);
      g.lineTo(x, y);
      g.lineTo(x, y + vDir * arm);
      g.strokePath();
      g.setAlpha(0);
      this.uiContainer.add(g);
      this.tweens.add({ targets: g, alpha: 1, duration: 180, delay: i * 70, ease: 'Power2.easeOut' });
    });
  }

  protected createTitleArea(width: number): void {
    this.titleText = this.add.text(width / 2, 75, this.puzzleName, {
      fontSize: '24px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      stroke: '#e0f8d0',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    // Instruction starts slightly left and slides into place.
    // Color matches title (#081820) for ~14:1 contrast on the cream panel — the
    // win condition reads at a glance instead of fading into the chrome.
    this.instructionText = this.add.text(width / 2 - 80, 115, this.puzzleDescription, {
      fontSize: '14px',
      fontFamily: FONTS.MONO,
      color: '#081820',
      align: 'center',
      wordWrap: { width: width - 200 },
    }).setOrigin(0.5).setAlpha(0);

    const titlePanel = drawPanel(this, width / 2 - 368, 48, 736, 86, {
      depth: 0,
      fill: 0xe0f8d0,
      frame: 0x081820,
      inner: 0x346856,
      alpha: 0.94,
    });
    titlePanel.setAlpha(0);

    this.uiContainer.add([titlePanel, this.titleText, this.instructionText]);

    // Glitch-reveal the title after the frame starts fading in.
    this.time.delayedCall(180, () => this.glitchReveal(this.titleText, '#081820'));

    this.tweens.add({
      targets: titlePanel,
      alpha: 1,
      duration: 260,
      delay: 120,
      ease: 'Power2',
    });

    // Instruction slides in after title settles.
    this.tweens.add({
      targets: this.instructionText,
      x: width / 2,
      alpha: 1,
      duration: 380,
      delay: 520,
      ease: 'Power2.easeOut',
    });
  }

  private glitchReveal(text: Phaser.GameObjects.Text, finalColor: string): void {
    const glitchColors = ['#06b6d4', '#8b5cf6', '#ff44aa', '#ffffff'];
    let tick = 0;
    const totalTicks = 14;
    this.time.addEvent({
      delay: 40,
      repeat: totalTicks,
      callback: () => {
        tick++;
        text.setAlpha(tick % 2 === 0 ? 0.9 : 0.1);
        text.setColor(glitchColors[tick % glitchColors.length]);
        if (tick >= totalTicks) {
          text.setAlpha(1);
          text.setColor(finalColor);
        }
      },
    });
  }

  protected createControlButtons(width: number): void {
    this.exitButton = createRetroButton(
      this, width - 80, 60, 'EXIT', COLORS.ERROR, () => this.exitPuzzle()
    );
    this.hintButton = createRetroButton(
      this, 80, 60, `HINT (${this.maxHints - this.hintsUsed})`, COLORS.GOLD_ACCENT, () => this.showHint()
    );

    this.exitButton.setScale(0);
    this.hintButton.setScale(0);
    this.uiContainer.add([this.exitButton, this.hintButton]);

    // Spring in from scale 0 with staggered delay.
    this.tweens.add({ targets: this.exitButton, scale: 1, duration: 280, delay: 420, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.hintButton, scale: 1, duration: 280, delay: 500, ease: 'Back.easeOut' });

    // Exit button pulses as a persistent warning cue.
    this.tweens.add({
      targets: this.exitButton,
      alpha: 0.6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 900,
    });
  }

  protected addStatusIndicator(width: number, _height: number): void {
    const padding = 40;
    const dotX = width - padding - 160;
    const dotY = padding + 14;

    const dot = this.add.circle(dotX, dotY, 4, COLORS.SUCCESS);
    const label = this.add.text(dotX - 8, dotY, 'ONLINE', {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: colorToHex(COLORS.SUCCESS),
    }).setOrigin(1, 0.5);

    dot.setAlpha(0);
    label.setAlpha(0);
    this.uiContainer.add([dot, label]);

    this.tweens.add({ targets: [dot, label], alpha: 1, duration: 300, delay: 600 });

    // Pulsing dot signals the puzzle module is active.
    this.tweens.add({
      targets: dot,
      alpha: 0.15,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 1000,
    });
  }

  protected createStarRatingContainer(width: number): void {
    this.starContainer = this.add.container(width / 2, 40);
    this.starContainer.setVisible(false);
    this.uiContainer.add(this.starContainer);
  }

  protected setupKeyboardShortcuts(): void {
    const kbd = this.input.keyboard;
    kbd?.on('keydown-ESC', this.onPuzzleEsc);
    kbd?.on('keydown-H', this.onPuzzleH);
    kbd?.on('keydown-R', this.onPuzzleR);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kbd?.off('keydown-ESC', this.onPuzzleEsc);
      kbd?.off('keydown-H', this.onPuzzleH);
      kbd?.off('keydown-R', this.onPuzzleR);
    });
  }

  protected showHint(): void {
    if (this.hintsUsed >= this.maxHints) {
      this.showMessage('No hints remaining!', COLORS.WARNING);
      return;
    }

    this.hintsUsed++;
    updateButtonText(this.hintButton, `HINT (${this.maxHints - this.hintsUsed})`);

    if (this.hintsUsed >= this.maxHints) {
      disableButton(this.hintButton);
    }

    this.displayHint(this.hintsUsed);
  }

  protected abstract displayHint(hintNumber: number): void;
  protected abstract getConceptName(): string;
  protected shouldSkipConceptBridge(): boolean {
    return false;
  }

  protected exitPuzzle(): void {
    TransitionManager.pixelDissolve(this, this.returnScene);
  }

  protected restartPuzzle(): void {
    this.attempts++;
    this.scene.restart({
      returnScene: this.returnScene,
      previousAttempts: this.attempts,
      previousHintsUsed: this.hintsUsed,
    });
  }

  protected onPuzzleComplete(stars: number): void {
    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
    const { width, height } = this.cameras.main;

    showStarRating(this, this.starContainer, stars);
    this.showMessage('PUZZLE COMPLETE!', COLORS.SUCCESS);
    audioManager.playCorrectTone();

    JuiceSystem.cameraShake(this, 80, 0.003);
    JuiceSystem.screenFlash(this, COLORS.SUCCESS, 0.10, 300);
    JuiceSystem.correctBurst(this, width / 2, height / 2);

    // Save result
    gameState.setPuzzleResult(this.puzzleId, {
      stars,
      time: timeSpent,
      attempts: this.attempts,
      hintsUsed: this.hintsUsed,
    });

    if (this.shouldSkipConceptBridge()) {
      const { width: bw, height: bh } = this.cameras.main;
      const exitFade = this.add.rectangle(0, 0, bw, bh, 0x000000, 0).setOrigin(0).setDepth(10000);
      this.tweens.add({
        targets: exitFade,
        alpha: 1,
        duration: 500,
        delay: 1800,
        onComplete: () => {
          exitFade.destroy();
          this.scene.start(this.returnScene);
        },
      });
      return;
    }

    // Transition to ConceptBridge after a brief hold
    const fadeOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0).setDepth(10000);

    this.tweens.add({
      targets: fadeOverlay,
      alpha: 1,
      duration: 500,
      delay: 2000,
      onComplete: () => {
        fadeOverlay.destroy();
        const bridgeData: ConceptBridgeData = {
          puzzleName: this.puzzleName,
          puzzleId: this.puzzleId,
          concept: this.getConceptName(),
          returnScene: this.returnScene,
          attempts: this.attempts,
          timeSpent: timeSpent,
          hintsUsed: this.hintsUsed,
          stars: stars,
        };
        this.scene.start(SCENE_KEYS.CONCEPT_BRIDGE, bridgeData);
      },
    });
  }

  protected showMessage(text: string, color: number = COLORS.TEXT_LIGHT): void {
    const { width, height } = this.cameras.main;
    const msgW = Math.min(width - 80, 480);
    const msgH = 48;
    const msgY = height / 2 - 20;

    const msgContainer = this.add.container(width / 2, msgY).setDepth(1000).setAlpha(0);

    const bg = this.add.graphics();
    bg.fillStyle(0xe0f8d0, 0.96);
    bg.fillRect(-msgW / 2, -msgH / 2, msgW, msgH);
    bg.lineStyle(2, color, 1);
    bg.strokeRect(-msgW / 2, -msgH / 2, msgW, msgH);
    // Inner accent line across the top of the box.
    bg.lineStyle(1, color, 0.35);
    bg.beginPath();
    bg.moveTo(-msgW / 2 + 4, -msgH / 2 + 4);
    bg.lineTo(msgW / 2 - 4, -msgH / 2 + 4);
    bg.strokePath();

    const label = this.add.text(0, 0, text, {
      fontSize: '16px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      stroke: colorToHex(color),
      strokeThickness: 1,
      align: 'center',
      wordWrap: { width: msgW - 36 },
    }).setOrigin(0.5);

    msgContainer.add([bg, label]);

    this.tweens.add({ targets: msgContainer, alpha: 1, y: msgY - 4, duration: 160, ease: 'Power2.easeOut' });

    this.tweens.add({
      targets: msgContainer,
      alpha: 0,
      y: msgY - 12,
      duration: 180,
      ease: 'Power3.easeIn',
      delay: 1600,
      onComplete: () => msgContainer.destroy(),
    });
  }

}
