import Phaser from 'phaser';
import { COLORS, TILE_SIZE, s } from './tokens';
import { TIMING } from './motion';
import { ROUNDS } from './rounds';
import { paintAtmosphere, type Atmosphere } from './visuals/atmosphere';
import { ensureRuneTexture } from './visuals/rune';
import { createRibbon, type Ribbon } from './visuals/ribbon';
import { buildHud, type Hud } from './visuals/hud';
import { createPlayerPawn, createRuneKeeper, createWisp, type Pawn } from './visuals/actors';
import { parseCell } from './gridLayout';
import {
  bestSteer,
  coordsOf,
  mountBoard,
  nearestLegal,
  unmountBoard,
  type Board,
} from './board';
import { bindInput } from './input';
import { canAcceptStep, STATE_LABEL, type PuzzleState } from './state';
import { readReduceMotion, writeReduceMotion } from './prefs';
import {
  chantPulse,
  chantRing,
  pressPulse,
  stepCorrect,
  stepMistake,
  winCascade,
} from './feedback';
import { GAME, PENALTIES, POINTS } from '../../game/state';
import {
  completeAlgorithmiaPuzzle,
  PROLOGUE_RUN_UI_KEY,
  resolveReturnScene,
} from '../../game/algorithmiaIntegration';
import { scorePopup } from '../../ui/popups';
import { hexColorToNumber, sparkle } from '../../ui/particles';
import { comboMilestone } from '../../game/milestone';
import { SCENE_KEYS } from '../../../config/constants';

const HIT_RADIUS = TILE_SIZE * 0.7 + s(8);
const SNAP_BIAS = s(10);
const SEGMENT_REPLAY_TAIL = 3;

const ROUND_TIMERS = [25000, 30000, 35000];
const TIME_BONUS_MAX = [200, 240, 280];
const PERFECT_BONUS = [250, 280, 320];

export class FollowThePathScene extends Phaser.Scene {
  private atmosphere!: Atmosphere;
  private ribbon!: Ribbon;
  private hud!: Hud;
  private board: Board | null = null;
  private state: PuzzleState = 'idle';
  private station = '';
  private hops = 0;
  private wave = 0;
  private reduceMotion = false;
  private unbindInput?: () => void;
  private pawn?: Pawn;
  private wisp?: { update(time: number): void; destroy(): void };
  private runeKeeper?: { update(time: number): void; destroy(): void };
  private returnScene: string = SCENE_KEYS.PROLOGUE;
  private startedAt = Date.now();

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_P0_1 });
  }

  init(data?: { returnScene?: string }): void {
    this.returnScene = resolveReturnScene(data);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg.deep);
    this.startedAt = Date.now();
    this.reduceMotion = readReduceMotion();
    GAME.reset();
    GAME.setCurrentPuzzle(this.scene.key);
    // The cosmic-rune layout owns its own top-left + top-right HUD; the
    // shared run-overlay would otherwise stack hearts on top of the crystal
    // counter. Suppress it for this puzzle and re-launch on exit if needed.
    if (this.scene.isActive(PROLOGUE_RUN_UI_KEY)) this.scene.stop(PROLOGUE_RUN_UI_KEY);

    this.atmosphere = paintAtmosphere(this);
    ensureRuneTexture(this);
    this.ribbon = createRibbon(this);
    this.runeKeeper = createRuneKeeper(this);
    this.hud = buildHud(this, {
      eyebrow: 'PUZZLE P0-1',
      footerHint: '[R] replay   ·   WASD / arrows / click   ·   [M] reduce motion',
    });
    this.hud.setRoundProgress(0, ROUNDS.length);
    this.hud.setCrystals(0);
    this.scoreSubscribe();

    this.unbindInput = bindInput(this, {
      onSteer: (dx, dy) => this.steer(dx, dy),
      onPickWorld: (x, y) => this.pickAt(x, y),
      onHoverWorld: (x, y) => this.hoverAt(x, y),
      onReplay: () => void this.replay(),
      onToggleReduceMotion: () => this.toggleReduceMotion(),
    });

    const escape = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escape?.on('down', this.exitToReturnScene, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      escape?.removeAllListeners();
      this.unbindInput?.();
      this.scoreUnsubscribe();
      this.pawn?.destroy();
      this.wisp?.destroy();
      this.runeKeeper?.destroy();
    });

    void this.runRound(0);
  }

  update(time: number): void {
    this.wisp?.update(time);
    this.runeKeeper?.update(time);
  }

  private scoreListener = (): void => {
    this.hud.setCrystals(Math.floor(GAME.score / 100));
  };

  private scoreSubscribe(): void {
    GAME.emitter.on('score', this.scoreListener, this);
    GAME.emitter.on('reset', this.scoreListener, this);
  }

  private scoreUnsubscribe(): void {
    GAME.emitter.off('score', this.scoreListener, this);
    GAME.emitter.off('reset', this.scoreListener, this);
  }

  private async runRound(index: number): Promise<void> {
    this.wave = index;
    this.tearDown();

    const def = ROUNDS[index]!;
    this.hud.setRoundProgress(index, ROUNDS.length);
    this.hud.setRound(def.title, def.principle, def.teach);
    this.board = mountBoard(this, def);
    this.ribbon.paintGhost(this.board);

    this.station = this.board.walkKeys[0]!;
    this.hops = 0;

    const startCell = parseCell(this.station);
    this.pawn = createPlayerPawn(this, startCell);
    this.wisp = createWisp(this, this.pawn);

    this.setState('preview');
    await this.runPreview(0, this.board.walkKeys.length - 1);
    this.ribbon.paintTrace(this.board, this.hops);
    this.setState('turn');
    GAME.startRound(ROUND_TIMERS[index] ?? 30000);
  }

  private async runPreview(from: number, to: number): Promise<void> {
    if (!this.board) return;
    this.atmosphere.setMood('preview');
    this.ribbon.paintGhost(this.board);
    for (let i = from; i <= to; i += 1) {
      /* eslint-disable-next-line no-await-in-loop */
      await this.chantOneStep(this.board.walkKeys[i]!);
    }
    this.atmosphere.setMood('normal');
  }

  private chantOneStep(key: string): Promise<void> {
    const node = this.board!.glyphs.get(key)!;
    chantRing(this, new Phaser.Math.Vector2(node.x, node.y));
    chantPulse(this, node, this.reduceMotion);
    return new Promise<void>((resolve) =>
      this.time.delayedCall(TIMING.chantStep, () => resolve()),
    );
  }

  private async replay(): Promise<void> {
    if (this.state !== 'turn' || !this.board) return;
    this.station = this.board.walkKeys[0]!;
    this.hops = 0;
    const startCell = parseCell(this.station);
    this.pawn?.setCell(startCell.col, startCell.row);
    this.setState('preview');
    await this.runPreview(0, this.board.walkKeys.length - 1);
    this.ribbon.paintTrace(this.board, this.hops);
    this.setState('turn');
  }

  private pickAt(worldX: number, worldY: number): void {
    if (!canAcceptStep(this.state) || !this.board) return;
    const match = nearestLegal(this.board, this.station, worldX, worldY, HIT_RADIUS, SNAP_BIAS);
    if (!match) return;
    this.tryHop(match.key);
  }

  private hoverAt(worldX: number, worldY: number): void {
    if (!canAcceptStep(this.state) || !this.board) return;
    // Cursor hover is a no-op visually in the new lit-tile design; the
    // path-glow already communicates which tile is next. Preserved as a
    // no-op so the input plumbing still feeds the scene during pointer drag.
    void worldX;
    void worldY;
  }

  private steer(dx: number, dy: number): void {
    if (!canAcceptStep(this.state) || !this.board) return;
    const next = bestSteer(this.board, this.station, dx, dy);
    if (next) this.tryHop(next);
  }

  private tryHop(candidate: string): void {
    if (!this.board) return;
    const legal = this.board.neighbors.get(this.station);
    const node = this.board.glyphs.get(candidate);
    if (!node || !legal?.has(candidate)) return;

    pressPulse(this, node, this.reduceMotion);

    const expected = this.board.walkKeys[this.hops + 1];
    if (expected === undefined) return;

    if (candidate !== expected) {
      stepMistake(this, node, coordsOf(this.board, candidate), this.reduceMotion);
      GAME.recordMistake();
      GAME.losePoints(PENALTIES.p1Miss);
      const dead = GAME.loseLife();
      if (dead) {
        this.time.delayedCall(420, () => {
          GAME.reset();
          this.scene.restart({ returnScene: this.returnScene });
        });
        return;
      }
      void this.afterMistake();
      return;
    }

    this.hops += 1;
    this.station = candidate;
    const targetCell = parseCell(candidate);
    this.pawn?.stepTo(targetCell.col, targetCell.row);
    stepCorrect(this, coordsOf(this.board, candidate));
    this.ribbon.paintTrace(this.board, this.hops);

    GAME.bumpCombo();
    const awarded = GAME.addScore(POINTS.step, 'step');
    scorePopup(this, node.x, node.y - s(28), `+${awarded}`);
    sparkle(this, node.x, node.y);

    const milestone = comboMilestone(GAME.combo);
    if (milestone) {
      scorePopup(this, node.x, node.y - s(58), milestone.label, {
        color: milestone.color,
        size: 17,
        rise: 38,
        duration: 980,
      });
      sparkle(this, node.x, node.y, {
        count: 12,
        color: hexColorToNumber(milestone.color),
        spread: 36,
        duration: 700,
      });
    }

    if (this.hops >= this.board.walkKeys.length - 1) {
      void this.finishRound();
    }
  }

  private async afterMistake(): Promise<void> {
    if (!this.board || this.hops < SEGMENT_REPLAY_TAIL - 1) return;
    this.setState('preview');
    const start = Math.max(0, this.hops + 1 - SEGMENT_REPLAY_TAIL);
    const end = Math.min(this.board.walkKeys.length - 1, this.hops + 1);
    await new Promise<void>((resolve) =>
      this.time.delayedCall(TIMING.segmentReplayPause, () => resolve()),
    );
    await this.runPreview(start, end);
    this.ribbon.paintTrace(this.board, this.hops);
    this.setState('turn');
  }

  private async finishRound(): Promise<void> {
    if (!this.board) return;
    this.setState('cleared');

    const lastAt = coordsOf(this.board, this.station);
    const bonuses = GAME.endRound(
      TIME_BONUS_MAX[this.wave] ?? 240,
      PERFECT_BONUS[this.wave] ?? 280,
    );
    this.spawnRoundBonusPopups(lastAt, bonuses);

    const points = this.board.walkKeys.map((k) => coordsOf(this.board!, k));
    await winCascade(this, points, this.reduceMotion);
    await new Promise<void>((resolve) => this.time.delayedCall(TIMING.winHold, () => resolve()));
    if (this.wave + 1 < ROUNDS.length) {
      void this.runRound(this.wave + 1);
      return;
    }
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

  private spawnRoundBonusPopups(
    at: Phaser.Math.Vector2,
    bonuses: { timeBonus: number; perfectBonus: number; wasPerfect: boolean },
  ): void {
    let offset = 0;
    if (bonuses.timeBonus > 0) {
      scorePopup(this, at.x, at.y - s(46), `+${bonuses.timeBonus}  TIME`, {
        color: '#fde68a',
        size: 16,
        rise: 36,
        duration: 1100,
      });
      offset += s(26);
    }
    if (bonuses.wasPerfect && bonuses.perfectBonus > 0) {
      scorePopup(this, at.x, at.y - s(46) - offset, `+${bonuses.perfectBonus}  PERFECT!`, {
        color: '#a3e635',
        size: 17,
        rise: 40,
        duration: 1200,
      });
      sparkle(this, at.x, at.y, { count: 14, color: 0xa3e635, spread: 44, duration: 800 });
    }
  }

  private setState(next: PuzzleState): void {
    this.state = next;
    this.hud.setState(STATE_LABEL[next] ?? '');
  }

  private toggleReduceMotion(): void {
    this.reduceMotion = !this.reduceMotion;
    writeReduceMotion(this.reduceMotion);
  }

  private exitToReturnScene(): void {
    if (this.scene.isActive(PROLOGUE_RUN_UI_KEY)) this.scene.stop(PROLOGUE_RUN_UI_KEY);
    GAME.reset();
    this.scene.start(this.returnScene);
  }

  private tearDown(): void {
    this.pawn?.destroy();
    this.pawn = undefined;
    this.wisp?.destroy();
    this.wisp = undefined;
    this.ribbon.clear();
    if (this.board) unmountBoard(this.board);
    this.board = null;
  }
}
