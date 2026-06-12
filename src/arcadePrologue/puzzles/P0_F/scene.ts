import Phaser from "phaser";
import { COLORS } from "../P0_1/tokens";
import { paintAtmosphere, type Atmosphere } from "../P0_1/visuals/atmosphere";
import { ensureRuneTexture } from "../P0_1/visuals/rune";
import { readReduceMotion, writeReduceMotion } from "../P0_1/prefs";
import { buildOutMap, forkKeySet } from "../P0_2/flow";
import { coordsOf, mountFlowBoard, type FlowBoard } from "../P0_2/board";
import { createEdges, type EdgeLayer } from "../P0_2/visuals/edges";
import { createMarkers, type Markers } from "../P0_2/visuals/markers";
import {
  clearHighlights,
  createPulse,
  highlightChoices,
  type Pulse,
} from "../P0_2/visuals/pulse";
import { deadEndShimmer } from "../P0_2/feedback";
import { bindDirectionalChoiceInput } from "../P0_2/input";
import { LITANY_ROUND, type LitanyRound } from "./rounds";
import { altarKeys, altarsSatisfied, missedAltarKeys } from "./flow";
import { type LitanyState } from "./state";
import { createAltars, type Altars } from "./visuals/altars";
import { finalCascade } from "./feedback";
import { bindLitanyInput } from "./input";
import { GAME } from "../../game/state";
import {
  completeAlgorithmiaPuzzle,
  PROLOGUE_RUN_UI_KEY,
  resolveReturnScene,
} from "../../game/algorithmiaIntegration";
import { SCENE_KEYS } from "../../../config/constants";
import { playBossEntryBanner } from "../../../ui/BossEntryBanner";
import { VISUAL_REVAMP_KEYS, getImageAssetPath } from "../../../config/assets";
import { a11yManager } from "../../../core/A11yManager";
import { audioManager } from "../../../core/AudioManager";
import { mountTransientLegend } from "../../../ui/transientLegend";
import { ChamberCast } from "../../../puzzleRooms/chamber/ChamberCast";
import type { ChamberShell } from "../../../puzzleRooms/chamber/ChamberShell";
import { GamepadActionBridge } from "../../../input/GamepadActionBridge";
import {
  emptyLedger,
  recordTrade,
  starsForTrades,
  type GrainLedger,
} from "../../../puzzleRooms/grainChamber/grainEconomy";
import { litanyPar } from "../../chamber/prologuePar";
import { forkChoicesAlong, routeThrough } from "../../chamber/flowRoute";
import {
  createPrologueShell,
  launchHomewardPulse,
  loadPrologueChamberAssets,
  paintExitChannel,
  placeRuneLever,
  type RuneLever,
} from "../../chamber/prologueShell";
import { createDecalLayer, type DecalLayer } from "../../chamber/runeDecals";
import { PulseGhost } from "../../chamber/PulseGhost";

// Bosses own urgency (docs/VISION.md §6): the Litany keeps its real clock.
const LITANY_TIMER_MS = 80000;
const DECISION_WINDOW_MS = 1100;
const PREPARE_BEAT_MS = 600;
const RETRY_BEAT_MS = 740;

const SENTINEL_CAST = {
  keeperKey: VISUAL_REVAMP_KEYS.BOSS_SENTINEL_FIGURE,
  keeperScale: 1.05,
  entryLine: "SPEAK THE WAY, OR STAY.",
  reactions: {
    waste: ["THE LITANY REJECTS YOU.", "AGAIN. FROM THE SOURCE."],
    clean: ["IT LISTENS."],
    clear: ["…HEARD.", "THE WAY OPENS."],
  },
  tallyNoun: "pulses",
  tallyVerdicts: {
    thrifty: "FLAWLESS.",
    lever: "PULL THE LEVER. SEE THE LITANY SPOKEN TRUE.",
  },
  bubble: { color: "#bfe3ff", backgroundColor: "#0c1024" },
} as const;

export class TheLitanyScene extends Phaser.Scene {
  private atmosphere!: Atmosphere;
  private edges!: EdgeLayer;
  private markers!: Markers;
  private altars!: Altars;
  private pulse!: Pulse;
  private board: FlowBoard | null = null;
  private round: LitanyRound | null = null;
  private outMap: Map<string, string[]> = new Map();
  private forks: Set<string> = new Set();
  private altarSet: Set<string> = new Set();
  private reduceMotion = false;
  private unbindInput?: () => void;
  private returnScene: string = SCENE_KEYS.PROLOGUE;
  private startedAt = Date.now();

  private shell!: ChamberShell;
  private cast!: ChamberCast;
  private decals!: DecalLayer;
  private ghostPulse!: PulseGhost;
  private lever: RuneLever | null = null;

  private ledger: GrainLedger = emptyLedger(0);
  private hintsUsed = 0;
  private roomCleared = false;
  private exiting = false;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_SENTINEL });
  }

  init(data?: { returnScene?: string }): void {
    this.returnScene = resolveReturnScene(data);
  }

  preload(): void {
    for (const key of [
      VISUAL_REVAMP_KEYS.PUZZLE_PROLOGUE_ACTION_ARENA_BG,
      VISUAL_REVAMP_KEYS.BOSS_SENTINEL_FIGURE,
    ]) {
      const path = getImageAssetPath(key);
      if (path && !this.textures.exists(key)) this.load.image(key, path);
    }
    loadPrologueChamberAssets(this);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg.deep);
    this.startedAt = Date.now();
    this.reduceMotion = readReduceMotion();
    audioManager.setScene(this);
    GAME.reset();
    GAME.setCurrentPuzzle(this.scene.key);
    if (!this.scene.isActive(PROLOGUE_RUN_UI_KEY))
      this.scene.launch(PROLOGUE_RUN_UI_KEY);
    this.scene.bringToTop(PROLOGUE_RUN_UI_KEY);

    this.atmosphere = paintAtmosphere(this);
    ensureRuneTexture(this);
    this.edges = createEdges(this);
    this.markers = createMarkers(this);
    this.altars = createAltars(this);
    this.pulse = createPulse(this);

    this.ledger = emptyLedger(0);
    this.hintsUsed = 0;
    this.roomCleared = false;
    this.exiting = false;
    this.decals = createDecalLayer(this, 6, this.reduceMotion);
    this.shell = createPrologueShell(this, litanyPar());
    // The Sentinel IS the cast — it looms beside the gate and speaks in
    // stakes, never lecture (VISION §3). Off-center so its lines stay
    // legible once the gate's light spill pours in.
    this.cast = new ChamberCast(
      this,
      this.cameras.main.width / 2 + 190,
      150,
      SENTINEL_CAST,
    );
    this.ghostPulse = new PulseGhost(this);
    mountTransientLegend(
      this,
      this.cameras.main.height - 18,
      "ARROWS / WASD steer the pulse at each fork · H hint · M motion",
    );

    // Boss entry banner — stakes only; the mechanic teaches itself.
    playBossEntryBanner(this, {
      bossName: "The Litany",
      regionTag: "Prologue finale",
      thesis: "The way home is barred. Answer its litany.",
      accentColor: 0x22d3ee,
      onComplete: () => {
        this.shell.seal();
        this.cast.entry();
      },
    });

    this.unbindInput = bindLitanyInput(this, {
      onReplay: () => void this.playGhost(),
      onToggleReduceMotion: () => this.toggleReduceMotion(),
    });

    const escape = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );
    escape?.on("down", this.exitToReturnScene, this);
    const hintKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.H,
    );
    hintKey?.on("down", this.showHint, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      escape?.removeAllListeners();
      hintKey?.removeAllListeners();
      this.unbindInput?.();
    });

    void this.runFinale();
  }

  private async runFinale(): Promise<void> {
    this.mountFinale();
    this.setState("preparing");
    await this.wait(PREPARE_BEAT_MS);
    GAME.startRound(LITANY_TIMER_MS);
    void this.firePulse();
  }

  private mountFinale(): void {
    this.round = LITANY_ROUND;
    this.board = mountFlowBoard(this, LITANY_ROUND);
    this.outMap = buildOutMap(LITANY_ROUND);
    this.forks = forkKeySet(LITANY_ROUND);
    this.altarSet = new Set(altarKeys(LITANY_ROUND));
    this.repaint();
  }

  private async firePulse(): Promise<void> {
    if (!this.board || !this.round) return;
    this.setState("flowing");
    // Every pulse fired is a cost the floor remembers — the boss's economy
    // is the same physical ledger as the first-contact rooms.
    this.ledger = recordTrade(this.ledger);

    const result = await this.pulse.fireReactive(this.board, {
      sourceKey: this.board.sourceKey,
      sinkKey: this.board.sinkKey,
      outMap: this.outMap,
      forkKeys: this.forks,
      decideAtFork: (current, choices) => this.decideAtFork(current, choices),
      onArrive: (key) => this.onArrive(key),
    });

    if (result.outcome !== "reached") {
      this.onFizzle(result.finalKey);
      return;
    }
    if (!altarsSatisfied(this.round, result.visited)) {
      this.onMissedAltars(result.visited);
      return;
    }
    await this.celebrate();
  }

  private async decideAtFork(
    current: string,
    choices: string[],
  ): Promise<string | null> {
    if (!this.board) return null;
    const rings = highlightChoices(this, this.board, choices);
    const handlers = new Map<string, () => void>();

    return new Promise<string | null>((resolve) => {
      let resolved = false;
      let unbindDirectional = (): void => {};
      const finish = (next: string | null): void => {
        if (resolved) return;
        resolved = true;
        handlers.forEach((handler, key) => {
          this.board?.glyphs.get(key)?.off("pointerdown", handler);
        });
        unbindDirectional();
        clearHighlights(this, rings);
        timer.remove();
        resolve(next);
      };

      const timer = this.time.delayedCall(DECISION_WINDOW_MS, () =>
        finish(null),
      );
      unbindDirectional = bindDirectionalChoiceInput(
        this,
        this.board!,
        current,
        choices,
        finish,
      );

      for (const key of choices) {
        const glyph = this.board?.glyphs.get(key);
        if (!glyph) continue;
        const handler = (): void => finish(key);
        handlers.set(key, handler);
        glyph.once("pointerdown", handler);
      }
    });
  }

  private onArrive(key: string): void {
    if (!this.board || !this.altarSet.has(key)) return;
    this.altars.chime(this.board, key);
    this.cast.onCleanStretch();
    a11yManager.announce("An altar sounds.", false);
  }

  private onFizzle(finalKey: string): void {
    if (!this.board) return;
    deadEndShimmer(this, this.board, finalKey);
    const at = coordsOf(this.board, finalKey);
    this.decals.scorchAt(at.x, at.y + 18);
    audioManager.playTone(150, 140, "sawtooth");
    this.cast.onSpillStreak();
    a11yManager.announce(
      "The pulse dies in a dead end — the floor scorches where it fell.",
      false,
    );
    this.time.delayedCall(RETRY_BEAT_MS, () => void this.firePulse());
  }

  private onMissedAltars(visited: string[]): void {
    if (!this.board || !this.round) return;
    const missed = missedAltarKeys(this.round, visited);
    this.altars.shimmerMissed(this.board, missed);
    const at = coordsOf(this.board, this.board.sinkKey);
    this.decals.scorchAt(at.x, at.y + 18);
    audioManager.playTone(180, 160, "sawtooth");
    this.cast.onSpillStreak();
    a11yManager.announce(
      "The pulse reached the sink, but the litany went unsung — the altars must sound first.",
      false,
    );
    this.time.delayedCall(RETRY_BEAT_MS, () => void this.firePulse());
  }

  // ── Debrief: unbarred gate, plaque tally, lever ghost, homeward pulse ──────

  private async celebrate(): Promise<void> {
    if (!this.board) return;
    this.setState("cleared");
    GAME.endRound(0, 0); // hides the boss clock; awards nothing
    const sinkAt = coordsOf(this.board, this.board.sinkKey);
    this.cast.onBloom();
    await finalCascade(this, sinkAt);

    this.shell.unbar(() => {
      const par = litanyPar();
      this.roomCleared = true;
      this.shell.setPlaqueTally(this.ledger.trades, par);
      this.cast.tallyLine(this.ledger.trades, par);
      this.lever = placeRuneLever(
        this,
        this.cameras.main.width / 2 - 110,
        70,
        () => void this.playGhost(),
      );
      paintExitChannel(this, sinkAt.x, sinkAt.y);
      this.bindExitInput();
      a11yManager.announce(
        `The litany is answered in ${this.ledger.trades} ${this.ledger.trades === 1 ? "pulse" : "pulses"}; a single pass suffices. ` +
          "Pull the lever to see the litany spoken true, or send your pulse up through the open gate.",
        true,
      );
    });
  }

  private bindExitInput(): void {
    const kb = this.input.keyboard;
    const exit = (): void => this.sendHomeward();
    const replay = (): void => void this.playGhost();
    kb?.on("keydown-UP", exit);
    kb?.on("keydown-W", exit);
    new GamepadActionBridge(this, { up: exit, action: replay });
    const gate = this.add
      .zone(this.cameras.main.width / 2, 24, 140, 56)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    gate.on("pointerdown", exit);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb?.off("keydown-UP", exit);
      kb?.off("keydown-W", exit);
    });
  }

  private sendHomeward(): void {
    if (!this.roomCleared || this.exiting || !this.board) return;
    this.exiting = true;
    a11yManager.announce("The pulse sails home through the open gate.", true);
    const sinkAt = coordsOf(this.board, this.board.sinkKey);
    launchHomewardPulse(this, sinkAt.x, sinkAt.y, () => {
      const par = litanyPar();
      const base = starsForTrades(this.ledger.trades, par);
      const stars = Math.max(1, base - (this.hintsUsed > 0 ? 1 : 0));
      completeAlgorithmiaPuzzle(this, {
        puzzleId: "boss_sentinel",
        puzzleName: "The Litany",
        concept: "Pattern Recognition + Authentication",
        returnScene: this.returnScene,
        startedAt: this.startedAt,
        stars,
        hintsUsed: this.hintsUsed,
        delayMs: 200,
      });
    });
  }

  private async playGhost(): Promise<void> {
    if (!this.roomCleared || !this.board || this.ghostPulse.isPlaying) return;
    this.lever?.pull();
    const route = routeThrough(
      this.outMap,
      this.board.sourceKey,
      this.board.sinkKey,
      altarKeys(LITANY_ROUND),
    );
    if (!route) return;
    await this.ghostPulse.play(
      this.board,
      this.outMap,
      this.forks,
      forkChoicesAlong(route, this.forks),
    );
  }

  // ── Hints (H — the only prompting path) ────────────────────────────────────

  private showHint(): void {
    if (this.roomCleared) return;
    this.hintsUsed += 1;
    const line = "BOTH ALTARS. IN THEIR ORDER. THEN THE SINK.";
    this.cast.speak(line);
    a11yManager.announce(line, false);
  }

  onPuzzleComplete(stars = 3): void {
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.unbindInput?.();
    completeAlgorithmiaPuzzle(this, {
      puzzleId: "boss_sentinel",
      puzzleName: "The Litany",
      concept: "Pattern Recognition + Authentication",
      returnScene: this.returnScene,
      startedAt: this.startedAt,
      stars,
      delayMs: 0,
    });
  }

  private repaint(): void {
    if (!this.round || !this.board) return;
    this.edges.paint(this.round, this.board);
    this.markers.paint(this.round, this.board);
    this.altars.paint(this.round, this.board);
  }

  private setState(next: LitanyState): void {
    if (next === "flowing") this.atmosphere.setMood("preview");
    else this.atmosphere.setMood("normal");
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }

  private toggleReduceMotion(): void {
    this.reduceMotion = !this.reduceMotion;
    writeReduceMotion(this.reduceMotion);
  }

  private exitToReturnScene(): void {
    if (this.scene.isActive(PROLOGUE_RUN_UI_KEY))
      this.scene.stop(PROLOGUE_RUN_UI_KEY);
    GAME.reset();
    this.scene.start(this.returnScene);
  }
}
