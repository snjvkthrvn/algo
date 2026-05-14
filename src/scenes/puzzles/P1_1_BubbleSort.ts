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
import { showRoundBanner } from '../../ui/RoundBanner';
import {
  BUBBLE_SORT_ROUNDS,
  firstInversionIndex,
  isSortedAscending,
  starsFromMistakesAndHints,
  swapAdjacent,
} from '../../data/puzzles/arrayPlainsPuzzleLogic';
import { numberKeyToIndex } from '../../input/NumberKeyCommand';

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
  private pseudoText!: Phaser.GameObjects.Text;
  private currentSweepLine = 0;
  private groundLine!: Phaser.GameObjects.Graphics;
  private rowY = 0;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_1 });
    this.puzzleId = 'ap_1';
    this.puzzleName = 'Fix the Farmland';
    this.puzzleDescription = 'Swap neighbour furrows until the row stands shortest to tallest.';
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, 'farmland', { intensity: 1 });

    const { width, height } = this.cameras.main;
    this.rowY = height / 2 + 36;
    this.buildGroundLine(width);
    this.buildTopStrip(width);
    this.buildPseudocodePanel(width);

    this.startRound(0).catch(() => undefined);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bitHint?.destroy();
      this.bitHint = null;
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.isResolving || this.actionLocked) return;
      const left = numberKeyToIndex(event.key, this.values.length - 1);
      if (left !== null) this.trySwap(left);
    });
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_SORTING_SHED_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0.02;
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
    const panelX = 70;
    const panelY = 250;
    const panelW = 220;
    const panelH = 150;
    drawPanel(this, panelX, panelY, panelW, panelH, {
      depth: 8, fill: 0x0a1a14, frame: 0x346856, inner: 0x88c070, alpha: 0.88,
    });
    this.add.text(panelX + 10, panelY + 8, 'PSEUDOCODE', {
      fontSize: '9px', fontFamily: FONTS.RETRO, color: '#88c070',
    }).setDepth(10);
    this.pseudoText = this.add.text(panelX + 10, panelY + 26, '', {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#e0f8d0', lineSpacing: 4,
    }).setDepth(10);
    void width;
  }

  private updateStatusStrip(): void {
    const round = BUBBLE_SORT_ROUNDS[this.roundIndex];
    this.statusStrip.setText(
      `ROUND ${this.roundIndex + 1}/3 · ${round.label}   ·   SWAPS ${this.currentSwaps} / OPTIMAL ${round.optimalSwaps}`,
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // Round lifecycle
  // ──────────────────────────────────────────────────────────────────

  private async startRound(idx: number): Promise<void> {
    this.roundIndex = idx;
    const round = BUBBLE_SORT_ROUNDS[idx];
    this.values = [...round.values];
    this.currentSwaps = 0;
    this.currentSweepLine = 0;
    this.isResolving = true; // unblocked after banner
    this.actionLocked = false;

    this.updateStatusStrip();
    this.updatePseudocode(false);
    this.layoutTiles();
    this.refreshHints();

    this.bitHint?.destroy();
    const firstTile = this.tiles[0];
    if (firstTile) {
      this.bitHint = new BitHint(this, firstTile.container.x - 56, firstTile.container.y - 60);
      this.bitHint.showWarm();
    }

    await showRoundBanner(this, {
      label: `ROUND ${idx + 1} / 3`,
      subtitle: `${round.label}  ·  sort ${round.values.length} furrows ascending`,
      accent: idx === 2 ? COLORS.GOLD_ACCENT : COLORS.CYAN_GLOW,
    });

    this.isResolving = false;
  }

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

    const key = this.add.text(0, TILE_H / 2 + 14, index < this.values.length - 1 ? `[${index + 1}]` : '·', {
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

    // Hit zone matches the soil rectangle.
    const hit = this.add.rectangle(0, 0, TILE_W, TILE_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.trySwap(index));
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
      audioManager.playTone(180, 110, 'square');
      this.currentSweepLine = 1;
      this.updatePseudocode(false);
      JuiceSystem.wrongBurst(this, midX, tileY);
      JuiceSystem.cameraShake(this, 40, 0.001);
      this.bitHint?.showCold();
      this.attempts++;
      this.mistakesTotal++;
      this.showMessage('Already in order: compare, then leave this pair alone.', COLORS.WARNING);
      this.time.delayedCall(220, () => {
        this.actionLocked = false;
        this.refreshHints();
      });
      return;
    }

    this.values = swapAdjacent(this.values, leftIndex);
    this.currentSwaps++;
    this.updateStatusStrip();

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

    this.tiles.forEach((tile, index) => {
      const inPair = index === focus || index === focus + 1;
      this.paintSoil(tile.soil, inPair ? 'focus' : 'idle');
      tile.caret.setAlpha(index === focus ? 1 : 0);
    });

    if (focus >= 0 && this.tiles[focus] && this.tiles[focus + 1]) {
      const leftTile = this.tiles[focus];
      const rightTile = this.tiles[focus + 1];
      this.bitHint?.moveTo((leftTile.container.x + rightTile.container.x) / 2, leftTile.container.y - 76);
      this.bitHint?.showWarm();
    } else {
      this.bitHint?.showNeutral();
    }
  }

  private updatePseudocode(swapped: boolean): void {
    const mark = (lit: boolean) => (lit ? '▶' : ' ');
    this.pseudoText.setText([
      `${mark(this.currentSweepLine === 1)} for pass = 1..n-1`,
      `${mark(this.currentSweepLine === 2)}   for i = 0..n-2`,
      `${mark(this.currentSweepLine === 1 || this.currentSweepLine === 3)}     if a[i] > a[i+1]`,
      `${mark(swapped)}       swap(a[i], a[i+1])`,
    ].join('\n'));
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

    const optimal = BUBBLE_SORT_ROUNDS[this.roundIndex].optimalSwaps;
    const wasted = Math.max(0, this.currentSwaps - optimal);
    this.mistakesTotal += wasted;

    const isFinal = this.roundIndex >= BUBBLE_SORT_ROUNDS.length - 1;
    this.showMessage(
      `Round ${this.roundIndex + 1} complete · ${this.currentSwaps} swaps (optimal ${optimal})`,
      COLORS.SUCCESS,
    );

    if (isFinal) {
      this.bitHint?.celebrate();
      this.time.delayedCall(1400, () => {
        const stars = starsFromMistakesAndHints(this.mistakesTotal, this.hintsUsed);
        this.onPuzzleComplete(stars);
      });
      return;
    }

    this.time.delayedCall(1500, () => this.startRound(this.roundIndex + 1).catch(() => undefined));
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
