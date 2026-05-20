/**
 * ComplexityMeter — the live "your cost · brute force cost" HUD chip.
 *
 * The educational layer added between-round LessonCards that *say* the
 * algorithm beats brute force. This widget *shows* that during play: it
 * surfaces both counters as a side-by-side comparison and updates as the
 * player acts. The bar fills proportionally to brute force, so the visual
 * delta between "what you actually did" and "what brute force would have
 * needed" stays viscerally obvious.
 *
 * Two visual variants pair with the region themes:
 *
 *   parchment — warm tan chip with barn-red accents (Array Plains, Twin Rivers).
 *   cosmic    — deep purple chip with cyan accents (Prologue, if needed).
 *
 * Usage:
 *
 *   const meter = new ComplexityMeter(this, {
 *     x: width / 2, y: 60,
 *     bruteLabel: 'brute force', bruteCost: 28,    // e.g. n(n-1)/2 inversions
 *     algoLabel: 'your swaps',   algoCost: 0,
 *     variant: 'parchment',
 *   });
 *   meter.setAlgoCost(this.currentSwaps);   // call on every player action
 *   meter.celebrate();                       // gold pulse on completion
 */

import Phaser from 'phaser';

export type ComplexityMeterVariant = 'parchment' | 'cosmic';

export interface ComplexityMeterOptions {
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly bruteLabel: string;
  readonly bruteCost: number;
  readonly algoLabel: string;
  readonly algoCost: number;
  readonly variant?: ComplexityMeterVariant;
  readonly depth?: number;
}

const COLORS_PARCH = {
  bg: 0xf0e4c2,
  bgAlt: 0xd8c890,
  ink: 0x1a1208,
  inkDim: 0x4a3818,
  algo: 0x3c8038,     // success green
  brute: 0xa03830,    // barn red
  gold: 0xf5b820,
};
const COLORS_COSMIC = {
  bg: 0x0d0a2a,
  bgAlt: 0x06061a,
  ink: 0xe0f8d0,
  inkDim: 0xa7b8d9,
  algo: 0x86efac,     // mint
  brute: 0xfda4af,    // rose
  gold: 0xf5b820,
};

export class ComplexityMeter {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly variant: ComplexityMeterVariant;
  private readonly w: number;
  private readonly h = 38;
  private bruteCost: number;
  private algoCost: number;
  private bruteLabel: string;
  private algoLabel: string;

  private bg!: Phaser.GameObjects.Graphics;
  private bar!: Phaser.GameObjects.Graphics;
  private bruteText!: Phaser.GameObjects.Text;
  private algoText!: Phaser.GameObjects.Text;
  private ratioText!: Phaser.GameObjects.Text;

  private readonly tweens: Phaser.Tweens.Tween[] = [];

  constructor(scene: Phaser.Scene, opts: ComplexityMeterOptions) {
    this.scene = scene;
    this.variant = opts.variant ?? 'parchment';
    this.w = opts.width ?? 280;
    this.bruteCost = Math.max(1, opts.bruteCost);
    this.algoCost = Math.max(0, opts.algoCost);
    this.bruteLabel = opts.bruteLabel;
    this.algoLabel = opts.algoLabel;

    this.container = scene.add.container(opts.x, opts.y).setDepth(opts.depth ?? 30);
    this.build();
    this.repaint();

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  setAlgoCost(value: number): void {
    if (value === this.algoCost) return;
    this.algoCost = Math.max(0, value);
    this.repaint();
  }

  setBruteCost(value: number): void {
    this.bruteCost = Math.max(1, value);
    this.repaint();
  }

  setLabels(brute: string, algo: string): void {
    this.bruteLabel = brute;
    this.algoLabel = algo;
    this.repaint();
  }

  /** Refresh both costs + labels in a single call (for round transitions). */
  reset(opts: { bruteCost: number; algoCost: number; bruteLabel?: string; algoLabel?: string }): void {
    this.bruteCost = Math.max(1, opts.bruteCost);
    this.algoCost = Math.max(0, opts.algoCost);
    if (opts.bruteLabel !== undefined) this.bruteLabel = opts.bruteLabel;
    if (opts.algoLabel !== undefined) this.algoLabel = opts.algoLabel;
    this.repaint();
  }

  /** Pulse the chip in gold — used when the round resolves with a win. */
  celebrate(): void {
    this.tweens.push(this.scene.tweens.add({
      targets: this.container,
      scale: { from: 1, to: 1.06 },
      duration: 220,
      yoyo: true,
      ease: 'Quad.easeOut',
    }));
  }

  destroy(): void {
    for (const t of this.tweens) t.stop();
    this.tweens.length = 0;
    this.container.destroy();
  }

  // ──────────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────────

  private palette() {
    return this.variant === 'cosmic' ? COLORS_COSMIC : COLORS_PARCH;
  }

  private build(): void {
    const w = this.w;
    const h = this.h;
    const p = this.palette();

    // Background panel.
    this.bg = this.scene.add.graphics();
    this.bg.fillStyle(p.bg, 0.96);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
    this.bg.lineStyle(2, p.ink, 1);
    this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 4);
    this.bg.lineStyle(1, p.gold, 0.55);
    this.bg.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 3);
    this.container.add(this.bg);

    // Bar (algo vs brute) — drawn dynamically.
    this.bar = this.scene.add.graphics();
    this.container.add(this.bar);

    // Brute and algo labels on opposite ends.
    const cssInk = this.variant === 'cosmic' ? '#e0f8d0' : '#1a1208';
    const cssBrute = this.variant === 'cosmic' ? '#fda4af' : '#a03830';
    const cssAlgo = this.variant === 'cosmic' ? '#86efac' : '#3c8038';
    const cssGold = '#f5b820';

    this.bruteText = this.scene.add.text(-w / 2 + 10, -h / 2 + 6, '', {
      fontSize: '8px',
      fontFamily: '"Press Start 2P", monospace',
      color: cssBrute,
    }).setOrigin(0, 0);
    this.algoText = this.scene.add.text(w / 2 - 10, -h / 2 + 6, '', {
      fontSize: '8px',
      fontFamily: '"Press Start 2P", monospace',
      color: cssAlgo,
    }).setOrigin(1, 0);
    this.ratioText = this.scene.add.text(0, h / 2 - 8, '', {
      fontSize: '9px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: cssGold,
      stroke: cssInk,
      strokeThickness: 1,
    }).setOrigin(0.5, 1);
    this.container.add([this.bruteText, this.algoText, this.ratioText]);
  }

  private repaint(): void {
    const p = this.palette();
    const w = this.w;
    const innerW = w - 24;
    const barY = -2;
    const barH = 6;

    // Bar geometry — algo fills proportional to brute, capped at brute. When
    // algo ≥ brute, the comparison stops being flattering, so we cap the
    // visual at 100% and the ratio text flips colour.
    const ratio = Math.min(1, this.algoCost / Math.max(1, this.bruteCost));
    const algoBarW = innerW * ratio;

    this.bar.clear();
    // Brute base bar.
    this.bar.fillStyle(p.brute, 0.55);
    this.bar.fillRoundedRect(-innerW / 2, barY, innerW, barH, 2);
    // Algo fill bar.
    this.bar.fillStyle(p.algo, 1);
    this.bar.fillRoundedRect(-innerW / 2, barY, algoBarW, barH, 2);
    // Tick at 50%.
    this.bar.lineStyle(1, p.ink, 0.35);
    this.bar.beginPath();
    this.bar.moveTo(0, barY - 2);
    this.bar.lineTo(0, barY + barH + 2);
    this.bar.strokePath();

    this.bruteText.setText(`${this.bruteLabel.toUpperCase()}: ${this.bruteCost}`);
    this.algoText.setText(`${this.algoLabel.toUpperCase()}: ${this.algoCost}`);

    // Ratio caption — encourages the player when they're well under brute,
    // warns when their algo cost has crept up.
    const savings = this.bruteCost - this.algoCost;
    if (savings <= 0) {
      this.ratioText.setText('algorithm cost ≥ brute force — try again');
      this.ratioText.setColor(this.variant === 'cosmic' ? '#fda4af' : '#a03830');
    } else if (this.algoCost === 0) {
      this.ratioText.setText(`brute force would do ${this.bruteCost} · you start at 0`);
      this.ratioText.setColor(this.variant === 'cosmic' ? '#86efac' : '#3c8038');
    } else {
      const factor = (this.bruteCost / Math.max(1, this.algoCost)).toFixed(1);
      this.ratioText.setText(`saved ${savings} steps · ${factor}× speedup`);
      this.ratioText.setColor(this.variant === 'cosmic' ? '#e0f8d0' : '#1a1208');
    }
  }
}
