import Phaser from 'phaser';
import { COLORS, HEX_RADIUS, s } from '../P0_1/tokens';
import { paintAtmosphere, type Atmosphere } from '../P0_1/visuals/atmosphere';
import { ensureRuneTexture } from '../P0_1/visuals/rune';
import { buildHud, type Hud } from '../P0_1/visuals/hud';
import { readReduceMotion, writeReduceMotion } from '../P0_1/prefs';
import { FLOW_ROUNDS, type FlowRound } from './rounds';
import { FLOW_LABEL, type FlowState } from './state';
import { buildOutMap, forkKeySet } from './flow';
import {
  coordsOf,
  mountFlowBoard,
  unmountFlowBoard,
  type FlowBoard,
} from './board';
import { createEdges, type EdgeLayer } from './visuals/edges';
import { createMarkers, type Markers } from './visuals/markers';
import {
  clearHighlights,
  createPulse,
  highlightChoices,
  type Pulse,
} from './visuals/pulse';
import { deadEndShimmer, sinkBloom } from './feedback';
import { bindFlowInput } from './input';
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

const ROUND_TIMERS = [30000, 40000, 50000];
const TIME_BONUS_MAX = [320, 420, 540];
const PERFECT_BONUS = [400, 500, 640];
const DECISION_WINDOW_MS = [1500, 1200, 1000];
const PREPARE_BEAT_MS = 520;
const RETRY_BEAT_MS = 640;
const RESULT_BEAT_MS = 520;

export class FlowConsolesScene extends Phaser.Scene {
  private atmosphere!: Atmosphere;
  private hud!: Hud;
  private edges!: EdgeLayer;
  private markers!: Markers;
  private pulse!: Pulse;
  private board: FlowBoard | null = null;
  private round: FlowRound | null = null;
  private outMap: Map<string, string[]> = new Map();
  private forks: Set<string> = new Set();
  private wave = 0;
  private reduceMotion = false;
  private unbindInput?: () => void;
  private returnScene: string = SCENE_KEYS.PROLOGUE;
  private startedAt = Date.now();

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_P0_2 });
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
    if (!this.scene.isActive(PROLOGUE_RUN_UI_KEY)) this.scene.launch(PROLOGUE_RUN_UI_KEY);
    this.scene.bringToTop(PROLOGUE_RUN_UI_KEY);

    this.atmosphere = paintAtmosphere(this);
    ensureRuneTexture(this);
    this.edges = createEdges(this);
    this.markers = createMarkers(this);
    this.pulse = createPulse(this);
    this.hud = buildHud(this, {
      eyebrow: 'LESSON 02  \u00b7  SELECTION',
      footerHint: 'Click a fork as the pulse arrives   \u00b7   [M] reduce motion',
    });

    this.unbindInput = bindFlowInput(this, {
      onReplay: () => {},
      onToggleReduceMotion: () => this.toggleReduceMotion(),
    });

    const escape = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escape?.on('down', this.exitToReturnScene, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      escape?.removeAllListeners();
      this.unbindInput?.();
    });

    void this.runRound(0);
  }

  private async runRound(index: number): Promise<void> {
    this.wave = index;
    this.tearDown();

    const def = FLOW_ROUNDS[index]!;
    this.round = def;
    this.hud.setRound(def.title, def.principle, def.teach);
    this.board = mountFlowBoard(this, def);
    this.outMap = buildOutMap(def);
    this.forks = forkKeySet(def);

    this.repaint();
    this.setState('preparing');
    await this.wait(PREPARE_BEAT_MS);
    GAME.startRound(ROUND_TIMERS[index] ?? 40000);
    void this.firePulse();
  }

  private async firePulse(): Promise<void> {
    if (!this.board || !this.round) return;
    this.setState('flowing');

    const result = await this.pulse.fireReactive(this.board, {
      sourceKey: this.board.sourceKey,
      sinkKey: this.board.sinkKey,
      outMap: this.outMap,
      forkKeys: this.forks,
      decideAtFork: (current, choices) => this.decideAtFork(current, choices),
    });

    if (result.outcome === 'reached') {
      void this.onReached();
      return;
    }
    this.onFizzle(result.finalKey, result.outcome);
  }

  private async decideAtFork(_current: string, choices: string[]): Promise<string | null> {
    if (!this.board) return null;
    const rings = highlightChoices(this, this.board, choices);
    const handlers = new Map<string, () => void>();
    const window = DECISION_WINDOW_MS[this.wave] ?? 1200;

    return new Promise<string | null>((resolve) => {
      let resolved = false;
      const finish = (next: string | null): void => {
        if (resolved) return;
        resolved = true;
        handlers.forEach((handler, key) => {
          this.board?.glyphs.get(key)?.off('pointerdown', handler);
        });
        clearHighlights(this, rings);
        timer.remove();
        resolve(next);
      };

      const timer = this.time.delayedCall(window, () => finish(null));

      for (const key of choices) {
        const glyph = this.board?.glyphs.get(key);
        if (!glyph) continue;
        const handler = (): void => finish(key);
        handlers.set(key, handler);
        glyph.once('pointerdown', handler);
      }
    });
  }

  private async onReached(): Promise<void> {
    if (!this.board) return;
    const sinkAt = coordsOf(this.board, this.board.sinkKey);
    sinkBloom(this, sinkAt);

    GAME.bumpCombo();
    const awarded = GAME.addScore(POINTS.pulse, 'pulse');
    scorePopup(this, sinkAt.x, sinkAt.y - s(32), `+${awarded}`);
    sparkle(this, sinkAt.x, sinkAt.y, { count: 10, spread: 36 });

    const milestone = comboMilestone(GAME.combo);
    if (milestone) {
      scorePopup(this, sinkAt.x, sinkAt.y - s(64), milestone.label, {
        color: milestone.color,
        size: 17,
        rise: 38,
        duration: 980,
      });
      sparkle(this, sinkAt.x, sinkAt.y, {
        count: 14,
        color: hexColorToNumber(milestone.color),
        spread: 44,
      });
    }

    const bonuses = GAME.endRound(
      TIME_BONUS_MAX[this.wave] ?? 420,
      PERFECT_BONUS[this.wave] ?? 500,
    );
    this.spawnRoundBonusPopups(sinkAt, bonuses);

    this.setState('cleared');
    void this.advance();
  }

  private onFizzle(finalKey: string, outcome: 'dead-end' | 'timeout'): void {
    if (!this.board) return;
    deadEndShimmer(this, this.board, finalKey);
    if (outcome === 'timeout') this.flashHesitation();
    GAME.recordMistake();
    GAME.losePoints(PENALTIES.p2DeadEnd);
    GAME.breakCombo();
    this.time.delayedCall(RETRY_BEAT_MS, () => void this.firePulse());
  }

  private flashHesitation(): void {
    if (!this.board) return;
    const center = new Phaser.Math.Vector2(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
    );
    scorePopup(this, center.x, center.y - HEX_RADIUS - s(32), 'TOO SLOW', {
      color: '#fca5a5',
      size: 15,
      rise: 28,
      duration: 720,
    });
  }

  private spawnRoundBonusPopups(
    at: Phaser.Math.Vector2,
    bonuses: { timeBonus: number; perfectBonus: number; wasPerfect: boolean },
  ): void {
    let off = s(58);
    if (bonuses.timeBonus > 0) {
      scorePopup(this, at.x, at.y - off, `+${bonuses.timeBonus}  TIME`, {
        color: '#fde68a',
        size: 16,
        rise: 36,
        duration: 1100,
      });
      off += s(26);
    }
    if (bonuses.wasPerfect && bonuses.perfectBonus > 0) {
      scorePopup(this, at.x, at.y - off, `+${bonuses.perfectBonus}  PERFECT!`, {
        color: '#a3e635',
        size: 17,
        rise: 40,
        duration: 1200,
      });
      sparkle(this, at.x, at.y, { count: 14, color: 0xa3e635, spread: 46 });
    }
  }

  private async advance(): Promise<void> {
    await this.wait(RESULT_BEAT_MS);
    if (this.wave + 1 < FLOW_ROUNDS.length) {
      void this.runRound(this.wave + 1);
      return;
    }
    this.hud.showSummary('Selection learned. The signal obeys your reflexes.');
    this.hud.showPromptNext('Return to the Chamber');
    this.time.delayedCall(1700, () =>
      completeAlgorithmiaPuzzle(this, {
        puzzleId: 'p0_2',
        puzzleName: 'Flow Consoles',
        concept: 'Key-Value Mapping',
        returnScene: this.returnScene,
        startedAt: this.startedAt,
      }),
    );
  }

  puzzleComplete(): void {
    completeAlgorithmiaPuzzle(this, {
      puzzleId: 'p0_2',
      puzzleName: 'Flow Consoles',
      concept: 'Key-Value Mapping',
      returnScene: this.returnScene,
      startedAt: this.startedAt,
      delayMs: 0,
    });
  }

  private repaint(): void {
    if (!this.round || !this.board) return;
    this.edges.paint(this.round, this.board);
    this.markers.paint(this.round, this.board);
  }

  private setState(next: FlowState): void {
    this.hud.setState(FLOW_LABEL[next] ?? '');
    if (next === 'flowing') this.atmosphere.setMood('preview');
    else this.atmosphere.setMood('normal');
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
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
    this.edges.clear();
    this.markers.clear();
    if (this.board) unmountFlowBoard(this.board);
    this.board = null;
    this.round = null;
    this.outMap = new Map();
    this.forks = new Set();
  }
}
