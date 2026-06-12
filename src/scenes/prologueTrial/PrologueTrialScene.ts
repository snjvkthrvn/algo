/**
 * PrologueTrialScene — "The Echo Causeway" (spec:
 * docs/superpowers/specs/2026-06-12-prologue-trial-room-design.md).
 *
 * A sealed trial chamber whose background is assembled the Movement Gym
 * way: a PIL-script-generated 32px tileset laid out by the pure
 * `pickTrialTile` plan and baked into ONE RenderTexture (no imagegen),
 * styled to mimic the live Prologue overworld. The real overworld stack
 * (Player, Bit, camera follow) walks on top.
 *
 * The trial is a three-leg memory walk over a void chasm: each leg's
 * runes light in order, dim, and the player crosses from memory. Wrong
 * stones crumble permanently — the floor is the scoreboard (no timer, no
 * lives, VISION §6). Clear all legs → chamber debrief (plaque tally,
 * lever ghost replay) and walk out the north gate to complete.
 *
 * Dev-warp reachable only (?scene=PrologueTrialScene or DebugSelect);
 * never part of progression yet.
 */

import Phaser from "phaser";
import { PROLOGUE_TRIAL_KEYS, PROLOGUE_TRIAL_SHEET_ASSETS } from "../../config/assets";
import { SCENE_KEYS } from "../../config/constants";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";
import { TransitionManager } from "../../core/TransitionManager";
import { BitCompanion } from "../../entities/BitCompanion";
import { Player } from "../../entities/Player";
import { HUDManager } from "../../systems/HUDManager";
import { setupUICamera } from "../../utils/uiCamera";
import { BaseOverworldScene } from "../BaseOverworldScene";
import {
  completeAlgorithmiaPuzzle,
} from "../../arcadePrologue/game/algorithmiaIntegration";
import {
  createPrologueShell,
  loadPrologueChamberAssets,
  placeRuneLever,
  type RuneLever,
} from "../../arcadePrologue/chamber/prologueShell";
import type { ChamberShell } from "../../puzzleRooms/chamber/ChamberShell";
import { starsForTrades } from "../../puzzleRooms/grainChamber/grainEconomy";
import {
  TRIAL_LEGS,
  beginWalk,
  beginWatch,
  gradeStep,
  initialTrialState,
  isFieldTile,
  trialPar,
  type TileXY,
  type TrialState,
} from "./memoryWalk";
import {
  TRIAL_COLS,
  TRIAL_ROWS,
  TRIAL_TILE,
  TRIAL_TILE_PX,
  bandAt,
  pickTrialTile,
} from "./trialTiles";
import { TrialGhost } from "./trialGhost";

const TILE = TRIAL_TILE_PX;
const WORLD_W = TRIAL_COLS * TILE; // 1280
const WORLD_H = TRIAL_ROWS * TILE; // 736
const SPAWN = { x: 20 * TILE + TILE / 2, y: 21 * TILE + TILE / 2 };
const LEVER_AT = { x: 544, y: 88 };
const WATCH_STEP_MS = 650;
const WATCH_LIT_MS = 420;

function tileCenter(tile: TileXY): { x: number; y: number } {
  return {
    x: tile.tx * TILE + TILE / 2,
    y: tile.ty * TILE + TILE / 2,
  };
}

export class PrologueTrialScene extends BaseOverworldScene {
  private trial: TrialState = initialTrialState();
  private runes = new Map<string, Phaser.GameObjects.Image>();
  private lastTile: TileXY = { tx: -1, ty: -1 };
  private lastSafeWorld = { ...SPAWN };
  private hintsUsed = 0;
  private exiting = false;
  private startedAt = Date.now();

  private shell!: ChamberShell;
  private ghost!: TrialGhost;
  private lever: RuneLever | null = null;

  constructor() {
    super({ key: SCENE_KEYS.PROLOGUE_TRIAL });
  }

  protected getRegionImageAssets(): ReadonlyArray<{
    key: string;
    path: string;
  }> {
    return [];
  }

  protected override getRegionSpriteSheetAssets() {
    return [...PROLOGUE_TRIAL_SHEET_ASSETS];
  }

  preload(): void {
    super.preload();
    loadPrologueChamberAssets(this);
  }

  create(): void {
    this.hasShutdown = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    audioManager.setScene(this);

    this.trial = initialTrialState();
    this.hintsUsed = 0;
    this.exiting = false;
    this.startedAt = Date.now();
    this.lastSafeWorld = { ...SPAWN };

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.drawFloor();
    this.mountCauseway();

    this.player = new Player(this, SPAWN.x, SPAWN.y, {
      canMoveTo: (point) => this.isWalkable(point),
    });
    this.bit = new BitCompanion(this, SPAWN.x, SPAWN.y);
    this.lastTile = this.tileUnderPlayer();

    this.shell = createPrologueShell(this, trialPar());
    this.ghost = new TrialGhost(this);

    this.hud = new HUDManager(this);
    setupUICamera(this);
    this.setupOverworldCamera(WORLD_W, WORLD_H);
    this.playEntranceFade();
    this.hud.showRegionCard("The Echo Causeway", "An old trial, still lit.");

    this.input.keyboard?.on("keydown-ESC", this.onEsc);
    this.input.keyboard?.on("keydown-H", this.onHint);

    this.time.delayedCall(900, () => {
      this.shell.seal();
      this.time.delayedCall(900, () => this.runWatch());
    });
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta);
    const pos = this.player.getPosition();
    this.bit.update(pos.x, pos.y, delta);

    const tile = this.tileUnderPlayer();
    if (tile.tx !== this.lastTile.tx || tile.ty !== this.lastTile.ty) {
      this.lastTile = tile;
      this.onTileEntered(tile);
    }

    // Walk-out: through the unbarred north gate after the trial clears.
    if (
      this.trial.phase === "cleared" &&
      !this.exiting &&
      pos.y < 64 &&
      Math.abs(pos.x - WORLD_W / 2) < 56
    ) {
      this.walkOut();
    }
  }

  // ── Background: the gym pattern, prologue register ─────────────────────────

  /** Bake the whole static plan into one RenderTexture (3,680 tiles → 1 GO). */
  private drawFloor(): void {
    if (!this.textures.exists(PROLOGUE_TRIAL_KEYS.TILESET)) {
      this.drawProceduralFloor();
      return;
    }
    const rt = this.add
      .renderTexture(0, 0, WORLD_W, WORLD_H)
      .setOrigin(0, 0)
      .setDepth(0);
    rt.beginDraw();
    for (let ty = 0; ty < TRIAL_ROWS; ty++) {
      for (let tx = 0; tx < TRIAL_COLS; tx++) {
        rt.batchDrawFrame(
          PROLOGUE_TRIAL_KEYS.TILESET,
          pickTrialTile(tx, ty),
          tx * TILE,
          ty * TILE,
        );
      }
    }
    rt.endDraw();
  }

  /** Fallback when the tileset texture is unavailable (minimal test boots). */
  private drawProceduralFloor(): void {
    const g = this.add.graphics().setDepth(0);
    for (let ty = 0; ty < TRIAL_ROWS; ty++) {
      for (let tx = 0; tx < TRIAL_COLS; tx++) {
        const band = bandAt(ty);
        if (band === "rim") g.fillStyle(0x171c2e, 1);
        else if (band === "chasm") g.fillStyle(0x0b0e1d, 1);
        else g.fillStyle((tx + ty) % 2 === 0 ? 0x2e3450 : 0x293049, 1);
        g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
  }

  /** One dynamic Image per causeway field tile (DIM / LIT / CRUMBLED). */
  private mountCauseway(): void {
    const hasArt = this.textures.exists(PROLOGUE_TRIAL_KEYS.TILESET);
    for (const leg of TRIAL_LEGS) {
      for (let ty = leg.field.y0; ty <= leg.field.y1; ty++) {
        for (let tx = leg.field.x0; tx <= leg.field.x1; tx++) {
          const at = tileCenter({ tx, ty });
          const rune = hasArt
            ? this.add.image(at.x, at.y, PROLOGUE_TRIAL_KEYS.TILESET, TRIAL_TILE.RUNE_DIM)
            : this.add.image(at.x, at.y, "__WHITE").setDisplaySize(TILE, TILE).setTint(0x293049);
          rune.setDepth(4);
          this.runes.set(`${tx},${ty}`, rune);
        }
      }
    }
  }

  private setRuneFrame(tile: TileXY, frame: number): void {
    const rune = this.runes.get(`${tile.tx},${tile.ty}`);
    if (!rune) return;
    if (this.textures.exists(PROLOGUE_TRIAL_KEYS.TILESET)) {
      rune.setFrame(frame);
      return;
    }
    // Art-less fallback: tint encodes the state.
    rune.setTint(
      frame === TRIAL_TILE.RUNE_LIT
        ? 0x22d3ee
        : frame === TRIAL_TILE.RUNE_CRUMBLED
          ? 0x0b0e1d
          : 0x293049,
    );
  }

  // ── Walkability (Player callback) ───────────────────────────────────────────

  private isWalkable(point: { x: number; y: number }): boolean {
    const tx = Math.floor(point.x / TILE);
    const ty = Math.floor(point.y / TILE);
    if (tx <= 0 || tx >= TRIAL_COLS - 1 || ty <= 0 || ty >= TRIAL_ROWS - 1) {
      return false;
    }
    if (bandAt(ty) !== "chasm") return true;
    const leg = TRIAL_LEGS.find((l) => isFieldTile(l, tx, ty));
    if (!leg) return false;
    if (this.trial.crumbled.some((c) => c.tx === tx && c.ty === ty)) {
      return false;
    }
    const legIndex = TRIAL_LEGS.indexOf(leg);
    if (legIndex < this.trial.legIndex) {
      // Cleared legs: only the lit safe path remains as a bridge.
      return leg.path.some((p) => p.tx === tx && p.ty === ty);
    }
    if (legIndex > this.trial.legIndex) return false;
    return this.trial.phase === "walk" || this.trial.phase === "cleared";
  }

  // ── The gauntlet ────────────────────────────────────────────────────────────

  private tileUnderPlayer(): TileXY {
    const pos = this.player.getPosition();
    return { tx: Math.floor(pos.x / TILE), ty: Math.floor(pos.y / TILE) };
  }

  private runWatch(): void {
    const leg = TRIAL_LEGS[this.trial.legIndex];
    if (!leg) return;
    this.trial = beginWatch(this.trial);
    this.player.freeze();
    a11yManager.announce(
      `The causeway stones light in order — watch leg ${this.trial.legIndex + 1}.`,
      false,
    );
    leg.path.forEach((tile, i) => {
      this.time.delayedCall(400 + i * WATCH_STEP_MS, () => {
        this.setRuneFrame(tile, TRIAL_TILE.RUNE_LIT);
        audioManager.playTone(392 + i * 36, 70, "triangle");
        this.time.delayedCall(WATCH_LIT_MS, () => {
          if (this.trial.phase === "watch") {
            this.setRuneFrame(tile, TRIAL_TILE.RUNE_DIM);
          }
        });
      });
    });
    this.time.delayedCall(400 + leg.path.length * WATCH_STEP_MS + 300, () => {
      this.trial = beginWalk(this.trial);
      this.player.unfreeze();
      a11yManager.announce("Walk it from memory.", false);
    });
  }

  private onTileEntered(tile: TileXY): void {
    const result = gradeStep(this.trial, tile.tx, tile.ty);
    this.trial = result.state;
    switch (result.verdict) {
      case "safe": {
        this.setRuneFrame(tile, TRIAL_TILE.RUNE_LIT);
        const at = tileCenter(tile);
        this.lastSafeWorld = { x: at.x, y: at.y };
        audioManager.playTone(392 + this.trial.stepIndex * 36, 60, "triangle");
        break;
      }
      case "crumble": {
        this.setRuneFrame(tile, TRIAL_TILE.RUNE_CRUMBLED);
        audioManager.playTone(140, 130, "sawtooth");
        this.cameras.main.shake(120, 0.004);
        a11yManager.announce(
          "The stone crumbles into the void — it was not next. The chant restarts from the bank.",
          false,
        );
        // Ease the player back; the crumbled stone stays gone forever.
        this.player.walkTo(this.lastSafeWorld.x, this.lastSafeWorld.y);
        break;
      }
      case "legCleared": {
        this.setRuneFrame(tile, TRIAL_TILE.RUNE_LIT);
        const at = tileCenter(tile);
        this.lastSafeWorld = { x: at.x, y: at.y };
        audioManager.playTone(659, 120, "triangle");
        a11yManager.announce("The far bank holds. The next crossing wakes.", false);
        this.time.delayedCall(1100, () => this.runWatch());
        break;
      }
      case "allCleared": {
        this.setRuneFrame(tile, TRIAL_TILE.RUNE_LIT);
        audioManager.playTone(784, 160, "triangle");
        this.openChamber();
        break;
      }
      default:
        break;
    }
  }

  // ── Debrief: unbarred gate, plaque tally, lever ghost, walk-out ────────────

  private openChamber(): void {
    const par = trialPar();
    this.shell.unbar(() => {
      this.shell.setPlaqueTally(this.trial.steps, par);
      this.lever = placeRuneLever(this, LEVER_AT.x, LEVER_AT.y, () =>
        this.pullLever(),
      );
      a11yManager.announce(
        `The gate stands open. ${this.trial.steps} steps to cross; the causeway itself is ${par}. ` +
          "Pull the lever by the gate to watch the spectral crossing, or walk out through the north gate.",
        true,
      );
    });
  }

  private pullLever(): void {
    if (this.trial.phase !== "cleared" || this.ghost.isPlaying) return;
    this.lever?.pull();
    void this.ghost.play(TRIAL_LEGS.flatMap((leg) => [...leg.path]));
  }

  private onHint = (): void => {
    if (this.trial.phase !== "walk") return;
    const leg = TRIAL_LEGS[this.trial.legIndex];
    const next = leg?.path[this.trial.stepIndex];
    if (!next) return;
    this.hintsUsed += 1;
    this.setRuneFrame(next, TRIAL_TILE.RUNE_LIT);
    this.time.delayedCall(900, () => {
      if (this.trial.phase === "walk") this.setRuneFrame(next, TRIAL_TILE.RUNE_DIM);
    });
    audioManager.playTone(740, 80, "sine");
    a11yManager.announce("The next stone glows once more.", false);
  };

  private walkOut(): void {
    if (this.exiting) return;
    this.exiting = true;
    this.player.freeze();
    a11yManager.announce("You step out through the open gate.", true);
    audioManager.playTone(587, 160, "triangle");
    const par = trialPar();
    const base = starsForTrades(this.trial.steps, par);
    const stars = Math.max(1, base - (this.hintsUsed > 0 ? 1 : 0));
    completeAlgorithmiaPuzzle(this, {
      puzzleId: "p0_trial",
      puzzleName: "The Echo Causeway",
      concept: "Sequential Memory",
      returnScene: SCENE_KEYS.PROLOGUE,
      startedAt: this.startedAt,
      stars,
      hintsUsed: this.hintsUsed,
      delayMs: 200,
    });
  }

  /** Public hook for test injection (used by Playwright). */
  puzzleComplete(): void {
    completeAlgorithmiaPuzzle(this, {
      puzzleId: "p0_trial",
      puzzleName: "The Echo Causeway",
      concept: "Sequential Memory",
      returnScene: SCENE_KEYS.PROLOGUE,
      startedAt: this.startedAt,
      delayMs: 0,
    });
  }

  private onEsc = (): void => {
    TransitionManager.fade(this, SCENE_KEYS.DEBUG_SELECT);
  };

  private shutdown(): void {
    this.hasShutdown = true;
    this.input.keyboard?.off("keydown-ESC", this.onEsc);
    this.input.keyboard?.off("keydown-H", this.onHint);
    this.hud?.destroy();
    this.lever?.destroy();
    this.lever = null;
    this.runes.clear();
  }
}
