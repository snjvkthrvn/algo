import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { audioManager } from '../../core/AudioManager';
import { createChoiceButton } from '../../ui/ChoiceButton';
import {
  MAZE_OF_FORKS_ROUNDS,
  MIRROR_STAIRCASE_ROUNDS,
  RECURSION_ROUNDS,
  SCROLL_STACK_ROUNDS,
  TOWER_OF_MEMORY_ROUNDS,
  isCorrectStackChoice,
  type StackSpiresChoiceRound,
} from '../../data/puzzles/stackSpiresPuzzleLogic';

abstract class StackSpiresChoiceScene extends BasePuzzleScene {
  private roundIndex = 0;
  private mistakes = 0;
  private roundText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private optionContainer!: Phaser.GameObjects.Container;
  private stackMarker!: Phaser.GameObjects.Container;

  protected abstract rounds: StackSpiresChoiceRound[];

  private readonly onChoiceKey = (event: KeyboardEvent) => {
    const index = Number.parseInt(event.key, 10) - 1;
    const round = this.rounds[this.roundIndex];
    if (!round || index < 0 || index >= round.options.length) return;
    this.choose(index);
  };

  create(): void {
    super.create();
    this.createStackMarker();
    this.createChoiceUi();
    this.renderRound();
    this.input.keyboard?.on('keydown', this.onChoiceKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.onChoiceKey);
    });
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.028;
  }

  private createStackMarker(): void {
    const { width, height } = this.cameras.main;
    this.stackMarker = this.add.container(width / 2, height / 2 + 48);

    const base = this.add.rectangle(0, 0, 150, 120, 0x263247, 0.88)
      .setStrokeStyle(3, 0xe0f8d0, 0.86);
    const label = this.add.text(0, 42, 'BIT STACK', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
    }).setOrigin(0.5);
    const frames = [-36, -12, 12, 36].map((y, index) => {
      const color = index === 0 ? 0xf97316 : index % 2 === 0 ? 0x9be8ff : 0xfbbf24;
      return this.add.rectangle(0, y - 16, 92, 18, color, 0.74)
        .setStrokeStyle(2, 0x081820, 0.7);
    });

    this.stackMarker.add([base, ...frames, label]);

    if (!this.prefersReducedMotion()) {
      this.tweens.add({
        targets: frames[0],
        alpha: 0.3,
        duration: 720,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createChoiceUi(): void {
    const { width, height } = this.cameras.main;

    this.roundText = this.add.text(width / 2, 156, '', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5);

    this.promptText = this.add.text(width / 2, 206, '', {
      fontSize: '13px',
      fontFamily: FONTS.MONO,
      color: '#e0f8d0',
      backgroundColor: '#263247',
      align: 'center',
      wordWrap: { width: 780 },
      padding: { x: 12, y: 7 },
    }).setOrigin(0.5);

    this.optionContainer = this.add.container(0, height - 128);
  }

  private renderRound(): void {
    const round = this.rounds[this.roundIndex];
    this.roundText.setText(round.title);
    this.promptText.setText(round.prompt);
    this.optionContainer.removeAll(true);

    const { width } = this.cameras.main;
    const startX = width / 2 - 300;
    round.options.forEach((option, index) => {
      const x = startX + index * 300;
      const button = createChoiceButton(this, x, 0, index, option, {
        strokeColor: 0x263247,
        wrapWidth: 208,
        onChoose: () => this.choose(index),
      });
      this.optionContainer.add(button);
    });
  }

  private choose(index: number): void {
    const round = this.rounds[this.roundIndex];
    if (!isCorrectStackChoice(round, index)) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      this.showMessage('That path loses the return.', COLORS.WARNING);
      return;
    }

    audioManager.playCorrectTone();
    this.showMessage(round.success, COLORS.SUCCESS);
    this.roundIndex++;

    if (this.roundIndex >= this.rounds.length) {
      this.time.delayedCall(700, () => this.complete());
      return;
    }

    this.tweens.add({
      targets: this.stackMarker,
      y: this.stackMarker.y - 8,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => this.renderRound(),
    });
  }

  private complete(): void {
    const stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    const round = this.rounds[this.roundIndex];
    const hints = [
      'Ask what is on top, what returns, or what branch can be crossed off.',
      `This step wants: ${round.options[round.correctIndex]}.`,
    ];
    this.showMessage(hints[hintNumber - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}

export class P4_1_ScrollStack extends StackSpiresChoiceScene {
  protected rounds = SCROLL_STACK_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_SS_1 });
    this.puzzleId = 'ss_1';
    this.puzzleName = 'Scroll Stack';
    this.puzzleDescription = 'Only the top scroll can leave first.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_STACK_SCROLL_STACK_BG;
  }

  protected getConceptName(): string {
    return 'Stack LIFO';
  }
}

export class P4_2_MirrorStaircase extends StackSpiresChoiceScene {
  protected rounds = MIRROR_STAIRCASE_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_SS_2 });
    this.puzzleId = 'ss_2';
    this.puzzleName = 'Mirror Staircase';
    this.puzzleDescription = 'Trust the smaller staircase and return.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_STACK_MIRROR_STAIRCASE_BG;
  }

  protected getConceptName(): string {
    return 'Recursion';
  }
}

export class P4_3_MazeOfForks extends StackSpiresChoiceScene {
  protected rounds = MAZE_OF_FORKS_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_SS_3 });
    this.puzzleId = 'ss_3';
    this.puzzleName = 'Maze of Forks';
    this.puzzleDescription = 'Retreat from dead ends and try the next branch.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_STACK_MAZE_OF_FORKS_BG;
  }

  protected getConceptName(): string {
    return 'Backtracking';
  }
}

export class P4_4_TowerOfMemory extends StackSpiresChoiceScene {
  protected rounds = TOWER_OF_MEMORY_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_SS_4 });
    this.puzzleId = 'ss_4';
    this.puzzleName = 'Tower of Memory';
    this.puzzleDescription = 'Depth has a cost, and memory has a floor.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_STACK_TOWER_OF_MEMORY_BG;
  }

  protected getConceptName(): string {
    return 'Call Stack Depth';
  }
}

export class Boss_Recursion extends StackSpiresChoiceScene {
  protected rounds = RECURSION_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_RECURSION });
    this.puzzleId = 'boss_recursion';
    this.puzzleName = 'The Recursion';
    this.puzzleDescription = 'Descend, find the base case, and return.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_STACK_RECURSION_BG;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.032;
  }

  protected shouldSkipConceptBridge(): boolean {
    return true;
  }

  protected getConceptName(): string {
    return 'Recursion Mastery';
  }
}
