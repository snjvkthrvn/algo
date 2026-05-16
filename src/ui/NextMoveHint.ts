/**
 * NextMoveHint — a glowing on-board affordance for the algorithm's next move.
 *
 * The puzzles already surface the "next action" in side panels, but the side
 * panel is text and the player's eye is on the board. NextMoveHint draws a
 * pulsing arrow or target marker *directly above the cell* the algorithm
 * forces, so the player sees the move before they have to think about it.
 *
 * This is the "algorithm visualisation during play" upgrade — it doesn't
 * remove difficulty, it just bridges the gap between "I see the trace" and
 * "I see what to click". The marker fades when the move is no longer the
 * forced one and never appears when the puzzle is already complete.
 *
 * Three styles, indexed by `kind`:
 *   'down-arrow' — a downward chevron (use over a single tile/cell).
 *   'swap-pair'  — two arrows pointing at each other between two tiles.
 *   'pulse-ring' — a concentric ring (use on cursor positions).
 *
 * The widget is stateless across rounds — call `setTarget()` whenever the
 * algorithm's forced move changes; pass `null` to hide it.
 */

import Phaser from 'phaser';

export type HintKind = 'down-arrow' | 'swap-pair' | 'pulse-ring';
export type HintTone = 'gold' | 'cyan' | 'green';

export interface HintTarget {
  readonly kind: HintKind;
  /** Centre of the marker (for arrow/ring) or LEFT tile of a swap pair. */
  readonly x: number;
  readonly y: number;
  /** swap-pair only — second tile's centre. */
  readonly x2?: number;
  /** Label shown next to the marker; e.g. "SWAP" or "L→". Optional. */
  readonly label?: string;
}

export interface NextMoveHintOptions {
  readonly tone?: HintTone;
  readonly depth?: number;
}

const TONE_COLOR: Record<HintTone, number> = {
  gold: 0xf5b820,
  cyan: 0x22d3ee,
  green: 0x86efac,
};

export class NextMoveHint {
  private readonly scene: Phaser.Scene;
  private readonly tone: HintTone;
  private readonly color: number;
  private readonly depth: number;

  private container: Phaser.GameObjects.Container | null = null;
  private tween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, opts: NextMoveHintOptions = {}) {
    this.scene = scene;
    this.tone = opts.tone ?? 'gold';
    this.color = TONE_COLOR[this.tone];
    this.depth = opts.depth ?? 30;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clear());
  }

  /** Show or move the hint. Pass `null` to hide it. */
  setTarget(target: HintTarget | null): void {
    this.clear();
    if (!target) return;
    this.container = this.scene.add.container(0, 0).setDepth(this.depth);
    switch (target.kind) {
      case 'down-arrow':
        this.drawDownArrow(target);
        break;
      case 'swap-pair':
        this.drawSwapPair(target);
        break;
      case 'pulse-ring':
        this.drawPulseRing(target);
        break;
    }
  }

  /** Remove any active marker. */
  clear(): void {
    if (this.tween) {
      this.tween.stop();
      this.tween = null;
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Variants
  // ──────────────────────────────────────────────────────────────────

  private drawDownArrow(t: HintTarget): void {
    if (!this.container) return;
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(this.color, 0.85);
    gfx.fillTriangle(0, 12, -10, -4, 10, -4);
    gfx.lineStyle(1.5, 0x081820, 0.85);
    gfx.strokeTriangle(0, 12, -10, -4, 10, -4);
    this.container.add(gfx);
    this.container.setPosition(t.x, t.y - 24);

    if (t.label) this.attachLabel(t.label, 0, -14);

    this.tween = this.scene.tweens.add({
      targets: this.container,
      y: { from: t.y - 24, to: t.y - 32 },
      alpha: { from: 1, to: 0.62 },
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawSwapPair(t: HintTarget): void {
    if (!this.container || t.x2 === undefined) return;
    const cx = (t.x + t.x2) / 2;
    const half = (t.x2 - t.x) / 2;
    const gfx = this.scene.add.graphics();
    // Two arrows pointing toward the centre.
    gfx.fillStyle(this.color, 0.85);
    gfx.fillTriangle(-half + 6, 0, -half + 14, -6, -half + 14, 6);
    gfx.fillTriangle(half - 6, 0, half - 14, -6, half - 14, 6);
    gfx.lineStyle(1.5, 0x081820, 0.85);
    gfx.strokeTriangle(-half + 6, 0, -half + 14, -6, -half + 14, 6);
    gfx.strokeTriangle(half - 6, 0, half - 14, -6, half - 14, 6);
    // Connecting bar.
    gfx.lineStyle(2, this.color, 0.7);
    gfx.beginPath();
    gfx.moveTo(-half + 14, 0);
    gfx.lineTo(half - 14, 0);
    gfx.strokePath();
    this.container.add(gfx);
    this.container.setPosition(cx, t.y - 18);

    if (t.label) this.attachLabel(t.label, 0, -14);

    this.tween = this.scene.tweens.add({
      targets: gfx,
      scaleX: { from: 0.96, to: 1.08 },
      alpha: { from: 1, to: 0.65 },
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawPulseRing(t: HintTarget): void {
    if (!this.container) return;
    const ring = this.scene.add.circle(0, 0, 14, this.color, 0)
      .setStrokeStyle(2, this.color, 0.85);
    this.container.add(ring);
    this.container.setPosition(t.x, t.y);

    if (t.label) this.attachLabel(t.label, 0, -22);

    this.tween = this.scene.tweens.add({
      targets: ring,
      scale: { from: 1, to: 1.6 },
      alpha: { from: 0.85, to: 0 },
      duration: 900,
      repeat: -1,
      ease: 'Sine.easeOut',
    });
  }

  private attachLabel(text: string, dx: number, dy: number): void {
    if (!this.container) return;
    const pad = 4;
    const txt = this.scene.add.text(dx, dy, text.toUpperCase(), {
      fontSize: '8px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#081820',
    }).setOrigin(0.5);
    const w = txt.width + pad * 2;
    const h = txt.height + pad * 2;
    const bg = this.scene.add.rectangle(dx, dy, w, h, this.color, 0.95)
      .setStrokeStyle(1, 0x081820, 1);
    // Insert below the text by adding bg first, then txt.
    this.container.addAt(bg, 0);
    this.container.add(txt);
  }
}
