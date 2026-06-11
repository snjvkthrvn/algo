/**
 * P1_2_BasketIndexing — "The Basket Cellar" (AP_2).
 *
 * Chamber rollout (spec:
 * docs/superpowers/specs/2026-06-11-p1-2-basket-cellar-design.md):
 *   • Sealed Isaac-style chamber — doors slam on entry, unbar on clear.
 *   • Orders drop as wooden tags from the chute ("THE 4TH BASKET — rope").
 *     Walk to a basket and act: right one fills the order; wrong one
 *     tumbles its contents onto the floor, where the mess persists.
 *   • Glitch fills the same orders at his corner shelf by scanning from
 *     the left — his cost grows with the shelf, yours never does. That
 *     contrast is the O(1) lesson, felt, never stated.
 *   • Batches grow 5 → 8 → 10 via cart delivery; the final batch gutters
 *     the lanterns and the basket numbers go dark (address = position).
 *   • No lesson cards, banners, request panels, or soft timers. Walk out
 *     the opened north door to complete; lever replays direct-vs-scan.
 */

import Phaser from "phaser";
import { BasePuzzleScene } from "./BasePuzzleScene";
import { COLORS, SCENE_KEYS } from "../../config/constants";
import {
  VISUAL_REVAMP_KEYS,
  BASKET_CELLAR_KEYS,
  BASKET_CELLAR_IMAGE_ASSETS,
  BASKET_CELLAR_SHEET_ASSETS,
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
import {
  CELLAR_BATCHES,
  cellarPar,
  ordinalWords,
  type CellarOrder,
} from "../../puzzleRooms/basketCellar/orderPlan";
import { basketIndexAtX } from "../../puzzleRooms/basketCellar/cellarRules";
import { ChamberShell } from "../../puzzleRooms/chamber/ChamberShell";
import { ChamberCast } from "../../puzzleRooms/chamber/ChamberCast";
import { ChickenFlock } from "../../puzzleRooms/chamber/ChickenFlock";
import { CartDelivery } from "../../puzzleRooms/chamber/CartDelivery";
import { BasketShelf } from "../../puzzleRooms/basketCellar/BasketShelf";
import { OrderChute } from "../../puzzleRooms/basketCellar/OrderChute";
import { GlitchShelf } from "../../puzzleRooms/basketCellar/GlitchShelf";
import { CellarReplay } from "../../puzzleRooms/basketCellar/CellarReplay";

const CELLAR_CAST = {
  keeperKey: VISUAL_REVAMP_KEYS.BASKET_KEEPER,
  entryLine: "Orders are piling up. The tags name the basket — trust them.",
  reactions: {
    waste: [
      "Oh — that one was packed so neatly.",
      "Every wrong lid is an evening of repacking.",
    ],
    clean: [
      "Straight to it. Like you knew the cellar blind.",
      "Not a basket disturbed. Lovely.",
    ],
    clear: ["The shelf stands ready!", "Every order filled, every lid shut."],
  },
  tallyNoun: "openings",
} as const;

export class P1_2_BasketIndexing extends BasePuzzleScene {
  private batchIndex = 0;
  private orderIndex = 0;
  private ledger: GrainLedger = emptyLedger(0);
  private cellarCleared = false;
  private exiting = false;
  private leverX = -1;
  private shelfYPx = 0;
  private resolving = false;
  private roomBounds = { x: 0, y: 0, width: 0, height: 0 };

  private room: PuzzleRoom | null = null;
  private shelf!: BasketShelf;
  private chute!: OrderChute;
  private shell!: ChamberShell;
  private flock!: ChickenFlock;
  private cart!: CartDelivery;
  private cast!: ChamberCast;
  private rival!: GlitchShelf;
  private replay!: CellarReplay;
  private focusMarker: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_2 });
    this.puzzleId = "ap_2";
    this.puzzleName = "The Basket Cellar";
    this.puzzleDescription =
      "Orders are piling up. Fetch from the basket each tag names.";
  }

  preload(): void {
    super.preload();
    for (const asset of BASKET_CELLAR_IMAGE_ASSETS) {
      if (!this.textures.exists(asset.key))
        this.load.image(asset.key, asset.path);
    }
    for (const asset of BASKET_CELLAR_SHEET_ASSETS) {
      if (!this.textures.exists(asset.key))
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth ?? 24,
          frameHeight: asset.frameHeight ?? 24,
        });
    }
    PuzzleRoom.preload(this);
    PuzzleRoom.preloadKeeper(this, VISUAL_REVAMP_KEYS.BASKET_KEEPER);
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, "farmland", { intensity: 0.35 });

    const { width, height } = this.cameras.main;
    this.shelfYPx = Math.round((height * 0.42) / 8) * 8;

    // Door planks + plaque reuse the grain chamber's generic wood pieces —
    // same barn register, no cellar-specific door art needed.
    this.shell = new ChamberShell(this, cellarPar());
    this.shelf = new BasketShelf(this, this.shelfYPx, this.prefersReducedMotion());
    this.chute = new OrderChute(this, this.shelfYPx + 120);
    this.flock = new ChickenFlock(
      this,
      new Phaser.Geom.Rectangle(64, height - 180, width - 360, 140),
    );
    this.cart = new CartDelivery(this);
    this.cast = new ChamberCast(this, 80, this.shelfYPx - 24, CELLAR_CAST);
    this.rival = new GlitchShelf(this, width - 300, height - 120);
    this.replay = new CellarReplay(this);
    new BitCompanion(this, { stage: "byte", x: width - 92, y: 100, depth: 40 });

    this.ledger = emptyLedger(0);
    this.shelf.setBatch(CELLAR_BATCHES[0].basketCount);
    this.rival.setBatch(CELLAR_BATCHES[0].basketCount);
    this.focusMarker = this.add.graphics().setDepth(10);
    this.mountRoom();

    this.shell.seal();
    this.cast.entry();
    this.time.delayedCall(1200, () => void this.nextOrder());

    this.input.keyboard?.on("keydown", this.onNumberKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.onNumberKey, this);
      this.focusMarker?.destroy();
      this.focusMarker = null;
    });
  }

  private currentOrder(): CellarOrder | null {
    return CELLAR_BATCHES[this.batchIndex]?.orders[this.orderIndex] ?? null;
  }

  private onNumberKey(event: KeyboardEvent): void {
    const batch = CELLAR_BATCHES[this.batchIndex];
    if (!batch || !this.room) return;
    const index = numberKeyToIndex(event.key, batch.basketCount);
    if (index === null) return;
    const center = this.shelf.basketCenter(index);
    if (!center) return;
    this.room.player.walkTo(center.x, this.shelfYPx + 72, () => this.onAct());
  }

  private mountRoom(): void {
    const { width, height } = this.cameras.main;
    const floorTop = this.shelfYPx + 44;
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
    if (!this.cellarCleared || this.exiting) return;
    const { width } = this.cameras.main;
    if (Math.abs(pos.x - width / 2) < 56 && pos.y < 88) {
      this.exiting = true;
      a11yManager.announce("You step out through the open door.", true);
      this.onPuzzleComplete(starsForTrades(this.ledger.trades, cellarPar()));
    }
  }

  private repaintFocusMarker(playerX: number): void {
    if (!this.focusMarker) return;
    this.focusMarker.clear();
    if (this.cellarCleared || this.resolving) return;
    const index = basketIndexAtX(playerX, this.shelf.geometry());
    if (index < 0) return;
    const center = this.shelf.basketCenter(index);
    if (!center) return;
    this.focusMarker.lineStyle(2, COLORS.GOLD_ACCENT, 0.55);
    this.focusMarker.strokeCircle(center.x, this.shelfYPx + 44, 10);
  }

  private onAct(): void {
    if (this.cellarCleared) {
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
    if (this.shelf.isBusy || this.resolving) return;
    const order = this.currentOrder();
    if (!order) return;
    const playerX = this.room?.player.getPosition().x ?? -1;
    const index = basketIndexAtX(playerX, this.shelf.geometry());
    if (index < 0) return;

    const correct = index === order.index;
    this.ledger = recordTrade(this.ledger);
    const center = this.shelf.basketCenter(index);
    if (center)
      this.emitPuzzleActionPulse(center.x, center.y, correct ? "correct" : "wrong");

    if (!correct) this.cast.onSpillStreak();

    void this.shelf.openBasket(index, correct).then(() => {
      if (!correct) {
        a11yManager.announce(
          `That was basket ${index + 1} — the order wants another.`,
          false,
        );
        return;
      }
      a11yManager.announce(
        `Order filled from basket ${index + 1}: the ${order.item}.`,
        false,
      );
      if (center) JuiceSystem.correctBurst(this, center.x, center.y - 30);
      this.chute.clear();
      this.cast.onCleanStretch();
      this.orderIndex++;
      void this.advance();
    });
  }

  private async advance(): Promise<void> {
    const batch = CELLAR_BATCHES[this.batchIndex];
    if (this.orderIndex < batch.orders.length) {
      await this.nextOrder();
      return;
    }
    // Batch cleared.
    this.resolving = true;
    this.cast.onBloom();
    if (this.batchIndex + 1 >= CELLAR_BATCHES.length) {
      this.finishCellar();
      return;
    }
    this.batchIndex++;
    this.orderIndex = 0;
    const next = CELLAR_BATCHES[this.batchIndex];
    await this.cart.deliver(this.shelfYPx);
    this.shelf.setBatch(next.basketCount);
    this.rival.setBatch(next.basketCount);
    if (next.lanternsOut) {
      this.shelf.dimLabels();
      a11yManager.announce(
        "The lanterns gutter out — the basket numbers fade into the dark.",
        true,
      );
    }
    this.resolving = false;
    await this.nextOrder();
  }

  private async nextOrder(): Promise<void> {
    const order = this.currentOrder();
    if (!order) return;
    await this.chute.drop(`${ordinalWords(order.index)} — ${order.item}`);
    // Glitch races the same order at his shelf, the slow way.
    this.rival.fillOrder(order.index);
  }

  private finishCellar(): void {
    this.shell.unbar(() => {
      this.cellarCleared = true;
      this.openExitPath();
      this.flock.feast(this.shelf.messPositions());
      this.shell.setPlaqueTally(this.ledger.trades, cellarPar());
      this.cast.tallyLine(this.ledger.trades, cellarPar());
      a11yManager.announce(
        `Cellar cleared in ${this.ledger.trades} openings; the minimum is ${cellarPar()}. ` +
          "Pull the lever by the door to watch the straight walk, or leave through the north door.",
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
    // Replay the final batch's last order — the longest scan contrast.
    const batch = CELLAR_BATCHES[CELLAR_BATCHES.length - 1];
    const order = batch.orders[batch.orders.length - 1];
    await this.replay.play(batch.basketCount, order.index, this.shelfYPx - 96);
  }

  update(time: number, delta: number): void {
    this.room?.update(time, delta);
  }

  /** H-key hints — plain language, no notation. */
  protected displayHint(hintNumber: number): void {
    const order = this.currentOrder();
    const messages = [
      "The tag names a position. Count from the left.",
      order
        ? `The tag wants ${ordinalWords(order.index).toLowerCase()} — count to it.`
        : "Walk the shelf and trust the count, not the labels.",
    ];
    this.showMessage(
      messages[Math.min(hintNumber, messages.length) - 1],
      COLORS.GOLD_ACCENT,
    );
  }

  protected getConceptName(): string {
    return "Array Indexing";
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
    if (this.textures.exists(BASKET_CELLAR_KEYS.BACKDROP)) return null;
    return { id: "array-plains", options: { intensity: 1 } };
  }

  protected getPuzzleBackdropKey(): string | null {
    if (this.textures.exists(BASKET_CELLAR_KEYS.BACKDROP)) {
      return BASKET_CELLAR_KEYS.BACKDROP;
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
