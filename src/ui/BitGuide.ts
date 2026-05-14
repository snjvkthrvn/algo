/**
 * BitGuide — shared visual signal layer for Bit.
 *
 * Both the overworld BitCompanion and the puzzle BitHint speak through this
 * helper so the player learns a single visual language: warm = orange pulse,
 * cold = blue-grey dim, scared = red shake, celebrate = gold burst.
 *
 * It also defines two teaching gestures used in the prologue puzzles:
 *   - sequenceGuide(waypoints) — Bit walks the player through an ordered list
 *   - mappingGuide(from, to)   — Bit traces a mapping arc between two points
 *
 * BitGuide does not own any GameObjects of its own. It accepts a
 * BitGuideTarget that exposes the visual primitives of its host so each
 * host can keep its own art (Bit's evolving sprite, the puzzle's dot/glow).
 */

import Phaser from 'phaser';
import { COLORS } from '../config/constants';
import { gameState } from '../core/GameStateManager';
import { BitMood } from '../data/types';

export const BIT_GUIDE_COLORS = {
  neutral: COLORS.CYAN_GLOW,
  warm: COLORS.ORANGE_ACCENT,
  cold: 0x4b6cb7,
  scared: COLORS.ERROR,
  celebrate: COLORS.GOLD_ACCENT,
} as const;

export interface ColorableTarget {
  applyColor(color: number, alpha?: number): void;
  resetColor(): void;
}

export interface BitGuideTarget {
  readonly scene: Phaser.Scene;
  readonly tweenAnchor: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.Components.AlphaSingle &
    Phaser.GameObjects.Components.ScrollFactor & { x: number; y: number };
  readonly colorables: readonly ColorableTarget[];
  readonly baseColor: number;
}

export const colorableFromFillStyle = (
  obj: { setFillStyle: (color: number, alpha?: number) => unknown },
  baseColor: number,
  baseAlpha: number,
): ColorableTarget => ({
  applyColor: (color, alpha) => { obj.setFillStyle(color, alpha ?? baseAlpha); },
  resetColor: () => { obj.setFillStyle(baseColor, baseAlpha); },
});

export const colorableFromTint = (
  obj: { setTint: (color: number) => unknown; clearTint: () => unknown },
): ColorableTarget => ({
  applyColor: (color) => { obj.setTint(color); },
  resetColor: () => { obj.clearTint(); },
});

interface ActiveAnimation {
  stop(): void;
}

export interface BitGuideHandle {
  cancel(): void;
}

const SIGNAL_REVERT_DELAY_MS = {
  scared: 600,
  celebrate: 900,
} as const;

export class BitGuide {
  private active: ActiveAnimation[] = [];
  private revertTimer: Phaser.Time.TimerEvent | null = null;
  private destroyed = false;

  constructor(private readonly target: BitGuideTarget) {}

  destroy(): void {
    this.destroyed = true;
    this.cancelActive();
  }

  /** Reset the visuals to neutral and clear any pending signal. */
  neutral(): void {
    if (this.destroyed) return;
    this.cancelActive();
    this.applyColor(this.target.baseColor);
    this.target.tweenAnchor.setAlpha(1);
    this.setMood(BitMood.NEUTRAL);
  }

  /** Warm pulse — the player is on the right track. Loops until next signal. */
  warm(): BitGuideHandle {
    if (this.destroyed) return noopHandle;
    this.cancelActive();
    this.applyColor(BIT_GUIDE_COLORS.warm);
    this.setMood(BitMood.HINT_WARM);
    const tween = this.target.scene.tweens.add({
      targets: this.target.tweenAnchor,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return this.track(tween);
  }

  /** Cold dim — the player is moving away from the solution. Loops. */
  cold(): BitGuideHandle {
    if (this.destroyed) return noopHandle;
    this.cancelActive();
    this.applyColor(BIT_GUIDE_COLORS.cold);
    this.setMood(BitMood.HINT_COLD);
    const tween = this.target.scene.tweens.add({
      targets: this.target.tweenAnchor,
      alpha: 0.4,
      duration: 580,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return this.track(tween);
  }

  /** Scared shake + dark tint, auto-reverts to neutral. */
  scared(): BitGuideHandle {
    if (this.destroyed) return noopHandle;
    this.cancelActive();
    this.applyColor(BIT_GUIDE_COLORS.scared);
    this.setMood(BitMood.SCARED);
    const startX = this.target.tweenAnchor.x;
    const tween = this.target.scene.tweens.add({
      targets: this.target.tweenAnchor,
      x: startX + 4,
      duration: 40,
      yoyo: true,
      repeat: 5,
      ease: 'Linear',
      onComplete: () => { this.target.tweenAnchor.x = startX; },
    });
    this.scheduleRevert(SIGNAL_REVERT_DELAY_MS.scared);
    return this.track(tween);
  }

  /** Gold burst, auto-reverts. */
  celebrate(onDone?: () => void): BitGuideHandle {
    if (this.destroyed) return noopHandle;
    this.cancelActive();
    this.applyColor(BIT_GUIDE_COLORS.celebrate);
    this.setMood(BitMood.EXCITED);
    const tween = this.target.scene.tweens.add({
      targets: this.target.tweenAnchor,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 200,
      yoyo: true,
      repeat: 2,
      ease: 'Back.easeOut',
      onComplete: () => onDone?.(),
    });
    this.scheduleRevert(SIGNAL_REVERT_DELAY_MS.celebrate);
    return this.track(tween);
  }

  /** Walk Bit through an ordered list of waypoints, warm-pulsing on arrival. */
  sequenceGuide(
    waypoints: ReadonlyArray<{ x: number; y: number }>,
    opts: { stepDurationMs?: number; onArrive?: (index: number) => void } = {},
  ): BitGuideHandle {
    if (this.destroyed || waypoints.length === 0) return noopHandle;
    this.cancelActive();
    const stepDuration = opts.stepDurationMs ?? 320;

    const visit = (index: number) => {
      if (index >= waypoints.length || this.destroyed) return;
      const point = waypoints[index];
      const tween = this.target.scene.tweens.add({
        targets: this.target.tweenAnchor,
        x: point.x,
        y: point.y,
        duration: stepDuration,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          opts.onArrive?.(index);
          this.applyColor(BIT_GUIDE_COLORS.warm);
          this.target.scene.time.delayedCall(160, () => {
            this.applyColor(this.target.baseColor);
            visit(index + 1);
          });
        },
      });
      this.track(tween);
    };

    visit(0);
    return this.handleForActive();
  }

  /** Trace an arc from one world point to another to teach a mapping. */
  mappingGuide(
    from: { x: number; y: number },
    to: { x: number; y: number },
    opts: { durationMs?: number; onArrive?: () => void } = {},
  ): BitGuideHandle {
    if (this.destroyed) return noopHandle;
    this.cancelActive();
    const duration = opts.durationMs ?? 540;
    this.target.tweenAnchor.x = from.x;
    this.target.tweenAnchor.y = from.y;
    this.applyColor(BIT_GUIDE_COLORS.warm);
    const midX = (from.x + to.x) / 2;
    const midY = Math.min(from.y, to.y) - 32;
    const tween = this.target.scene.tweens.add({
      targets: this.target.tweenAnchor,
      ease: 'Sine.easeInOut',
      duration,
      props: {
        x: { from: from.x, to: to.x },
        y: { from: from.y, to: to.y },
      },
      onUpdate: (t) => {
        const u = t.progress;
        const arc = (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * midY + u * u * to.y;
        this.target.tweenAnchor.y = arc;
        this.target.tweenAnchor.x = (1 - u) * from.x + u * to.x;
        void midX; // referenced for symmetry
      },
      onComplete: () => {
        opts.onArrive?.();
        this.applyColor(this.target.baseColor);
      },
    });
    return this.track(tween);
  }

  // ─── Internal ───────────────────────────────────────────────────────────────

  private applyColor(color: number): void {
    if (color === this.target.baseColor) {
      for (const c of this.target.colorables) c.resetColor();
      return;
    }
    for (const c of this.target.colorables) c.applyColor(color);
  }

  private setMood(mood: BitMood): void {
    gameState.setBitMood(mood);
  }

  private cancelActive(): void {
    for (const a of this.active) a.stop();
    this.active = [];
    if (this.revertTimer) {
      this.revertTimer.destroy();
      this.revertTimer = null;
    }
  }

  private track(tween: Phaser.Tweens.Tween): BitGuideHandle {
    this.active.push(tween);
    return { cancel: () => tween.stop() };
  }

  private handleForActive(): BitGuideHandle {
    const snapshot = [...this.active];
    return {
      cancel: () => { for (const a of snapshot) a.stop(); },
    };
  }

  private scheduleRevert(delayMs: number): void {
    this.revertTimer = this.target.scene.time.delayedCall(delayMs, () => {
      this.applyColor(this.target.baseColor);
      this.target.tweenAnchor.setAlpha(1);
      this.setMood(BitMood.NEUTRAL);
      this.revertTimer = null;
    });
  }
}

const noopHandle: BitGuideHandle = { cancel: () => {} };
