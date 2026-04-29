import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { audioManager } from '../../core/AudioManager';

interface ShufflerPhase {
  title: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  success: string;
}

const PHASES: ShufflerPhase[] = [
  {
    title: 'PHASE 1: SORT UNDER FIRE',
    prompt: 'The row is [3, 1, 2]. Which neighbor swap starts the bubble?',
    options: ['swap 3 and 1', 'swap 1 and 2', 'grab 3 directly'],
    correctIndex: 0,
    success: 'The largest value begins to bubble right.',
  },
  {
    title: 'PHASE 2: INDEX IN THE DARK',
    prompt: 'The rope is known to be in basket 7. What is the fastest move?',
    options: ['scan 0 through 7', 'open basket 7', 'shuffle the labels'],
    correctIndex: 1,
    success: 'Direct access cuts through the dark.',
  },
  {
    title: 'PHASE 3: HASH STORM',
    prompt: 'Crop index 14 uses bucket = index % 4. Which bucket?',
    options: ['bucket 0', 'bucket 2', 'bucket 4'],
    correctIndex: 1,
    success: 'The formula maps chaos into a stable bucket.',
  },
  {
    title: 'PHASE 4: PAIR OR PERISH',
    prompt: 'Target is 11. You stand on 4. What complement do you need?',
    options: ['5', '7', '15'],
    correctIndex: 1,
    success: 'Complement found. The pair locks.',
  },
  {
    title: 'PHASE 5: TOTAL CHAOS',
    prompt: 'What wins against the Shuffler?',
    options: ['random retries', 'rules you can reuse', 'more noise'],
    correctIndex: 1,
    success: 'The Shuffler settles into order.',
  },
];

export class Boss_Shuffler extends BasePuzzleScene {
  private phaseIndex = 0;
  private mistakes = 0;
  private phaseTitle!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private optionContainer!: Phaser.GameObjects.Container;
  private shuffler!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_SHUFFLER });
    this.puzzleId = 'boss_shuffler';
    this.puzzleName = 'The Shuffler';
    this.puzzleDescription = 'Prove every Array Plains lesson while chaos keeps changing shape.';
    this.maxHints = 2;
  }

  protected shouldSkipConceptBridge(): boolean {
    return true;
  }

  create(): void {
    super.create();
    this.createShuffler();
    this.createPhaseText();
    this.renderPhase();
  }

  private createShuffler(): void {
    const { width, height } = this.cameras.main;
    this.shuffler = this.add.container(width / 2, height / 2 + 18);
    const core = this.add.circle(0, 0, 70, 0x4a4a6a, 0.72)
      .setStrokeStyle(4, COLORS.ERROR, 0.9);
    const grin = this.add.text(0, 0, '!?', {
      fontSize: '22px',
      fontFamily: FONTS.RETRO,
      color: '#fbbf24',
    }).setOrigin(0.5);

    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const tile = this.add.rectangle(Math.cos(angle) * 112, Math.sin(angle) * 82, 34, 34, 0xd6b45c, 0.9)
        .setStrokeStyle(2, 0x7a4f1d, 1)
        .setAngle(i * 19);
      this.shuffler.add(tile);
    }

    this.shuffler.add([core, grin]);
    this.tweens.add({
      targets: this.shuffler,
      angle: 360,
      duration: 9000,
      repeat: -1,
      ease: 'Linear',
    });
  }

  private createPhaseText(): void {
    const { width } = this.cameras.main;
    this.phaseTitle = this.add.text(width / 2, 150, '', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: '#ef4444',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.promptText = this.add.text(width / 2, 196, '', {
      fontSize: '13px',
      fontFamily: FONTS.MONO,
      color: '#d1d5db',
      align: 'center',
      wordWrap: { width: 820 },
    }).setOrigin(0.5);
    this.optionContainer = this.add.container(0, 0);
  }

  private renderPhase(): void {
    const phase = PHASES[this.phaseIndex];
    this.phaseTitle.setText(phase.title);
    this.promptText.setText(phase.prompt);
    this.optionContainer.removeAll(true);

    const { width, height } = this.cameras.main;
    const startX = width / 2 - 300;
    const y = height - 142;
    phase.options.forEach((option, index) => {
      const x = startX + index * 300;
      const button = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, 248, 64, COLORS.COSMIC_PURPLE, 0.96)
        .setStrokeStyle(2, COLORS.CYAN_GLOW, 0.6)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(0, 0, option, {
        fontSize: '11px',
        fontFamily: FONTS.MONO,
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 220 },
      }).setOrigin(0.5);
      bg.on('pointerdown', () => this.choose(index));
      button.add([bg, label]);
      this.optionContainer.add(button);
    });
  }

  private choose(index: number): void {
    const phase = PHASES[this.phaseIndex];
    if (index !== phase.correctIndex) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      this.showMessage('The Shuffler gets louder.', COLORS.WARNING);
      return;
    }

    audioManager.playCorrectTone();
    this.showMessage(phase.success, COLORS.SUCCESS);
    this.phaseIndex++;

    if (this.phaseIndex >= PHASES.length) {
      this.time.delayedCall(700, () => this.complete());
      return;
    }

    this.tweens.add({
      targets: this.shuffler,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 160,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => this.renderPhase(),
    });
  }

  private complete(): void {
    const stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    const phase = PHASES[this.phaseIndex];
    const hints = [
      'Name the rule before you move.',
      `This phase wants: ${phase.options[phase.correctIndex]}.`,
    ];
    this.showMessage(hints[hintNumber - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }

  protected getConceptName(): string {
    return 'Collection Mastery';
  }
}
