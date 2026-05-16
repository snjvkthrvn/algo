/**
 * BruteForceActor — Glitch as a visible co-actor during FEEL_IT rounds.
 *
 * Pedagogical purpose (per game_script.md): the player should derive *why*
 * an algorithm works by contrast — not by reading pseudocode upfront. Glitch
 * sits next to the player on the canvas, performs brute-force moves on a
 * slow timer, and racks up a visible move counter that always vastly
 * outpaces the player's intentional moves.
 *
 * This is a teaching primitive, not a HUD chrome element. The tile row,
 * label, and counter all live in the playable surface depth band so the
 * contrast reads as "two agents trying the same problem, one smart and one
 * brute." Each puzzle plugs in its own `BruteForceStrategy` — Bubble Sort
 * uses random-adjacent-swap, Two Sum uses random-pair-pick, Indexing scans
 * from 0, etc.
 *
 * The actor never "wins" by design. Brute force can take a long time on
 * average; the player should finish well before Glitch does. If the strategy
 * does happen to stumble into a solved state (`isSolved` returns true), the
 * actor stops ticking and shows a quiet "Glitch finally got it..." line.
 */

import Phaser from 'phaser';

export interface BruteForceStrategy {
  /** Starting state for Glitch's row. Typically identical to the player's start. */
  readonly initialValues: ReadonlyArray<number>;
  /** Apply one brute-force step. Pure — return the new state, do not mutate. */
  nextMove(values: ReadonlyArray<number>): ReadonlyArray<number>;
  /** Optional. When this returns true, the actor stops ticking. */
  isSolved?(values: ReadonlyArray<number>): boolean;
  /** Optional. Default 900ms — slow enough that the player can read the contrast. */
  readonly tickIntervalMs?: number;
}

export interface BruteForceActorOptions {
  /** Row centerpoint (px). The row of tiles is centered horizontally here. */
  readonly x: number;
  readonly y: number;
  readonly tileWidth?: number;
  readonly tileHeight?: number;
  readonly tileGap?: number;
  readonly strategy: BruteForceStrategy;
  readonly depth?: number;
  /** Heading above the row (default: "GLITCH"). */
  readonly heading?: string;
  /** Subtitle / quote shown below the row. Defaults to "(checking everything)". */
  readonly subtitle?: string;
  /** Diegetic label shown next to the move counter while Glitch is working.
   *  Avoid algorithm vocabulary — e.g. "still flailing" not "still not sorted". */
  readonly notDoneLabel?: string;
  /** Label shown when Glitch's strategy reaches isSolved() true. */
  readonly doneLabel?: string;
  /** Verb used in the counter line. Default "moves". Use "checks" for
   *  scan-style brute force (indexing), "tries" for hashing, etc. Keep
   *  diegetic — not "iterations". */
  readonly verbLabel?: string;
}

const DEFAULT_TICK_MS = 900;
const TILE_DEFAULT_W = 54;
const TILE_DEFAULT_H = 42;
const TILE_DEFAULT_GAP = 8;

const GLITCH_RED = 0xa03830;
const GLITCH_DEEP = 0x4a1a14;
const GLITCH_HIGHLIGHT = 0xd97a3a;

interface ActorTile {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  value: number;
  homeX: number;
}

export class BruteForceActor {
  private readonly scene: Phaser.Scene;
  private readonly tickMs: number;
  private readonly tileW: number;
  private readonly tileH: number;
  private readonly tileGap: number;
  private readonly strategy: BruteForceStrategy;

  private values: number[];
  private moves = 0;
  private stopped = false;
  private animating = false;
  private timer: Phaser.Time.TimerEvent | null = null;

  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly headingText: Phaser.GameObjects.Text;
  private readonly counterText: Phaser.GameObjects.Text;
  private readonly subtitleText: Phaser.GameObjects.Text;
  private readonly notDoneLabel: string;
  private readonly doneLabel: string;
  private readonly verbLabel: string;
  private tiles: ActorTile[] = [];

  constructor(scene: Phaser.Scene, opts: BruteForceActorOptions) {
    this.scene = scene;
    this.strategy = opts.strategy;
    this.tickMs = opts.strategy.tickIntervalMs ?? DEFAULT_TICK_MS;
    this.tileW = opts.tileWidth ?? TILE_DEFAULT_W;
    this.tileH = opts.tileHeight ?? TILE_DEFAULT_H;
    this.tileGap = opts.tileGap ?? TILE_DEFAULT_GAP;
    this.values = [...opts.strategy.initialValues];
    this.notDoneLabel = opts.notDoneLabel ?? 'still flailing';
    this.doneLabel = opts.doneLabel ?? 'finally got it.';
    this.verbLabel = opts.verbLabel ?? 'moves';

    const depth = opts.depth ?? 30;

    // Heading — barn-red, small caps. Matches GlitchCorner variant so Glitch
    // reads as the same character across the canvas.
    this.headingText = scene.add.text(opts.x, opts.y - this.tileH / 2 - 22, opts.heading ?? '⚠ GLITCH', {
      fontSize: '9px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#a03830',
      stroke: '#1a1208',
      strokeThickness: 1,
    }).setOrigin(0.5, 0.5).setDepth(depth);
    this.objects.push(this.headingText);

    // Subtitle quote below the row — italic muted ink, reads as flavour text.
    this.subtitleText = scene.add.text(opts.x, opts.y + this.tileH / 2 + 14, opts.subtitle ?? '(grabbing at random...)', {
      fontSize: '9px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#4a3818',
      fontStyle: 'italic',
    }).setOrigin(0.5, 0.5).setDepth(depth);
    this.objects.push(this.subtitleText);

    // Counter sits to the right of the row.
    this.counterText = scene.add.text(opts.x, opts.y + this.tileH / 2 + 30, this.counterLabel(), {
      fontSize: '10px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#a03830',
      stroke: '#1a1208',
      strokeThickness: 1,
    }).setOrigin(0.5, 0.5).setDepth(depth);
    this.objects.push(this.counterText);

    this.layoutTiles(opts.x, opts.y, depth);
    this.startTicking();

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  private counterLabel(): string {
    const status = this.stopped ? this.doneLabel : this.notDoneLabel;
    return `Glitch's ${this.verbLabel}: ${this.moves} · ${status}`;
  }

  private layoutTiles(centerX: number, centerY: number, depth: number): void {
    const n = this.values.length;
    const rowWidth = n * this.tileW + (n - 1) * this.tileGap;
    const startX = centerX - rowWidth / 2 + this.tileW / 2;

    for (let i = 0; i < n; i++) {
      const x = startX + i * (this.tileW + this.tileGap);
      const container = this.scene.add.container(x, centerY).setDepth(depth);

      const body = this.scene.add.graphics();
      this.paintBody(body, false);

      const label = this.scene.add.text(0, 0, `${this.values[i]}`, {
        fontSize: '18px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#fefce8',
        stroke: '#1a1208',
        strokeThickness: 2,
      }).setOrigin(0.5);

      container.add([body, label]);
      this.objects.push(container);

      this.tiles.push({ container, body, label, value: this.values[i], homeX: x });
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

  private startTicking(): void {
    this.timer = this.scene.time.addEvent({
      delay: this.tickMs,
      loop: true,
      callback: () => this.tick(),
    });
  }

  private tick(): void {
    if (this.stopped) return;
    // Drop ticks while a swap animation is in flight — the tick rate is
    // calibrated for readability, but back-to-back animations would queue
    // up and the player couldn't read individual swaps.
    if (this.animating) return;

    const before = [...this.values];
    const after = this.strategy.nextMove(before);
    this.moves++;

    // Detect a clean two-position swap so we can animate it physically. If
    // the strategy makes a non-swap mutation (rare for sort-style brute
    // force; common for indexing/hashing where Glitch "checks" a slot), we
    // fall back to instant label updates.
    const swap = findSwapPair(before, after);
    if (swap) {
      // Swap path: this.values + isSolved check are deferred into the
      // animation's onComplete, since the visual state arrives only at the
      // end of the tween.
      this.animateSwap(swap[0], swap[1], after);
    } else {
      this.values = [...after];
      for (let i = 0; i < after.length; i++) {
        if (after[i] !== before[i] && this.tiles[i]) {
          this.tiles[i].label.setText(`${after[i]}`);
          this.tiles[i].value = after[i];
          this.paintBody(this.tiles[i].body, true);
          const tile = this.tiles[i];
          this.scene.time.delayedCall(this.tickMs * 0.45, () => {
            if (tile.body.active) this.paintBody(tile.body, false);
          });
        }
      }
      this.checkSolved();
    }

    this.counterText.setText(this.counterLabel());
  }

  /** Stop ticking + show the "solved" subtitle when Glitch's strategy hits
   *  its end condition. Called after every tick's state commits (synchronously
   *  for non-swap paths, in the swap-animation onComplete for swap paths). */
  private checkSolved(): void {
    if (this.stopped) return;
    if (!this.strategy.isSolved?.(this.values)) return;
    this.stopped = true;
    this.timer?.remove();
    this.timer = null;
    this.subtitleText.setText('(only took forever)');
    this.counterText.setText(this.counterLabel());
  }

  /**
   * Physical swap animation: the two tiles' VALUE LABELS arc toward each
   * other's positions (one rising, one falling for visual separation),
   * then get reparented into the other tile's container at completion.
   * The bodies stay anchored — Glitch's slots don't move, the values move
   * between slots. This is the exact mental model of an array swap, and
   * teaches the player the swap mechanic by demonstration.
   */
  private animateSwap(i: number, j: number, after: ReadonlyArray<number>): void {
    const tileI = this.tiles[i];
    const tileJ = this.tiles[j];
    if (!tileI || !tileJ) {
      this.values = [...after];
      return;
    }

    this.animating = true;
    const labelI = tileI.label;
    const labelJ = tileJ.label;
    const dx = tileJ.homeX - tileI.homeX;
    const arcAmount = 14;
    const moveMs = this.tickMs * 0.4;
    const arcMs = this.tickMs * 0.2;

    // Labels travel toward each other — labelI to the right with an up-arc,
    // labelJ to the left with a down-arc, so they pass each other visibly.
    this.scene.tweens.add({
      targets: labelI, x: dx, duration: moveMs, ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: labelI, y: -arcAmount, duration: arcMs, yoyo: true, ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: labelJ, x: -dx, duration: moveMs, ease: 'Sine.easeInOut',
      onComplete: () => {
        // Reparent: labelI moves into tileJ's container, labelJ into tileI's.
        // Local positions reset to (0,0) — world positions stay unchanged
        // because each label's new container is exactly where it arrived.
        if (tileI.container.active && tileJ.container.active) {
          tileI.container.remove(labelI);
          tileJ.container.add(labelI);
          labelI.setPosition(0, 0);

          tileJ.container.remove(labelJ);
          tileI.container.add(labelJ);
          labelJ.setPosition(0, 0);

          // Bookkeeping: the label objects now belong to the swapped slots.
          tileI.label = labelJ;
          tileJ.label = labelI;
          const tmp = tileI.value;
          tileI.value = tileJ.value;
          tileJ.value = tmp;
        }

        this.values = [...after];
        this.animating = false;
        this.checkSolved();
      },
    });
    this.scene.tweens.add({
      targets: labelJ, y: arcAmount, duration: arcMs, yoyo: true, ease: 'Sine.easeInOut',
    });

    // Body flash on both tiles — emphasis on "these two just exchanged".
    this.paintBody(tileI.body, true);
    this.paintBody(tileJ.body, true);
    this.scene.time.delayedCall(moveMs * 0.9, () => {
      if (tileI.body.active) this.paintBody(tileI.body, false);
      if (tileJ.body.active) this.paintBody(tileJ.body, false);
    });
  }

  /** Stops the tick timer and freezes the actor in place. Used for FEEL_IT
   *  completion: when the player finishes their round, Glitch stops so the
   *  contrast lands. */
  freeze(): void {
    this.stopped = true;
    this.timer?.remove();
    this.timer = null;
    const finalLabel = `Glitch's ${this.verbLabel}: ${this.moves} · (you beat them)`;
    this.counterText.setText(finalLabel);
    this.subtitleText.setText('(...you did it differently)');
  }

  getMoves(): number {
    return this.moves;
  }

  /** Tween all visible elements to a target alpha. Used when transitioning
   *  to USE_IT — Glitch recedes into the background after the player has
   *  internalized the brute-force contrast. */
  fadeTo(alpha: number, durationMs = 400): void {
    const targets: Phaser.GameObjects.GameObject[] = [
      this.headingText,
      this.counterText,
      this.subtitleText,
      ...this.tiles.map((t) => t.container),
    ];
    this.scene.tweens.add({
      targets,
      alpha,
      duration: durationMs,
      ease: 'Sine.easeInOut',
    });
  }

  destroy(): void {
    this.stopped = true;
    this.timer?.remove();
    this.timer = null;
    for (const obj of this.objects) {
      if (obj.active) obj.destroy();
    }
    this.objects.length = 0;
    this.tiles.length = 0;
  }
}

/**
 * Detect whether `after` differs from `before` by a clean two-position
 * swap. Returns the [i, j] indices when it is, otherwise null. A clean
 * swap means exactly two positions changed AND those positions' values
 * are mutual exchanges. This is the common case for sort-style brute
 * force strategies; the indexing/hashing strategies fall through to the
 * non-swap path which updates labels instantly.
 */
function findSwapPair(
  before: ReadonlyArray<number>,
  after: ReadonlyArray<number>,
): [number, number] | null {
  if (before.length !== after.length) return null;
  const diffs: number[] = [];
  for (let i = 0; i < before.length; i++) {
    if (before[i] !== after[i]) {
      diffs.push(i);
      if (diffs.length > 2) return null;
    }
  }
  if (diffs.length !== 2) return null;
  const [a, b] = diffs;
  if (before[a] === after[b] && before[b] === after[a]) return [a, b];
  return null;
}
