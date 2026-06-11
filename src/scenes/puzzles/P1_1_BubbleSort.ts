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
import { VISUAL_REVAMP_KEYS, GRAIN_CHAMBER_KEYS, getImageAssetPath } from "../../config/assets";
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
import { ChamberShell } from "../../puzzleRooms/grainChamber/ChamberShell";
import { CrateLane } from "../../puzzleRooms/grainChamber/CrateLane";
import { GrainFx } from "../../puzzleRooms/grainChamber/GrainFx";
import { ChickenFlock } from "../../puzzleRooms/grainChamber/ChickenFlock";
import { CartDelivery } from "../../puzzleRooms/grainChamber/CartDelivery";
import { ChamberCast } from "../../puzzleRooms/grainChamber/ChamberCast";

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

  private room: PuzzleRoom | null = null;
  private lane!: CrateLane;
  private fx!: GrainFx;
  private shell!: ChamberShell;
  private flock!: ChickenFlock;
  private cart!: CartDelivery;
  private cast!: ChamberCast;
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
    const chamberKeys = Object.values(GRAIN_CHAMBER_KEYS);
    for (const key of chamberKeys) {
      const path = getImageAssetPath(key);
      if (path && !this.textures.exists(key)) this.load.image(key, path);
    }
    PuzzleRoom.preload(this);
    PuzzleRoom.preloadKeeper(this, VISUAL_REVAMP_KEYS.SORTING_FARMER);
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, "farmland", { intensity: 0.4 });

    const { width, height } = this.cameras.main;
    this.laneYPx = Math.round((height * 0.52) / 8) * 8;

    this.shell = new ChamberShell(this);
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

    this.values = initialRow();
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
    this.room = new PuzzleRoom(this, {
      bounds: { x: 96, y: laneTop, width: width - 192, height: height - laneTop - 64 },
      spawn: { x: width / 2, y: height - 96 },
      onAct: () => this.onAct(),
      onStep: (pos) => {
        this.repaintGapMarker(pos.x);
        this.flock.scatterFrom(pos.x, pos.y);
      },
    });
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
    this.lane.setRow(this.values);
    this.resolvingRow = false;
    this.lastActionAt = this.time.now;
  }

  private finishField(): void {
    this.shell.unbar(() => {
      this.flock.feast(this.fx.decalPositions());
      const stars = starsForTrades(this.ledger.trades, fieldPar());
      this.time.delayedCall(1400, () => this.onPuzzleComplete(stars));
    });
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
