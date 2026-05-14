/**
 * Tree Canopy — interactive puzzles for BST Insertion, BST Search, DFS Traversal, AVL Balance.
 * Physical tree visualizations, no multiple-choice quizzes.
 * Extends BasePuzzleScene directly.
 */

import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { JuiceSystem } from '../../systems/JuiceSystem';
import { audioManager } from '../../core/AudioManager';

// Shared 7-node BST layout relative to (cx, cy)
function treePositions(cx: number, cy: number) {
  return [
    { x: cx,       y: cy - 96  },  // 0: root
    { x: cx - 136, y: cy       },  // 1: L
    { x: cx + 136, y: cy       },  // 2: R
    { x: cx - 192, y: cy + 96  },  // 3: LL
    { x: cx - 80,  y: cy + 96  },  // 4: LR
    { x: cx + 80,  y: cy + 96  },  // 5: RL
    { x: cx + 192, y: cy + 96  },  // 6: RR
  ];
}
const LEFT_CHILD  = [1, 3, 5, -1, -1, -1, -1];
const RIGHT_CHILD = [2, 4, 6, -1, -1, -1, -1];
const PARENT_OF   = [-1, 0, 0, 1, 1, 2, 2];

function drawEdges(gfx: Phaser.GameObjects.Graphics, pos: {x:number;y:number}[], color = 0x346856): void {
  gfx.lineStyle(2, color, 0.8);
  for (let i = 1; i < 7; i++) {
    gfx.beginPath();
    gfx.moveTo(pos[PARENT_OF[i]].x, pos[PARENT_OF[i]].y);
    gfx.lineTo(pos[i].x, pos[i].y);
    gfx.strokePath();
  }
}

// ============================================================================
// P6_1 — Root Walk: BST Insertion — route numbers left/right at each level.
// ============================================================================

export class P6_1_RootWalk extends BasePuzzleScene {
  private nodeValues: (number | null)[] = [8, null, null, null, null, null, null];
  private nodeCircles: Phaser.GameObjects.Arc[] = [];
  private nodeLabels: Phaser.GameObjects.Text[] = [];
  private insertSequence = [4, 12, 2, 6, 10, 14];
  private insertIdx = 0;
  private currentNodeId = 0; // where player currently is in the routing
  private arrivingText!: Phaser.GameObjects.Text;
  private leftBtn!: Phaser.GameObjects.Container;
  private rightBtn!: Phaser.GameObjects.Container;
  private mistakes = 0;
  private gfx!: Phaser.GameObjects.Graphics;
  private pos: {x:number;y:number}[] = [];

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TC_1 });
    this.puzzleId = 'tc_1';
    this.puzzleName = 'Root Walk';
    this.puzzleDescription = 'Route each number left (smaller) or right (larger) into the BST.';
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_TREE_FIRST_FORK_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.025; }
  protected getConceptName() { return 'BST — Insertion'; }

  create(): void {
    super.create();
    const { width, height } = this.cameras.main;
    const cx = width / 2, cy = height / 2 + 8;
    this.pos = treePositions(cx, cy);

    this.gfx = this.add.graphics();
    drawEdges(this.gfx, this.pos);

    for (let i = 0; i < 7; i++) {
      const p = this.pos[i];
      const c = this.add.circle(p.x, p.y, 28, this.nodeValues[i] !== null ? 0x1a3a5c : 0x0a0a0a, 0.9)
        .setStrokeStyle(2, this.nodeValues[i] !== null ? 0x346856 : 0x1a3a5c);
      const l = this.add.text(p.x, p.y, this.nodeValues[i] !== null ? `${this.nodeValues[i]}` : '', {
        fontSize: '14px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5);
      this.nodeCircles.push(c);
      this.nodeLabels.push(l);
    }

    this.add.text(width / 2, 152, 'Small numbers go LEFT. Large numbers go RIGHT.', {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#e0f8d0',
      backgroundColor: '#081820', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(20);

    this.arrivingText = this.add.text(width / 2, 176, '', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#fbbf24',
    }).setOrigin(0.5).setDepth(20);

    this.leftBtn  = this.mkBtn(cx - 80, height - 80, 'GO LEFT',  () => this.route('left'));
    this.rightBtn = this.mkBtn(cx + 80, height - 80, 'GO RIGHT', () => this.route('right'));

    this.startInsertion();
  }

  private mkBtn(x: number, y: number, text: string, cb: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(20);
    const bg = this.add.rectangle(0, 0, 136, 32, 0x1a3a5c, 0.9)
      .setStrokeStyle(2, 0x06b6d4).setInteractive({ useHandCursor: true });
    const lbl = this.add.text(0, 0, text, { fontSize: '10px', fontFamily: FONTS.RETRO, color: '#e0f8d0' }).setOrigin(0.5);
    bg.on('pointerdown', cb);
    c.add([bg, lbl]);
    return c;
  }

  private startInsertion(): void {
    if (this.insertIdx >= this.insertSequence.length) {
      this.time.delayedCall(400, () => {
        const stars = this.mistakes === 0 ? 3 : this.mistakes <= 3 ? 2 : 1;
        this.onPuzzleComplete(stars);
      });
      return;
    }
    this.currentNodeId = 0;
    const val = this.insertSequence[this.insertIdx];
    this.arrivingText.setText(`INSERTING: ${val}`);
    this.highlightCurrent();
    this.updateDirectionHints(val);
  }

  private highlightCurrent(): void {
    this.nodeCircles.forEach((c, i) => {
      c.setStrokeStyle(i === this.currentNodeId ? 3 : 2,
        i === this.currentNodeId ? 0x06b6d4 : (this.nodeValues[i] !== null ? 0x346856 : 0x1a3a5c));
      c.setFillStyle(i === this.currentNodeId ? 0x0e4a6a : (this.nodeValues[i] !== null ? 0x1a3a5c : 0x0a0a0a), 0.9);
    });
  }

  private updateDirectionHints(arriving: number): void {
    const cur = this.nodeValues[this.currentNodeId];
    if (cur === null) return;
    const leftCorrect = arriving < cur;
    (this.leftBtn.list[0]  as Phaser.GameObjects.Rectangle).setStrokeStyle(2, leftCorrect  ? 0x22c55e : 0x346856);
    (this.rightBtn.list[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(2, !leftCorrect ? 0x22c55e : 0x346856);
  }

  private route(dir: 'left' | 'right'): void {
    const arriving = this.insertSequence[this.insertIdx];
    const cur = this.nodeValues[this.currentNodeId];
    if (cur === null) return;

    const shouldGoLeft = arriving < cur;
    const correct = (dir === 'left' && shouldGoLeft) || (dir === 'right' && !shouldGoLeft);

    if (!correct) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, dir === 'left' ? this.leftBtn.x : this.rightBtn.x, this.leftBtn.y);
      this.showMessage(`${arriving} ${shouldGoLeft ? '<' : '>'} ${cur} — go ${shouldGoLeft ? 'LEFT' : 'RIGHT'}!`, COLORS.WARNING);
      return;
    }

    const nextId = dir === 'left' ? LEFT_CHILD[this.currentNodeId] : RIGHT_CHILD[this.currentNodeId];
    if (nextId === -1) return;

    audioManager.playTone(440, 60, 'square');

    if (this.nodeValues[nextId] === null) {
      // Empty slot — place the value here
      this.nodeValues[nextId] = arriving;
      this.nodeCircles[nextId].setFillStyle(0x1a3a5c, 0.9).setStrokeStyle(2, 0x88c070);
      this.nodeLabels[nextId].setText(`${arriving}`).setColor('#88c070');
      JuiceSystem.correctBurst(this, this.pos[nextId].x, this.pos[nextId].y);
      audioManager.playCorrectTone();
      this.insertIdx++;
      this.time.delayedCall(300, () => this.startInsertion());
    } else {
      this.currentNodeId = nextId;
      this.highlightCurrent();
      this.updateDirectionHints(arriving);
    }
  }

  protected displayHint(n: number): void {
    const v = this.insertSequence[this.insertIdx] ?? 0;
    const cur = this.nodeValues[this.currentNodeId] ?? 0;
    const msgs = [
      'BST: values smaller than the current node go LEFT, larger go RIGHT.',
      `Inserting ${v} at node ${cur}: ${v} ${v < cur ? '<' : '>'} ${cur} → go ${v < cur ? 'LEFT' : 'RIGHT'}.`,
      'Follow the same rule at every level until you reach an empty slot.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P6_2 — BST Grove: BST Search — navigate left/right to find a target.
// ============================================================================

export class P6_2_BstGrove extends BasePuzzleScene {
  private readonly VALUES = [8, 4, 12, 2, 6, 10, 14];
  private nodeCircles: Phaser.GameObjects.Arc[] = [];
  private nodeLabels: Phaser.GameObjects.Text[] = [];
  private targets = [6, 14, 2, 10, 4, 12];
  private targetIdx = 0;
  private currentNodeId = 0;
  private mistakes = 0;
  private targetText!: Phaser.GameObjects.Text;
  private leftBtn!: Phaser.GameObjects.Container;
  private rightBtn!: Phaser.GameObjects.Container;
  private foundBtn!: Phaser.GameObjects.Container;
  private pos: {x:number;y:number}[] = [];

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TC_2 });
    this.puzzleId = 'tc_2';
    this.puzzleName = 'BST Grove';
    this.puzzleDescription = 'Navigate the tree to find the target value.';
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_TREE_SORTED_GROVE_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.025; }
  protected getConceptName() { return 'BST — Search'; }

  create(): void {
    super.create();
    const { width, height } = this.cameras.main;
    const cx = width / 2, cy = height / 2 + 8;
    this.pos = treePositions(cx, cy);

    const gfx = this.add.graphics();
    drawEdges(gfx, this.pos);

    for (let i = 0; i < 7; i++) {
      const p = this.pos[i];
      const c = this.add.circle(p.x, p.y, 28, 0x1a3a5c, 0.9).setStrokeStyle(2, 0x346856);
      const l = this.add.text(p.x, p.y, `${this.VALUES[i]}`, {
        fontSize: '14px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5);
      this.nodeCircles.push(c);
      this.nodeLabels.push(l);
    }

    this.add.text(width / 2, 152, 'If target < current node → LEFT. If larger → RIGHT.', {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#e0f8d0',
      backgroundColor: '#081820', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(20);

    this.targetText = this.add.text(width / 2, 176, '', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#fbbf24',
    }).setOrigin(0.5).setDepth(20);

    this.leftBtn  = this.mkBtn(cx - 112, height - 80, 'GO LEFT',  () => this.search('left'));
    this.foundBtn = this.mkBtn(cx,        height - 80, 'FOUND!',   () => this.search('found'));
    this.rightBtn = this.mkBtn(cx + 112,  height - 80, 'GO RIGHT', () => this.search('right'));

    this.newTarget();
  }

  private mkBtn(x: number, y: number, text: string, cb: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(20);
    const bg = this.add.rectangle(0, 0, 112, 32, 0x1a3a5c, 0.9)
      .setStrokeStyle(2, 0x06b6d4).setInteractive({ useHandCursor: true });
    const lbl = this.add.text(0, 0, text, { fontSize: '9px', fontFamily: FONTS.RETRO, color: '#e0f8d0' }).setOrigin(0.5);
    bg.on('pointerdown', cb);
    c.add([bg, lbl]);
    return c;
  }

  private newTarget(): void {
    if (this.targetIdx >= this.targets.length) {
      this.time.delayedCall(400, () => {
        const stars = this.mistakes === 0 ? 3 : this.mistakes <= 3 ? 2 : 1;
        this.onPuzzleComplete(stars);
      });
      return;
    }
    this.currentNodeId = 0;
    this.targetText.setText(`FIND: ${this.targets[this.targetIdx]}`);
    this.refreshHighlight();
  }

  private refreshHighlight(): void {
    const target = this.targets[this.targetIdx];
    const cur = this.VALUES[this.currentNodeId];
    this.nodeCircles.forEach((c, i) => {
      c.setStrokeStyle(i === this.currentNodeId ? 3 : 2, i === this.currentNodeId ? 0x06b6d4 : 0x346856);
      c.setFillStyle(i === this.currentNodeId ? 0x0e4a6a : 0x1a3a5c, 0.9);
    });
    const atTarget = cur === target;
    (this.leftBtn.list[0]  as Phaser.GameObjects.Rectangle).setStrokeStyle(2, !atTarget && target < cur ? 0x22c55e : 0x346856);
    (this.rightBtn.list[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(2, !atTarget && target > cur ? 0x22c55e : 0x346856);
    (this.foundBtn.list[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(2, atTarget ? 0x22c55e : 0x346856);
  }

  private search(action: 'left' | 'right' | 'found'): void {
    const target = this.targets[this.targetIdx];
    const cur = this.VALUES[this.currentNodeId];

    if (action === 'found') {
      if (cur !== target) {
        this.mistakes++;
        this.attempts++;
        audioManager.playWrongTone();
        JuiceSystem.wrongBurst(this, this.foundBtn.x, this.foundBtn.y);
        this.showMessage(`${cur} is not ${target}! Keep searching.`, COLORS.WARNING);
        return;
      }
      audioManager.playCorrectTone();
      JuiceSystem.correctBurst(this, this.pos[this.currentNodeId].x, this.pos[this.currentNodeId].y);
      this.nodeCircles[this.currentNodeId].setFillStyle(0x166534).setStrokeStyle(3, 0x22c55e);
      this.targetIdx++;
      this.time.delayedCall(500, () => this.newTarget());
      return;
    }

    const goLeft = action === 'left';
    const correct = (goLeft && target < cur) || (!goLeft && target > cur);

    if (!correct) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, goLeft ? this.leftBtn.x : this.rightBtn.x, this.leftBtn.y);
      this.showMessage(`${target} ${target < cur ? '<' : '>'} ${cur} → go ${target < cur ? 'LEFT' : 'RIGHT'}!`, COLORS.WARNING);
      return;
    }

    const nextId = goLeft ? LEFT_CHILD[this.currentNodeId] : RIGHT_CHILD[this.currentNodeId];
    if (nextId === -1) {
      this.mistakes++;
      this.showMessage('No child there — target must be at current node!', COLORS.WARNING);
      return;
    }

    audioManager.playTone(440, 60, 'square');
    this.currentNodeId = nextId;
    this.refreshHighlight();
  }

  protected displayHint(n: number): void {
    const target = this.targets[this.targetIdx] ?? 0;
    const cur = this.VALUES[this.currentNodeId];
    const msgs = [
      'BST search: if target < current node, go LEFT; if larger, go RIGHT.',
      `Target is ${target}, current node is ${cur}. ${target < cur ? 'Go LEFT.' : target > cur ? 'Go RIGHT.' : 'Press FOUND!'}`,
      'BST search eliminates half the tree at each level — O(log n) time.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P6_3 — DFS Branches: Click nodes in correct DFS traversal order.
// ============================================================================

export class P6_3_DfsBranches extends BasePuzzleScene {
  // Tree values: root=4, L=2, R=6, LL=1, LR=3, RL=5, RR=7
  private readonly NODE_VALUES = [4, 2, 6, 1, 3, 5, 7];
  private readonly ORDERS = [
    { name: 'PRE-ORDER',  desc: 'root → left → right',  seq: [0,1,3,4,2,5,6] },
    { name: 'IN-ORDER',   desc: 'left → root → right',  seq: [3,1,4,0,5,2,6] },
    { name: 'POST-ORDER', desc: 'left → right → root',  seq: [3,4,1,5,6,2,0] },
  ];
  private roundIdx = 0;
  private stepIdx = 0;
  private mistakes = 0;
  private nodeCircles: Phaser.GameObjects.Arc[] = [];
  private nodeLabels: Phaser.GameObjects.Text[] = [];
  private modeText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private pos: {x:number;y:number}[] = [];

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TC_3 });
    this.puzzleId = 'tc_3';
    this.puzzleName = 'DFS Branches';
    this.puzzleDescription = 'Click nodes in the correct DFS traversal order.';
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_TREE_DEEP_ROOT_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.025; }
  protected getConceptName() { return 'DFS — Tree Traversal'; }

  create(): void {
    super.create();
    const { width, height } = this.cameras.main;
    const cx = width / 2, cy = height / 2 + 8;
    this.pos = treePositions(cx, cy);

    const gfx = this.add.graphics();
    drawEdges(gfx, this.pos);

    for (let i = 0; i < 7; i++) {
      const p = this.pos[i];
      const c = this.add.circle(p.x, p.y, 28, 0x1a3a5c, 0.9)
        .setStrokeStyle(2, 0x346856).setInteractive({ useHandCursor: true });
      const l = this.add.text(p.x, p.y, `${this.NODE_VALUES[i]}`, {
        fontSize: '14px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5);
      c.on('pointerdown', () => this.clickNode(i));
      this.nodeCircles.push(c);
      this.nodeLabels.push(l);
    }

    this.modeText = this.add.text(width / 2, 152, '', {
      fontSize: '11px', fontFamily: FONTS.RETRO, color: '#fbbf24',
    }).setOrigin(0.5).setDepth(20);

    this.progressText = this.add.text(width / 2, 176, '', {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#88c070',
    }).setOrigin(0.5).setDepth(20);

    this.startRound();
  }

  private startRound(): void {
    this.stepIdx = 0;
    // Reset all node colors
    this.nodeCircles.forEach(c => c.setFillStyle(0x1a3a5c, 0.9).setStrokeStyle(2, 0x346856));
    this.nodeLabels.forEach(l => l.setColor('#e0f8d0'));
    const order = this.ORDERS[this.roundIdx];
    this.modeText.setText(`${order.name}: ${order.desc}`);
    this.refreshProgress();
  }

  private refreshProgress(): void {
    const order = this.ORDERS[this.roundIdx];
    const expected = order.seq.map(idx => this.NODE_VALUES[idx]);
    const done = expected.slice(0, this.stepIdx).join(' → ');
    const next = expected[this.stepIdx] ?? '?';
    this.progressText.setText(`Next: ${next}  |  Done: ${done || '—'}`);
  }

  private clickNode(nodeId: number): void {
    const order = this.ORDERS[this.roundIdx];
    const expected = order.seq[this.stepIdx];

    if (nodeId !== expected) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, this.pos[nodeId].x, this.pos[nodeId].y);
      this.showMessage(`Wrong! Next should be ${this.NODE_VALUES[expected]}.`, COLORS.WARNING);
      return;
    }

    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, this.pos[nodeId].x, this.pos[nodeId].y);
    this.nodeCircles[nodeId].setFillStyle(0x166534, 0.9).setStrokeStyle(3, 0x22c55e);
    this.nodeLabels[nodeId].setColor('#22c55e');
    this.stepIdx++;
    this.refreshProgress();

    if (this.stepIdx >= order.seq.length) {
      this.roundIdx++;
      if (this.roundIdx >= this.ORDERS.length) {
        this.time.delayedCall(500, () => {
          const stars = this.mistakes === 0 ? 3 : this.mistakes <= 4 ? 2 : 1;
          this.onPuzzleComplete(stars);
        });
      } else {
        this.showMessage(`${order.name} complete! Next: ${this.ORDERS[this.roundIdx].name}`, COLORS.GOLD_ACCENT);
        this.time.delayedCall(700, () => this.startRound());
      }
    }
  }

  protected displayHint(n: number): void {
    const msgs = [
      'Pre-order: visit root FIRST, then left subtree, then right subtree.',
      'In-order: left subtree first, then root, then right (gives sorted values for a BST).',
      'Post-order: left subtree, right subtree, then root LAST.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P6_4 — Balance Canopy: Click the unbalanced node (|leftH - rightH| > 1).
// ============================================================================

interface TreeSpec {
  values: (number | null)[];
  heights: number[];       // subtree height at each node
  unbalancedId: number;    // index of the node where |leftH - rightH| > 1
}

export class P6_4_BalanceCanopy extends BasePuzzleScene {
  // 3 pre-defined unbalanced trees (7-node positions, but some may be null = absent)
  private readonly TREES: TreeSpec[] = [
    // Right-leaning: root has left height 0, right height 2
    { values: [5, null, 8, null, null, 6, 10], heights: [3, 0, 2, 0, 0, 1, 1], unbalancedId: 0 },
    // Left chain: root -> L -> LL (right subtree empty)
    { values: [10, 6, null, 3, null, null, null], heights: [3, 2, 0, 1, 0, 0, 0], unbalancedId: 0 },
    // Subtree unbalanced: right child has deep right subtree
    { values: [8, 4, 12, null, null, null, 15], heights: [3, 1, 2, 0, 0, 0, 1], unbalancedId: 2 },
  ];
  private treeIdx = 0;
  private mistakes = 0;
  private nodeCircles: (Phaser.GameObjects.Arc | null)[] = [];
  private nodeLabels: (Phaser.GameObjects.Text | null)[] = [];
  private heightLabels: (Phaser.GameObjects.Text | null)[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private pos: {x:number;y:number}[] = [];

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TC_4 });
    this.puzzleId = 'tc_4';
    this.puzzleName = 'Balance Canopy';
    this.puzzleDescription = 'Click the node where the subtree heights are unbalanced.';
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_TREE_BENT_BOUGH_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.025; }
  protected getConceptName() { return 'AVL — Balance Detection'; }

  create(): void {
    super.create();
    const { width, height } = this.cameras.main;
    const cx = width / 2, cy = height / 2 + 8;
    this.pos = treePositions(cx, cy);

    this.gfx = this.add.graphics();

    this.add.text(width / 2, 152, 'Click the node where |left height − right height| > 1', {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#e0f8d0',
      backgroundColor: '#081820', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(20);

    this.nodeCircles  = new Array(7).fill(null);
    this.nodeLabels   = new Array(7).fill(null);
    this.heightLabels = new Array(7).fill(null);

    this.loadTree();
  }

  private loadTree(): void {
    this.nodeCircles.forEach(c => c?.destroy());
    this.nodeLabels.forEach(l => l?.destroy());
    this.heightLabels.forEach(l => l?.destroy());
    this.gfx.clear();

    const spec = this.TREES[this.treeIdx];
    // Draw edges for present nodes
    this.gfx.lineStyle(2, 0x346856, 0.8);
    for (let i = 1; i < 7; i++) {
      if (spec.values[i] === null) continue;
      const p = this.pos[PARENT_OF[i]];
      const n = this.pos[i];
      this.gfx.beginPath();
      this.gfx.moveTo(p.x, p.y);
      this.gfx.lineTo(n.x, n.y);
      this.gfx.strokePath();
    }

    for (let i = 0; i < 7; i++) {
      if (spec.values[i] === null) { this.nodeCircles[i] = null; this.nodeLabels[i] = null; this.heightLabels[i] = null; continue; }
      const p = this.pos[i];
      const c = this.add.circle(p.x, p.y, 28, 0x1a3a5c, 0.9)
        .setStrokeStyle(2, 0x346856).setInteractive({ useHandCursor: true });
      const l = this.add.text(p.x, p.y, `${spec.values[i]}`, {
        fontSize: '14px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5);
      const h = this.add.text(p.x + 34, p.y - 28, `h=${spec.heights[i]}`, {
        fontSize: '8px', fontFamily: FONTS.MONO, color: '#88c070',
      }).setOrigin(0.5);
      const idx = i;
      c.on('pointerdown', () => this.clickNode(idx));
      this.nodeCircles[i] = c;
      this.nodeLabels[i] = l;
      this.heightLabels[i] = h;
    }
  }

  private clickNode(id: number): void {
    const spec = this.TREES[this.treeIdx];
    if (id !== spec.unbalancedId) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      const c = this.nodeCircles[id];
      if (c) JuiceSystem.wrongBurst(this, c.x, c.y);
      this.showMessage('That node is balanced. Find where |left − right| > 1.', COLORS.WARNING);
      return;
    }

    audioManager.playCorrectTone();
    const c = this.nodeCircles[id]!;
    JuiceSystem.correctBurst(this, c.x, c.y);
    c.setFillStyle(0x166534).setStrokeStyle(3, 0x22c55e);
    this.showMessage('Correct! A rotation here restores AVL balance.', COLORS.GOLD_ACCENT);
    this.treeIdx++;

    this.time.delayedCall(700, () => {
      if (this.treeIdx >= this.TREES.length) {
        const stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
        this.onPuzzleComplete(stars);
      } else {
        this.loadTree();
      }
    });
  }

  protected displayHint(n: number): void {
    const msgs = [
      'A node is unbalanced if |left subtree height − right subtree height| > 1.',
      'Check the h= labels on each node. Find where the difference exceeds 1.',
      'AVL trees use rotations to restore balance whenever a node becomes unbalanced.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// Boss_Pattern — 3-phase: BST insertion → BST search → in-order traversal.
// ============================================================================

export class Boss_Pattern extends BasePuzzleScene {
  private phaseLabel!: Phaser.GameObjects.Text;
  private totalMistakes = 0;
  private gfx!: Phaser.GameObjects.Graphics;
  private nodeCircles: Phaser.GameObjects.Arc[] = [];
  private nodeLabels: Phaser.GameObjects.Text[] = [];
  private pos: {x:number;y:number}[] = [];

  // Phase 1 (insert): values array, insert seq, current routing position
  private p1Values: (number | null)[] = [8, null, null, null, null, null, null];
  private p1Seq = [4, 12, 2];
  private p1Idx = 0;
  private p1CurrentNode = 0;
  private p1LeftBtn!: Phaser.GameObjects.Container;
  private p1RightBtn!: Phaser.GameObjects.Container;
  private p1Arriving!: Phaser.GameObjects.Text;

  // Phase 2 (search)
  private p2Values = [8, 4, 12, 2, 6, 10, 14];
  private p2Targets = [2, 12, 6];
  private p2Idx = 0;
  private p2CurrentNode = 0;
  private p2SearchLeft!: Phaser.GameObjects.Container;
  private p2SearchRight!: Phaser.GameObjects.Container;
  private p2Found!: Phaser.GameObjects.Container;
  private p2Target!: Phaser.GameObjects.Text;

  // Phase 3 (in-order traversal)
  private p3Values = [4, 2, 6, 1, 3, 5, 7];
  private p3Order = [3, 1, 4, 0, 5, 2, 6]; // in-order indices
  private p3Step = 0;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_PATTERN });
    this.puzzleId = 'boss_pattern';
    this.puzzleName = 'The Pattern';
    this.puzzleDescription = 'BST insert, search, then traverse — the full tree lifecycle.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey() { return VISUAL_REVAMP_KEYS.PUZZLE_TREE_PATTERN_BG; }
  protected getPuzzleFrameFillAlpha() { return 0.035; }
  protected getConceptName() { return 'Tree Mastery'; }
  protected shouldSkipConceptBridge() { return true; }

  create(): void {
    super.create();
    const { width, height } = this.cameras.main;
    const cx = width / 2, cy = height / 2 + 8;
    this.pos = treePositions(cx, cy);

    this.gfx = this.add.graphics();

    this.phaseLabel = this.add.text(width / 2, 152, '', {
      fontSize: '11px', fontFamily: FONTS.RETRO, color: '#06b6d4',
    }).setOrigin(0.5).setDepth(20);

    this.p1Arriving = this.add.text(width / 2, 176, '', {
      fontSize: '14px', fontFamily: FONTS.RETRO, color: '#fbbf24',
    }).setOrigin(0.5).setDepth(20);

    this.p1LeftBtn  = this.mkBtn(cx - 80, height - 80, 'LEFT',  () => this.p1Route('left'));
    this.p1RightBtn = this.mkBtn(cx + 80, height - 80, 'RIGHT', () => this.p1Route('right'));
    this.p2SearchLeft  = this.mkBtn(cx - 112, height - 80, 'LEFT',  () => this.p2Search('left'));
    this.p2SearchRight = this.mkBtn(cx + 112, height - 80, 'RIGHT', () => this.p2Search('right'));
    this.p2Found = this.mkBtn(cx, height - 80, 'FOUND', () => this.p2Search('found'));
    this.p2Target = this.add.text(width / 2, 176, '', { fontSize: '14px', fontFamily: FONTS.RETRO, color: '#fbbf24' }).setOrigin(0.5).setDepth(20);

    this.setupNodes(this.p1Values, false);
    this.startPhase1();
  }

  private mkBtn(x: number, y: number, text: string, cb: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(20);
    const bg = this.add.rectangle(0, 0, 112, 30, 0x1a3a5c, 0.9)
      .setStrokeStyle(2, 0x06b6d4).setInteractive({ useHandCursor: true });
    const lbl = this.add.text(0, 0, text, { fontSize: '9px', fontFamily: FONTS.RETRO, color: '#e0f8d0' }).setOrigin(0.5);
    bg.on('pointerdown', cb);
    c.add([bg, lbl]);
    return c;
  }

  private setupNodes(values: (number | null)[], showAll: boolean): void {
    this.nodeCircles.forEach(c => c.destroy());
    this.nodeLabels.forEach(l => l.destroy());
    this.nodeCircles = [];
    this.nodeLabels = [];
    this.gfx.clear();
    drawEdges(this.gfx, this.pos);

    for (let i = 0; i < 7; i++) {
      const p = this.pos[i];
      const hasVal = values[i] !== null;
      const c = this.add.circle(p.x, p.y, 26, hasVal ? 0x1a3a5c : 0x0a0a0a, 0.9)
        .setStrokeStyle(2, hasVal ? 0x346856 : 0x1a3a5c);
      if (hasVal || showAll)
        c.setInteractive({ useHandCursor: true });
      const l = this.add.text(p.x, p.y, hasVal ? `${values[i]}` : '', {
        fontSize: '13px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5);
      this.nodeCircles.push(c);
      this.nodeLabels.push(l);
    }
  }

  private hidePhase2Btns(): void { this.p2SearchLeft.setVisible(false); this.p2SearchRight.setVisible(false); this.p2Found.setVisible(false); this.p2Target.setVisible(false); }
  private hidePhase1Btns(): void { this.p1LeftBtn.setVisible(false); this.p1RightBtn.setVisible(false); this.p1Arriving.setVisible(false); }

  // ─── Phase 1: insert ─────────────────────────────────────────────────────
  private startPhase1(): void {
    this.phaseLabel.setText('PHASE 1: Insert into the BST');
    this.hidePhase2Btns();
    this.p1LeftBtn.setVisible(true); this.p1RightBtn.setVisible(true); this.p1Arriving.setVisible(true);
    this.p1Next();
  }

  private p1Next(): void {
    if (this.p1Idx >= this.p1Seq.length) {
      this.hidePhase1Btns();
      this.time.delayedCall(400, () => this.startPhase2());
      return;
    }
    this.p1CurrentNode = 0;
    this.p1Arriving.setText(`INSERTING: ${this.p1Seq[this.p1Idx]}`);
    this.p1RefreshHL();
  }

  private p1RefreshHL(): void {
    const arr = this.p1Seq[this.p1Idx];
    const cur = this.p1Values[this.p1CurrentNode];
    this.nodeCircles.forEach((c, i) => {
      c.setStrokeStyle(i === this.p1CurrentNode ? 3 : 2, i === this.p1CurrentNode ? 0x06b6d4 : 0x346856);
      c.setFillStyle(i === this.p1CurrentNode ? 0x0e4a6a : (this.p1Values[i] !== null ? 0x1a3a5c : 0x0a0a0a), 0.9);
    });
    if (cur === null) return;
    (this.p1LeftBtn.list[0]  as Phaser.GameObjects.Rectangle).setStrokeStyle(2, arr < cur ? 0x22c55e : 0x346856);
    (this.p1RightBtn.list[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(2, arr > cur ? 0x22c55e : 0x346856);
  }

  private p1Route(dir: 'left' | 'right'): void {
    const arr = this.p1Seq[this.p1Idx];
    const cur = this.p1Values[this.p1CurrentNode];
    if (cur === null) return;
    const correct = (dir === 'left' && arr < cur) || (dir === 'right' && arr > cur);
    if (!correct) { this.totalMistakes++; this.attempts++; audioManager.playWrongTone(); JuiceSystem.wrongBurst(this, dir === 'left' ? this.p1LeftBtn.x : this.p1RightBtn.x, this.p1LeftBtn.y); return; }
    const nextId = dir === 'left' ? LEFT_CHILD[this.p1CurrentNode] : RIGHT_CHILD[this.p1CurrentNode];
    if (nextId === -1) return;
    if (this.p1Values[nextId] === null) {
      this.p1Values[nextId] = arr;
      this.nodeCircles[nextId].setFillStyle(0x1a3a5c).setStrokeStyle(2, 0x88c070);
      this.nodeLabels[nextId].setText(`${arr}`).setColor('#88c070');
      JuiceSystem.correctBurst(this, this.pos[nextId].x, this.pos[nextId].y);
      audioManager.playCorrectTone();
      this.p1Idx++;
      this.time.delayedCall(300, () => this.p1Next());
    } else {
      this.p1CurrentNode = nextId;
      this.p1RefreshHL();
      audioManager.playTone(440, 60, 'square');
    }
  }

  // ─── Phase 2: search ─────────────────────────────────────────────────────
  private startPhase2(): void {
    this.phaseLabel.setText('PHASE 2: Search the BST');
    this.setupNodes(this.p2Values.map(v => v), true);
    this.p2SearchLeft.setVisible(true); this.p2SearchRight.setVisible(true);
    this.p2Found.setVisible(true); this.p2Target.setVisible(true);
    this.p2CurrentNode = 0;
    this.p2Idx = 0;
    this.p2ShowTarget();
  }

  private p2ShowTarget(): void {
    if (this.p2Idx >= this.p2Targets.length) {
      this.hidePhase2Btns();
      this.time.delayedCall(400, () => this.startPhase3());
      return;
    }
    this.p2CurrentNode = 0;
    this.p2Target.setText(`FIND: ${this.p2Targets[this.p2Idx]}`);
    this.p2Refresh();
  }

  private p2Refresh(): void {
    this.nodeCircles.forEach((c, i) => { c.setStrokeStyle(i === this.p2CurrentNode ? 3 : 2, i === this.p2CurrentNode ? 0x06b6d4 : 0x346856); c.setFillStyle(i === this.p2CurrentNode ? 0x0e4a6a : 0x1a3a5c, 0.9); });
  }

  private p2Search(action: 'left' | 'right' | 'found'): void {
    const target = this.p2Targets[this.p2Idx];
    const cur = this.p2Values[this.p2CurrentNode];
    if (action === 'found') {
      if (cur !== target) { this.totalMistakes++; this.attempts++; audioManager.playWrongTone(); return; }
      audioManager.playCorrectTone(); JuiceSystem.correctBurst(this, this.pos[this.p2CurrentNode].x, this.pos[this.p2CurrentNode].y);
      this.nodeCircles[this.p2CurrentNode].setFillStyle(0x166534).setStrokeStyle(3, 0x22c55e);
      this.p2Idx++;
      this.time.delayedCall(500, () => this.p2ShowTarget());
      return;
    }
    const goLeft = action === 'left';
    if ((goLeft && target >= cur) || (!goLeft && target <= cur)) { this.totalMistakes++; this.attempts++; audioManager.playWrongTone(); return; }
    const nextId = goLeft ? LEFT_CHILD[this.p2CurrentNode] : RIGHT_CHILD[this.p2CurrentNode];
    if (nextId === -1) return;
    this.p2CurrentNode = nextId;
    this.p2Refresh();
    audioManager.playTone(440, 60, 'square');
  }

  // ─── Phase 3: traversal ──────────────────────────────────────────────────
  private startPhase3(): void {
    this.phaseLabel.setText('PHASE 3: Click nodes in IN-ORDER (left→root→right)');
    this.setupNodes(this.p3Values, true);
    this.p3Step = 0;
    this.nodeCircles.forEach((c, i) => c.on('pointerdown', () => this.p3Click(i)));
  }

  private p3Click(id: number): void {
    const expected = this.p3Order[this.p3Step];
    if (id !== expected) {
      this.totalMistakes++; this.attempts++;
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, this.pos[id].x, this.pos[id].y);
      this.showMessage(`Wrong! Next is ${this.p3Values[expected]}.`, COLORS.WARNING);
      return;
    }
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, this.pos[id].x, this.pos[id].y);
    this.nodeCircles[id].setFillStyle(0x166534).setStrokeStyle(3, 0x22c55e);
    this.p3Step++;
    if (this.p3Step >= this.p3Order.length) {
      this.time.delayedCall(500, () => {
        const stars = this.totalMistakes === 0 ? 3 : this.totalMistakes <= 4 ? 2 : 1;
        this.onPuzzleComplete(stars);
      });
    }
  }

  protected displayHint(n: number): void {
    const msgs = [
      'Phase 1: smaller values go LEFT, larger go RIGHT when inserting.',
      'Phase 2: follow BST property to search — eliminate half the tree at each step.',
      'Phase 3: in-order traversal visits left subtree first, then root, then right.',
    ];
    this.showMessage(msgs[n - 1] ?? msgs[0], COLORS.GOLD_ACCENT);
  }
}
