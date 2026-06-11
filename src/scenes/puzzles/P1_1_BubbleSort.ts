/**
 * P1_1_BubbleSort — "The Grain Chamber" (AP_1).
 *
 * Full room-first rebuild (spec:
 * docs/superpowers/specs/2026-06-11-p1-1-grain-chamber-design.md):
 *   • Sealed Isaac-style chamber — doors slam on entry, unbar on clear.
 *   • One crate row ON the floor plane; standing in a gap + SPACE/A/click
 *     trades the adjacent pair. The cart delivers escalation (4 → 6 → 8).
 *   • Every trade spills grain that persists as floor decals; the chicken
 *     flock feasts on what survives — the room IS the score display.
 *   • No round banners, no lesson/recap cards, no auto hint arrow, no
 *     parallel rival board. The keeper reacts; nobody lectures (VISION §3).
 *   • Stars: total trades vs field par (inversion counts), silent.
 */

import Phaser from "phaser";
import { BasePuzzleScene } from "./BasePuzzleScene";
import { COLORS, SCENE_KEYS } from "../../config/constants";
import {
  VISUAL_REVAMP_KEYS,
  GRAIN_CHAMBER_KEYS,
  GRAIN_CHAMBER_IMAGE_ASSETS,
  GRAIN_CHAMBER_SHEET_ASSETS,
} from "../../config/assets";
import { a11yManager } from "../../core/A11yManager";
import { JuiceSystem } from "../../systems/JuiceSystem";
import { PuzzleAmbience } from "../../ui/PuzzleAmbience";
import { BitCompanion } from "../../ui/BitCompanion";
import { NextMoveHint } from "../../ui/NextMoveHint";
import { ARRAY_PLAINS_PUZZLE_THEME, type PuzzleTheme } from "./puzzleTheme";
import type {
  RegionBackdropId,
  RegionBackdropOptions,
} from "../../ui/RegionBackdrop";
import {
  firstInversionIndex,
  inversionCount,
  isSortedAscending,
  swapAdjacent,
} from "../../data/puzzles/arrayPlainsPuzzleLogic";
import { numberKeyToIndex } from "../../input/NumberKeyCommand";
import { PuzzleRoom } from "../../puzzleRooms/PuzzleRoom";
import {
  emptyLedger,
  recordTrade,
  starsForTrades,
  type GrainLedger,
} from "../../puzzleRooms/grainChamber/grainEconomy";
import {
  DELIVERIES,
  applyDelivery,
  fieldPar,
  initialRow,
} from "../../puzzleRooms/grainChamber/deliveryPlan";
import {
  gapIndexAtX,
  shouldGlitchScramble,
} from "../../puzzleRooms/grainChamber/chamberRules";
import { ChamberShell } from "../../puzzleRooms/chamber/ChamberShell";
import { CrateLane } from "../../puzzleRooms/grainChamber/CrateLane";
import { GrainFx } from "../../puzzleRooms/grainChamber/GrainFx";
import { ChickenFlock } from "../../puzzleRooms/chamber/ChickenFlock";
import { CartDelivery } from "../../puzzleRooms/chamber/CartDelivery";
import { ChamberCast } from "../../puzzleRooms/grainChamber/ChamberCast";
import { GhostReplay } from "../../puzzleRooms/grainChamber/GhostReplay";

const GRAIN_START = 120;

export class P1_1_BubbleSort extends BasePuzzleScene {
  private values: number[] = [];
  private deliveryIndex = 0; // 0..DELIVERIES.length
  private ledger: GrainLedger = emptyLedger(GRAIN_START);
  private lastActionAt = 0;
  private glitchScrambles = 0;
  private cleanStreak = 0;
  private resolvingRow = false;
  private laneYPx = 0;
  private fieldCleared = false;
  private exiting = false;
  private leverX = -1;
  /** The working row as it stood when last (re)built — the replay's input. */
  private currentRowStart: number[] = [];
  private roomBounds = { x: 0, y: 0, width: 0, height: 0 };

  private room: PuzzleRoom | null = null;
  private lane!: CrateLane;
  private fx!: GrainFx;
  private shell!: ChamberShell;
  private flock!: ChickenFlock;
  private cart!: CartDelivery;
  private cast!: ChamberCast;
  private ghost!: GhostReplay;
  private gapMarker: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_1 });
    this.puzzleId = "ap_1";
    this.puzzleName = "The Grain Chamber";
    this.puzzleDescription =
      "The furrows grew out of order. Make them stand shortest to tallest.";
  }

  preload(): void {
    super.preload();
    for (const asset of GRAIN_CHAMBER_IMAGE_ASSETS) {
      if (!this.textures.exists(asset.key))
        this.load.image(asset.key, asset.path);
    }
    for (const asset of GRAIN_CHAMBER_SHEET_ASSETS) {
      if (!this.textures.exists(asset.key))
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth ?? 16,
          frameHeight: asset.frameHeight ?? 16,
        });
    }
    PuzzleRoom.preload(this);
    PuzzleRoom.preloadKeeper(this, VISUAL_REVAMP_KEYS.SORTING_FARMER);
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, "farmland", { intensity: 0.4 });

    const { width, height } = this.cameras.main;
    this.laneYPx = Math.round((height * 0.52) / 8) * 8;

    this.shell = new ChamberShell(this, fieldPar());
    this.fx = new GrainFx(this, this.prefersReducedMotion());
    this.lane = new CrateLane(this, this.laneYPx);
    this.flock = new ChickenFlock(
      this,
      new Phaser.Geom.Rectangle(
        64,
        this.laneYPx + 60,
        width - 128,
        height - this.laneYPx - 100,
      ),
    );
    this.cart = new CartDelivery(this);
    this.cast = new ChamberCast(this, 96, this.laneYPx - 48);
    new BitCompanion(this, { stage: "byte", x: width - 92, y: 100, depth: 40 });

    this.ghost = new GhostReplay(this);
    this.values = initialRow();
    this.currentRowStart = [...this.values];
    this.lane.setRow(this.values);
    this.gapMarker = this.add.graphics().setDepth(10);
    this.mountRoom();

    this.shell.seal();
    this.cast.entry();
    this.lastActionAt = this.time.now;

    // Number keys remain the accessibility shortcut: dash to the gap, the
    // trade lands on arrival so the body never desyncs from the row.
    this.input.keyboard?.on("keydown", this.onNumberKey, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.onNumberKey, this);
      this.gapMarker?.destroy();
      this.gapMarker = null;
    });
  }

  private onNumberKey(event: KeyboardEvent): void {
    const left = numberKeyToIndex(event.key, this.values.length - 1);
    if (left === null || !this.room) return;
    const geo = this.lane.geometry();
    const pitch = geo.crateW + geo.gapW;
    const gapX = geo.startX + geo.crateW + geo.gapW / 2 + left * pitch;
    this.room.player.walkTo(gapX, this.laneYPx + 64, () => this.onAct());
  }

  private mountRoom(): void {
    const { width, height } = this.cameras.main;
    const laneTop = this.laneYPx + 40;
    // PuzzleRoom reads this object every canWalk; openExitPath() raises its
    // top edge after the clear so the player can walk up to the north door.
    this.roomBounds = {
      x: 96,
      y: laneTop,
      width: width - 192,
      height: height - laneTop - 64,
    };
    this.room = new PuzzleRoom(this, {
      bounds: this.roomBounds,
      spawn: { x: width / 2, y: height - 96 },
      onAct: () => this.onAct(),
      onStep: (pos) => {
        this.repaintGapMarker(pos.x);
        this.flock.scatterFrom(pos.x, pos.y);
        this.checkDoorExit(pos);
      },
    });
  }

  /** After the clear: the walkable floor extends up to the open door. */
  private openExitPath(): void {
    const { height } = this.cameras.main;
    this.roomBounds.y = 56;
    this.roomBounds.height = height - 56 - 64;
  }

  private checkDoorExit(pos: { x: number; y: number }): void {
    if (!this.fieldCleared || this.exiting) return;
    const { width } = this.cameras.main;
    if (Math.abs(pos.x - width / 2) < 56 && pos.y < 88) {
      this.exiting = true;
      a11yManager.announce("You step out through the open door.", true);
      const stars = starsForTrades(this.ledger.trades, fieldPar());
      this.onPuzzleComplete(stars);
    }
  }

  private repaintGapMarker(playerX: number): void {
    if (!this.gapMarker) return;
    this.gapMarker.clear();
    const gap = gapIndexAtX(playerX, this.lane.geometry());
    if (gap < 0 || this.resolvingRow) return;
    const left = this.lane.crateCenter(gap);
    const right = this.lane.crateCenter(gap + 1);
    if (!left || !right) return;
    const midX = (left.x + right.x) / 2;
    this.gapMarker.lineStyle(2, COLORS.GOLD_ACCENT, 0.55);
    this.gapMarker.strokeCircle(midX, this.laneYPx + 38, 10);
  }

  private onAct(): void {
    if (this.fieldCleared) {
      // Post-clear the row is settled; acting near the lever replays the
      // optimal run instead of trading.
      const pos = this.room?.player.getPosition();
      if (pos && this.leverX >= 0 && Math.abs(pos.x - this.leverX) < 72 && pos.y < 160) {
        void this.playGhostReplay();
      }
      return;
    }
    if (this.lane.isAnimating || this.resolvingRow) return;
    const playerX = this.room?.player.getPosition().x ?? -1;
    const gap = gapIndexAtX(playerX, this.lane.geometry());
    if (gap < 0) return;
    this.lastActionAt = this.time.now;

    const before = inversionCount(this.values);
    this.values = swapAdjacent(this.values, gap);
    this.ledger = recordTrade(this.ledger);

    const center = this.lane.crateCenter(gap);
    if (center) {
      this.fx.spill(center.x, center.y);
      this.flock.scatterFrom(center.x, center.y);
      this.emitPuzzleActionPulse(center.x, center.y, "neutral");
    }

    // The keeper reads streaks, not rules.
    const after = inversionCount(this.values);
    if (after < before) {
      this.cleanStreak++;
      if (this.cleanStreak === 4) this.cast.onCleanStretch();
    } else {
      this.cleanStreak = 0;
      this.cast.onSpillStreak();
    }

    void this.lane.animateTrade(gap).then(() => {
      a11yManager.announce(`Traded crates ${gap + 1} and ${gap + 2}.`, false);
      if (isSortedAscending(this.values)) void this.onRowSorted();
    });
  }

  private async onRowSorted(): Promise<void> {
    this.resolvingRow = true;
    this.gapMarker?.clear();
    this.cast.onBloom();
    await this.lane.bloomCascade(this.deliveryIndex);
    const { width } = this.cameras.main;
    JuiceSystem.correctBurst(this, width / 2, this.laneYPx - 40);

    if (this.deliveryIndex >= DELIVERIES.length) {
      this.finishField();
      return;
    }
    const delivery = DELIVERIES[this.deliveryIndex];
    this.deliveryIndex++;
    await this.cart.deliver(this.laneYPx);
    this.values = applyDelivery(
      [...this.values].sort((a, b) => a - b),
      delivery,
    );
    this.currentRowStart = [...this.values];
    this.lane.setRow(this.values);
    this.resolvingRow = false;
    this.lastActionAt = this.time.now;
  }

  private finishField(): void {
    this.shell.unbar(() => {
      this.flock.feast(this.fx.decalPositions());
      // Harvest tally — the room's debrief: plain numbers on the plaque and
      // from the keeper, then the player chooses: pull the lever to watch
      // Bit's minimum-trade run, or walk out through the open north door.
      this.fieldCleared = true;
      this.openExitPath();
      this.shell.setPlaqueTally(this.ledger.trades, fieldPar());
      this.cast.tallyLine(this.ledger.trades, fieldPar());
      a11yManager.announce(
        `Field cleared in ${this.ledger.trades} trades; the minimum is ${fieldPar()}. ` +
          "Pull the lever by the door to watch the perfect run, or walk out through the north door.",
        true,
      );
      this.placeLever();
    });
  }

  /** The replay lever beside the north door (fallback art: wooden switch). */
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

  private async playGhostReplay(): Promise<void> {
    if (this.ghost.isPlaying) return;
    this.cast.onCleanStretch();
    await this.ghost.play(this.currentRowStart, this.laneYPx - 110);
  }

  update(time: number, delta: number): void {
    this.room?.update(time, delta);
    // Glitch's one allowed sabotage: final delivery, 10s idle, once.
    if (
      !this.resolvingRow &&
      !this.lane.isAnimating &&
      shouldGlitchScramble({
        deliveryIndex: this.deliveryIndex,
        idleMs: this.time.now - this.lastActionAt,
        scrambles: this.glitchScrambles,
      }) &&
      !isSortedAscending(this.values)
    ) {
      this.glitchScrambles++;
      const focus = firstInversionIndex(this.values);
      const target = focus >= 0 ? Math.max(0, focus - 1) : 0;
      this.values = swapAdjacent(this.values, target);
      void this.lane.animateTrade(target);
      this.cast.glitchHeckle(this.cameras.main.width - 140, 96);
      this.lastActionAt = this.time.now;
    }
  }

  /** H-key hints — the ONLY path that mounts the golden arrow. */
  protected displayHint(hintNumber: number): void {
    const focus = firstInversionIndex(this.values);
    if (focus >= 0) {
      const left = this.lane.crateCenter(focus);
      const right = this.lane.crateCenter(focus + 1);
      if (left && right) {
        const arrow = new NextMoveHint(this, { tone: "gold", depth: 45 });
        arrow.setTarget({
          kind: "swap-pair",
          x: left.x,
          y: left.y - 36,
          x2: right.x,
          label: "swap",
        });
        this.time.delayedCall(2600, () => arrow.clear());
      }
    }
    const messages = [
      "Watch which trades calm the row and which stir it.",
      "A crate taller than its right neighbour wants to trade.",
    ];
    this.showMessage(
      messages[Math.min(hintNumber, messages.length) - 1],
      COLORS.GOLD_ACCENT,
    );
  }

  protected getConceptName(): string {
    return "Bubble Sort";
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
    // Until the bespoke chamber backdrop lands, keep the region scenery.
    if (this.textures.exists(GRAIN_CHAMBER_KEYS.BACKDROP)) return null;
    return { id: "array-plains", options: { intensity: 1 } };
  }

  protected getPuzzleBackdropKey(): string | null {
    if (this.textures.exists(GRAIN_CHAMBER_KEYS.BACKDROP)) {
      return GRAIN_CHAMBER_KEYS.BACKDROP;
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
