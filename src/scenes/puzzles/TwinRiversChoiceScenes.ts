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
  private trace!: AlgorithmTrace;
  private statusText!: Phaser.GameObjects.Text;
  private preview!: PuzzlePreviewSidePanel;
  private actionLocked = false;
  private roundCompleting = false;
  private swappedThisPair = false;
  private leftAdvancedThisPair = false;
  private rightRetreatedThisPair = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_1 });
    this.puzzleId = 'tr_1';
    this.puzzleName = 'Mirror Walk';
    this.puzzleDescription = 'Two pointers walk inward and swap. Reverse the river.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_MIRROR_WALK_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0.025;
  }
  protected getConceptName(): string {
    return 'Two-Pointer Reverse';
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, 'river', { intensity: 0.9 });
    const { width, height } = this.cameras.main;

    this.statusText = this.add.text(width / 2, 174, '', {
      fontSize: '12px',
      fontFamily: FONTS.MONO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setDepth(20);

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

    this.add.text(width / 2, height - 92, '[SPACE] swap  -  [D] move L  -  [J] move R', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
    }).setOrigin(0.5).setDepth(20);

    this.preview = new PuzzlePreviewSidePanel(this, { side: 'right', yOffset: -16 });
    this.preview.setTitle('REVERSE PREVIEW');
    this.preview.show();

    this.input.keyboard?.on('keydown-SPACE', this.onSwap);
    this.input.keyboard?.on('keydown-ENTER', this.onSwap);
    this.input.keyboard?.on('keydown-D', () => this.tryMoveLeft());
    this.input.keyboard?.on('keydown-J', () => this.tryMoveRight());

    this.startRound(0);
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

    this.refreshStatus();
    this.trace.highlightLine(2); // while L < R
  }

  private refreshStatus(): void {
    const stage = this.roundIndex + 1;
    const total = MIRROR_WALK_ROUNDS.length;
    const needsRightRetreat =
      this.swappedThisPair && this.leftAdvancedThisPair && !this.rightRetreatedThisPair;
    const nextStep = this.roundCompleting ? 'loop exits'
      : needsRightRetreat ? 'J: R = R - 1'
        : this.leftIndex >= this.rightIndex ? 'loop exits'
          : !this.swappedThisPair ? 'SPACE: swap arr[L] and arr[R]'
            : !this.leftAdvancedThisPair ? 'D: L = L + 1'
              : 'check while condition';
    this.statusText.setText(
      `RIVER ${stage}/${total}   -   L=${this.leftIndex}   R=${this.rightIndex}   -   ${nextStep}`
    );
    this.refreshPreview();
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
    this.trace.highlightLine(3); // swap
    audioManager.playTone(420, 90, 'sine');
    await this.row.animateSwap(this.leftIndex, this.rightIndex);

    [this.values[this.leftIndex], this.values[this.rightIndex]] =
      [this.values[this.rightIndex], this.values[this.leftIndex]];

    this.swappedThisPair = true;
    this.leftAdvancedThisPair = false;
    this.rightRetreatedThisPair = false;
    this.actionLocked = false;
    this.trace.highlightLine(4); // L = L + 1
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
    this.trace.highlightLine(4); // L = L + 1
    this.leftIndex++;
    this.leftAdvancedThisPair = true;
    this.row.moveCursor('L', this.leftIndex);
    audioManager.playTone(420, 60, 'sine');
    this.refreshStatus();

    this.time.delayedCall(240, () => {
      this.actionLocked = false;
      this.trace.highlightLine(5); // R = R - 1
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
    this.trace.highlightLine(5); // R = R - 1
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
      this.trace.highlightLine(6); // done
      this.checkRoundComplete();
      return;
    }

    this.trace.highlightLine(2); // while L < R
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

      this.time.delayedCall(900, () => this.startRound(this.roundIndex + 1));
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
    const hints = [
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
  private trace!: AlgorithmTrace;
  private sumText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private preview!: PuzzlePreviewSidePanel;
  private actionLocked = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_2 });
    this.puzzleId = 'tr_2';
    this.puzzleName = 'Pointer Bridge';
    this.puzzleDescription = 'On a sorted row, raise the low side or lower the high side until the pair sums match.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_POINTER_BRIDGE_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0.025;
  }
  protected getConceptName(): string {
    return 'Sorted Two-Sum';
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, 'river', { intensity: 0.9 });
    const { width, height } = this.cameras.main;

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

    this.add.text(width / 2, height - 92, '[A]/[D] move left pointer  -  [J]/[L] move right pointer  -  [ENTER] lock pair', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
    }).setOrigin(0.5).setDepth(20);

    this.preview = new PuzzlePreviewSidePanel(this, { side: 'right', yOffset: -16 });
    this.preview.setTitle('POINTER PREVIEW');
    this.preview.show();

    this.input.keyboard?.on('keydown-A', () => this.tryMoveLeft(-1));
    this.input.keyboard?.on('keydown-D', () => this.tryMoveLeft(1));
    this.input.keyboard?.on('keydown-J', () => this.tryMoveRight(-1));
    this.input.keyboard?.on('keydown-L', () => this.tryMoveRight(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.tryLock());
    this.input.keyboard?.on('keydown-SPACE', () => this.tryLock());

    this.startRound(0);
  }

  private startRound(index: number): void {
    this.roundIndex = index;
    this.round = POINTER_BRIDGE_ROUNDS[index];
    this.leftIndex = 0;
    this.rightIndex = this.round.values.length - 1;

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
    this.trace.highlightLine(directive === 'lock' ? 4 : directive === 'advance_left' ? 5 : 6);
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
    audioManager.playCorrectTone();
    this.row.pulseTile(this.leftIndex, COLORS.SUCCESS);
    this.row.pulseTile(this.rightIndex, COLORS.SUCCESS);
    JuiceSystem.correctBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);

    this.time.delayedCall(800, () => {
      this.actionLocked = false;
      if (this.roundIndex + 1 >= POINTER_BRIDGE_ROUNDS.length) {
        this.completePuzzle();
        return;
      }
      this.startRound(this.roundIndex + 1);
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
      : this.mistakes <= 2 && this.hintsUsed <= 1 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    const hints = [
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
  private trace!: AlgorithmTrace;
  private statusText!: Phaser.GameObjects.Text;
  private sumText!: Phaser.GameObjects.Text;
  private preview!: PuzzlePreviewSidePanel;
  private actionLocked = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_3 });
    this.puzzleId = 'tr_3';
    this.puzzleName = 'Fixed Window Dock';
    this.puzzleDescription = 'Slide a fixed window along the dock. Find the heaviest catch.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_FIXED_WINDOW_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0.025;
  }
  protected getConceptName(): string {
    return 'Fixed Sliding Window';
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, 'river', { intensity: 0.9 });
    const { width, height } = this.cameras.main;

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

    this.add.text(width / 2, height - 92, '[<-]/[->] slide window  -  [SPACE] lock at current position', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
    }).setOrigin(0.5).setDepth(20);

    this.preview = new PuzzlePreviewSidePanel(this, { side: 'right', yOffset: -16 });
    this.preview.setTitle('WINDOW PREVIEW');
    this.preview.show();

    this.input.keyboard?.on('keydown-LEFT', () => this.slide(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.slide(1));
    this.input.keyboard?.on('keydown-A', () => this.slide(-1));
    this.input.keyboard?.on('keydown-D', () => this.slide(1));
    this.input.keyboard?.on('keydown-SPACE', () => this.tryLock());
    this.input.keyboard?.on('keydown-ENTER', () => this.tryLock());

    this.startRound(0);
  }

  private startRound(index: number): void {
    this.roundIndex = index;
    this.round = FIXED_WINDOW_ROUNDS[index];
    this.windowStart = 0;
    this.bestSeenSum = windowSumAt(this.round.values, 0, this.round.windowSize);

    if (this.row) this.row.destroy();
    this.row = new RiverRow(this, {
      values: this.round.values,
      centerX: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2 + 36,
      tileSize: 50,
      gap: 6,
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
    if (this.windowStart === 0) this.trace.highlightLine(0);
    else this.trace.highlightLine(5); // best = max(best, s)
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
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);
    for (let i = this.windowStart; i < this.windowStart + k; i++) {
      this.row.pulseTile(i, COLORS.SUCCESS);
    }

    this.time.delayedCall(900, () => {
      this.actionLocked = false;
      if (this.roundIndex + 1 >= FIXED_WINDOW_ROUNDS.length) {
        this.completePuzzle();
        return;
      }
      this.startRound(this.roundIndex + 1);
    });
  }

  private completePuzzle(): void {
    const stars = this.mistakes === 0 && this.hintsUsed === 0 ? 3
      : this.mistakes <= 2 && this.hintsUsed <= 1 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    const hints = [
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
  private trace!: AlgorithmTrace;
  private statusText!: Phaser.GameObjects.Text;
  private metricsText!: Phaser.GameObjects.Text;
  private preview!: PuzzlePreviewSidePanel;
  private actionLocked = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_4 });
    this.puzzleId = 'tr_4';
    this.puzzleName = 'Current Rider';
    this.puzzleDescription = 'Stretch the window when safe. Shrink it when the river repeats.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_VARIABLE_WINDOW_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0.025;
  }
  protected getConceptName(): string {
    return 'Variable Sliding Window';
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, 'river', { intensity: 0.9 });
    const { width, height } = this.cameras.main;

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

    this.add.text(width / 2, height - 92, '[E] extend right (R++)  -  [Q] shrink left (L++)  -  [SPACE] submit when BEST is correct', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
    }).setOrigin(0.5).setDepth(20);

    this.preview = new PuzzlePreviewSidePanel(this, { side: 'right', yOffset: -16 });
    this.preview.setTitle('CURRENT PREVIEW');
    this.preview.show();

    this.input.keyboard?.on('keydown-E', () => this.extendRight());
    this.input.keyboard?.on('keydown-Q', () => this.shrinkLeft());
    this.input.keyboard?.on('keydown-D', () => this.extendRight());
    this.input.keyboard?.on('keydown-A', () => this.shrinkLeft());
    this.input.keyboard?.on('keydown-SPACE', () => this.trySubmit());
    this.input.keyboard?.on('keydown-ENTER', () => this.trySubmit());

    this.startRound(0);
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

    if (hasDup) this.trace.highlightLine(3); // L = L + 1
    else if (this.rightIndex >= this.round.letters.length - 1) this.trace.highlightLine(5);
    else this.trace.highlightLine(2); // for R
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

    this.time.delayedCall(900, () => {
      this.actionLocked = false;
      if (this.roundIndex + 1 >= CURRENT_RIDER_ROUNDS.length) {
        this.completePuzzle();
        return;
      }
      this.startRound(this.roundIndex + 1);
    });
  }

  private completePuzzle(): void {
    const stars = this.mistakes === 0 && this.hintsUsed === 0 ? 3
      : this.mistakes <= 2 && this.hintsUsed <= 1 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    const hints = [
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
