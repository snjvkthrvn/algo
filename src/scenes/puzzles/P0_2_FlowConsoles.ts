/**
 * P0-2: Flow Consoles - Key-Value Mapping Puzzle
 * 3 consoles + 3 shards + central core. Match shards to consoles.
 */

import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { SCENE_KEYS, COLORS } from '../../config/constants';
import { adjustBrightness } from '../../utils/colors';
import { audioManager } from '../../core/AudioManager';
import { BitHint } from '../../entities/BitHint';
import { numberKeyToIndex } from '../../input/NumberKeyCommand';
import { getShardTarget, type ConsoleKind, type ShardKind } from '../../data/puzzles/prologuePuzzleLogic';

interface ShardDef {
  id: ShardKind;
  shape: 'triangle' | 'diamond' | 'circle';
  color: number;
}

interface ConsoleDef {
  id: ConsoleKind;
  color: number;
  /** Shape this console accepts (inverse of SHARD_TARGETS). */
  expectsShape: ShardDef['shape'];
}

interface Shard {
  def: ShardDef;
  container: Phaser.GameObjects.Container;
  originalX: number;
  originalY: number;
  placed: boolean;
}

interface ConsoleSlot {
  def: ConsoleDef;
  container: Phaser.GameObjects.Container;
  x: number;
  y: number;
  filled: boolean;
}

const SHARD_DEFS: ShardDef[] = [
  { id: 'triangle', shape: 'triangle', color: COLORS.ERROR },
  { id: 'diamond', shape: 'diamond', color: 0x3b82f6 },
  { id: 'circle', shape: 'circle', color: COLORS.SUCCESS },
];

const CONSOLE_DEFS: ConsoleDef[] = [
  { id: 'red', color: COLORS.ERROR, expectsShape: 'triangle' },
  { id: 'blue', color: 0x3b82f6, expectsShape: 'diamond' },
  { id: 'green', color: COLORS.SUCCESS, expectsShape: 'circle' },
];

export class P0_2_FlowConsoles extends BasePuzzleScene {
  private shards: Shard[] = [];
  private consoles: ConsoleSlot[] = [];
  private heldShard: Shard | null = null;
  private coreGraphics!: Phaser.GameObjects.Graphics;
  private coreBrightness: number = 0;
  private completedCount: number = 0;
  private hintText: Phaser.GameObjects.Text | null = null;
  private flowLines: Phaser.GameObjects.Graphics[] = [];
  private bitHint!: BitHint;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_P0_2 });
    this.puzzleId = 'p0_2';
    this.puzzleName = 'Flow Consoles';
    this.puzzleDescription = 'Match each shard shape to the console color that accepts it.';
  }

  create(): void {
    super.create();

    const { width, height } = this.cameras.main;

    this.createCore(width / 2, height / 2 + 20);
    this.createConsoles(width);
    this.createShards(width, height);

    // Bit starts near the center, watching the layout
    this.bitHint = new BitHint(this, width / 2, height / 2 - 60);

    // Interaction
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const commandIndex = numberKeyToIndex(event.key, this.shards.length);
      if (commandIndex !== null) this.handleNumberCommand(commandIndex);
    });
  }

  private createCore(x: number, y: number): void {
    this.coreGraphics = this.add.graphics();
    this.updateCore(x, y);
  }

  private updateCore(x: number, y: number): void {
    this.coreGraphics.clear();

    // Outer ring
    this.coreGraphics.lineStyle(3, COLORS.CYAN_GLOW, 0.3 + this.coreBrightness * 0.7);
    this.coreGraphics.strokeCircle(x, y, 40);

    // Inner glow
    this.coreGraphics.fillStyle(COLORS.CYAN_GLOW, 0.1 + this.coreBrightness * 0.4);
    this.coreGraphics.fillCircle(x, y, 35);

    // Core center
    this.coreGraphics.fillStyle(0xffffff, 0.2 + this.coreBrightness * 0.6);
    this.coreGraphics.fillCircle(x, y, 15);
  }

  private createConsoles(width: number): void {
    const y = 200;
    const spacing = 200;
    const startX = width / 2 - spacing;

    for (let i = 0; i < CONSOLE_DEFS.length; i++) {
      const x = startX + i * spacing;
      const def = CONSOLE_DEFS[i];
      const container = this.add.container(x, y);

      const base = this.add.rectangle(0, 0, 80, 80, COLORS.FRAME_BORDER_DARK, 0.85);
      base.setStrokeStyle(2, def.color);
      container.add(base);

      this.drawShapeIndicator(container, def.expectsShape, def.color, 0, -5, 20, 0.45);

      const label = this.add.text(0, 34, def.id.toUpperCase(), {
        fontSize: '7px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#9ca3af',
      }).setOrigin(0.5);
      container.add(label);

      const consoleSlot: ConsoleSlot = { def, container, x, y, filled: false };
      this.consoles.push(consoleSlot);

      base.setInteractive({ useHandCursor: true });
      base.on('pointerdown', () => {
        if (this.heldShard && !consoleSlot.filled) {
          this.tryPlaceShard(this.heldShard, consoleSlot);
        }
      });
    }
  }

  private createShards(width: number, height: number): void {
    const y = height - 160;
    const spacing = 180;
    const startX = width / 2 - spacing;

    for (let i = 0; i < SHARD_DEFS.length; i++) {
      const x = startX + i * spacing;
      const def = SHARD_DEFS[i];
      const container = this.add.container(x, y);

      // Shard glow
      const glow = this.add.graphics();
      glow.fillStyle(def.color, 0.15);
      glow.fillCircle(0, 0, 35);
      container.add(glow);

      // Draw the shard shape
      this.drawShapeIndicator(container, def.shape, def.color, 0, 0, 25, 1);

      // Label
      const label = this.add.text(0, 35, 'SHARD', {
        fontSize: '7px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#9ca3af',
      }).setOrigin(0.5);
      container.add(label);

      // Make interactive
      const hitArea = this.add.rectangle(0, 0, 60, 60, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => this.pickupShard(this.shards[i]));
      container.add(hitArea);

      // Floating animation
      this.tweens.add({
        targets: container,
        y: y - 5,
        duration: 1500 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.shards.push({
        def,
        container,
        originalX: x,
        originalY: y,
        placed: false,
      });
    }
  }

  private drawShapeIndicator(
    container: Phaser.GameObjects.Container,
    shape: ShardDef['shape'],
    color: number,
    x: number,
    y: number,
    size: number,
    alpha: number
  ): void {
    const graphics = this.add.graphics();
    const stroke = adjustBrightness(color, 0.6);

    switch (shape) {
      case 'circle':
        graphics.fillStyle(color, alpha);
        graphics.fillCircle(x, y, size);
        graphics.lineStyle(2, stroke, alpha);
        graphics.strokeCircle(x, y, size);
        break;

      case 'triangle':
        graphics.fillStyle(color, alpha);
        graphics.fillTriangle(
          x, y - size,
          x - size, y + size * 0.7,
          x + size, y + size * 0.7
        );
        graphics.lineStyle(2, stroke, alpha);
        graphics.strokeTriangle(
          x, y - size,
          x - size, y + size * 0.7,
          x + size, y + size * 0.7
        );
        break;

      case 'diamond': {
        graphics.fillStyle(color, alpha);
        graphics.beginPath();
        graphics.moveTo(x, y - size);
        graphics.lineTo(x + size * 0.95, y);
        graphics.lineTo(x, y + size);
        graphics.lineTo(x - size * 0.95, y);
        graphics.closePath();
        graphics.fillPath();
        graphics.lineStyle(2, stroke, alpha);
        graphics.beginPath();
        graphics.moveTo(x, y - size);
        graphics.lineTo(x + size * 0.95, y);
        graphics.lineTo(x, y + size);
        graphics.lineTo(x - size * 0.95, y);
        graphics.closePath();
        graphics.strokePath();
        break;
      }
    }

    container.add(graphics);
  }

  private pickupShard(shard: Shard): void {
    if (shard.placed || this.heldShard === shard) return;

    if (this.heldShard) {
      // Drop current shard back
      this.returnShard(this.heldShard);
    }

    this.heldShard = shard;
    shard.container.setScale(1.2);
    shard.container.setAlpha(0.8);

    // Bit moves near the held shard to indicate it's watching
    this.bitHint.moveTo(shard.container.x, shard.container.y - 50);

    // Visual indicator
    this.showMessage('Shard picked up! Click console or press 1-3 to place.', COLORS.CYAN_GLOW);
  }

  private handleNumberCommand(index: number): void {
    if (this.heldShard) {
      const console = this.consoles[index];
      if (console && !console.filled) this.tryPlaceShard(this.heldShard, console);
      return;
    }

    const shard = this.shards[index];
    if (shard && !shard.placed) this.pickupShard(shard);
  }

  private tryPlaceShard(shard: Shard, console: ConsoleSlot): void {
    const target = getShardTarget(shard.def.id);
    const matches = target !== null && target === console.def.id;

    if (matches) {
      // Correct placement!
      shard.placed = true;
      this.heldShard = null;
      this.completedCount++;
      this.bitHint.showWarm();

      // Snap to console
      this.tweens.add({
        targets: shard.container,
        x: console.x,
        y: console.y,
        scale: 0.8,
        alpha: 1,
        duration: 300,
        ease: 'Back.easeOut',
      });

      console.filled = true;
      audioManager.playCorrectTone();

      // Draw flow line to core
      this.drawFlowLine(console.x, console.y);

      // Update core brightness
      this.coreBrightness = this.completedCount / 3;
      this.updateCore(this.cameras.main.width / 2, this.cameras.main.height / 2 + 20);

      // Particle burst
      this.createParticleBurst(console.x, console.y, shard.def.color);

      // Check completion
      if (this.completedCount >= 3) {
        this.time.delayedCall(800, () => this.puzzleComplete());
      }
    } else {
      // Wrong placement
      this.attempts++;
      audioManager.playWrongTone();
      this.bitHint.showCold();

      // Red flash on console
      const originalAlpha = console.container.alpha;
      this.tweens.add({
        targets: console.container,
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          console.container.alpha = originalAlpha;
        },
      });

      this.cameras.main.shake(200, 0.003);
      this.showMessage('Wrong match! Try another console.', COLORS.ERROR);
      this.returnShard(shard);
    }
  }

  private returnShard(shard: Shard): void {
    this.heldShard = null;
    this.tweens.add({
      targets: shard.container,
      x: shard.originalX,
      y: shard.originalY,
      scale: 1,
      alpha: 1,
      duration: 300,
    });
  }

  private drawFlowLine(fromX: number, fromY: number): void {
    const { width, height } = this.cameras.main;
    const toX = width / 2;
    const toY = height / 2 + 20;

    const line = this.add.graphics();
    line.lineStyle(2, COLORS.CYAN_GLOW, 0);

    // Animate the line drawing
    const steps = 30;
    let step = 0;

    this.time.addEvent({
      delay: 20,
      repeat: steps,
      callback: () => {
        step++;
        const t = step / steps;
        line.clear();
        line.lineStyle(2, COLORS.CYAN_GLOW, 0.6);
        line.beginPath();
        line.moveTo(fromX, fromY);

        const endX = fromX + (toX - fromX) * t;
        const endY = fromY + (toY - fromY) * t;
        line.lineTo(endX, endY);
        line.strokePath();
      },
    });

    this.flowLines.push(line);
  }

  private createParticleBurst(x: number, y: number, color: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const particle = this.add.circle(x, y, 3, color, 0.8);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 60,
        y: y + Math.sin(angle) * 60,
        alpha: 0,
        scale: 0,
        duration: 500,
        onComplete: () => particle.destroy(),
      });
    }
  }

  private puzzleComplete(): void {
    this.hintText?.destroy();
    this.hintText = null;
    this.bitHint.celebrate();

    let stars = 1;
    if (this.attempts === 0 && this.hintsUsed === 0) {
      stars = 3;
    } else if (this.attempts <= 2 && this.hintsUsed <= 1) {
      stars = 2;
    }

    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    this.hintText?.destroy();

    switch (hintNumber) {
      case 1:
        this.hintText = this.add.text(
          this.cameras.main.width / 2, this.cameras.main.height - 80,
          'Hint: Each console shows what it needs. Match the shapes.',
          { fontSize: '11px', fontFamily: 'monospace', color: '#fbbf24', align: 'center', wordWrap: { width: 500 } }
        ).setOrigin(0.5).setDepth(500);
        break;

      case 2: {
        const unplaced = this.shards.find((s) => !s.placed);
        const matchingConsole = this.consoles.find(
          (c) => !c.filled && unplaced && getShardTarget(unplaced.def.id) === c.def.id
        );

        if (unplaced && matchingConsole) {
          this.tweens.add({
            targets: [unplaced.container, matchingConsole.container],
            scale: 1.15,
            duration: 400,
            yoyo: true,
            repeat: 3,
          });
        }

        this.hintText = this.add.text(
          this.cameras.main.width / 2, this.cameras.main.height - 80,
          'Hint: A matching pair is highlighted.',
          { fontSize: '11px', fontFamily: 'monospace', color: '#fbbf24', align: 'center' }
        ).setOrigin(0.5).setDepth(500);
        break;
      }

      case 3: {
        const unplacedShard = this.shards.find((s) => !s.placed);
        const targetConsole = this.consoles.find(
          (c) => !c.filled && unplacedShard && getShardTarget(unplacedShard.def.id) === c.def.id
        );

        if (unplacedShard && targetConsole) {
          this.heldShard = unplacedShard;
          this.tryPlaceShard(unplacedShard, targetConsole);
        }

        this.hintText = this.add.text(
          this.cameras.main.width / 2, this.cameras.main.height - 80,
          'Hint: One shard has been placed for you.',
          { fontSize: '11px', fontFamily: 'monospace', color: '#fbbf24', align: 'center' }
        ).setOrigin(0.5).setDepth(500);
        break;
      }
    }
  }

  protected getConceptName(): string {
    return 'Key-Value Mapping';
  }

  destroy(): void {
    for (const line of this.flowLines) {
      if (line.active) line.destroy();
    }
    this.flowLines = [];
    this.bitHint?.destroy();
  }
}
