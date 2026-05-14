/**
 * BitHint - Lightweight Bit avatar for puzzle scenes.
 *
 * PrologueScene sleeps when a puzzle runs (full scene transition), so the
 * full BitCompanion isn't available. BitHint is a self-contained avatar
 * the puzzle can place at a fixed point. All visual signaling delegates to
 * BitGuide so the puzzle's "warm/cold/celebrate" reads identically to the
 * overworld companion's "warm/cold/celebrate."
 */

import Phaser from 'phaser';
import { COLORS } from '../config/constants';
import {
  BitGuide,
  BIT_GUIDE_COLORS,
  colorableFromFillStyle,
  type BitGuideTarget,
} from '../ui/BitGuide';

const NEUTRAL_COLOR = BIT_GUIDE_COLORS.neutral;
const DOT_BASE_ALPHA = 0.9;
const GLOW_BASE_ALPHA = 0.2;

export class BitHint {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private dot: Phaser.GameObjects.Ellipse;
  private glow: Phaser.GameObjects.Ellipse;
  private floatTween: Phaser.Tweens.Tween | null = null;
  private guide: BitGuide;

  constructor(scene: Phaser.Scene, startX: number, startY: number) {
    this.scene = scene;

    this.container = scene.add.container(startX, startY).setDepth(50);

    this.glow = scene.add.ellipse(0, 0, 22, 22, NEUTRAL_COLOR, GLOW_BASE_ALPHA);
    this.dot = scene.add.ellipse(0, 0, 10, 10, NEUTRAL_COLOR, DOT_BASE_ALPHA);
    this.container.add([this.glow, this.dot]);

    const target: BitGuideTarget = {
      scene,
      tweenAnchor: this.container,
      colorables: [
        colorableFromFillStyle(this.dot, NEUTRAL_COLOR, DOT_BASE_ALPHA),
        colorableFromFillStyle(this.glow, NEUTRAL_COLOR, GLOW_BASE_ALPHA),
      ],
      baseColor: NEUTRAL_COLOR,
    };

    this.guide = new BitGuide(target);
    this.startFloat();
  }

  // ─── Public API (preserved for puzzle scenes) ────────────────────────────────

  /** Move the avatar to a world position; pure motion, no signal. */
  moveTo(x: number, y: number, duration: number = 300): void {
    this.scene.tweens.add({
      targets: this.container,
      x,
      y,
      duration,
      ease: 'Quad.easeOut',
    });
  }

  showWarm(): void { this.guide.warm(); }
  showCold(): void { this.guide.cold(); }
  showNeutral(): void {
    this.guide.neutral();
    this.startFloat();
  }
  celebrate(onDone?: () => void): void { this.guide.celebrate(onDone); }
  scared(): void { this.guide.scared(); }

  /** Walk Bit through an ordered list of waypoints (sequence-guide). */
  sequence(waypoints: ReadonlyArray<{ x: number; y: number }>, onArrive?: (i: number) => void): void {
    this.guide.sequenceGuide(waypoints, { onArrive });
  }

  /** Arc Bit from one world point to another (mapping-guide). */
  mapping(from: { x: number; y: number }, to: { x: number; y: number }, onArrive?: () => void): void {
    this.guide.mappingGuide(from, to, { onArrive });
  }

  destroy(): void {
    this.floatTween?.stop();
    this.guide.destroy();
    this.container.destroy();
    void COLORS; // referenced via BIT_GUIDE_COLORS
  }

  // ─── Internal ───────────────────────────────────────────────────────────────

  private startFloat(): void {
    this.floatTween?.stop();
    this.floatTween = this.scene.tweens.add({
      targets: this.container,
      y: `+=${3}`,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
