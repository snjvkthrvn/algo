import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { audioManager } from '../../core/AudioManager';
import { TWO_SUM_ROUNDS, isTwoSumPair } from '../../data/puzzles/arrayPlainsPuzzleLogic';
import { numberKeyToIndex } from '../../input/NumberKeyCommand';

interface NumberTile {
  value: number;
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class P1_4_TwoSum extends BasePuzzleScene {
  private roundIndex = 0;
  private selected: number[] = [];
  private mistakes = 0;
  private tiles: NumberTile[] = [];
  private targetText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_4 });
    this.puzzleId = 'ap_4';
    this.puzzleName = 'Pairing Grounds';
    this.puzzleDescription = 'Select two tiles whose values add to the target.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_PAIRING_GROUNDS_BG;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.02;
  }

  create(): void {
    super.create();
    this.createTiles();
    this.renderRound();
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const index = numberKeyToIndex(event.key, this.tiles.length);
      if (index !== null) this.chooseTile(index);
    });
  }

  private createTiles(): void {
    const { width, height } = this.cameras.main;
    this.targetText = this.add.text(width / 2, 176, '', {
      fontSize: '15px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5);

    const startX = width / 2 - 240;
    const y = height / 2 + 72;
    for (let i = 0; i < 5; i++) {
      const x = startX + i * 120;
      const box = this.add.rectangle(x, y, 84, 84, 0xe0f8d0, 0.94)
        .setStrokeStyle(3, 0x346856, 0.95)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, '', {
        fontSize: '20px',
        fontFamily: FONTS.RETRO,
        color: '#081820',
      }).setOrigin(0.5);
      const key = this.add.text(x, y + 58, `${i + 1}`, {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: '#e0f8d0',
      }).setOrigin(0.5);
      key.setDepth(5);
      box.on('pointerdown', () => this.chooseTile(i));
      this.tiles.push({ value: 0, box, label });
    }
  }

  private renderRound(): void {
    const round = TWO_SUM_ROUNDS[this.roundIndex];
    this.selected = [];
    this.targetText.setText(`TARGET SUM: ${round.target}`);

    this.tiles.forEach((tile, index) => {
      tile.value = round.values[index];
      tile.label.setText(`${tile.value}`);
      tile.box.setFillStyle(0xe0f8d0, 0.94);
      tile.box.setStrokeStyle(3, 0x346856, 0.95);
    });
  }

  private chooseTile(index: number): void {
    const tile = this.tiles[index];
    if (this.selected.includes(tile.value)) return;

    this.selected.push(tile.value);
    tile.box.setFillStyle(COLORS.GOLD_ACCENT, 0.95);
    tile.box.setStrokeStyle(3, COLORS.CYAN_GLOW, 0.9);

    if (this.selected.length < 2) {
      const round = TWO_SUM_ROUNDS[this.roundIndex];
      const complement = round.target - tile.value;
      this.showMessage(`Need complement: ${complement}`, COLORS.CYAN_GLOW);
      return;
    }

    const round = TWO_SUM_ROUNDS[this.roundIndex];
    if (isTwoSumPair(round.values, round.target, this.selected)) {
      audioManager.playCorrectTone();
      this.roundIndex++;
      if (this.roundIndex >= TWO_SUM_ROUNDS.length) {
        this.time.delayedCall(350, () => this.complete());
      } else {
        this.time.delayedCall(520, () => this.renderRound());
      }
      return;
    }

    this.mistakes++;
    this.attempts++;
    audioManager.playWrongTone();
    this.showMessage('That pair misses the target.', COLORS.WARNING);
    this.time.delayedCall(500, () => this.renderRound());
  }

  private complete(): void {
    const stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    const round = TWO_SUM_ROUNDS[this.roundIndex];
    const messages = [
      'Pick one number, then compute target minus that number.',
      `This target is ${round.target}. The answer pair is ${round.answer[0]} and ${round.answer[1]}.`,
      'Two Sum gets fast when you remember which complements exist.',
    ];
    this.showMessage(messages[hintNumber - 1] ?? messages[0], COLORS.GOLD_ACCENT);
  }

  protected getConceptName(): string {
    return 'Two Sum';
  }
}
