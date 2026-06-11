import Phaser from "phaser";
import { COLORS, s } from "./tokens";
import { TIMING } from "./motion";
import { paintAtmosphere } from "./visuals/atmosphere";
import { paintPlatform, paintEdgeVignette } from "./visuals/platform";
import { ensureTileTextures } from "./visuals/runeTile";
import {
  cellKey,
  cellWorldPos,
  flashCellError,
  flashTileOn,
  getNeighbors,
  IsoGrid,
  dimPathTiles,
  markCellDone,
  mountIsoGrid,
  nearestCell,
  steerFrom,
  TILE_H,
  TILE_W,
  unmountIsoGrid,
  type GridPos,
} from "./isogrid";
import { PATH_ROUNDS } from "./pathRounds";
import { bindInput } from "./input";
import { canAcceptStep, canRoam, type PuzzleState } from "./state";
import { readReduceMotion, writeReduceMotion } from "./prefs";
import { chantRing, stepCorrect, stepMistake, winCascade } from "./feedback";
import { GAME } from "../../game/state";
import {
  completeAlgorithmiaPuzzle,
  PROLOGUE_RUN_UI_KEY,
  resolveReturnScene,
} from "../../game/algorithmiaIntegration";
import { sparkle } from "../../ui/particles";
import { BitCompanion } from "../../../ui/BitCompanion";
import {
  getImageAssetPath,
  OVERWORLD_PLAYER_SPRITE_ASSETS,
  P0_1_PUZZLE_ASSETS,
  PROLOGUE_SHEET_KEYS,
  VISUAL_REVAMP_KEYS,
} from "../../../config/assets";
import { MOTION } from "./motion";
import { SCENE_KEYS } from "../../../config/constants";
import { a11yManager } from "../../../core/A11yManager";
import { audioManager } from "../../../core/AudioManager";
import { mountTransientLegend } from "../../../ui/transientLegend";
import { ChamberCast } from "../../../puzzleRooms/chamber/ChamberCast";
import type { ChamberShell } from "../../../puzzleRooms/chamber/ChamberShell";
import {
  emptyLedger,
  recordTrade,
  starsForTrades,
  type GrainLedger,
} from "../../../puzzleRooms/grainChamber/grainEconomy";
import { pathPar } from "../../chamber/prologuePar";
import {
  createPrologueShell,
  placeRuneLever,
  type RuneLever,
} from "../../chamber/prologueShell";
import { createDecalLayer, type DecalLayer } from "../../chamber/runeDecals";
import { PathGhost } from "../../chamber/PathGhost";

const HIT_RADIUS = Math.max(TILE_W, TILE_H) * 0.72;

// Chamber walk-out geometry: cell (0,1) sits at world (640, 180), directly
// under the north gate; the old rune one tile west is the replay lever's
// floor trigger.
const EXIT_CELL: GridPos = { row: 0, col: 1 };
const LEVER_CELL: GridPos = { row: 0, col: 0 };

const P0_1_CAST = {
  keeperKey: VISUAL_REVAMP_KEYS.RUNE_KEEPER,
  keeperScale: 0.26,
  entryLine: "The runes forgot their order. Walk it back into them.",
  reactions: {
    waste: [
      "The stone remembers every false step.",
      "Easy — let the chant come back to you.",
    ],
    clean: ["You hold it well.", "The runes warm to you."],
    clear: ["The chant stands whole again.", "Listen — the chamber hums."],
  },
  tallyNoun: "steps",
  tallyVerdicts: {
    thrifty: "A clean walk.",
    lever:
      "Stand on the old rune by the gate — see the walk as the chant means it.",
  },
  bubble: { color: "#dbe7ff", backgroundColor: "#101630" },
} as const;

/** Trace an isometric diamond path on a Graphics, centred at (cx, cy). */
function diamondPath(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  k = 1,
): void {
  const hw = (TILE_W / 2) * k;
  const hh = (TILE_H / 2) * k;
  g.beginPath();
  g.moveTo(cx, cy - hh);
  g.lineTo(cx + hw, cy);
  g.lineTo(cx, cy + hh);
  g.lineTo(cx - hw, cy);
  g.closePath();
}

function strokeDiamond(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  k = 1,
): void {
  diamondPath(g, cx, cy, k);
  g.strokePath();
}

function fillDiamond(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  k = 1,
): void {
  diamondPath(g, cx, cy, k);
  g.fillPath();
}

export class FollowThePathScene extends Phaser.Scene {
  private grid: IsoGrid | null = null;
  private traceG!: Phaser.GameObjects.Graphics;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerGlow!: Phaser.GameObjects.Arc;
  private bit!: BitCompanion;
  private cursorG!: Phaser.GameObjects.Graphics;
  private neighborG!: Phaser.GameObjects.Graphics;
  private exitG: Phaser.GameObjects.Graphics | null = null;

  private shell!: ChamberShell;
  private cast!: ChamberCast;
  private decals!: DecalLayer;
  private ghost!: PathGhost;
  private lever: RuneLever | null = null;

  private state: PuzzleState = "idle";
  private wave = 0;
  private hopIndex = 0;
  private playerPos: GridPos = { row: 5, col: 2 };

  private ledger: GrainLedger = emptyLedger(0);
  private hintsUsed = 0;
  private roundCracks = 0;
  private cleanStreak = 0;
  private exiting = false;

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

    // Direct scene jumps (tests, dev) never ran PrologueScene — load the
    // arena floor and the keeper guarded so the chamber is fully dressed.
    for (const key of [
      VISUAL_REVAMP_KEYS.PUZZLE_PROLOGUE_ACTION_ARENA_BG,
      VISUAL_REVAMP_KEYS.RUNE_KEEPER,
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

    // ── Visual layers ────────────────────────────────────────────────────────
    // paintAtmosphere paints the warm arena backdrop and wires PuzzleKinetics
    // (emitPuzzleActionPulse); paintPlatform seats the grid on that floor. The
    // cosmic edge vignette belongs to the procedural fallback floor only.
    paintAtmosphere(this);
    const onArenaArt = paintPlatform(this);
    if (!onArenaArt) {
      paintEdgeVignette(this);
    }
    ensureTileTextures(this);

    this.ledger = emptyLedger(0);
    this.hintsUsed = 0;
    this.exiting = false;
    this.decals = createDecalLayer(this, 9, this.reduceMotion);
    this.traceG = this.add.graphics().setDepth(30);
    this.buildPlayerSprite();

    // Bit joins the puzzle as a Spark — it traces the chant during preview
    // and bounces beside the player on every correct step (Scene 0-4).
    const start0 = PATH_ROUNDS[0]!.path[0]!;
    const bitStart = cellWorldPos(start0.row, start0.col);
    this.bit = new BitCompanion(this, {
      stage: "spark",
      x: bitStart.x + 22,
      y: bitStart.y - 26,
      depth: 60,
    });

    // Legal-move hints (steady) + a pulsing cursor on the player's cell so the
    // board is always readable during the player's turn.
    this.neighborG = this.add.graphics().setDepth(24);
    this.cursorG = this.add.graphics().setDepth(25);
    this.cursorG.lineStyle(s(2.5), 0xffffff, 0.95);
    strokeDiamond(this.cursorG, 0, 0, 0.9);
    this.cursorG.setVisible(false);
    this.tweens.add({
      targets: this.cursorG,
      alpha: { from: 0.95, to: 0.42 },
      scaleX: { from: 1, to: 1.07 },
      scaleY: { from: 1, to: 1.07 },
      duration: 640,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.exitG = this.add.graphics().setDepth(23);

    // ── Chamber ──────────────────────────────────────────────────────────────
    this.shell = createPrologueShell(this, pathPar(PATH_ROUNDS));
    this.cast = new ChamberCast(this, 1040, 320, P0_1_CAST);
    this.ghost = new PathGhost(this);
    mountTransientLegend(
      this,
      this.cameras.main.height - 18,
      "ARROWS / WASD step · R echo the chant · H hint · M motion",
    );
    this.shell.seal();
    this.cast.entry();

    // ── Input ────────────────────────────────────────────────────────────────
    this.unbindInput = bindInput(this, {
      onSteer: (dx, dy) => this.steer(dx, dy),
      onPickWorld: (x, y) => this.pickAt(x, y),
      onHoverWorld: (x, y) => this.hoverAt(x, y),
      onReplay: () => this.onReplayKey(),
      onToggleReduceMotion: () => this.toggleReduceMotion(),
    });

    const esc = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    esc?.on("down", this.exitScene, this);
    const hintKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.H,
    );
    hintKey?.on("down", this.showHint, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      esc?.removeAllListeners();
      hintKey?.removeAllListeners();
      this.unbindInput?.();
    });

    void this.runRound(0);
  }

  // ── Round lifecycle ─────────────────────────────────────────────────────────

  private async runRound(index: number): Promise<void> {
    this.wave = index;
    this.tearDown();

    const round = PATH_ROUNDS[index]!;
    this.grid = mountIsoGrid(this, round.field, round.path);
    this.playerPos = { ...round.path[0]! };
    this.hopIndex = 0;
    this.roundCracks = 0;

    // The keeper sets the round's stakes in one bubble line — no banner,
    // no panel (VISION §3: characters carry story).
    this.cast.speak(round.npcLine);
    a11yManager.announce(round.npcLine, false);

    this.positionPlayer(this.playerPos);

    // Start dark — flashTileOn in chantStep lights one tile at a time
    dimPathTiles(this.grid, this);
    this.setState("preview");
    await this.runPreview();
    this.positionPlayer(this.playerPos); // reset sprite to start after preview walk
    // Bring Bit back beside the player for their turn.
    const bitHome = cellWorldPos(this.playerPos.row, this.playerPos.col);
    this.bit?.moveTo(bitHome.x + 22, bitHome.y - 26, 300);
    // Tiles are already dark — flashTileOn faded them individually
    this.setState("turn");
    a11yManager.announce("Your turn. Echo the chant, one step at a time.", false);
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
    if (this.grid)
      flashTileOn(this.grid, pos.row, pos.col, this, TIMING.chantStep - 100);
    // Bit hovers to each glowing tile in turn, helping the player track order.
    this.bit?.moveTo(x + 18, y - 24, Math.min(280, TIMING.chantStep * 0.6));
    if (prevPos) void this.walkPlayerTo(prevPos, pos);
    return new Promise<void>((resolve) =>
      this.time.delayedCall(TIMING.chantStep, () => resolve()),
    );
  }

  private onReplayKey(): void {
    if (canRoam(this.state)) {
      this.pullLever();
      return;
    }
    void this.replay();
  }

  private async replay(): Promise<void> {
    if (this.state !== "turn" || !this.grid) return;
    this.hopIndex = 0;
    this.playerPos = { ...PATH_ROUNDS[this.wave]!.path[0]! };
    this.positionPlayer(this.playerPos);
    this.traceG.clear();
    dimPathTiles(this.grid, this);
    this.setState("preview");
    await this.runPreview();
    this.setState("turn");
  }

  private async finishRound(): Promise<void> {
    if (!this.grid) return;
    this.setState("cleared");

    const path = PATH_ROUNDS[this.wave]!.path;
    const pathPoints = path.map((p) => {
      const w = cellWorldPos(p.row, p.col);
      return new Phaser.Math.Vector2(w.x, w.y);
    });
    this.npcReact("win");
    await winCascade(this, pathPoints, this.reduceMotion);
    await this.wait(TIMING.winHold);

    if (this.wave + 1 < PATH_ROUNDS.length) {
      void this.runRound(this.wave + 1);
      return;
    }

    this.openChamber();
  }

  // ── Debrief: unbarred gate, plaque tally, lever ghost, walk-out ────────────

  private openChamber(): void {
    const par = pathPar(PATH_ROUNDS);
    this.cast.onBloom();
    this.shell.unbar(() => {
      this.shell.setPlaqueTally(this.ledger.trades, par);
      this.cast.tallyLine(this.ledger.trades, par);
      this.lever = placeRuneLever(this, 560, 96, () => this.pullLever());
      this.setState("roam");
      this.paintExitMarkers();
      this.mountGateZone();
      a11yManager.announce(
        `The gate stands open. ${this.ledger.trades} steps to walk the chant; the chant itself is ${par}. ` +
          "Stand on the old rune west of the gate to see the spectral walk, or step out through the north gate.",
        true,
      );
    });
  }

  /** Soft glow on the exit cell + lever cell so the open gate reads spatially. */
  private paintExitMarkers(): void {
    if (!this.exitG) return;
    this.exitG.clear();
    const exit = cellWorldPos(EXIT_CELL.row, EXIT_CELL.col);
    this.exitG.fillStyle(0x9fe8f7, 0.16);
    fillDiamond(this.exitG, exit.x, exit.y, 0.9);
    this.exitG.lineStyle(s(1.5), 0x9fe8f7, 0.6);
    strokeDiamond(this.exitG, exit.x, exit.y, 0.9);
    const lever = cellWorldPos(LEVER_CELL.row, LEVER_CELL.col);
    this.exitG.lineStyle(s(1.5), 0x7fd9e8, 0.4);
    strokeDiamond(this.exitG, lever.x, lever.y, 0.8);
    this.tweens.add({
      targets: this.exitG,
      alpha: { from: 1, to: 0.45 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private mountGateZone(): void {
    const gate = this.add
      .zone(this.cameras.main.width / 2, 24, 140, 60)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    gate.on("pointerdown", () => {
      if (
        this.playerPos.row === EXIT_CELL.row &&
        this.playerPos.col === EXIT_CELL.col
      ) {
        this.walkOut();
      }
    });
  }

  private pullLever(): void {
    if (!canRoam(this.state) || this.ghost.isPlaying) return;
    this.lever?.pull();
    void this.ghost.play(PATH_ROUNDS[PATH_ROUNDS.length - 1]!.path);
  }

  private walkOut(): void {
    if (this.exiting) return;
    this.exiting = true;
    this.setState("cleared");
    a11yManager.announce("You step out through the open gate.", true);
    audioManager.playTone(587, 160, "triangle");
    this.playerSprite.play("p0-walk-up", true);
    this.tweens.add({
      targets: [this.playerSprite, this.playerGlow],
      y: "-=170",
      alpha: 0.2,
      duration: 900,
      ease: "Sine.easeIn",
      onComplete: () => {
        const par = pathPar(PATH_ROUNDS);
        const base = starsForTrades(this.ledger.trades, par);
        const stars = Math.max(1, base - (this.hintsUsed > 0 ? 1 : 0));
        completeAlgorithmiaPuzzle(this, {
          puzzleId: "p0_1",
          puzzleName: "Follow the Path",
          concept: "Sequential Processing",
          returnScene: this.returnScene,
          startedAt: this.startedAt,
          stars,
          hintsUsed: this.hintsUsed,
          delayMs: 200,
        });
      },
    });
  }

  // ── Input handlers ──────────────────────────────────────────────────────────

  private pickAt(worldX: number, worldY: number): void {
    if (!this.grid) return;
    const cell = nearestCell(this.grid, worldX, worldY, HIT_RADIUS);
    if (!cell) return;
    if (canRoam(this.state)) {
      this.tryRoamStep({ row: cell.row, col: cell.col });
      return;
    }
    if (!canAcceptStep(this.state)) return;
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
      const isCurrentPos =
        cell.row === this.playerPos.row && cell.col === this.playerPos.col;
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
    if (!this.grid) return;
    if (canRoam(this.state)) {
      if (
        dy < 0 &&
        this.playerPos.row === EXIT_CELL.row &&
        this.playerPos.col === EXIT_CELL.col
      ) {
        this.walkOut();
        return;
      }
      const next = steerFrom(
        this.grid,
        this.playerPos.row,
        this.playerPos.col,
        dx,
        dy,
      );
      if (next) this.tryRoamStep(next);
      return;
    }
    if (!canAcceptStep(this.state)) return;
    const next = steerFrom(
      this.grid,
      this.playerPos.row,
      this.playerPos.col,
      dx,
      dy,
    );
    if (next) this.tryHop(next);
  }

  // ── Step validation ─────────────────────────────────────────────────────────

  private tryRoamStep(candidate: GridPos): void {
    if (!this.grid || this.exiting) return;
    const neighbors = getNeighbors(
      this.grid,
      this.playerPos.row,
      this.playerPos.col,
    );
    const isNeighbor = neighbors.some(
      (n) => n.row === candidate.row && n.col === candidate.col,
    );
    if (!isNeighbor) return;
    const prev = { ...this.playerPos };
    this.playerPos = { ...candidate };
    void this.walkPlayerTo(prev, candidate);
    this.updateCursor();
    if (
      candidate.row === LEVER_CELL.row &&
      candidate.col === LEVER_CELL.col
    ) {
      this.pullLever();
    }
  }

  private tryHop(candidate: GridPos): void {
    if (!this.grid) return;

    // Must be a neighbor of the current position
    const neighbors = getNeighbors(
      this.grid,
      this.playerPos.row,
      this.playerPos.col,
    );
    const isNeighbor = neighbors.some(
      (n) => n.row === candidate.row && n.col === candidate.col,
    );
    if (!isNeighbor) return;

    const path = PATH_ROUNDS[this.wave]!.path;
    const expected = path[this.hopIndex + 1];
    if (!expected) return;

    const { x, y } = cellWorldPos(candidate.row, candidate.col);
    const at = new Phaser.Math.Vector2(x, y);

    // The economy counts every step taken — clean or cracked. The floor
    // shows the difference; no counter does.
    this.ledger = recordTrade(this.ledger);

    if (candidate.row === expected.row && candidate.col === expected.col) {
      this.onCorrectHop(candidate, at);
    } else {
      const cell = this.grid.cells.get(cellKey(candidate.row, candidate.col));
      if (cell) {
        stepMistake(this, cell.base, at, this.reduceMotion);
      }
      this.onWrongHop(candidate, at);
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
    this.npcReact("correct");
    // Bit bounces beside the tile the player just landed — earned celebration.
    this.bit?.moveTo(at.x + 18, at.y - 24, 200);
    this.bit?.pulse();
    this.updateCursor();
    audioManager.playTone(392 + this.hopIndex * 36, 55, "triangle");
    sparkle(this, at.x, at.y);

    // Reset alpha dimming from hover
    this.grid.cells.forEach((c) => c.base.setAlpha(1));

    this.cleanStreak += 1;
    if (this.cleanStreak % 5 === 0) this.cast.onCleanStretch();

    if (this.hopIndex >= PATH_ROUNDS[this.wave]!.path.length - 1) {
      void this.finishRound();
    }
  }

  private onWrongHop(pos: GridPos, at: Phaser.Math.Vector2): void {
    // The cost is physical and permanent: the stone cracks where the wrong
    // step landed, and the mark stays for the whole run (no lives, no
    // score — failing out belongs to boss escalation, not first contact).
    this.decals.crackAt(at.x, at.y + 6);
    this.roundCracks += 1;
    this.cleanStreak = 0;
    flashCellError(this, pos.row, pos.col);
    this.cameras.main.shake(140, 0.005);
    this.npcReact("wrong");
    audioManager.playTone(140, 130, "sawtooth");
    if (this.roundCracks >= 2) this.cast.onSpillStreak();
    a11yManager.announce("The stone cracks — that rune was not next.", false);

    void this.afterMistake();
  }

  private async afterMistake(): Promise<void> {
    if (!this.grid) return;
    const TAIL = 3;
    this.setState("preview");
    const path = PATH_ROUNDS[this.wave]!.path;
    const start = Math.max(0, this.hopIndex + 1 - TAIL);
    const end = Math.min(path.length - 1, this.hopIndex + 1);
    await this.wait(TIMING.segmentReplayPause);
    for (let i = start; i <= end; i++) {
      await this.chantStep(path[i]!);
    }
    this.setState("turn");
  }

  // ── Hints (H — the only prompting path) ────────────────────────────────────

  private showHint(): void {
    if (this.state !== "turn" || !this.grid) return;
    const next = PATH_ROUNDS[this.wave]!.path[this.hopIndex + 1];
    if (!next) return;
    this.hintsUsed += 1;
    flashTileOn(this.grid, next.row, next.col, this, 900);
    audioManager.playTone(740, 80, "sine");
    a11yManager.announce("The next rune glows once more.", false);
  }

  // ── Character reactions ─────────────────────────────────────────────────────

  private npcReact(emotion: "correct" | "wrong" | "win"): void {
    const npc = this.cast.sprite;
    if (!npc) return;
    const baseX = npc.x;
    const baseY = npc.y;
    const baseScale = npc.scaleX;
    this.tweens.killTweensOf(npc);

    if (emotion === "wrong") {
      this.tweens.add({
        targets: npc,
        x: { from: baseX - 7, to: baseX + 7 },
        duration: 55,
        yoyo: true,
        repeat: 2,
        ease: "Sine.easeInOut",
        onComplete: () => npc.setX(baseX),
      });
    } else if (emotion === "correct") {
      this.tweens.add({
        targets: npc,
        y: baseY - 9,
        scaleX: baseScale * 1.07,
        scaleY: baseScale * 1.07,
        duration: 110,
        yoyo: true,
        ease: "Quad.easeOut",
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
        ease: "Back.easeOut",
        repeat: 1,
        onComplete: () => npc.setY(baseY).setScale(baseScale),
      });
    }
  }

  private buildPlayerSprite(): void {
    const startPos = PATH_ROUNDS[0]!.path[0]!;
    const { x, y } = cellWorldPos(startPos.row, startPos.col);

    // Soft position glow under the character
    this.playerGlow = this.add
      .circle(x, y, 24, COLORS.accent, 0.22)
      .setDepth(49);
    this.tweens.add({
      targets: this.playerGlow,
      alpha: 0.06,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const playerKey = PROLOGUE_SHEET_KEYS.PLAYER;
    this.playerSprite = this.add
      .sprite(x, y, playerKey, 0)
      .setOrigin(0.5, 1)
      .setScale(0.25)
      .setDepth(50);

    if (!this.anims.exists("p0-walk-down")) {
      const gen = (start: number, end: number) =>
        this.anims.generateFrameNumbers(playerKey, { start, end });
      this.anims.create({
        key: "p0-walk-down",
        frames: gen(0, 7),
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: "p0-walk-left",
        frames: gen(8, 15),
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: "p0-walk-right",
        frames: gen(16, 23),
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: "p0-walk-up",
        frames: gen(24, 31),
        frameRate: 10,
        repeat: -1,
      });
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
    let animKey = "p0-walk-down";
    if (dCol > 0) animKey = "p0-walk-right";
    else if (dCol < 0) animKey = "p0-walk-left";
    else if (dRow < 0) animKey = "p0-walk-up";

    this.playerSprite.play(animKey, true);

    const { x, y } = cellWorldPos(to.row, to.col);
    const dur = MOTION.settle.duration;

    return new Promise<void>((resolve) => {
      this.tweens.add({
        targets: this.playerSprite,
        x,
        y,
        duration: dur,
        ease: MOTION.settle.ease,
        onComplete: () => {
          this.playerSprite.stop().setFrame(0);
          resolve();
        },
      });
      this.tweens.add({
        targets: this.playerGlow,
        x,
        y,
        duration: dur,
        ease: MOTION.settle.ease,
      });
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
    return new Promise<void>((resolve) =>
      this.time.delayedCall(ms, () => resolve()),
    );
  }

  private setState(next: PuzzleState): void {
    this.state = next;
    this.updateCursor();
  }

  /** Redraw the player-cell cursor + legal-neighbour hints (turn/roam). */
  private updateCursor(): void {
    if (!this.cursorG || !this.neighborG) return;
    this.neighborG.clear();
    const active =
      (this.state === "turn" || this.state === "roam") && !!this.grid;
    this.cursorG.setVisible(active);
    if (!active || !this.grid) return;

    const here = cellWorldPos(this.playerPos.row, this.playerPos.col);
    this.cursorG.setPosition(here.x, here.y);

    for (const n of getNeighbors(
      this.grid,
      this.playerPos.row,
      this.playerPos.col,
    )) {
      const w = cellWorldPos(n.row, n.col);
      this.neighborG.fillStyle(0x3ce6ff, 0.12);
      fillDiamond(this.neighborG, w.x, w.y, 0.82);
      this.neighborG.lineStyle(s(1.5), 0x3ce6ff, 0.5);
      strokeDiamond(this.neighborG, w.x, w.y, 0.82);
    }
  }

  private tearDown(): void {
    this.traceG.clear();
    if (this.grid) unmountIsoGrid(this.grid);
    this.grid = null;
  }

  private toggleReduceMotion(): void {
    this.reduceMotion = !this.reduceMotion;
    writeReduceMotion(this.reduceMotion);
  }

  private exitScene(): void {
    if (this.scene.isActive(PROLOGUE_RUN_UI_KEY))
      this.scene.stop(PROLOGUE_RUN_UI_KEY);
    GAME.reset();
    this.scene.start(this.returnScene);
  }

  /** Public hook for test injection (used by Playwright). */
  puzzleComplete(): void {
    completeAlgorithmiaPuzzle(this, {
      puzzleId: "p0_1",
      puzzleName: "Follow the Path",
      concept: "Sequential Processing",
      returnScene: this.returnScene,
      startedAt: this.startedAt,
      delayMs: 0,
    });
  }
}
