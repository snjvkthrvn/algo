/**
 * BitHint - Lightweight companion hint display for puzzle scenes.
 *
 * PrologueScene sleeps when puzzles run (full scene transition), so
 * the full BitCompanion isn't available. This is a self-contained
 * visual hint dot that puzzle scenes instantiate directly.
 *
 * Bit hovers near correct elements (WARM = orange glow),
 * dims when the player moves the wrong direction (COLD = blue-grey),
 * and celebrates on puzzle completion.
 */

import Phaser from 'phaser';
import { gameState } from '../core/GameStateManager';
import { BitMood } from '../data/types';
import { COLORS } from '../config/constants';

const WARM_COLOR = COLORS.ORANGE_ACCENT;
const COLD_COLOR = 0x4b6cb7;
const NEUTRAL_COLOR = COLORS.CYAN_GLOW;

export class BitHint {
  private scene: Phaser.Scene;
  private dot: Phaser.GameObjects.Ellipse;
  private glow: Phaser.GameObjects.Ellipse;
  private currentTween: Phaser.Tweens.Tween | null = null;
  private floatTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, startX: number, startY: number) {
    this.scene = scene;

    // Outer glow ring
    this.glow = scene.add.ellipse(startX, startY, 22, 22, NEUTRAL_COLOR, 0.2);
    this.glow.setDepth(50);

    // Inner dot
    this.dot = scene.add.ellipse(startX, startY, 10, 10, NEUTRAL_COLOR, 0.9);
    this.dot.setDepth(51);

    this.startFloat();
  }

  // ─── Hint States ────────────────────────────────────────────────────────────

  /** Move Bit to hover near a world position (e.g., a tile during pattern display). */
  moveTo(x: number, y: number, duration: number = 300): void {
    this.stopCurrentTween();
    this.scene.tweens.add({
      targets: [this.dot, this.glow],
      x,
      y,
      duration,
      ease: 'Quad.easeOut',
    });
  }

  /** Warm signal — player is on the right track. Orange pulse. */
  showWarm(): void {
    this.stopCurrentTween();
    this.dot.setFillStyle(WARM_COLOR, 0.95);
    this.glow.setFillStyle(WARM_COLOR, 0.25);
    this.currentTween = this.scene.tweens.add({
      targets: this.glow,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    gameState.setBitMood(BitMood.HINT_WARM);
  }

  /** Cold signal — player is moving away from the solution. Blue-grey dim. */
  showCold(): void {
    this.stopCurrentTween();
    this.dot.setFillStyle(COLD_COLOR, 0.5);
    this.glow.setFillStyle(COLD_COLOR, 0.1);
    this.currentTween = this.scene.tweens.add({
      targets: this.dot,
      alpha: 0.4,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    gameState.setBitMood(BitMood.HINT_COLD);
  }

  /** Reset to neutral appearance. */
  showNeutral(): void {
    this.stopCurrentTween();
    this.dot.setFillStyle(NEUTRAL_COLOR, 0.9).setAlpha(1);
    this.glow.setFillStyle(NEUTRAL_COLOR, 0.2).setAlpha(1).setScale(1);
    gameState.setBitMood(BitMood.NEUTRAL);
    this.startFloat();
  }

  /** Celebration burst on puzzle complete. */
  celebrate(): void {
    this.stopCurrentTween();
    this.dot.setFillStyle(0xffffff, 1);
    this.glow.setFillStyle(COLORS.GOLD_ACCENT, 0.4);

    this.currentTween = this.scene.tweens.add({
      targets: [this.dot, this.glow],
      scaleX: 2.0,
      scaleY: 2.0,
      duration: 200,
      yoyo: true,
      repeat: 3,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.dot.setFillStyle(NEUTRAL_COLOR, 0.9).setScale(1);
        this.glow.setFillStyle(NEUTRAL_COLOR, 0.2).setScale(1);
        gameState.setBitMood(BitMood.EXCITED);
      },
    });
  }

  destroy(): void {
    this.stopCurrentTween();
    this.floatTween?.stop();
    this.dot.destroy();
    this.glow.destroy();
  }

  // ─── Internal ───────────────────────────────────────────────────────────────

  private startFloat(): void {
    this.floatTween?.stop();
    this.floatTween = this.scene.tweens.add({
      targets: [this.dot, this.glow],
      y: `+=${3}`,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopCurrentTween(): void {
    this.floatTween?.stop();
    this.floatTween = null;
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }
  }
}
