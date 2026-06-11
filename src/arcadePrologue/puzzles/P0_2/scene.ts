import Phaser from "phaser";
import { COLORS, s, STAGE } from "../P0_1/tokens";
import { BitCompanion } from "../../../ui/BitCompanion";
import { paintAtmosphere, type Atmosphere } from "../P0_1/visuals/atmosphere";
import { ensureRuneTexture } from "../P0_1/visuals/rune";
import { readReduceMotion, writeReduceMotion } from "../P0_1/prefs";
import { FLOW_ROUNDS, type FlowRound } from "./rounds";
import { type FlowState } from "./state";
import { buildOutMap, forkKeySet } from "./flow";
import {
  coordsOf,
  mountFlowBoard,
  unmountFlowBoard,
  type FlowBoard,
} from "./board";
import { createEdges, type EdgeLayer } from "./visuals/edges";
import { createMarkers, type Markers } from "./visuals/markers";
import {
  clearHighlights,
  createPulse,
  highlightChoices,
  type Pulse,
} from "./visuals/pulse";
import { deadEndShimmer, sinkBloom } from "./feedback";
import { bindDirectionalChoiceInput, bindFlowInput } from "./input";
import { GAME } from "../../game/state";
import {
  completeAlgorithmiaPuzzle,
  PROLOGUE_RUN_UI_KEY,
  resolveReturnScene,
} from "../../game/algorithmiaIntegration";
import { SCENE_KEYS } from "../../../config/constants";
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
import { flowPar } from "../../chamber/prologuePar";
import { forkChoicesAlong, routeThrough } from "../../chamber/flowRoute";
import {
  createPrologueShell,
  launchHomewardPulse,
  paintExitChannel,
  placeRuneLever,
  type RuneLever,
} from "../../chamber/prologueShell";
import { createDecalLayer, type DecalLayer } from "../../chamber/runeDecals";
import { PulseGhost } from "../../chamber/PulseGhost";

// The per-fork decision window is the mechanic itself — the pulse is a
// moving thing you steer — not a bolted-on round clock (docs/VISION.md §6).
const DECISION_WINDOW_MS = [1500, 1200, 1000];
const PREPARE_BEAT_MS = 520;
const RETRY_BEAT_MS = 640;
const RESULT_BEAT_MS = 520;

const P0_2_CAST = {
  keeperKey: VISUAL_REVAMP_KEYS.CONSOLE_KEEPER,
  keeperScale: 0.26,
  entryLine:
    "Glitch tore through and left every fork hanging open. The pulses can't find home.",
  reactions: {
    waste: [
      "Another one gone dark.",
      "The floor keeps the scorch. The pulse won't.",
    ],
    clean: [
      "Home. Listen to it settle.",
      "Straight through — the network remembers.",
    ],
    clear: ["Every console singing again.", "The flow is whole."],
  },
  tallyNoun: "pulses",
  tallyVerdicts: {
    thrifty: "Barely a scorch on the floor.",
    lever: "Pull the lever by the gate — watch one pulse make the whole run.",
  },
  bubble: { color: "#dbe7ff", backgroundColor: "#101630" },
} as const;

export class FlowConsolesScene extends Phaser.Scene {
  private atmosphere!: Atmosphere;
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

  private shell!: ChamberShell;
  private cast!: ChamberCast;
  private decals!: DecalLayer;
  private ghostPulse!: PulseGhost;
  private lever: RuneLever | null = null;
  private glitchBody: Phaser.GameObjects.Image | null = null;

  private ledger: GrainLedger = emptyLedger(0);
  private hintsUsed = 0;
  private fizzleCount = 0;
  private roomCleared = false;
  private exiting = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_P0_2 });
  }

  init(data?: { returnScene?: string }): void {
    this.returnScene = resolveReturnScene(data);
  }

  preload(): void {
    // Direct scene jumps never ran PrologueScene — load the arena floor,
    // the keeper, and Glitch guarded so the chamber is fully inhabited.
    for (const key of [
      VISUAL_REVAMP_KEYS.PUZZLE_PROLOGUE_ACTION_ARENA_BG,
      VISUAL_REVAMP_KEYS.CONSOLE_KEEPER,
      VISUAL_REVAMP_KEYS.GLITCH,
    ]) {
      const path = getImageAssetPath(key);
      if (path && !this.textures.exists(key)) this.load.image(key, path);
    }
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
    this.pulse = createPulse(this);

    this.ledger = emptyLedger(0);
    this.hintsUsed = 0;
    this.fizzleCount = 0;
    this.roomCleared = false;
    this.exiting = false;
    this.decals = createDecalLayer(this, 6, this.reduceMotion);
    this.shell = createPrologueShell(this, flowPar(FLOW_ROUNDS));
    this.cast = new ChamberCast(this, 96, 250, P0_2_CAST);
    this.ghostPulse = new PulseGhost(this);
    this.spawnGlitchBody();
    mountTransientLegend(
      this,
      this.cameras.main.height - 18,
      "ARROWS / WASD steer the pulse at each fork · H hint · M motion",
    );

    this.unbindInput = bindFlowInput(this, {
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

    // Region companions — Bit spark keeps the room inhabited
    // (docs/VISION.md §5: a paused screenshot should still look alive).
    new BitCompanion(this, {
      stage: "spark",
      x: STAGE.width - s(60),
      y: s(160),
      scale: 1.2,
      depth: 9,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      escape?.removeAllListeners();
      hintKey?.removeAllListeners();
      this.unbindInput?.();
    });

    this.shell.seal();
    this.cast.entry();

    void this.runRound(0);
  }

  /**
   * Glitch is IN the room he broke — fidgeting by the wreckage, heckling
   * dead ends. Pure theatre: he never blocks anything (VISION §3).
   */
  private spawnGlitchBody(): void {
    const key = VISUAL_REVAMP_KEYS.GLITCH;
    if (!this.textures.exists(key)) return;
    this.glitchBody = this.add
      .image(170, STAGE.height - 130, key)
      .setScale(0.2)
      .setDepth(9)
      .setFlipX(true);
    this.tweens.add({
      targets: this.glitchBody,
      y: "-=8",
      angle: { from: -2, to: 2 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private async runRound(index: number): Promise<void> {
    this.wave = index;
    this.tearDown();

    const def = FLOW_ROUNDS[index]!;
    this.round = def;
    this.board = mountFlowBoard(this, def);
    this.outMap = buildOutMap(def);
    this.forks = forkKeySet(def);

    this.repaint();
    this.setState("preparing");
    await this.wait(PREPARE_BEAT_MS);
    void this.firePulse();
  }

  private async firePulse(): Promise<void> {
    if (!this.board || !this.round) return;
    this.setState("flowing");
    // Every pulse fired is a cost the floor remembers — the economy is
    // pulse count, physicalized as scorch marks where they die.
    this.ledger = recordTrade(this.ledger);

    const result = await this.pulse.fireReactive(this.board, {
      sourceKey: this.board.sourceKey,
      sinkKey: this.board.sinkKey,
      outMap: this.outMap,
      forkKeys: this.forks,
      decideAtFork: (current, choices) => this.decideAtFork(current, choices),
    });

    if (result.outcome === "reached") {
      void this.onReached();
      return;
    }
    this.onFizzle(result.finalKey);
  }

  private async decideAtFork(
    current: string,
    choices: string[],
  ): Promise<string | null> {
    if (!this.board) return null;
    const rings = highlightChoices(this, this.board, choices);
    const handlers = new Map<string, () => void>();
    const window = DECISION_WINDOW_MS[this.wave] ?? 1200;

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

      const timer = this.time.delayedCall(window, () => finish(null));
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

  private async onReached(): Promise<void> {
    if (!this.board) return;
    const sinkAt = coordsOf(this.board, this.board.sinkKey);
    sinkBloom(this, sinkAt);
    audioManager.playTone(659, 110, "triangle");
    this.cast.onCleanStretch();
    a11yManager.announce("The pulse reaches its console.", false);

    this.setState("cleared");
    void this.advance();
  }

  private onFizzle(finalKey: string): void {
    if (!this.board) return;
    deadEndShimmer(this, this.board, finalKey);
    // The cost is physical and permanent: the floor scorches where the
    // pulse died, and the mark stays for the whole run. No lives, no score.
    const at = coordsOf(this.board, finalKey);
    this.decals.scorchAt(at.x, at.y + 18);
    audioManager.playTone(150, 140, "sawtooth");
    this.fizzleCount += 1;
    if (this.fizzleCount % 2 === 0) {
      this.cast.glitchHeckle(170, STAGE.height - 170);
    } else {
      this.cast.onSpillStreak();
    }
    a11yManager.announce(
      "The pulse dies in a dead end — the floor scorches where it fell.",
      false,
    );
    this.time.delayedCall(RETRY_BEAT_MS, () => void this.firePulse());
  }

  private async advance(): Promise<void> {
    await this.wait(RESULT_BEAT_MS);
    if (this.wave + 1 < FLOW_ROUNDS.length) {
      void this.runRound(this.wave + 1);
      return;
    }
    this.finishConsoles();
  }

  // ── Debrief: unbarred gate, plaque tally, lever ghost, homeward pulse ──────

  private finishConsoles(): void {
    this.cast.onBloom();
    this.shell.unbar(() => {
      const par = flowPar(FLOW_ROUNDS);
      this.roomCleared = true;
      this.shell.setPlaqueTally(this.ledger.trades, par);
      this.cast.tallyLine(this.ledger.trades, par);
      this.lever = placeRuneLever(
        this,
        this.cameras.main.width / 2 - 110,
        70,
        () => void this.playGhost(),
      );
      const sinkAt = coordsOf(this.board!, this.board!.sinkKey);
      paintExitChannel(this, sinkAt.x, sinkAt.y);
      this.bindExitInput();
      a11yManager.announce(
        `Consoles cleared in ${this.ledger.trades} pulses; the minimum is ${par}. ` +
          "Pull the lever to watch the spectral pulse, or send your pulse up through the open gate.",
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
      const par = flowPar(FLOW_ROUNDS);
      const base = starsForTrades(this.ledger.trades, par);
      const stars = Math.max(1, base - (this.hintsUsed > 0 ? 1 : 0));
      completeAlgorithmiaPuzzle(this, {
        puzzleId: "p0_2",
        puzzleName: "Flow Consoles",
        concept: "Key-Value Mapping",
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
    const lines = [
      "Watch the arms before the pulse arrives — one of them dies in the dark.",
      "Steer toward the arm that still breathes.",
    ];
    const line = lines[Math.min(this.hintsUsed, lines.length) - 1]!;
    this.cast.speak(line);
    a11yManager.announce(line, false);
  }

  puzzleComplete(): void {
    completeAlgorithmiaPuzzle(this, {
      puzzleId: "p0_2",
      puzzleName: "Flow Consoles",
      concept: "Key-Value Mapping",
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
