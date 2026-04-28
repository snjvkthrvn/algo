/**
 * P0-1: Follow the Path - Sequential Processing Puzzle
 * 6 hexagonal tiles, 3 rounds of increasing sequence length.
 */

import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { SCENE_KEYS, COLORS } from '../../config/constants';
import { adjustBrightness } from '../../utils/colors';
import { audioManager } from '../../core/AudioManager';
import { BitHint } from '../../entities/BitHint';
import { numberKeyToIndex } from '../../input/NumberKeyCommand';
import { SEQUENCE_ROUNDS, runeIdToTileIndex } from '../../data/puzzles/prologuePuzzleLogic';

type PuzzleState = 'INTRO' | 'SHOWING_PATTERN' | 'PLAYER_TURN' | 'FEEDBACK' | 'ROUND_COMPLETE' | 'PUZZLE_COMPLETE';

interface HexTile {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Polygon;
  index: number;
  color: number;
  x: number;
  y: number;
}

const TILE_COLORS = [
  0x06b6d4, // Cyan
  0x8b5cf6, // Purple
  0x22c55e, // Green
  0xf97316, // Orange
  0xef4444, // Red
  0xfbbf24, // Gold
];

export class P0_1_FollowThePath extends BasePuzzleScene {
  private tiles: HexTile[] = [];
  private currentRound: number = 0;
  private currentSequence: number[] = [];
  private playerInputIndex: number = 0;
  private puzzleState: PuzzleState = 'INTRO';
  private hintText: Phaser.GameObjects.Text | null = null;
  private bitHint!: BitHint;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_P0_1 });
    this.puzzleId = 'p0_1';
    this.puzzleName = 'Follow the Path';
    this.puzzleDescription = 'Watch the sequence. Repeat the pattern. Order matters.';
  }

  create(): void {
    super.create();
    this.createTiles();
    this.puzzleState = 'INTRO';

    // Place Bit near the center, above the tile ring
    const { width, height } = this.cameras.main;
    this.bitHint = new BitHint(this, width / 2, height / 2 - 80);

    // Brief intro then start first round
    this.time.delayedCall(800, () => {
      this.startRound();
    });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const tileIndex = numberKeyToIndex(event.key, this.tiles.length);
      if (tileIndex !== null) this.onTileClick(tileIndex);
    });
  }

  private createTiles(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2 + 40;
    const radius = 140;

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const tile = this.createHexTile(x, y, 50, TILE_COLORS[i], i);
      this.tiles.push(tile);
    }
  }

  private createHexTile(x: number, y: number, size: number, color: number, index: number): HexTile {
    const container = this.add.container(x, y);

    // Hex points
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      points.push({
        x: size * Math.cos(angle),
        y: size * Math.sin(angle),
      });
    }

    // Shadow
    const shadowPoints = points.map((p) => ({ x: p.x + 3, y: p.y + 3 }));
    const shadow = this.add.polygon(0, 0, shadowPoints, 0x000000, 0.4);
    shadow.setOrigin(0.5, 0.5);
    container.add(shadow);

    // Main hex
    const bg = this.add.polygon(0, 0, points, color, 0.8);
    bg.setOrigin(0.5, 0.5);
    bg.setStrokeStyle(3, adjustBrightness(color, 0.6));
    container.add(bg);

    // Label
    const label = this.add.text(0, 0, `${index + 1}`, {
      fontSize: '20px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    container.add(label);

    // Make interactive
    bg.setInteractive(
      new Phaser.Geom.Polygon(points),
      Phaser.Geom.Polygon.Contains
    );

    bg.on('pointerdown', () => this.onTileClick(index));

    bg.on('pointerover', () => {
      if (this.puzzleState === 'PLAYER_TURN') {
        bg.setFillStyle(adjustBrightness(color, 1.3), 1);
      }
    });

    bg.on('pointerout', () => {
      if (this.puzzleState === 'PLAYER_TURN') {
        bg.setFillStyle(color, 0.8);
      }
    });

    return { container, bg, index, color, x, y };
  }

  private startRound(): void {
    if (this.currentRound >= SEQUENCE_ROUNDS.length) {
      this.puzzleComplete();
      return;
    }

    const round = SEQUENCE_ROUNDS[this.currentRound];
    this.currentSequence = round.map((id) => runeIdToTileIndex(id));

    this.playerInputIndex = 0;

    // Show round indicator
    this.showMessage(`Round ${this.currentRound + 1} of ${SEQUENCE_ROUNDS.length}`, COLORS.CYAN_GLOW);

    this.time.delayedCall(1200, () => {
      this.showPattern();
    });
  }

  private showPattern(): void {
    this.puzzleState = 'SHOWING_PATTERN';

    let delay = 0;
    for (let i = 0; i < this.currentSequence.length; i++) {
      const tileIndex = this.currentSequence[i];

      this.time.delayedCall(delay, () => {
        this.glowTile(tileIndex, 1000);
        audioManager.playTone(300 + tileIndex * 80, 200, 'sine');
        // Bit hovers near each tile as it glows — helps player track the path
        const tile = this.tiles[tileIndex];
        this.bitHint.moveTo(tile.x, tile.y - 55);
        this.bitHint.showNeutral();
      });

      delay += 1300; // 1.0s glow + 0.3s gap
    }

    // After pattern shown, switch to player turn
    this.time.delayedCall(delay + 300, () => {
      this.puzzleState = 'PLAYER_TURN';
      this.playerInputIndex = 0;
      this.showMessage('Your turn!', COLORS.GOLD_ACCENT);
      // Bit returns to center, ready to react to player input
      const { width, height } = this.cameras.main;
      this.bitHint.moveTo(width / 2, height / 2 - 80);
    });
  }

  private glowTile(index: number, duration: number): void {
    const tile = this.tiles[index];

    tile.bg.setFillStyle(0xffffff, 1);

    this.tweens.add({
      targets: tile.container,
      scale: 1.15,
      duration: duration / 2,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        tile.bg.setFillStyle(tile.color, 0.8);
      },
    });
  }

  private onTileClick(index: number): void {
    if (this.puzzleState !== 'PLAYER_TURN') return;

    const expected = this.currentSequence[this.playerInputIndex];

    if (index === expected) {
      // Correct!
      this.glowTile(index, 300);
      audioManager.playTone(300 + index * 80, 100, 'sine');
      this.bitHint.showWarm();

      this.playerInputIndex++;

      if (this.playerInputIndex >= this.currentSequence.length) {
        // Round complete!
        this.puzzleState = 'ROUND_COMPLETE';
        audioManager.playCorrectTone();
        this.showMessage('Sequence Complete!', COLORS.SUCCESS);
        this.bitHint.showNeutral();

        this.time.delayedCall(1500, () => {
          this.currentRound++;
          this.startRound();
        });
      }
    } else {
      // Wrong!
      this.puzzleState = 'FEEDBACK';
      this.attempts++;
      audioManager.playWrongTone();
      this.bitHint.showCold();

      // Red flash on wrong tile
      const tile = this.tiles[index];
      tile.bg.setFillStyle(COLORS.ERROR, 1);

      // Screen shake
      this.cameras.main.shake(200, 0.005);

      this.showMessage('Wrong! Watch again...', COLORS.ERROR);

      this.time.delayedCall(300, () => {
        tile.bg.setFillStyle(tile.color, 0.8);
      });

      // Replay the pattern
      this.time.delayedCall(1500, () => {
        this.playerInputIndex = 0;
        this.showPattern();
      });
    }
  }

  private puzzleComplete(): void {
    this.hintText?.destroy();
    this.hintText = null;
    this.puzzleState = 'PUZZLE_COMPLETE';
    this.bitHint.celebrate();

    // Calculate stars
    let stars = 1;
    if (this.attempts === 0 && this.hintsUsed === 0) {
      stars = 3;
    } else if (this.attempts <= 2 && this.hintsUsed <= 1) {
      stars = 2;
    }

    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    // Clear previous hint
    this.hintText?.destroy();

    switch (hintNumber) {
      case 1:
        this.hintText = this.add.text(
          this.cameras.main.width / 2, this.cameras.main.height - 80,
          'Hint: Watch the order carefully. The first tile glows first.',
          { fontSize: '11px', fontFamily: 'monospace', color: '#fbbf24', align: 'center', wordWrap: { width: 500 } }
        ).setOrigin(0.5).setDepth(500);
        break;

      case 2:
        if (this.currentSequence.length > 0 && this.puzzleState === 'PLAYER_TURN') {
          const firstTile = this.tiles[this.currentSequence[0]];
          this.tweens.add({
            targets: firstTile.container,
            scale: 1.1,
            duration: 500,
            yoyo: true,
            repeat: 3,
          });
          this.hintText = this.add.text(
            this.cameras.main.width / 2, this.cameras.main.height - 80,
            'Hint: The first tile in the sequence is highlighted.',
            { fontSize: '11px', fontFamily: 'monospace', color: '#fbbf24', align: 'center' }
          ).setOrigin(0.5).setDepth(500);
        }
        break;

      case 3:
        if (this.puzzleState === 'PLAYER_TURN') {
          this.hintText = this.add.text(
            this.cameras.main.width / 2, this.cameras.main.height - 80,
            'Hint: Replaying sequence at half speed...',
            { fontSize: '11px', fontFamily: 'monospace', color: '#fbbf24', align: 'center' }
          ).setOrigin(0.5).setDepth(500);

          // Replay at 0.5x speed (2x duration)
          this.puzzleState = 'SHOWING_PATTERN';
          let delay = 0;
          for (let i = 0; i < this.currentSequence.length; i++) {
            const tileIndex = this.currentSequence[i];
            this.time.delayedCall(delay, () => {
              this.glowTile(tileIndex, 2000);
              audioManager.playTone(300 + tileIndex * 80, 400, 'sine');
            });
            delay += 2600;
          }

          this.time.delayedCall(delay + 500, () => {
            this.puzzleState = 'PLAYER_TURN';
            this.playerInputIndex = 0;
          });
        }
        break;
    }
  }

  protected getConceptName(): string {
    return 'Sequential Processing';
  }
}
