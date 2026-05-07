import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { audioManager } from '../../core/AudioManager';
import { BASKET_ITEMS, basketIndexForItem } from '../../data/puzzles/arrayPlainsPuzzleLogic';
import { numberKeyToIndex } from '../../input/NumberKeyCommand';

interface Basket {
  index: number;
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class P1_2_BasketIndexing extends BasePuzzleScene {
  private baskets: Basket[] = [];
  private requestIndex = 0;
  private mistakes = 0;
  private requestText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private actionTimer: Phaser.Time.TimerEvent | null = null;
  private timeLeft = 10;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_2 });
    this.puzzleId = 'ap_2';
    this.puzzleName = 'Indexing Barn';
    this.puzzleDescription = 'Use the index to fetch the requested item instantly.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_INDEXING_BARN_BG;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.02;
  }

  create(): void {
    super.create();
    this.createBaskets();
    this.renderRequest();
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const index = event.key === '0' ? 9 : numberKeyToIndex(event.key, 9);
      if (index !== null) this.chooseBasket(index);
    });
  }

  private createBaskets(): void {
    const { width, height } = this.cameras.main;
    const startX = width / 2 - 360;
    const y = height / 2 + 54;

    this.requestText = this.add.text(width / 2, 170, '', {
      fontSize: '13px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      align: 'center',
      backgroundColor: '#e0f8d0',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5);

    this.timerText = this.add.text(width / 2, 206, '', {
      fontSize: '14px',
      fontFamily: FONTS.RETRO,
      color: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    for (let i = 0; i < 10; i++) {
      const x = startX + (i % 5) * 180;
      const rowY = y + Math.floor(i / 5) * 104;
      const box = this.add.rectangle(x, rowY, 108, 64, 0xd6b45c, 0.94)
        .setStrokeStyle(3, 0x346856, 0.92)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, rowY, `[${i}]`, {
        fontSize: '15px',
        fontFamily: FONTS.RETRO,
        color: '#081820',
      }).setOrigin(0.5);
      const key = this.add.text(x, rowY + 46, i === 9 ? '0' : `${i + 1}`, {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: '#e0f8d0',
      }).setOrigin(0.5);
      box.on('pointerdown', () => this.chooseBasket(i));
      this.baskets.push({ index: i, box, label });
      key.setDepth(4);
    }
  }

  private renderRequest(): void {
    const request = BASKET_ITEMS[this.requestIndex];
    this.requestText.setText(`Fetch: ${request.item.toUpperCase()}    Known index: ${request.index}`);

    for (const basket of this.baskets) {
      basket.box.setFillStyle(0xd6b45c, 0.94);
      basket.box.setStrokeStyle(3, 0x346856, 0.92);
      basket.label.setColor('#081820');
    }

    this.startTimer();
  }

  private startTimer(): void {
    this.timeLeft = Math.max(3, 8 - this.requestIndex);
    this.timerText.setText(`TIME REMAINING: ${this.timeLeft}`);
    this.timerText.setColor('#fbbf24');

    if (this.actionTimer) this.actionTimer.destroy();
    this.actionTimer = this.time.addEvent({
      delay: 1000,
      repeat: -1,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`TIME REMAINING: ${this.timeLeft}`);
        if (this.timeLeft <= 2) this.timerText.setColor('#ef4444');
        if (this.timeLeft <= 0) this.timeOut();
      }
    });
  }

  private timeOut(): void {
    if (this.actionTimer) this.actionTimer.destroy();
    this.mistakes++;
    this.attempts++;
    audioManager.playWrongTone();
    this.showMessage('Too slow! The request was missed.', COLORS.WARNING);
    this.time.delayedCall(500, () => this.renderRequest());
  }

  private chooseBasket(index: number): void {
    if (this.actionTimer) this.actionTimer.destroy();
    const request = BASKET_ITEMS[this.requestIndex];
    const expected = basketIndexForItem(request.item);
    if (expected === index) {
      const basket = this.baskets[index];
      basket.box.setFillStyle(COLORS.SUCCESS, 0.95);
      basket.label.setColor('#081820');
      audioManager.playCorrectTone();
      this.requestIndex++;

      if (this.requestIndex >= BASKET_ITEMS.length) {
        this.time.delayedCall(350, () => this.complete());
      } else {
        this.time.delayedCall(500, () => this.renderRequest());
      }
      return;
    }

    this.mistakes++;
    this.attempts++;
    this.baskets[index].box.setFillStyle(COLORS.ERROR, 0.85);
    audioManager.playWrongTone();
    this.showMessage('Index miss. Go straight to the known slot.', COLORS.WARNING);
    this.time.delayedCall(500, () => this.renderRequest());
  }

  private complete(): void {
    if (this.actionTimer) this.actionTimer.destroy();
    const stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    const request = BASKET_ITEMS[this.requestIndex];
    const messages = [
      `The request already tells you the address: basket ${request.index}.`,
      'Array indexing means direct access. Do not scan from basket 0.',
      'Keyboard shortcut: use 1-9 for baskets 0-8 and 0 for basket 9.',
    ];
    this.showMessage(messages[hintNumber - 1] ?? messages[0], COLORS.GOLD_ACCENT);
  }

  protected getConceptName(): string {
    return 'Array Indexing';
  }
}
