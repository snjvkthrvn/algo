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
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { audioManager } from '../../core/AudioManager';
import { JuiceSystem } from '../../systems/JuiceSystem';
import { drawPanel } from '../../ui/panel';
import { BitHint } from '../../entities/BitHint';
import { PuzzleAmbience } from '../../ui/PuzzleAmbience';
import { PuzzlePreviewSidePanel } from '../../ui/PuzzlePreviewSidePanel';
import { showRoundBanner } from '../../ui/RoundBanner';
import { showLessonCard } from '../../ui/LessonCard';
import { BitCompanion } from '../../ui/BitCompanion';
import { ARRAY_PLAINS_PUZZLE_THEME, type PuzzleTheme } from './puzzleTheme';
import type { RegionBackdropId, RegionBackdropOptions } from '../../ui/RegionBackdrop';
import {
  INDEXING_ROUNDS,
  starsFromMistakesAndHints,
  type IndexingRound,
} from '../../data/puzzles/arrayPlainsPuzzleLogic';
import { buildIndexingPreview } from '../../data/puzzles/puzzlePreviewLogic';
import { numberKeyToIndex } from '../../input/NumberKeyCommand';
import { BruteForceScanner } from '../../entities/BruteForceScanner';
import { GLITCH_BANTER } from '../../data/dialogue/glitch_dialogue';
import { PuzzlePhase } from '../../data/types';
import { PuzzleRoom } from '../../puzzleRooms/PuzzleRoom';
import { getImageAssetPath } from '../../config/assets';

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
  private isResolving = false;

  private baskets: Basket[] = [];
  private requestLabel!: Phaser.GameObjects.Text;
  private roundBadge!: Phaser.GameObjects.Text;
  private bitHint: BitHint | null = null;
  private obscureTimer: Phaser.Time.TimerEvent | null = null;
  private labelsObscured = false;
  private preview: PuzzlePreviewSidePanel | null = null;
  /** Glitch as visible scanning co-actor during FEEL_IT round 1. A parallel
   *  row of slots with a cursor that walks 0→N until it finds the target —
   *  visually demonstrating the linear-scan brute force that indexing
   *  obsoletes. */
  private bruteForce: BruteForceScanner | null = null;
  private namedYet = false;
  private affordancePrompt: Phaser.GameObjects.Text | null = null;
  private affordanceFaded = false;
  /** The embodiment layer (docs/VISION.md §2): the player walks the storeroom
   *  aisle among the baskets; standing beside one focuses it, SPACE opens it.
   *  Number keys stay as the O(1) jump — that contrast IS the lesson. */
  private room: PuzzleRoom | null = null;
  private focusedBasket = -1;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_2 });
    this.puzzleId = 'ap_2';
    this.puzzleName = 'Find the Lost Tool';
    this.puzzleDescription = 'The index tells you exactly which basket. No scanning.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_ARRAY_ACTION_ARENA_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0;
  }
  protected getPuzzleTheme(): PuzzleTheme {
    return ARRAY_PLAINS_PUZZLE_THEME;
  }
  protected getRegionBackdrop(): { id: RegionBackdropId; options?: RegionBackdropOptions } | null {
    return { id: 'array-plains', options: { intensity: 0.85 } };
  }

  preload(): void {
    super.preload();
    const keeperPath = getImageAssetPath(VISUAL_REVAMP_KEYS.BASKET_KEEPER);
    if (keeperPath && !this.textures.exists(VISUAL_REVAMP_KEYS.BASKET_KEEPER)) {
      this.load.image(VISUAL_REVAMP_KEYS.BASKET_KEEPER, keeperPath);
    }
    PuzzleRoom.preload(this);
  }

  create(): void {
    // FEEL_IT diegetic puzzleDescription override — strip "the index tells
    // you exactly which basket" (that names the mechanic before play).
    if (INDEXING_ROUNDS[0].lesson.phase === PuzzlePhase.FEEL_IT) {
      this.puzzleDescription = 'The Basket Keeper needs a tool. Help them find it.';
    }
    super.create();
    new PuzzleAmbience(this, 'farmland', { intensity: 0.35 });

    const { width } = this.cameras.main;
    this.buildRoundBadge(width);
    this.buildRequestPanel(width);
    // BitCompanion stays — fictional character. All algorithm-named UI
    // (preview, GlitchCorner→BruteForceActor) mounts per-phase.
    new BitCompanion(this, { stage: 'byte', x: width - 92, y: 100, depth: 40, highlight: 5 });

    this.mountRoom();

    this.startRound(0).catch(() => undefined);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bitHint?.destroy();
      this.bitHint = null;
      this.obscureTimer?.destroy();
      this.preview?.destroy();
      this.preview = null;
      this.bruteForce?.destroy();
      this.bruteForce = null;
      this.affordancePrompt?.destroy();
      this.affordancePrompt = null;
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.isResolving) return;
      const round = INDEXING_ROUNDS[this.roundIndex];
      if (!round) return;
      const idx = event.key === '0' ? 9 : numberKeyToIndex(event.key, round.basketCount);
      if (idx !== null && idx < round.basketCount) this.chooseBasket(idx);
    });
  }

  /**
   * The storeroom aisle: the player walks among the baskets; the nearest
   * one within reach is focused, and SPACE / gamepad A / a floor click
   * opens it. Walking the shelf IS the linear scan — the number-key jump
   * the player learns later is the O(1) contrast (docs/VISION.md §2).
   */
  private mountRoom(): void {
    const { width, height } = this.cameras.main;
    this.room = new PuzzleRoom(this, {
      bounds: { x: width / 2 - 460, y: height / 2 - 110, width: 920, height: 300 },
      spawn: { x: width / 2 - 380, y: height / 2 + 150 },
      isBlocked: (point) =>
        this.baskets.some(
          (b) =>
            Math.abs(point.x - b.container.x) < BASKET_W / 2 + 6 &&
            Math.abs(point.y - b.container.y) < BASKET_H / 2 + 6,
        ),
      onAct: () => {
        if (this.focusedBasket >= 0) this.chooseBasket(this.focusedBasket);
      },
      onStep: () => this.refreshBasketFocus(),
    });

    // The Basket Keeper watches from the aisle's west edge.
    if (this.textures.exists(VISUAL_REVAMP_KEYS.BASKET_KEEPER)) {
      const keeper = this.add
        .image(width / 2 - 470, height / 2 + 130, VISUAL_REVAMP_KEYS.BASKET_KEEPER)
        .setOrigin(0.5, 0.78)
        .setScale(0.5)
        .setDepth(29);
      this.tweens.add({
        targets: keeper,
        scaleX: 0.5 * 1.012,
        scaleY: 0.5 * 1.012,
        duration: 2700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  update(time: number, delta: number): void {
    this.room?.update(time, delta);
  }

  /** Standing near a basket focuses it — proximity is attention. */
  private refreshBasketFocus(): void {
    if (!this.room) return;
    const pos = this.room.player.getPosition();
    let best = -1;
    let bestDist = Infinity;
    for (const basket of this.baskets) {
      const dist = Math.hypot(pos.x - basket.container.x, pos.y - basket.container.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = basket.index;
      }
    }
    if (bestDist > BASKET_W * 1.15) best = -1;
    if (best === this.focusedBasket) return;

    const prev = this.baskets.find((b) => b.index === this.focusedBasket);
    if (prev) this.tweens.add({ targets: prev.container, scale: 1, duration: 90 });
    this.focusedBasket = best;
    const next = this.baskets.find((b) => b.index === best);
    if (next) this.tweens.add({ targets: next.container, scale: 1.06, duration: 90 });
  }

  /** Freeze the walking layer while the keeper names the concept. */
  protected async showNameItBeat(beat: { speaker: string; line: string }): Promise<void> {
    this.room?.setActive(false);
    await super.showNameItBeat(beat);
    this.room?.setActive(true);
  }

  // ──────────────────────────────────────────────────────────────────
  // Chrome
  // ──────────────────────────────────────────────────────────────────

  private buildRoundBadge(width: number): void {
    // Round-5 chrome simplification: dropped the cyan-bordered dark-navy
    // panel chrome — it competed with the title banner above and the play
    // surface below. Round/index info now floats as themed text.
    const theme = this.getPuzzleTheme();
    this.roundBadge = this.add.text(width / 2, 152, '', {
      fontSize: '11px',
      fontFamily: FONTS.RETRO,
      color: theme.titleColor,
      stroke: theme.titleStroke,
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20).setAlpha(0.92);
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
    const total = INDEXING_ROUNDS.length;
    const isFeelIt = round.lesson.phase === PuzzlePhase.FEEL_IT;

    // FEEL_IT badge strips "use the address directly" — that names the
    // mechanic before play. Diegetic version: just count the round.
    this.roundBadge.setText(
      isFeelIt
        ? `ROUND ${idx + 1}/${total}`
        : `ROUND ${idx + 1}/${total} · ${round.label} · use the address directly`,
    );

    this.layoutBaskets(round);

    if (isFeelIt) {
      this.mountFeelItPanels();
    } else {
      this.mountUseItPanels();
      this.bruteForce?.fadeTo(0.32);
    }

    const labelLine = round.obscureLabels
      ? `${round.label}  ·  labels fade — commit to the address`
      : `${round.label}  ·  ${round.requests.length} fetch${round.requests.length > 1 ? 'es' : ''}`;

    await showLessonCard(this, round.lesson, 'parchment', {
      dockPosition: 'top',
      width: 760,
      height: 168,
      autoDismissMs: 5000,
    });

    await showRoundBanner(this, {
      label: `ROUND ${idx + 1} / ${total}`,
      subtitle: labelLine,
      accent: idx >= total - 1 ? COLORS.GOLD_ACCENT : COLORS.CYAN_GLOW,
    });

    this.isResolving = false;
    this.nextRequest();
  }

  private isFeelItRound(): boolean {
    return INDEXING_ROUNDS[this.roundIndex]?.lesson.phase === PuzzlePhase.FEEL_IT;
  }

  /** FEEL_IT: a visible scanning row above the player's basket shelf (Glitch
   *  walking 0→N) + the affordance prompt. NO PuzzlePreviewSidePanel
   *  (algorithm-name leak). NO Bit-pointing. */
  private mountFeelItPanels(): void {
    if (this.bruteForce) return;
    const { width, height } = this.cameras.main;
    const round = INDEXING_ROUNDS[this.roundIndex];
    const request = round.requests[0];
    if (!request) return;

    // Glitch's scan row sits BELOW the player's basket shelf so the
    // hierarchy reads top-to-bottom: chrome → request → affordance →
    // player's shelf → Glitch's brute-force scan. Slot labels are the
    // numbers 0..N-1 so the player sees Glitch walking through addresses
    // while they themselves can jump straight to the right one.
    const slotLabels = Array.from({ length: round.basketCount }, (_, i) => `${i}`);
    this.bruteForce = new BruteForceScanner(this, {
      x: width / 2,
      y: height - 150,
      slotCount: round.basketCount,
      slotLabels,
      target: request.index,
      heading: "⚠ GLITCH'S APPROACH",
      subtitle: `(opening baskets one by one, looking for ${request.item.toLowerCase()})`,
      notDoneLabel: 'still hunting',
      doneLabel: 'found it. eventually.',
      verbLabel: 'checks',
      banter: GLITCH_BANTER.ap_2,
      depth: 40,
      tickIntervalMs: 750,
    });

    // Affordance prompt — sits just above the player's basket shelf, in
    // the band between the request panel and the baskets. Tells the player
    // WHAT to do without naming the algorithm.
    this.affordancePrompt = this.add.text(width / 2, 290,
      'Tap the basket whose number matches.',
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

  /** USE_IT: the full teaching toolkit. Idempotent. */
  private mountUseItPanels(): void {
    if (!this.preview) {
      this.preview = new PuzzlePreviewSidePanel(this, { side: 'right', yOffset: -12 });
      this.preview.setTitle('INDEX PREVIEW');
      this.preview.show();
    }
  }

  // showNameItBeat lifted to BasePuzzleScene.

  private layoutBaskets(round: IndexingRound): void {
    this.baskets.forEach((b) => b.container.destroy());
    this.baskets = [];
    this.focusedBasket = -1;

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

    // Bit hovers above basket 0 in USE_IT — anchors attention to the shelf.
    // FEEL_IT suppresses Bit entirely; the basket numbers + the request panel
    // are the player's only cues. No hovering helper.
    this.bitHint?.destroy();
    this.bitHint = null;
    if (!this.isFeelItRound()) {
      const first = this.baskets[0];
      if (first) {
        this.bitHint = new BitHint(this, first.container.x, first.container.y - 80);
        this.bitHint.showNeutral();
      }
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
    this.refreshPreview();

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
    // FEEL_IT swaps "index" → "basket" — algorithm vocabulary leaks
    // through that single word otherwise.
    const addressWord = this.isFeelItRound() ? 'basket' : 'index';
    this.requestLabel.setText(
      `Fetch  ${request.item.toUpperCase()}  →  ${addressWord} ${request.index}${remainingNote}`,
    );
    this.requestLabel.setColor('#081820');

    // Bit walks above the requested basket — but ONLY in USE_IT. In FEEL_IT,
    // Bit floating directly over the answer is unfiltered hand-holding;
    // the player should derive that the number IS the address from the
    // request alone, not by following Bit.
    if (!this.isFeelItRound()) {
      const target = this.baskets[request.index];
      if (target) this.bitHint?.moveTo(target.container.x, target.container.y - 80, 320);
      this.bitHint?.showWarm();
    } else {
      this.bitHint?.showNeutral();
    }

    // Serene wonder (docs/VISION.md §6): no countdown on first contact with
    // indexing. Stars are earned by accuracy alone; urgency belongs to the
    // boss, not to the moment a concept is being felt.

    // Round 3: labels fade after `obscureAfterMs`, simulating "you already
    // perceived the address; now commit". The request panel still shows the
    // address — the player just can't double-check the basket labels.
    this.labelsObscured = false;
    this.obscureTimer?.destroy();
    if (round.obscureLabels) {
      this.obscureTimer = this.time.delayedCall(round.obscureAfterMs, () => this.obscureLabels());
    }
  }

  private refreshPreview(): void {
    if (!this.preview) return;
    const round = INDEXING_ROUNDS[this.roundIndex];
    const preview = buildIndexingPreview({
      basketCount: round.basketCount,
      request: round.requests[this.requestIndex] ?? null,
      requestNumber: Math.min(this.requestIndex + 1, round.requests.length),
      totalRequests: round.requests.length,
    });
    this.preview.setState(preview.state);
    this.preview.setNextAction(preview.next);
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

  private chooseBasket(index: number): void {
    if (this.isResolving) return;
    // Fade the affordance prompt on first interaction (any tap — even wrong
    // ones teach the control affordance).
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
    const round = INDEXING_ROUNDS[this.roundIndex];
    const request = round.requests[this.requestIndex];
    // Round-transition guard: between the last correct fetch of a round and
    // the next round starting, requestIndex is past the end of the array
    // (see line 458). Without this check, clicking during that window would
    // throw when reading request.index. P1_1/P1_3/P1_4 release isResolving
    // at safer points so this guard isn't needed there.
    if (!request) return;
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
      // Hold the body still through the victory + naming beat.
      this.room?.setActive(false);
      this.time.delayedCall(1200, () => {
        // Stars come from accuracy + hints only — no speed pressure on a
        // first-contact puzzle (docs/VISION.md §6).
        const stars = starsFromMistakesAndHints(this.mistakesTotal, this.hintsUsed);
        this.onPuzzleComplete(stars);
      });
      return;
    }

    this.time.delayedCall(1400, async () => {
      // FEEL_IT completion → fire the NAME_IT script beat once. The Basket
      // Keeper names what the player just felt.
      const round = INDEXING_ROUNDS[this.roundIndex];
      if (
        round.lesson.phase === PuzzlePhase.FEEL_IT &&
        round.lesson.nameItBeat &&
        !this.namedYet
      ) {
        this.namedYet = true;
        this.bruteForce?.freeze();
        await this.showNameItBeat(round.lesson.nameItBeat);
      }
      this.startRound(this.roundIndex + 1).catch(() => undefined);
    });
  }

  protected displayHint(hintNumber: number): void {
    const round = INDEXING_ROUNDS[this.roundIndex];
    const request = round.requests[this.requestIndex];
    const target = request ? request.index : 0;
    // FEEL_IT hints stay diegetic — no "Array indexing is O(1)" leak.
    const messages = this.isFeelItRound()
      ? [
          `The request shows you a number — ${target}. That's the basket.`,
          `Tap basket ${target}. The Keeper trusts the number.`,
          `Keyboard: 1..9 maps to the basket numbered to its left.`,
        ]
      : [
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

