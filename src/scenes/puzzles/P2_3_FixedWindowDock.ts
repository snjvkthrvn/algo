/**
 * P2_3_FixedWindowDock — "The Fishing Dock" (TR_3).
 *
 * Chamber rollout (spec:
 * docs/superpowers/specs/2026-06-12-p2-3-fishing-dock-design.md):
 *   • Sealed dock arena. Weighted fish baskets line the slat row; a NET
 *     FRAME of width k floats alongside and FOLLOWS THE PLAYER'S WALK,
 *     sliding slat by slat. Every slide the entering basket pulses bright
 *     and the leaving one dims — the edges are the whole show, the middle
 *     keeps itself. No SUM/BEST readouts, no window-size status line.
 *   • Hauls happen at the weigh-beam on the dock's west head: a maximum
 *     catch lashes to the beam and the round clears; anything lighter
 *     tears the net — persistent splash debris (the cost economy).
 *   • Par per round is one honest sweep plus the haul; a player who reads
 *     the carved weights and walks straight to the heaviest window beats
 *     par. Slides record only when the frame's start actually changes.
 *   • Glitch recounts windows from scratch at his corner. The Window
 *     Fisher's scripted NAME_IT beat survives untouched.
 */

import Phaser from "phaser";
import { BasePuzzleScene } from "./BasePuzzleScene";
import { COLORS, SCENE_KEYS } from "../../config/constants";
import {
  VISUAL_REVAMP_KEYS,
  FISHING_DOCK_KEYS,
  FISHING_DOCK_IMAGE_ASSETS,
  MIRROR_CROSSING_SHEET_ASSETS,
} from "../../config/assets";
import { a11yManager } from "../../core/A11yManager";
import { JuiceSystem } from "../../systems/JuiceSystem";
import { PuzzleAmbience } from "../../ui/PuzzleAmbience";
import { BitCompanion } from "../../ui/BitCompanion";
import { TWIN_RIVERS_PUZZLE_THEME, type PuzzleTheme } from "./puzzleTheme";
import type {
  RegionBackdropId,
  RegionBackdropOptions,
} from "../../ui/RegionBackdrop";
import { numberKeyToIndex } from "../../input/NumberKeyCommand";
import { PuzzleRoom } from "../../puzzleRooms/PuzzleRoom";
import {
  emptyLedger,
  recordTrade,
  starsForTrades,
  type GrainLedger,
} from "../../puzzleRooms/grainChamber/grainEconomy";
import {
  DOCK_ROUNDS,
  bestWindowStart,
  dockPar,
  windowSum,
} from "../../puzzleRooms/fishingDock/dockPlan";
import { frameStartAtX } from "../../puzzleRooms/fishingDock/dockRules";
import { BasketRow, NetFrame } from "../../puzzleRooms/fishingDock/BasketRow";
import { DockReplay } from "../../puzzleRooms/fishingDock/DockReplay";
import { GlitchSplasher } from "../../puzzleRooms/mirrorCrossing/GlitchSplasher";
import { ChamberShell } from "../../puzzleRooms/chamber/ChamberShell";
import { ChamberCast } from "../../puzzleRooms/chamber/ChamberCast";
import { CartDelivery } from "../../puzzleRooms/chamber/CartDelivery";

const BEAM_REACH = 64;

const DOCK_CAST = {
  keeperKey: VISUAL_REVAMP_KEYS.WINDOW_FISHER,
  entryLine: "The river gives by the netful. Bring the beam its heaviest.",
  reactions: {
    waste: [
      "The net tore — that catch was lighter than it looked.",
      "The beam knows heavier when it holds it.",
    ],
    clean: [
      "You watched the edges. That's the whole craft.",
      "One pass, no second-guessing. Like a fisher born.",
    ],
    clear: ["The beam holds!", "Heaviest catch on the river tonight."],
  },
  tallyNoun: "moves",
} as const;

export class P2_3_FixedWindowDock extends BasePuzzleScene {
  private roundIndex = 0;
  private ledger: GrainLedger = emptyLedger(0);
  private dockCleared = false;
  private exiting = false;
  private leverX = -1;
  private rowYPx = 0;
  private walkYPx = 0;
  private beamXPx = 0;
  private resolving = false;
  private roomBounds = { x: 0, y: 0, width: 0, height: 0 };

  private room: PuzzleRoom | null = null;
  private row!: BasketRow;
  private net!: NetFrame;
  private shell!: ChamberShell;
  private cart!: CartDelivery;
  private cast!: ChamberCast;
  private rival!: GlitchSplasher;
  private replay!: DockReplay;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_3 });
    this.puzzleId = "tr_3";
    this.puzzleName = "The Fishing Dock";
    this.puzzleDescription =
      "Slide your net along the dock and bring the weigh-beam its heaviest catch.";
  }

  preload(): void {
    super.preload();
    for (const asset of FISHING_DOCK_IMAGE_ASSETS) {
      if (!this.textures.exists(asset.key))
        this.load.image(asset.key, asset.path);
    }
    for (const asset of MIRROR_CROSSING_SHEET_ASSETS) {
      if (!this.textures.exists(asset.key))
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth ?? 16,
          frameHeight: asset.frameHeight ?? 16,
        });
    }
    PuzzleRoom.preload(this);
    PuzzleRoom.preloadKeeper(this, VISUAL_REVAMP_KEYS.WINDOW_FISHER);
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, "river", { intensity: 0.4 });

    const { width, height } = this.cameras.main;
    this.rowYPx = Math.round((height * 0.46) / 8) * 8;
    this.walkYPx = this.rowYPx + 92;
    this.beamXPx = 128;

    this.shell = new ChamberShell(this, dockPar());
    this.row = new BasketRow(
      this,
      this.rowYPx,
      this.walkYPx,
      this.prefersReducedMotion(),
    );
    this.net = new NetFrame(this, this.rowYPx, () => this.row.geometry());
    this.cart = new CartDelivery(this);
    this.cast = new ChamberCast(this, width - 96, this.walkYPx - 16, DOCK_CAST);
    this.rival = new GlitchSplasher(this, width - 250, height - 100);
    this.replay = new DockReplay(this);
    new BitCompanion(this, { stage: "byte", x: width - 92, y: 100, depth: 40 });
    this.buildBeam();

    this.ledger = emptyLedger(0);
    this.mountRound();
    this.mountRoom();

    this.shell.seal();
    this.cast.entry();

    this.input.keyboard?.on("keydown", this.onNumberKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.onNumberKey, this);
      this.rival.stop();
    });
  }

  /** The weigh-beam at the dock's west head (procedural until art). */
  private buildBeam(): void {
    if (this.textures.exists(FISHING_DOCK_KEYS.BACKDROP)) return;
    this.add
      .rectangle(this.beamXPx, this.rowYPx - 8, 10, 84, 0x5a4a2e, 1)
      .setStrokeStyle(2, 0x3a2e1c, 1)
      .setDepth(14);
    this.add
      .rectangle(this.beamXPx + 22, this.rowYPx - 46, 54, 8, 0x6a583a, 1)
      .setStrokeStyle(2, 0x3a2e1c, 1)
      .setDepth(14);
  }

  private currentRound() {
    return DOCK_ROUNDS[this.roundIndex] ?? null;
  }

  private mountRound(): void {
    const round = this.currentRound();
    if (!round) return;
    this.row.setRound(round.values, round.windowSize);
    this.net.reset(0);
    this.rival.setRow(Math.min(round.values.length, 8));
    a11yManager.announce(
      `${round.values.length} baskets on the dock; your net frames ${round.windowSize}. Bring the beam the heaviest catch.`,
      true,
    );
  }

  private onNumberKey(event: KeyboardEvent): void {
    const round = this.currentRound();
    if (!round || !this.room || this.dockCleared) return;
    const index = numberKeyToIndex(event.key, round.values.length);
    if (index === null) return;
    this.room.player.walkTo(this.row.basketX(index), this.walkYPx, () => {});
  }

  private mountRoom(): void {
    const { width, height } = this.cameras.main;
    this.roomBounds = {
      x: 72,
      y: this.walkYPx - 24,
      width: width - 144,
      height: height - this.walkYPx - 24,
    };
    this.room = new PuzzleRoom(this, {
      bounds: this.roomBounds,
      spawn: { x: width / 2, y: height - 96 },
      onAct: () => this.onAct(),
      onStep: (pos) => {
        this.followNet(pos.x);
        this.checkDoorExit(pos);
      },
    });
  }

  /** The net frame follows the walk; edge changes record the slide. */
  private followNet(playerX: number): void {
    if (this.dockCleared || this.resolving || this.row.isBusy) return;
    const round = this.currentRound();
    if (!round) return;
    const previous = this.net.start;
    const next = frameStartAtX(playerX, this.row.geometry());
    if (!this.net.glideTo(next)) return;
    this.ledger = recordTrade(this.ledger);
    // The edges are the show: entering pulses, leaving dims.
    if (next > previous) {
      this.row.pulseEnter(next + round.windowSize - 1);
      this.row.dimLeave(previous);
    } else {
      this.row.pulseEnter(next);
      this.row.dimLeave(previous + round.windowSize - 1);
    }
  }

  private openExitPath(): void {
    const { height } = this.cameras.main;
    this.roomBounds.y = 56;
    this.roomBounds.height = height - 56 - 56;
  }

  private checkDoorExit(pos: { x: number; y: number }): void {
    if (!this.dockCleared || this.exiting) return;
    const { width } = this.cameras.main;
    if (Math.abs(pos.x - width / 2) < 56 && pos.y < 88) {
      this.exiting = true;
      a11yManager.announce("You leave the dock with the beam holding.", true);
      this.onPuzzleComplete(starsForTrades(this.ledger.trades, dockPar()));
    }
  }

  private onAct(): void {
    if (this.dockCleared) {
      const pos = this.room?.player.getPosition();
      if (
        pos &&
        this.leverX >= 0 &&
        Math.abs(pos.x - this.leverX) < 72 &&
        pos.y < 160
      ) {
        void this.playReplay();
      }
      return;
    }
    if (this.row.isBusy || this.resolving) return;
    const round = this.currentRound();
    const pos = this.room?.player.getPosition();
    if (!round || !pos) return;
    // The haul: act near the weigh-beam at the dock's west head.
    if (Math.abs(pos.x - this.beamXPx) > BEAM_REACH) return;

    this.ledger = recordTrade(this.ledger);
    const start = this.net.start;
    const framed = windowSum(round.values, start, round.windowSize);
    const best = windowSum(
      round.values,
      bestWindowStart(round.values, round.windowSize),
      round.windowSize,
    );
    const success = framed === best;
    if (!success) this.cast.onSpillStreak();

    void this.row
      .haul(start, this.beamXPx + 22, this.rowYPx - 64, success)
      .then(() => {
        if (!success) {
          a11yManager.announce(
            "The net tears — a heavier catch waits somewhere on the dock.",
            false,
          );
          return;
        }
        a11yManager.announce("The beam holds — heaviest catch taken.", false);
        this.cast.onCleanStretch();
        void this.onRoundHauled();
      });
  }

  private async onRoundHauled(): Promise<void> {
    this.resolving = true;
    this.cast.onBloom();
    const { width } = this.cameras.main;
    JuiceSystem.correctBurst(this, width / 2, this.rowYPx - 40);
    await new Promise((resolve) => this.time.delayedCall(800, resolve));

    if (this.roundIndex + 1 >= DOCK_ROUNDS.length) {
      this.finishDock();
      return;
    }
    this.roundIndex++;
    await this.cart.deliver(this.rowYPx);
    this.mountRound();
    this.resolving = false;
  }

  private finishDock(): void {
    this.rival.stop();
    this.shell.unbar(() => {
      this.dockCleared = true;
      this.openExitPath();
      this.shell.setPlaqueTally(this.ledger.trades, dockPar());
      this.cast.tallyLine(this.ledger.trades, dockPar());
      a11yManager.announce(
        `Dock cleared in ${this.ledger.trades} moves; the minimum is ${dockPar()}. ` +
          "Pull the lever by the door to watch one clean pass, or leave through the north door.",
        true,
      );
      this.placeLever();
      this.resolving = false;
    });
  }

  private placeLever(): void {
    const { width } = this.cameras.main;
    const x = width / 2 - 112;
    this.leverX = x;
    const base = this.add
      .rectangle(x, 56, 10, 22, 0x4a6a6a, 1)
      .setStrokeStyle(2, 0x2e4a4a, 1)
      .setDepth(12);
    const handle = this.add
      .rectangle(x, 44, 4, 16, 0x9ff7f7, 1)
      .setAngle(-30)
      .setDepth(13);
    this.tweens.add({
      targets: [base, handle],
      alpha: { from: 0, to: 1 },
      duration: 400,
    });
  }

  private async playReplay(): Promise<void> {
    if (this.replay.isPlaying) return;
    const round = DOCK_ROUNDS[DOCK_ROUNDS.length - 1];
    await this.replay.play(round.values, round.windowSize, this.rowYPx - 104);
  }

  update(time: number, delta: number): void {
    this.room?.update(time, delta);
  }

  /** H-key hints — dock language, never the recurrence. */
  protected displayHint(hintNumber: number): void {
    const messages = [
      "Watch what enters your net and what leaves it. The middle keeps itself.",
      "Read the carved weights as you walk — the heaviest stretch is the beam's.",
    ];
    this.showMessage(
      messages[Math.min(hintNumber, messages.length) - 1],
      COLORS.GOLD_ACCENT,
    );
  }

  protected getConceptName(): string {
    return "Sliding Window";
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0;
  }

  protected getPuzzleTheme(): PuzzleTheme {
    return TWIN_RIVERS_PUZZLE_THEME;
  }

  protected getRegionBackdrop(): {
    id: RegionBackdropId;
    options?: RegionBackdropOptions;
  } | null {
    if (this.textures.exists(FISHING_DOCK_KEYS.BACKDROP)) return null;
    return { id: "twin-rivers", options: { intensity: 1 } };
  }

  protected getPuzzleBackdropKey(): string | null {
    if (this.textures.exists(FISHING_DOCK_KEYS.BACKDROP)) {
      return FISHING_DOCK_KEYS.BACKDROP;
    }
    return super.getPuzzleBackdropKey();
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
}
