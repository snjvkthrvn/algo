import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { audioManager } from '../../core/AudioManager';
import { HASH_CROPS, hashBucket } from '../../data/puzzles/arrayPlainsPuzzleLogic';
import { numberKeyToIndex } from '../../input/NumberKeyCommand';

interface Bucket {
  index: number;
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class P1_3_HashHopper extends BasePuzzleScene {
  private buckets: Bucket[] = [];
  private cropIndex = 0;
  private mistakes = 0;
  private cropText!: Phaser.GameObjects.Text;
  private formulaText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_3 });
    this.puzzleId = 'ap_3';
    this.puzzleName = 'Grain Hopper';
    this.puzzleDescription = 'Apply the hash formula and route each crop to its bucket.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_GRAIN_HOPPER_BG;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.02;
  }

  create(): void {
    super.create();
    this.createBuckets();
    this.renderCrop();
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const index = numberKeyToIndex(event.key, this.buckets.length);
      if (index !== null) this.chooseBucket(index);
    });
  }

  private createBuckets(): void {
    const { width, height } = this.cameras.main;
    this.cropText = this.add.text(width / 2, 178, '', {
      fontSize: '14px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5);
    this.formulaText = this.add.text(width / 2, 212, 'bucket = first-letter-index % 4', {
      fontSize: '12px',
      fontFamily: FONTS.MONO,
      color: '#e0f8d0',
      backgroundColor: '#346856',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5);

    const startX = width / 2 - 270;
    const y = height / 2 + 100;
    for (let i = 0; i < 4; i++) {
      const x = startX + i * 180;
      const box = this.add.rectangle(x, y, 118, 112, 0xe0f8d0, 0.94)
        .setStrokeStyle(3, 0x346856, 0.95)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, `BUCKET ${i}`, {
        fontSize: '10px',
        fontFamily: FONTS.RETRO,
        color: '#081820',
        align: 'center',
      }).setOrigin(0.5);
      box.on('pointerdown', () => this.chooseBucket(i));
      this.buckets.push({ index: i, box, label });
    }
  }

  private renderCrop(): void {
    const crop = HASH_CROPS[this.cropIndex];
    this.cropText.setText(`${crop.crop}: first letter index ${crop.letterIndex}`);
    this.formulaText.setText(`${crop.letterIndex} % 4 = ?`);
    for (const bucket of this.buckets) {
      bucket.box.setFillStyle(0xe0f8d0, 0.94);
      bucket.box.setStrokeStyle(3, 0x346856, 0.95);
    }
  }

  private chooseBucket(index: number): void {
    const crop = HASH_CROPS[this.cropIndex];
    const expected = hashBucket(crop.letterIndex, this.buckets.length);
    if (index === expected) {
      this.buckets[index].box.setFillStyle(COLORS.SUCCESS, 0.95);
      audioManager.playCorrectTone();
      this.cropIndex++;

      if (this.cropIndex >= HASH_CROPS.length) {
        this.time.delayedCall(350, () => this.complete());
      } else {
        this.time.delayedCall(520, () => this.renderCrop());
      }
      return;
    }

    this.mistakes++;
    this.attempts++;
    this.buckets[index].box.setFillStyle(COLORS.ERROR, 0.85);
    audioManager.playWrongTone();
    this.showMessage('Hash miss. Run the formula again.', COLORS.WARNING);
  }

  private complete(): void {
    const stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    const crop = HASH_CROPS[this.cropIndex];
    const expected = hashBucket(crop.letterIndex, 4);
    const messages = [
      `Modulo keeps the answer inside the bucket range: ${crop.letterIndex} % 4.`,
      `The current crop belongs in bucket ${expected}.`,
      'If two crops land in the same bucket, that is a collision. The formula still worked.',
    ];
    this.showMessage(messages[hintNumber - 1] ?? messages[0], COLORS.GOLD_ACCENT);
  }

  protected getConceptName(): string {
    return 'Hash Functions';
  }
}
