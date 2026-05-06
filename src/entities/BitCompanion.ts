/**
 * BitCompanion - The player's evolving companion creature.
 *
 * Bit starts as a single spark and grows more complex as the player
 * learns new algorithm concepts. Visually reflects current BitStage
 * and reacts emotionally to game events via EventBus.
 *
 * Follows the player with smooth lerp — feels alive, not mechanical.
 */

import Phaser from 'phaser';
import { eventBus, GameEvents } from '../core/EventBus';
import { gameState } from '../core/GameStateManager';
import { BitStage, BitMood } from '../data/types';
import { VISUAL_REVAMP_KEYS } from '../config/assets';
import { COLORS } from '../config/constants';

// Offset from player center where Bit hovers
const FOLLOW_OFFSET_X = 38;
const FOLLOW_OFFSET_Y = -22;
const FOLLOW_LERP = 0.15; // match camera lerp for cohesive, not detached companion feel
const ORBIT_RADIUS = 6;
const ORBIT_SPEED = 0.025; // radians per frame

// Colors per evolution stage
const STAGE_COLORS: Record<BitStage, number> = {
  [BitStage.SPARK]:  COLORS.CYAN_GLOW,
  [BitStage.BYTE]:   COLORS.CYAN_GLOW,
  [BitStage.FRAME]:  COLORS.PURPLE_CRYSTAL,
  [BitStage.BRANCH]: 0x22c55e,
  [BitStage.GRAPH]:  COLORS.GOLD_ACCENT,
  [BitStage.CORE]:   0xffffff,
};
const BIT_STAGE_FALLBACK = BitStage.GRAPH;

export function normalizeBitStage(stage: unknown): BitStage {
  return Object.values(BitStage).includes(stage as BitStage)
    ? stage as BitStage
    : BIT_STAGE_FALLBACK;
}

interface ParticleDot {
  dot: Phaser.GameObjects.Arc;
  offsetX: number;
  offsetY: number;
}

export class BitCompanion {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private dots: ParticleDot[] = [];
  private sparkImage: Phaser.GameObjects.Image | null = null;
  private orbitAngle: number = 0;
  private currentX: number;
  private currentY: number;
  private reactionTween: Phaser.Tweens.Tween | null = null;
  private stage: BitStage;
  private mood: BitMood;

  constructor(scene: Phaser.Scene, playerX: number, playerY: number) {
    this.scene = scene;
    this.currentX = playerX + FOLLOW_OFFSET_X;
    this.currentY = playerY + FOLLOW_OFFSET_Y;
    this.stage = normalizeBitStage(gameState.getBitStage());
    this.mood = gameState.getBitMood();

    this.container = scene.add.container(this.currentX, this.currentY);
    this.container.setDepth(10); // above terrain, below UI

    this.buildParticles();
    this.registerEvents();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  update(playerX: number, playerY: number): void {
    this.orbitAngle += ORBIT_SPEED;

    // Smooth follow with a gentle orbit wobble on top
    const targetX = playerX + FOLLOW_OFFSET_X + Math.cos(this.orbitAngle) * ORBIT_RADIUS;
    const targetY = playerY + FOLLOW_OFFSET_Y + Math.sin(this.orbitAngle * 0.7) * (ORBIT_RADIUS * 0.5);

    this.currentX += (targetX - this.currentX) * FOLLOW_LERP;
    this.currentY += (targetY - this.currentY) * FOLLOW_LERP;

    this.container.setPosition(this.currentX, this.currentY);
  }

  destroy(): void {
    this.removeEvents();
    this.stopReactionTween();
    this.container.destroy();
  }

  // ─── Particle Formations ───────────────────────────────────────────────────

  private buildParticles(): void {
    // Clear existing dots
    this.container.removeAll(true);
    this.dots = [];

    const color = STAGE_COLORS[this.stage];
    const offsets = this.getStageOffsets(this.stage);
    this.sparkImage = this.scene.add
      .image(0, 0, this.getStageImageKey(this.stage))
      .setDisplaySize(...this.getStageDisplaySize(this.stage))
      .setAlpha(0.98);
    this.container.add(this.sparkImage);

    this.scene.tweens.add({
      targets: this.sparkImage,
      angle: this.stage === BitStage.SPARK ? 5 : 360,
      duration: this.stage === BitStage.SPARK ? 1400 : 4200,
      yoyo: this.stage === BitStage.SPARK,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    for (const [ox, oy] of offsets) {
      const radius = this.stage === BitStage.SPARK ? 2 : 1.5;
      const dot = this.scene.add.circle(ox, oy, radius, color, 0.82);
      this.container.add(dot);
      this.dots.push({ dot, offsetX: ox, offsetY: oy });
    }

    // Add a subtle glow behind CORE stage
    if (this.stage === BitStage.CORE) {
      const glow = this.scene.add.ellipse(0, 0, 36, 36, 0xffffff, 0.08);
      this.container.addAt(glow, 0); // behind everything
    }
  }

  private getStageImageKey(stage: BitStage): string {
    if (stage === BitStage.SPARK) return VISUAL_REVAMP_KEYS.BIT_SPARK;
    if (stage === BitStage.BYTE) return VISUAL_REVAMP_KEYS.BIT_BYTE;
    return VISUAL_REVAMP_KEYS.BIT_FRAME;
  }

  private getStageDisplaySize(stage: BitStage): [number, number] {
    if (stage === BitStage.SPARK) return [34, 34];
    if (stage === BitStage.BYTE) return [38, 38];
    return [42, 42];
  }

  /**
   * Returns [x, y] offsets for each particle dot in a given stage.
   * Formations are chosen to mirror the DSA concept they represent.
   */
  private getStageOffsets(stage: BitStage): [number, number][] {
    switch (stage) {
      case BitStage.SPARK:
        // Tiny orbiting motes — the very beginning without covering Bit's face
        return [[-11, -8], [12, -7], [10, 10], [-12, 8]];

      case BitStage.BYTE:
        // 8 dots in a row — like array indices [0][1][2]...[7]
        return [[-14, 0], [-10, 0], [-6, 0], [-2, 0], [2, 0], [6, 0], [10, 0], [14, 0]];

      case BitStage.FRAME:
        // Rectangle outline — pattern recognition, bounded space
        return [
          [-8, -8], [0, -8], [8, -8],
          [-8,  0],           [8,  0],
          [-8,  8], [0,  8], [8,  8],
        ];

      case BitStage.BRANCH:
        // Tree/branch shape — two pointers diverging and converging
        return [
          [0, -10],
          [-6, -4], [6, -4],
          [-10, 2], [-2, 2], [2, 2], [10, 2],
        ];

      case BitStage.GRAPH:
        // Hexagonal node cluster — graph connections
        return [
          [0, -12],
          [-10, -6], [10, -6],
          [-10,  6], [10,  6],
          [0,   12],
        ];

      case BitStage.CORE:
        // Star burst — mastery of all patterns
        return [
          [0, -14],
          [10, -10], [14, 0], [10, 10],
          [0,  14],
          [-10, 10], [-14, 0], [-10, -10],
          [0, -7], [5, -5], [7, 0], [5, 5],
          [0,  7], [-5, 5], [-7, 0], [-5, -5],
        ];
    }
  }

  // ─── Mood Reactions ────────────────────────────────────────────────────────

  private playExcited(): void {
    this.stopReactionTween();
    this.reactionTween = this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 120,
      yoyo: true,
      repeat: 2,
      ease: 'Quad.easeOut',
      onComplete: () => { this.container.setScale(1); },
    });
  }

  private playScared(): void {
    this.stopReactionTween();
    const startX = this.container.x;
    this.reactionTween = this.scene.tweens.add({
      targets: this.container,
      x: startX + 4,
      duration: 40,
      yoyo: true,
      repeat: 5,
      ease: 'Linear',
      onComplete: () => { this.container.setPosition(this.currentX, this.currentY); },
    });
    // Tint all dots red-ish during fear
    this.dots.forEach(d => d.dot.setFillStyle(COLORS.ERROR));
    this.sparkImage?.setTint(COLORS.ERROR);
    this.scene.time.delayedCall(600, () => {
      this.dots.forEach(d => d.dot.setFillStyle(STAGE_COLORS[this.stage]));
      this.sparkImage?.clearTint();
    });
  }

  private playHintWarm(): void {
    this.stopReactionTween();
    this.reactionTween = this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 300,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => { this.container.setScale(1).setAlpha(1); },
    });
    this.dots.forEach(d => d.dot.setFillStyle(COLORS.ORANGE_ACCENT));
    this.sparkImage?.setTint(COLORS.ORANGE_ACCENT);
    this.scene.time.delayedCall(700, () => {
      this.dots.forEach(d => d.dot.setFillStyle(STAGE_COLORS[this.stage]));
      this.sparkImage?.clearTint();
    });
  }

  private playHintCold(): void {
    this.stopReactionTween();
    this.reactionTween = this.scene.tweens.add({
      targets: this.container,
      alpha: 0.35,
      duration: 400,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => { this.container.setAlpha(1); },
    });
  }

  private playEvolve(toStage: BitStage): void {
    this.stopReactionTween();
    // Flash white, then rebuild as new stage
    this.dots.forEach(d => d.dot.setFillStyle(0xffffff));
    this.sparkImage?.setTint(0xffffff);
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.stage = toStage;
        this.buildParticles();
        this.container.setScale(0.3).setAlpha(1);
        this.scene.tweens.add({
          targets: this.container,
          scaleX: 1,
          scaleY: 1,
          duration: 350,
          ease: 'Back.easeOut',
        });
      },
    });
  }

  private stopReactionTween(): void {
    if (this.reactionTween) {
      this.reactionTween.stop();
      this.reactionTween = null;
    }
  }

  // ─── EventBus Wiring ───────────────────────────────────────────────────────

  private registerEvents(): void {
    eventBus.on(GameEvents.BIT_MOOD_CHANGE, this.onMoodChange, this);
    eventBus.on(GameEvents.BIT_EVOLVE, this.onEvolve, this);
    eventBus.on(GameEvents.PUZZLE_COMPLETE, this.onPuzzleComplete, this);
    eventBus.on(GameEvents.PLAYER_VOID_FALL, this.onVoidFall, this);
    eventBus.on(GameEvents.WATCHER_NEARBY, this.onWatcherNearby, this);
  }

  private removeEvents(): void {
    eventBus.off(GameEvents.BIT_MOOD_CHANGE, this.onMoodChange, this);
    eventBus.off(GameEvents.BIT_EVOLVE, this.onEvolve, this);
    eventBus.off(GameEvents.PUZZLE_COMPLETE, this.onPuzzleComplete, this);
    eventBus.off(GameEvents.PLAYER_VOID_FALL, this.onVoidFall, this);
    eventBus.off(GameEvents.WATCHER_NEARBY, this.onWatcherNearby, this);
  }

  private onMoodChange = (...args: unknown[]): void => {
    const data = args[0] as { mood: BitMood };
    this.mood = data.mood;
    switch (data.mood) {
      case BitMood.EXCITED:    this.playExcited();   break;
      case BitMood.SCARED:     this.playScared();    break;
      case BitMood.HINT_WARM:  this.playHintWarm();  break;
      case BitMood.HINT_COLD:  this.playHintCold();  break;
      case BitMood.NEUTRAL:    /* no animation */    break;
    }
  };

  private onEvolve = (...args: unknown[]): void => {
    const data = args[0] as { from: BitStage; to: BitStage };
    this.playEvolve(normalizeBitStage(data.to));
  };

  private onPuzzleComplete = (): void => {
    gameState.setBitMood(BitMood.EXCITED);
    // Auto-return to neutral after celebration
    this.scene.time.delayedCall(1200, () => {
      gameState.setBitMood(BitMood.NEUTRAL);
    });
  };

  private onVoidFall = (): void => {
    gameState.setBitMood(BitMood.SCARED);
    this.scene.time.delayedCall(800, () => {
      gameState.setBitMood(BitMood.NEUTRAL);
    });
  };

  private onWatcherNearby = (): void => {
    if (this.mood !== BitMood.SCARED) {
      gameState.setBitMood(BitMood.SCARED);
    }
  };
}
