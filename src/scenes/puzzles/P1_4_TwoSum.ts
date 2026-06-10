/**
 * P1_4_TwoSum — "The Pairing Grounds" (AP_4)
 *
 * Overhaul (per puzzles_overhauled.md):
 *   • 3 rounds: TEACH (5 tiles, target 9), TWIST (8 tiles, target 15),
 *     MASTER (12 tiles, target 24, soft time pressure).
 *   • Click-to-toggle selection: first click sets the "anchor" and exposes a
 *     **"Need: target − value"** floating label above it. Second click checks
 *     the pair. Clicking the anchor again deselects.
 *   • **Connecting golden beam** drawn between the two selected tiles while
 *     selection is in progress, and brightens on a valid match.
 *   • Round 3 surfaces a soft per-round timer that affects star rating but
 *     never auto-fails — matches the "no fail-state timer" pillar.
 *   • Multiple valid pairs per round: once one valid pair is locked in, the
 *     remaining tiles can be ignored. Wrong picks deselect and cost stars.
 */

import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { audioManager } from '../../core/AudioManager';
import { a11yManager } from '../../core/A11yManager';
import { JuiceSystem } from '../../systems/JuiceSystem';
import { drawPanel } from '../../ui/panel';
import { BitHint } from '../../entities/BitHint';
import { PuzzleAmbience } from '../../ui/PuzzleAmbience';
import { PuzzlePreviewSidePanel } from '../../ui/PuzzlePreviewSidePanel';
import { showRoundBanner } from '../../ui/RoundBanner';
import { showLessonCard } from '../../ui/LessonCard';
import { BitCompanion } from '../../ui/BitCompanion';
import { GlitchCorner } from '../../ui/GlitchCorner';
import { ComplexityMeter } from '../../ui/ComplexityMeter';
import { AlgorithmTrace } from '../../ui/AlgorithmTrace';
import { ARRAY_PLAINS_PUZZLE_THEME, type PuzzleTheme } from './puzzleTheme';
import type { RegionBackdropId, RegionBackdropOptions } from '../../ui/RegionBackdrop';
import {
  TWO_SUM_ROUND_CONFIGS,
  complementOf,
  isTwoSumPair,
  starsFromMistakesAndHints,
  type TwoSumRoundConfig,
} from '../../data/puzzles/arrayPlainsPuzzleLogic';
import { buildTwoSumPreview } from '../../data/puzzles/puzzlePreviewLogic';
import { numberKeyToIndex } from '../../input/NumberKeyCommand';
import { BruteForceActor, type BruteForceStrategy } from '../../entities/BruteForceActor';
import { GLITCH_BANTER } from '../../data/dialogue/glitch_dialogue';
import { PuzzlePhase } from '../../data/types';
import { PuzzleRoom } from '../../puzzleRooms/PuzzleRoom';
import { getImageAssetPath } from '../../config/assets';

interface NumberTile {
  index: number;
  value: number;
  container: Phaser.GameObjects.Container;
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  /** Floating "Need: X" caption above the tile. Hidden by default. */
  needBadge: Phaser.GameObjects.Container;
}

const TILE_BASE_W = 64;
const TILE_BASE_H = 64;

export class P1_4_TwoSum extends BasePuzzleScene {
  private roundIndex = 0;
  private selectedIndices: number[] = [];
  private mistakesTotal = 0;
  private isResolving = false;
  private actionLocked = false;

  private tiles: NumberTile[] = [];
  private targetText!: Phaser.GameObjects.Text;
  private roundBadge!: Phaser.GameObjects.Text;
  private beam!: Phaser.GameObjects.Graphics;
  private bitHint: BitHint | null = null;
  private preview: PuzzlePreviewSidePanel | null = null;
  /** Brute force pair-check count per round vs the player's click count. */
  private complexity: ComplexityMeter | null = null;
  /** Number of pair-checks the player has *consumed* — each anchor-then-target click is one check. */
  private checksUsed = 0;
  /**
   * Live trace of the hash-set two-sum algorithm. The player sees `need`
   * computed from their anchor pick and `seen` accumulating tiles they've
   * tried — turning "I clicked a tile" into "I just executed step 3 of the
   * algorithm".
   */
  private trace: AlgorithmTrace | null = null;
  /** Values the player has anchored at least once this round (the algorithm's `seen` set). */
  private seenValues: number[] = [];
  /** Glitch as visible co-actor during FEEL_IT round 1. Null in USE_IT rounds. */
  private bruteForce: BruteForceActor | null = null;
  /** True between FEEL_IT round completion and USE_IT round mount. Guards
   *  against re-firing the NAME_IT beat on restart. */
  private namedYet = false;
  /** The embodiment layer (docs/VISION.md §2): the player walks the stone
   *  field among the runestones; standing beside one focuses it, SPACE
   *  anchors/pairs it. */
  private room: PuzzleRoom | null = null;
  private focusedTile = -1;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_4 });
    this.puzzleId = 'ap_4';
    this.puzzleName = 'The Pairing Grounds';
    this.puzzleDescription = 'Pick two tiles whose values sum to the target. Use complements.';
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
    return { id: 'array-plains', options: { intensity: 0.7 } };
  }

  preload(): void {
    super.preload();
    const keeperPath = getImageAssetPath(VISUAL_REVAMP_KEYS.TILE_WORKER);
    if (keeperPath && !this.textures.exists(VISUAL_REVAMP_KEYS.TILE_WORKER)) {
      this.load.image(VISUAL_REVAMP_KEYS.TILE_WORKER, keeperPath);
    }
    PuzzleRoom.preload(this);
  }

  create(): void {
    // FEEL_IT first-principles guard: strip "complement" / "two sum" framing
    // from the title subtitle when round 0 is FEEL_IT. The player should
    // derive the complement insight, not read about it before playing.
    if (TWO_SUM_ROUND_CONFIGS[0].lesson.phase === PuzzlePhase.FEEL_IT) {
      this.puzzleDescription = 'Find two runestones that add to the target. A Tile Worker waits.';
    }
    super.create();
    new PuzzleAmbience(this, 'farmland', { intensity: 0.30 });

    const { width } = this.cameras.main;

    this.buildRoundBadge(width);
    this.buildTargetPanel(width);
    new BitCompanion(this, { stage: 'byte', x: width - 92, y: 100, depth: 40 });

    this.beam = this.add.graphics().setDepth(25);

    this.bitHint = new BitHint(this, 100, 280);
    this.bitHint.showNeutral();

    this.mountRoom();

    this.startRound(0).catch(() => undefined);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bitHint?.destroy();
      this.bitHint = null;
      this.preview?.destroy();
      this.preview = null;
      this.bruteForce?.destroy();
      this.bruteForce = null;
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.isResolving || this.actionLocked) return;
      const idx = numberKeyToIndex(event.key, this.tiles.length);
      if (idx !== null) this.chooseTile(idx);
    });
  }

  /**
   * The stone field: the player walks among the runestones; standing
   * beside one focuses it, SPACE anchors it (first press) or pairs it
   * (second press). Remembering where the complement STOOD becomes
   * spatial memory — the hash-set insight, felt (docs/VISION.md §2).
   */
  private mountRoom(): void {
    const { width, height } = this.cameras.main;
    this.room = new PuzzleRoom(this, {
      bounds: { x: width / 2 - 460, y: height / 2 - 120, width: 920, height: 320 },
      spawn: { x: width / 2 - 380, y: height / 2 + 160 },
      isBlocked: (point) =>
        this.tiles.some(
          (t) =>
            Math.abs(point.x - t.container.x) < TILE_BASE_W / 2 + 4 &&
            Math.abs(point.y - t.container.y) < TILE_BASE_H / 2 + 4,
        ),
      onAct: () => {
        if (this.focusedTile >= 0) this.chooseTile(this.focusedTile);
      },
      onStep: () => this.refreshTileFocus(),
    });

    // The Tile Worker watches from the field's west edge.
    if (this.textures.exists(VISUAL_REVAMP_KEYS.TILE_WORKER)) {
      const keeper = this.add
        .image(width / 2 - 470, height / 2 + 140, VISUAL_REVAMP_KEYS.TILE_WORKER)
        .setOrigin(0.5, 0.78)
        .setScale(0.5)
        .setDepth(29);
      this.tweens.add({
        targets: keeper,
        scaleX: 0.5 * 1.012,
        scaleY: 0.5 * 1.012,
        duration: 2500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  update(time: number, delta: number): void {
    this.room?.update(time, delta);
  }

  /** Standing near a runestone focuses it — proximity is attention. */
  private refreshTileFocus(): void {
    if (!this.room) return;
    const pos = this.room.player.getPosition();
    let best = -1;
    let bestDist = Infinity;
    for (const tile of this.tiles) {
      const dist = Math.hypot(pos.x - tile.container.x, pos.y - tile.container.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = tile.index;
      }
    }
    if (bestDist > TILE_BASE_W * 1.3) best = -1;
    if (best === this.focusedTile) return;

    const prev = this.tiles.find((t) => t.index === this.focusedTile);
    if (prev) this.tweens.add({ targets: prev.container, scale: 1, duration: 90 });
    this.focusedTile = best;
    const next = this.tiles.find((t) => t.index === best);
    if (next) this.tweens.add({ targets: next.container, scale: 1.07, duration: 90 });
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
    // Round-5: same chrome simplification as the other AP puzzles —
    // float round/index text instead of slabbing a panel under it.
    const theme = this.getPuzzleTheme();
    this.roundBadge = this.add.text(width / 2, 152, '', {
      fontSize: '11px',
      fontFamily: FONTS.RETRO,
      color: theme.titleColor,
      stroke: theme.titleStroke,
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20).setAlpha(0.92);
  }

  private buildTargetPanel(width: number): void {
    drawPanel(this, width / 2 - 120, 196, 240, 50, {
      depth: 12, fill: 0xe0f8d0, frame: COLORS.WARNING, inner: COLORS.GOLD_ACCENT, alpha: 0.96,
    });
    this.targetText = this.add.text(width / 2, 221, '', {
      fontSize: '18px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    }).setOrigin(0.5).setDepth(20);
  }

  // ──────────────────────────────────────────────────────────────────
  // Phase gating (FEEL_IT vs USE_IT)
  // ──────────────────────────────────────────────────────────────────

  /** Phase helper — true when the current round is FEEL_IT. Used to gate
   *  algorithmic hand-holding (NEED badge, trace binding, complement hint)
   *  that would name the technique before the player has felt it. */
  private isFeelItRound(): boolean {
    return TWO_SUM_ROUND_CONFIGS[this.roundIndex]?.lesson.phase === PuzzlePhase.FEEL_IT;
  }

  /** FEEL_IT mounts: only the brute-force co-actor. NO trace, NO complexity
   *  meter, NO GlitchCorner copy that says "n(n-1)/2 checks" — the player
   *  must derive the contrast from Glitch's visibly mounting pair count. */
  private mountFeelItPanels(): void {
    if (this.bruteForce) return;
    const { height } = this.cameras.main;
    this.bruteForce = new BruteForceActor(this, {
      x: 152, y: height - 92,
      strategy: makeTwoSumBruteStrategy(),
      heading: "⚠ GLITCH'S APPROACH",
      subtitle: '(checking every pair in turn...)',
      notDoneLabel: 'still flailing',
      doneLabel: 'gave up',
      verbLabel: 'pair checks',
      banter: GLITCH_BANTER.ap_4,
      depth: 40,
    });
  }

  /** USE_IT mounts: the full teaching toolkit. Idempotent — safe to call on
   *  every round-2-onward start. Holds the AlgorithmTrace, ComplexityMeter,
   *  GlitchCorner ("n × (n−1) / 2 checks") and the pair-preview panel that
   *  used to mount unconditionally in create(). */
  private mountUseItPanels(): void {
    const { width, height } = this.cameras.main;
    if (!this.preview) {
      this.preview = new PuzzlePreviewSidePanel(this, { side: 'right', yOffset: -12 });
      this.preview.setTitle('PAIR PREVIEW');
      this.preview.show();
    }
    if (!this.trace) {
      new GlitchCorner(this, {
        x: 152, y: height - 92,
        width: 240, height: 74,
        variant: 'parchment',
        heading: 'Glitch Tries Every Pair',
        body: 'n × (n−1) / 2 checks. You can do better.',
        depth: 40,
      });

      this.trace = new AlgorithmTrace(this, {
        x: 64, y: 270, width: 240,
        title: 'twoSum(arr, target)',
        lines: [
          'seen = {}',
          'for v in arr:',
          '  need = target - v',
          '  v = {v}, need = {need}',
          '  if need in seen: return',
          '  seen.add(v)',
          'seen = {seen}',
        ],
      });
    }
    if (!this.complexity) {
      const initialBrute = pairCount(TWO_SUM_ROUND_CONFIGS[this.roundIndex].values.length);
      this.complexity = new ComplexityMeter(this, {
        x: width / 2, y: 230,
        width: 320,
        bruteLabel: 'pair checks',
        bruteCost: initialBrute,
        algoLabel: 'your picks',
        algoCost: 0,
        variant: 'parchment',
        depth: 40,
      });
    }
  }

  // showNameItBeat lifted to BasePuzzleScene.

  // ──────────────────────────────────────────────────────────────────
  // Round lifecycle
  // ──────────────────────────────────────────────────────────────────

  private async startRound(idx: number): Promise<void> {
    this.roundIndex = idx;
    this.selectedIndices = [];
    this.checksUsed = 0;
    this.seenValues = [];
    this.beam.clear();
    this.isResolving = true;
    this.actionLocked = false;

    const round = TWO_SUM_ROUND_CONFIGS[idx];
    const total = TWO_SUM_ROUND_CONFIGS.length;
    const isFeelIt = round.lesson.phase === PuzzlePhase.FEEL_IT;
    // FEEL_IT strips "find any pair that sums to target" — even that phrasing
    // names the technique. The target panel is enough; the player figures out
    // "I need two" from the puzzle's name and the brute-force counter.
    this.roundBadge.setText(
      isFeelIt
        ? `ROUND ${idx + 1}/${total}  ·  the Tile Worker waits`
        : `ROUND ${idx + 1}/${total} · ${round.label} · find any pair that sums to target`
    );
    this.targetText.setText(`TARGET  =  ${round.target}`);

    if (isFeelIt) {
      this.mountFeelItPanels();
    } else {
      this.mountUseItPanels();
      // Coming from FEEL_IT into USE_IT — fade Glitch out of focus instead of
      // destroying. Keeping them dim-visible cements that they're still the
      // worse approach, even after the player has the technique.
      this.bruteForce?.fadeTo(0.32);
    }

    this.layoutTiles(round);
    this.refreshPreview();
    this.bindTraceState();
    this.trace?.highlightLine(0); // seen = {}
    this.complexity?.reset({
      bruteCost: pairCount(round.values.length),
      algoCost: 0,
      bruteLabel: 'pair checks',
      algoLabel: 'your picks',
    });

    const subtitle = idx >= total - 2
      ? `${round.label}  ·  target ${round.target}  ·  ${round.values.length} runestones, ${round.seconds}s on the clock`
      : `${round.label}  ·  target ${round.target}  ·  pick one, find its complement`;

    await showLessonCard(this, round.lesson, 'parchment', {
      dockPosition: 'top',
      width: 760,
      height: 168,
      autoDismissMs: 5000,
    });

    await showRoundBanner(this, {
      label: `ROUND ${idx + 1} / ${total}`,
      subtitle,
      accent: idx >= total - 1 ? COLORS.GOLD_ACCENT : COLORS.CYAN_GLOW,
    });

    this.isResolving = false;
  }

  private layoutTiles(round: TwoSumRoundConfig): void {
    this.tiles.forEach((t) => t.container.destroy());
    this.tiles = [];
    this.focusedTile = -1;

    const { width, height } = this.cameras.main;
    const n = round.values.length;
    const perRow = n <= 6 ? n : Math.ceil(n / 2);
    const rows = Math.ceil(n / perRow);

    // Slightly shrink tiles on rounds with many values so they fit on screen.
    const scale = n <= 5 ? 1.1 : n <= 8 ? 1.0 : 0.86;
    const tileW = Math.round(TILE_BASE_W * scale);
    const tileH = Math.round(TILE_BASE_H * scale);
    const gap = n <= 8 ? 18 : 10;
    const rowWidth = perRow * tileW + (perRow - 1) * gap;
    const startX = width / 2 - rowWidth / 2 + tileW / 2;
    const startY = height / 2 + 70 - ((rows - 1) * (tileH + 22)) / 2;

    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = startX + col * (tileW + gap);
      const y = startY + row * (tileH + 22);
      this.tiles.push(this.createTile(i, round.values[i], x, y, tileW, tileH));
    }
  }

  private createTile(index: number, value: number, x: number, y: number, w: number, h: number): NumberTile {
    const container = this.add.container(x, y).setDepth(30);

    const shadow = this.add.rectangle(3, 5, w, h, 0x000000, 0.32);
    // Stone slab base — kept as Rectangle so existing setFillStyle calls work.
    const box = this.add.rectangle(0, 0, w, h, 0xe0f8d0, 0.96)
      .setStrokeStyle(3, 0x346856, 1)
      .setInteractive({ useHandCursor: true });

    // Decorative carved-rune frame and corner notches.
    const decor = this.add.graphics();
    decor.lineStyle(1, 0x346856, 0.65);
    // Inner frame
    decor.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    // Corner chips
    [
      [-w / 2 + 2, -h / 2 + 2], [w / 2 - 6, -h / 2 + 2],
      [-w / 2 + 2, h / 2 - 6], [w / 2 - 6, h / 2 - 6],
    ].forEach(([cx, cy]) => decor.strokeRect(cx, cy, 4, 4));
    // Faint carved arc above the numeral (rune flourish).
    decor.lineStyle(1, 0x346856, 0.35);
    decor.beginPath();
    decor.arc(0, -h / 4, w / 3, Math.PI, 0);
    decor.strokePath();

    const label = this.add.text(0, 0, `${value}`, {
      fontSize: '22px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      stroke: '#e0f8d0',
      strokeThickness: 1,
    }).setOrigin(0.5);
    const key = this.add.text(0, h / 2 + 10, index < 9 ? `${index + 1}` : '', {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: '#346856',
    }).setOrigin(0.5);

    // Floating "Need: X" pill above the tile (initially hidden).
    const needBg = this.add.rectangle(0, -h / 2 - 18, 78, 20, 0x06b6d4, 0.96)
      .setStrokeStyle(1, 0x081820, 1);
    const needText = this.add.text(0, -h / 2 - 18, '', {
      fontSize: '11px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
    }).setOrigin(0.5);
    const needBadge = this.add.container(0, 0, [needBg, needText]).setAlpha(0);
    needBadge.setData('text', needText);
    needBadge.setData('bg', needBg);

    container.add([shadow, box, decor, label, key, needBadge]);
    box.on('pointerdown', () => this.chooseTile(index));
    // Hover affordance — the click target lifts slightly and brightens so the
    // player can scan complements with their eye instead of clicking blind.
    // We tween scale on the container, not the box, so the decor + label
    // come along for the ride.
    box.on('pointerover', () => {
      if (this.isResolving || this.actionLocked) return;
      if (this.selectedIndices.includes(index)) return;
      this.tweens.add({ targets: container, scale: 1.06, duration: 90, ease: 'Sine.easeOut' });
      box.setFillStyle(0xfde68a, 0.6);
    });
    box.on('pointerout', () => {
      this.tweens.add({ targets: container, scale: 1, duration: 110, ease: 'Sine.easeIn' });
      // Restore the appropriate fill — selection state takes precedence over
      // the hover preview.
      if (this.selectedIndices.includes(index)) {
        box.setFillStyle(COLORS.GOLD_ACCENT, 0.96);
        box.setStrokeStyle(3, COLORS.CYAN_GLOW, 0.95);
      } else {
        box.setFillStyle(0xe0f8d0, 0.96);
        box.setStrokeStyle(3, 0x346856, 1);
      }
    });

    // Entrance: small cascade so the field assembles, not just appears.
    container.setScale(0.6);
    container.setAlpha(0);
    this.tweens.add({
      targets: container, scale: 1, alpha: 1,
      duration: 240, delay: index * 40,
      ease: 'Back.easeOut',
    });

    return { index, value, container, box, label, needBadge };
  }

  // ──────────────────────────────────────────────────────────────────
  // Selection logic
  // ──────────────────────────────────────────────────────────────────

  private chooseTile(index: number): void {
    if (this.isResolving || this.actionLocked) return;
    const tile = this.tiles[index];
    if (!tile) return;
    const round = TWO_SUM_ROUND_CONFIGS[this.roundIndex];

    // Toggle off if already selected
    if (this.selectedIndices.includes(index)) {
      this.selectedIndices = this.selectedIndices.filter((i) => i !== index);
      this.styleTile(tile, false);
      this.hideNeedBadge(tile);
      this.redrawBeam();
      this.refreshPreview();
      this.bindTraceState();
      return;
    }

    this.selectedIndices.push(index);
    this.styleTile(tile, true);
    // The picked value joins the algorithm's `seen` set on first selection.
    if (!this.seenValues.includes(tile.value)) {
      this.seenValues.push(tile.value);
    }

    if (this.selectedIndices.length === 1) {
      const need = complementOf(tile.value, round.target);
      this.showNeedBadge(tile, need);
      this.bitHint?.moveTo(tile.container.x, tile.container.y - 90, 280);
      this.bitHint?.showWarm();
      this.redrawBeam();
      this.refreshPreview();
      this.bindTraceState();
      // Highlight the "compute need" line — the player is at step 3 of the algo.
      this.trace?.highlightLines(3, 2);
      // Need badge appears silently — announce the anchor + complement so
      // screen-reader players know what value to look for next.
      a11yManager.announce(`Anchored ${tile.value}. Need ${need} to reach target ${round.target}.`, false);
      return;
    }

    // Two tiles selected — evaluate.
    this.redrawBeam();
    this.refreshPreview();
    this.checksUsed++;
    this.complexity?.setAlgoCost(this.checksUsed);
    if (!this.seenValues.includes(tile.value)) {
      this.seenValues.push(tile.value);
    }
    this.bindTraceState();
    const values = this.selectedIndices.map((i) => this.tiles[i].value);
    if (isTwoSumPair(round.values, round.target, values)) {
      // The algorithm found target − v in `seen`: line 4 fires.
      this.trace?.highlightLine(4);
      this.complexity?.celebrate();
      this.handleCorrectPair();
    } else {
      // Algorithm path didn't terminate yet — line 5 (seen.add) fires, then
      // we'd loop back to line 1 in a real implementation. The wrong-pair
      // visual shake makes the "no match" reading clear.
      this.trace?.highlightLine(5);
      this.handleWrongPair();
    }
  }

  /** Push current scene state into the trace so {v}, {need}, {seen} update live. */
  private bindTraceState(): void {
    // FEEL_IT has no trace mounted (and shouldn't — `seen = {}` and
    // `need = target - v` are pure algorithm vocabulary). Guard against both
    // the unmounted-trace case and the per-round bail-out.
    if (this.isFeelItRound() || !this.trace) return;
    const round = TWO_SUM_ROUND_CONFIGS[this.roundIndex];
    const anchorIdx = this.selectedIndices[0];
    const anchor = anchorIdx !== undefined ? this.tiles[anchorIdx]?.value ?? null : null;
    const need = anchor !== null ? complementOf(anchor, round.target) : null;
    this.trace.bindState({
      target: round.target,
      v: anchor,
      need,
      seen: this.seenValues.length ? `{${this.seenValues.join(', ')}}` : '{}',
    });
  }

  private styleTile(tile: NumberTile, selected: boolean): void {
    if (selected) {
      tile.box.setFillStyle(COLORS.GOLD_ACCENT, 0.96);
      tile.box.setStrokeStyle(3, COLORS.CYAN_GLOW, 0.95);
    } else {
      tile.box.setFillStyle(0xe0f8d0, 0.96);
      tile.box.setStrokeStyle(3, 0x346856, 1);
    }
  }

  private showNeedBadge(tile: NumberTile, need: number): void {
    // FEEL_IT suppresses the NEED badge entirely — it's a literal printout of
    // target − v, which IS the complement technique. The whole point of round
    // 1 is the player computing this in their head.
    if (this.isFeelItRound()) return;
    const textObj = tile.needBadge.getData('text') as Phaser.GameObjects.Text;
    textObj.setText(`NEED ${need}`);
    tile.needBadge.setAlpha(0);
    this.tweens.add({
      targets: tile.needBadge, alpha: 1, y: -2,
      duration: 200, ease: 'Sine.easeOut',
    });
  }

  private hideNeedBadge(tile: NumberTile): void {
    this.tweens.add({
      targets: tile.needBadge, alpha: 0,
      duration: 160,
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Connecting beam
  // ──────────────────────────────────────────────────────────────────

  private redrawBeam(): void {
    this.beam.clear();
    if (this.selectedIndices.length !== 2) return;
    const a = this.tiles[this.selectedIndices[0]];
    const b = this.tiles[this.selectedIndices[1]];
    if (!a || !b) return;

    // Thick gold core + cyan halo
    this.beam.lineStyle(4, COLORS.GOLD_ACCENT, 0.95);
    this.beam.beginPath();
    this.beam.moveTo(a.container.x, a.container.y);
    this.beam.lineTo(b.container.x, b.container.y);
    this.beam.strokePath();

    this.beam.lineStyle(1, COLORS.CYAN_GLOW, 0.7);
    this.beam.beginPath();
    this.beam.moveTo(a.container.x, a.container.y);
    this.beam.lineTo(b.container.x, b.container.y);
    this.beam.strokePath();
  }

  // ──────────────────────────────────────────────────────────────────
  // Pair resolution
  // ──────────────────────────────────────────────────────────────────

  private refreshPreview(): void {
    if (!this.preview) return;
    const round = TWO_SUM_ROUND_CONFIGS[this.roundIndex];
    const selectedValues = this.selectedIndices
      .map((index) => this.tiles[index]?.value)
      .filter((value): value is number => value !== undefined);
    const preview = buildTwoSumPreview({
      values: round.values,
      target: round.target,
      selectedValues,
    });
    this.preview.setState(preview.state);
    this.preview.setNextAction(preview.next);
  }

  private handleCorrectPair(): void {
    this.isResolving = true;

    const a = this.tiles[this.selectedIndices[0]];
    const b = this.tiles[this.selectedIndices[1]];

    [a, b].forEach((tile) => {
      tile.box.setFillStyle(COLORS.SUCCESS, 1);
      tile.box.setStrokeStyle(3, 0x081820, 1);
      this.tweens.add({
        targets: tile.container, y: tile.container.y - 12,
        duration: 200, yoyo: true, ease: 'Quad.easeOut',
      });
    });

    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, (a.container.x + b.container.x) / 2, (a.container.y + b.container.y) / 2);

    // Pulse the beam brighter.
    this.tweens.addCounter({
      from: 1, to: 0, duration: 700, ease: 'Sine.easeOut',
      onUpdate: (tw) => {
        this.beam.clear();
        const v = tw.getValue() ?? 0;
        const alpha = 0.4 + 0.6 * v;
        this.beam.lineStyle(6, COLORS.GOLD_ACCENT, alpha);
        this.beam.beginPath();
        this.beam.moveTo(a.container.x, a.container.y);
        this.beam.lineTo(b.container.x, b.container.y);
        this.beam.strokePath();
      },
      onComplete: () => this.beam.clear(),
    });

    const isFinal = this.roundIndex >= TWO_SUM_ROUND_CONFIGS.length - 1;
    this.bitHint?.showWarm();
    this.showMessage(`${a.value} + ${b.value} = ${a.value + b.value}. Pair locked.`, COLORS.SUCCESS);

    if (isFinal) {
      this.bitHint?.celebrate();
      // Hold the body still through the victory + naming beat.
      this.room?.setActive(false);
      this.time.delayedCall(1400, () => {
        // Serene wonder (docs/VISION.md §6): accuracy + hints decide stars;
        // no speed pressure on first contact with the concept.
        const stars = starsFromMistakesAndHints(this.mistakesTotal, this.hintsUsed);
        this.onPuzzleComplete(stars);
      });
      return;
    }

    // FEEL_IT completion → fire the NAME_IT script beat once before round 2
    // starts. This is the moment Glitch (the speaker for AP-4) cracks and
    // names the technique. Freezing Glitch's brute-force counter lands the
    // "you won the contrast" beat right before they speak.
    this.time.delayedCall(1400, async () => {
      const finishedRound = TWO_SUM_ROUND_CONFIGS[this.roundIndex];
      if (
        finishedRound?.lesson.phase === PuzzlePhase.FEEL_IT &&
        finishedRound.lesson.nameItBeat &&
        !this.namedYet
      ) {
        this.namedYet = true;
        this.bruteForce?.freeze();
        await this.showNameItBeat(finishedRound.lesson.nameItBeat);
      }
      this.startRound(this.roundIndex + 1).catch(() => undefined);
    });
  }

  private handleWrongPair(): void {
    this.actionLocked = true;
    const wrongSelection = [...this.selectedIndices];
    const a = this.tiles[wrongSelection[0]];
    const b = this.tiles[wrongSelection[1]];
    if (!a || !b) {
      this.actionLocked = false;
      return;
    }
    this.attempts++;
    this.mistakesTotal++;

    audioManager.playWrongTone();
    JuiceSystem.wrongBurst(this, (a.container.x + b.container.x) / 2, (a.container.y + b.container.y) / 2);
    JuiceSystem.cameraShake(this, 50, 0.0015);
    this.bitHint?.showCold();
    this.showMessage(`${a.value} + ${b.value} = ${a.value + b.value}. Not the target.`, COLORS.WARNING);

    // Briefly redden the beam, then clear and reset selection.
    this.beam.clear();
    this.beam.lineStyle(4, 0xef4444, 0.9);
    this.beam.beginPath();
    this.beam.moveTo(a.container.x, a.container.y);
    this.beam.lineTo(b.container.x, b.container.y);
    this.beam.strokePath();

    this.time.delayedCall(500, () => {
      this.beam.clear();
      wrongSelection.forEach((i) => {
        const t = this.tiles[i];
        if (!t) return;
        this.styleTile(t, false);
        this.hideNeedBadge(t);
      });
      this.selectedIndices = [];
      this.actionLocked = false;
      this.refreshPreview();
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Hooks
  // ──────────────────────────────────────────────────────────────────

  protected displayHint(hintNumber: number): void {
    const round = TWO_SUM_ROUND_CONFIGS[this.roundIndex];
    const firstPair = round.validPairs[0];
    // FEEL_IT keeps the first hint diegetic — "target minus that value" names
    // the technique. Hints 2 and 3 give a concrete pair anyway (the player
    // already triggered the assist), so they're identical across phases.
    const firstHint = this.isFeelItRound()
      ? 'Pick a runestone. The one that finishes the pair is somewhere in the row.'
      : 'Pick one tile, then look for target minus that value.';
    const messages = [
      firstHint,
      this.selectedIndices.length === 1
        ? `You picked ${this.tiles[this.selectedIndices[0]].value}. Look for ${complementOf(this.tiles[this.selectedIndices[0]].value, round.target)}.`
        : `One valid pair: ${firstPair[0]} and ${firstPair[1]} → ${round.target}.`,
      `Total valid pairs this round: ${round.validPairs.length}. Any one of them wins.`,
    ];
    this.showMessage(messages[hintNumber - 1] ?? messages[0], COLORS.GOLD_ACCENT);
  }

  protected getConceptName(): string {
    return 'Two Sum';
  }
}

/** n(n-1)/2 — the number of unordered pairs in a row of n values. */
function pairCount(n: number): number {
  return Math.max(1, (n * (n - 1)) / 2);
}

// ──────────────────────────────────────────────────────────────────────────
// Brute-force strategy — fed to BruteForceActor during FEEL_IT round 1.
//
// Two-sum's brute-force foil is "check every pair (i, j)". The tile field is
// already visually busy (5+ runestones, target panel, beam, soft timer), so
// we run BruteForceActor in degenerate-row mode (no tile row); the counter
// ticks up as Glitch racks up pair checks. The visible chaos is implied —
// while the player picks one tile and *knows* its complement, Glitch is
// grinding through every combination.
// ──────────────────────────────────────────────────────────────────────────

function makeTwoSumBruteStrategy(): BruteForceStrategy {
  return {
    initialValues: [],
    nextMove: (vals) => vals,
    isSolved: () => false,
    tickIntervalMs: 800,
  };
}
