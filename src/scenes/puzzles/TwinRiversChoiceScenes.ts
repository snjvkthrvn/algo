import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { audioManager } from '../../core/AudioManager';
import {
  FIXED_WINDOW_ROUNDS,
  MIRROR_SERPENT_ROUNDS,
  MIRROR_WALK_ROUNDS,
  POINTER_BRIDGE_ROUNDS,
  VARIABLE_WINDOW_ROUNDS,
  isCorrectChoice,
  type TwinRiversChoiceRound,
} from '../../data/puzzles/twinRiversPuzzleLogic';

abstract class TwinRiversChoiceScene extends BasePuzzleScene {
  private roundIndex = 0;
  private mistakes = 0;
  private roundText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private optionContainer!: Phaser.GameObjects.Container;
  private riverMarker!: Phaser.GameObjects.Container;

  protected abstract rounds: TwinRiversChoiceRound[];

  private readonly onChoiceKey = (event: KeyboardEvent) => {
    const index = Number.parseInt(event.key, 10) - 1;
    const round = this.rounds[this.roundIndex];
    if (!round || index < 0 || index >= round.options.length) return;
    this.choose(index);
  };

  create(): void {
    super.create();
    this.createRiverMarker();
    this.createChoiceUi();
    this.renderRound();
    this.input.keyboard?.on('keydown', this.onChoiceKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.onChoiceKey);
    });
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.025;
  }

  private createRiverMarker(): void {
    const { width, height } = this.cameras.main;
    this.riverMarker = this.add.container(width / 2, height / 2 + 58);

    const blue = this.add.circle(-46, 0, 28, 0x5ab7d4, 0.9)
      .setStrokeStyle(3, 0xe0f8d0, 0.9);
    const orange = this.add.circle(46, 0, 28, 0xf97316, 0.9)
      .setStrokeStyle(3, 0xe0f8d0, 0.9);
    const link = this.add.rectangle(0, 0, 72, 8, 0xe0f8d0, 0.88)
      .setStrokeStyle(1, 0x081820, 0.5);
    const bit = this.add.text(0, -2, 'BIT', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    }).setOrigin(0.5);

    this.riverMarker.add([link, blue, orange, bit]);

    if (!this.prefersReducedMotion()) {
      this.tweens.add({
        targets: this.riverMarker,
        y: height / 2 + 50,
        duration: 1000,
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
      backgroundColor: '#28698a',
      align: 'center',
      wordWrap: { width: 760 },
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
      const button = this.add.container(x, 0);
      const bg = this.add.rectangle(0, 0, 252, 62, 0xe0f8d0, 0.96)
        .setStrokeStyle(3, 0x28698a, 0.86)
        .setInteractive({ useHandCursor: true });
      const number = this.add.text(-108, -20, `${index + 1}`, {
        fontSize: '9px',
        fontFamily: FONTS.RETRO,
        color: '#28698a',
      }).setOrigin(0.5);
      const label = this.add.text(0, 0, option, {
        fontSize: '11px',
        fontFamily: FONTS.MONO,
        color: '#081820',
        align: 'center',
        wordWrap: { width: 218 },
      }).setOrigin(0.5);

      bg.on('pointerdown', () => this.choose(index));
      button.add([bg, number, label]);
      this.optionContainer.add(button);
    });
  }

  private choose(index: number): void {
    const round = this.rounds[this.roundIndex];
    if (!isCorrectChoice(round, index)) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      this.showMessage('The current pulls against that move.', COLORS.WARNING);
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
      targets: this.riverMarker,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 160,
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
      'Read both banks before moving. The river rewards edge awareness.',
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

export class P2_1_MirrorWalk extends TwinRiversChoiceScene {
  protected rounds = MIRROR_WALK_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_1 });
    this.puzzleId = 'tr_1';
    this.puzzleName = 'Mirror Walk';
    this.puzzleDescription = 'Move two paths as one mirrored decision.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_MIRROR_WALK_BG;
  }

  protected getConceptName(): string {
    return 'Two Pointers';
  }
}

export class P2_2_PointerBridge extends TwinRiversChoiceScene {
  protected rounds = POINTER_BRIDGE_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_2 });
    this.puzzleId = 'tr_2';
    this.puzzleName = 'Pointer Bridge';
    this.puzzleDescription = 'Use sorted edges to find a target pair.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_POINTER_BRIDGE_BG;
  }

  protected getConceptName(): string {
    return 'Sorted Two Sum';
  }
}

export class P2_3_FixedWindowDock extends TwinRiversChoiceScene {
  protected rounds = FIXED_WINDOW_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_3 });
    this.puzzleId = 'tr_3';
    this.puzzleName = 'Fixed Window Dock';
    this.puzzleDescription = 'Track only what fits inside the current window.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_FIXED_WINDOW_BG;
  }

  protected getConceptName(): string {
    return 'Fixed Sliding Window';
  }
}

export class P2_4_CurrentRider extends TwinRiversChoiceScene {
  protected rounds = VARIABLE_WINDOW_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_4 });
    this.puzzleId = 'tr_4';
    this.puzzleName = 'Current Rider';
    this.puzzleDescription = 'Let the river decide when the window grows or shrinks.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_VARIABLE_WINDOW_BG;
  }

  protected getConceptName(): string {
    return 'Variable Sliding Window';
  }
}

export class Boss_MirrorSerpent extends TwinRiversChoiceScene {
  protected rounds = MIRROR_SERPENT_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_MIRROR_SERPENT });
    this.puzzleId = 'boss_mirror_serpent';
    this.puzzleName = 'Mirror Serpent';
    this.puzzleDescription = 'Align both rivers and prove traversal mastery.';
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
    return 'Traversal Mastery';
  }
}
