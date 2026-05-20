/**
 * Twin Rivers - first-principles two-pointer / sliding-window puzzles.
 *
 * Every puzzle here is interactive: the player physically operates pointers and
 * windows on a row of values, performing the algorithm by hand. Each scene
 * pairs a side-panel pseudocode trace with the action so the symbolic step
 * lights up at the same moment the visible step happens.
 *
 * Filename retained from the previous (multiple-choice) implementation so that
 * gameConfig scene registration and FutureRegionScene wiring remain unchanged.
 */

import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { audioManager } from '../../core/AudioManager';
import { JuiceSystem } from '../../systems/JuiceSystem';
import { RiverRow } from '../../ui/RiverRow';
import { AlgorithmTrace } from '../../ui/AlgorithmTrace';
import { PuzzleAmbience } from '../../ui/PuzzleAmbience';
import { PuzzlePreviewSidePanel } from '../../ui/PuzzlePreviewSidePanel';
import { BitCompanion } from '../../ui/BitCompanion';
import { GlitchCorner } from '../../ui/GlitchCorner';
import { ComplexityMeter } from '../../ui/ComplexityMeter';
import { NextMoveHint } from '../../ui/NextMoveHint';
import { TWIN_RIVERS_PUZZLE_THEME, type PuzzleTheme } from './puzzleTheme';
import type { RegionBackdropId, RegionBackdropOptions } from '../../ui/RegionBackdrop';
import { showLessonCard } from '../../ui/LessonCard';
import {
  buildCurrentRiderPreview,
  buildFixedWindowPreview,
  buildMirrorSerpentPreview,
  buildPointerBridgePreview,
} from '../../data/puzzles/puzzlePreviewLogic';
import {
  MIRROR_WALK_ROUNDS,
  POINTER_BRIDGE_ROUNDS,
  FIXED_WINDOW_ROUNDS,
  CURRENT_RIDER_ROUNDS,
  MIRROR_SERPENT_PHASES,
  reversedTarget,
  arrayEquals,
  pointerDirective,
  windowSumAt,
  bestFixedWindowStart,
  longestUniqueWindowLength,
  type FixedWindowRound,
  type PointerBridgeRound,
} from '../../data/puzzles/twinRiversPuzzleLogic';
import { BruteForceActor, type BruteForceStrategy } from '../../entities/BruteForceActor';
import { PuzzlePhase } from '../../data/types';

const BLUE_BANK = 0x5ab7d4;
const ORANGE_BANK = 0xf97316;
const GOLD = 0xfbbf24;

// ============================================================================
// P2_1 - Mirror Walk: in-place reverse via two converging pointers
// ============================================================================

export class P2_1_MirrorWalk extends BasePuzzleScene {
  private values: number[] = [];
  private targetValues: number[] = [];
  private leftIndex = 0;
  private rightIndex = 0;
  private roundIndex = 0;
  private mistakes = 0;
  private row!: RiverRow;
  /** Algorithm trace panel. Null in FEEL_IT round 1 — gated to USE_IT only,
   *  since the pseudocode names "reverse(arr)" and the two-pointer loop. */
  private trace: AlgorithmTrace | null = null;
  private statusText!: Phaser.GameObjects.Text;
  /** Reverse-preview side panel. Null in FEEL_IT — algorithm-named ("REVERSE
   *  PREVIEW") and shows `goal = [...]` which leaks the target shape. */
  private preview: PuzzlePreviewSidePanel | null = null;
  private actionLocked = false;
  private roundCompleting = false;
  private swappedThisPair = false;
  private leftAdvancedThisPair = false;
  private rightRetreatedThisPair = false;
  /** Glowing marker for the algorithm's next forced move. */
  private hint: NextMoveHint | null = null;
  /** Glitch as visible co-actor during FEEL_IT round 1. Null in USE_IT rounds. */
  private bruteForce: BruteForceActor | null = null;
  /** True between FEEL_IT round completion and USE_IT round mount. Guards
   *  against re-firing the NAME_IT beat on restart. */
  private namedYet = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_1 });
    this.puzzleId = 'tr_1';
    this.puzzleName = 'Mirror Walk';
    this.puzzleDescription = 'Two pointers walk inward and swap. Reverse the river.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.TWIN_RIVERS_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0;
  }
  protected getPuzzleTheme(): PuzzleTheme {
    return TWIN_RIVERS_PUZZLE_THEME;
  }
  protected getRegionBackdrop(): { id: RegionBackdropId; options?: RegionBackdropOptions } | null {
    return { id: 'twin-rivers', options: { riverMode: 'dual', intensity: 0.9 } };
  }
  protected getConceptName(): string {
    return 'Two-Pointer Reverse';
  }

  create(): void {
    // FEEL_IT first-principles guard: strip "two pointers walk inward and
    // swap" from the title subtitle. The player should derive the
    // two-pointer mechanic from the diegetic prompt and Glitch's contrast.
    if (MIRROR_WALK_ROUNDS[0]?.lesson?.phase === PuzzlePhase.FEEL_IT) {
      this.puzzleDescription = 'The river runs backwards. Reverse the current.';
    }
    super.create();
    new PuzzleAmbience(this, 'river', { intensity: 0.35 });
    const { width, height } = this.cameras.main;
    new BitCompanion(this, { stage: 'frame', frameMode: 'split', x: width - 108, y: 100, depth: 40 });
    // GlitchCorner removed — replaced by phase-gated BruteForceActor in
    // mountFeelItPanels (degenerate-row mode: heading + ticking counter).

    this.statusText = this.add.text(width / 2, 174, '', {
      fontSize: '12px',
      fontFamily: FONTS.MONO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setDepth(20);

    this.add.text(width / 2, height - 92, '[SPACE] swap  -  [D] move L  -  [J] move R', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
    }).setOrigin(0.5).setDepth(20);

    this.input.keyboard?.on('keydown-SPACE', this.onSwap);
    this.input.keyboard?.on('keydown-ENTER', this.onSwap);
    this.input.keyboard?.on('keydown-D', () => this.tryMoveLeft());
    this.input.keyboard?.on('keydown-J', () => this.tryMoveRight());
    // Arrow-key aliases — RIGHT advances L (inward), LEFT retreats R (inward).
    this.input.keyboard?.on('keydown-RIGHT', () => this.tryMoveLeft());
    this.input.keyboard?.on('keydown-LEFT', () => this.tryMoveRight());

    this.hint = new NextMoveHint(this, { tone: 'gold', depth: 45 });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bruteForce?.destroy();
      this.bruteForce = null;
    });

    void this.beginRound(0);
  }

  /**
   * Surfaces the round's `lesson` card before calling `startRound`. Inputs
   * are locked while the card is visible so the lesson's SPACE dismiss key
   * doesn't double-fire the puzzle's swap handler.
   */
  private async beginRound(index: number): Promise<void> {
    this.actionLocked = true;
    const lesson = MIRROR_WALK_ROUNDS[index]?.lesson;
    if (lesson) await showLessonCard(this, lesson, 'parchment');
    this.startRound(index);
  }

  /** Compute and push the predicted outcome of the next available key press. */
  private refreshPreview(): void {
    if (!this.preview) return;

    const valuesStr = `[${this.values.join(', ')}]`;
    const target = `[${this.targetValues.join(', ')}]`;
    const stateLines = [
      `arr   = ${valuesStr}`,
      `goal  = ${target}`,
      `L = ${this.leftIndex}  →  ${this.values[this.leftIndex] ?? '—'}`,
      `R = ${this.rightIndex}  →  ${this.values[this.rightIndex] ?? '—'}`,
    ];
    this.preview.setState(stateLines);

    let next: string;
    if (this.roundCompleting || this.leftIndex >= this.rightIndex) {
      next = 'Loop exits.\nRound complete — advance to next river.';
    } else if (this.swappedThisPair && this.leftAdvancedThisPair && !this.rightRetreatedThisPair) {
      const newR = this.rightIndex - 1;
      next = `J  →  R = ${newR} (value: ${this.values[newR] ?? '—'})`;
    } else if (!this.swappedThisPair) {
      // Preview the swap: predict the row state after SPACE
      const predicted = [...this.values];
      [predicted[this.leftIndex], predicted[this.rightIndex]] =
        [predicted[this.rightIndex], predicted[this.leftIndex]];
      next = `SPACE  →  arr = [${predicted.join(', ')}]`;
    } else if (!this.leftAdvancedThisPair) {
      const newL = this.leftIndex + 1;
      next = `D  →  L = ${newL} (value: ${this.values[newL] ?? '—'})`;
    } else {
      next = 'Check while condition.';
    }
    this.preview.setNextAction(next);
  }

  private readonly onSwap = () => {
    if (this.actionLocked) return;
    void this.trySwap();
  };

  // ──────────────────────────────────────────────────────────────────
  // Phase gating (FEEL_IT vs USE_IT)
  // ──────────────────────────────────────────────────────────────────

  /** Phase helper — true when the current round is FEEL_IT. Gates the trace
   *  panel, the reverse-preview side panel (algorithm-named), and any hint
   *  copy that would name "Two Pointers" before the player has felt it. */
  private isFeelItRound(): boolean {
    return MIRROR_WALK_ROUNDS[this.roundIndex]?.lesson?.phase === PuzzlePhase.FEEL_IT;
  }

  /** FEEL_IT mounts: only the brute-force co-actor. NO trace, NO preview.
   *  Glitch ticks a "random swaps" counter that never converges — the
   *  contrast IS the teaching. */
  private mountFeelItPanels(): void {
    if (this.bruteForce) return;
    const { height } = this.cameras.main;
    this.bruteForce = new BruteForceActor(this, {
      x: 152, y: height - 92,
      strategy: makeReverseBruteStrategy(),
      heading: "⚠ GLITCH'S APPROACH",
      subtitle: '(splashing at random tiles...)',
      notDoneLabel: 'still flailing',
      doneLabel: 'gave up',
      verbLabel: 'random swaps',
      depth: 40,
    });
  }

  /** USE_IT mounts: the full teaching toolkit. Idempotent — safe to call on
   *  every round-2-onward start. Holds the reverse(arr) pseudocode trace,
   *  the REVERSE PREVIEW side panel, and the friendly GlitchCorner. */
  private mountUseItPanels(): void {
    const { height } = this.cameras.main;
    if (!this.trace) {
      new GlitchCorner(this, {
        x: 152, y: height - 92,
        width: 240, height: 74,
        variant: 'parchment',
        heading: 'Nearby · Glitch (in the river)',
        body: '"The water tastes like ink!"',
        depth: 40,
      });
      this.trace = new AlgorithmTrace(this, {
        x: 64,
        y: 220,
        width: 240,
        title: 'reverse(arr)',
        lines: [
          'L = 0',
          'R = arr.length - 1',
          'while L < R:',
          '  swap(arr[L], arr[R])',
          '  L = L + 1',
          '  R = R - 1',
          'done',
        ],
      });
    }
    if (!this.preview) {
      this.preview = new PuzzlePreviewSidePanel(this, { side: 'right', yOffset: -16 });
      this.preview.setTitle('REVERSE PREVIEW');
      this.preview.show();
    }
  }

  // showNameItBeat lifted to BasePuzzleScene.

  private startRound(index: number): void {
    this.roundIndex = index;
    const round = MIRROR_WALK_ROUNDS[index];
    this.values = [...round.values];
    this.targetValues = reversedTarget(round.values);
    this.leftIndex = 0;
    this.rightIndex = round.values.length - 1;
    this.actionLocked = false;
    this.roundCompleting = false;
    this.swappedThisPair = false;
    this.leftAdvancedThisPair = false;
    this.rightRetreatedThisPair = false;

    if (this.row) this.row.destroy();
    this.row = new RiverRow(this, {
      values: this.values,
      centerX: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2 + 28,
      tileSize: 56,
      gap: 10,
    });
    this.row.setCursor('L', { label: 'L', color: BLUE_BANK, index: this.leftIndex, side: 'top' });
    this.row.setCursor('R', { label: 'R', color: ORANGE_BANK, index: this.rightIndex, side: 'top' });

    if (this.isFeelItRound()) {
      this.mountFeelItPanels();
    } else {
      this.mountUseItPanels();
      // Coming from FEEL_IT into USE_IT — fade Glitch out of focus instead of
      // destroying. Keeps the contrast visible after the player has the technique.
      this.bruteForce?.fadeTo(0.32);
    }

    this.refreshStatus();
    this.trace?.highlightLine(2); // while L < R
  }

  private refreshStatus(): void {
    const stage = this.roundIndex + 1;
    const total = MIRROR_WALK_ROUNDS.length;
    const needsRightRetreat =
      this.swappedThisPair && this.leftAdvancedThisPair && !this.rightRetreatedThisPair;
    // FEEL_IT strips array-index vocabulary ("arr[L]", "L = L + 1") from the
    // status line. The player still gets a next-action prompt, but in
    // riverbed terms — they shouldn't be reading pseudocode yet.
    const feelIt = this.isFeelItRound();
    const nextStep = feelIt
      ? (this.roundCompleting ? 'the river reverses'
        : needsRightRetreat ? 'J: step the right avatar inward'
          : this.leftIndex >= this.rightIndex ? 'the river reverses'
            : !this.swappedThisPair ? 'SPACE: trade the ends'
              : !this.leftAdvancedThisPair ? 'D: step the left avatar inward'
                : 'continue')
      : (this.roundCompleting ? 'loop exits'
        : needsRightRetreat ? 'J: R = R - 1'
          : this.leftIndex >= this.rightIndex ? 'loop exits'
            : !this.swappedThisPair ? 'SPACE: swap arr[L] and arr[R]'
              : !this.leftAdvancedThisPair ? 'D: L = L + 1'
                : 'check while condition');
    this.statusText.setText(
      `RIVER ${stage}/${total}   -   L=${this.leftIndex}   R=${this.rightIndex}   -   ${nextStep}`
    );
    this.refreshPreview();
    this.refreshHint();
  }

  /**
   * Position the NextMoveHint marker so the algorithm's forced action is
   * visible on the board itself, not just in the side trace:
   *   • Pre-swap → swap-pair arrows spanning L and R.
   *   • Post-swap, pre-advance → pulse-ring on L tile (next action: D).
   *   • Post-advance, pre-retreat → pulse-ring on R tile (next action: J).
   *   • Round complete → hide.
   */
  private refreshHint(): void {
    if (!this.hint || !this.row) return;
    if (this.roundCompleting || this.leftIndex >= this.rightIndex) {
      this.hint.clear();
      return;
    }
    const lCenter = this.row.tileCenter(this.leftIndex);
    const rCenter = this.row.tileCenter(this.rightIndex);
    if (!lCenter || !rCenter) {
      this.hint.clear();
      return;
    }
    const above = lCenter.y - this.row.tileSize / 2;
    if (!this.swappedThisPair) {
      this.hint.setTarget({
        kind: 'swap-pair',
        x: lCenter.x, x2: rCenter.x, y: above,
        label: 'swap',
      });
    } else if (!this.leftAdvancedThisPair) {
      this.hint.setTarget({
        kind: 'pulse-ring',
        x: lCenter.x, y: above - 12,
        label: 'L→',
      });
    } else if (!this.rightRetreatedThisPair) {
      this.hint.setTarget({
        kind: 'pulse-ring',
        x: rCenter.x, y: above - 12,
        label: '←R',
      });
    } else {
      this.hint.clear();
    }
  }

  private async trySwap(): Promise<void> {
    if (this.roundCompleting) return;
    if (this.swappedThisPair && this.leftAdvancedThisPair && !this.rightRetreatedThisPair) {
      this.flashWrong('Retreat R before checking the loop again.');
      return;
    }
    if (this.leftIndex >= this.rightIndex) {
      this.checkRoundComplete();
      return;
    }
    if (this.swappedThisPair) {
      this.flashWrong('Move L and R inward before swapping again.');
      return;
    }

    this.actionLocked = true;
    this.trace?.highlightLine(3); // swap
    audioManager.playTone(420, 90, 'sine');
    await this.row.animateSwap(this.leftIndex, this.rightIndex);

    [this.values[this.leftIndex], this.values[this.rightIndex]] =
      [this.values[this.rightIndex], this.values[this.leftIndex]];

    this.swappedThisPair = true;
    this.leftAdvancedThisPair = false;
    this.rightRetreatedThisPair = false;
    this.actionLocked = false;
    this.trace?.highlightLine(4); // L = L + 1
    this.refreshStatus();
  }

  private tryMoveLeft(): void {
    if (this.actionLocked) return;
    if (this.roundCompleting) return;
    if (this.swappedThisPair && this.leftAdvancedThisPair && !this.rightRetreatedThisPair) {
      this.flashWrong('R must retreat before L can move again.');
      return;
    }
    if (this.leftIndex >= this.rightIndex) {
      this.checkRoundComplete();
      return;
    }
    if (!this.swappedThisPair) {
      this.flashWrong('Swap the mirrored values first.');
      return;
    }
    if (this.leftAdvancedThisPair) {
      this.flashWrong('R must retreat before L can move again.');
      return;
    }

    this.actionLocked = true;
    this.trace?.highlightLine(4); // L = L + 1
    this.leftIndex++;
    this.leftAdvancedThisPair = true;
    this.row.moveCursor('L', this.leftIndex);
    audioManager.playTone(420, 60, 'sine');
    this.refreshStatus();

    this.time.delayedCall(240, () => {
      this.actionLocked = false;
      this.trace?.highlightLine(5); // R = R - 1
      this.refreshStatus();
    });
  }

  private tryMoveRight(): void {
    if (this.actionLocked) return;
    if (this.roundCompleting) return;
    if (!this.swappedThisPair) {
      if (this.leftIndex >= this.rightIndex) {
        this.checkRoundComplete();
        return;
      }
      this.flashWrong('Swap the mirrored values first.');
      return;
    }
    if (!this.leftAdvancedThisPair) {
      this.flashWrong('Advance L before retreating R.');
      return;
    }
    if (this.rightRetreatedThisPair) {
      this.flashWrong('Return to the while line before moving again.');
      return;
    }

    this.actionLocked = true;
    this.trace?.highlightLine(5); // R = R - 1
    this.rightIndex--;
    this.rightRetreatedThisPair = true;
    this.row.moveCursor('R', this.rightIndex);
    audioManager.playTone(360, 60, 'sine');
    this.refreshStatus();

    this.time.delayedCall(240, () => {
      this.finishPointerPair();
      if (!this.roundCompleting) this.actionLocked = false;
    });
  }

  private finishPointerPair(): void {
    if (!this.swappedThisPair || !this.leftAdvancedThisPair || !this.rightRetreatedThisPair) return;
    this.swappedThisPair = false;
    this.leftAdvancedThisPair = false;
    this.rightRetreatedThisPair = false;
    this.refreshStatus();

    if (this.leftIndex >= this.rightIndex) {
      this.trace?.highlightLine(6); // done
      this.checkRoundComplete();
      return;
    }

    this.trace?.highlightLine(2); // while L < R
  }

  private checkRoundComplete(): void {
    if (this.roundCompleting) return;
    if (this.leftIndex < this.rightIndex) return;

    this.roundCompleting = true;
    this.actionLocked = true;
    if (!arrayEquals(this.values, this.targetValues)) {
      // Should be unreachable given the mechanic, but guard anyway.
      this.mistakes++;
      JuiceSystem.wrongBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);
      this.roundCompleting = false;
      this.actionLocked = false;
      return;
    }

    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);

    if (this.roundIndex + 1 >= MIRROR_WALK_ROUNDS.length) {
      this.time.delayedCall(900, () => this.completePuzzle());
      return;
    }

    // FEEL_IT completion → fire the Mirror Walker's NAME_IT beat once
    // before round 2 starts. Freezing Glitch's random-swap counter lands
    // the "you won the contrast" beat just as the Walker speaks.
    this.time.delayedCall(900, async () => {
      const finishedRound = MIRROR_WALK_ROUNDS[this.roundIndex];
      if (
        finishedRound?.lesson?.phase === PuzzlePhase.FEEL_IT &&
        finishedRound.lesson.nameItBeat &&
        !this.namedYet
      ) {
        this.namedYet = true;
        this.bruteForce?.freeze();
        await this.showNameItBeat(finishedRound.lesson.nameItBeat);
      }
      void this.beginRound(this.roundIndex + 1);
    });
  }

  private flashWrong(message: string): void {
    this.mistakes++;
    JuiceSystem.cameraShake(this, 80, 0.002);
    this.showMessage(message, COLORS.WARNING);
    audioManager.playWrongTone();
  }

  private completePuzzle(): void {
    const stars = this.mistakes === 0 && this.hintsUsed === 0 ? 3
      : this.mistakes <= 1 && this.hintsUsed <= 1 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    // FEEL_IT hints stay diegetic — no "pointer", "loop", or "n/2" vocabulary.
    // The player should derive the converging-inward pattern from the
    // riverbed framing.
    const hints = this.isFeelItRound()
      ? [
        'Try the ends. Trade them. Then step inward on both banks.',
        'Each round you act on one pair: trade with SPACE, then step both avatars inward.',
        'When the two avatars meet, the current has reversed.',
      ]
      : [
        'A reverse loop has three visible steps: swap the mirrored values, move L right, then move R left.',
        'Follow the trace in order: SPACE, D, J. Only after both pointers move does the loop check again.',
        'A reverse over n values takes exactly floor(n/2) swaps.',
      ];
    this.showMessage(hints[hintNumber - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P2_2 - Pointer Bridge: sorted two-sum
// ============================================================================

export class P2_2_PointerBridge extends BasePuzzleScene {
  private round!: PointerBridgeRound;
  private roundIndex = 0;
  private mistakes = 0;
  private leftIndex = 0;
  private rightIndex = 0;
  private row!: RiverRow;
  /** Algorithm trace panel. Null in FEEL_IT round 1 — the twoSum(arr, target)
   *  pseudocode is the entire technique; mounting it would defeat the contract. */
  private trace: AlgorithmTrace | null = null;
  private sumText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  /** Pointer preview side panel. Null in FEEL_IT — "POINTER PREVIEW" names
   *  the technique by chrome alone. */
  private preview: PuzzlePreviewSidePanel | null = null;
  private actionLocked = false;
  /** Pair-checks (brute) vs walk steps (algo). */
  private complexity: ComplexityMeter | null = null;
  /** Walk steps consumed this round — every pointer move counts. */
  private walkSteps = 0;
  /** Glitch as visible co-actor during FEEL_IT round 1. Null in USE_IT rounds. */
  private bruteForce: BruteForceActor | null = null;
  /** True between FEEL_IT round completion and USE_IT round mount. Guards
   *  against re-firing the NAME_IT beat on restart. */
  private namedYet = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_2 });
    this.puzzleId = 'tr_2';
    this.puzzleName = 'Pointer Bridge';
    this.puzzleDescription = 'On a sorted row, raise the low side or lower the high side until the pair sums match.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.TWIN_RIVERS_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0;
  }
  protected getPuzzleTheme(): PuzzleTheme {
    return TWIN_RIVERS_PUZZLE_THEME;
  }
  protected getRegionBackdrop(): { id: RegionBackdropId; options?: RegionBackdropOptions } | null {
    // Pointer Bridge crosses the converged river — one wide blue ribbon flowing
    // downstream, so the bridge becomes the natural stage spine.
    return { id: 'twin-rivers', options: { riverMode: 'converged', intensity: 0.9 } };
  }
  protected getConceptName(): string {
    return 'Sorted Two-Sum';
  }

  create(): void {
    // FEEL_IT first-principles guard: strip "sorted row, raise the low side"
    // from the title subtitle. The player should derive that the sortedness
    // makes one direction always correct.
    if (POINTER_BRIDGE_ROUNDS[0]?.lesson?.phase === PuzzlePhase.FEEL_IT) {
      this.puzzleDescription = 'Find two stones whose values sum to the target. The Bridge Keeper watches.';
    }
    super.create();
    new PuzzleAmbience(this, 'river', { intensity: 0.35 });
    const { width, height } = this.cameras.main;
    new BitCompanion(this, { stage: 'frame', frameMode: 'split', x: width - 108, y: 100, depth: 40 });
    // GlitchCorner, ComplexityMeter, AlgorithmTrace, PuzzlePreviewSidePanel
    // all moved into mountUseItPanels — the round-1 FEEL_IT mount has only
    // the brute-force counter, no algorithm-named chrome.

    this.statusText = this.add.text(width / 2, 174, '', {
      fontSize: '12px',
      fontFamily: FONTS.MONO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setDepth(20);

    this.sumText = this.add.text(width / 2, 218, '', {
      fontSize: '18px',
      fontFamily: FONTS.RETRO,
      color: '#fbbf24',
      stroke: '#081820',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(width / 2, height - 92, '[A]/[D] move left avatar  -  [J]/[L] move right avatar  -  [ENTER] lock pair', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
    }).setOrigin(0.5).setDepth(20);

    this.input.keyboard?.on('keydown-A', () => this.tryMoveLeft(-1));
    this.input.keyboard?.on('keydown-D', () => this.tryMoveLeft(1));
    this.input.keyboard?.on('keydown-J', () => this.tryMoveRight(-1));
    this.input.keyboard?.on('keydown-L', () => this.tryMoveRight(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.tryLock());
    this.input.keyboard?.on('keydown-SPACE', () => this.tryLock());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bruteForce?.destroy();
      this.bruteForce = null;
    });

    void this.beginRound(0);
  }

  // ──────────────────────────────────────────────────────────────────
  // Phase gating (FEEL_IT vs USE_IT)
  // ──────────────────────────────────────────────────────────────────

  private isFeelItRound(): boolean {
    return POINTER_BRIDGE_ROUNDS[this.roundIndex]?.lesson?.phase === PuzzlePhase.FEEL_IT;
  }

  /** FEEL_IT mounts: only the brute-force pair-check counter. NO trace, NO
   *  preview, NO complexity meter. The two-pointer technique should be the
   *  player's discovery, not the screen's announcement. */
  private mountFeelItPanels(): void {
    if (this.bruteForce) return;
    const { height } = this.cameras.main;
    this.bruteForce = new BruteForceActor(this, {
      x: 152, y: height - 92,
      strategy: makeSortedPairsBruteStrategy(),
      heading: "⚠ GLITCH'S APPROACH",
      subtitle: '(checking every pair at random...)',
      notDoneLabel: 'still flailing',
      doneLabel: 'gave up',
      verbLabel: 'pair checks',
      depth: 40,
    });
  }

  /** USE_IT mounts: the full teaching toolkit. Idempotent — safe to call on
   *  every round-2-onward start. Holds the twoSum(arr, target) pseudocode
   *  trace, the POINTER PREVIEW side panel, the pair-checks-vs-walk-steps
   *  complexity meter, and the friendly GlitchCorner. */
  private mountUseItPanels(): void {
    const { width, height } = this.cameras.main;
    if (!this.trace) {
      new GlitchCorner(this, {
        x: 152, y: height - 92,
        width: 240, height: 74,
        variant: 'parchment',
        heading: "Glitch's Approach",
        body: 'check every pair: n(n−1)/2 · the walk: ≤ n steps.',
        depth: 40,
      });
      this.trace = new AlgorithmTrace(this, {
        x: 64,
        y: 244,
        width: 248,
        title: 'twoSum(arr, target)',
        lines: [
          'L = 0',
          'R = arr.length - 1',
          'while L < R:',
          '  s = arr[L] + arr[R]',
          '  if s == target: return L,R',
          '  if s <  target: L++',
          '  if s >  target: R--',
        ],
      });
    }
    if (!this.preview) {
      this.preview = new PuzzlePreviewSidePanel(this, { side: 'right', yOffset: -16 });
      this.preview.setTitle('POINTER PREVIEW');
      this.preview.show();
    }
    if (!this.complexity) {
      this.complexity = new ComplexityMeter(this, {
        x: width / 2, y: 246,
        width: 320,
        bruteLabel: 'pair checks',
        bruteCost: pairCount(POINTER_BRIDGE_ROUNDS[this.roundIndex].values.length),
        algoLabel: 'walk steps',
        algoCost: 0,
        variant: 'parchment',
        depth: 40,
      });
    }
  }

  private async beginRound(index: number): Promise<void> {
    this.actionLocked = true;
    const lesson = POINTER_BRIDGE_ROUNDS[index]?.lesson;
    if (lesson) await showLessonCard(this, lesson, 'parchment');
    this.startRound(index);
  }

  private startRound(index: number): void {
    this.roundIndex = index;
    this.round = POINTER_BRIDGE_ROUNDS[index];
    this.leftIndex = 0;
    this.rightIndex = this.round.values.length - 1;
    this.walkSteps = 0;

    if (this.row) this.row.destroy();
    this.row = new RiverRow(this, {
      values: this.round.values,
      centerX: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2 + 36,
      tileSize: 54,
      gap: 8,
    });
    this.row.setCursor('L', { label: 'L', color: BLUE_BANK, index: this.leftIndex, side: 'top' });
    this.row.setCursor('R', { label: 'R', color: ORANGE_BANK, index: this.rightIndex, side: 'top' });

    if (this.isFeelItRound()) {
      this.mountFeelItPanels();
    } else {
      this.mountUseItPanels();
      // Coming from FEEL_IT into USE_IT — fade Glitch out of focus instead of
      // destroying. Keeps the contrast visible after the player has the technique.
      this.bruteForce?.fadeTo(0.32);
    }

    this.complexity?.reset({
      bruteCost: pairCount(this.round.values.length),
      algoCost: 0,
      bruteLabel: 'pair checks',
      algoLabel: 'walk steps',
    });

    this.refreshDisplay();
  }

  private currentSum(): number {
    return this.round.values[this.leftIndex] + this.round.values[this.rightIndex];
  }

  private refreshDisplay(): void {
    const stage = this.roundIndex + 1;
    const total = POINTER_BRIDGE_ROUNDS.length;
    this.statusText.setText(`BRIDGE ${stage}/${total}   -   target = ${this.round.target}`);

    const sum = this.currentSum();
    const diff = sum - this.round.target;
    const sign = diff === 0 ? '=' : diff > 0 ? '>' : '<';
    this.sumText.setText(`${this.round.values[this.leftIndex]} + ${this.round.values[this.rightIndex]} = ${sum}  ${sign}  ${this.round.target}`);
    this.sumText.setColor(diff === 0 ? '#88c070' : '#fbbf24');

    const directive = pointerDirective(sum, this.round.target);
    this.trace?.highlightLine(directive === 'lock' ? 4 : directive === 'advance_left' ? 5 : 6);
    this.refreshPreview();
  }

  private refreshPreview(): void {
    if (!this.preview) return;
    const preview = buildPointerBridgePreview({
      values: this.round.values,
      target: this.round.target,
      left: this.leftIndex,
      right: this.rightIndex,
    });
    this.preview.setState(preview.state);
    this.preview.setNextAction(preview.next);
  }

  private tryMoveLeft(direction: -1 | 1): void {
    if (this.actionLocked) return;
    const directive = pointerDirective(this.currentSum(), this.round.target);
    if (direction !== 1 || directive !== 'advance_left') {
      this.flashWrong('The algorithm forces a different move. Watch the trace.');
      return;
    }
    if (this.leftIndex + 1 >= this.rightIndex) return;
    this.leftIndex++;
    this.walkSteps++;
    this.complexity?.setAlgoCost(this.walkSteps);
    this.row.moveCursor('L', this.leftIndex);
    audioManager.playTone(420, 60, 'sine');
    this.refreshDisplay();
  }

  private tryMoveRight(direction: -1 | 1): void {
    if (this.actionLocked) return;
    const directive = pointerDirective(this.currentSum(), this.round.target);
    if (direction !== -1 || directive !== 'retreat_right') {
      this.flashWrong('The algorithm forces a different move. Watch the trace.');
      return;
    }
    if (this.rightIndex - 1 <= this.leftIndex) return;
    this.rightIndex--;
    this.walkSteps++;
    this.complexity?.setAlgoCost(this.walkSteps);
    this.row.moveCursor('R', this.rightIndex);
    audioManager.playTone(360, 60, 'sine');
    this.refreshDisplay();
  }

  private tryLock(): void {
    if (this.actionLocked) return;
    if (this.currentSum() !== this.round.target) {
      this.flashWrong('That pair does not match the target.');
      return;
    }
    this.actionLocked = true;
    this.complexity?.celebrate();
    audioManager.playCorrectTone();
    this.row.pulseTile(this.leftIndex, COLORS.SUCCESS);
    this.row.pulseTile(this.rightIndex, COLORS.SUCCESS);
    JuiceSystem.correctBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);

    // FEEL_IT completion → fire the Bridge Keeper's NAME_IT beat once before
    // round 2 starts. Freezing Glitch's pair-check counter lands the
    // "you won the contrast" moment as the Keeper speaks.
    this.time.delayedCall(800, async () => {
      this.actionLocked = false;
      if (this.roundIndex + 1 >= POINTER_BRIDGE_ROUNDS.length) {
        this.completePuzzle();
        return;
      }
      const finishedRound = POINTER_BRIDGE_ROUNDS[this.roundIndex];
      if (
        finishedRound?.lesson?.phase === PuzzlePhase.FEEL_IT &&
        finishedRound.lesson.nameItBeat &&
        !this.namedYet
      ) {
        this.namedYet = true;
        this.bruteForce?.freeze();
        await this.showNameItBeat(finishedRound.lesson.nameItBeat);
      }
      void this.beginRound(this.roundIndex + 1);
    });
  }

  private flashWrong(message: string): void {
    this.mistakes++;
    JuiceSystem.cameraShake(this, 80, 0.002);
    this.showMessage(message, COLORS.WARNING);
    audioManager.playWrongTone();
  }

  private completePuzzle(): void {
    // Tightened scoring: 3 stars only for flawless; 2 stars allows one mistake
    // and one hint.
    const stars = this.mistakes === 0 && this.hintsUsed === 0 ? 3
      : this.mistakes <= 1 && this.hintsUsed <= 1 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    // FEEL_IT hints stay diegetic — no "pointer" vocabulary, no trace
    // references. The riverbed framing carries the same affordance.
    const hints = this.isFeelItRound()
      ? [
        'Sum too small? Move the left avatar higher (D). Sum too big? Move the right avatar lower (J).',
        'The stones are in order. The sum tells you which way to step — you never have to guess.',
        'Watch Glitch test every pair. Walking from the ends is much faster.',
      ]
      : [
        'Sum too small? Raise the left pointer (D). Sum too big? Lower the right pointer (J).',
        'A sorted row makes the right move forced — only one direction can fix the gap.',
        `The trace shows the only legal move for this state. Match the highlighted line.`,
      ];
    this.showMessage(hints[hintNumber - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P2_3 - Fixed Window Dock: max-sum sliding window
// ============================================================================

export class P2_3_FixedWindowDock extends BasePuzzleScene {
  private round!: FixedWindowRound;
  private roundIndex = 0;
  private mistakes = 0;
  private windowStart = 0;
  private bestSeenSum = 0;
  private row!: RiverRow;
  /** maxFixedWindow pseudocode trace. Null in FEEL_IT — the pseudocode IS
   *  the technique; mounting it would defeat the contract. */
  private trace: AlgorithmTrace | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private sumText!: Phaser.GameObjects.Text;
  /** Window preview side panel. Null in FEEL_IT. */
  private preview: PuzzlePreviewSidePanel | null = null;
  private actionLocked = false;
  /** Brute (recompute every window: (n-k+1)·k) vs algo (n-k+1 slides). */
  private complexity: ComplexityMeter | null = null;
  /** Number of slide operations the player has performed this round. */
  private slideCount = 0;
  /** Glitch as visible co-actor during FEEL_IT round 1. */
  private bruteForce: BruteForceActor | null = null;
  /** True between FEEL_IT round completion and USE_IT round mount. */
  private namedYet = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_3 });
    this.puzzleId = 'tr_3';
    this.puzzleName = 'Fixed Window Dock';
    this.puzzleDescription = 'Slide a fixed window along the dock. Find the heaviest catch.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.TWIN_RIVERS_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0;
  }
  protected getPuzzleTheme(): PuzzleTheme {
    return TWIN_RIVERS_PUZZLE_THEME;
  }
  protected getRegionBackdrop(): { id: RegionBackdropId; options?: RegionBackdropOptions } | null {
    return { id: 'twin-rivers', options: { riverMode: 'converged', intensity: 0.9 } };
  }
  protected getConceptName(): string {
    return 'Fixed Sliding Window';
  }

  // ──────────────────────────────────────────────────────────────────
  // Phase gating (FEEL_IT vs USE_IT)
  // ──────────────────────────────────────────────────────────────────

  private isFeelItRound(): boolean {
    return FIXED_WINDOW_ROUNDS[this.roundIndex]?.lesson?.phase === PuzzlePhase.FEEL_IT;
  }

  /** FEEL_IT mounts: only the brute-force window-rescan counter. NO trace,
   *  NO preview, NO complexity meter. The sliding-window technique should be
   *  the player's discovery from watching the EDGES, not the screen's
   *  announcement. */
  private mountFeelItPanels(): void {
    if (this.bruteForce) return;
    const { height } = this.cameras.main;
    this.bruteForce = new BruteForceActor(this, {
      x: 152, y: height - 92,
      strategy: makeWindowSlideBruteStrategy(),
      heading: "⚠ GLITCH'S APPROACH",
      subtitle: '(recounting every slat from scratch...)',
      notDoneLabel: 'still counting',
      doneLabel: 'gave up',
      verbLabel: 'window rescans',
      depth: 40,
    });
  }

  /** USE_IT mounts: the full teaching toolkit. Idempotent — safe to call on
   *  every round-2-onward start. Holds the maxFixedWindow trace, the WINDOW
   *  PREVIEW side panel, the recompute-vs-slide complexity meter, and the
   *  friendly GlitchCorner. */
  private mountUseItPanels(): void {
    const { width, height } = this.cameras.main;
    if (!this.trace) {
      new GlitchCorner(this, {
        x: 152, y: height - 92,
        width: 240, height: 74,
        variant: 'parchment',
        heading: 'Glitch Re-Adds Each Window',
        body: 'recount every step: O(n·k). Slide: O(n).',
        depth: 40,
      });
      this.trace = new AlgorithmTrace(this, {
        x: 64,
        y: 244,
        width: 252,
        title: 'maxFixedWindow(arr,k)',
        lines: [
          's = sum(arr[0..k-1])',
          'best = s',
          'for i in 1..n-k:',
          '  s += arr[i+k-1]',
          '  s -= arr[i-1]',
          '  best = max(best, s)',
          'lock at best',
        ],
      });
    }
    if (!this.preview) {
      this.preview = new PuzzlePreviewSidePanel(this, { side: 'right', yOffset: -16 });
      this.preview.setTitle('WINDOW PREVIEW');
      this.preview.show();
    }
    if (!this.complexity) {
      const r0 = FIXED_WINDOW_ROUNDS[this.roundIndex];
      this.complexity = new ComplexityMeter(this, {
        x: width / 2, y: 246,
        width: 320,
        bruteLabel: 'recompute cost',
        bruteCost: bruteWindowCost(r0.values.length, r0.windowSize),
        algoLabel: 'your slides',
        algoCost: 0,
        variant: 'parchment',
        depth: 40,
      });
    }
  }

  create(): void {
    // FEEL_IT first-principles guard: strip "slide a fixed window" from the
    // title subtitle. The player should derive the window-edge insight from
    // watching what enters and leaves the net.
    if (FIXED_WINDOW_ROUNDS[0]?.lesson?.phase === PuzzlePhase.FEEL_IT) {
      this.puzzleDescription = 'Slide your net along the dock. Find the heaviest catch.';
    }
    super.create();
    new PuzzleAmbience(this, 'river', { intensity: 0.35 });
    const { width, height } = this.cameras.main;
    // Frame mode (not split) — Bit's frame BECOMES the sliding window.
    new BitCompanion(this, { stage: 'frame', frameMode: 'frame', x: width - 108, y: 100, depth: 40 });
    // GlitchCorner, ComplexityMeter, AlgorithmTrace, PuzzlePreviewSidePanel
    // all moved into mountUseItPanels — FEEL_IT round 1 carries only the
    // BruteForceActor counter, no algorithm-named chrome.

    this.statusText = this.add.text(width / 2, 174, '', {
      fontSize: '12px',
      fontFamily: FONTS.MONO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setDepth(20);

    this.sumText = this.add.text(width / 2, 218, '', {
      fontSize: '16px',
      fontFamily: FONTS.RETRO,
      color: '#fbbf24',
      stroke: '#081820',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    // Keyboard hint switches "window" → "net" in FEEL_IT to stay diegetic.
    const keyboardHint = FIXED_WINDOW_ROUNDS[0]?.lesson?.phase === PuzzlePhase.FEEL_IT
      ? '[<-]/[->] slide net  -  [SPACE] lock at current position'
      : '[<-]/[->] slide window  -  [SPACE] lock at current position';
    this.add.text(width / 2, height - 92, keyboardHint, {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
    }).setOrigin(0.5).setDepth(20);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bruteForce?.destroy();
      this.bruteForce = null;
    });

    this.input.keyboard?.on('keydown-LEFT', () => this.slide(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.slide(1));
    this.input.keyboard?.on('keydown-A', () => this.slide(-1));
    this.input.keyboard?.on('keydown-D', () => this.slide(1));
    this.input.keyboard?.on('keydown-SPACE', () => this.tryLock());
    this.input.keyboard?.on('keydown-ENTER', () => this.tryLock());

    void this.beginRound(0);
  }

  private async beginRound(index: number): Promise<void> {
    this.actionLocked = true;
    const lesson = FIXED_WINDOW_ROUNDS[index]?.lesson;
    if (lesson) await showLessonCard(this, lesson, 'parchment');
    this.startRound(index);
  }

  private startRound(index: number): void {
    this.roundIndex = index;
    this.round = FIXED_WINDOW_ROUNDS[index];
    this.windowStart = 0;
    this.bestSeenSum = windowSumAt(this.round.values, 0, this.round.windowSize);
    this.slideCount = 0;

    if (this.row) this.row.destroy();
    this.row = new RiverRow(this, {
      values: this.round.values,
      centerX: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2 + 36,
      tileSize: 50,
      gap: 6,
    });

    if (this.isFeelItRound()) {
      this.mountFeelItPanels();
    } else {
      this.mountUseItPanels();
      // Coming from FEEL_IT into USE_IT — fade Glitch out of focus instead of
      // destroying. Keeps the rescan-count contrast visible.
      this.bruteForce?.fadeTo(0.32);
    }

    this.complexity?.reset({
      bruteCost: bruteWindowCost(this.round.values.length, this.round.windowSize),
      algoCost: 0,
      bruteLabel: 'recompute cost',
      algoLabel: 'your slides',
    });

    this.refreshDisplay();
  }

  private refreshDisplay(): void {
    const stage = this.roundIndex + 1;
    const total = FIXED_WINDOW_ROUNDS.length;
    const k = this.round.windowSize;
    this.statusText.setText(
      `DOCK ${stage}/${total}   -   window size = ${k}   -   slide to the heaviest catch`
    );

    const left = this.windowStart;
    const right = this.windowStart + k - 1;
    this.row.setWindow(left, right, GOLD);

    const sum = windowSumAt(this.round.values, left, k);
    if (sum > this.bestSeenSum) {
      this.bestSeenSum = sum;
    }
    this.sumText.setText(`SUM = ${sum}   -   BEST SEEN = ${this.bestSeenSum}`);

    // Light up the appropriate line in the trace.
    if (this.windowStart === 0) this.trace?.highlightLine(0);
    else this.trace?.highlightLine(5); // best = max(best, s)
    this.refreshPreview();
  }

  private refreshPreview(): void {
    if (!this.preview) return;
    const preview = buildFixedWindowPreview({
      values: this.round.values,
      windowSize: this.round.windowSize,
      start: this.windowStart,
      bestSeen: this.bestSeenSum,
    });
    this.preview.setState(preview.state);
    this.preview.setNextAction(preview.next);
  }

  private slide(direction: -1 | 1): void {
    if (this.actionLocked) return;
    const next = this.windowStart + direction;
    if (next < 0 || next + this.round.windowSize > this.round.values.length) return;
    this.windowStart = next;
    this.slideCount++;
    this.complexity?.setAlgoCost(this.slideCount);
    audioManager.playTone(direction === 1 ? 540 : 420, 50, 'sine');
    this.refreshDisplay();
  }

  private tryLock(): void {
    if (this.actionLocked) return;
    const k = this.round.windowSize;
    const optimal = bestFixedWindowStart(this.round.values, k);
    const optimalSum = windowSumAt(this.round.values, optimal, k);
    const here = windowSumAt(this.round.values, this.windowStart, k);

    if (here !== optimalSum) {
      this.mistakes++;
      JuiceSystem.cameraShake(this, 80, 0.002);
      audioManager.playWrongTone();
      this.showMessage(`Sum here is ${here}; the maximum is higher. Keep sliding.`, COLORS.WARNING);
      return;
    }

    this.actionLocked = true;
    this.complexity?.celebrate();
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);
    for (let i = this.windowStart; i < this.windowStart + k; i++) {
      this.row.pulseTile(i, COLORS.SUCCESS);
    }

    // FEEL_IT completion → fire the Window Fisher's NAME_IT beat once before
    // round 2 starts. Freezing Glitch's rescan counter lands the contrast.
    this.time.delayedCall(900, async () => {
      this.actionLocked = false;
      if (this.roundIndex + 1 >= FIXED_WINDOW_ROUNDS.length) {
        this.completePuzzle();
        return;
      }
      const finishedRound = FIXED_WINDOW_ROUNDS[this.roundIndex];
      if (
        finishedRound?.lesson?.phase === PuzzlePhase.FEEL_IT &&
        finishedRound.lesson.nameItBeat &&
        !this.namedYet
      ) {
        this.namedYet = true;
        this.bruteForce?.freeze();
        await this.showNameItBeat(finishedRound.lesson.nameItBeat);
      }
      void this.beginRound(this.roundIndex + 1);
    });
  }

  private completePuzzle(): void {
    // Tightened scoring: 3 stars only for a flawless run, and the optimal
    // window must be reached on the first lock per round (mistakes counts
    // every wrong lock).
    const stars = this.mistakes === 0 && this.hintsUsed === 0 ? 3
      : this.mistakes <= 1 && this.hintsUsed <= 1 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    // FEEL_IT hints stay diegetic — no "sum", "slide", "index" as technique
    // vocabulary. The dock + net + catch framing carries the same affordance.
    const hints = this.isFeelItRound()
      ? [
        'Watch what enters your net and what leaves it. The middle stays the same.',
        'Keep track of the heaviest catch you have seen so far.',
        `The best spot starts at slat ${bestFixedWindowStart(this.round.values, this.round.windowSize)}.`,
      ]
      : [
        'Each step changes the sum by only two values: one enters on the right, one leaves on the left.',
        'BEST SEEN updates whenever you slide past a richer slice — keep an eye on it.',
        `The maximum window starts at index ${bestFixedWindowStart(this.round.values, this.round.windowSize)}.`,
      ];
    this.showMessage(hints[hintNumber - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P2_4 - Current Rider: longest substring without repeats (variable window)
// ============================================================================

export class P2_4_CurrentRider extends BasePuzzleScene {
  private round!: { letters: ReadonlyArray<string> };
  private roundIndex = 0;
  private mistakes = 0;
  private leftIndex = 0;
  private rightIndex = 0;
  private bestLength = 0;
  private optimal = 0;
  private row!: RiverRow;
  /** longestUnique(s) pseudocode trace. Null in FEEL_IT. */
  private trace: AlgorithmTrace | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private metricsText!: Phaser.GameObjects.Text;
  /** Current preview side panel. Null in FEEL_IT. */
  private preview: PuzzlePreviewSidePanel | null = null;
  private actionLocked = false;
  /** Glitch as visible co-actor during FEEL_IT round 1. */
  private bruteForce: BruteForceActor | null = null;
  /** True between FEEL_IT round completion and USE_IT round mount. */
  private namedYet = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_4 });
    this.puzzleId = 'tr_4';
    this.puzzleName = 'Current Rider';
    this.puzzleDescription = 'Stretch the window when safe. Shrink it when the river repeats.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.TWIN_RIVERS_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0;
  }
  protected getPuzzleTheme(): PuzzleTheme {
    return TWIN_RIVERS_PUZZLE_THEME;
  }
  protected getRegionBackdrop(): { id: RegionBackdropId; options?: RegionBackdropOptions } | null {
    return { id: 'twin-rivers', options: { riverMode: 'converged', intensity: 0.9 } };
  }
  protected getConceptName(): string {
    return 'Variable Sliding Window';
  }

  // ──────────────────────────────────────────────────────────────────
  // Phase gating (FEEL_IT vs USE_IT)
  // ──────────────────────────────────────────────────────────────────

  private isFeelItRound(): boolean {
    return CURRENT_RIDER_ROUNDS[this.roundIndex]?.lesson?.phase === PuzzlePhase.FEEL_IT;
  }

  /** FEEL_IT mounts: only the brute-force substring-checks counter. NO trace,
   *  NO preview. The expand-and-shrink rhythm should be the player's
   *  discovery from listening to the river, not the screen's announcement. */
  private mountFeelItPanels(): void {
    if (this.bruteForce) return;
    const { height } = this.cameras.main;
    this.bruteForce = new BruteForceActor(this, {
      x: 152, y: height - 92,
      strategy: makeVariableWindowBruteStrategy(),
      heading: "⚠ GLITCH'S APPROACH",
      subtitle: '(trying every single substring...)',
      notDoneLabel: 'still checking',
      doneLabel: 'gave up',
      verbLabel: 'substring checks',
      depth: 40,
    });
  }

  /** USE_IT mounts: the full teaching toolkit. Idempotent. */
  private mountUseItPanels(): void {
    const { height } = this.cameras.main;
    if (!this.trace) {
      new GlitchCorner(this, {
        x: 152, y: height - 92,
        width: 240, height: 74,
        variant: 'parchment',
        heading: 'Glitch Rechecks Every Substring',
        body: 'all substrings: O(n²). Two pointers: O(n).',
        depth: 40,
      });
      this.trace = new AlgorithmTrace(this, {
        x: 64,
        y: 244,
        width: 252,
        title: 'longestUnique(s)',
        lines: [
          'L = 0',
          'best = 0',
          'for R in 0..n-1:',
          '  while dup(s[L..R]):',
          '    L = L + 1',
          '  best = max(best, R-L+1)',
        ],
      });
    }
    if (!this.preview) {
      this.preview = new PuzzlePreviewSidePanel(this, { side: 'right', yOffset: -16 });
      this.preview.setTitle('CURRENT PREVIEW');
      this.preview.show();
    }
  }

  create(): void {
    // FEEL_IT first-principles guard: strip "stretch right, shrink left" from
    // the title subtitle. The player should derive the listen-to-the-river
    // rhythm from the catch quality, not a written rule.
    if (CURRENT_RIDER_ROUNDS[0]?.lesson?.phase === PuzzlePhase.FEEL_IT) {
      this.puzzleDescription = 'Keep the good. Kick out the bad. Make the net whatever size it needs to be.';
    }
    super.create();
    new PuzzleAmbience(this, 'river', { intensity: 0.35 });
    const { width, height } = this.cameras.main;
    new BitCompanion(this, { stage: 'frame', frameMode: 'frame', x: width - 108, y: 100, depth: 40 });
    // GlitchCorner, AlgorithmTrace, PuzzlePreviewSidePanel all moved into
    // mountUseItPanels — FEEL_IT round 1 carries only the brute-force counter.

    this.statusText = this.add.text(width / 2, 174, '', {
      fontSize: '12px',
      fontFamily: FONTS.MONO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setDepth(20);

    this.metricsText = this.add.text(width / 2, 218, '', {
      fontSize: '16px',
      fontFamily: FONTS.RETRO,
      color: '#fbbf24',
      stroke: '#081820',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    // Keyboard hint switches "R++" / "L++" / "BEST" to plain action verbs
    // in FEEL_IT to stay diegetic.
    const keyboardHint = CURRENT_RIDER_ROUNDS[0]?.lesson?.phase === PuzzlePhase.FEEL_IT
      ? '[E] extend net  -  [Q] shrink net  -  [SPACE] submit best catch'
      : '[E] extend right (R++)  -  [Q] shrink left (L++)  -  [SPACE] submit when BEST is correct';
    this.add.text(width / 2, height - 92, keyboardHint, {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
    }).setOrigin(0.5).setDepth(20);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bruteForce?.destroy();
      this.bruteForce = null;
    });

    this.input.keyboard?.on('keydown-E', () => this.extendRight());
    this.input.keyboard?.on('keydown-Q', () => this.shrinkLeft());
    this.input.keyboard?.on('keydown-D', () => this.extendRight());
    this.input.keyboard?.on('keydown-A', () => this.shrinkLeft());
    // Arrow-key aliases — matches the player's intuition that the window
    // grows rightward (RIGHT extends) and shrinks from the left (LEFT shrinks).
    this.input.keyboard?.on('keydown-RIGHT', () => this.extendRight());
    this.input.keyboard?.on('keydown-LEFT', () => this.shrinkLeft());
    this.input.keyboard?.on('keydown-SPACE', () => this.trySubmit());
    this.input.keyboard?.on('keydown-ENTER', () => this.trySubmit());

    void this.beginRound(0);
  }

  private async beginRound(index: number): Promise<void> {
    this.actionLocked = true;
    const lesson = CURRENT_RIDER_ROUNDS[index]?.lesson;
    if (lesson) await showLessonCard(this, lesson, 'parchment');
    this.startRound(index);
  }

  private startRound(index: number): void {
    this.roundIndex = index;
    this.round = CURRENT_RIDER_ROUNDS[index];
    this.leftIndex = 0;
    this.rightIndex = 0;
    this.bestLength = 1;
    this.optimal = longestUniqueWindowLength(this.round.letters);

    if (this.row) this.row.destroy();
    this.row = new RiverRow(this, {
      values: this.round.letters,
      centerX: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2 + 36,
      tileSize: 48,
      gap: 6,
    });
    this.row.setCursor('L', { label: 'L', color: BLUE_BANK, index: 0, side: 'top' });
    this.row.setCursor('R', { label: 'R', color: ORANGE_BANK, index: 0, side: 'bottom' });

    if (this.isFeelItRound()) {
      this.mountFeelItPanels();
    } else {
      this.mountUseItPanels();
      // Coming from FEEL_IT into USE_IT — fade Glitch out of focus instead of
      // destroying. Keeps the substring-check contrast visible.
      this.bruteForce?.fadeTo(0.32);
    }

    this.refreshDisplay();
  }

  private refreshDisplay(): void {
    const stage = this.roundIndex + 1;
    const total = CURRENT_RIDER_ROUNDS.length;
    this.statusText.setText(`CURRENT ${stage}/${total}   -   find the longest run with no repeats`);

    this.row.setWindow(this.leftIndex, this.rightIndex, COLORS.CYAN_GLOW);
    const hasDup = this.row.markDuplicatesInWindow(this.leftIndex, this.rightIndex);
    if (!hasDup) {
      const len = this.rightIndex - this.leftIndex + 1;
      if (len > this.bestLength) this.bestLength = len;
    }

    const length = this.rightIndex - this.leftIndex + 1;
    this.metricsText.setText(
      `LENGTH = ${length}${hasDup ? '  REPEAT!' : ''}   -   BEST = ${this.bestLength}`
    );
    this.metricsText.setColor(hasDup ? '#ef4444' : '#fbbf24');

    if (hasDup) this.trace?.highlightLine(3); // L = L + 1
    else if (this.rightIndex >= this.round.letters.length - 1) this.trace?.highlightLine(5);
    else this.trace?.highlightLine(2); // for R
    this.refreshPreview();
  }

  private refreshPreview(): void {
    if (!this.preview) return;
    const preview = buildCurrentRiderPreview({
      letters: this.round.letters,
      left: this.leftIndex,
      right: this.rightIndex,
      bestLength: this.bestLength,
    });
    this.preview.setState(preview.state);
    this.preview.setNextAction(preview.next);
  }

  private extendRight(): void {
    if (this.actionLocked) return;
    if (this.rightIndex + 1 >= this.round.letters.length) return;
    if (this.row.markDuplicatesInWindow(this.leftIndex, this.rightIndex)) {
      this.mistakes++;
      JuiceSystem.cameraShake(this, 80, 0.002);
      audioManager.playWrongTone();
      this.showMessage('Shrink left before extending a window with repeats.', COLORS.WARNING);
      return;
    }
    this.rightIndex++;
    this.row.moveCursor('R', this.rightIndex);
    audioManager.playTone(540, 50, 'sine');
    this.refreshDisplay();
  }

  private shrinkLeft(): void {
    if (this.actionLocked) return;
    if (this.leftIndex + 1 > this.rightIndex) return;
    this.leftIndex++;
    this.row.moveCursor('L', this.leftIndex);
    audioManager.playTone(420, 50, 'sine');
    this.refreshDisplay();
  }

  private trySubmit(): void {
    if (this.actionLocked) return;
    if (this.bestLength !== this.optimal) {
      this.mistakes++;
      JuiceSystem.cameraShake(this, 80, 0.002);
      audioManager.playWrongTone();
      this.showMessage(`Best so far is ${this.bestLength}. Keep exploring.`, COLORS.WARNING);
      return;
    }

    this.actionLocked = true;
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);

    // FEEL_IT completion → fire the Current Rider's NAME_IT beat once before
    // round 2 starts. Freezing Glitch's substring-checks counter lands the
    // "you let the river tell you" contrast.
    this.time.delayedCall(900, async () => {
      this.actionLocked = false;
      if (this.roundIndex + 1 >= CURRENT_RIDER_ROUNDS.length) {
        this.completePuzzle();
        return;
      }
      const finishedRound = CURRENT_RIDER_ROUNDS[this.roundIndex];
      if (
        finishedRound?.lesson?.phase === PuzzlePhase.FEEL_IT &&
        finishedRound.lesson.nameItBeat &&
        !this.namedYet
      ) {
        this.namedYet = true;
        this.bruteForce?.freeze();
        await this.showNameItBeat(finishedRound.lesson.nameItBeat);
      }
      void this.beginRound(this.roundIndex + 1);
    });
  }

  private completePuzzle(): void {
    // Tightened scoring: 3 stars requires a flawless run.
    const stars = this.mistakes === 0 && this.hintsUsed === 0 ? 3
      : this.mistakes <= 1 && this.hintsUsed <= 1 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    // FEEL_IT hints stay diegetic — no "window", "L/R", "unique" as technique
    // vocab; use net/catch framing.
    const hints = this.isFeelItRound()
      ? [
        'Push the right stake further while the catch is good.',
        'When you catch something twice, pull the left stake in until the catch is clear again.',
        `For this river the best catch is ${this.optimal} wide. Keep adjusting the net.`,
      ]
      : [
        'Extend right whenever the window is still unique. Shrink left only when you spot a duplicate.',
        'BEST tracks the longest unique window you have ever held. It only goes up.',
        `For this river the optimal length is ${this.optimal}. Walk the cursors to find it.`,
      ];
    this.showMessage(hints[hintNumber - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// Boss_MirrorSerpent - three phases: reverse, two-sum, fixed window
// ============================================================================

type SerpentPhase = 'reverse' | 'twoSum' | 'fixedWindow' | 'won';

export class Boss_MirrorSerpent extends BasePuzzleScene {
  private phase: SerpentPhase = 'reverse';
  private mistakes = 0;
  private row!: RiverRow;
  private statusText!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private serpentBanner!: Phaser.GameObjects.Text;
  private preview!: PuzzlePreviewSidePanel;
  private actionLocked = false;
  private reverseCompleting = false;

  // Reverse phase state
  private reverseValues: number[] = [];
  private reverseTarget: number[] = [];
  private reverseLeft = 0;
  private reverseRight = 0;

  // Two-sum phase state
  private twoSumLeft = 0;
  private twoSumRight = 0;

  // Fixed-window phase state
  private windowStart = 0;
  private windowOptimalSum = 0;
  private windowOptimalStart = 0;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_MIRROR_SERPENT });
    this.puzzleId = 'boss_mirror_serpent';
    this.puzzleName = 'Mirror Serpent';
    this.puzzleDescription = 'Three currents. One serpent. Reverse, pair, slide.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_MIRROR_SERPENT_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0.03;
  }
  protected shouldSkipConceptBridge(): boolean {
    return true;
  }
  protected getConceptName(): string {
    return 'Two-Pointer Mastery';
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, 'river', { intensity: 1.1 });
    const { width, height } = this.cameras.main;

    this.serpentBanner = this.add.text(width / 2, 158, '', {
      fontSize: '18px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
      backgroundColor: '#1a1a3e',
      padding: { x: 14, y: 8 },
      stroke: '#06b6d4',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(21);

    this.statusText = this.add.text(width / 2, 196, '', {
      fontSize: '11px',
      fontFamily: FONTS.MONO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(20);

    this.detailText = this.add.text(width / 2, 232, '', {
      fontSize: '14px',
      fontFamily: FONTS.RETRO,
      color: '#fbbf24',
      stroke: '#081820',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(width / 2, height - 76, this.controlsHelpText(), {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
      align: 'center',
    }).setOrigin(0.5).setDepth(20);

    this.preview = new PuzzlePreviewSidePanel(this, { side: 'right', yOffset: -8 });
    this.preview.setTitle('SERPENT PREVIEW');
    this.preview.show();

    this.input.keyboard?.on('keydown-SPACE', () => this.handleSpace());
    this.input.keyboard?.on('keydown-ENTER', () => this.handleSpace());
    this.input.keyboard?.on('keydown-A', () => this.handleA());
    this.input.keyboard?.on('keydown-D', () => this.handleD());
    this.input.keyboard?.on('keydown-J', () => this.handleJ());
    this.input.keyboard?.on('keydown-L', () => this.handleL());
    this.input.keyboard?.on('keydown-LEFT', () => this.handleA());
    this.input.keyboard?.on('keydown-RIGHT', () => this.handleD());

    this.startReversePhase();
  }

  private controlsHelpText(): string {
    return 'phase 1 [SPACE] swap-step  -  phase 2 [D] raise L, [J] lower R, [ENTER] lock  -  phase 3 [<-][->] slide, [SPACE] lock';
  }

  // ---- Phase 1: reverse ----

  private startReversePhase(): void {
    this.phase = 'reverse';
    this.actionLocked = false;
    this.reverseCompleting = false;
    this.reverseValues = [...MIRROR_SERPENT_PHASES.reverse.values];
    this.reverseTarget = reversedTarget(MIRROR_SERPENT_PHASES.reverse.values);
    this.reverseLeft = 0;
    this.reverseRight = this.reverseValues.length - 1;

    this.serpentBanner.setText('PHASE I  -  REVERSE THE CURRENT');
    this.statusText.setText('The serpent demands the river run backward.');
    this.detailText.setText('two pointers - swap and converge');
    this.cycleRow(this.reverseValues);
    this.row.setCursor('L', { label: 'L', color: BLUE_BANK, index: 0, side: 'top' });
    this.row.setCursor('R', { label: 'R', color: ORANGE_BANK, index: this.reverseRight, side: 'top' });
    this.refreshSerpentPreview();
  }

  // ---- Phase 2: two-sum ----

  private startTwoSumPhase(): void {
    this.phase = 'twoSum';
    this.actionLocked = false;
    this.reverseCompleting = false;
    this.twoSumLeft = 0;
    this.twoSumRight = MIRROR_SERPENT_PHASES.twoSum.values.length - 1;

    this.serpentBanner.setText('PHASE II  -  PAIR THE WARDS');
    this.statusText.setText(`Find two stones that sum to ${MIRROR_SERPENT_PHASES.twoSum.target}.`);
    this.cycleRow(MIRROR_SERPENT_PHASES.twoSum.values);
    this.row.setCursor('L', { label: 'L', color: BLUE_BANK, index: 0, side: 'top' });
    this.row.setCursor('R', { label: 'R', color: ORANGE_BANK, index: this.twoSumRight, side: 'top' });
    this.refreshTwoSumDetail();
  }

  // ---- Phase 3: fixed window ----

  private startFixedWindowPhase(): void {
    this.phase = 'fixedWindow';
    const round = MIRROR_SERPENT_PHASES.fixedWindow;
    this.windowStart = 0;
    this.windowOptimalStart = bestFixedWindowStart(round.values, round.windowSize);
    this.windowOptimalSum = windowSumAt(round.values, this.windowOptimalStart, round.windowSize);

    this.serpentBanner.setText('PHASE III  -  RIDE THE FLOOD');
    this.statusText.setText(`Lock the window of size ${round.windowSize} on its heaviest catch.`);
    this.cycleRow(round.values);
    this.refreshFixedWindowDetail();
  }

  private refreshSerpentPreview(): void {
    if (!this.preview) return;
    const preview = this.phase === 'reverse'
      ? buildMirrorSerpentPreview({
        phase: 'reverse',
        values: this.reverseValues,
        target: this.reverseTarget,
        left: this.reverseLeft,
        right: this.reverseRight,
      })
      : this.phase === 'twoSum'
        ? buildMirrorSerpentPreview({
          phase: 'twoSum',
          values: MIRROR_SERPENT_PHASES.twoSum.values,
          target: MIRROR_SERPENT_PHASES.twoSum.target,
          left: this.twoSumLeft,
          right: this.twoSumRight,
        })
        : this.phase === 'fixedWindow'
          ? buildMirrorSerpentPreview({
            phase: 'fixedWindow',
            values: MIRROR_SERPENT_PHASES.fixedWindow.values,
            windowSize: MIRROR_SERPENT_PHASES.fixedWindow.windowSize,
            start: this.windowStart,
            optimalStart: this.windowOptimalStart,
            optimalSum: this.windowOptimalSum,
          })
          : buildMirrorSerpentPreview({ phase: 'won' });
    this.preview.setState(preview.state);
    this.preview.setNextAction(preview.next);
  }

  private cycleRow(values: ReadonlyArray<string | number>): void {
    if (this.row) {
      this.cameras.main.flash(220, 6, 182, 212);
      this.row.destroy();
    }
    this.row = new RiverRow(this, {
      values,
      centerX: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2 + 64,
      tileSize: 50,
      gap: 8,
    });
  }

  // ---- Inputs ----

  private handleSpace(): void {
    if (this.actionLocked) return;
    if (this.phase === 'reverse') void this.reverseStep();
    else if (this.phase === 'twoSum') this.tryLockTwoSum();
    else if (this.phase === 'fixedWindow') this.tryLockFixedWindow();
  }

  private handleA(): void {
    if (this.actionLocked) return;
    if (this.phase === 'twoSum') this.advanceTwoSumLeft(-1);
    else if (this.phase === 'fixedWindow') this.slideWindow(-1);
  }

  private handleD(): void {
    if (this.actionLocked) return;
    if (this.phase === 'fixedWindow') this.slideWindow(1);
    else if (this.phase === 'twoSum') this.advanceTwoSumLeft(1);
  }

  private handleJ(): void {
    if (this.actionLocked) return;
    if (this.phase === 'twoSum') this.retreatTwoSumRight(-1);
  }

  private handleL(): void {
    if (this.actionLocked) return;
    if (this.phase === 'twoSum') this.retreatTwoSumRight(1);
  }

  // ---- Reverse phase logic ----

  private async reverseStep(): Promise<void> {
    if (this.actionLocked || this.reverseCompleting) return;
    if (this.reverseLeft >= this.reverseRight) {
      this.completeReversePhase();
      return;
    }
    this.actionLocked = true;
    audioManager.playTone(440, 90, 'sine');
    await this.row.animateSwap(this.reverseLeft, this.reverseRight);
    [this.reverseValues[this.reverseLeft], this.reverseValues[this.reverseRight]] =
      [this.reverseValues[this.reverseRight], this.reverseValues[this.reverseLeft]];
    this.reverseLeft++;
    this.reverseRight--;
    this.row.moveCursor('L', this.reverseLeft);
    this.row.moveCursor('R', this.reverseRight);
    this.refreshSerpentPreview();
    this.time.delayedCall(160, () => {
      if (this.reverseLeft >= this.reverseRight) {
        this.completeReversePhase();
        return;
      }
      this.actionLocked = false;
    });
  }

  private completeReversePhase(): void {
    if (this.reverseCompleting || this.phase !== 'reverse') return;
    if (!arrayEquals(this.reverseValues, this.reverseTarget)) return;
    this.reverseCompleting = true;
    this.actionLocked = true;
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2 + 64);
    this.time.delayedCall(800, () => this.startTwoSumPhase());
  }

  // ---- Two-sum phase logic ----

  private currentTwoSum(): number {
    const v = MIRROR_SERPENT_PHASES.twoSum.values;
    return v[this.twoSumLeft] + v[this.twoSumRight];
  }

  private refreshTwoSumDetail(): void {
    const v = MIRROR_SERPENT_PHASES.twoSum.values;
    const sum = this.currentTwoSum();
    const target = MIRROR_SERPENT_PHASES.twoSum.target;
    const sign = sum === target ? '=' : sum < target ? '<' : '>';
    this.detailText.setText(
      `${v[this.twoSumLeft]} + ${v[this.twoSumRight]} = ${sum}  ${sign}  ${target}`
    );
    this.detailText.setColor(sum === target ? '#88c070' : '#fbbf24');
    this.refreshSerpentPreview();
  }

  private advanceTwoSumLeft(direction: -1 | 1): void {
    const directive = pointerDirective(this.currentTwoSum(), MIRROR_SERPENT_PHASES.twoSum.target);
    if (direction !== 1 || directive !== 'advance_left') {
      this.flashWrong('The trace forces a different move.');
      return;
    }
    if (this.twoSumLeft + 1 >= this.twoSumRight) return;
    this.twoSumLeft++;
    this.row.moveCursor('L', this.twoSumLeft);
    audioManager.playTone(420, 50, 'sine');
    this.refreshTwoSumDetail();
  }

  private retreatTwoSumRight(direction: -1 | 1): void {
    const directive = pointerDirective(this.currentTwoSum(), MIRROR_SERPENT_PHASES.twoSum.target);
    if (direction !== -1 || directive !== 'retreat_right') {
      this.flashWrong('The trace forces a different move.');
      return;
    }
    if (this.twoSumRight - 1 <= this.twoSumLeft) return;
    this.twoSumRight--;
    this.row.moveCursor('R', this.twoSumRight);
    audioManager.playTone(360, 50, 'sine');
    this.refreshTwoSumDetail();
  }

  private tryLockTwoSum(): void {
    if (this.currentTwoSum() !== MIRROR_SERPENT_PHASES.twoSum.target) {
      this.flashWrong('The pair does not sum to the target.');
      return;
    }
    this.actionLocked = true;
    audioManager.playCorrectTone();
    this.row.pulseTile(this.twoSumLeft, COLORS.SUCCESS);
    this.row.pulseTile(this.twoSumRight, COLORS.SUCCESS);
    JuiceSystem.correctBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2 + 64);
    this.time.delayedCall(900, () => {
      this.actionLocked = false;
      this.startFixedWindowPhase();
    });
  }

  // ---- Fixed-window phase logic ----

  private refreshFixedWindowDetail(): void {
    const round = MIRROR_SERPENT_PHASES.fixedWindow;
    const left = this.windowStart;
    const right = left + round.windowSize - 1;
    this.row.setWindow(left, right, GOLD);
    const sum = windowSumAt(round.values, left, round.windowSize);
    this.detailText.setText(`SUM = ${sum}   -   TARGET = ${this.windowOptimalSum} (heaviest)`);
    this.detailText.setColor(sum === this.windowOptimalSum ? '#88c070' : '#fbbf24');
    this.refreshSerpentPreview();
  }

  private slideWindow(direction: -1 | 1): void {
    const round = MIRROR_SERPENT_PHASES.fixedWindow;
    const next = this.windowStart + direction;
    if (next < 0 || next + round.windowSize > round.values.length) return;
    this.windowStart = next;
    audioManager.playTone(direction === 1 ? 540 : 420, 50, 'sine');
    this.refreshFixedWindowDetail();
  }

  private tryLockFixedWindow(): void {
    const round = MIRROR_SERPENT_PHASES.fixedWindow;
    const sum = windowSumAt(round.values, this.windowStart, round.windowSize);
    if (sum !== this.windowOptimalSum) {
      this.flashWrong('Not the heaviest catch yet.');
      return;
    }
    this.actionLocked = true;
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2 + 64);
    for (let i = this.windowStart; i < this.windowStart + round.windowSize; i++) {
      this.row.pulseTile(i, COLORS.SUCCESS);
    }
    this.time.delayedCall(1100, () => {
      this.phase = 'won';
      this.refreshSerpentPreview();
      this.completeBoss();
    });
  }

  private flashWrong(message: string): void {
    this.mistakes++;
    JuiceSystem.cameraShake(this, 100, 0.0028);
    audioManager.playWrongTone();
    this.showMessage(message, COLORS.WARNING);
  }

  private completeBoss(): void {
    const stars = this.mistakes <= 1 ? 3 : this.mistakes <= 4 ? 2 : 1;
    this.cameras.main.flash(420, 224, 248, 208);
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    if (this.phase === 'reverse') {
      this.showMessage('Press SPACE to swap-and-step. Run the river backward.', COLORS.GOLD_ACCENT);
      return;
    }
    if (this.phase === 'twoSum') {
      const sum = this.currentTwoSum();
      const target = MIRROR_SERPENT_PHASES.twoSum.target;
      const tip = sum < target ? 'Sum too small - press D.' : sum > target ? 'Sum too big - press J.' : 'On target. Press ENTER.';
      this.showMessage(`Hint ${hintNumber}: ${tip}`, COLORS.GOLD_ACCENT);
      return;
    }
    if (this.phase === 'fixedWindow') {
      this.showMessage(`Hint ${hintNumber}: lock at index ${this.windowOptimalStart}.`, COLORS.GOLD_ACCENT);
    }
  }
}

/** Pair count helper — n(n-1)/2, the brute-force cost for "check every pair". */
function pairCount(n: number): number {
  return Math.max(1, (n * (n - 1)) / 2);
}

/**
 * Fixed-window brute-force cost: recompute the window sum from scratch at
 * every starting position. (n - k + 1) windows × k additions each.
 * The sliding-window algorithm is (n - k + 1) operations — that's the
 * comparison.
 */
function bruteWindowCost(n: number, k: number): number {
  const windows = Math.max(1, n - k + 1);
  return windows * k;
}

// ──────────────────────────────────────────────────────────────────────────
// Brute-force strategy — fed to BruteForceActor during TR-1 FEEL_IT round 1.
//
// Mirror Walk's brute-force foil is "swap two random positions in the row".
// Without the converging-inward discipline, random swaps shuffle the row
// indefinitely; Glitch never converges to a reversal. The tile field is
// already busy (RiverRow with cursors, status line), so we run
// BruteForceActor in degenerate-row mode — heading + ticking counter only.
// ──────────────────────────────────────────────────────────────────────────

function makeReverseBruteStrategy(): BruteForceStrategy {
  return {
    initialValues: [],
    nextMove: (vals) => vals,
    isSolved: () => false,
    tickIntervalMs: 700,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Brute-force strategy — fed to BruteForceActor during TR-2 FEEL_IT round 1.
//
// Pointer Bridge's brute-force foil is "check every (i, j) pair at random",
// the n(n−1)/2 alternative to the two-pointer walk. Degenerate-row mode:
// no tile row, just a ticking pair-check counter that never converges to a
// matching pair (Glitch ignores the sortedness).
// ──────────────────────────────────────────────────────────────────────────

function makeSortedPairsBruteStrategy(): BruteForceStrategy {
  return {
    initialValues: [],
    nextMove: (vals) => vals,
    isSolved: () => false,
    tickIntervalMs: 800,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Brute-force strategy — fed to BruteForceActor during TR-3 FEEL_IT round 1.
//
// Fixed Window's brute-force foil is "recompute the window sum from scratch
// on every slide" — k additions per window, n-k+1 windows = O(n·k). The
// sliding alternative pays one add + one subtract per slide, O(n). Glitch
// ticks the rescan counter (degenerate-row mode — no tile row, just a
// counter that mounts visibly faster than the player's slide count).
// ──────────────────────────────────────────────────────────────────────────

function makeWindowSlideBruteStrategy(): BruteForceStrategy {
  return {
    initialValues: [],
    nextMove: (vals) => vals,
    isSolved: () => false,
    tickIntervalMs: 800,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Brute-force strategy — fed to BruteForceActor during TR-4 FEEL_IT round 1.
//
// Current Rider's brute-force foil is "check every single substring from
// scratch" — O(n³) for longest-unique. Glitch ticks the substring-checks
// counter (degenerate-row mode — no row, just the mounting cost).
// ──────────────────────────────────────────────────────────────────────────

function makeVariableWindowBruteStrategy(): BruteForceStrategy {
  return {
    initialValues: [],
    nextMove: (vals) => vals,
    isSolved: () => false,
    tickIntervalMs: 800,
  };
}
