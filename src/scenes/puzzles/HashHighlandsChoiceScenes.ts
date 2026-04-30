import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { audioManager } from '../../core/AudioManager';
import {
  ANAGRAM_GARDEN_ROUNDS,
  ARCHIVIST_ROUNDS,
  CACHE_CAVERN_ROUNDS,
  FREQUENCY_FORGE_ROUNDS,
  NAMEPLATE_GATE_ROUNDS,
  isCorrectHashChoice,
  type HashHighlandsChoiceRound,
} from '../../data/puzzles/hashHighlandsPuzzleLogic';

abstract class HashHighlandsChoiceScene extends BasePuzzleScene {
  private roundIndex = 0;
  private mistakes = 0;
  private roundText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private optionContainer!: Phaser.GameObjects.Container;
  private memoryMarker!: Phaser.GameObjects.Container;

  protected abstract rounds: HashHighlandsChoiceRound[];

  private readonly onChoiceKey = (event: KeyboardEvent) => {
    const index = Number.parseInt(event.key, 10) - 1;
    const round = this.rounds[this.roundIndex];
    if (!round || index < 0 || index >= round.options.length) return;
    this.choose(index);
  };

  create(): void {
    super.create();
    this.createMemoryMarker();
    this.createChoiceUi();
    this.renderRound();
    this.input.keyboard?.on('keydown', this.onChoiceKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.onChoiceKey);
    });
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.03;
  }

  private createMemoryMarker(): void {
    const { width, height } = this.cameras.main;
    this.memoryMarker = this.add.container(width / 2, height / 2 + 48);

    const tray = this.add.rectangle(0, 0, 240, 72, 0x3f2d18, 0.88)
      .setStrokeStyle(3, 0xe0f8d0, 0.86);
    const bit = this.add.text(0, -2, 'BIT CACHE', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
    }).setOrigin(0.5);
    const slots = [-84, -42, 42, 84].map((x, index) => {
      const slot = this.add.rectangle(x, 0, 28, 28, index % 2 === 0 ? 0xfbbf24 : 0x5ab7d4, 0.78)
        .setStrokeStyle(2, 0x081820, 0.7);
      return slot;
    });

    this.memoryMarker.add([tray, ...slots, bit]);

    if (!this.prefersReducedMotion()) {
      this.tweens.add({
        targets: slots,
        alpha: 0.35,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 120,
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
      backgroundColor: '#4a3821',
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
      const button = this.add.container(x, 0);
      const bg = this.add.rectangle(0, 0, 252, 62, 0xe0f8d0, 0.96)
        .setStrokeStyle(3, 0x4a3821, 0.9)
        .setInteractive({ useHandCursor: true });
      const number = this.add.text(-108, -20, `${index + 1}`, {
        fontSize: '9px',
        fontFamily: FONTS.RETRO,
        color: '#4a3821',
      }).setOrigin(0.5);
      const label = this.add.text(0, 0, option, {
        fontSize: '11px',
        fontFamily: FONTS.MONO,
        color: '#081820',
        align: 'center',
        wordWrap: { width: 208 },
      }).setOrigin(0.5);

      bg.on('pointerdown', () => this.choose(index));
      button.add([bg, number, label]);
      this.optionContainer.add(button);
    });
  }

  private choose(index: number): void {
    const round = this.rounds[this.roundIndex];
    if (!isCorrectHashChoice(round, index)) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      this.showMessage('That name does not open this place.', COLORS.WARNING);
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
      targets: this.memoryMarker,
      scaleX: 1.1,
      scaleY: 1.1,
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
      'Use the stable name or signature instead of replaying the whole search.',
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

export class P3_1_NameplateGates extends HashHighlandsChoiceScene {
  protected rounds = NAMEPLATE_GATE_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_HH_1 });
    this.puzzleId = 'hh_1';
    this.puzzleName = 'Nameplate Gates';
    this.puzzleDescription = 'Use a name as the fastest address.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_HASH_NAMEPLATE_GATES_BG;
  }

  protected getConceptName(): string {
    return 'Hash Map Lookup';
  }
}

export class P3_2_FrequencyForge extends HashHighlandsChoiceScene {
  protected rounds = FREQUENCY_FORGE_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_HH_2 });
    this.puzzleId = 'hh_2';
    this.puzzleName = 'Frequency Forge';
    this.puzzleDescription = 'Let bins remember the shape of a stream.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_HASH_FREQUENCY_FORGE_BG;
  }

  protected getConceptName(): string {
    return 'Frequency Counting';
  }
}

export class P3_3_AnagramGardens extends HashHighlandsChoiceScene {
  protected rounds = ANAGRAM_GARDEN_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_HH_3 });
    this.puzzleId = 'hh_3';
    this.puzzleName = 'Anagram Gardens';
    this.puzzleDescription = 'Group different blooms by the same hidden key.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_HASH_ANAGRAM_GARDENS_BG;
  }

  protected getConceptName(): string {
    return 'Canonical Keys';
  }
}

export class P3_4_CacheCavern extends HashHighlandsChoiceScene {
  protected rounds = CACHE_CAVERN_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_HH_4 });
    this.puzzleId = 'hh_4';
    this.puzzleName = 'Cache Cavern';
    this.puzzleDescription = 'Let a past answer help a future question.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_HASH_CACHE_CAVERN_BG;
  }

  protected getConceptName(): string {
    return 'Memoization';
  }
}

export class Boss_Archivist extends HashHighlandsChoiceScene {
  protected rounds = ARCHIVIST_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_ARCHIVIST });
    this.puzzleId = 'boss_archivist';
    this.puzzleName = 'The Archivist';
    this.puzzleDescription = 'Stabilize lookup, counting, grouping, and memory.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_HASH_ARCHIVIST_BG;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.035;
  }

  protected shouldSkipConceptBridge(): boolean {
    return true;
  }

  protected getConceptName(): string {
    return 'Hash Mastery';
  }
}
