/**
 * BasePuzzleScene - Abstract puzzle UI framework.
 * Provides retro frame, buttons, star rating, metrics, hint lifecycle.
 * Preserved and enhanced from original 485-line implementation.
 */

import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { adjustBrightness, colorToHex } from '../../utils/colors';
import { createRetroButton, updateButtonText, disableButton } from '../../ui/RetroButton';
import { showStarRating } from '../../ui/StarRating';
import { audioManager } from '../../core/AudioManager';
import { gameState } from '../../core/GameStateManager';
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

    // Dark overlay
    this.add.rectangle(0, 0, width, height, COLORS.OVERLAY_BG, 0.95).setOrigin(0, 0);

    this.uiContainer = this.add.container(0, 0);

    this.createPuzzleFrame(width, height);
    this.createTitleArea(width);
    this.createControlButtons(width);
    this.createStarRatingContainer(width);
  }

  protected createPuzzleFrame(width: number, height: number): void {
    const padding = 40;
    const frameWidth = width - padding * 2;
    const frameHeight = height - padding * 2;

    this.puzzleFrame = this.add.graphics();

    // Shadow
    this.puzzleFrame.fillStyle(0x000000, 0.5);
    this.puzzleFrame.fillRoundedRect(padding + 4, padding + 4, frameWidth, frameHeight, 8);

    // Background
    this.puzzleFrame.fillStyle(COLORS.FRAME_BG, 1);
    this.puzzleFrame.fillRoundedRect(padding, padding, frameWidth, frameHeight, 8);

    // Outer border
    this.puzzleFrame.lineStyle(4, COLORS.FRAME_BORDER_DARK, 1);
    this.puzzleFrame.strokeRoundedRect(padding, padding, frameWidth, frameHeight, 8);

    // Inner border
    this.puzzleFrame.lineStyle(2, COLORS.FRAME_BORDER_LIGHT, 1);
    this.puzzleFrame.strokeRoundedRect(padding + 6, padding + 6, frameWidth - 12, frameHeight - 12, 6);

    // Decorative line
    this.puzzleFrame.lineStyle(2, COLORS.CYAN_GLOW, 0.6);
    this.puzzleFrame.beginPath();
    this.puzzleFrame.moveTo(padding + 100, padding + 70);
    this.puzzleFrame.lineTo(width - padding - 100, padding + 70);
    this.puzzleFrame.strokePath();

    this.uiContainer.add(this.puzzleFrame);
  }

  protected createTitleArea(width: number): void {
    this.titleText = this.add.text(width / 2, 75, this.puzzleName, {
      fontSize: '28px',
      fontFamily: FONTS.RETRO,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    if (this.titleText.postFX) {
      this.titleText.postFX.addGlow(COLORS.CYAN_GLOW, 2, 0, false, 0.1, 12);
    }

    this.instructionText = this.add.text(width / 2, 115, this.puzzleDescription, {
      fontSize: '14px',
      fontFamily: FONTS.MONO,
      color: '#9ca3af',
      align: 'center',
      wordWrap: { width: width - 200 },
    }).setOrigin(0.5);

    this.uiContainer.add([this.titleText, this.instructionText]);
  }

  protected createControlButtons(width: number): void {
    this.exitButton = createRetroButton(
      this, width - 80, 60, 'EXIT', COLORS.ERROR, () => this.exitPuzzle()
    );

    this.hintButton = createRetroButton(
      this, 80, 60, `HINT (${this.maxHints - this.hintsUsed})`, COLORS.GOLD_ACCENT, () => this.showHint()
    );

    this.uiContainer.add([this.exitButton, this.hintButton]);
  }

  protected createStarRatingContainer(width: number): void {
    this.starContainer = this.add.container(width / 2, 40);
    this.starContainer.setVisible(false);
    this.uiContainer.add(this.starContainer);
  }

  protected setupKeyboardShortcuts(): void {
    this.input.keyboard?.on('keydown-ESC', () => this.exitPuzzle());
    this.input.keyboard?.on('keydown-H', () => this.showHint());
    this.input.keyboard?.on('keydown-R', () => this.restartPuzzle());
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
    const { width, height } = this.cameras.main;
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0).setDepth(10000);

    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        overlay.destroy();
        this.scene.start(this.returnScene);
      },
    });
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

    // Show stars
    showStarRating(this, this.starContainer, stars);

    // Show message
    this.showMessage('PUZZLE COMPLETE!', COLORS.SUCCESS);

    // Play sound
    audioManager.playCorrectTone();

    // Save result
    gameState.setPuzzleResult(this.puzzleId, {
      stars,
      time: timeSpent,
      attempts: this.attempts,
      hintsUsed: this.hintsUsed,
    });

    if (this.shouldSkipConceptBridge()) {
      this.scene.start(this.returnScene);
      return;
    }

    // Transition to ConceptBridge after a brief hold
    const { width, height } = this.cameras.main;
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

    const message = this.add.text(width / 2, height / 2, text, {
      fontSize: '24px',
      fontFamily: FONTS.RETRO,
      color: colorToHex(color),
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1000);

    this.tweens.add({
      targets: message,
      y: height / 2 - 50,
      alpha: 0,
      duration: 1500,
      delay: 500,
      onComplete: () => message.destroy(),
    });
  }

  /**
   * Create a retro-styled tile for puzzle elements
   */
  protected createPuzzleTile(
    x: number,
    y: number,
    size: number,
    color: number,
    label?: string
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Shadow
    const shadow = this.add.rectangle(3, 3, size, size, 0x000000, 0.4);
    container.add(shadow);

    // Main tile
    const tile = this.add.rectangle(0, 0, size, size, color);
    tile.setStrokeStyle(3, adjustBrightness(color, 0.6));
    container.add(tile);

    // Highlight
    const highlight = this.add.graphics();
    highlight.lineStyle(2, adjustBrightness(color, 1.4), 0.7);
    highlight.beginPath();
    highlight.moveTo(-size / 2 + 4, size / 2 - 4);
    highlight.lineTo(-size / 2 + 4, -size / 2 + 4);
    highlight.lineTo(size / 2 - 4, -size / 2 + 4);
    highlight.strokePath();
    container.add(highlight);

    if (label) {
      const text = this.add.text(0, 0, label, {
        fontSize: `${Math.floor(size * 0.4)}px`,
        fontFamily: FONTS.RETRO,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
      container.add(text);
    }

    return container;
  }
}
