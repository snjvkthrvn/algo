/**
 * P2_1_MirrorWalk — "The Mirror Crossing" (TR_1).
 *
 * Chamber rollout (spec:
 * docs/superpowers/specs/2026-06-11-p2-1-mirror-crossing-design.md):
 *   • Sealed dock arena spanning the river. The crate rack floats on the
 *     water band; the player walks the SOUTH boardwalk while their MIRROR
 *     TWIN — a watery reflection — walks the north walk, always at the
 *     mirrored slot. The reflection IS the second pointer, embodied.
 *   • SPACE trades the facing pair: both crates swing past each other over
 *     the water. ANY pair, ANY order — the old forced sequence, pseudocode
 *     status line, and permanent arrow are gone.
 *   • The judgment: pairs whose values already mirror each other (round 4
 *     is full of duplicates, odd rows have a fixed centre) need NOTHING.
 *     Trading them anyway splashes soaked debris onto the dock, where it
 *     stays — the persistent cost economy. Par counts only differing pairs.
 *   • Round clears when the row runs reversed — the current ribbon flips.
 *     Barge delivers the next row (6 → 7 → 8 → 12). Glitch splashes random
 *     swaps at his corner rack and never converges.
 *   • Clear → unbar, plaque tally, lever ghost replay (converging walkers
 *     that SKIP mirrored pairs), walk out the north door.
 */

import Phaser from "phaser";
import { BasePuzzleScene } from "./BasePuzzleScene";
import { COLORS, SCENE_KEYS } from "../../config/constants";
import {
  VISUAL_REVAMP_KEYS,
  MIRROR_CROSSING_KEYS,
  MIRROR_CROSSING_IMAGE_ASSETS,
  MIRROR_CROSSING_SHEET_ASSETS,
  getImageAssetPath,
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
  CROSSING_ROUNDS,
  crossingPar,
  isReversed,
  pairResolved,
} from "../../puzzleRooms/mirrorCrossing/crossingPlan";
import {
  mirrorSlot,
  slotIndexAtX,
} from "../../puzzleRooms/mirrorCrossing/crossingRules";
import { CrateRack } from "../../puzzleRooms/mirrorCrossing/CrateRack";
import { MirrorTwin } from "../../puzzleRooms/mirrorCrossing/MirrorTwin";
import { GlitchSplasher } from "../../puzzleRooms/mirrorCrossing/GlitchSplasher";
import { CrossingReplay } from "../../puzzleRooms/mirrorCrossing/CrossingReplay";
import { ChamberShell } from "../../puzzleRooms/chamber/ChamberShell";
import { ChamberCast } from "../../puzzleRooms/chamber/ChamberCast";
import { CartDelivery } from "../../puzzleRooms/chamber/CartDelivery";

const CROSSING_CAST = {
  keeperKey: VISUAL_REVAMP_KEYS.MIRROR_WALKER,
  entryLine: "The current runs the wrong way. Your reflection already knows.",
  reactions: {
    waste: [
      "That pair already faced each other. The river keeps the splash.",
      "Soaked. Look before you lift.",
    ],
    clean: [
      "Both hands, one thought. Lovely.",
      "The reflection moved before you did — or did you move first?",
    ],
    clear: ["The river turns!", "Watch the current remember its way back."],
  },
  tallyNoun: "trades",
} as const;

export class P2_1_MirrorWalk extends BasePuzzleScene {
  private roundIndex = 0;
  private values: number[] = [];
  private startValues: number[] = [];
  private ledger: GrainLedger = emptyLedger(0);
  private crossingCleared = false;
  private exiting = false;
  private leverX = -1;
  private rackYPx = 0;
  private southWalkY = 0;
  private resolving = false;
  private roomBounds = { x: 0, y: 0, width: 0, height: 0 };

  private room: PuzzleRoom | null = null;
  private rack!: CrateRack;
  private twin!: MirrorTwin;
  private shell!: ChamberShell;
  private cart!: CartDelivery;
  private cast!: ChamberCast;
  private rival!: GlitchSplasher;
  private replay!: CrossingReplay;
  private focusMarker: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_1 });
    this.puzzleId = "tr_1";
    this.puzzleName = "The Mirror Crossing";
    this.puzzleDescription =
      "The current runs the wrong way. Trade with your reflection until it turns.";
  }

  preload(): void {
    super.preload();
    for (const asset of MIRROR_CROSSING_IMAGE_ASSETS) {
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
    const crate = getImageAssetPath(VISUAL_REVAMP_KEYS.TR_DOCK_CRATE);
    if (crate && !this.textures.exists(VISUAL_REVAMP_KEYS.TR_DOCK_CRATE)) {
      this.load.image(VISUAL_REVAMP_KEYS.TR_DOCK_CRATE, crate);
    }
    PuzzleRoom.preload(this);
    PuzzleRoom.preloadKeeper(this, VISUAL_REVAMP_KEYS.MIRROR_WALKER);
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, "river", { intensity: 0.4 });

    const { width, height } = this.cameras.main;
    this.rackYPx = Math.round((height * 0.42) / 8) * 8;
    this.southWalkY = this.rackYPx + 96;
    const northWalkY = this.rackYPx - 88;

    this.shell = new ChamberShell(this, crossingPar());
    this.rack = new CrateRack(
      this,
      this.rackYPx,
      this.southWalkY,
      this.prefersReducedMotion(),
    );
    this.twin = new MirrorTwin(this, northWalkY);
    this.cart = new CartDelivery(this);
    this.cast = new ChamberCast(this, 88, this.southWalkY - 16, CROSSING_CAST);
    this.rival = new GlitchSplasher(this, width - 260, height - 100);
    this.replay = new CrossingReplay(this);
    new BitCompanion(this, { stage: "byte", x: width - 92, y: 100, depth: 40 });

    this.ledger = emptyLedger(0);
    this.mountRound();
    this.focusMarker = this.add.graphics().setDepth(10);
    this.mountRoom();

    this.shell.seal();
    this.cast.entry();

    this.input.keyboard?.on("keydown", this.onNumberKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.onNumberKey, this);
      this.rival.stop();
      this.focusMarker?.destroy();
      this.focusMarker = null;
    });
  }

  private mountRound(): void {
    const round = CROSSING_ROUNDS[this.roundIndex];
    if (!round) return;
    this.startValues = [...round.values];
    this.values = [...round.values];
    this.rack.setRow(this.values);
    this.rival.setRow(round.values.length);
    a11yManager.announce(
      `${round.values.length} crates float on the crossing. Make the river run backwards.`,
      true,
    );
  }

  private onNumberKey(event: KeyboardEvent): void {
    if (!this.room || this.crossingCleared) return;
    const slot = numberKeyToIndex(event.key, this.values.length);
    if (slot === null) return;
    const center = this.rack.crateCenter(slot);
    if (!center) return;
    this.room.player.walkTo(center.x, this.southWalkY, () => this.onAct());
  }

  private mountRoom(): void {
    const { width, height } = this.cameras.main;
    this.roomBounds = {
      x: 80,
      y: this.southWalkY - 24,
      width: width - 160,
      height: height - this.southWalkY - 24,
    };
    this.room = new PuzzleRoom(this, {
      bounds: this.roomBounds,
      spawn: { x: width / 2, y: height - 96 },
      onAct: () => this.onAct(),
      onStep: (pos) => {
        this.twin.update(pos.x, this.rack.centerX());
        this.repaintFocusMarker(pos.x);
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
    if (!this.crossingCleared || this.exiting) return;
    const { width } = this.cameras.main;
    if (Math.abs(pos.x - width / 2) < 56 && pos.y < 88) {
      this.exiting = true;
      a11yManager.announce("You step out across the turned river.", true);
      this.onPuzzleComplete(starsForTrades(this.ledger.trades, crossingPar()));
    }
  }

  private repaintFocusMarker(playerX: number): void {
    if (!this.focusMarker) return;
    this.focusMarker.clear();
    if (this.crossingCleared || this.resolving) return;
    const slot = slotIndexAtX(playerX, this.rack.geometry());
    if (slot < 0) return;
    const here = this.rack.crateCenter(slot);
    const there = this.rack.crateCenter(mirrorSlot(slot, this.values.length));
    if (!here || !there) return;
    this.focusMarker.lineStyle(2, COLORS.CYAN_GLOW, 0.45);
    this.focusMarker.strokeCircle(here.x, here.y + 36, 9);
    this.focusMarker.strokeCircle(there.x, there.y - 36, 9);
  }

  private onAct(): void {
    if (this.crossingCleared) {
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
    if (this.rack.isBusy || this.resolving) return;
    const pos = this.room?.player.getPosition();
    if (!pos) return;
    const slot = slotIndexAtX(pos.x, this.rack.geometry());
    if (slot < 0) return;
    const n = this.values.length;
    const mirror = mirrorSlot(slot, n);

    this.ledger = recordTrade(this.ledger);

    if (slot === mirror) {
      // The fixed centre faces itself — pure splash.
      this.rack.splash(slot);
      this.cast.onSpillStreak();
      a11yManager.announce(
        "The centre crate faces itself — the trade just splashes.",
        false,
      );
      return;
    }

    if (pairResolved(this.values, this.startValues, slot)) {
      // Already in its reversed arrangement (equal values, or previously
      // traded) — trading it is waste, and the river says so.
      this.rack.splash(slot);
      this.cast.onSpillStreak();
      a11yManager.announce(
        "Those two already stand reversed — the river keeps the splash.",
        false,
      );
      return;
    }

    const next = [...this.values];
    const tmp = next[slot];
    next[slot] = next[mirror];
    next[mirror] = tmp;
    this.values = next;
    const center = this.rack.crateCenter(slot);
    if (center) this.emitPuzzleActionPulse(center.x, center.y, "correct");

    void this.rack.tradePair(slot).then(() => {
      a11yManager.announce(
        `You and your reflection trade crates ${slot + 1} and ${mirror + 1}.`,
        false,
      );
      if (isReversed(this.values, this.startValues)) void this.onRowReversed();
      else this.cast.onCleanStretch();
    });
  }

  private async onRowReversed(): Promise<void> {
    this.resolving = true;
    this.rack.flipCurrent();
    this.twin.celebrate();
    this.cast.onBloom();
    const { width } = this.cameras.main;
    JuiceSystem.correctBurst(this, width / 2, this.rackYPx - 40);
    await new Promise((resolve) => this.time.delayedCall(900, resolve));

    if (this.roundIndex + 1 >= CROSSING_ROUNDS.length) {
      this.finishCrossing();
      return;
    }
    this.roundIndex++;
    await this.cart.deliver(this.rackYPx);
    this.mountRound();
    this.resolving = false;
  }

  private finishCrossing(): void {
    this.rival.stop();
    this.shell.unbar(() => {
      this.crossingCleared = true;
      this.openExitPath();
      this.shell.setPlaqueTally(this.ledger.trades, crossingPar());
      this.cast.tallyLine(this.ledger.trades, crossingPar());
      a11yManager.announce(
        `Crossing cleared in ${this.ledger.trades} trades; the minimum is ${crossingPar()}. ` +
          "Pull the lever by the door to watch the walkers converge, or leave through the north door.",
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
    const round = CROSSING_ROUNDS[CROSSING_ROUNDS.length - 1];
    await this.replay.play(round.values, this.rackYPx - 110);
  }

  update(time: number, delta: number): void {
    this.room?.update(time, delta);
  }

  /** H-key hints — plain words, never pseudocode. */
  protected displayHint(hintNumber: number): void {
    const messages = [
      "Your reflection already stands across from you. Trade only where the two crates differ.",
      "A pair that already mirrors needs nothing — walking past it is free.",
    ];
    this.showMessage(
      messages[Math.min(hintNumber, messages.length) - 1],
      COLORS.GOLD_ACCENT,
    );
  }

  protected getConceptName(): string {
    return "Two Pointers";
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
    if (this.textures.exists(MIRROR_CROSSING_KEYS.BACKDROP)) return null;
    return { id: "twin-rivers", options: { intensity: 1 } };
  }

  protected getPuzzleBackdropKey(): string | null {
    if (this.textures.exists(MIRROR_CROSSING_KEYS.BACKDROP)) {
      return MIRROR_CROSSING_KEYS.BACKDROP;
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
