/**
 * Queue Canals — interactive puzzles for FIFO, BFS, Priority Queue, Round-Robin.
 * Each puzzle embodies the concept physically — no multiple-choice questions.
 * Extends BasePuzzleScene directly; ScriptedChoiceScene is not used here.
 */

import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { JuiceSystem } from '../../systems/JuiceSystem';
import { audioManager } from '../../core/AudioManager';

// ─── shared palette helpers ──────────────────────────────────────────────────

const BOAT_COLORS = [0x06b6d4, 0xf97316, 0x88c070, 0xfbbf24, 0x8b5cf6, 0xef4444, 0x10b981, 0x3b82f6];

function boatColor(index: number): number {
  return BOAT_COLORS[index % BOAT_COLORS.length];
}

// ============================================================================
// P5_1 — Ferry Dock: FIFO Queue
// Rule: serve only from the front of the queue (left-most boat).
// ============================================================================

export class P5_1_FerryQueue extends BasePuzzleScene {
  private queue: { color: number; id: number; rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private nextId = 0;
  private served = 0;
  private mistakes = 0;
  private readonly totalToServe = 10;
  private readonly maxVisible = 5;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_QC_1 });
    this.puzzleId = 'qc_1';
    this.puzzleName = 'Ferry Dock';
    this.puzzleDescription = 'Serve arrivals in the order they docked — first in, first out.';
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_FERRY_DOCK_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.025; }
  protected getConceptName() { return 'Queue — FIFO'; }

  create(): void {
    super.create();
    const { width } = this.cameras.main;

    this.add.text(width / 2, 164, '← DOCK (serve here)', {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#88c070',
    }).setOrigin(0.5);

    this.add.text(width / 2, 184, 'QUEUE →', {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#88c070',
    }).setOrigin(0.5);

    this.add.text(width / 2, 144, 'Click the LEFT-MOST boat to serve it first!', {
      fontSize: '11px', fontFamily: FONTS.MONO,
      color: '#e0f8d0', backgroundColor: '#081820',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(20);

    this.scoreText = this.add.text(width / 2, 380, `Served: 0 / ${this.totalToServe}`, {
      fontSize: '13px', fontFamily: FONTS.RETRO, color: '#fbbf24',
    }).setOrigin(0.5).setDepth(20);

    // Prime the queue with 3 boats
    for (let i = 0; i < 3; i++) this.spawnBoat();

    // Spawn a new boat every 4 seconds
    this.spawnTimer = this.time.addEvent({ delay: 4000, repeat: -1, callback: this.spawnBoat, callbackScope: this });
  }

  private spawnBoat(): void {
    if (this.queue.length >= this.maxVisible) return;
    const id = this.nextId++;
    const color = boatColor(id);
    const { width, height } = this.cameras.main;

    const slotX = this.slotX(this.queue.length);
    const y = height / 2 + 8;

    const rect = this.add.rectangle(width - 64, y, 72, 56, color, 0.92)
      .setStrokeStyle(3, 0xe0f8d0, 0.9)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(width - 64, y, `#${id + 1}`, {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#081820',
    }).setOrigin(0.5);

    const entry = { color, id, rect, label };
    this.queue.push(entry);
    rect.on('pointerdown', () => this.tryServe(entry));

    // Slide in from right
    this.tweens.add({ targets: [rect, label], x: slotX, duration: 300, ease: 'Power2.easeOut' });
  }

  private slotX(index: number): number {
    const { width } = this.cameras.main;
    // Slots: 0 = leftmost (serve side), 4 = rightmost (arrival side)
    return width / 2 - 200 + index * 88;
  }

  private tryServe(entry: typeof this.queue[0]): void {
    if (this.queue[0] !== entry) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, entry.rect.x, entry.rect.y);
      this.showMessage('Serve the first arrival — the left-most boat!', COLORS.WARNING);
      return;
    }

    // Correct: dequeue from front
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, entry.rect.x, entry.rect.y);
    this.tweens.add({
      targets: [entry.rect, entry.label],
      x: -80, alpha: 0, duration: 280, ease: 'Power2.easeIn',
      onComplete: () => { entry.rect.destroy(); entry.label.destroy(); },
    });
    this.queue.shift();
    this.served++;
    this.scoreText.setText(`Served: ${this.served} / ${this.totalToServe}`);

    // Slide remaining boats left
    this.queue.forEach((b, i) => {
      const tx = this.slotX(i);
      this.tweens.add({ targets: [b.rect, b.label], x: tx, duration: 240, ease: 'Power1' });
    });

    if (this.served >= this.totalToServe) {
      this.spawnTimer.destroy();
      this.time.delayedCall(400, () => {
        const stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
        this.onPuzzleComplete(stars);
      });
    }
  }

  protected displayHint(n: number): void {
    const msgs = [
      'FIFO = First In, First Out. The earliest boat to dock leaves first.',
      'Ignore the number on the boat — look at position. Leftmost = oldest.',
      'In a real queue, you cannot skip ahead. The line must be honored.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P5_2 — Ripple Map: BFS (Breadth-First Spread)
// Rule: water spreads one layer at a time — must click frontier cells only.
// ============================================================================

export class P5_2_BfsLocks extends BasePuzzleScene {
  private lit: Set<string> = new Set();
  private cells: Map<string, { rect: Phaser.GameObjects.Rectangle }> = new Map();
  private mistakes = 0;
  private readonly COLS = 5;
  private readonly ROWS = 5;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_QC_2 });
    this.puzzleId = 'qc_2';
    this.puzzleName = 'Ripple Map';
    this.puzzleDescription = 'Flood the canal plots in BFS order — adjacent plots first.';
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_RIPPLE_MAP_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.025; }
  protected getConceptName() { return 'Breadth-First Search'; }

  create(): void {
    super.create();
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, 152, 'Click any cell ADJACENT to a flooded cell (gold).', {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#e0f8d0',
      backgroundColor: '#081820', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(20);

    const cellSize = 64;
    const gap = 6;
    const totalW = this.COLS * cellSize + (this.COLS - 1) * gap;
    const startX = width / 2 - totalW / 2 + cellSize / 2;
    const startY = height / 2 - ((this.ROWS * cellSize + (this.ROWS - 1) * gap) / 2) + cellSize / 2 + 24;

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const x = startX + c * (cellSize + gap);
        const y = startY + r * (cellSize + gap);
        const key = `${r},${c}`;
        const rect = this.add.rectangle(x, y, cellSize, cellSize, 0x1a3a5c, 0.9)
          .setStrokeStyle(2, 0x346856, 0.8)
          .setInteractive({ useHandCursor: true });
        rect.on('pointerdown', () => this.tryFlood(r, c));
        this.cells.set(key, { rect });
      }
    }

    // Seed: center (2,2)
    this.flood(2, 2);
  }

  private flood(r: number, c: number): void {
    const key = `${r},${c}`;
    this.lit.add(key);
    const cell = this.cells.get(key);
    if (cell) {
      this.tweens.add({ targets: cell.rect, fillColor: 0xfbbf24, duration: 200 });
      cell.rect.setStrokeStyle(3, 0x06b6d4, 1);
    }
    this.highlightFrontier();
  }

  private highlightFrontier(): void {
    this.cells.forEach((cell, key) => {
      if (this.lit.has(key)) return;
      const [r, c] = key.split(',').map(Number);
      const adjacent = this.isAdjacent(r, c);
      cell.rect.setFillStyle(adjacent ? 0x0e6b8f : 0x1a3a5c, 0.9);
    });
  }

  private isAdjacent(r: number, c: number): boolean {
    return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(
      ([nr, nc]) => nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS && this.lit.has(`${nr},${nc}`)
    );
  }

  private tryFlood(r: number, c: number): void {
    const key = `${r},${c}`;
    if (this.lit.has(key)) return;

    if (!this.isAdjacent(r, c)) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      const cell = this.cells.get(key);
      if (cell) JuiceSystem.wrongBurst(this, cell.rect.x, cell.rect.y);
      this.showMessage('BFS spreads layer by layer — that cell is not adjacent yet!', COLORS.WARNING);
      return;
    }

    audioManager.playCorrectTone();
    const cell = this.cells.get(key)!;
    JuiceSystem.correctBurst(this, cell.rect.x, cell.rect.y);
    this.flood(r, c);

    if (this.lit.size === this.COLS * this.ROWS) {
      this.time.delayedCall(400, () => {
        const stars = this.mistakes === 0 ? 3 : this.mistakes <= 3 ? 2 : 1;
        this.onPuzzleComplete(stars);
      });
    }
  }

  protected displayHint(n: number): void {
    const msgs = [
      'BFS floods layer by layer — first the source, then its neighbors, then their neighbors.',
      'A cell is valid to flood only if it is directly adjacent (up/down/left/right) to a gold cell.',
      'Think of it as ripples in water — each wave reaches exactly one step further.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P5_3 — Priority Dock: Max-Priority Queue
// Rule: always serve the boat with the highest urgency number.
// ============================================================================

export class P5_3_PriorityHarbor extends BasePuzzleScene {
  private slots: { urgency: number; rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private served = 0;
  private mistakes = 0;
  private readonly totalToServe = 12;
  private readonly numSlots = 5;
  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_QC_3 });
    this.puzzleId = 'qc_3';
    this.puzzleName = 'Priority Dock';
    this.puzzleDescription = 'The most urgent boat must leave first — always.';
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_PRIORITY_DOCK_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.025; }
  protected getConceptName() { return 'Priority Queue'; }

  create(): void {
    super.create();
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, 152, 'Serve the boat with the HIGHEST urgency number first!', {
      fontSize: '11px', fontFamily: FONTS.MONO, color: '#e0f8d0',
      backgroundColor: '#081820', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(20);

    this.scoreText = this.add.text(width / 2, 380, `Served: 0 / ${this.totalToServe}`, {
      fontSize: '13px', fontFamily: FONTS.RETRO, color: '#fbbf24',
    }).setOrigin(0.5).setDepth(20);

    const slotW = 96;
    const gap = 8;
    const startX = width / 2 - ((this.numSlots * slotW + (this.numSlots - 1) * gap) / 2) + slotW / 2;
    const y = height / 2 + 16;

    for (let i = 0; i < this.numSlots; i++) {
      const x = startX + i * (slotW + gap);
      const urgency = Phaser.Math.Between(1, 9);
      const rect = this.add.rectangle(x, y, slotW, 80, 0x1a3a5c, 0.9)
        .setStrokeStyle(3, 0x346856, 0.9)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, `${urgency}`, {
        fontSize: '28px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5);
      this.add.text(x, y + 36, 'URGENCY', {
        fontSize: '7px', fontFamily: FONTS.MONO, color: '#88c070',
      }).setOrigin(0.5);

      const slot = { urgency, rect, label };
      this.slots.push(slot);
      rect.on('pointerdown', () => this.tryServe(slot));
    }

    this.refreshHighlight();
  }

  private maxUrgency(): number {
    return Math.max(...this.slots.map(s => s.urgency));
  }

  private refreshHighlight(): void {
    const max = this.maxUrgency();
    this.slots.forEach(s => {
      const isMax = s.urgency === max;
      s.rect.setStrokeStyle(3, isMax ? 0x06b6d4 : 0x346856, isMax ? 1 : 0.8);
      s.rect.setFillStyle(isMax ? 0x0e4a6a : 0x1a3a5c, 0.9);
    });
  }

  private tryServe(slot: typeof this.slots[0]): void {
    if (slot.urgency !== this.maxUrgency()) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, slot.rect.x, slot.rect.y);
      this.showMessage(`Urgency ${slot.urgency} is not the highest — find the max!`, COLORS.WARNING);
      return;
    }

    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, slot.rect.x, slot.rect.y);
    this.served++;
    this.scoreText.setText(`Served: ${this.served} / ${this.totalToServe}`);

    const newUrgency = Phaser.Math.Between(1, 9);
    slot.urgency = newUrgency;
    slot.label.setText(`${newUrgency}`);

    // Pulse animation
    this.tweens.add({ targets: slot.rect, scaleX: 1.12, scaleY: 1.12, duration: 100, yoyo: true });

    this.refreshHighlight();

    if (this.served >= this.totalToServe) {
      this.time.delayedCall(400, () => {
        const stars = this.mistakes === 0 ? 3 : this.mistakes <= 3 ? 2 : 1;
        this.onPuzzleComplete(stars);
      });
    }
  }

  protected displayHint(n: number): void {
    const msgs = [
      'A priority queue always serves the item with the highest (or lowest) priority next.',
      'Scan all boats. The one with the biggest number leaves first.',
      'In a max-heap, the root is always the largest. Serve the root first.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P5_4 — Scheduler Office: Round-Robin Scheduling
// Rule: give each process a time slice in strict rotation; skip finished ones.
// ============================================================================

export class P5_4_SchedulerOffice extends BasePuzzleScene {
  private processes: { id: number; remaining: number; rect: Phaser.GameObjects.Rectangle; timeBar: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; timeLabel: Phaser.GameObjects.Text }[] = [];
  private currentIndex = 0;
  private mistakes = 0;
  private arrow!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_QC_4 });
    this.puzzleId = 'qc_4';
    this.puzzleName = 'Scheduler Office';
    this.puzzleDescription = 'Give each process a turn — in order, skipping finished ones.';
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_SCHEDULER_LOTTERY_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.025; }
  protected getConceptName() { return 'Round-Robin Scheduling'; }

  create(): void {
    super.create();
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, 152, 'Click the process the arrow points to — give it one time slice.', {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#e0f8d0',
      backgroundColor: '#081820', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(20);

    const procW = 112;
    const gap = 12;
    const numProcs = 4;
    const startX = width / 2 - ((numProcs * procW + (numProcs - 1) * gap) / 2) + procW / 2;
    const y = height / 2 + 32;

    for (let i = 0; i < numProcs; i++) {
      const x = startX + i * (procW + gap);
      const remaining = Phaser.Math.Between(3, 5);

      const rect = this.add.rectangle(x, y, procW, 96, 0x1a3a5c, 0.9)
        .setStrokeStyle(3, 0x346856, 0.9)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(x, y - 24, `P${i + 1}`, {
        fontSize: '18px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5);

      const timeLabel = this.add.text(x, y + 4, `${remaining}`, {
        fontSize: '24px', fontFamily: FONTS.RETRO, color: '#fbbf24',
      }).setOrigin(0.5);

      // Time bar background
      this.add.rectangle(x, y + 36, procW - 16, 12, 0x081820, 0.8);
      const timeBar = this.add.rectangle(x - (procW - 16) / 2, y + 36, (procW - 16) * (remaining / 5), 12, 0x06b6d4, 0.9)
        .setOrigin(0, 0.5);

      const proc = { id: i, remaining, rect, timeBar, label, timeLabel };
      this.processes.push(proc);
      rect.on('pointerdown', () => this.trySchedule(proc));
    }

    this.arrow = this.add.text(0, y - 72, '▼', {
      fontSize: '20px', fontFamily: FONTS.RETRO, color: '#06b6d4',
    }).setOrigin(0.5).setDepth(20);

    this.updateArrow();
  }

  private updateArrow(): void {
    // Find next non-finished process in round-robin order
    let checked = 0;
    while (checked < this.processes.length) {
      const proc = this.processes[this.currentIndex % this.processes.length];
      if (proc.remaining > 0) {
        const px = proc.rect.x;
        this.tweens.add({ targets: this.arrow, x: px, duration: 200, ease: 'Power2' });
        return;
      }
      this.currentIndex++;
      checked++;
    }
    // All done
    this.time.delayedCall(400, () => {
      const stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
      this.onPuzzleComplete(stars);
    });
  }

  private currentProc(): typeof this.processes[0] {
    return this.processes[this.currentIndex % this.processes.length];
  }

  private trySchedule(proc: typeof this.processes[0]): void {
    if (proc.remaining === 0) {
      this.showMessage('That process is already done — skip it!', COLORS.WARNING);
      return;
    }

    if (proc !== this.currentProc()) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, proc.rect.x, proc.rect.y);
      this.showMessage('Round-robin: give time slices in rotation, not out of order!', COLORS.WARNING);
      return;
    }

    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, proc.rect.x, proc.rect.y);
    proc.remaining--;
    proc.timeLabel.setText(`${proc.remaining}`);
    const barW = Math.max(0, (proc.rect.width - 16) * (proc.remaining / 5));
    this.tweens.add({ targets: proc.timeBar, width: barW, duration: 180 });

    if (proc.remaining === 0) {
      proc.rect.setFillStyle(0x0a1a0a, 0.9);
      proc.rect.setStrokeStyle(2, 0x346856, 0.5);
      proc.label.setColor('#346856');
      proc.timeLabel.setText('✓').setColor('#88c070');
    }

    this.currentIndex++;
    this.updateArrow();
  }

  protected displayHint(n: number): void {
    const msgs = [
      'Round-robin gives each active process one time slice, then moves to the next.',
      'Follow the arrow — it points to the process whose turn it is.',
      'Skip processes that are already done (✓). The arrow does this for you.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// Boss_Reconciler — Combined: 3-phase test of all Queue Canals concepts
// ============================================================================

export class Boss_Reconciler extends BasePuzzleScene {
  private phaseLabel!: Phaser.GameObjects.Text;
  private phaseContainer!: Phaser.GameObjects.Container;
  private totalMistakes = 0;

  // Phase 1 (FIFO) state
  private fifoQueue: { color: number; id: number; rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private fifoServed = 0;
  private fifoNextId = 0;
  private fifoSpawnTimer?: Phaser.Time.TimerEvent;

  // Phase 2 (Priority) state
  private prioritySlots: { urgency: number; rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private priorityServed = 0;

  // Phase 3 (Round-robin) state
  private rrProcs: { remaining: number; rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private rrIndex = 0;
  private rrArrow!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_RECONCILER });
    this.puzzleId = 'boss_reconciler';
    this.puzzleName = 'The Reconciler';
    this.puzzleDescription = 'Three queues. Three rules. One boss.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_RECONCILER_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.035; }
  protected getConceptName() { return 'Queue Mastery'; }
  protected shouldSkipConceptBridge() { return true; }

  create(): void {
    super.create();
    const { width } = this.cameras.main;

    this.phaseLabel = this.add.text(width / 2, 152, '', {
      fontSize: '13px', fontFamily: FONTS.RETRO, color: '#06b6d4',
    }).setOrigin(0.5).setDepth(20);

    this.phaseContainer = this.add.container(0, 0);
    this.startPhase1();
  }

  private startPhase1(): void {
    this.phaseLabel.setText('PHASE 1 — FIFO Queue: click the LEFT-MOST boat');
    this.phaseContainer.removeAll(true);

    const { width, height } = this.cameras.main;
    const y = height / 2 + 8;

    for (let i = 0; i < 3; i++) {
      const id = this.fifoNextId++;
      const color = boatColor(id);
      const x = width / 2 - 160 + i * 96;
      const rect = this.add.rectangle(x, y, 80, 56, color, 0.92)
        .setStrokeStyle(3, 0xe0f8d0, 0.9).setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, `#${id + 1}`, {
        fontSize: '14px', fontFamily: FONTS.RETRO, color: '#081820',
      }).setOrigin(0.5);
      const entry = { color, id, rect, label };
      this.fifoQueue.push(entry);
      rect.on('pointerdown', () => this.p1Serve(entry));
    }

    this.fifoSpawnTimer = this.time.addEvent({
      delay: 3500, repeat: -1, callback: () => {
        if (this.fifoQueue.length >= 4) return;
        const id = this.fifoNextId++;
        const color = boatColor(id);
        const x = width / 2 + 144;
        const rect = this.add.rectangle(x, y, 80, 56, color, 0.92)
          .setStrokeStyle(3, 0xe0f8d0, 0.9).setInteractive({ useHandCursor: true });
        const label = this.add.text(x, y, `#${id + 1}`, {
          fontSize: '14px', fontFamily: FONTS.RETRO, color: '#081820',
        }).setOrigin(0.5);
        const entry = { color, id, rect, label };
        this.fifoQueue.push(entry);
        rect.on('pointerdown', () => this.p1Serve(entry));
        // Slide to correct slot
        const tx = width / 2 - 160 + (this.fifoQueue.length - 1) * 96;
        this.tweens.add({ targets: [rect, label], x: tx, duration: 280, ease: 'Power2' });
      },
    });
  }

  private p1Serve(entry: typeof this.fifoQueue[0]): void {
    if (this.fifoQueue[0] !== entry) {
      this.totalMistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, entry.rect.x, entry.rect.y);
      this.showMessage('FIFO — serve the front first!', COLORS.WARNING);
      return;
    }
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, entry.rect.x, entry.rect.y);
    this.tweens.add({
      targets: [entry.rect, entry.label], x: -80, alpha: 0, duration: 250,
      onComplete: () => { entry.rect.destroy(); entry.label.destroy(); },
    });
    this.fifoQueue.shift();
    this.fifoServed++;
    const { width } = this.cameras.main;
    this.fifoQueue.forEach((b, i) => {
      const tx = width / 2 - 160 + i * 96;
      this.tweens.add({ targets: [b.rect, b.label], x: tx, duration: 220 });
    });
    if (this.fifoServed >= 6) {
      this.fifoSpawnTimer?.destroy();
      // Clean up remaining boats
      this.fifoQueue.forEach(b => { b.rect.destroy(); b.label.destroy(); });
      this.fifoQueue = [];
      this.time.delayedCall(500, () => this.startPhase2());
    }
  }

  private startPhase2(): void {
    this.phaseLabel.setText('PHASE 2 — Priority Queue: click the HIGHEST urgency');
    const { width, height } = this.cameras.main;
    const y = height / 2 + 8;

    for (let i = 0; i < 4; i++) {
      const x = width / 2 - 168 + i * 112;
      const urgency = Phaser.Math.Between(1, 9);
      const rect = this.add.rectangle(x, y, 96, 72, 0x1a3a5c, 0.9)
        .setStrokeStyle(3, 0x346856).setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, `${urgency}`, {
        fontSize: '24px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5);
      const slot = { urgency, rect, label };
      this.prioritySlots.push(slot);
      rect.on('pointerdown', () => this.p2Serve(slot));
    }
    this.p2RefreshHighlight();
  }

  private p2MaxUrgency(): number { return Math.max(...this.prioritySlots.map(s => s.urgency)); }

  private p2RefreshHighlight(): void {
    const max = this.p2MaxUrgency();
    this.prioritySlots.forEach(s => {
      s.rect.setStrokeStyle(3, s.urgency === max ? 0x06b6d4 : 0x346856);
      s.rect.setFillStyle(s.urgency === max ? 0x0e4a6a : 0x1a3a5c, 0.9);
    });
  }

  private p2Serve(slot: typeof this.prioritySlots[0]): void {
    if (slot.urgency !== this.p2MaxUrgency()) {
      this.totalMistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, slot.rect.x, slot.rect.y);
      this.showMessage('Priority — serve the highest urgency first!', COLORS.WARNING);
      return;
    }
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, slot.rect.x, slot.rect.y);
    slot.urgency = Phaser.Math.Between(1, 9);
    slot.label.setText(`${slot.urgency}`);
    this.tweens.add({ targets: slot.rect, scaleX: 1.1, scaleY: 1.1, duration: 80, yoyo: true });
    this.p2RefreshHighlight();
    this.priorityServed++;
    if (this.priorityServed >= 8) {
      this.prioritySlots.forEach(s => { s.rect.destroy(); s.label.destroy(); });
      this.prioritySlots = [];
      this.time.delayedCall(500, () => this.startPhase3());
    }
  }

  private startPhase3(): void {
    this.phaseLabel.setText('PHASE 3 — Round-Robin: follow the arrow');
    const { width, height } = this.cameras.main;
    const y = height / 2 + 24;

    for (let i = 0; i < 3; i++) {
      const x = width / 2 - 128 + i * 128;
      const remaining = Phaser.Math.Between(2, 4);
      const rect = this.add.rectangle(x, y, 104, 72, 0x1a3a5c, 0.9)
        .setStrokeStyle(3, 0x346856).setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, `${remaining}`, {
        fontSize: '22px', fontFamily: FONTS.RETRO, color: '#fbbf24',
      }).setOrigin(0.5);
      const proc = { remaining, rect, label };
      this.rrProcs.push(proc);
      rect.on('pointerdown', () => this.p3Schedule(proc));
    }

    this.rrArrow = this.add.text(0, y - 56, '▼', {
      fontSize: '18px', fontFamily: FONTS.RETRO, color: '#06b6d4',
    }).setOrigin(0.5).setDepth(20);
    this.p3UpdateArrow();
  }

  private p3CurrentProc(): typeof this.rrProcs[0] {
    return this.rrProcs[this.rrIndex % this.rrProcs.length];
  }

  private p3UpdateArrow(): void {
    let checked = 0;
    while (checked < this.rrProcs.length) {
      if (this.p3CurrentProc().remaining > 0) {
        this.tweens.add({ targets: this.rrArrow, x: this.p3CurrentProc().rect.x, duration: 180 });
        return;
      }
      this.rrIndex++;
      checked++;
    }
    this.time.delayedCall(400, () => {
      const stars = this.totalMistakes === 0 ? 3 : this.totalMistakes <= 4 ? 2 : 1;
      this.onPuzzleComplete(stars);
    });
  }

  private p3Schedule(proc: typeof this.rrProcs[0]): void {
    if (proc.remaining === 0) return;
    if (proc !== this.p3CurrentProc()) {
      this.totalMistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, proc.rect.x, proc.rect.y);
      this.showMessage('Follow the arrow — round-robin rotation!', COLORS.WARNING);
      return;
    }
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, proc.rect.x, proc.rect.y);
    proc.remaining--;
    proc.label.setText(proc.remaining === 0 ? '✓' : `${proc.remaining}`);
    if (proc.remaining === 0) { proc.label.setColor('#88c070'); proc.rect.setFillStyle(0x0a1a0a); }
    this.rrIndex++;
    this.p3UpdateArrow();
  }

  protected displayHint(n: number): void {
    const msgs = [
      'Phase 1: FIFO — leftmost boat always leaves first.',
      'Phase 2: Priority — highest number always goes first.',
      'Phase 3: Round-robin — follow the arrow, one slice at a time.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}
