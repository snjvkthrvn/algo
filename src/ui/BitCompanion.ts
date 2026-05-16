/**
 * BitCompanion — the player's evolving construct, rendered as a small widget
 * visible in every region puzzle.
 *
 * Bit's visual evolution tracks the player's journey through the first three
 * regions:
 *
 *   spark  — Prologue. A single glowing cyan dot with a small particle trail.
 *   byte   — Array Plains. Eight gold particles arranged in a row (a byte).
 *   frame  — Twin Rivers. A rectangle that can be a single gold frame OR split
 *            into a blue half + an orange half (mode='split') for the
 *            two-pointer puzzles.
 *
 * The widget owns its own container, so positioning is just `.setPosition()`.
 * Cleanup is wired to the scene's SHUTDOWN.
 */

import Phaser from 'phaser';

export type BitStage = 'spark' | 'byte' | 'frame';
export type BitFrameMode = 'frame' | 'split';

export interface BitCompanionOptions {
  readonly stage: BitStage;
  readonly x: number;
  readonly y: number;
  /** byte: which particle index is highlighted (0..7) or -1 for none. */
  readonly highlight?: number;
  /** frame: 'frame' (single gold) or 'split' (blue+orange halves). */
  readonly frameMode?: BitFrameMode;
  /** Optional display scale. Default 1. */
  readonly scale?: number;
  readonly depth?: number;
}

const CYAN = 0x22d3ee;
const GOLD = 0xf5b820;
const BLUE = 0x7cc1ff;
const ORANGE = 0xf5b06a;

export class BitCompanion {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly stage: BitStage;
  private readonly frameMode: BitFrameMode;
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private highlightIndex: number;

  constructor(scene: Phaser.Scene, opts: BitCompanionOptions) {
    this.scene = scene;
    this.stage = opts.stage;
    this.frameMode = opts.frameMode ?? 'split';
    this.highlightIndex = opts.highlight ?? -1;

    this.container = scene.add.container(opts.x, opts.y);
    if (opts.scale && opts.scale !== 1) this.container.setScale(opts.scale);
    this.container.setDepth(opts.depth ?? 50);

    switch (this.stage) {
      case 'spark':
        this.buildSpark();
        break;
      case 'byte':
        this.buildByte();
        break;
      case 'frame':
        this.buildFrame();
        break;
    }

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setHighlight(index: number): void {
    this.highlightIndex = index;
    if (this.stage === 'byte') this.repaintByte();
  }

  destroy(): void {
    for (const t of this.tweens) t.stop();
    for (const o of this.objects) o.destroy();
    this.tweens.length = 0;
    this.objects.length = 0;
    this.container.destroy();
  }

  // ──────────────────────────────────────────────────────────────────
  // Spark (Prologue)
  // ──────────────────────────────────────────────────────────────────

  private buildSpark(): void {
    const halo = this.scene.add.circle(0, 0, 14, CYAN, 0.18);
    const mid = this.scene.add.circle(0, 0, 8, CYAN, 0.55);
    const core = this.scene.add.circle(0, 0, 4, 0xffffff, 1);
    this.container.add([halo, mid, core]);
    this.objects.push(halo, mid, core);

    this.tweens.push(this.scene.tweens.add({
      targets: [halo, mid],
      scale: { from: 1, to: 1.4 },
      alpha: { from: 0.55, to: 0.20 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }));
    this.tweens.push(this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 4,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }));

    // Small particle trail dots.
    for (let i = 0; i < 3; i++) {
      const dot = this.scene.add.circle(-6 - i * 4, 2 + i * 1.5, 2, CYAN, 0.7);
      this.container.add(dot);
      this.objects.push(dot);
      this.tweens.push(this.scene.tweens.add({
        targets: dot,
        x: dot.x - 8,
        y: dot.y + 2,
        alpha: 0,
        duration: 1400,
        repeat: -1,
        delay: i * 200,
        onRepeat: () => {
          dot.setPosition(-6 - i * 4, 2 + i * 1.5);
          dot.setAlpha(0.7);
        },
      }));
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Byte (Array Plains) — 8 particles in a row
  // ──────────────────────────────────────────────────────────────────

  private particleSquares: Phaser.GameObjects.Rectangle[] = [];

  private buildByte(): void {
    const px = 5;
    const py = 5;
    const gap = 1;
    const totalW = 8 * px + 7 * gap;
    const startX = -totalW / 2 + px / 2;

    // Backing frame.
    const back = this.scene.add.rectangle(0, 0, totalW + 14, py + 14, 0xfffbe0, 0.10).setStrokeStyle(1, GOLD, 0.6);
    this.container.add(back);
    this.objects.push(back);

    this.particleSquares = [];
    for (let i = 0; i < 8; i++) {
      const isHighlight = i === this.highlightIndex;
      const rect = this.scene.add.rectangle(startX + i * (px + gap), 0, px, py, isHighlight ? 0xffffff : GOLD, 1);
      this.container.add(rect);
      this.objects.push(rect);
      this.particleSquares.push(rect);
      this.tweens.push(this.scene.tweens.add({
        targets: rect,
        alpha: { from: 1, to: 0.55 },
        duration: 1100 + i * 80,
        delay: i * 60,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));
    }
    this.tweens.push(this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 3,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }));
  }

  private repaintByte(): void {
    for (let i = 0; i < this.particleSquares.length; i++) {
      const r = this.particleSquares[i];
      const on = i === this.highlightIndex;
      r.setFillStyle(on ? 0xffffff : GOLD, 1);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Frame (Twin Rivers) — single gold frame OR blue/orange split
  // ──────────────────────────────────────────────────────────────────

  private buildFrame(): void {
    const w = 56;
    const h = 24;
    if (this.frameMode === 'split') {
      const half = (w - 6) / 2;
      const left = this.scene.add.rectangle(-half / 2 - 2, 0, half, h, BLUE, 0.20).setStrokeStyle(2, BLUE, 1);
      const right = this.scene.add.rectangle(half / 2 + 2, 0, half, h, ORANGE, 0.20).setStrokeStyle(2, ORANGE, 1);
      this.container.add([left, right]);
      this.objects.push(left, right);
      this.tweens.push(this.scene.tweens.add({
        targets: left,
        alpha: { from: 0.20, to: 0.45 },
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));
      this.tweens.push(this.scene.tweens.add({
        targets: right,
        alpha: { from: 0.20, to: 0.45 },
        duration: 1400,
        yoyo: true,
        repeat: -1,
        delay: 350,
        ease: 'Sine.easeInOut',
      }));
    } else {
      const single = this.scene.add.rectangle(0, 0, w, h, GOLD, 0.15).setStrokeStyle(2, GOLD, 1);
      this.container.add(single);
      this.objects.push(single);
      this.tweens.push(this.scene.tweens.add({
        targets: single,
        alpha: { from: 0.15, to: 0.45 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));
    }
    this.tweens.push(this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 3,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }));
  }
}
