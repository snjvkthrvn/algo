/**
 * P1_2_BasketIndexing — "Find the Lost Tool" (AP_2)
 *
 * Overhaul (per puzzles_overhauled.md):
 *   • 3-round escalation: TEACH (1 fetch, 5 baskets), TWIST (3 fast fetches, 8 baskets),
 *     MASTER (5 fetches, 10 baskets, labels fade after 2s → commit to the address).
 *   • Basket "lid lift" animation when the player taps — the chosen basket pops open
 *     to reveal the tool inside, reinforcing "the address was the right one".
 *   • No fail clock — the spec calls for time pressure that affects star rating only.
 *     We expose a per-request soft timer (the request panel slowly bleeds colour) so
 *     players feel urgency without being instantly punished.
 *   • Keyboard shortcuts 1..0 → baskets 0..9.
 */

import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { audioManager } from '../../core/AudioManager';
import { JuiceSystem } from '../../systems/JuiceSystem';
import { drawPanel } from '../../ui/panel';
import { BitHint } from '../../entities/BitHint';
import { PuzzleAmbience } from '../../ui/PuzzleAmbience';
import { showRoundBanner } from '../../ui/RoundBanner';
import {
  INDEXING_ROUNDS,
  starsFromMistakesAndHints,
  type IndexingRound,
} from '../../data/puzzles/arrayPlainsPuzzleLogic';
import { numberKeyToIndex } from '../../input/NumberKeyCommand';

interface Basket {
  index: number;
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Rectangle;
  lid: Phaser.GameObjects.Rectangle;
  numberLabel: Phaser.GameObjects.Text;
  item: Phaser.GameObjects.Text;
  /** Strap of straw at the rim — fades when lid lifts. */
  straw: Phaser.GameObjects.Graphics;
}

const BASKET_W = 84;
const BASKET_H = 68;

export class P1_2_BasketIndexing extends BasePuzzleScene {
  private roundIndex = 0;
  private requestIndex = 0;
  private mistakesTotal = 0;
  private slowResponses = 0;
  private isResolving = false;

  private baskets: Basket[] = [];
  private requestLabel!: Phaser.GameObjects.Text;
  private roundBadge!: Phaser.GameObjects.Text;
  private bitHint: BitHint | null = null;
  private softTimer: Phaser.Time.TimerEvent | null = null;
  private softTimeLeftMs = 0;
  private softTimeBudgetMs = 0;
  private obscureTimer: Phaser.Time.TimerEvent | null = null;
  private labelsObscured = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_2 });
    this.puzzleId = 'ap_2';
    this.puzzleName = 'Find the Lost Tool';
    this.puzzleDescription = 'The index tells you exactly which basket. No scanning.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_INDEXING_BARN_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0.02;
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, 'farmland', { intensity: 0.85 });

    const { width } = this.cameras.main;
    this.buildRoundBadge(width);
    this.buildRequestPanel(width);

    this.startRound(0).catch(() => undefined);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bitHint?.destroy();
      this.bitHint = null;
      this.softTimer?.destroy();
      this.obscureTimer?.destroy();
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.isResolving) return;
      const round = INDEXING_ROUNDS[this.roundIndex];
      if (!round) return;
      const idx = event.key === '0' ? 9 : numberKeyToIndex(event.key, round.basketCount);
      if (idx !== null && idx < round.basketCount) this.chooseBasket(idx);
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Chrome
  // ──────────────────────────────────────────────────────────────────

  private buildRoundBadge(width: number): void {
    drawPanel(this, width / 2 - 160, 158, 320, 28, {
      depth: 18, fill: 0x081820, frame: COLORS.CYAN_GLOW, alpha: 0.92,
    });
    this.roundBadge = this.add.text(width / 2, 172, '', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
      stroke: '#06b6d4',
      strokeThickness: 1,
    }).setOrigin(0.5).setDepth(20);
  }

  private buildRequestPanel(width: number): void {
    drawPanel(this, width / 2 - 200, 200, 400, 56, {
      depth: 12, fill: 0xe0f8d0, frame: COLORS.WARNING, inner: COLORS.SUCCESS, alpha: 0.96,
    });
    this.requestLabel = this.add.text(width / 2, 228, '', {
      fontSize: '14px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      align: 'center',
    }).setOrigin(0.5).setDepth(20);
  }

  // ──────────────────────────────────────────────────────────────────
  // Round lifecycle
  // ──────────────────────────────────────────────────────────────────

  private async startRound(idx: number): Promise<void> {
    this.roundIndex = idx;
    this.requestIndex = 0;
    this.isResolving = true;

    const round = INDEXING_ROUNDS[idx];
    this.roundBadge.setText(`ROUND ${idx + 1}/3 · ${round.label} · use the address directly`);

    this.layoutBaskets(round);

    const labelLine = round.obscureLabels
      ? `${round.label}  ·  labels fade — commit to the address`
      : `${round.label}  ·  ${round.requests.length} fetch${round.requests.length > 1 ? 'es' : ''}`;

    await showRoundBanner(this, {
      label: `ROUND ${idx + 1} / 3`,
      subtitle: labelLine,
      accent: idx === 2 ? COLORS.GOLD_ACCENT : COLORS.CYAN_GLOW,
    });

    this.isResolving = false;
    this.nextRequest();
  }

  private layoutBaskets(round: IndexingRound): void {
    this.baskets.forEach((b) => b.container.destroy());
    this.baskets = [];

    const { width, height } = this.cameras.main;
    const n = round.basketCount;
    // Two rows when there are more than 5 baskets so the shelf stays readable.
    const perRow = n <= 5 ? n : Math.ceil(n / 2);
    const rows = Math.ceil(n / perRow);
    const gap = 18;
    const rowWidth = perRow * BASKET_W + (perRow - 1) * gap;
    const startX = width / 2 - rowWidth / 2 + BASKET_W / 2;
    const startY = height / 2 + 24 - ((rows - 1) * (BASKET_H + 26)) / 2;

    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = startX + col * (BASKET_W + gap);
      const y = startY + row * (BASKET_H + 26);
      this.baskets.push(this.createBasket(i, x, y));
    }

    // Bit hovers above basket 0 at the start of a round to anchor attention.
    this.bitHint?.destroy();
    const first = this.baskets[0];
    if (first) {
      this.bitHint = new BitHint(this, first.container.x, first.container.y - 80);
      this.bitHint.showNeutral();
    }
  }

  private createBasket(index: number, x: number, y: number): Basket {
    const container = this.add.container(x, y).setDepth(30);

    // Footprint shadow (anchored, stays put).
    const shadow = this.add.rectangle(3, BASKET_H / 2 + 4, BASKET_W, 6, 0x000000, 0.42);

    // Wooden body — deep brown so brass plate + numerals pop.
    const body = this.add.rectangle(0, 4, BASKET_W, BASKET_H - 8, 0x5e3a1f, 1)
      .setStrokeStyle(2, 0x2b1810, 1)
      .setInteractive({ useHandCursor: true });

    // Plank seams + side highlights drawn over the body — purely decorative.
    const decor = this.add.graphics();
    decor.lineStyle(1, 0x2b1810, 0.85);
    // 3 vertical plank seams
    for (let s = 1; s <= 2; s++) {
      const sx = -BASKET_W / 2 + (BASKET_W / 3) * s;
      decor.beginPath();
      decor.moveTo(sx, -BASKET_H / 2 + 10);
      decor.lineTo(sx, BASKET_H / 2 - 2);
      decor.strokePath();
    }
    // Iron banding (top + bottom thin straps)
    decor.fillStyle(0x3a2418, 1);
    decor.fillRect(-BASKET_W / 2, BASKET_H / 2 - 10, BASKET_W, 2);
    decor.fillRect(-BASKET_W / 2, -BASKET_H / 2 + 18, BASKET_W, 2);
    // Light wood highlight on left edge
    decor.fillStyle(0x8c5a32, 0.55);
    decor.fillRect(-BASKET_W / 2 + 2, -BASKET_H / 2 + 12, 2, BASKET_H - 18);

    // Brass index plate behind the numeral.
    const plate = this.add.graphics();
    plate.fillStyle(0xd4a155, 1);
    plate.fillRoundedRect(-22, -10, 44, 22, 3);
    plate.lineStyle(2, 0x6e4f1f, 1);
    plate.strokeRoundedRect(-22, -10, 44, 22, 3);
    // Tiny rivets at each corner.
    plate.fillStyle(0x6e4f1f, 1);
    [[-19, -7], [19, -7], [-19, 9], [19, 9]].forEach(([rx, ry]) => plate.fillCircle(rx, ry, 1.4));

    // Hinged lid — kept as a Rectangle so the existing rotation tween still works.
    const lid = this.add.rectangle(0, -BASKET_H / 2 + 6, BASKET_W + 6, 14, 0xb88542, 1)
      .setStrokeStyle(2, 0x6e4f1f, 1)
      .setOrigin(0.5, 1);

    // Lid handle + plank decoration.
    const lidDecor = this.add.graphics();
    lidDecor.fillStyle(0x6e4f1f, 1);
    lidDecor.fillRoundedRect(-10, -BASKET_H / 2 - 4, 20, 4, 1);
    lidDecor.lineStyle(1, 0x6e4f1f, 0.7);
    lidDecor.beginPath();
    lidDecor.moveTo(-BASKET_W / 2 + 8, -BASKET_H / 2 + 2);
    lidDecor.lineTo(BASKET_W / 2 - 8, -BASKET_H / 2 + 2);
    lidDecor.strokePath();

    // Wisps of straw poking up from the rim of the basket.
    const straw = this.add.graphics();
    straw.lineStyle(1, 0xe7c068, 0.95);
    for (let s = 0; s < 5; s++) {
      const sx = -BASKET_W / 2 + 14 + s * 14;
      straw.beginPath();
      straw.moveTo(sx, -BASKET_H / 2 + 8);
      straw.lineTo(sx + (s % 2 === 0 ? -4 : 4), -BASKET_H / 2 + 1);
      straw.strokePath();
    }

    const numberLabel = this.add.text(0, 0, `${index}`, {
      fontSize: '15px',
      fontFamily: FONTS.RETRO,
      color: '#3a2418',
      stroke: '#fef8e0',
      strokeThickness: 1,
    }).setOrigin(0.5);

    // Item glyph: hidden until the lid lifts.
    const item = this.add.text(0, -BASKET_H / 2 - 26, '', {
      fontSize: '14px',
      fontFamily: FONTS.RETRO,
      color: '#fbbf24',
      stroke: '#081820',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    container.add([shadow, body, decor, plate, numberLabel, straw, lid, lidDecor, item]);
    body.on('pointerdown', () => this.chooseBasket(index));

    // Entrance: small scale-in stagger so the shelf assembles.
    container.setScale(0.6);
    container.setAlpha(0);
    this.tweens.add({
      targets: container, scale: 1, alpha: 1,
      duration: 240, delay: index * 50,
      ease: 'Back.easeOut',
    });

    return { index, container, body, lid, numberLabel, item, straw };
  }

  // ──────────────────────────────────────────────────────────────────
  // Per-request flow
  // ──────────────────────────────────────────────────────────────────

  private nextRequest(): void {
    const round = INDEXING_ROUNDS[this.roundIndex];
    const request = round.requests[this.requestIndex];

    // Reset basket visuals from previous request.
    for (const basket of this.baskets) {
      basket.body.setFillStyle(0x5e3a1f, 1);
      basket.item.setAlpha(0).setText('');
      basket.item.y = -BASKET_H / 2 - 26;
      basket.lid.setRotation(0);
      basket.lid.setY(-BASKET_H / 2 + 6);
      basket.straw.setAlpha(1);
      basket.numberLabel.setAlpha(this.labelsObscured ? 0 : 1);
    }

    const remaining = round.requests.length - this.requestIndex;
    const remainingNote = round.requests.length > 1 ? ` · ${remaining} left` : '';
    this.requestLabel.setText(
      `Fetch  ${request.item.toUpperCase()}  →  index ${request.index}${remainingNote}`,
    );
    this.requestLabel.setColor('#081820');

    // Bit walks above the requested basket.
    const target = this.baskets[request.index];
    if (target) this.bitHint?.moveTo(target.container.x, target.container.y - 80, 320);
    this.bitHint?.showWarm();

    // Soft round timer drives star rating, not failure.
    this.softTimeBudgetMs = round.secondsPerRequest * 1000;
    this.softTimeLeftMs = this.softTimeBudgetMs;
    this.softTimer?.destroy();
    this.softTimer = this.time.addEvent({
      delay: 200, repeat: -1,
      callback: () => this.tickSoftTimer(),
    });

    // Round 3: labels fade after `obscureAfterMs`, simulating "you already
    // perceived the address; now commit". The request panel still shows the
    // address — the player just can't double-check the basket labels.
    this.labelsObscured = false;
    this.obscureTimer?.destroy();
    if (round.obscureLabels) {
      this.obscureTimer = this.time.delayedCall(round.obscureAfterMs, () => this.obscureLabels());
    }
  }

  private obscureLabels(): void {
    this.labelsObscured = true;
    for (const basket of this.baskets) {
      this.tweens.add({
        targets: basket.numberLabel, alpha: 0,
        duration: 380, ease: 'Sine.easeInOut',
      });
    }
    JuiceSystem.cameraShake(this, 40, 0.0008);
  }

  private tickSoftTimer(): void {
    this.softTimeLeftMs -= 200;
    const ratio = Math.max(0, this.softTimeLeftMs / this.softTimeBudgetMs);
    if (ratio < 0.4) this.requestLabel.setColor('#ef4444');
    else if (ratio < 0.7) this.requestLabel.setColor('#a04040');
    if (this.softTimeLeftMs <= 0) {
      this.softTimer?.destroy();
      this.slowResponses++;
    }
  }

  private chooseBasket(index: number): void {
    if (this.isResolving) return;
    const round = INDEXING_ROUNDS[this.roundIndex];
    const request = round.requests[this.requestIndex];
    this.softTimer?.destroy();
    this.obscureTimer?.destroy();
    this.isResolving = true;

    const basket = this.baskets[index];
    if (!basket) {
      this.isResolving = false;
      return;
    }

    const correct = index === request.index;

    // Lid lift animation reveals what was inside that slot.
    basket.item.setText(correct ? request.item.toUpperCase() : '?');
    this.tweens.add({
      targets: basket.lid, rotation: -1.05, y: basket.lid.y - 18,
      duration: 220, ease: 'Back.easeOut',
    });
    // Hide the straw as the lid lifts so it doesn't poke through.
    this.tweens.add({
      targets: basket.straw, alpha: 0, duration: 160,
    });
    this.tweens.add({
      targets: basket.item, alpha: 1, y: basket.item.y - 6, duration: 220, delay: 80,
    });

    if (correct) {
      basket.body.setFillStyle(COLORS.SUCCESS, 0.95);
      audioManager.playCorrectTone();
      JuiceSystem.correctBurst(this, basket.container.x, basket.container.y);
      this.bitHint?.showWarm();
    } else {
      basket.body.setFillStyle(COLORS.ERROR, 0.85);
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, basket.container.x, basket.container.y);
      JuiceSystem.cameraShake(this, 60, 0.002);
      this.attempts++;
      this.mistakesTotal++;
      this.bitHint?.showCold();
      this.showMessage(`Index ${index} held nothing. Wanted index ${request.index}.`, COLORS.WARNING);
    }

    this.time.delayedCall(correct ? 520 : 900, () => {
      this.isResolving = false;
      if (!correct) {
        // Re-prompt the same request so misses aren't fatal but cost stars.
        this.nextRequest();
        return;
      }
      this.requestIndex++;
      if (this.requestIndex >= round.requests.length) {
        this.completeRound();
      } else {
        this.nextRequest();
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Round / puzzle completion
  // ──────────────────────────────────────────────────────────────────

  private completeRound(): void {
    JuiceSystem.screenFlash(this, COLORS.SUCCESS, 0.10, 240);
    const isFinal = this.roundIndex >= INDEXING_ROUNDS.length - 1;

    const totalRequests = INDEXING_ROUNDS[this.roundIndex].requests.length;
    const summary = `Round ${this.roundIndex + 1} complete · ${totalRequests} fetch${totalRequests > 1 ? 'es' : ''} delivered`;
    this.showMessage(summary, COLORS.SUCCESS);

    if (isFinal) {
      this.bitHint?.celebrate();
      this.time.delayedCall(1200, () => {
        // Slow responses add a "half-mistake" to the star formula so dawdling
        // through Master round still drops the rating.
        const effectiveMistakes = this.mistakesTotal + Math.floor(this.slowResponses / 2);
        const stars = starsFromMistakesAndHints(effectiveMistakes, this.hintsUsed);
        this.onPuzzleComplete(stars);
      });
      return;
    }

    this.time.delayedCall(1400, () => this.startRound(this.roundIndex + 1).catch(() => undefined));
  }

  protected displayHint(hintNumber: number): void {
    const round = INDEXING_ROUNDS[this.roundIndex];
    const request = round.requests[this.requestIndex];
    const target = request ? request.index : 0;
    const messages = [
      `The request already gives you the address: index ${target}.`,
      'Array indexing is O(1). Tap the slot directly — never scan from 0.',
      'Keyboard: 1..9 maps to baskets 0..8, and 0 maps to basket 9.',
    ];
    this.showMessage(messages[hintNumber - 1] ?? messages[0], COLORS.GOLD_ACCENT);
  }

  protected getConceptName(): string {
    return 'Array Indexing';
  }
}
