/**
 * Boss_Shuffler — "The Threshing Floor" (Array Plains finale).
 *
 * Chamber rollout (spec:
 * docs/superpowers/specs/2026-06-11-boss-shuffler-threshing-floor-design.md):
 * the boss reprises the region's three chamber verbs with the same modules
 * the rooms taught them in, while the Shuffler physically interferes —
 * every sabotage telegraphed by a wind-up the player can read and race.
 * No timers, no lives (VISION §6: fair boss urgency).
 *
 *   I.   Bubble Storm — walk the lane, trade adjacent crates (CrateLane);
 *        the Shuffler periodically un-sorts one in-order pair (+1 to par —
 *        the tally never blames the player for the boss's mess).
 *   II.  Hash Storm — carry crops from the bench into bins (CropBench +
 *        BinRow); the Shuffler swaps two bins, numbers and all, so homes
 *        physically move and the player re-aims.
 *   III. Pair Lockdown — anchor a stone and offer pairs at the small scale
 *        (StoneField + BalanceScale); each lock scatters the rest.
 *
 * Defeat dissolves the boss to husk-dust, the plaque flips to the tally,
 * and the player WALKS OUT through the unbarred north door.
 */

import Phaser from "phaser";
import { BasePuzzleScene } from "./BasePuzzleScene";
import { COLORS, SCENE_KEYS } from "../../config/constants";
import {
  VISUAL_REVAMP_KEYS,
  THRESHING_FLOOR_KEYS,
  THRESHING_FLOOR_IMAGE_ASSETS,
  getImageAssetPath,
} from "../../config/assets";
import { a11yManager } from "../../core/A11yManager";
import { JuiceSystem } from "../../systems/JuiceSystem";
import { PuzzleAmbience } from "../../ui/PuzzleAmbience";
import { ARRAY_PLAINS_PUZZLE_THEME, type PuzzleTheme } from "./puzzleTheme";
import { playBossEntryBanner } from "../../ui/BossEntryBanner";
import { playBossPhaseTransition } from "../../ui/BossPhaseTransition";
import { numberKeyToIndex } from "../../input/NumberKeyCommand";
import { PuzzleRoom } from "../../puzzleRooms/PuzzleRoom";
import {
  isSortedAscending,
  swapAdjacent,
} from "../../data/puzzles/arrayPlainsPuzzleLogic";
import {
  emptyLedger,
  recordTrade,
  starsForTrades,
  type GrainLedger,
} from "../../puzzleRooms/grainChamber/grainEconomy";
import { gapIndexAtX } from "../../puzzleRooms/grainChamber/chamberRules";
import { CrateLane } from "../../puzzleRooms/grainChamber/CrateLane";
import { GrainFx } from "../../puzzleRooms/grainChamber/GrainFx";
import { binIndexAtX } from "../../puzzleRooms/sortingMill/millRules";
import { BinRow } from "../../puzzleRooms/sortingMill/BinRow";
import { CropBench } from "../../puzzleRooms/sortingMill/CropBench";
import { stoneIndexAt } from "../../puzzleRooms/pairingGrounds/groundsRules";
import { StoneField } from "../../puzzleRooms/pairingGrounds/StoneField";
import { BalanceScale } from "../../puzzleRooms/pairingGrounds/BalanceScale";
import { ChamberShell } from "../../puzzleRooms/chamber/ChamberShell";
import {
  BUBBLE_START,
  HASH_ARRIVALS,
  PAIR_TARGETS,
  bossPar,
  inOrderAdjacentIndex,
} from "../../puzzleRooms/threshingFloor/bossPlan";
import { ShufflerBoss } from "../../puzzleRooms/threshingFloor/ShufflerBoss";

type FloorPhase = "bubble" | "hash" | "pair" | "won";

const SCRAMBLE_EVERY_MS = 7000;
const BIN_SWAP_EVERY_MS = 9000;
const STONE_REACH = 64;

export class Boss_Shuffler extends BasePuzzleScene {
  private phase: FloorPhase = "bubble";
  private ledger: GrainLedger = emptyLedger(0);
  private scrambles = 0;
  private exiting = false;
  private resolving = false;
  private boardY = 0;
  private roomBounds = { x: 0, y: 0, width: 0, height: 0 };
  private interference: Phaser.Time.TimerEvent | null = null;

  private room: PuzzleRoom | null = null;
  private shell!: ChamberShell;
  private boss!: ShufflerBoss;

  // Phase I
  private lane: CrateLane | null = null;
  private fx!: GrainFx;
  private bubbleValues: number[] = [];

  // Phase II
  private bins: BinRow | null = null;
  private bench: CropBench | null = null;
  private arrivalIndex = 0;

  // Phase III
  private field: StoneField | null = null;
  private balance: BalanceScale | null = null;
  private pairIndex = 0;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_SHUFFLER });
    this.puzzleId = "boss_shuffler";
    this.puzzleName = "The Shuffler";
    this.puzzleDescription =
      "Three storms — sort, route, pair. Outlast the chaos.";
    this.maxHints = 2;
  }

  preload(): void {
    super.preload();
    for (const asset of THRESHING_FLOOR_IMAGE_ASSETS) {
      if (!this.textures.exists(asset.key))
        this.load.image(asset.key, asset.path);
    }
    const figurePath = getImageAssetPath(
      VISUAL_REVAMP_KEYS.BOSS_SHUFFLER_FIGURE,
    );
    if (
      figurePath &&
      !this.textures.exists(VISUAL_REVAMP_KEYS.BOSS_SHUFFLER_FIGURE)
    ) {
      this.load.image(VISUAL_REVAMP_KEYS.BOSS_SHUFFLER_FIGURE, figurePath);
    }
    PuzzleRoom.preload(this);
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, "farmland", { intensity: 0.3 });

    const { width, height } = this.cameras.main;
    this.boardY = Math.round((height * 0.42) / 8) * 8;

    this.shell = new ChamberShell(this, bossPar(0));
    this.boss = new ShufflerBoss(this, width / 2, 120);
    this.fx = new GrainFx(this, this.prefersReducedMotion());

    this.ledger = emptyLedger(0);
    this.mountRoom();
    this.shell.seal();
    playBossEntryBanner(this, {
      bossName: "The Shuffler",
      regionTag: "Array Plains finale",
      onComplete: () => this.startBubblePhase(),
    });

    this.input.keyboard?.on("keydown", this.onNumberKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.onNumberKey, this);
      this.interference?.remove();
    });
  }

  private mountRoom(): void {
    const { width, height } = this.cameras.main;
    const floorTop = this.boardY + 48;
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
        this.bench?.followPlayer(pos.x, pos.y);
        this.field?.followPlayer(pos.x, pos.y);
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
    if (this.phase !== "won" || this.exiting) return;
    const { width } = this.cameras.main;
    if (Math.abs(pos.x - width / 2) < 56 && pos.y < 88) {
      this.exiting = true;
      a11yManager.announce("You step out of the threshing floor.", true);
      this.onPuzzleComplete(
        starsForTrades(this.ledger.trades, bossPar(this.scrambles)),
      );
    }
  }

  // ── Phase I — Bubble Storm ────────────────────────────────────────────

  private startBubblePhase(): void {
    this.phase = "bubble";
    this.lane = new CrateLane(this, this.boardY);
    this.bubbleValues = [...BUBBLE_START];
    this.lane.setRow(this.bubbleValues);
    a11yManager.announce(
      "Phase one: the row is scrambled. Trade neighbours to settle it — the Shuffler will fight back.",
      true,
    );
    this.interference = this.time.addEvent({
      delay: SCRAMBLE_EVERY_MS,
      loop: true,
      callback: () => void this.bossScramble(),
    });
  }

  private async bossScramble(): Promise<void> {
    if (this.phase !== "bubble" || !this.lane) return;
    if (this.lane.isAnimating || this.resolving) return;
    if (isSortedAscending(this.bubbleValues)) return;
    const gap = inOrderAdjacentIndex(this.bubbleValues, Math.random);
    if (gap < 0) return;
    const center = this.lane.crateCenter(gap);
    if (!center) return;
    await this.boss.windUp(center.x, center.y);
    // Re-check: the player may have raced the telegraph.
    if (this.phase !== "bubble" || !this.lane || this.lane.isAnimating) return;
    if (this.bubbleValues[gap] >= this.bubbleValues[gap + 1]) return;
    this.bubbleValues = swapAdjacent(this.bubbleValues, gap);
    this.scrambles++;
    void this.lane.animateTrade(gap);
    if (this.scrambles % 2 === 1) this.boss.bark();
    a11yManager.announce("The Shuffler scrambles a pair!", false);
  }

  private async finishBubblePhase(): Promise<void> {
    this.resolving = true;
    this.interference?.remove();
    this.interference = null;
    await this.lane?.bloomCascade(0);
    this.lane?.setRow([]);
    this.lane = null;
    playBossPhaseTransition(this, {
      phaseNumber: "II",
      phaseName: "HASH STORM",
      onComplete: () => this.startHashPhase(),
    });
  }

  // ── Phase II — Hash Storm ─────────────────────────────────────────────

  private startHashPhase(): void {
    this.phase = "hash";
    this.arrivalIndex = 0;
    this.bins = new BinRow(this, this.boardY, this.prefersReducedMotion());
    this.bins.setBins(4);
    this.bench = new CropBench(this, 152, this.boardY + 120);
    this.resolving = false;
    a11yManager.announce(
      "Phase two: carry each crop to its bin — and watch the bins; the Shuffler moves them.",
      true,
    );
    void this.nextArrival();
    this.interference = this.time.addEvent({
      delay: BIN_SWAP_EVERY_MS,
      loop: true,
      callback: () => void this.bossBinSwap(),
    });
  }

  private async nextArrival(): Promise<void> {
    const arrival = HASH_ARRIVALS[this.arrivalIndex];
    if (!arrival || !this.bench) return;
    await this.bench.arrive(arrival.crop, arrival.weight);
  }

  private async bossBinSwap(): Promise<void> {
    if (this.phase !== "hash" || !this.bins) return;
    if (this.bins.isBusy || this.resolving) return;
    const slotA = Phaser.Math.Between(0, 3);
    let slotB = Phaser.Math.Between(0, 3);
    if (slotA === slotB) slotB = (slotB + 1) % 4;
    const a = this.bins.binCenter(this.bins.binAtSlot(slotA));
    if (!a) return;
    await this.boss.windUp(a.x, a.y);
    if (this.phase !== "hash" || !this.bins || this.bins.isBusy) return;
    await this.bins.swapSlots(slotA, slotB);
    this.boss.bark("Keep up. The bins answer to ME.");
    a11yManager.announce("The Shuffler swaps two bins!", false);
  }

  private finishHashPhase(): void {
    this.resolving = true;
    this.interference?.remove();
    this.interference = null;
    this.bins?.setBins(0);
    this.bins = null;
    playBossPhaseTransition(this, {
      phaseNumber: "III",
      phaseName: "PAIR LOCKDOWN",
      onComplete: () => this.startPairPhase(),
    });
  }

  // ── Phase III — Pair Lockdown ─────────────────────────────────────────

  private startPairPhase(): void {
    this.phase = "pair";
    this.pairIndex = 0;
    const { width } = this.cameras.main;
    this.field = new StoneField(this, this.boardY, this.prefersReducedMotion());
    this.balance = new BalanceScale(this, width / 2, 196);
    this.mountPairRound();
    this.resolving = false;
    a11yManager.announce(
      "Phase three: the scale wants its numbers. Lock the pairs while the stones keep moving.",
      true,
    );
  }

  private mountPairRound(): void {
    const round = PAIR_TARGETS[this.pairIndex];
    if (!round || !this.field || !this.balance) return;
    this.field.setRound(round.values);
    this.balance.setTarget(round.target);
    a11yManager.announce(`The scale asks for ${round.target}.`, true);
  }

  // ── Shared input ──────────────────────────────────────────────────────

  private onNumberKey(event: KeyboardEvent): void {
    if (!this.room) return;
    if (this.phase === "bubble" && this.lane) {
      const left = numberKeyToIndex(event.key, this.bubbleValues.length - 1);
      if (left === null) return;
      const geo = this.lane.geometry();
      const x =
        geo.startX + geo.crateW + geo.gapW / 2 + left * (geo.crateW + geo.gapW);
      this.room.player.walkTo(x, this.boardY + 72, () => this.onAct());
      return;
    }
    if (this.phase === "hash" && this.bins) {
      const slot = numberKeyToIndex(event.key, 4);
      if (slot === null) return;
      const center = this.bins.binCenter(this.bins.binAtSlot(slot));
      if (!center) return;
      this.room.player.walkTo(center.x, this.boardY + 72, () => this.onAct());
      return;
    }
    if (this.phase === "pair" && this.field) {
      const round = PAIR_TARGETS[this.pairIndex];
      if (!round) return;
      const index = numberKeyToIndex(event.key, round.values.length);
      if (index === null || this.field.isSpent(index)) return;
      const center = this.field.stoneCenter(index);
      if (!center) return;
      this.room.player.walkTo(center.x, center.y + 44, () => this.onAct());
    }
  }

  private onAct(): void {
    if (this.resolving) return;
    switch (this.phase) {
      case "bubble":
        this.actBubble();
        return;
      case "hash":
        this.actHash();
        return;
      case "pair":
        this.actPair();
        return;
      case "won":
        return;
    }
  }

  private actBubble(): void {
    if (!this.lane || this.lane.isAnimating) return;
    const playerX = this.room?.player.getPosition().x ?? -1;
    const gap = gapIndexAtX(playerX, this.lane.geometry());
    if (gap < 0) return;
    this.bubbleValues = swapAdjacent(this.bubbleValues, gap);
    this.ledger = recordTrade(this.ledger);
    const center = this.lane.crateCenter(gap);
    if (center) {
      this.fx.spill(center.x, center.y);
      this.emitPuzzleActionPulse(center.x, center.y, "neutral");
    }
    void this.lane.animateTrade(gap).then(() => {
      if (isSortedAscending(this.bubbleValues)) void this.finishBubblePhase();
    });
  }

  private actHash(): void {
    if (!this.bins || !this.bench || this.bins.isBusy) return;
    const pos = this.room?.player.getPosition();
    if (!pos) return;
    if (!this.bench.isCarrying) {
      const bench = this.bench.benchPosition;
      if (
        Math.abs(pos.x - bench.x) < 72 &&
        Math.abs(pos.y - bench.y) < 84 &&
        this.bench.take()
      ) {
        a11yManager.announce("You pick the crop up.", false);
      }
      return;
    }
    const arrival = HASH_ARRIVALS[this.arrivalIndex];
    if (!arrival) return;
    const slot = binIndexAtX(pos.x, this.bins.geometry());
    if (slot < 0) return;
    const binLabel = this.bins.binAtSlot(slot);
    const correct = binLabel === arrival.bin;
    this.ledger = recordTrade(this.ledger);
    void this.bins
      .toss(binLabel, correct, arrival.crop, pos.x, pos.y - 30)
      .then(() => {
        if (!correct) {
          a11yManager.announce(
            `Bin ${binLabel + 1} spat the ${arrival.crop} back out.`,
            false,
          );
          return;
        }
        this.bench?.consumeCarried();
        this.arrivalIndex++;
        if (this.arrivalIndex >= HASH_ARRIVALS.length) {
          this.finishHashPhase();
          return;
        }
        void this.nextArrival();
      });
  }

  private actPair(): void {
    if (!this.field || !this.balance) return;
    const round = PAIR_TARGETS[this.pairIndex];
    const pos = this.room?.player.getPosition();
    if (!round || !pos) return;
    const addressed = stoneIndexAt(
      pos.x,
      pos.y - 24,
      this.field.centers(),
      STONE_REACH,
    );
    const carriedIndex = this.field.carriedIndex();
    if (carriedIndex < 0) {
      if (addressed >= 0) this.field.pickUp(addressed);
      return;
    }
    if (addressed < 0) {
      this.field.putDown();
      return;
    }
    const anchor = this.field.valueOf(carriedIndex);
    const partner = this.field.valueOf(addressed);
    if (anchor === null || partner === null) return;
    this.resolving = true;
    this.ledger = recordTrade(this.ledger);
    void this.balance.offer(anchor, partner, round.target).then((settled) => {
      if (!settled) {
        const center = this.field?.stoneCenter(addressed);
        if (center) this.field?.crackChip(center.x, center.y);
        this.field?.reboundCarried();
        this.resolving = false;
        return;
      }
      this.field?.spendPair(carriedIndex, addressed);
      this.pairIndex++;
      if (this.pairIndex >= PAIR_TARGETS.length) {
        void this.winFloor();
        return;
      }
      this.mountPairRound();
      this.field?.scatter(Math.random);
      this.boss.bark("Stand STILL, stones!");
      this.resolving = false;
    });
  }

  // ── Defeat ────────────────────────────────────────────────────────────

  private async winFloor(): Promise<void> {
    this.phase = "won";
    const { width } = this.cameras.main;
    JuiceSystem.correctBurst(this, width / 2, 150);
    await this.boss.defeat();
    this.shell.unbar(() => {
      this.openExitPath();
      this.shell.setPlaqueTally(this.ledger.trades, bossPar(this.scrambles));
      a11yManager.announce(
        `The Shuffler dissolves. ${this.ledger.trades} actions against a floor's best of ${bossPar(this.scrambles)}. ` +
          "Walk out through the north door.",
        true,
      );
      this.resolving = false;
    });
  }

  update(time: number, delta: number): void {
    this.room?.update(time, delta);
  }

  /** H-key hints — phase-aware, plain words. */
  protected displayHint(hintNumber: number): void {
    const byPhase: Record<FloorPhase, string[]> = {
      bubble: [
        "Race the wind-up: his ring marks the pair he'll ruin.",
        "Settle the row the way the chamber taught you — neighbour by neighbour.",
      ],
      hash: [
        "The number travels WITH the bin. Aim for the number, not the spot.",
        "Carry, walk, toss — same as the mill.",
      ],
      pair: [
        "Hold one stone and seek exactly what it needs.",
        "They move, but they don't change. Track the values.",
      ],
      won: ["The door is open."],
    };
    const messages = byPhase[this.phase];
    this.showMessage(
      messages[Math.min(hintNumber, messages.length) - 1] ?? messages[0],
      COLORS.GOLD_ACCENT,
    );
  }

  protected getConceptName(): string {
    return "Collection Mastery";
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0;
  }

  protected getPuzzleTheme(): PuzzleTheme {
    return ARRAY_PLAINS_PUZZLE_THEME;
  }

  protected getPuzzleBackdropKey(): string | null {
    if (this.textures.exists(THRESHING_FLOOR_KEYS.BACKDROP)) {
      return THRESHING_FLOOR_KEYS.BACKDROP;
    }
    return VISUAL_REVAMP_KEYS.PUZZLE_ARRAY_ACTION_ARENA_BG;
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
}
