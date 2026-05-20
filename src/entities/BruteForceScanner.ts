/**
 * BruteForceScanner — Glitch as visible scanning co-actor during FEEL_IT
 * rounds for SCAN-style puzzles (indexing, hashing, find-by-search).
 *
 * Sister primitive to BruteForceActor. BruteForceActor handles brute force
 * that MUTATES state (sort: random adjacent swap). BruteForceScanner handles
 * brute force that ITERATES through positions (indexing: check basket 0,
 * then 1, then 2, ..., until found). The visual metaphors differ enough
 * that one primitive trying to cover both ends up bubble-sort-shaped.
 *
 * Visual: a horizontal row of slots, each with a label. A glowing cursor
 * walks across slots on each tick, highlighting the current slot's body.
 * Counter ticks up per check. When the cursor lands on the target slot,
 * the scanner freezes with a "finally got it" label.
 *
 * Same diegetic-vocabulary conventions as BruteForceActor: verbLabel,
 * notDoneLabel, doneLabel are all configurable so callers can keep
 * Glitch's voice consistent per region.
 */

import Phaser from 'phaser';

export interface BruteForceScannerOptions {
  /** Row centerpoint (px). The row is centered horizontally on x. */
  readonly x: number;
  readonly y: number;
  /** Number of slots Glitch will scan through. */
  readonly slotCount: number;
  /** Per-slot label (e.g. "0", "1", "2"... or item names). Length must match slotCount. */
  readonly slotLabels: ReadonlyArray<string>;
  /** Slot index Glitch is scanning toward. Scanner freezes when cursor lands here. */
  readonly target: number;
  readonly tileWidth?: number;
  readonly tileHeight?: number;
  readonly tileGap?: number;
  readonly depth?: number;
  readonly heading?: string;
  readonly subtitle?: string;
  /** Status label while Glitch is still scanning. Default: "still searching". */
  readonly notDoneLabel?: string;
  /** Status label once Glitch reaches the target. Default: "finally got it.". */
  readonly doneLabel?: string;
  /** Verb in the counter line. Default "checks". Examples: "tries", "scans". */
  readonly verbLabel?: string;
  readonly tickIntervalMs?: number;
}

const DEFAULT_TICK_MS = 700;
const TILE_DEFAULT_W = 48;
const TILE_DEFAULT_H = 38;
const TILE_DEFAULT_GAP = 6;

const GLITCH_RED = 0xa03830;
const GLITCH_DEEP = 0x4a1a14;
const GLITCH_HIGHLIGHT = 0xd97a3a;
const CURSOR_GOLD = 0xfbbf24;

interface ScannerSlot {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

export class BruteForceScanner {
  private readonly scene: Phaser.Scene;
  private readonly tileW: number;
  private readonly tileH: number;
  private readonly tileGap: number;
  private readonly tickMs: number;
  private readonly slotCount: number;
  private readonly target: number;
  private readonly verbLabel: string;
  private readonly notDoneLabel: string;
  private readonly doneLabel: string;

  private cursorIndex = -1;
  private checks = 0;
  private stopped = false;
  private timer: Phaser.Time.TimerEvent | null = null;

  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly headingText: Phaser.GameObjects.Text;
  private readonly subtitleText: Phaser.GameObjects.Text;
  private readonly counterText: Phaser.GameObjects.Text;
  private readonly cursor: Phaser.GameObjects.Triangle;
  private slots: ScannerSlot[] = [];

  constructor(scene: Phaser.Scene, opts: BruteForceScannerOptions) {
    if (opts.slotLabels.length !== opts.slotCount) {
      throw new Error(
        `BruteForceScanner: slotLabels.length (${opts.slotLabels.length}) must equal slotCount (${opts.slotCount})`,
      );
    }
    this.scene = scene;
    this.tileW = opts.tileWidth ?? TILE_DEFAULT_W;
    this.tileH = opts.tileHeight ?? TILE_DEFAULT_H;
    this.tileGap = opts.tileGap ?? TILE_DEFAULT_GAP;
    this.tickMs = opts.tickIntervalMs ?? DEFAULT_TICK_MS;
    this.slotCount = opts.slotCount;
    this.target = opts.target;
    this.verbLabel = opts.verbLabel ?? 'checks';
    this.notDoneLabel = opts.notDoneLabel ?? 'still searching';
    this.doneLabel = opts.doneLabel ?? 'finally got it.';

    const depth = opts.depth ?? 30;

    this.headingText = scene.add.text(opts.x, opts.y - this.tileH / 2 - 22, opts.heading ?? '⚠ GLITCH', {
      fontSize: '9px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#a03830',
      stroke: '#1a1208',
      strokeThickness: 1,
    }).setOrigin(0.5, 0.5).setDepth(depth);
    this.objects.push(this.headingText);

    this.subtitleText = scene.add.text(opts.x, opts.y + this.tileH / 2 + 14, opts.subtitle ?? '(checking one by one...)', {
      fontSize: '9px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#4a3818',
      fontStyle: 'italic',
    }).setOrigin(0.5, 0.5).setDepth(depth);
    this.objects.push(this.subtitleText);

    this.counterText = scene.add.text(opts.x, opts.y + this.tileH / 2 + 30, this.counterLabel(), {
      fontSize: '10px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#a03830',
      stroke: '#1a1208',
      strokeThickness: 1,
    }).setOrigin(0.5, 0.5).setDepth(depth);
    this.objects.push(this.counterText);

    this.layoutSlots(opts.x, opts.y, depth, opts.slotLabels);

    // Cursor triangle — gold arrowhead pointing down at the current slot.
    // Starts off-screen (no slot scanned yet). Repositioned on each tick.
    this.cursor = scene.add.triangle(
      -100, opts.y - this.tileH / 2 - 6,
      0, 0,
      10, -12,
      -10, -12,
      CURSOR_GOLD,
    ).setDepth(depth + 1);
    this.objects.push(this.cursor);
    // Pulse the cursor so it draws the eye even when stationary between
    // ticks. (Stationary because each tick lasts ~tickMs.)
    scene.tweens.add({
      targets: this.cursor,
      scale: 0.78,
      duration: this.tickMs * 0.5,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.startTicking();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  private layoutSlots(centerX: number, centerY: number, depth: number, labels: ReadonlyArray<string>): void {
    const n = this.slotCount;
    const rowWidth = n * this.tileW + (n - 1) * this.tileGap;
    const startX = centerX - rowWidth / 2 + this.tileW / 2;

    for (let i = 0; i < n; i++) {
      const x = startX + i * (this.tileW + this.tileGap);
      const container = this.scene.add.container(x, centerY).setDepth(depth);

      const body = this.scene.add.graphics();
      this.paintBody(body, false);

      const label = this.scene.add.text(0, 0, labels[i], {
        fontSize: '13px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#fefce8',
        stroke: '#1a1208',
        strokeThickness: 2,
      }).setOrigin(0.5);

      container.add([body, label]);
      this.objects.push(container);
      this.slots.push({ container, body, label });
    }
  }

  private paintBody(g: Phaser.GameObjects.Graphics, highlighted: boolean): void {
    g.clear();
    const w = this.tileW;
    const h = this.tileH;
    g.fillStyle(highlighted ? GLITCH_HIGHLIGHT : GLITCH_DEEP, 1);
    g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle(GLITCH_RED, 0.55);
    g.fillRect(-w / 2, -h / 2, w, 4);
    g.lineStyle(2, GLITCH_RED, highlighted ? 1 : 0.85);
    g.strokeRect(-w / 2, -h / 2, w, h);
  }

  private counterLabel(): string {
    const status = this.stopped ? this.doneLabel : this.notDoneLabel;
    return `Glitch's ${this.verbLabel}: ${this.checks} · ${status}`;
  }

  private startTicking(): void {
    this.timer = this.scene.time.addEvent({
      delay: this.tickMs,
      loop: true,
      callback: () => this.tick(),
    });
  }

  private tick(): void {
    if (this.stopped) return;

    // Advance the cursor. We don't wrap — Glitch scans linearly from 0
    // through slotCount-1. If they ran off the end without finding the
    // target (shouldn't happen given target is always in-range), they
    // restart from 0.
    this.cursorIndex = (this.cursorIndex + 1) % this.slotCount;
    this.checks++;

    // Snap the cursor triangle above the current slot.
    const slot = this.slots[this.cursorIndex];
    if (slot) {
      this.cursor.x = slot.container.x;
      // Brief body flash on the slot being checked.
      this.paintBody(slot.body, true);
      const flashed = slot;
      this.scene.time.delayedCall(this.tickMs * 0.45, () => {
        if (flashed.body.active) this.paintBody(flashed.body, false);
      });
    }

    this.counterText.setText(this.counterLabel());

    if (this.cursorIndex === this.target) {
      this.stopped = true;
      this.timer?.remove();
      this.timer = null;
      this.subtitleText.setText('(took everything they had)');
      this.counterText.setText(this.counterLabel());
      // Keep the matching slot lit so the contrast lands — Glitch
      // eventually got there, but at N checks instead of 1.
      if (slot) this.paintBody(slot.body, true);
    }
  }

  /** Tween elements to a target alpha — used when transitioning to USE_IT
   *  so Glitch recedes after teaching the contrast. */
  fadeTo(alpha: number, durationMs = 400): void {
    const targets: Phaser.GameObjects.GameObject[] = [
      this.headingText,
      this.subtitleText,
      this.counterText,
      this.cursor,
      ...this.slots.map((s) => s.container),
    ];
    this.scene.tweens.add({ targets, alpha, duration: durationMs, ease: 'Sine.easeInOut' });
  }

  /** Stop scanning immediately and show "you beat them" — fired by the
   *  puzzle scene when the player completes the round before Glitch does. */
  freeze(): void {
    this.stopped = true;
    this.timer?.remove();
    this.timer = null;
    this.counterText.setText(`Glitch's ${this.verbLabel}: ${this.checks} · (you beat them)`);
    this.subtitleText.setText('(...you didn\'t even check)');
  }

  getChecks(): number {
    return this.checks;
  }

  destroy(): void {
    this.stopped = true;
    this.timer?.remove();
    this.timer = null;
    for (const obj of this.objects) {
      if (obj.active) obj.destroy();
    }
    this.objects.length = 0;
    this.slots.length = 0;
  }
}
