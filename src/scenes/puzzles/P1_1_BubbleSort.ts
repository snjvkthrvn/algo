/**
 * P1_1_BubbleSort — "Fix the Farmland" (AP_1)
 *
 * Visual overhaul (round 2):
 *   • Region ambience layer (farmland dust motes + soft floor haze).
 *   • Tilled-soil tile bodies with horizontal furrow grain + a crop sprout
 *     above each tile whose stem height tracks the value. Small values look
 *     like seedlings, large values look like tall stalks. Sorting reads as
 *     "I am arranging the row from shortest to tallest".
 *   • Compare-pair highlight: the two focus tiles get a sun-ray rim + a
 *     pulsing cyan caret between them.
 *   • Lock-in cascade: every tile blooms a flower head when the round resolves.
 *   • Single consolidated top strip (badge + swap counter), not three pills.
 *   • Cinematic RoundBanner card between rounds.
 *
 * Gameplay rules unchanged: 3 rounds of bubble sort (4 / 6 / 8 tiles),
 * compare-pair highlight, no fail-on-time, stars from mistakes + hints.
 */

import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { audioManager } from '../../core/AudioManager';
import { JuiceSystem } from '../../systems/JuiceSystem';
import { BitHint } from '../../entities/BitHint';
import { drawPanel } from '../../ui/panel';
import { PuzzleAmbience } from '../../ui/PuzzleAmbience';
import { PuzzlePreviewSidePanel } from '../../ui/PuzzlePreviewSidePanel';
import { showRoundBanner } from '../../ui/RoundBanner';
import { BitCompanion } from '../../ui/BitCompanion';
import { ComplexityMeter } from '../../ui/ComplexityMeter';
import { NextMoveHint } from '../../ui/NextMoveHint';
import { AlgorithmTrace } from '../../ui/AlgorithmTrace';
import { ARRAY_PLAINS_PUZZLE_THEME, type PuzzleTheme } from './puzzleTheme';
import type { RegionBackdropId, RegionBackdropOptions } from '../../ui/RegionBackdrop';
import {
  BUBBLE_SORT_ROUNDS,
  firstInversionIndex,
  isSortedAscending,
  starsFromMistakesAndHints,
  swapAdjacent,
  withOptimalityPenalty,
} from '../../data/puzzles/arrayPlainsPuzzleLogic';
import { showLessonCard } from '../../ui/LessonCard';
import { showRoundRecap } from '../../ui/RoundRecap';
import { buildBubbleSortPreview } from '../../data/puzzles/puzzlePreviewLogic';
import { numberKeyToIndex } from '../../input/NumberKeyCommand';
import { BruteForceActor, type BruteForceStrategy } from '../../entities/BruteForceActor';
import { PuzzlePhase } from '../../data/types';

interface SortTile {
  value: number;
  /** Tile-root container (translates left/right). */
  container: Phaser.GameObjects.Container;
  /** Soil body graphics — repainted on highlight / lock-in. */
  soil: Phaser.GameObjects.Graphics;
  /** Numeral label sitting on the soil. */
  label: Phaser.GameObjects.Text;
  /** Crop sprout sitting above the tile (stem + leaves). */
  sprout: Phaser.GameObjects.Graphics;
  /** Compare caret carat over the left tile of the focus pair. */
  caret: Phaser.GameObjects.Text;
  /** Ground-line shadow at the tile's home x (never moves). */
  shadow: Phaser.GameObjects.Ellipse;
  /** Hit zone for clicks (matches the soil body). */
  hit: Phaser.GameObjects.Rectangle;
}

const TILE_W = 72;
const TILE_H = 56;
const TILE_GAP = 10;
const SPROUT_BASE = 4;
const SPROUT_PER_VALUE = 3.8;

export class P1_1_BubbleSort extends BasePuzzleScene {
  private roundIndex = 0;
  private values: number[] = [];
  private tiles: SortTile[] = [];
  private mistakesTotal = 0;
  private isResolving = false;
  private actionLocked = false;

  private bitHint: BitHint | null = null;
  private statusStrip!: Phaser.GameObjects.Text;
  private currentSwaps = 0;
  private lastPreviewAction = 'none';
  /**
   * Live algorithm trace replacing the previous static pseudocode block. The
   * trace shows the current `i`, `a[i]`, `a[i+1]` bindings and the entire
   * array as the player acts — bubble sort becomes a moment-to-moment
   * conversation between code and board.
   */
  private trace: AlgorithmTrace | null = null;
  private currentSweepLine = 0;
  private groundLine!: Phaser.GameObjects.Graphics;
  private rowY = 0;
  private preview: PuzzlePreviewSidePanel | null = null;
  /**
   * Live brute-force-vs-algo comparison chip. For Bubble Sort, the
   * inversion count is BOTH the optimal swap count AND the worst-case
   * cost (since a fully reversed row has n(n−1)/2 inversions). Comparing
   * the player's swap count to the inversion count gives a real-time
   * "are you wasting swaps?" readout.
   */
  private complexity: ComplexityMeter | null = null;
  /** Glowing swap-pair indicator placed over the leftmost inversion. */
  private hint: NextMoveHint | null = null;
  /** Glitch as visible co-actor during FEEL_IT round 1. Null in USE_IT rounds. */
  private bruteForce: BruteForceActor | null = null;
  /** True between FEEL_IT round completion and USE_IT round mount. Guards
   *  against re-firing the NAME_IT beat on restart. */
  private namedYet = false;
  /** Diegetic control affordance — visible during FEEL_IT round 1 only, fades
   *  on first player interaction. Tells the player HOW to act without naming
   *  the algorithm (no "swap neighbours" / "sort"). */
  private affordancePrompt: Phaser.GameObjects.Text | null = null;
  private affordanceFaded = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_1 });
    this.puzzleId = 'ap_1';
    this.puzzleName = 'Fix the Farmland';
    this.puzzleDescription = 'Swap neighbour furrows until the row stands shortest to tallest.';
  }

  create(): void {
    // FEEL_IT first-principles guard: strip the mechanic prescription out of
    // the title-bar subtitle when round 0 is FEEL_IT. The player is meant to
    // discover that adjacent swaps work — we shouldn't be naming the
    // mechanic in the chrome before they've played.
    if (BUBBLE_SORT_ROUNDS[0].lesson.phase === PuzzlePhase.FEEL_IT) {
      this.puzzleDescription = 'The furrows grew out of order. Make them stand shortest to tallest.';
    }
    super.create();
    // Light particle haze layered on top of the new procedural backdrop —
    // RegionBackdrop already paints the farmstead scenery, so PuzzleAmbience
    // stays at low intensity just to keep dust drifting in the foreground.
    new PuzzleAmbience(this, 'farmland', { intensity: 0.4 });

    const { width } = this.cameras.main;
    this.rowY = this.cameras.main.height / 2 + 36;
    this.buildGroundLine(width);
    this.buildTopStrip(width);

    // BitCompanion is universal — present in all phases (fictional character,
    // no algorithm leak). All other teaching panels (pseudocode trace, sort
    // preview, complexity meter, hint arrow) mount per-phase via
    // mountUseItPanels(). FEEL_IT mounts a BruteForceActor instead.
    new BitCompanion(this, { stage: 'byte', x: width - 92, y: 100, depth: 40 });

    this.startRound(0).catch(() => undefined);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bitHint?.destroy();
      this.bitHint = null;
      this.preview?.destroy();
      this.preview = null;
      this.bruteForce?.destroy();
      this.bruteForce = null;
      this.affordancePrompt?.destroy();
      this.affordancePrompt = null;
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.isResolving || this.actionLocked) return;
      const left = numberKeyToIndex(event.key, this.values.length - 1);
      if (left !== null) this.trySwap(left);
    });
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.ARRAY_PLAINS_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0;
  }
  protected getPuzzleTheme(): PuzzleTheme {
    return ARRAY_PLAINS_PUZZLE_THEME;
  }
  protected getRegionBackdrop(): { id: RegionBackdropId; options?: RegionBackdropOptions } | null {
    return { id: 'array-plains', options: { intensity: 1 } };
  }

  // ──────────────────────────────────────────────────────────────────
  // Chrome
  // ──────────────────────────────────────────────────────────────────

  private buildGroundLine(width: number): void {
    this.groundLine = this.add.graphics().setDepth(8);
    this.repaintGroundLine(width);
  }

  private repaintGroundLine(width: number): void {
    const g = this.groundLine;
    g.clear();
    const y = this.rowY + TILE_H / 2 + 6;
    // Dark soil bar
    g.fillStyle(0x3a2418, 0.85);
    g.fillRect(60, y, width - 120, 14);
    // Light topsoil highlight
    g.fillStyle(0x6e4524, 0.55);
    g.fillRect(60, y, width - 120, 3);
    // Furrow marks
    g.lineStyle(1, 0x1f120a, 0.55);
    for (let x = 80; x < width - 60; x += 18) {
      g.beginPath();
      g.moveTo(x, y + 4);
      g.lineTo(x + 6, y + 10);
      g.strokePath();
    }
  }

  private buildTopStrip(width: number): void {
    // Single dark strip across the top with badge + swap counter.
    drawPanel(this, width / 2 - 280, 158, 560, 30, {
      depth: 16, fill: 0x081820, frame: COLORS.CYAN_GLOW, inner: 0x346856, alpha: 0.92,
    });
    this.statusStrip = this.add.text(width / 2, 173, '', {
      fontSize: '11px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
      stroke: '#06b6d4',
      strokeThickness: 1,
    }).setOrigin(0.5).setDepth(20);
  }

  private buildPseudocodePanel(width: number): void {
    // Live AlgorithmTrace — every line that references variables ({i},
    // {lhs}, {rhs}, {arr}, {swaps}) updates whenever bindTraceState runs.
    // This converts the previously-static pseudocode panel into a live
    // debugger view of bubble sort.
    this.trace = new AlgorithmTrace(this, {
      x: 70,
      y: 250,
      width: 230,
      title: 'bubbleSort(arr)',
      lines: [
        'for pass = 1..n-1',
        '  for i = 0..n-2',
        '    i = {i}, a[i] = {lhs}, a[i+1] = {rhs}',
        '    if a[i] > a[i+1]: swap',
        '  ── pass complete ──',
        'arr = {arr}  (swaps {swaps})',
      ],
    });
    this.bindTraceState();
    void width;
  }

  /**
   * Push the current scene state into the AlgorithmTrace's bindings so
   * every {var} placeholder shows live values. Called after every
   * focus change, swap, or inspect.
   */
  private bindTraceState(): void {
    if (!this.trace) return;
    const i = firstInversionIndex(this.values);
    const lhs = i >= 0 ? this.values[i] : null;
    const rhs = i >= 0 ? this.values[i + 1] : null;
    this.trace.bindState({
      i: i >= 0 ? i : 'sorted',
      lhs,
      rhs,
      arr: `[${this.values.join(', ')}]`,
      swaps: this.currentSwaps,
    });
  }

  private updateStatusStrip(): void {
    const round = BUBBLE_SORT_ROUNDS[this.roundIndex];
    const isFeelIt = round.lesson.phase === PuzzlePhase.FEEL_IT;
    // FEEL_IT strips "OPTIMAL" / "SWAPS" vocabulary — the player shouldn't
    // know there's an algorithmic best answer until NAME_IT names the
    // pattern. Diegetic move count only.
    const status = isFeelIt
      ? `ROUND ${this.roundIndex + 1}/${BUBBLE_SORT_ROUNDS.length} · ${this.currentSwaps} ${this.currentSwaps === 1 ? 'move' : 'moves'}`
      : `ROUND ${this.roundIndex + 1}/${BUBBLE_SORT_ROUNDS.length} · ${round.label}   ·   SWAPS ${this.currentSwaps} / OPTIMAL ${round.optimalSwaps}`;
    this.statusStrip.setText(status);
    this.refreshPreview();
  }

  private refreshPreview(): void {
    if (!this.preview) return;
    const round = BUBBLE_SORT_ROUNDS[this.roundIndex];
    const preview = buildBubbleSortPreview({
      values: this.values,
      compareIndex: firstInversionIndex(this.values),
      swaps: this.currentSwaps,
      optimalSwaps: round.optimalSwaps,
      lastAction: this.lastPreviewAction,
    });
    this.preview.setState(preview.state);
    this.preview.setNextAction(preview.next);
  }

  // ──────────────────────────────────────────────────────────────────
  // Round lifecycle
  // ──────────────────────────────────────────────────────────────────

  private async startRound(idx: number): Promise<void> {
    this.roundIndex = idx;
    const round = BUBBLE_SORT_ROUNDS[idx];
    this.values = [...round.values];
    this.currentSwaps = 0;
    this.lastPreviewAction = 'round start';
    this.currentSweepLine = 0;
    this.isResolving = true; // unblocked after lesson + banner
    this.actionLocked = false;

    const isFeelIt = round.lesson.phase === PuzzlePhase.FEEL_IT;
    if (isFeelIt) {
      this.mountFeelItPanels();
    } else {
      this.mountUseItPanels();
      // Coming from FEEL_IT into USE_IT — fade Glitch out of focus instead of
      // destroying. The contrast read in round 1 is the *reason* round 2's
      // pseudocode lands; keeping Glitch dim-visible cements that they're
      // still the worse approach.
      this.bruteForce?.fadeTo(0.32);
    }

    this.complexity?.reset({
      bruteCost: round.optimalSwaps,
      algoCost: 0,
      bruteLabel: 'inversions',
      algoLabel: 'your swaps',
    });

    this.updateStatusStrip();
    if (this.trace) this.updatePseudocode(false);
    this.layoutTiles();
    this.refreshHints();

    this.bitHint?.destroy();
    this.bitHint = null;
    // FEEL_IT suppresses BitHint entirely — Bit pointing at the leftmost
    // inversion is the algorithm telling the player which pair to look at,
    // which violates the derive-it-yourself contract. BitHint returns in
    // USE_IT, where Bit becomes a legitimate guide for the named pattern.
    if (!this.isFeelItRound()) {
      const firstTile = this.tiles[0];
      if (firstTile) {
        this.bitHint = new BitHint(this, firstTile.container.x - 56, firstTile.container.y - 60);
        this.bitHint.showWarm();
      }
    }

    // Surface the per-round lesson card. In FEEL_IT this is the diegetic
    // "Fix the row" copy (no algorithm name). In USE_IT it's the formal
    // pedagogical block ("Bubble Sort · Round 2 · Twist").
    await showLessonCard(this, round.lesson, 'parchment');

    await showRoundBanner(this, {
      label: `ROUND ${idx + 1} / ${BUBBLE_SORT_ROUNDS.length}`,
      subtitle: `${round.label}  ·  sort ${round.values.length} furrows ascending`,
      accent: idx === BUBBLE_SORT_ROUNDS.length - 1 ? COLORS.GOLD_ACCENT : COLORS.CYAN_GLOW,
    });

    this.isResolving = false;
  }

  /** FEEL_IT mounts: only the brute-force co-actor. NO pseudocode, NO state
   *  preview, NO algorithm-named complexity meter, NO guided arrows. The
   *  player has to derive the heuristic from contrast — that's the whole
   *  pedagogical point. */
  private mountFeelItPanels(): void {
    if (this.bruteForce) return;
    const { width } = this.cameras.main;
    const round = BUBBLE_SORT_ROUNDS[this.roundIndex];
    // Glitch's row sits above the player's, in the vertical band the
    // pseudocode panel will eventually occupy when round 2 begins.
    const glitchRowY = this.rowY - 160;
    this.bruteForce = new BruteForceActor(this, {
      x: width / 2,
      y: glitchRowY,
      strategy: makeBubbleSortBruteStrategy(round.values),
      heading: "⚠ GLITCH'S ROW",
      subtitle: '(grabbing furrows at random...)',
      notDoneLabel: 'still in chaos',
      doneLabel: 'somehow got there',
      depth: 28,
    });

    // Diegetic control affordance — sits in the neutral band between Glitch
    // (above) and the player's row (below). Pulses gently to draw attention,
    // fades the moment the player makes their first interaction.
    const promptY = this.rowY - TILE_H / 2 - 22;
    this.affordancePrompt = this.add.text(width / 2, promptY,
      'Tap a furrow. Its neighbour will trade places.',
      {
        fontSize: '11px',
        fontFamily: '"IBM Plex Mono", monospace',
        color: '#88c070',
        fontStyle: 'italic',
        stroke: '#081820',
        strokeThickness: 2,
      },
    ).setOrigin(0.5, 0.5).setDepth(40);
    this.tweens.add({
      targets: this.affordancePrompt,
      alpha: 0.6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** USE_IT mounts: the full teaching toolkit (idempotent — safe to call on
   *  every round-2-onward start). */
  private mountUseItPanels(): void {
    const { width } = this.cameras.main;
    if (!this.trace) this.buildPseudocodePanel(width);
    if (!this.preview) {
      this.preview = new PuzzlePreviewSidePanel(this, { side: 'right', yOffset: -12 });
      this.preview.setTitle('SORT PREVIEW');
      this.preview.show();
    }
    if (!this.complexity) {
      this.complexity = new ComplexityMeter(this, {
        x: width / 2, y: 218,
        width: 320,
        bruteLabel: 'inversions',
        bruteCost: BUBBLE_SORT_ROUNDS[this.roundIndex].optimalSwaps,
        algoLabel: 'your swaps',
        algoCost: 0,
        variant: 'parchment',
        depth: 40,
      });
    }
    if (!this.hint) this.hint = new NextMoveHint(this, { tone: 'gold', depth: 45 });
  }

  // showNameItBeat lifted to BasePuzzleScene.

  private layoutTiles(): void {
    this.tiles.forEach((t) => {
      t.container.destroy();
      t.shadow.destroy();
    });
    this.tiles = [];

    const { width } = this.cameras.main;
    const n = this.values.length;
    const rowWidth = n * TILE_W + (n - 1) * TILE_GAP;
    const startX = width / 2 - rowWidth / 2 + TILE_W / 2;

    for (let i = 0; i < n; i++) {
      const x = startX + i * (TILE_W + TILE_GAP);
      const tile = this.createTile(x, this.rowY, this.values[i], i);
      // Entrance: drop in from above with stagger.
      tile.container.y = this.rowY - 60;
      tile.container.setAlpha(0);
      this.tweens.add({
        targets: tile.container,
        y: this.rowY,
        alpha: 1,
        duration: 320,
        delay: i * 60,
        ease: 'Back.easeOut',
      });
      this.tiles.push(tile);
    }
  }

  /** Phase helper — true when the current round is FEEL_IT. Used to gate
   *  algorithmic hand-holding (compare carets, index labels, focus
   *  arrows) that violate the first-principles "no naming before doing"
   *  contract. */
  private isFeelItRound(): boolean {
    return BUBBLE_SORT_ROUNDS[this.roundIndex]?.lesson.phase === PuzzlePhase.FEEL_IT;
  }

  private createTile(x: number, y: number, value: number, index: number): SortTile {
    // Anchored "footprint" shadow at the home position — never moves.
    const shadow = this.add.ellipse(x, y + TILE_H / 2 + 12, TILE_W + 6, 6, 0x000000, 0.42).setDepth(9);

    const container = this.add.container(x, y).setDepth(30);

    // Soil body — drawn dynamically so we can repaint on highlight states.
    const soil = this.add.graphics();
    this.paintSoil(soil, 'idle');

    const label = this.add.text(0, 0, `${value}`, {
      fontSize: '22px',
      fontFamily: FONTS.RETRO,
      color: '#fefce8',
      stroke: '#081820',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Index labels [1][2][3] are zero-indexed array vocabulary — gated to
    // USE_IT so they don't leak the "arrays have indices" framing during
    // FEEL_IT (player should derive the row-as-sequence framing).
    const showIndex = !this.isFeelItRound() && index < this.values.length - 1;
    const key = this.add.text(0, TILE_H / 2 + 14, showIndex ? `[${index + 1}]` : '', {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
    }).setOrigin(0.5);

    const caret = this.add.text(TILE_W / 2 + TILE_GAP / 2, -TILE_H / 2 - 20, '▼', {
      fontSize: '14px',
      fontFamily: FONTS.RETRO,
      color: '#06b6d4',
    }).setOrigin(0.5).setAlpha(0);

    // Sprout sits above the tile, stem height proportional to value.
    const sprout = this.add.graphics();
    this.paintSprout(sprout, value, false);
    sprout.y = -TILE_H / 2 - 2;

    // Hit zone matches the soil rectangle. We support BOTH click-to-swap
    // (legacy / keyboard accessible) and drag-to-swap (a more physical
    // gesture that matches the bubble-sort mental model — pick up a furrow,
    // drag it past its neighbour to swap).
    const hit = this.add.rectangle(0, 0, TILE_W, TILE_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true, draggable: true });
    let dragStartX = 0;
    let didDrag = false;
    hit.on('pointerdown', () => {
      dragStartX = container.x;
      didDrag = false;
    });
    hit.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      if (this.isResolving || this.actionLocked) return;
      didDrag = true;
      const span = TILE_W + TILE_GAP;
      // Clamp horizontal drag to ±1 tile-span; the player only ever swaps
      // with an immediate neighbour, so capping the cursor distance prevents
      // multi-tile drags from feeling like dead input.
      const clamped = Phaser.Math.Clamp(dragX - dragStartX, -span, span);
      container.x = dragStartX + clamped;
    });
    hit.on('dragend', () => {
      if (this.isResolving || this.actionLocked) {
        this.tweens.add({ targets: container, x: dragStartX, duration: 140, ease: 'Quad.easeOut' });
        return;
      }
      const span = TILE_W + TILE_GAP;
      const delta = container.x - dragStartX;
      // Snap home, then dispatch a swap if the drag crossed a neighbour midpoint.
      container.x = dragStartX;
      if (delta >= span * 0.45) {
        this.trySwap(index);
      } else if (delta <= -span * 0.45 && index > 0) {
        this.trySwap(index - 1);
      } else if (didDrag) {
        // No swap committed — give a soft snap-back so the gesture feels
        // physical instead of silent.
        audioManager.playTone(280, 60, 'sine');
      }
    });
    hit.on('pointerup', () => {
      if (!didDrag) this.trySwap(index);
    });
    hit.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.03, duration: 90 }));
    hit.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 90 }));

    container.add([soil, sprout, label, key, caret, hit]);
    return { value, container, soil, label, sprout, caret, shadow, hit };
  }

  private paintSoil(g: Phaser.GameObjects.Graphics, state: 'idle' | 'focus' | 'locked'): void {
    g.clear();
    const w = TILE_W;
    const h = TILE_H;

    // Soil gradient (top darker, bottom lighter — like turned earth).
    const dark = state === 'locked' ? 0x4a3a1c : state === 'focus' ? 0x6e4524 : 0x4f3320;
    const light = state === 'locked' ? 0x8c6a3a : state === 'focus' ? 0xa67442 : 0x7a4f30;
    g.fillStyle(dark, 1);
    g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle(light, 1);
    g.fillRect(-w / 2, -h / 2 + 4, w, h / 2 - 2);

    // Furrow grain lines
    g.lineStyle(1, 0x2b1a0c, 0.55);
    for (let i = 1; i < 4; i++) {
      const ly = -h / 2 + (h / 4) * i;
      g.beginPath();
      g.moveTo(-w / 2 + 4, ly);
      g.lineTo(w / 2 - 4, ly);
      g.strokePath();
    }

    // Frame
    if (state === 'focus') {
      g.lineStyle(3, COLORS.CYAN_GLOW, 0.95);
    } else if (state === 'locked') {
      g.lineStyle(3, COLORS.SUCCESS, 1);
    } else {
      g.lineStyle(2, 0x1f120a, 0.9);
    }
    g.strokeRect(-w / 2, -h / 2, w, h);

    // Focus sun-ray rim (small triangles above the tile when in focus pair).
    if (state === 'focus') {
      g.fillStyle(COLORS.CYAN_GLOW, 0.55);
      for (let i = 0; i < 5; i++) {
        const tx = -w / 2 + 8 + i * 14;
        g.fillTriangle(tx, -h / 2 - 6, tx + 6, -h / 2 - 12, tx + 12, -h / 2 - 6);
      }
    }
  }

  private paintSprout(g: Phaser.GameObjects.Graphics, value: number, bloom: boolean): void {
    g.clear();
    const stemLen = SPROUT_BASE + value * SPROUT_PER_VALUE;
    // Stem
    g.lineStyle(2, 0x166534, 1);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -stemLen);
    g.strokePath();

    // Pair of leaves halfway up the stem.
    if (stemLen > 10) {
      const ly = -stemLen * 0.55;
      g.fillStyle(0x22c55e, 1);
      g.beginPath();
      g.moveTo(0, ly);
      g.lineTo(-7, ly - 3);
      g.lineTo(-10, ly + 3);
      g.closePath();
      g.fillPath();
      g.beginPath();
      g.moveTo(0, ly + 2);
      g.lineTo(7, ly - 1);
      g.lineTo(10, ly + 5);
      g.closePath();
      g.fillPath();
    }

    // Crown — small bud or open flower when locked.
    if (bloom) {
      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(0, -stemLen - 4, 4);
      g.fillStyle(0xf59e0b, 1);
      g.fillCircle(-4, -stemLen - 2, 2.5);
      g.fillCircle(4, -stemLen - 2, 2.5);
      g.fillCircle(0, -stemLen - 7, 2.5);
    } else {
      g.fillStyle(0x16a34a, 1);
      g.fillCircle(0, -stemLen - 2, 2.5);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Player input
  // ──────────────────────────────────────────────────────────────────

  private trySwap(leftIndex: number): void {
    if (this.isResolving || this.actionLocked) return;
    // Fade the affordance prompt on the first ANY interaction (even an
    // invalid one against an out-of-bounds tile) — the player has now
    // discovered the control affordance and the prompt has done its job.
    if (this.affordancePrompt && !this.affordanceFaded) {
      this.affordanceFaded = true;
      this.tweens.killTweensOf(this.affordancePrompt);
      this.tweens.add({
        targets: this.affordancePrompt,
        alpha: 0,
        duration: 320,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.affordancePrompt?.destroy();
          this.affordancePrompt = null;
        },
      });
    }
    if (leftIndex < 0 || leftIndex >= this.values.length - 1) {
      this.showMessage('Pick a furrow that has a right-hand neighbour.', COLORS.WARNING);
      return;
    }
    this.actionLocked = true;

    const oldValues = this.values;
    const wasUseful = oldValues[leftIndex] > oldValues[leftIndex + 1];

    const leftTile = this.tiles[leftIndex];
    const rightTile = this.tiles[leftIndex + 1];
    const leftX = leftTile.container.x;
    const rightX = rightTile.container.x;
    const midX = (leftX + rightX) / 2;
    const tileY = leftTile.container.y;

    if (!wasUseful) {
      // Checking a sorted pair is part of how bubble sort terminates — we
      // don't count it as a mistake. The player gets a soft beep + a Bit
      // 'cold' reaction so the no-op still feels like feedback, and the
      // status strip records the inspection so it's clear the action was
      // registered. No swap counter increment, no attempts bump, no
      // mistakesTotal increase.
      this.lastPreviewAction = `inspected i=${leftIndex} · no swap needed`;
      this.refreshPreview();
      audioManager.playTone(220, 90, 'sine');
      this.currentSweepLine = 1;
      this.updatePseudocode(false);
      this.bitHint?.showCold();
      this.tweens.add({
        targets: [leftTile.container, rightTile.container],
        scale: 0.94, duration: 110, yoyo: true, ease: 'Quad.easeOut',
      });
      this.showMessage('Already in order — that pair is fine. Move on.', COLORS.SUCCESS);
      this.time.delayedCall(220, () => {
        this.actionLocked = false;
        this.refreshHints();
      });
      return;
    }

    this.values = swapAdjacent(this.values, leftIndex);
    this.currentSwaps++;
    this.complexity?.setAlgoCost(this.currentSwaps);
    this.lastPreviewAction = `swapped i=${leftIndex} -> ${this.values.join(', ')}`;
    this.updateStatusStrip();
    this.bindTraceState();

    this.tiles[leftIndex] = rightTile;
    this.tiles[leftIndex + 1] = leftTile;

    const arcUp = 18;

    this.tweens.add({
      targets: leftTile.container, x: rightX, duration: 220, ease: 'Sine.easeInOut',
      y: leftTile.container.y - arcUp, yoyo: true,
    });
    this.tweens.add({
      targets: rightTile.container, x: leftX, duration: 220, ease: 'Sine.easeInOut',
      y: rightTile.container.y - arcUp, yoyo: true,
    });

    audioManager.playTone(480, 110, 'square');
    this.currentSweepLine = 3;
    this.updatePseudocode(true);

    JuiceSystem.correctBurst(this, midX, tileY);
    this.bitHint?.showWarm();

    this.time.delayedCall(260, () => {
      this.actionLocked = false;
      this.refreshHints();
      if (isSortedAscending(this.values)) this.completeRound();
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Visuals — focus, lock-in, pseudocode
  // ──────────────────────────────────────────────────────────────────

  private refreshHints(): void {
    const focus = firstInversionIndex(this.values);
    const feelIt = this.isFeelItRound();

    this.tiles.forEach((tile, index) => {
      const inPair = index === focus || index === focus + 1;
      // FEEL_IT keeps every tile idle — no cyan focus rim, no caret. The
      // player has to *see* which neighbours are out of order themselves.
      // USE_IT (post-NAME_IT) restores the focus highlight as a guided cue.
      this.paintSoil(tile.soil, feelIt ? 'idle' : (inPair ? 'focus' : 'idle'));
      tile.caret.setAlpha(feelIt ? 0 : (index === focus ? 1 : 0));
    });

    if (feelIt) {
      // FEEL_IT: Bit floats neutrally near the player; no arrow tracking the
      // forced move. The whole point is to make the player derive the focus.
      this.bitHint?.showNeutral();
      this.hint?.clear();
      return;
    }

    if (focus >= 0 && this.tiles[focus] && this.tiles[focus + 1]) {
      const leftTile = this.tiles[focus];
      const rightTile = this.tiles[focus + 1];
      this.bitHint?.moveTo((leftTile.container.x + rightTile.container.x) / 2, leftTile.container.y - 76);
      this.bitHint?.showWarm();
      // Surface the algorithm's forced move with a glowing swap-pair arrow
      // anchored directly over the two tiles. The arrow tracks the leftmost
      // inversion and disappears once the row is sorted.
      this.hint?.setTarget({
        kind: 'swap-pair',
        x: leftTile.container.x,
        y: leftTile.container.y - 32,
        x2: rightTile.container.x,
        label: 'swap',
      });
    } else {
      this.bitHint?.showNeutral();
      this.hint?.clear();
    }
  }

  private updatePseudocode(swapped: boolean): void {
    if (!this.trace) return;
    // `currentSweepLine` carries semantic meaning: 0 = idle, 1 = comparing,
    // 2 = scanning, 3 = swapping. Map to AlgorithmTrace's zero-indexed line
    // numbers. We re-bind state on every update so the i/lhs/rhs bindings
    // track the leftmost inversion live.
    this.bindTraceState();
    if (swapped) {
      // Two lines fire together on a swap: the "if" guard and the swap row.
      this.trace.highlightLines(3, 5);
    } else if (this.currentSweepLine === 1) {
      this.trace.highlightLine(2); // comparing this i
    } else if (this.currentSweepLine === 2) {
      this.trace.highlightLine(1); // scanning the row
    } else {
      this.trace.highlightLine(0);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Completion
  // ──────────────────────────────────────────────────────────────────

  private completeRound(): void {
    this.isResolving = true;
    audioManager.playCorrectTone();

    // Lock-in cascade — every tile turns "locked" + sprout blooms left→right.
    this.tiles.forEach((tile, i) => {
      this.time.delayedCall(90 * i, () => {
        this.paintSoil(tile.soil, 'locked');
        this.paintSprout(tile.sprout, tile.value, true);
        this.tweens.add({
          targets: tile.container, y: tile.container.y - 10,
          duration: 140, yoyo: true, ease: 'Quad.easeOut',
        });
        JuiceSystem.burst(this, tile.container.x, tile.container.y - 28, 0xfbbf24, 4, 22);
      });
    });
    JuiceSystem.screenFlash(this, COLORS.SUCCESS, 0.10, 240);

    const round = BUBBLE_SORT_ROUNDS[this.roundIndex];
    const optimal = round.optimalSwaps;
    const wasted = Math.max(0, this.currentSwaps - optimal);
    this.mistakesTotal += wasted;
    this.complexity?.celebrate();

    const isFinal = this.roundIndex >= BUBBLE_SORT_ROUNDS.length - 1;
    this.showMessage(
      `Round ${this.roundIndex + 1} complete · ${this.currentSwaps} swaps (optimal ${optimal})`,
      COLORS.SUCCESS,
    );

    // Round-specific star: 3 if at optimum exactly, 2 if within 2, else 1.
    // This is a *preview* of the run's star count, not the final puzzle
    // score (which aggregates across all rounds).
    const roundStars: 1 | 2 | 3 = wasted === 0 ? 3 : wasted <= 2 ? 2 : 1;

    if (isFinal) {
      this.bitHint?.celebrate();
      this.time.delayedCall(1400, async () => {
        // Show the round-4 recap, then the final aggregate stars.
        await this.showRecapForCompletedRound(round, optimal, wasted, roundStars);
        const aggregateOptimal = BUBBLE_SORT_ROUNDS
          .reduce((acc, r) => acc + r.optimalSwaps, 0);
        const aggregateUsed = aggregateOptimal + this.mistakesTotal;
        const base = starsFromMistakesAndHints(this.mistakesTotal, this.hintsUsed);
        const stars = withOptimalityPenalty(base, aggregateUsed, aggregateOptimal);
        this.onPuzzleComplete(stars);
      });
      return;
    }

    // Non-final rounds: lock-in cascade plays for ~720ms, then show the
    // recap card. After the recap dismisses, advance to the next round.
    this.time.delayedCall(800, async () => {
      await this.showRecapForCompletedRound(round, optimal, wasted, roundStars);

      // FEEL_IT completion → fire the NAME_IT script beat once, BEFORE the
      // next round starts. This is the moment where the NPC names the
      // algorithm the player just felt — the entire pedagogical hinge of
      // the first-principles contract.
      if (
        round.lesson.phase === PuzzlePhase.FEEL_IT &&
        round.lesson.nameItBeat &&
        !this.namedYet
      ) {
        this.namedYet = true;
        // Freeze Glitch the moment NAME_IT fires — narratively, the NPC's
        // recognition stops Glitch in their tracks.
        this.bruteForce?.freeze();
        await this.showNameItBeat(round.lesson.nameItBeat);
      }

      this.startRound(this.roundIndex + 1).catch(() => undefined);
    });
  }

  /** Compose + show the round-complete RoundRecap. */
  private async showRecapForCompletedRound(
    round: typeof BUBBLE_SORT_ROUNDS[number],
    optimal: number,
    wasted: number,
    stars: 1 | 2 | 3,
  ): Promise<void> {
    const savings = optimal - this.currentSwaps;
    const factor = optimal > 0 ? Math.max(1, optimal / Math.max(1, this.currentSwaps)) : 1;
    const insight = wasted === 0
      ? `Optimal pass — you matched bubble sort's inversion lower bound (${optimal}).`
      : `You used ${wasted} extra swap${wasted === 1 ? '' : 's'}; the inversion count is the floor — you can't beat it.`;
    const stats: Array<{ label: string; value: string; tint: 'algo' | 'brute' | 'gold' | 'plain' }> = [
      { label: 'your swaps', value: String(this.currentSwaps), tint: 'algo' },
      { label: 'inversions (lower bound)', value: String(optimal), tint: 'brute' },
    ];
    if (savings > 0) {
      stats.push({ label: 'under optimum by', value: `${savings} (impossible ✦)`, tint: 'gold' });
    } else if (factor > 1) {
      stats.push({ label: 'efficiency', value: `${factor.toFixed(1)}× brute`, tint: 'gold' });
    }
    await showRoundRecap(this, {
      title: `Round ${this.roundIndex + 1} · ${round.label}`,
      stars,
      stats,
      insight,
    }, 'parchment');
  }

  // ──────────────────────────────────────────────────────────────────
  // Hooks
  // ──────────────────────────────────────────────────────────────────

  protected displayHint(hintNumber: number): void {
    const focus = firstInversionIndex(this.values);
    const focusHint = focus >= 0
      ? `Try swapping furrow ${focus + 1} with its right neighbour.`
      : 'Sweep again — find the leftmost pair where left > right.';
    const messages = [
      'Bubble sort only compares adjacent furrows.',
      'If the left value is bigger than the right, swap them.',
      focusHint,
    ];
    this.showMessage(messages[hintNumber - 1] ?? messages[0], COLORS.GOLD_ACCENT);
  }

  protected getConceptName(): string {
    return 'Bubble Sort';
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Brute-force strategy — fed to BruteForceActor during FEEL_IT round 1.
//
// Bubble sort's brute-force foil is "random adjacent swap" — Glitch picks a
// random index and swaps regardless of whether it's an inversion. Half the
// time they make progress; half the time they undo their own work. The
// average time to convergence is dramatically worse than the player's
// directed approach. We don't need to mathematically guarantee Glitch
// never converges — `isSolved` lets the actor stop ticking if they luck
// into a sorted state.
// ──────────────────────────────────────────────────────────────────────────

function makeBubbleSortBruteStrategy(initialValues: ReadonlyArray<number>): BruteForceStrategy {
  return {
    initialValues,
    nextMove(values) {
      const arr = [...values];
      if (arr.length < 2) return arr;
      const i = Math.floor(Math.random() * (arr.length - 1));
      [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
      return arr;
    },
    isSolved(values) {
      for (let i = 1; i < values.length; i++) {
        if (values[i] < values[i - 1]) return false;
      }
      return true;
    },
    tickIntervalMs: 850,
  };
}
