import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { JuiceSystem } from '../../systems/JuiceSystem';
import { audioManager } from '../../core/AudioManager';

// ─── Shared graph layout helpers ────────────────────────────────────────────

interface GNode {
  id: number;
  label: string;
  x: number;
  y: number;
  circle?: Phaser.GameObjects.Arc;
  text?: Phaser.GameObjects.Text;
  colorIndex: number;
}

interface GEdge {
  a: number;
  b: number;
  weight?: number;
  line?: Phaser.GameObjects.Line;
  weightText?: Phaser.GameObjects.Text;
}

const PALETTE = [0x346856, 0xe05050, 0x50a0e0, 0xfbbf24]; // uncolored, red, blue, gold

// ─── P7_1_NodeLinks — Graph Coloring ────────────────────────────────────────

export class P7_1_NodeLinks extends BasePuzzleScene {
  private nodes: GNode[] = [];
  private edges: GEdge[] = [];
  private gfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_GN_1 });
    this.puzzleId = 'gn_1';
    this.puzzleName = 'Node Links';
    this.puzzleDescription = 'Color every node so no two neighbors share a color.';
  }

  protected getPuzzleBackdropKey(): string | null { return VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_BRIDGE_MAP_BG; }
  protected getConceptName(): string { return 'Graph Coloring'; }

  create(): void {
    super.create();
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2 + 24;
    const r = 120;

    this.gfx = this.add.graphics().setDepth(1);

    // 6-node hexagon layout
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      this.nodes.push({
        id: i,
        label: labels[i],
        x: Math.round((cx + Math.cos(angle) * r) / 8) * 8,
        y: Math.round((cy + Math.sin(angle) * r) / 8) * 8,
        colorIndex: 0,
      });
    }

    // Edges: hexagon ring + two chords for chromatic complexity
    const edgePairs = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,3],[1,4]];
    for (const [a, b] of edgePairs) {
      this.edges.push({ a, b });
    }

    this.drawEdges();
    this.buildNodeSprites();
  }

  private drawEdges(): void {
    this.gfx.clear();
    for (const e of this.edges) {
      const na = this.nodes[e.a];
      const nb = this.nodes[e.b];
      const conflict = na.colorIndex !== 0 && nb.colorIndex !== 0 && na.colorIndex === nb.colorIndex;
      this.gfx.lineStyle(3, conflict ? 0xff2020 : 0x346856, 1);
      this.gfx.beginPath();
      this.gfx.moveTo(na.x, na.y);
      this.gfx.lineTo(nb.x, nb.y);
      this.gfx.strokePath();
    }
  }

  private buildNodeSprites(): void {
    for (const node of this.nodes) {
      const circle = this.add.arc(node.x, node.y, 24, 0, 360, false, PALETTE[0])
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(node.x, node.y, node.label, {
        fontSize: '14px',
        fontFamily: FONTS.RETRO,
        color: '#e0f8d0',
      }).setOrigin(0.5).setDepth(3);

      node.circle = circle;
      node.text = label;

      circle.on('pointerdown', () => this.cycleColor(node));
      circle.on('pointerover', () => { if (node.colorIndex === 0) circle.setFillStyle(COLORS.CYAN_GLOW); });
      circle.on('pointerout', () => circle.setFillStyle(PALETTE[node.colorIndex]));
    }
  }

  private cycleColor(node: GNode): void {
    node.colorIndex = (node.colorIndex % 3) + 1; // cycle 1→2→3→1
    node.circle!.setFillStyle(PALETTE[node.colorIndex]);
    this.drawEdges();
    this.checkCompletion();
  }

  private checkCompletion(): void {
    let conflicts = 0;
    let allColored = true;

    for (const node of this.nodes) {
      if (node.colorIndex === 0) { allColored = false; }
    }

    for (const e of this.edges) {
      const na = this.nodes[e.a];
      const nb = this.nodes[e.b];
      if (na.colorIndex !== 0 && nb.colorIndex !== 0 && na.colorIndex === nb.colorIndex) {
        conflicts++;
      }
    }

    if (conflicts > 0) {
      JuiceSystem.wrongBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);
      this.showMessage(`${conflicts} conflict${conflicts > 1 ? 's' : ''}! Neighbors can't share colors.`, COLORS.WARNING);
      this.attempts++;
    } else if (allColored) {
      const stars = this.attempts === 0 ? 3 : this.attempts <= 3 ? 2 : 1;
      this.onPuzzleComplete(stars);
    }
  }

  protected displayHint(n: number): void {
    const hints = [
      'Click a node to cycle its color. No two connected nodes may share a color.',
      'Try coloring opposite nodes the same color — they often have no edge between them.',
      'A→D and B→E are connected by chords. Those pairs need different colors.',
    ];
    this.showMessage(hints[n - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }
}
// ─── P7_2_ShortestPath — Dijkstra Path Building ─────────────────────────────

interface PathNode extends GNode {
  visited: boolean;
  inPath: boolean;
  pathIndex: number;
}

export class P7_2_ShortestPath extends BasePuzzleScene {
  private nodes: PathNode[] = [];
  private edges: GEdge[] = [];
  private playerPath: number[] = [0]; // start at A
  private gfx!: Phaser.GameObjects.Graphics;
  private pathCostText!: Phaser.GameObjects.Text;

  // Graph: A=0, B=1, C=2, D=3, E=4, F=5
  // Optimal: A→B→D→F cost 8  (2+3+3)
  private readonly EDGE_LIST: [number,number,number][] = [
    [0,1,2],[0,2,5],[1,3,3],[1,4,7],[2,3,6],[2,4,2],[3,5,3],[4,5,4],
  ];

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_GN_2 });
    this.puzzleId = 'gn_2';
    this.puzzleName = 'Courier Dilemma';
    this.puzzleDescription = 'Build the cheapest route from A to F. Click nodes in order.';
  }

  protected getPuzzleBackdropKey(): string | null { return VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_COURIER_DILEMMA_BG; }
  protected getConceptName(): string { return 'Dijkstra Shortest Path'; }

  create(): void {
    super.create();
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2 + 16;

    this.gfx = this.add.graphics().setDepth(1);

    // Layout: A left, F right, B/C upper/lower-mid-left, D/E upper/lower-mid-right
    const positions: [string, number, number][] = [
      ['A', cx - 224, cy],
      ['B', cx - 72, cy - 88],
      ['C', cx - 72, cy + 88],
      ['D', cx + 72, cy - 88],
      ['E', cx + 72, cy + 88],
      ['F', cx + 224, cy],
    ];

    for (let i = 0; i < 6; i++) {
      this.nodes.push({
        id: i,
        label: positions[i][0],
        x: Math.round(positions[i][1] / 8) * 8,
        y: Math.round(positions[i][2] / 8) * 8,
        colorIndex: 0,
        visited: i === 0,
        inPath: i === 0,
        pathIndex: i === 0 ? 0 : -1,
      });
    }

    for (const [a, b, w] of this.EDGE_LIST) {
      this.edges.push({ a, b, weight: w });
    }

    this.pathCostText = this.add.text(cx, height - 64, 'Cost: 0', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
    }).setOrigin(0.5).setDepth(5);

    this.drawEdges();
    this.buildNodeSprites();
    this.refreshVisuals();
  }

  private drawEdges(): void {
    this.gfx.clear();
    for (const e of this.edges) {
      const na = this.nodes[e.a];
      const nb = this.nodes[e.b];
      const inPath = this.isEdgeInPath(e.a, e.b);
      this.gfx.lineStyle(inPath ? 4 : 2, inPath ? COLORS.CYAN_GLOW : 0x346856, 1);
      this.gfx.beginPath();
      this.gfx.moveTo(na.x, na.y);
      this.gfx.lineTo(nb.x, nb.y);
      this.gfx.strokePath();

      if (e.weightText) e.weightText.destroy();
      const mx = Math.round((na.x + nb.x) / 2);
      const my = Math.round((na.y + nb.y) / 2);
      e.weightText = this.add.text(mx, my - 12, String(e.weight), {
        fontSize: '12px', fontFamily: FONTS.RETRO,
        color: inPath ? '#06b6d4' : '#88c070',
      }).setOrigin(0.5).setDepth(4);
    }
  }

  private isEdgeInPath(a: number, b: number): boolean {
    for (let i = 0; i < this.playerPath.length - 1; i++) {
      const pa = this.playerPath[i], pb = this.playerPath[i + 1];
      if ((pa === a && pb === b) || (pa === b && pb === a)) return true;
    }
    return false;
  }

  private buildNodeSprites(): void {
    for (const node of this.nodes) {
      const circle = this.add.arc(node.x, node.y, 26, 0, 360, false, 0x081820)
        .setStrokeStyle(3, 0x346856)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(node.x, node.y, node.label, {
        fontSize: '14px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5).setDepth(3);

      node.circle = circle as unknown as Phaser.GameObjects.Arc;
      node.text = label;

      circle.on('pointerdown', () => this.clickNode(node));
      circle.on('pointerover', () => { if (!node.inPath) circle.setStrokeStyle(3, COLORS.CYAN_GLOW); });
      circle.on('pointerout', () => this.refreshNodeVisual(node));
    }
  }

  private refreshNodeVisual(node: PathNode): void {
    const c = node.circle as unknown as Phaser.GameObjects.Arc;
    if (node.inPath) {
      c.setFillStyle(0x203457).setStrokeStyle(3, COLORS.CYAN_GLOW);
    } else if (this.isReachable(node.id)) {
      c.setFillStyle(0x081820).setStrokeStyle(3, 0xfbbf24);
    } else {
      c.setFillStyle(0x081820).setStrokeStyle(3, 0x346856);
    }
  }

  private isReachable(id: number): boolean {
    const head = this.playerPath[this.playerPath.length - 1];
    return this.edges.some(e =>
      ((e.a === head && e.b === id) || (e.b === head && e.a === id)) && !this.playerPath.includes(id)
    );
  }

  private refreshVisuals(): void {
    for (const node of this.nodes) this.refreshNodeVisual(node);
    this.drawEdges();
    const cost = this.pathCost();
    this.pathCostText.setText(`Cost: ${cost}`);
  }

  private pathCost(): number {
    let total = 0;
    for (let i = 0; i < this.playerPath.length - 1; i++) {
      const a = this.playerPath[i], b = this.playerPath[i + 1];
      const edge = this.edges.find(e => (e.a === a && e.b === b) || (e.b === a && e.a === b));
      total += edge?.weight ?? 0;
    }
    return total;
  }

  private clickNode(node: PathNode): void {
    // Allow clicking the last path node to backtrack
    if (this.playerPath.length > 1 && node.id === this.playerPath[this.playerPath.length - 2]) {
      this.playerPath.pop();
      const removed = this.nodes[this.playerPath[this.playerPath.length - 1]];
      removed.inPath = false;
      this.refreshVisuals();
      return;
    }

    if (!this.isReachable(node.id)) {
      this.showMessage('Not adjacent to your current position!', COLORS.WARNING);
      return;
    }

    node.inPath = true;
    this.playerPath.push(node.id);
    JuiceSystem.correctBurst(this, node.x, node.y);
    audioManager.playTone(440 + node.id * 40, 80, 'square');
    this.refreshVisuals();

    if (node.id === 5) { // reached F
      this.evaluatePath();
    }
  }

  private evaluatePath(): void {
    const cost = this.pathCost();
    const optimal = 8;
    if (cost === optimal) {
      const stars = this.attempts === 0 ? 3 : this.attempts <= 2 ? 2 : 1;
      this.showMessage(`Optimal path! Cost = ${cost}`, COLORS.SUCCESS);
      this.time.delayedCall(800, () => this.onPuzzleComplete(stars));
    } else {
      this.attempts++;
      this.showMessage(`Cost ${cost} — the optimal is ${optimal}. Try again!`, COLORS.WARNING);
      JuiceSystem.wrongBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);
      this.time.delayedCall(1200, () => this.resetPath());
    }
  }

  private resetPath(): void {
    for (const node of this.nodes) {
      node.inPath = node.id === 0;
      node.visited = node.id === 0;
    }
    this.playerPath = [0];
    this.refreshVisuals();
  }

  protected displayHint(n: number): void {
    const hints = [
      'Click reachable nodes (gold border) to build your path. Click a previous node to backtrack.',
      'Compare edge weights, not hop counts. A cheaper detour often beats a direct long edge.',
      'Optimal cost is 8. Try A→B(2)→D(3)→F(3).',
    ];
    this.showMessage(hints[n - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }
}

// ─── P7_3_CycleCourt — Cycle Detection ──────────────────────────────────────

interface CycleEdge extends GEdge {
  hitArea?: Phaser.GameObjects.Rectangle;
  isBackEdge: boolean;
}

export class P7_3_CycleCourt extends BasePuzzleScene {
  private nodes: GNode[] = [];
  private edges: CycleEdge[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private round = 0;

  // 3 rounds: each has a graph and a back-edge answer
  private readonly ROUNDS = [
    {
      // Pentagon A-B-C-D-E + chord B-D
      nodeLabels: ['A','B','C','D','E'],
      edgePairs: [[0,1],[1,2],[2,3],[3,4],[4,0],[1,3]],
      backEdge: [1,3] as [number,number],
      desc: 'Which edge creates the cycle?',
    },
    {
      // 4-node: A-B-C-D-A + extra B-D chord
      nodeLabels: ['A','B','C','D'],
      edgePairs: [[0,1],[1,2],[2,3],[3,0],[1,3]],
      backEdge: [1,3] as [number,number],
      desc: 'Click the edge that closes a cycle.',
    },
    {
      // 5-node: chain A-B-C-D-E + back A-E
      nodeLabels: ['A','B','C','D','E'],
      edgePairs: [[0,1],[1,2],[2,3],[3,4],[4,0],[0,4]],
      backEdge: [0,4] as [number,number],
      desc: 'Find the back edge that creates the loop.',
    },
  ];

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_GN_3 });
    this.puzzleId = 'gn_3';
    this.puzzleName = 'Cycle Court';
    this.puzzleDescription = 'Identify the edge that creates a cycle in the graph.';
  }

  protected getPuzzleBackdropKey(): string | null { return VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_CYCLE_BAZAAR_BG; }
  protected getConceptName(): string { return 'Cycle Detection'; }

  create(): void {
    super.create();
    this.gfx = this.add.graphics().setDepth(1);
    this.loadRound();
  }

  private loadRound(): void {
    // Clean up previous
    for (const e of this.edges) { e.hitArea?.destroy(); e.weightText?.destroy(); }
    for (const n of this.nodes) { n.circle?.destroy(); n.text?.destroy(); }
    this.nodes = [];
    this.edges = [];
    this.gfx.clear();

    const { width, height } = this.cameras.main;
    const roundData = this.ROUNDS[this.round];
    const n = roundData.nodeLabels.length;
    const cx = width / 2;
    const cy = height / 2 + 24;
    const r = 110;

    this.showMessage(`Round ${this.round + 1}: ${roundData.desc}`, COLORS.TEXT_LIGHT);

    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI / n) * i - Math.PI / 2;
      const node: GNode = {
        id: i,
        label: roundData.nodeLabels[i],
        x: Math.round((cx + Math.cos(angle) * r) / 8) * 8,
        y: Math.round((cy + Math.sin(angle) * r) / 8) * 8,
        colorIndex: 0,
      };
      node.circle = this.add.arc(node.x, node.y, 22, 0, 360, false, 0x203457)
        .setStrokeStyle(2, 0x88c070).setDepth(2);
      node.text = this.add.text(node.x, node.y, node.label, {
        fontSize: '12px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5).setDepth(3);
      this.nodes.push(node);
    }

    for (const [a, b] of roundData.edgePairs) {
      const isBackEdge = (a === roundData.backEdge[0] && b === roundData.backEdge[1]) ||
                         (b === roundData.backEdge[0] && a === roundData.backEdge[1]);
      const edge: CycleEdge = { a, b, isBackEdge };
      this.edges.push(edge);
    }

    this.drawEdgesWithHitAreas();
  }

  private drawEdgesWithHitAreas(): void {
    this.gfx.clear();
    for (const e of this.edges) {
      e.hitArea?.destroy();
      const na = this.nodes[e.a], nb = this.nodes[e.b];

      this.gfx.lineStyle(3, 0x346856, 1);
      this.gfx.beginPath();
      this.gfx.moveTo(na.x, na.y);
      this.gfx.lineTo(nb.x, nb.y);
      this.gfx.strokePath();

      const mx = (na.x + nb.x) / 2;
      const my = (na.y + nb.y) / 2;
      const len = Math.hypot(nb.x - na.x, nb.y - na.y);
      const angle = Math.atan2(nb.y - na.y, nb.x - na.x);

      const hit = this.add.rectangle(mx, my, len, 24, 0xffffff, 0)
        .setRotation(angle).setDepth(4).setInteractive({ useHandCursor: true });
      e.hitArea = hit;

      hit.on('pointerover', () => {
        this.gfx.lineStyle(4, COLORS.CYAN_GLOW, 1);
        this.gfx.beginPath();
        this.gfx.moveTo(na.x, na.y);
        this.gfx.lineTo(nb.x, nb.y);
        this.gfx.strokePath();
      });
      hit.on('pointerout', () => this.drawEdgesWithHitAreas());
      hit.on('pointerdown', () => this.clickEdge(e));
    }
  }

  private clickEdge(edge: CycleEdge): void {
    if (edge.isBackEdge) {
      JuiceSystem.correctBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);
      audioManager.playCorrectTone();

      // Flash the back edge cyan
      this.gfx.lineStyle(5, COLORS.CYAN_GLOW, 1);
      this.gfx.beginPath();
      this.gfx.moveTo(this.nodes[edge.a].x, this.nodes[edge.a].y);
      this.gfx.lineTo(this.nodes[edge.b].x, this.nodes[edge.b].y);
      this.gfx.strokePath();

      this.round++;
      if (this.round >= this.ROUNDS.length) {
        const stars = this.attempts === 0 ? 3 : this.attempts <= 3 ? 2 : 1;
        this.time.delayedCall(700, () => this.onPuzzleComplete(stars));
      } else {
        this.showMessage('Cycle found!', COLORS.SUCCESS);
        this.time.delayedCall(800, () => this.loadRound());
      }
    } else {
      this.attempts++;
      JuiceSystem.wrongBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);
      this.showMessage('That edge is a tree edge — it does not close a cycle.', COLORS.WARNING);
      this.drawEdgesWithHitAreas();
    }
  }

  protected displayHint(n: number): void {
    const hints = [
      'A back edge connects a node to an ancestor already in the current DFS path.',
      'Look for an edge that bypasses tree edges — a "shortcut" that would form a loop.',
      'The chord between two non-adjacent polygon nodes is the back edge.',
    ];
    this.showMessage(hints[n - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }
}

// ─── P7_4_ComponentFields — Connected Components (Flood Fill) ───────────────

interface CompNode extends GNode {
  component: number; // 0=unvisited, 1/2/3=component id
  revealed: boolean;
}

export class P7_4_ComponentFields extends BasePuzzleScene {
  private nodes: CompNode[] = [];
  private edges: GEdge[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private componentCount = 0;
  private readonly COMP_COLORS = [0x346856, 0x5050e0, 0xe09020, 0x20a070];

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_GN_4 });
    this.puzzleId = 'gn_4';
    this.puzzleName = 'Island Census';
    this.puzzleDescription = 'Click any node to flood-fill its connected component.';
  }

  protected getPuzzleBackdropKey(): string | null { return VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_ISLAND_CENSUS_BG; }
  protected getConceptName(): string { return 'Connected Components'; }

  create(): void {
    super.create();
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2 + 16;
    this.gfx = this.add.graphics().setDepth(1);

    // 3 disconnected components:
    // Comp 1: A-B-C (triangle, top-left cluster)
    // Comp 2: D-E-F (chain, top-right cluster)
    // Comp 3: G-H (pair, bottom-center)
    const layout: [string, number, number, number][] = [
      ['A', cx - 192, cy - 80, 1],
      ['B', cx - 136, cy - 136, 1],
      ['C', cx - 80, cy - 80, 1],
      ['D', cx + 80, cy - 120, 2],
      ['E', cx + 160, cy - 80, 2],
      ['F', cx + 128, cy - 32, 2],
      ['G', cx - 32, cy + 80, 3],
      ['H', cx + 64, cy + 80, 3],
    ];

    for (let i = 0; i < layout.length; i++) {
      const [label, x, y, comp] = layout[i];
      const node: CompNode = {
        id: i, label, x: Math.round(x / 8) * 8, y: Math.round(y / 8) * 8,
        colorIndex: 0, component: comp, revealed: false,
      };
      this.nodes.push(node);
    }

    // Intra-component edges
    const edgePairs = [[0,1],[1,2],[2,0],[3,4],[4,5],[6,7]];
    for (const [a, b] of edgePairs) this.edges.push({ a, b });

    this.drawEdges();
    this.buildNodeSprites();

    this.add.text(cx, height - 56, 'Components found: 0 / 3', {
      fontSize: '14px', fontFamily: FONTS.RETRO, color: '#88c070',
    }).setOrigin(0.5).setDepth(5).setName('counter');
  }

  private drawEdges(): void {
    this.gfx.clear();
    for (const e of this.edges) {
      const na = this.nodes[e.a], nb = this.nodes[e.b];
      const color = na.revealed ? this.COMP_COLORS[na.component] : 0x346856;
      this.gfx.lineStyle(3, color, 1);
      this.gfx.beginPath();
      this.gfx.moveTo(na.x, na.y);
      this.gfx.lineTo(nb.x, nb.y);
      this.gfx.strokePath();
    }
  }

  private buildNodeSprites(): void {
    for (const node of this.nodes) {
      const circle = this.add.arc(node.x, node.y, 22, 0, 360, false, 0x081820)
        .setStrokeStyle(2, 0x346856).setDepth(2).setInteractive({ useHandCursor: true });
      const label = this.add.text(node.x, node.y, node.label, {
        fontSize: '12px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5).setDepth(3);

      node.circle = circle;
      node.text = label;

      circle.on('pointerover', () => { if (!node.revealed) circle.setStrokeStyle(2, COLORS.CYAN_GLOW); });
      circle.on('pointerout', () => { if (!node.revealed) circle.setStrokeStyle(2, 0x346856); });
      circle.on('pointerdown', () => this.floodFill(node));
    }
  }

  private floodFill(startNode: CompNode): void {
    if (startNode.revealed) {
      this.showMessage('Already mapped!', COLORS.TEXT_MUTED);
      return;
    }

    const compId = startNode.component;
    const compColor = this.COMP_COLORS[compId];
    const toFill = this.nodes.filter(n => n.component === compId);

    // BFS-style sequential reveal with delay
    toFill.forEach((node, i) => {
      this.time.delayedCall(i * 120, () => {
        node.revealed = true;
        node.circle!.setFillStyle(compColor).setStrokeStyle(2, compColor);
        JuiceSystem.correctBurst(this, node.x, node.y);
        audioManager.playTone(300 + compId * 80, 60, 'sine');
        this.drawEdges();
      });
    });

    this.time.delayedCall(toFill.length * 120 + 100, () => {
      this.componentCount++;
      const counter = this.children.getByName('counter') as Phaser.GameObjects.Text | null;
      if (counter) counter.setText(`Components found: ${this.componentCount} / 3`);
      this.showMessage(`Component ${this.componentCount} mapped! ${toFill.length} nodes.`, COLORS.SUCCESS);

      if (this.componentCount === 3) {
        const stars = this.attempts === 0 ? 3 : this.attempts <= 2 ? 2 : 1;
        this.time.delayedCall(800, () => this.onPuzzleComplete(stars));
      }
    });
  }

  protected displayHint(n: number): void {
    const hints = [
      'Click any unvisited node to flood-fill its component. Nodes that share edges belong together.',
      'There are exactly 3 separate groups. Each click reveals one group.',
      'Top-left triangle, top-right chain, and bottom pair are the three components.',
    ];
    this.showMessage(hints[n - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }
}

// ─── Boss_Echo — 3-Phase Graph Mastery ──────────────────────────────────────

type EchoPhase = 'coloring' | 'shortestPath' | 'components';

export class Boss_Echo extends BasePuzzleScene {
  private phase: EchoPhase = 'coloring';
  private phaseLabel!: Phaser.GameObjects.Text;
  private gfx!: Phaser.GameObjects.Graphics;

  // --- Phase 1: Coloring ---
  private colorNodes: GNode[] = [];
  private colorEdges: GEdge[] = [];

  // --- Phase 2: Shortest Path ---
  private pathNodes: PathNode[] = [];
  private pathEdges: GEdge[] = [];
  private playerPath: number[] = [0];
  private pathCostText!: Phaser.GameObjects.Text;

  // --- Phase 3: Components ---
  private compNodes: CompNode[] = [];
  private compEdges: GEdge[] = [];
  private componentCount = 0;
  private readonly COMP_COLORS = [0x346856, 0x5050e0, 0xe09020];

  private readonly PATH_EDGE_LIST: [number,number,number][] = [
    [0,1,3],[0,2,6],[1,3,4],[1,4,8],[2,3,5],[2,4,2],[3,5,4],[4,5,3],
  ];

  constructor() {
    super({ key: SCENE_KEYS.BOSS_ECHO });
    this.puzzleId = 'boss_echo';
    this.puzzleName = 'The Echo';
    this.puzzleDescription = 'Three graph challenges. Prove mastery.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey(): string | null { return VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_ECHO_BG; }
  protected getPuzzleFrameFillAlpha(): number { return 0.035; }
  protected shouldSkipConceptBridge(): boolean { return true; }
  protected getConceptName(): string { return 'Graph Mastery'; }

  create(): void {
    super.create();
    const { width, height } = this.cameras.main;
    this.gfx = this.add.graphics().setDepth(1);

    this.phaseLabel = this.add.text(width / 2, height - 40, 'Phase 1/3: Graph Coloring', {
      fontSize: '12px', fontFamily: FONTS.RETRO, color: '#fbbf24',
    }).setOrigin(0.5).setDepth(5);

    this.pathCostText = this.add.text(width / 2, height - 56, '', {
      fontSize: '12px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
    }).setOrigin(0.5).setDepth(5);

    this.buildPhase1();
  }

  // ── Phase 1: Coloring ────────────────────────────────────────────────────

  private buildPhase1(): void {
    const { width, height } = this.cameras.main;
    const cx = width / 2, cy = height / 2 + 16;
    const r = 104;
    const labels = ['A','B','C','D','E'];
    this.colorNodes = [];
    this.colorEdges = [];

    for (let i = 0; i < 5; i++) {
      const angle = (2 * Math.PI / 5) * i - Math.PI / 2;
      this.colorNodes.push({
        id: i, label: labels[i], colorIndex: 0,
        x: Math.round((cx + Math.cos(angle) * r) / 8) * 8,
        y: Math.round((cy + Math.sin(angle) * r) / 8) * 8,
      });
    }
    [[0,1],[1,2],[2,3],[3,4],[4,0],[0,2],[1,3]].forEach(([a,b]) => this.colorEdges.push({ a, b }));

    this.drawColorEdges();
    for (const node of this.colorNodes) {
      node.circle = this.add.arc(node.x, node.y, 22, 0, 360, false, PALETTE[0])
        .setDepth(2).setInteractive({ useHandCursor: true });
      node.text = this.add.text(node.x, node.y, node.label, {
        fontSize: '12px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5).setDepth(3);
      node.circle.on('pointerdown', () => this.cycleColorBoss(node));
      node.circle.on('pointerover', () => { if (node.colorIndex === 0) node.circle!.setFillStyle(COLORS.CYAN_GLOW); });
      node.circle.on('pointerout', () => node.circle!.setFillStyle(PALETTE[node.colorIndex]));
    }
  }

  private drawColorEdges(): void {
    for (const e of this.colorEdges) {
      const na = this.colorNodes[e.a], nb = this.colorNodes[e.b];
      const conflict = na.colorIndex !== 0 && nb.colorIndex !== 0 && na.colorIndex === nb.colorIndex;
      this.gfx.lineStyle(3, conflict ? 0xff2020 : 0x346856, 1);
      this.gfx.beginPath();
      this.gfx.moveTo(na.x, na.y);
      this.gfx.lineTo(nb.x, nb.y);
      this.gfx.strokePath();
    }
  }

  private cycleColorBoss(node: GNode): void {
    node.colorIndex = (node.colorIndex % 3) + 1;
    node.circle!.setFillStyle(PALETTE[node.colorIndex]);
    this.gfx.clear();
    this.drawColorEdges();

    const allColored = this.colorNodes.every(n => n.colorIndex !== 0);
    const hasConflict = this.colorEdges.some(e => {
      const na = this.colorNodes[e.a], nb = this.colorNodes[e.b];
      return na.colorIndex !== 0 && nb.colorIndex !== 0 && na.colorIndex === nb.colorIndex;
    });

    if (allColored && !hasConflict) {
      JuiceSystem.screenFlash(this, COLORS.SUCCESS, 0.08, 200);
      this.showMessage('Graph colored! Moving to Phase 2...', COLORS.SUCCESS);
      for (const n of this.colorNodes) { n.circle?.destroy(); n.text?.destroy(); }
      this.gfx.clear();
      this.time.delayedCall(1200, () => this.startPhase2());
    }
  }

  // ── Phase 2: Shortest Path ───────────────────────────────────────────────

  private startPhase2(): void {
    this.phase = 'shortestPath';
    this.phaseLabel.setText('Phase 2/3: Shortest Path A→F');
    this.playerPath = [0];

    const { width, height } = this.cameras.main;
    const cx = width / 2, cy = height / 2 + 16;
    this.pathNodes = [];
    this.pathEdges = [];

    const positions: [string, number, number][] = [
      ['A', cx - 200, cy], ['B', cx - 64, cy - 80], ['C', cx - 64, cy + 80],
      ['D', cx + 64, cy - 80], ['E', cx + 64, cy + 80], ['F', cx + 200, cy],
    ];
    for (let i = 0; i < 6; i++) {
      this.pathNodes.push({
        id: i, label: positions[i][0],
        x: Math.round(positions[i][1] / 8) * 8,
        y: Math.round(positions[i][2] / 8) * 8,
        colorIndex: 0, visited: i === 0, inPath: i === 0, pathIndex: i === 0 ? 0 : -1,
      });
    }
    for (const [a, b, w] of this.PATH_EDGE_LIST) this.pathEdges.push({ a, b, weight: w });

    this.pathCostText.setText('Cost: 0');
    this.drawPathEdges();
    this.buildPathSprites();
  }

  private drawPathEdges(): void {
    this.gfx.clear();
    for (const e of this.pathEdges) {
      const na = this.pathNodes[e.a], nb = this.pathNodes[e.b];
      const inPath = this.isPathEdge(e.a, e.b);
      this.gfx.lineStyle(inPath ? 4 : 2, inPath ? COLORS.CYAN_GLOW : 0x346856, 1);
      this.gfx.beginPath();
      this.gfx.moveTo(na.x, na.y); this.gfx.lineTo(nb.x, nb.y);
      this.gfx.strokePath();

      if (e.weightText) e.weightText.destroy();
      const mx = Math.round((na.x + nb.x) / 2), my = Math.round((na.y + nb.y) / 2);
      e.weightText = this.add.text(mx, my - 10, String(e.weight), {
        fontSize: '11px', fontFamily: FONTS.RETRO,
        color: inPath ? '#06b6d4' : '#88c070',
      }).setOrigin(0.5).setDepth(4);
    }
  }

  private isPathEdge(a: number, b: number): boolean {
    for (let i = 0; i < this.playerPath.length - 1; i++) {
      const pa = this.playerPath[i], pb = this.playerPath[i + 1];
      if ((pa === a && pb === b) || (pa === b && pb === a)) return true;
    }
    return false;
  }

  private buildPathSprites(): void {
    for (const node of this.pathNodes) {
      node.circle = this.add.arc(node.x, node.y, 22, 0, 360, false, 0x081820)
        .setStrokeStyle(3, node.id === 0 ? COLORS.CYAN_GLOW : 0x346856)
        .setDepth(2).setInteractive({ useHandCursor: true });
      node.text = this.add.text(node.x, node.y, node.label, {
        fontSize: '12px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5).setDepth(3);
      node.circle.on('pointerdown', () => this.clickPathNode(node));
    }
  }

  private pathCostBoss(): number {
    let total = 0;
    for (let i = 0; i < this.playerPath.length - 1; i++) {
      const a = this.playerPath[i], b = this.playerPath[i + 1];
      const e = this.pathEdges.find(e => (e.a === a && e.b === b) || (e.b === a && e.a === b));
      total += e?.weight ?? 0;
    }
    return total;
  }

  private isPathReachable(id: number): boolean {
    const head = this.playerPath[this.playerPath.length - 1];
    return this.pathEdges.some(e =>
      ((e.a === head && e.b === id) || (e.b === head && e.a === id)) && !this.playerPath.includes(id)
    );
  }

  private clickPathNode(node: PathNode): void {
    if (this.phase !== 'shortestPath') return;

    if (this.playerPath.length > 1 && node.id === this.playerPath[this.playerPath.length - 2]) {
      this.playerPath.pop();
      const c = this.pathNodes[this.playerPath[this.playerPath.length - 1]].circle as unknown as Phaser.GameObjects.Arc;
      c?.setStrokeStyle(3, COLORS.CYAN_GLOW);
    } else {
      if (!this.isPathReachable(node.id)) return;
      node.inPath = true;
      this.playerPath.push(node.id);
    }

    const cost = this.pathCostBoss();
    this.pathCostText.setText(`Cost: ${cost}`);
    this.drawPathEdges();

    if (this.playerPath[this.playerPath.length - 1] === 5) {
      // Optimal paths: A→B→D→F=11, A→C→E→F=11; accept ≤ 11
      if (cost <= 11) {
        this.showMessage('Path found! Moving to Phase 3...', COLORS.SUCCESS);
        JuiceSystem.screenFlash(this, COLORS.SUCCESS, 0.08, 200);
        for (const n of this.pathNodes) { n.circle?.destroy(); n.text?.destroy(); }
        for (const e of this.pathEdges) e.weightText?.destroy();
        this.gfx.clear();
        this.pathCostText.setText('');
        this.time.delayedCall(1200, () => this.startPhase3());
      } else {
        this.attempts++;
        this.showMessage(`Cost ${cost} is too high! Try a cheaper route.`, COLORS.WARNING);
        for (const n of this.pathNodes) { n.inPath = n.id === 0; }
        this.playerPath = [0];
        this.drawPathEdges();
      }
    }
  }

  // ── Phase 3: Components ──────────────────────────────────────────────────

  private startPhase3(): void {
    this.phase = 'components';
    this.phaseLabel.setText('Phase 3/3: Find All Components');
    this.componentCount = 0;
    this.compNodes = [];
    this.compEdges = [];

    const { width, height } = this.cameras.main;
    const cx = width / 2, cy = height / 2 + 16;

    const layout: [string, number, number, number][] = [
      ['A', cx - 192, cy - 72, 1], ['B', cx - 128, cy - 128, 1], ['C', cx - 64, cy - 72, 1],
      ['D', cx + 72, cy - 104, 2], ['E', cx + 152, cy - 72, 2],
      ['F', cx - 48, cy + 72, 3], ['G', cx + 32, cy + 72, 3], ['H', cx + 112, cy + 72, 3],
    ];

    for (let i = 0; i < layout.length; i++) {
      const [label, x, y, comp] = layout[i];
      const node: CompNode = {
        id: i, label, colorIndex: 0, component: comp, revealed: false,
        x: Math.round(x / 8) * 8, y: Math.round(y / 8) * 8,
      };
      this.compNodes.push(node);
    }

    [[0,1],[1,2],[2,0],[3,4],[5,6],[6,7]].forEach(([a,b]) => this.compEdges.push({ a, b }));

    this.drawCompEdges();
    for (const node of this.compNodes) {
      node.circle = this.add.arc(node.x, node.y, 20, 0, 360, false, 0x081820)
        .setStrokeStyle(2, 0x346856).setDepth(2).setInteractive({ useHandCursor: true });
      node.text = this.add.text(node.x, node.y, node.label, {
        fontSize: '11px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
      }).setOrigin(0.5).setDepth(3);
      node.circle.on('pointerover', () => { if (!node.revealed) node.circle!.setStrokeStyle(2, COLORS.CYAN_GLOW); });
      node.circle.on('pointerout', () => { if (!node.revealed) node.circle!.setStrokeStyle(2, 0x346856); });
      node.circle.on('pointerdown', () => this.floodFillBoss(node));
    }
  }

  private drawCompEdges(): void {
    this.gfx.clear();
    for (const e of this.compEdges) {
      const na = this.compNodes[e.a], nb = this.compNodes[e.b];
      const color = na.revealed ? this.COMP_COLORS[na.component - 1] : 0x346856;
      this.gfx.lineStyle(3, color, 1);
      this.gfx.beginPath();
      this.gfx.moveTo(na.x, na.y); this.gfx.lineTo(nb.x, nb.y);
      this.gfx.strokePath();
    }
  }

  private floodFillBoss(startNode: CompNode): void {
    if (this.phase !== 'components' || startNode.revealed) return;
    const compId = startNode.component;
    const compColor = this.COMP_COLORS[compId - 1];
    const toFill = this.compNodes.filter(n => n.component === compId);

    toFill.forEach((node, i) => {
      this.time.delayedCall(i * 100, () => {
        node.revealed = true;
        node.circle!.setFillStyle(compColor).setStrokeStyle(2, compColor);
        JuiceSystem.correctBurst(this, node.x, node.y);
        this.drawCompEdges();
      });
    });

    this.time.delayedCall(toFill.length * 100 + 200, () => {
      this.componentCount++;
      this.showMessage(`Component ${this.componentCount}/3 found!`, COLORS.SUCCESS);
      if (this.componentCount === 3) {
        const stars = this.attempts === 0 ? 3 : this.attempts <= 4 ? 2 : 1;
        this.time.delayedCall(800, () => this.onPuzzleComplete(stars));
      }
    });
  }

  protected displayHint(n: number): void {
    const hints: Record<EchoPhase, string[]> = {
      coloring: ['Color nodes so no two connected nodes share a color.', 'Try cycling all nodes to color 1 first, then fix conflicts.'],
      shortestPath: ['Click reachable nodes (check edges) to build your path toward F.', 'Compare total weights — choose cheaper edges.'],
      components: ['Click any unvisited node to flood-fill its connected group.', 'There are 3 separate islands in this graph.'],
    };
    const msgs = hints[this.phase];
    this.showMessage(msgs[Math.min(n - 1, msgs.length - 1)], COLORS.GOLD_ACCENT);
  }
}
