import Phaser from 'phaser';
import { COLORS, s } from './tokens';
import { TIMING } from './motion';
import { paintAtmosphere } from './visuals/atmosphere';
import { paintPlatform, paintEdgeVignette } from './visuals/platform';
import { ensureTileTextures } from './visuals/runeTile';
import { buildPrologueHud, type PrologueHud } from './visuals/prologueHud';
import { createDialogueBox, type DialogueBox } from './visuals/dialogueBox';
import { createSequencePanel, type SequencePanel } from './visuals/sequencePanel';
import {
  cellKey,
  cellWorldPos,
  flashCellError,
  getNeighbors,
  IsoGrid,
  dimPathTiles,
  flashTileOn,
  markCellDone,
  mountIsoGrid,
  nearestCell,
  steerFrom,
  TILE_H,
  TILE_W,
  unmountIsoGrid,
  type GridPos,
} from './isogrid';
import { PATH_ROUNDS } from './pathRounds';
import { bindInput } from './input';
import { canAcceptStep, STATE_LABEL, type PuzzleState } from './state';
import { readReduceMotion, writeReduceMotion } from './prefs';
import { chantRing, stepCorrect, stepMistake, winCascade } from './feedback';
import { GAME, PENALTIES, POINTS } from '../../game/state';
import {
  completeAlgorithmiaPuzzle,
  PROLOGUE_RUN_UI_KEY,
  resolveReturnScene,
} from '../../game/algorithmiaIntegration';
import { scorePopup } from '../../ui/popups';
import { hexColorToNumber, sparkle } from '../../ui/particles';
import { comboMilestone } from '../../game/milestone';
import {
  OVERWORLD_PLAYER_SPRITE_ASSETS,
  P0_1_PUZZLE_ASSETS,
  PROLOGUE_SHEET_KEYS,
  VISUAL_REVAMP_KEYS,
} from '../../../config/assets';
import { MOTION } from './motion';
import { SCENE_KEYS } from '../../../config/constants';

const HIT_RADIUS = Math.max(TILE_W, TILE_H) * 0.72;

const ROUND_TIMERS = [22000, 28000, 35000, 40000];
const TIME_BONUS_MAX = [200, 240, 280, 320];
const PERFECT_BONUS = [250, 280, 320, 360];

export class FollowThePathScene extends Phaser.Scene {
  private hud!: PrologueHud;
  private dialogue!: DialogueBox;
  private seqPanel: SequencePanel | null = null;
  private grid: IsoGrid | null = null;
  private traceG!: Phaser.GameObjects.Graphics;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerGlow!: Phaser.GameObjects.Arc;
  private runeKeeper: Phaser.GameObjects.Image | null = null;

  private state: PuzzleState = 'idle';
  private wave = 0;
  private hopIndex = 0;
  private playerPos: GridPos = { row: 5, col: 2 };

  private hasArenaArt = false;
  private reduceMotion = false;
  private unbindInput?: () => void;
  private returnScene: string = SCENE_KEYS.PROLOGUE;
  private startedAt = Date.now();

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_P0_1 });
  }

  init(data?: { returnScene?: string }): void {
    this.returnScene = resolveReturnScene(data);
  }

  preload(): void {
    for (const asset of OVERWORLD_PLAYER_SPRITE_ASSETS) {
      if (!this.textures.exists(asset.key)) {
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth ?? 32,
          frameHeight: asset.frameHeight ?? 32,
        });
      }
    }

    for (const asset of P0_1_PUZZLE_ASSETS) {
      if (this.textures.exists(asset.key)) continue;
      if (asset.frameWidth && asset.frameHeight) {
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
        });
      } else {
        this.load.image(asset.key, asset.path);
      }
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg.deep);
    this.startedAt = Date.now();
    this.reduceMotion = readReduceMotion();

    GAME.reset();
    GAME.setCurrentPuzzle(this.scene.key);
    if (!this.scene.isActive(PROLOGUE_RUN_UI_KEY)) this.scene.launch(PROLOGUE_RUN_UI_KEY);
    this.scene.bringToTop(PROLOGUE_RUN_UI_KEY);

    // ── Visual layers ────────────────────────────────────────────────────────
    // paintPlatform returns true when the stone_arena art is used — in that case
    // the baked-in space background makes procedural atmosphere / edge fog redundant.
    this.hasArenaArt = paintPlatform(this);
    if (!this.hasArenaArt) {
      paintAtmosphere(this);
      paintEdgeVignette(this);
    }
    ensureTileTextures(this);

    this.traceG = this.add.graphics().setDepth(30);
    this.spawnRuneKeeper();
    this.buildPlayerSprite();

    this.hud = buildPrologueHud(this);
    this.dialogue = createDialogueBox(this);

    // ── Input ────────────────────────────────────────────────────────────────
    this.unbindInput = bindInput(this, {
      onSteer: (dx, dy) => this.steer(dx, dy),
      onPickWorld: (x, y) => this.pickAt(x, y),
      onHoverWorld: (x, y) => this.hoverAt(x, y),
      onReplay: () => void this.replay(),
      onToggleReduceMotion: () => this.toggleReduceMotion(),
    });

    const esc = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    esc?.on('down', this.exitScene, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      esc?.removeAllListeners();
      this.unbindInput?.();
    });

    void this.runRound(0);
  }

  // ── Round lifecycle ─────────────────────────────────────────────────────────

  private async runRound(index: number): Promise<void> {
    this.wave = index;
    this.tearDown();

    const round = PATH_ROUNDS[index]!;
    this.grid = mountIsoGrid(this, round.field, round.path, this.hasArenaArt);
    this.playerPos = { ...round.path[0]! };
    this.hopIndex = 0;

    // Sequence panel: one tile-lit-at-a-time panel — rebuild each round
    this.seqPanel = createSequencePanel(this, round.path);

    this.hud.setRound(index + 1, PATH_ROUNDS.length);
    this.hud.showRoundTitle(round.principle);
    this.dialogue.show('Rune Keeper', round.npcLine);

    this.positionPlayer(this.playerPos);

    // Start dark — flashTileOn in chantStep lights one tile at a time
    dimPathTiles(this.grid, this);
    this.setState('preview');
    await this.runPreview();
    this.positionPlayer(this.playerPos); // reset sprite to start after preview walk
    // Tiles are already dark — flashTileOn faded them individually
    this.setState('turn');
    GAME.startRound(ROUND_TIMERS[index] ?? 28000);
  }

  private async runPreview(): Promise<void> {
    if (!this.grid) return;
    const path = PATH_ROUNDS[this.wave]!.path;
    for (let i = 0; i < path.length; i++) {
      await this.chantStep(path[i]!, i > 0 ? path[i - 1]! : undefined);
    }
  }

  private chantStep(pos: GridPos, prevPos?: GridPos): Promise<void> {
    const { x, y } = cellWorldPos(pos.row, pos.col);
    chantRing(this, new Phaser.Math.Vector2(x, y));
    // Sequential tile reveal — light this tile briefly then fade back out
    if (this.grid) flashTileOn(this.grid, pos.row, pos.col, this, TIMING.chantStep - 100);
    if (prevPos) void this.walkPlayerTo(prevPos, pos);
    return new Promise<void>((resolve) =>
      this.time.delayedCall(TIMING.chantStep, () => resolve()),
    );
  }

  private async replay(): Promise<void> {
    if (this.state !== 'turn' || !this.grid) return;
    this.hopIndex = 0;
    this.playerPos = { ...PATH_ROUNDS[this.wave]!.path[0]! };
    this.positionPlayer(this.playerPos);
    this.traceG.clear();
    dimPathTiles(this.grid, this);
    this.setState('preview');
    await this.runPreview();
    this.setState('turn');
  }

  private async finishRound(): Promise<void> {
    if (!this.grid) return;
    this.setState('cleared');

    const path = PATH_ROUNDS[this.wave]!.path;
    const bonuses = GAME.endRound(
      TIME_BONUS_MAX[this.wave] ?? 240,
      PERFECT_BONUS[this.wave] ?? 280,
    );

    const lastPos = path[path.length - 1]!;
    const lastAt = new Phaser.Math.Vector2(
      cellWorldPos(lastPos.row, lastPos.col).x,
      cellWorldPos(lastPos.row, lastPos.col).y,
    );
    this.spawnBonusPopups(lastAt, bonuses);

    const pathPoints = path.map((p) => {
      const w = cellWorldPos(p.row, p.col);
      return new Phaser.Math.Vector2(w.x, w.y);
    });
    this.npcReact('win');
    await winCascade(this, pathPoints, this.reduceMotion);
    await this.wait(TIMING.winHold);

    if (this.wave + 1 < PATH_ROUNDS.length) {
      void this.runRound(this.wave + 1);
      return;
    }

    this.dialogue.hide();
    this.hud.showSummary('Sequencing learned. The chant is yours.');
    this.hud.showPromptNext('Return to the Chamber');

    this.time.delayedCall(1700, () =>
      completeAlgorithmiaPuzzle(this, {
        puzzleId: 'p0_1',
        puzzleName: 'Follow the Path',
        concept: 'Sequential Processing',
        returnScene: this.returnScene,
        startedAt: this.startedAt,
      }),
    );
  }

  // ── Input handlers ──────────────────────────────────────────────────────────

  private pickAt(worldX: number, worldY: number): void {
    if (!canAcceptStep(this.state) || !this.grid) return;
    const cell = nearestCell(this.grid, worldX, worldY, HIT_RADIUS);
    if (!cell) return;
    this.tryHop({ row: cell.row, col: cell.col });
  }

  private hoverAt(worldX: number, worldY: number): void {
    if (!canAcceptStep(this.state) || !this.grid) return;
    const legal = new Set(
      getNeighbors(this.grid, this.playerPos.row, this.playerPos.col).map((n) =>
        cellKey(n.row, n.col),
      ),
    );
    this.grid.cells.forEach((cell, key) => {
      const isCurrentPos = cell.row === this.playerPos.row && cell.col === this.playerPos.col;
      const isLegal = legal.has(key);
      if (isCurrentPos) {
        cell.base.setAlpha(1);
      } else if (isLegal) {
        const d = Phaser.Math.Distance.Between(worldX, worldY, cell.x, cell.y);
        cell.base.setAlpha(d < HIT_RADIUS ? 1 : 0.78);
      } else {
        cell.base.setAlpha(0.42);
      }
    });
  }

  private steer(dx: number, dy: number): void {
    if (!canAcceptStep(this.state) || !this.grid) return;
    const next = steerFrom(this.grid, this.playerPos.row, this.playerPos.col, dx, dy);
    if (next) this.tryHop(next);
  }

  // ── Step validation ─────────────────────────────────────────────────────────

  private tryHop(candidate: GridPos): void {
    if (!this.grid) return;

    // Must be a neighbor of the current position
    const neighbors = getNeighbors(this.grid, this.playerPos.row, this.playerPos.col);
    const isNeighbor = neighbors.some(
      (n) => n.row === candidate.row && n.col === candidate.col,
    );
    if (!isNeighbor) return;

    const path = PATH_ROUNDS[this.wave]!.path;
    const expected = path[this.hopIndex + 1];
    if (!expected) return;

    const { x, y } = cellWorldPos(candidate.row, candidate.col);
    const at = new Phaser.Math.Vector2(x, y);

    if (candidate.row === expected.row && candidate.col === expected.col) {
      this.onCorrectHop(candidate, at);
    } else {
      const cell = this.grid.cells.get(cellKey(candidate.row, candidate.col));
      if (cell) {
        stepMistake(this, cell.base, at, this.reduceMotion);
      }
      this.onWrongHop(candidate);
    }
  }

  private onCorrectHop(pos: GridPos, at: Phaser.Math.Vector2): void {
    if (!this.grid) return;
    const prevPos = { ...this.playerPos };
    this.hopIndex++;
    this.playerPos = { ...pos };

    markCellDone(this.grid, pos.row, pos.col, this);
    stepCorrect(this, at);
    this.paintTrace();
    void this.walkPlayerTo(prevPos, pos);
    this.seqPanel?.update(this.hopIndex);
    this.npcReact('correct');

    // Reset alpha dimming from hover
    this.grid.cells.forEach((c) => c.base.setAlpha(1));

    GAME.bumpCombo();
    const awarded = GAME.addScore(POINTS.step, 'step');
    this.hud.addScore(awarded);
    scorePopup(this, at.x, at.y - s(28), `+${awarded}`);
    sparkle(this, at.x, at.y);

    const milestone = comboMilestone(GAME.combo);
    if (milestone) {
      scorePopup(this, at.x, at.y - s(58), milestone.label, {
        color: milestone.color,
        size: 17,
        rise: 38,
        duration: 980,
      });
      sparkle(this, at.x, at.y, {
        count: 12,
        color: hexColorToNumber(milestone.color),
        spread: 36,
        duration: 700,
      });
    }

    if (this.hopIndex >= PATH_ROUNDS[this.wave]!.path.length - 1) {
      void this.finishRound();
    }
  }

  private onWrongHop(pos: GridPos): void {
    GAME.recordMistake();
    GAME.losePoints(PENALTIES.p1Miss);
    flashCellError(this, pos.row, pos.col);
    this.cameras.main.shake(140, 0.005);
    this.npcReact('wrong');

    const dead = GAME.loseLife();
    if (dead) {
      this.time.delayedCall(380, () => {
        GAME.reset();
        this.scene.restart({ returnScene: this.returnScene });
      });
      return;
    }

    void this.afterMistake();
  }

  private async afterMistake(): Promise<void> {
    if (!this.grid) return;
    const TAIL = 3;
    this.setState('preview');
    const path = PATH_ROUNDS[this.wave]!.path;
    const start = Math.max(0, this.hopIndex + 1 - TAIL);
    const end = Math.min(path.length - 1, this.hopIndex + 1);
    await this.wait(TIMING.segmentReplayPause);
    for (let i = start; i <= end; i++) {
      await this.chantStep(path[i]!);
    }
    this.setState('turn');
  }

  // ── Character sprites ───────────────────────────────────────────────────────

  private spawnRuneKeeper(): void {
    const npcKey = VISUAL_REVAMP_KEYS.RUNE_KEEPER;
    if (this.textures.exists(npcKey)) {
      this.runeKeeper = this.add
        .image(1040, 320, npcKey, 0)
        .setScale(0.26)
        .setDepth(48)
        .setFlipX(true);
    }
  }

  private npcReact(emotion: 'correct' | 'wrong' | 'win'): void {
    if (!this.runeKeeper) return;
    const npc = this.runeKeeper;
    const baseX = npc.x;
    const baseY = npc.y;
    const baseScale = npc.scaleX;
    this.tweens.killTweensOf(npc);

    if (emotion === 'wrong') {
      this.tweens.add({
        targets: npc,
        x: { from: baseX - 7, to: baseX + 7 },
        duration: 55,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
        onComplete: () => npc.setX(baseX),
      });
    } else if (emotion === 'correct') {
      this.tweens.add({
        targets: npc,
        y: baseY - 9,
        scaleX: baseScale * 1.07,
        scaleY: baseScale * 1.07,
        duration: 110,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => npc.setY(baseY).setScale(baseScale),
      });
    } else {
      this.tweens.add({
        targets: npc,
        y: baseY - 22,
        scaleX: baseScale * 1.18,
        scaleY: baseScale * 1.18,
        duration: 280,
        yoyo: true,
        ease: 'Back.easeOut',
        repeat: 1,
        onComplete: () => npc.setY(baseY).setScale(baseScale),
      });
    }
  }

  private buildPlayerSprite(): void {
    const startPos = PATH_ROUNDS[0]!.path[0]!;
    const { x, y } = cellWorldPos(startPos.row, startPos.col);

    // Soft position glow under the character
    this.playerGlow = this.add.circle(x, y, 24, COLORS.accent, 0.22).setDepth(49);
    this.tweens.add({
      targets: this.playerGlow,
      alpha: 0.06,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const playerKey = PROLOGUE_SHEET_KEYS.PLAYER;
    this.playerSprite = this.add
      .sprite(x, y, playerKey, 0)
      .setOrigin(0.5, 1)
      .setScale(0.25)
      .setDepth(50);

    if (!this.anims.exists('p0-walk-down')) {
      const gen = (start: number, end: number) =>
        this.anims.generateFrameNumbers(playerKey, { start, end });
      this.anims.create({ key: 'p0-walk-down',  frames: gen(0,  7),  frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'p0-walk-left',  frames: gen(8,  15), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'p0-walk-right', frames: gen(16, 23), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'p0-walk-up',    frames: gen(24, 31), frameRate: 10, repeat: -1 });
    }
  }

  // ── Player movement ─────────────────────────────────────────────────────────

  private positionPlayer(pos: GridPos): void {
    const { x, y } = cellWorldPos(pos.row, pos.col);
    this.playerSprite.setPosition(x, y).setFrame(0);
    this.playerGlow.setPosition(x, y);
  }

  private walkPlayerTo(from: GridPos, to: GridPos): Promise<void> {
    const dCol = to.col - from.col;
    const dRow = to.row - from.row;
    let animKey = 'p0-walk-down';
    if (dCol > 0)      animKey = 'p0-walk-right';
    else if (dCol < 0) animKey = 'p0-walk-left';
    else if (dRow < 0) animKey = 'p0-walk-up';

    this.playerSprite.play(animKey, true);

    const { x, y } = cellWorldPos(to.row, to.col);
    const dur = MOTION.settle.duration;

    return new Promise<void>((resolve) => {
      this.tweens.add({
        targets: this.playerSprite,
        x, y,
        duration: dur,
        ease: MOTION.settle.ease,
        onComplete: () => {
          this.playerSprite.stop().setFrame(0);
          resolve();
        },
      });
      this.tweens.add({ targets: this.playerGlow, x, y, duration: dur, ease: MOTION.settle.ease });
    });
  }

  // ── Trace ribbon ────────────────────────────────────────────────────────────

  private paintTrace(): void {
    const path = PATH_ROUNDS[this.wave]!.path;
    const chain = path.slice(0, this.hopIndex + 1);
    this.traceG.clear();
    if (chain.length < 2) return;

    this.traceG.lineStyle(s(3), COLORS.accent, 0.82);
    for (let i = 1; i < chain.length; i++) {
      const a = cellWorldPos(chain[i - 1]!.row, chain[i - 1]!.col);
      const b = cellWorldPos(chain[i]!.row, chain[i]!.col);
      this.traceG.beginPath();
      this.traceG.moveTo(a.x, a.y);
      this.traceG.lineTo(b.x, b.y);
      this.traceG.strokePath();
      // Midpoint tick
      this.traceG.fillStyle(COLORS.accent, 1);
      this.traceG.fillCircle((a.x + b.x) / 2, (a.y + b.y) / 2, s(2.5));
    }
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  private wait(ms: number): Promise<void> {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, () => resolve()));
  }

  private setState(next: PuzzleState): void {
    this.state = next;
    this.hud.setState(STATE_LABEL[next] ?? '');
  }

  private spawnBonusPopups(
    at: Phaser.Math.Vector2,
    bonuses: { timeBonus: number; perfectBonus: number; wasPerfect: boolean },
  ): void {
    let yOffset = 0;
    if (bonuses.timeBonus > 0) {
      scorePopup(this, at.x, at.y - s(46), `+${bonuses.timeBonus}  TIME`, {
        color: '#fde68a',
        size: 16,
        rise: 36,
        duration: 1100,
      });
      yOffset += s(26);
    }
    if (bonuses.wasPerfect && bonuses.perfectBonus > 0) {
      scorePopup(this, at.x, at.y - s(46) - yOffset, `+${bonuses.perfectBonus}  PERFECT!`, {
        color: '#a3e635',
        size: 17,
        rise: 40,
        duration: 1200,
      });
      sparkle(this, at.x, at.y, { count: 14, color: 0xa3e635, spread: 44, duration: 800 });
    }
  }

  private tearDown(): void {
    this.traceG.clear();
    if (this.grid) unmountIsoGrid(this.grid);
    this.grid = null;
    this.seqPanel?.destroy();
    this.seqPanel = null;
  }

  private toggleReduceMotion(): void {
    this.reduceMotion = !this.reduceMotion;
    writeReduceMotion(this.reduceMotion);
  }

  private exitScene(): void {
    if (this.scene.isActive(PROLOGUE_RUN_UI_KEY)) this.scene.stop(PROLOGUE_RUN_UI_KEY);
    GAME.reset();
    this.scene.start(this.returnScene);
  }

  /** Public hook for test injection (used by Playwright). */
  puzzleComplete(): void {
    completeAlgorithmiaPuzzle(this, {
      puzzleId: 'p0_1',
      puzzleName: 'Follow the Path',
      concept: 'Sequential Processing',
      returnScene: this.returnScene,
      startedAt: this.startedAt,
      delayMs: 0,
    });
  }
}
