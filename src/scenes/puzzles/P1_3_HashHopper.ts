/**
 * P1_3_HashHopper — "The Sorting Mill" (AP_3).
 *
 * Chamber rollout (spec:
 * docs/superpowers/specs/2026-06-11-p1-3-sorting-mill-design.md):
 *   • Sealed Isaac-style chamber — doors slam on entry, unbar on clear.
 *   • Crops arrive at the bench one at a time (no falling, no timers —
 *     VISION §6). Pick one up, carry it, toss it at a bin. Every crop has
 *     exactly one home (its weight walked along the bins, wrapping at the
 *     end). Wrong bins SPIT IT BACK and a bruised husk piles up below —
 *     the persistent cost economy.
 *   • Repeats are the lesson: BEAN always lands in the same bin, so memory
 *     makes you one-toss fast. Glitch trial-tosses every crop forever at
 *     his corner station and never remembers.
 *   • The final batch delivers a FIFTH bin — every crop's home moves.
 *     Resizing rehashes; the room makes you feel it.
 *   • No lesson cards, banners, formula labels, or collision counters.
 *     Walk out the opened north door to complete; the lever replays the
 *     wrapping walk and the straight repeat.
 */

import Phaser from "phaser";
import { BasePuzzleScene } from "./BasePuzzleScene";
import { COLORS, SCENE_KEYS } from "../../config/constants";
import {
  VISUAL_REVAMP_KEYS,
  SORTING_MILL_KEYS,
  SORTING_MILL_IMAGE_ASSETS,
  SORTING_MILL_SHEET_ASSETS,
} from "../../config/assets";
import { a11yManager } from "../../core/A11yManager";
import { JuiceSystem } from "../../systems/JuiceSystem";
import { PuzzleAmbience } from "../../ui/PuzzleAmbience";
import { BitCompanion } from "../../ui/BitCompanion";
import { ARRAY_PLAINS_PUZZLE_THEME, type PuzzleTheme } from "./puzzleTheme";
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
import { MILL_BATCHES, millPar } from "../../puzzleRooms/sortingMill/millPlan";
import { binIndexAtX } from "../../puzzleRooms/sortingMill/millRules";
import { BinRow } from "../../puzzleRooms/sortingMill/BinRow";
import { CropBench } from "../../puzzleRooms/sortingMill/CropBench";
import { GlitchStation } from "../../puzzleRooms/sortingMill/GlitchStation";
import { MillReplay } from "../../puzzleRooms/sortingMill/MillReplay";
import { ChamberShell } from "../../puzzleRooms/chamber/ChamberShell";
import { ChamberCast } from "../../puzzleRooms/chamber/ChamberCast";
import { ChickenFlock } from "../../puzzleRooms/chamber/ChickenFlock";
import { CartDelivery } from "../../puzzleRooms/chamber/CartDelivery";

const MILL_CAST = {
  keeperKey: VISUAL_REVAMP_KEYS.CROP_SORTER,
  entryLine: "The harvest came in all at once. Every crop has its bin.",
  reactions: {
    waste: [
      "Ooh — that bin wants nothing to do with it.",
      "Bruised. The hens won't mind, but still.",
    ],
    clean: [
      "Straight home. You've got the mill's rhythm.",
      "One toss. That's how the old sorters did it.",
    ],
    clear: ["Every crop home!", "The bins are singing tonight."],
  },
  tallyNoun: "tosses",
} as const;

export class P1_3_HashHopper extends BasePuzzleScene {
  private batchIndex = 0;
  private arrivalIndex = 0;
  private ledger: GrainLedger = emptyLedger(0);
  private millCleared = false;
  private exiting = false;
  private leverX = -1;
  private rowYPx = 0;
  private resolving = false;
  private roomBounds = { x: 0, y: 0, width: 0, height: 0 };

  private room: PuzzleRoom | null = null;
  private bins!: BinRow;
  private bench!: CropBench;
  private shell!: ChamberShell;
  private flock!: ChickenFlock;
  private cart!: CartDelivery;
  private cast!: ChamberCast;
  private rival!: GlitchStation;
  private replay!: MillReplay;
  private focusMarker: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_3 });
    this.puzzleId = "ap_3";
    this.puzzleName = "The Sorting Mill";
    this.puzzleDescription =
      "The harvest came in all at once. Every crop has its bin.";
  }

  preload(): void {
    super.preload();
    for (const asset of SORTING_MILL_IMAGE_ASSETS) {
      if (!this.textures.exists(asset.key))
        this.load.image(asset.key, asset.path);
    }
    for (const asset of SORTING_MILL_SHEET_ASSETS) {
      if (!this.textures.exists(asset.key))
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth ?? 24,
          frameHeight: asset.frameHeight ?? 24,
        });
    }
    PuzzleRoom.preload(this);
    PuzzleRoom.preloadKeeper(this, VISUAL_REVAMP_KEYS.CROP_SORTER);
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, "farmland", { intensity: 0.35 });

    const { width, height } = this.cameras.main;
    this.rowYPx = Math.round((height * 0.4) / 8) * 8;

    this.shell = new ChamberShell(this, millPar());
    this.bins = new BinRow(this, this.rowYPx, this.prefersReducedMotion());
    this.bench = new CropBench(this, 152, this.rowYPx + 128);
    this.flock = new ChickenFlock(
      this,
      new Phaser.Geom.Rectangle(64, height - 170, width - 360, 130),
    );
    this.cart = new CartDelivery(this);
    this.cast = new ChamberCast(this, width - 100, this.rowYPx - 20, MILL_CAST);
    this.rival = new GlitchStation(this, width - 280, height - 110);
    this.replay = new MillReplay(this);
    new BitCompanion(this, { stage: "byte", x: width - 92, y: 100, depth: 40 });

    this.ledger = emptyLedger(0);
    this.bins.setBins(MILL_BATCHES[0].binCount);
    this.rival.setBins(MILL_BATCHES[0].binCount);
    this.focusMarker = this.add.graphics().setDepth(10);
    this.mountRoom();

    this.shell.seal();
    this.cast.entry();
    this.time.delayedCall(1200, () => void this.nextArrival());

    this.input.keyboard?.on("keydown", this.onNumberKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.onNumberKey, this);
      this.focusMarker?.destroy();
      this.focusMarker = null;
    });
  }

  private currentArrival() {
    return MILL_BATCHES[this.batchIndex]?.arrivals[this.arrivalIndex] ?? null;
  }

  private onNumberKey(event: KeyboardEvent): void {
    const batch = MILL_BATCHES[this.batchIndex];
    if (!batch || !this.room) return;
    const index = numberKeyToIndex(event.key, batch.binCount);
    if (index === null) return;
    const center = this.bins.binCenter(index);
    if (!center) return;
    this.room.player.walkTo(center.x, this.rowYPx + 76, () => this.onAct());
  }

  private mountRoom(): void {
    const { width, height } = this.cameras.main;
    const floorTop = this.rowYPx + 48;
    this.roomBounds = {
      x: 80,
      y: floorTop,
      width: width - 160,
      height: height - floorTop - 56,
    };
    this.room = new PuzzleRoom(this, {
      bounds: this.roomBounds,
      spawn: { x: width / 2, y: height - 96 },
      onAct: () => this.onAct(),
      onStep: (pos) => {
        this.repaintFocusMarker(pos.x);
        this.flock.scatterFrom(pos.x, pos.y);
        this.bench.followPlayer(pos.x, pos.y);
        this.checkDoorExit(pos);
      },
    });
  }

  private openExitPath(): void {
    const { height } = this.cameras.main;
    this.roomBounds.y = 56;
    this.roomBounds.height = height - 56 - 56;
  }

  private checkDoorExit(pos: { x: number; y: number }): void {
    if (!this.millCleared || this.exiting) return;
    const { width } = this.cameras.main;
    if (Math.abs(pos.x - width / 2) < 56 && pos.y < 88) {
      this.exiting = true;
      a11yManager.announce("You step out through the open door.", true);
      this.onPuzzleComplete(starsForTrades(this.ledger.trades, millPar()));
    }
  }

  private repaintFocusMarker(playerX: number): void {
    if (!this.focusMarker) return;
    this.focusMarker.clear();
    if (this.millCleared || this.resolving || !this.bench.isCarrying) return;
    const index = binIndexAtX(playerX, this.bins.geometry());
    if (index < 0) return;
    const center = this.bins.binCenter(index);
    if (!center) return;
    this.focusMarker.lineStyle(2, COLORS.GOLD_ACCENT, 0.55);
    this.focusMarker.strokeCircle(center.x, this.rowYPx + 48, 10);
  }

  private onAct(): void {
    if (this.millCleared) {
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
    if (this.bins.isBusy || this.resolving) return;
    const pos = this.room?.player.getPosition();
    if (!pos) return;

    // Not carrying: acting near the bench picks the waiting crop up.
    if (!this.bench.isCarrying) {
      const bench = this.bench.benchPosition;
      const nearBench =
        Math.abs(pos.x - bench.x) < 72 && Math.abs(pos.y - bench.y) < 84;
      if (nearBench && this.bench.take()) {
        a11yManager.announce("You pick the crop up.", false);
      }
      return;
    }

    // Carrying: acting near the bin row tosses at the addressed bin.
    const arrival = this.currentArrival();
    if (!arrival) return;
    const index = binIndexAtX(pos.x, this.bins.geometry());
    if (index < 0) return;

    const correct = index === arrival.bin;
    this.ledger = recordTrade(this.ledger);
    const center = this.bins.binCenter(index);
    if (center)
      this.emitPuzzleActionPulse(
        center.x,
        center.y,
        correct ? "correct" : "wrong",
      );
    if (!correct) this.cast.onSpillStreak();

    void this.bins
      .toss(index, correct, arrival.crop, pos.x, pos.y - 30)
      .then(() => {
        if (!correct) {
          a11yManager.announce(
            `Bin ${index + 1} spat the ${arrival.crop} back out.`,
            false,
          );
          return;
        }
        a11yManager.announce(
          `Bin ${index + 1} took the ${arrival.crop}.`,
          false,
        );
        if (center) JuiceSystem.correctBurst(this, center.x, center.y - 30);
        this.bench.consumeCarried();
        this.cast.onCleanStretch();
        this.arrivalIndex++;
        void this.advance();
      });
  }

  private async advance(): Promise<void> {
    const batch = MILL_BATCHES[this.batchIndex];
    if (this.arrivalIndex < batch.arrivals.length) {
      await this.nextArrival();
      return;
    }
    this.resolving = true;
    this.cast.onBloom();
    if (this.batchIndex + 1 >= MILL_BATCHES.length) {
      this.finishMill();
      return;
    }
    this.batchIndex++;
    this.arrivalIndex = 0;
    const next = MILL_BATCHES[this.batchIndex];
    await this.cart.deliver(this.rowYPx);
    const rehashed = next.binCount !== batch.binCount;
    this.bins.setBins(next.binCount);
    this.rival.setBins(next.binCount);
    if (rehashed) {
      a11yManager.announce(
        "A new bin joins the wall — and every crop's home moves with it.",
        true,
      );
    }
    this.resolving = false;
    await this.nextArrival();
  }

  private async nextArrival(): Promise<void> {
    const arrival = this.currentArrival();
    if (!arrival) return;
    await this.bench.arrive(arrival.crop, arrival.weight);
    // Glitch sorts the same arrival his way — trial tosses, no memory.
    this.rival.sortArrival(arrival.crop, arrival.bin);
  }

  private finishMill(): void {
    this.shell.unbar(() => {
      this.millCleared = true;
      this.openExitPath();
      this.flock.feast(this.bins.bruisePositions());
      this.shell.setPlaqueTally(this.ledger.trades, millPar());
      this.cast.tallyLine(this.ledger.trades, millPar());
      a11yManager.announce(
        `Mill cleared in ${this.ledger.trades} tosses; the minimum is ${millPar()}. ` +
          "Pull the lever by the door to watch the wrapping walk, or leave through the north door.",
        true,
      );
      this.placeLever();
      this.resolving = false;
    });
  }

  private placeLever(): void {
    const { width } = this.cameras.main;
    const x = width / 2 - 96;
    this.leverX = x;
    const base = this.add
      .rectangle(x, 56, 10, 22, 0x8a6233, 1)
      .setStrokeStyle(2, 0x5b3f1e, 1)
      .setDepth(12);
    const handle = this.add
      .rectangle(x, 44, 4, 16, 0xd8b35a, 1)
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
    // Replay the final batch's first crop over the five-bin row.
    const batch = MILL_BATCHES[MILL_BATCHES.length - 1];
    const arrival = batch.arrivals[0];
    await this.replay.play(arrival.weight, batch.binCount, this.rowYPx - 96);
  }

  update(time: number, delta: number): void {
    this.room?.update(time, delta);
  }

  /** H-key hints — plain language, no formulas. */
  protected displayHint(hintNumber: number): void {
    const arrival = this.currentArrival();
    const messages = [
      "Pace the crop's number along the bins. The row wraps around.",
      arrival
        ? `${arrival.crop} has come through before — it always goes home to the same bin.`
        : "A crop's home only moves when the bins themselves change.",
    ];
    this.showMessage(
      messages[Math.min(hintNumber, messages.length) - 1],
      COLORS.GOLD_ACCENT,
    );
  }

  protected getConceptName(): string {
    return "Hash Functions";
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0;
  }

  protected getPuzzleTheme(): PuzzleTheme {
    return ARRAY_PLAINS_PUZZLE_THEME;
  }

  protected getRegionBackdrop(): {
    id: RegionBackdropId;
    options?: RegionBackdropOptions;
  } | null {
    if (this.textures.exists(SORTING_MILL_KEYS.BACKDROP)) return null;
    return { id: "array-plains", options: { intensity: 1 } };
  }

  protected getPuzzleBackdropKey(): string | null {
    if (this.textures.exists(SORTING_MILL_KEYS.BACKDROP)) {
      return SORTING_MILL_KEYS.BACKDROP;
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
