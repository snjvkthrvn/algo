/**
 * Stack Spires — interactive puzzles for LIFO, Palindrome/Stack, DFS Backtracking, Call Stack.
 * Each puzzle physically embodies the concept. No multiple-choice questions.
 * Extends BasePuzzleScene directly.
 */

import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { JuiceSystem } from '../../systems/JuiceSystem';
import { audioManager } from '../../core/AudioManager';

const SCROLL_COLORS = [0x06b6d4, 0xf97316, 0x88c070, 0xfbbf24, 0x8b5cf6, 0xef4444];

// ============================================================================
// P4_1 — Scroll Stack: LIFO — only the TOP scroll can be removed.
// ============================================================================

export class P4_1_ScrollStack extends BasePuzzleScene {
  private stack: { letter: string; color: number; rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private popCount = 0;
  private mistakes = 0;
  private nextLetter = 0;
  private pushTimer!: Phaser.Time.TimerEvent;
  private scoreText!: Phaser.GameObjects.Text;
  private readonly TOTAL_POPS = 10;
  private readonly stackCX = 320;
  private readonly stackBaseY = 360;
  private readonly scrollH = 48;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_SS_1 });
    this.puzzleId = 'ss_1';
    this.puzzleName = 'Scroll Stack';
    this.puzzleDescription = 'Only the top scroll can leave the stack first.';
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_STACK_SCROLL_STACK_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.025; }
  protected getConceptName() { return 'Stack — LIFO'; }

  create(): void {
    super.create();
    const { width } = this.cameras.main;

    this.add.text(width / 2, 152, 'Click the TOP scroll to pop it off the stack!', {
      fontSize: '11px', fontFamily: FONTS.MONO, color: '#e0f8d0',
      backgroundColor: '#081820', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(20);

    this.scoreText = this.add.text(width / 2, 384, `Popped: 0 / ${this.TOTAL_POPS}`, {
      fontSize: '12px', fontFamily: FONTS.RETRO, color: '#fbbf24',
    }).setOrigin(0.5).setDepth(20);

    this.add.rectangle(this.stackCX, this.stackBaseY + 8, 296, 8, 0x346856, 1);

    for (let i = 0; i < 3; i++) this.pushScroll();

    this.pushTimer = this.time.addEvent({
      delay: 5000, repeat: -1,
      callback: () => { if (this.stack.length < 6) this.pushScroll(); },
    });
  }

  private topY(): number {
    return this.stackBaseY - this.stack.length * (this.scrollH + 4);
  }

  private pushScroll(): void {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter = letters[this.nextLetter++ % letters.length];
    const color = SCROLL_COLORS[this.stack.length % SCROLL_COLORS.length];
    const targetY = this.topY() - (this.scrollH + 4);

    const rect = this.add.rectangle(this.stackCX, this.stackBaseY - 80, 280, this.scrollH, color, 0.92)
      .setStrokeStyle(2, 0xe0f8d0, 0.7)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(this.stackCX, this.stackBaseY - 80, letter, {
      fontSize: '20px', fontFamily: FONTS.RETRO, color: '#081820',
    }).setOrigin(0.5);

    const entry = { letter, color, rect, label };
    this.stack.push(entry);
    rect.on('pointerdown', () => this.tryPop(entry));

    this.tweens.add({ targets: [rect, label], y: targetY, duration: 300, ease: 'Power2.easeOut' });
    this.refreshTopIndicator();
  }

  private refreshTopIndicator(): void {
    this.stack.forEach((s, i) => {
      const isTop = i === this.stack.length - 1;
      s.rect.setStrokeStyle(isTop ? 3 : 2, isTop ? 0x06b6d4 : 0xe0f8d0, isTop ? 1 : 0.5);
    });
  }

  private tryPop(entry: typeof this.stack[0]): void {
    if (this.stack[this.stack.length - 1] !== entry) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, entry.rect.x, entry.rect.y);
      this.showMessage('Only the TOP scroll can be removed! (LIFO)', COLORS.WARNING);
      return;
    }

    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, entry.rect.x, entry.rect.y);
    this.stack.pop();
    this.tweens.add({
      targets: [entry.rect, entry.label], x: entry.rect.x + 200, alpha: 0, duration: 280, ease: 'Power2.easeIn',
      onComplete: () => { entry.rect.destroy(); entry.label.destroy(); },
    });
    this.popCount++;
    this.scoreText.setText(`Popped: ${this.popCount} / ${this.TOTAL_POPS}`);
    this.refreshTopIndicator();

    if (this.popCount >= this.TOTAL_POPS) {
      this.pushTimer.destroy();
      this.time.delayedCall(400, () => {
        const stars = this.mistakes === 0 ? 3 : this.mistakes <= 3 ? 2 : 1;
        this.onPuzzleComplete(stars);
      });
    }
  }

  protected displayHint(n: number): void {
    const msgs = [
      'LIFO = Last In, First Out. The most recently pushed scroll leaves first.',
      'The TOP scroll has a cyan border. Only that one can be popped.',
      'New scrolls push onto the top, burying older ones underneath.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P4_2 — Mirror Staircase: Palindrome check via stack push/pop comparison.
// ============================================================================

export class P4_2_MirrorStaircase extends BasePuzzleScene {
  private readonly WORDS = ['RACECAR', 'DEIFIED', 'LEVEL', 'ROTATOR', 'KAYAK'];
  private wordIndex = 0;
  private currentWord = '';
  private pushPhase = true;
  private pushCursor = 0;
  private popCursor = 0;
  private stackLetters: string[] = [];
  private mistakes = 0;
  private tiles: Phaser.GameObjects.Container[] = [];
  private stackDisplay: { rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private phaseText!: Phaser.GameObjects.Text;
  private readonly stackCX = 520;
  private readonly stackBaseY = 320;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_SS_2 });
    this.puzzleId = 'ss_2';
    this.puzzleName = 'Mirror Staircase';
    this.puzzleDescription = 'Push the first half, pop to verify the mirror.';
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_STACK_MIRROR_STAIRCASE_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.025; }
  protected getConceptName() { return 'Stack — Palindrome'; }

  create(): void {
    super.create();
    const { width } = this.cameras.main;

    this.phaseText = this.add.text(width / 2 - 60, 152, '', {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#06b6d4',
      backgroundColor: '#081820', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(20);

    this.add.text(this.stackCX, 152, 'STACK', {
      fontSize: '10px', fontFamily: FONTS.RETRO, color: '#88c070',
    }).setOrigin(0.5).setDepth(20);

    this.add.rectangle(this.stackCX, this.stackBaseY + 6, 96, 6, 0x346856, 1);
    this.loadWord();
  }

  private loadWord(): void {
    this.tiles.forEach(t => t.destroy());
    this.tiles = [];
    this.stackDisplay.forEach(s => { s.rect.destroy(); s.label.destroy(); });
    this.stackDisplay = [];
    this.stackLetters = [];
    this.pushPhase = true;
    this.pushCursor = 0;

    this.currentWord = this.WORDS[this.wordIndex % this.WORDS.length];
    this.popCursor = this.currentWord.length - 1;

    const { width, height } = this.cameras.main;
    const tileW = 52;
    const startX = width / 2 - (this.currentWord.length * tileW) / 2 + tileW / 2 - 56;
    const y = height / 2 + 32;
    const half = Math.floor(this.currentWord.length / 2);

    for (let i = 0; i < this.currentWord.length; i++) {
      const x = startX + i * tileW;
      const container = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, tileW - 4, 56, 0x1a3a5c, 0.9)
        .setStrokeStyle(2, 0x346856, 0.8).setInteractive({ useHandCursor: true });
      const lbl = this.add.text(0, 0, this.currentWord[i], {
        fontSize: '20px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5);
      container.add([bg, lbl]);
      const idx = i;
      bg.on('pointerdown', () => this.onTileClick(idx));
      this.tiles.push(container);
    }

    this.phaseText.setText(`PUSH first ${half} letters (left to right)`);
    this.showMessage(`Word: ${this.currentWord}`, COLORS.CYAN_GLOW);
  }

  private onTileClick(idx: number): void {
    const half = Math.floor(this.currentWord.length / 2);

    if (this.pushPhase) {
      if (idx !== this.pushCursor) {
        this.mistakes++;
        audioManager.playWrongTone();
        JuiceSystem.wrongBurst(this, (this.tiles[idx] as Phaser.GameObjects.Container).x, (this.tiles[idx] as Phaser.GameObjects.Container).y);
        this.showMessage('Click the next letter from the LEFT!', COLORS.WARNING);
        return;
      }
      const letter = this.currentWord[idx];
      this.stackLetters.push(letter);
      const sy = this.stackBaseY - this.stackDisplay.length * 44;
      const r = this.add.rectangle(this.stackCX, sy, 80, 40, 0x06b6d4, 0.8).setStrokeStyle(1, 0xe0f8d0);
      const l = this.add.text(this.stackCX, sy, letter, { fontSize: '16px', fontFamily: FONTS.RETRO, color: '#081820' }).setOrigin(0.5);
      this.tweens.add({ targets: [r, l], y: sy - 40, duration: 200, ease: 'Power2.easeOut' });
      this.stackDisplay.push({ rect: r, label: l });
      (this.tiles[idx].list[0] as Phaser.GameObjects.Rectangle).setFillStyle(0x2a4a2a, 0.9);
      this.pushCursor++;
      audioManager.playTone(440 + this.pushCursor * 40, 60, 'square');

      if (this.pushCursor >= half) {
        this.pushPhase = false;
        if (this.currentWord.length % 2 === 1)
          (this.tiles[half].list[0] as Phaser.GameObjects.Rectangle).setFillStyle(0x346856, 0.9);
        this.phaseText.setText(`POP + COMPARE second half (right to left)`);
        this.showMessage('Now click from the RIGHT to pop and compare!', COLORS.GOLD_ACCENT);
      }
    } else {
      if (idx !== this.popCursor) {
        this.mistakes++;
        audioManager.playWrongTone();
        JuiceSystem.wrongBurst(this, (this.tiles[idx] as Phaser.GameObjects.Container).x, (this.tiles[idx] as Phaser.GameObjects.Container).y);
        this.showMessage('Click the next letter from the RIGHT!', COLORS.WARNING);
        return;
      }
      const expected = this.stackLetters[this.stackLetters.length - 1];
      const actual = this.currentWord[idx];
      this.stackLetters.pop();
      const top = this.stackDisplay.pop()!;
      this.tweens.add({
        targets: [top.rect, top.label], alpha: 0, duration: 180,
        onComplete: () => { top.rect.destroy(); top.label.destroy(); },
      });
      if (actual !== expected) {
        this.mistakes++;
        audioManager.playWrongTone();
        JuiceSystem.wrongBurst(this, (this.tiles[idx] as Phaser.GameObjects.Container).x, (this.tiles[idx] as Phaser.GameObjects.Container).y);
        this.showMessage(`Mismatch: stack=${expected}, letter=${actual}`, COLORS.WARNING);
      } else {
        audioManager.playCorrectTone();
        JuiceSystem.correctBurst(this, (this.tiles[idx] as Phaser.GameObjects.Container).x, (this.tiles[idx] as Phaser.GameObjects.Container).y);
      }
      (this.tiles[idx].list[0] as Phaser.GameObjects.Rectangle).setFillStyle(0x2a4a2a, 0.9);
      this.popCursor--;

      if (this.stackLetters.length === 0) {
        this.time.delayedCall(500, () => {
          this.wordIndex++;
          if (this.wordIndex >= this.WORDS.length) {
            const stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
            this.onPuzzleComplete(stars);
          } else {
            this.loadWord();
          }
        });
      }
    }
  }

  protected displayHint(n: number): void {
    const msgs = [
      'Push the first half onto the stack, then pop each to compare with the second half.',
      'The stack reverses the first half — so popping gives you the mirror image.',
      'If a pop does not match, the word is not a palindrome.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P4_3 — Maze of Forks: DFS backtracking through a 7-node binary tree maze.
// ============================================================================

interface MazeNode {
  id: number; x: number; y: number;
  left: number | null; right: number | null; parent: number | null;
  type: 'node' | 'dead' | 'exit';
  circle?: Phaser.GameObjects.Arc; label?: Phaser.GameObjects.Text;
}

export class P4_3_MazeOfForks extends BasePuzzleScene {
  private nodes: MazeNode[] = [];
  private current = 0;
  private pathStack: number[] = [];
  private roundIndex = 0;
  private mistakes = 0;
  private gfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_SS_3 });
    this.puzzleId = 'ss_3';
    this.puzzleName = 'Maze of Forks';
    this.puzzleDescription = 'Explore, hit dead ends, and backtrack to find the exit.';
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_STACK_MAZE_OF_FORKS_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.025; }
  protected getConceptName() { return 'DFS — Backtracking'; }

  create(): void {
    super.create();
    const { width } = this.cameras.main;
    this.gfx = this.add.graphics();

    this.add.text(width / 2, 152, 'Explore with LEFT/RIGHT. Dead end? BACKTRACK!', {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#e0f8d0',
      backgroundColor: '#081820', padding: { x: 6, y: 4 },
    }).setOrigin(0.5).setDepth(20);

    this.mkBtn(width / 2 - 88, 396, 'GO LEFT', () => this.move('left'));
    this.mkBtn(width / 2 + 88, 396, 'GO RIGHT', () => this.move('right'));
    this.mkBtn(width / 2, 428, 'BACKTRACK', () => this.backtrack());

    this.loadRound();
  }

  private mkBtn(x: number, y: number, text: string, cb: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(20);
    const bg = this.add.rectangle(0, 0, 136, 28, 0x1a3a5c, 0.9)
      .setStrokeStyle(2, 0x06b6d4, 0.9).setInteractive({ useHandCursor: true });
    const lbl = this.add.text(0, 0, text, { fontSize: '9px', fontFamily: FONTS.RETRO, color: '#e0f8d0' }).setOrigin(0.5);
    bg.on('pointerdown', cb);
    c.add([bg, lbl]);
    return c;
  }

  private loadRound(): void {
    this.nodes.forEach(n => { n.circle?.destroy(); n.label?.destroy(); });
    this.nodes = [];
    this.gfx.clear();
    this.pathStack = [];
    this.current = 0;

    const { width, height } = this.cameras.main;
    const cx = width / 2, cy = height / 2 - 24;

    const pos = [
      { x: cx, y: cy - 96 }, { x: cx - 120, y: cy }, { x: cx + 120, y: cy },
      { x: cx - 176, y: cy + 96 }, { x: cx - 56, y: cy + 96 },
      { x: cx + 56, y: cy + 96 }, { x: cx + 176, y: cy + 96 },
    ];
    const leftOf = [1, 3, 5, -1, -1, -1, -1];
    const rightOf = [2, 4, 6, -1, -1, -1, -1];
    const parentOf = [-1, 0, 0, 1, 1, 2, 2];
    const exitId = 3 + Math.floor(Math.random() * 4);

    this.gfx.lineStyle(2, 0x346856, 0.8);
    for (let i = 1; i < 7; i++) {
      const p = parentOf[i];
      this.gfx.beginPath();
      this.gfx.moveTo(pos[p].x, pos[p].y);
      this.gfx.lineTo(pos[i].x, pos[i].y);
      this.gfx.strokePath();
    }

    for (let i = 0; i < 7; i++) {
      const type: MazeNode['type'] = i < 3 ? 'node' : (i === exitId ? 'exit' : 'dead');
      const n: MazeNode = {
        id: i, x: pos[i].x, y: pos[i].y,
        left: leftOf[i] !== -1 ? leftOf[i] : null,
        right: rightOf[i] !== -1 ? rightOf[i] : null,
        parent: parentOf[i] !== -1 ? parentOf[i] : null,
        type,
      };
      n.circle = this.add.circle(n.x, n.y, 26, 0x1a3a5c, 0.9)
        .setStrokeStyle(2, i === 0 ? 0x06b6d4 : 0x346856);
      n.label = this.add.text(n.x, n.y, i === 0 ? 'ROOT' : '?', {
        fontSize: '8px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5);
      this.nodes.push(n);
    }

    this.refreshVisuals();
  }

  private refreshVisuals(): void {
    for (const n of this.nodes) {
      if (!n.circle) continue;
      const isCurrent = n.id === this.current;
      const onPath = this.pathStack.includes(n.id);
      const parentRevealed = n.parent !== null
        && (this.pathStack.includes(n.parent) || n.parent === this.current);

      let fill = 0x1a3a5c, stroke = 0x346856, text = '?', textClr = '#e0f8d0';

      if (n.id === 0 || onPath || isCurrent || parentRevealed) {
        if (n.type === 'exit') { fill = 0x166534; stroke = 0x22c55e; text = 'EXIT'; textClr = '#22c55e'; }
        else if (n.type === 'dead') { fill = 0x3a1a1a; stroke = 0xef4444; text = 'DEAD'; textClr = '#ef4444'; }
        else { text = n.id === 0 ? 'ROOT' : 'NODE'; }
      }
      if (isCurrent) { fill = 0x0e4a6a; stroke = 0x06b6d4; }
      if (onPath && !isCurrent) stroke = 0x88c070;

      n.circle.setFillStyle(fill, 0.9).setStrokeStyle(2, stroke);
      n.label!.setText(text).setColor(textClr);
    }
  }

  private move(dir: 'left' | 'right'): void {
    const cur = this.nodes[this.current];
    const nextId = dir === 'left' ? cur.left : cur.right;
    if (nextId === null) { this.showMessage('No path that way!', COLORS.WARNING); return; }
    this.pathStack.push(this.current);
    this.current = nextId;
    const n = this.nodes[this.current];
    this.refreshVisuals();

    if (n.type === 'exit') {
      audioManager.playCorrectTone();
      JuiceSystem.correctBurst(this, n.x, n.y);
      this.showMessage('EXIT FOUND via DFS!', COLORS.GOLD_ACCENT);
      this.roundIndex++;
      this.time.delayedCall(800, () => {
        if (this.roundIndex >= 3) {
          const stars = this.mistakes <= 2 ? 3 : this.mistakes <= 5 ? 2 : 1;
          this.onPuzzleComplete(stars);
        } else {
          this.loadRound();
        }
      });
    } else if (n.type === 'dead') {
      this.mistakes++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, n.x, n.y);
      this.showMessage('Dead end! Use BACKTRACK to try another branch.', COLORS.WARNING);
    } else {
      audioManager.playTone(440, 80, 'square');
    }
  }

  private backtrack(): void {
    if (this.pathStack.length === 0) { this.showMessage('Already at root!', COLORS.WARNING); return; }
    this.current = this.pathStack.pop()!;
    audioManager.playTone(330, 80, 'square');
    this.showMessage('Backtracked.', COLORS.TEXT_MUTED);
    this.refreshVisuals();
  }

  protected displayHint(n: number): void {
    const msgs = [
      'DFS explores one path fully before backtracking to try another branch.',
      'Use BACKTRACK to return to the last junction and try the other direction.',
      'The call stack remembers your path so you can retrace your steps.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P4_4 — Tower of Memory: Follow CALL/RETURN sequence to manage call stack.
// ============================================================================

export class P4_4_TowerOfMemory extends BasePuzzleScene {
  private frames: { rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private seqIndex = 0;
  private stepIndex = 0;
  private mistakes = 0;
  private promptText!: Phaser.GameObjects.Text;
  private depthText!: Phaser.GameObjects.Text;
  private callBtn!: Phaser.GameObjects.Container;
  private returnBtn!: Phaser.GameObjects.Container;
  private readonly stackCX = 192;
  private readonly stackBaseY = 360;
  private readonly frameH = 40;

  private readonly SEQUENCES: ('call' | 'return')[][] = [
    ['call', 'call', 'call', 'return', 'return', 'return'],
    ['call', 'call', 'call', 'call', 'return', 'return', 'return', 'return'],
    ['call', 'call', 'return', 'call', 'call', 'return', 'return', 'return'],
  ];

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_SS_4 });
    this.puzzleId = 'ss_4';
    this.puzzleName = 'Tower of Memory';
    this.puzzleDescription = 'Push frames on CALL, pop them on RETURN.';
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_STACK_TOWER_OF_MEMORY_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.025; }
  protected getConceptName() { return 'Call Stack — Recursion'; }

  create(): void {
    super.create();
    const { width, height } = this.cameras.main;

    this.add.text(this.stackCX, 152, 'CALL STACK', {
      fontSize: '10px', fontFamily: FONTS.RETRO, color: '#88c070',
    }).setOrigin(0.5).setDepth(20);
    this.add.rectangle(this.stackCX, this.stackBaseY + 6, 200, 6, 0x346856, 1);

    this.depthText = this.add.text(this.stackCX, 384, 'Depth: 0', {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#e0f8d0',
    }).setOrigin(0.5).setDepth(20);

    this.promptText = this.add.text(width / 2 + 64, height / 2 - 24, '', {
      fontSize: '12px', fontFamily: FONTS.RETRO, color: '#fbbf24',
      align: 'center', wordWrap: { width: 240 },
    }).setOrigin(0.5).setDepth(20);

    this.callBtn = this.mkBtn(width / 2 + 64, height / 2 + 56, 'CALL', () => this.doStep('call'));
    this.returnBtn = this.mkBtn(width / 2 + 64, height / 2 + 96, 'RETURN', () => this.doStep('return'));

    this.renderStep();
  }

  private mkBtn(x: number, y: number, text: string, cb: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(20);
    const bg = this.add.rectangle(0, 0, 144, 36, 0x1a3a5c, 0.9)
      .setStrokeStyle(2, 0x06b6d4).setInteractive({ useHandCursor: true });
    const lbl = this.add.text(0, 0, text, { fontSize: '12px', fontFamily: FONTS.RETRO, color: '#e0f8d0' }).setOrigin(0.5);
    bg.on('pointerdown', cb);
    c.add([bg, lbl]);
    return c;
  }

  private renderStep(): void {
    const seq = this.SEQUENCES[this.seqIndex];
    if (!seq) return;
    const step = seq[this.stepIndex];
    const depth = seq.slice(0, this.stepIndex).reduce((d, s) => d + (s === 'call' ? 1 : -1), 0);
    this.promptText.setText(step === 'call'
      ? `f(${depth}) calls f(${depth + 1})\nPress CALL`
      : `f(${depth}) is done\nPress RETURN`
    );
    (this.callBtn.list[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(2, step === 'call' ? 0x22c55e : 0x346856);
    (this.returnBtn.list[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(2, step === 'return' ? 0x22c55e : 0x346856);
  }

  private doStep(action: 'call' | 'return'): void {
    const seq = this.SEQUENCES[this.seqIndex];
    const expected = seq[this.stepIndex];

    if (action !== expected) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, action === 'call' ? this.callBtn.x : this.returnBtn.x, action === 'call' ? this.callBtn.y : this.returnBtn.y);
      this.showMessage(`Wrong action! Expected ${expected.toUpperCase()}.`, COLORS.WARNING);
      return;
    }

    if (action === 'call') {
      const depth = this.frames.length + 1;
      const frameY = this.stackBaseY - depth * (this.frameH + 4);
      const rect = this.add.rectangle(this.stackCX, this.stackBaseY - 80, 192, this.frameH, 0x06b6d4, 0.75)
        .setStrokeStyle(2, 0xe0f8d0, 0.7);
      const lbl = this.add.text(this.stackCX, this.stackBaseY - 80, `f(${depth})`, {
        fontSize: '12px', fontFamily: FONTS.RETRO, color: '#081820',
      }).setOrigin(0.5);
      this.tweens.add({ targets: [rect, lbl], y: frameY, duration: 200, ease: 'Power2.easeOut' });
      this.frames.push({ rect, label: lbl });
      audioManager.playTone(440 + depth * 40, 80, 'square');
    } else {
      const top = this.frames.pop();
      if (top) {
        JuiceSystem.correctBurst(this, top.rect.x, top.rect.y);
        this.tweens.add({
          targets: [top.rect, top.label], x: this.stackCX + 120, alpha: 0, duration: 220,
          onComplete: () => { top.rect.destroy(); top.label.destroy(); },
        });
        audioManager.playTone(440 - this.frames.length * 40, 80, 'square');
      }
    }

    this.depthText.setText(`Depth: ${this.frames.length}`);
    this.stepIndex++;

    if (this.stepIndex >= seq.length) {
      this.seqIndex++;
      this.stepIndex = 0;
      if (this.seqIndex >= this.SEQUENCES.length) {
        this.time.delayedCall(500, () => {
          const stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
          this.onPuzzleComplete(stars);
        });
        return;
      }
      this.showMessage('Sequence done! Next recursion...', COLORS.SUCCESS);
    }
    this.renderStep();
  }

  protected displayHint(n: number): void {
    const msgs = [
      'Each CALL pushes a new stack frame. Each RETURN pops the top one.',
      'Follow the prompt — it tells you what the function is doing.',
      'The base case triggers the chain of RETURNs that unwinds the stack.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// Boss_Recursion — 3-phase: LIFO pop, palindrome, DFS maze.
// ============================================================================

export class Boss_Recursion extends BasePuzzleScene {
  private phaseLabel!: Phaser.GameObjects.Text;
  private totalMistakes = 0;

  // Phase 1 state
  private p1Stack: { rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private p1Pops = 0;
  private readonly P1_TARGET = 5;

  // Phase 2 state
  private p2Word = 'LEVEL';
  private p2PushPhase = true;
  private p2PushCursor = 0;
  private p2PopCursor = 0;
  private p2StackLetters: string[] = [];
  private p2Tiles: Phaser.GameObjects.Container[] = [];
  private p2StackDisplay: { rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];

  // Phase 3 state
  private p3Nodes: MazeNode[] = [];
  private p3Current = 0;
  private p3Path: number[] = [];
  private p3Gfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_RECURSION });
    this.puzzleId = 'boss_recursion';
    this.puzzleName = 'The Recursion';
    this.puzzleDescription = 'Stack. Palindrome. Backtracking. All three.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_STACK_RECURSION_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.035; }
  protected getConceptName() { return 'Stack Mastery'; }
  protected shouldSkipConceptBridge() { return true; }

  create(): void {
    super.create();
    const { width } = this.cameras.main;
    this.phaseLabel = this.add.text(width / 2, 152, '', {
      fontSize: '11px', fontFamily: FONTS.RETRO, color: '#06b6d4',
    }).setOrigin(0.5).setDepth(20);
    this.beginPhase1();
  }

  private mkBtn(x: number, y: number, text: string, cb: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(20);
    const bg = this.add.rectangle(0, 0, 120, 28, 0x1a3a5c, 0.9)
      .setStrokeStyle(2, 0x06b6d4).setInteractive({ useHandCursor: true });
    const lbl = this.add.text(0, 0, text, { fontSize: '9px', fontFamily: FONTS.RETRO, color: '#e0f8d0' }).setOrigin(0.5);
    bg.on('pointerdown', cb);
    c.add([bg, lbl]);
    return c;
  }

  // ─── Phase 1: pop LIFO ───────────────────────────────────────────────────

  private beginPhase1(): void {
    this.phaseLabel.setText('PHASE 1: Pop only the TOP scroll');
    const { width } = this.cameras.main;
    const cx = width / 2, base = 360;
    this.add.rectangle(cx, base + 8, 280, 6, 0x346856, 1);
    for (let i = 0; i < 4; i++) {
      const y = base - i * 44;
      const color = SCROLL_COLORS[i];
      const rect = this.add.rectangle(cx, y, 264, 40, color, 0.9)
        .setStrokeStyle(2, 0xe0f8d0, 0.5).setInteractive({ useHandCursor: true });
      const lbl = this.add.text(cx, y, 'ABCDE'[i], {
        fontSize: '16px', fontFamily: FONTS.RETRO, color: '#081820',
      }).setOrigin(0.5);
      const entry = { rect, label: lbl };
      this.p1Stack.push(entry);
      rect.on('pointerdown', () => this.p1Pop(entry));
    }
    this.p1RefreshTop();
  }

  private p1RefreshTop(): void {
    this.p1Stack.forEach((s, i) => {
      const top = i === this.p1Stack.length - 1;
      s.rect.setStrokeStyle(top ? 3 : 1, top ? 0x06b6d4 : 0xe0f8d0, top ? 1 : 0.4);
    });
  }

  private p1Pop(entry: typeof this.p1Stack[0]): void {
    if (this.p1Stack[this.p1Stack.length - 1] !== entry) {
      this.totalMistakes++; this.attempts++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, entry.rect.x, entry.rect.y);
      this.showMessage('TOP only!', COLORS.WARNING);
      return;
    }
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, entry.rect.x, entry.rect.y);
    this.p1Stack.pop();
    this.tweens.add({
      targets: [entry.rect, entry.label], x: entry.rect.x + 180, alpha: 0, duration: 220,
      onComplete: () => { entry.rect.destroy(); entry.label.destroy(); },
    });
    this.p1Pops++;
    this.p1RefreshTop();
    if (this.p1Pops >= this.P1_TARGET || this.p1Stack.length === 0)
      this.time.delayedCall(500, () => this.beginPhase2());
  }

  // ─── Phase 2: palindrome ─────────────────────────────────────────────────

  private beginPhase2(): void {
    this.phaseLabel.setText('PHASE 2: Push first half, pop to compare');
    const { width, height } = this.cameras.main;
    const word = this.p2Word;
    const half = Math.floor(word.length / 2);
    this.p2PushCursor = 0;
    this.p2PopCursor = word.length - 1;
    this.p2PushPhase = true;
    const tileW = 52;
    const startX = width / 2 - (word.length * tileW) / 2 + tileW / 2;
    const y = height / 2 + 24;

    for (let i = 0; i < word.length; i++) {
      const x = startX + i * tileW;
      const c = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, 48, 56, 0x1a3a5c, 0.9)
        .setStrokeStyle(2, 0x346856).setInteractive({ useHandCursor: true });
      const lbl = this.add.text(0, 0, word[i], { fontSize: '20px', fontFamily: FONTS.RETRO, color: '#e0f8d0' }).setOrigin(0.5);
      c.add([bg, lbl]);
      const idx = i;
      bg.on('pointerdown', () => this.p2Click(idx));
      this.p2Tiles.push(c);
    }
    this.showMessage(`Push first ${half}, then pop to compare`, COLORS.CYAN_GLOW);
  }

  private p2Click(idx: number): void {
    const word = this.p2Word;
    const half = Math.floor(word.length / 2);
    const cx = 520, base = 300;

    if (this.p2PushPhase) {
      if (idx !== this.p2PushCursor) { this.totalMistakes++; audioManager.playWrongTone(); return; }
      this.p2StackLetters.push(word[idx]);
      const sy = base - this.p2StackDisplay.length * 36;
      const r = this.add.rectangle(cx, sy, 72, 32, 0x06b6d4, 0.8).setStrokeStyle(1, 0xe0f8d0);
      const l = this.add.text(cx, sy, word[idx], { fontSize: '14px', fontFamily: FONTS.RETRO, color: '#081820' }).setOrigin(0.5);
      this.p2StackDisplay.push({ rect: r, label: l });
      (this.p2Tiles[idx].list[0] as Phaser.GameObjects.Rectangle).setFillStyle(0x2a4a2a);
      this.p2PushCursor++;
      audioManager.playTone(440 + this.p2PushCursor * 40, 60, 'square');
      if (this.p2PushCursor >= half) {
        this.p2PushPhase = false;
        if (word.length % 2 === 1) (this.p2Tiles[half].list[0] as Phaser.GameObjects.Rectangle).setFillStyle(0x346856);
        this.showMessage('Now click from the RIGHT to pop+compare!', COLORS.GOLD_ACCENT);
      }
    } else {
      if (idx !== this.p2PopCursor) { this.totalMistakes++; audioManager.playWrongTone(); return; }
      const expected = this.p2StackLetters.pop()!;
      const top = this.p2StackDisplay.pop()!;
      this.tweens.add({ targets: [top.rect, top.label], alpha: 0, duration: 150, onComplete: () => { top.rect.destroy(); top.label.destroy(); } });
      if (word[idx] !== expected) { this.totalMistakes++; audioManager.playWrongTone(); JuiceSystem.wrongBurst(this, (this.p2Tiles[idx] as Phaser.GameObjects.Container).x, (this.p2Tiles[idx] as Phaser.GameObjects.Container).y); }
      else { audioManager.playCorrectTone(); JuiceSystem.correctBurst(this, (this.p2Tiles[idx] as Phaser.GameObjects.Container).x, (this.p2Tiles[idx] as Phaser.GameObjects.Container).y); }
      (this.p2Tiles[idx].list[0] as Phaser.GameObjects.Rectangle).setFillStyle(0x2a4a2a);
      this.p2PopCursor--;
      if (this.p2StackLetters.length === 0) {
        this.p2Tiles.forEach(t => t.destroy());
        this.p2Tiles = [];
        this.time.delayedCall(600, () => this.beginPhase3());
      }
    }
  }

  // ─── Phase 3: DFS maze ───────────────────────────────────────────────────

  private beginPhase3(): void {
    this.phaseLabel.setText('PHASE 3: DFS — find the exit!');
    const { width, height } = this.cameras.main;
    const cx = width / 2, cy = height / 2 - 20;

    this.p3Gfx = this.add.graphics();
    const pos = [
      { x: cx, y: cy - 84 }, { x: cx - 104, y: cy }, { x: cx + 104, y: cy },
      { x: cx - 152, y: cy + 84 }, { x: cx - 48, y: cy + 84 }, { x: cx + 48, y: cy + 84 }, { x: cx + 152, y: cy + 84 },
    ];
    const parOf = [-1, 0, 0, 1, 1, 2, 2];
    const lOf = [1, 3, 5, -1, -1, -1, -1];
    const rOf = [2, 4, 6, -1, -1, -1, -1];
    const exitId = 3 + Math.floor(Math.random() * 4);

    this.p3Gfx.lineStyle(2, 0x346856, 0.8);
    for (let i = 1; i < 7; i++) {
      this.p3Gfx.beginPath();
      this.p3Gfx.moveTo(pos[parOf[i]].x, pos[parOf[i]].y);
      this.p3Gfx.lineTo(pos[i].x, pos[i].y);
      this.p3Gfx.strokePath();
    }

    this.p3Nodes = pos.map((p, i) => ({
      id: i, x: p.x, y: p.y,
      left: lOf[i] !== -1 ? lOf[i] : null,
      right: rOf[i] !== -1 ? rOf[i] : null,
      parent: parOf[i] !== -1 ? parOf[i] : null,
      type: (i < 3 ? 'node' : i === exitId ? 'exit' : 'dead') as MazeNode['type'],
      circle: this.add.circle(p.x, p.y, 24, 0x1a3a5c, 0.9).setStrokeStyle(2, i === 0 ? 0x06b6d4 : 0x346856),
      label: this.add.text(p.x, p.y, i === 0 ? 'ROOT' : '?', { fontSize: '8px', fontFamily: FONTS.RETRO, color: '#e0f8d0' }).setOrigin(0.5),
    }));

    this.p3Current = 0; this.p3Path = [];
    this.mkBtn(cx - 80, 404, 'LEFT', () => this.p3Move('left'));
    this.mkBtn(cx + 80, 404, 'RIGHT', () => this.p3Move('right'));
    this.mkBtn(cx, 432, 'BACK', () => this.p3Back());
    this.p3Refresh();
  }

  private p3Move(dir: 'left' | 'right'): void {
    const cur = this.p3Nodes[this.p3Current];
    const nid = dir === 'left' ? cur.left : cur.right;
    if (nid === null) return;
    this.p3Path.push(this.p3Current);
    this.p3Current = nid;
    const n = this.p3Nodes[this.p3Current];
    this.p3Refresh();
    if (n.type === 'exit') {
      audioManager.playCorrectTone();
      JuiceSystem.correctBurst(this, n.x, n.y);
      this.time.delayedCall(700, () => {
        const stars = this.totalMistakes === 0 ? 3 : this.totalMistakes <= 4 ? 2 : 1;
        this.onPuzzleComplete(stars);
      });
    } else if (n.type === 'dead') {
      this.totalMistakes++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, n.x, n.y);
      this.showMessage('Dead end! Press BACK.', COLORS.WARNING);
    }
  }

  private p3Back(): void {
    if (this.p3Path.length === 0) return;
    this.p3Current = this.p3Path.pop()!;
    this.p3Refresh();
  }

  private p3Refresh(): void {
    for (const n of this.p3Nodes) {
      if (!n.circle) continue;
      const cur = n.id === this.p3Current;
      const revealed = n.id === 0 || this.p3Path.includes(n.id) || cur
        || (n.parent !== null && (n.parent === this.p3Current || this.p3Path.includes(n.parent)));
      let fill = 0x1a3a5c, stroke = 0x346856, text = '?', tc = '#e0f8d0';
      if (revealed) {
        if (n.type === 'exit') { fill = 0x166534; stroke = 0x22c55e; text = 'EXIT'; tc = '#22c55e'; }
        else if (n.type === 'dead') { fill = 0x3a1a1a; stroke = 0xef4444; text = 'DEAD'; tc = '#ef4444'; }
        else text = n.id === 0 ? 'ROOT' : 'NODE';
      }
      if (cur) { fill = 0x0e4a6a; stroke = 0x06b6d4; }
      n.circle.setFillStyle(fill, 0.9).setStrokeStyle(2, stroke);
      n.label!.setText(text).setColor(tc);
    }
  }

  protected displayHint(n: number): void {
    const msgs = [
      'Phase 1: pop only the TOP. Phase 2: push first half, pop to compare.',
      'Phase 2: the stack reverses the first half — so popping gives the mirror.',
      'Phase 3: DFS — explore one path, backtrack at dead ends, find the exit.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}
