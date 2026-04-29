import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { audioManager } from '../../core/AudioManager';
import { JuiceSystem } from '../../systems/JuiceSystem';
import { BUBBLE_SORT_START, isSortedAscending, swapAdjacent } from '../../data/puzzles/arrayPlainsPuzzleLogic';
import { numberKeyToIndex } from '../../input/NumberKeyCommand';

interface SortTile {
  value: number;
  container: Phaser.GameObjects.Container;
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class P1_1_BubbleSort extends BasePuzzleScene {
  private values = [...BUBBLE_SORT_START];
  private tiles: SortTile[] = [];
  private swapCount = 0;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_1 });
    this.puzzleId = 'ap_1';
    this.puzzleName = 'Sorting Shed';
    this.puzzleDescription = 'Swap neighboring tiles until the row is in order.';
  }

  create(): void {
    super.create();
    this.createRow();
    this.refreshHints();
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const left = numberKeyToIndex(event.key, this.values.length - 1);
      if (left !== null) this.trySwap(left);
    });
  }

  private createRow(): void {
    const { width, height } = this.cameras.main;
    const startX = width / 2 - 240;
    const y = height / 2 + 40;

    this.add.text(width / 2, 168, 'Press 1-4 or click a tile to swap it with its right neighbor.', {
      fontSize: '11px',
      fontFamily: FONTS.MONO,
      color: '#d1d5db',
    }).setOrigin(0.5);

    for (let i = 0; i < this.values.length; i++) {
      const tile = this.createTile(startX + i * 120, y, this.values[i], i);
      this.tiles.push(tile);
    }
  }

  private createTile(x: number, y: number, value: number, index: number): SortTile {
    const container = this.add.container(x, y);
    const box = this.add.rectangle(0, 0, 82, 82, 0xd6b45c, 0.95)
      .setStrokeStyle(3, 0x7a4f1d, 1)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, `${value}`, {
      fontSize: '24px',
      fontFamily: FONTS.RETRO,
      color: '#1f2937',
    }).setOrigin(0.5);
    const key = this.add.text(0, 54, index < this.values.length - 1 ? `${index + 1}` : '-', {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: '#9ca3af',
    }).setOrigin(0.5);

    container.add([box, label, key]);
    box.on('pointerdown', () => this.trySwap(index));
    return { value, container, box, label };
  }

  private trySwap(leftIndex: number): void {
    if (leftIndex < 0 || leftIndex >= this.values.length - 1) {
      this.showMessage('Choose a left neighbor.', COLORS.WARNING);
      return;
    }

    this.swapCount++;
    const oldValues = this.values;
    this.values = swapAdjacent(this.values, leftIndex);
    const leftTile = this.tiles[leftIndex];
    const rightTile = this.tiles[leftIndex + 1];
    this.tiles[leftIndex] = rightTile;
    this.tiles[leftIndex + 1] = leftTile;

    const leftX = leftTile.container.x;
    const rightX = rightTile.container.x;
    this.tweens.add({ targets: leftTile.container, x: rightX, duration: 180, ease: 'Power2' });
    this.tweens.add({ targets: rightTile.container, x: leftX, duration: 180, ease: 'Power2' });

    const wasUseful = oldValues[leftIndex] > oldValues[leftIndex + 1];
    audioManager.playTone(wasUseful ? 480 : 180, 110, 'square');

    const midX = (leftX + rightX) / 2;
    const tileY = leftTile.container.y;
    if (wasUseful) {
      JuiceSystem.correctBurst(this, midX, tileY);
    } else {
      JuiceSystem.wrongBurst(this, midX, tileY);
      this.attempts++;
      this.showMessage('That swap adds disorder.', COLORS.WARNING);
    }

    this.time.delayedCall(220, () => {
      this.refreshHints();
      if (isSortedAscending(this.values)) this.complete();
    });
  }

  private refreshHints(): void {
    this.tiles.forEach((tile, index) => {
      const needsSwap = index < this.values.length - 1 && this.values[index] > this.values[index + 1];
      tile.box.setFillStyle(needsSwap ? COLORS.GOLD_ACCENT : 0xd6b45c, needsSwap ? 0.96 : 0.9);
      tile.box.setStrokeStyle(3, needsSwap ? COLORS.CYAN_GLOW : 0x7a4f1d, needsSwap ? 0.95 : 1);
    });
  }

  private complete(): void {
    const stars = this.swapCount <= 7 ? 3 : this.swapCount <= 10 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    const messages = [
      'Bubble sort only compares neighbors.',
      'If the left value is bigger than the right value, swap them.',
      'Keep sweeping until no highlighted neighbor pair remains.',
    ];
    this.showMessage(messages[hintNumber - 1] ?? messages[0], COLORS.GOLD_ACCENT);
  }

  protected getConceptName(): string {
    return 'Bubble Sort';
  }
}
