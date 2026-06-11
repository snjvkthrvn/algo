/**
 * P1_4_TwoSum — "The Pairing Grounds" (AP_4).
 *
 * Chamber rollout (spec:
 * docs/superpowers/specs/2026-06-11-p1-4-pairing-grounds-design.md):
 *   • Sealed Isaac-style chamber — doors slam on entry, unbar on clear.
 *   • Numbered runestones stand in the courtyard; the great balance scale
 *     on the north dais carries the round's target. Pick a stone up (your
 *     ANCHOR — it follows you), then offer it with another stone: a true
 *     pair settles the scale level and locks in; a false pair slams the
 *     beam, CRACKS chips off both stones (persistent rubble — the cost
 *     economy), and the anchor stays in your hands.
 *   • Acting on open floor puts the anchor back down — some stones have no
 *     partner, and discovering that discarding is free while wrong offers
 *     cost chips is the complement lesson's negative space.
 *   • The old floating complement label is GONE: holding a stone, you know
 *     what it needs. Glitch grinds pair after pair at his corner dais —
 *     and after the clear, HIS scripted NAME_IT line lands (the script's
 *     hinge where Glitch himself learns the complement).
 *   • Rounds escalate 5 → 8 → 9 → 9 stones via cart; the old soft timer is
 *     deleted (VISION §6). Walk out the north door to complete; the lever
 *     replays anchor-vs-scanner.
 */

import Phaser from "phaser";
import { BasePuzzleScene } from "./BasePuzzleScene";
import { COLORS, SCENE_KEYS } from "../../config/constants";
import {
  VISUAL_REVAMP_KEYS,
  PAIRING_GROUNDS_KEYS,
  PAIRING_GROUNDS_IMAGE_ASSETS,
  PAIRING_GROUNDS_SHEET_ASSETS,
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
  GROUNDS_ROUNDS,
  groundsPar,
} from "../../puzzleRooms/pairingGrounds/groundsPlan";
import { stoneIndexAt } from "../../puzzleRooms/pairingGrounds/groundsRules";
import { StoneField } from "../../puzzleRooms/pairingGrounds/StoneField";
import { BalanceScale } from "../../puzzleRooms/pairingGrounds/BalanceScale";
import { GlitchPairer } from "../../puzzleRooms/pairingGrounds/GlitchPairer";
import { GroundsReplay } from "../../puzzleRooms/pairingGrounds/GroundsReplay";
import { ChamberShell } from "../../puzzleRooms/chamber/ChamberShell";
import { ChamberCast } from "../../puzzleRooms/chamber/ChamberCast";
import { ChickenFlock } from "../../puzzleRooms/chamber/ChickenFlock";
import { CartDelivery } from "../../puzzleRooms/chamber/CartDelivery";

const STONE_REACH = 64;

const GROUNDS_CAST = {
  keeperKey: VISUAL_REVAMP_KEYS.TILE_WORKER,
  entryLine: "The scale wants its number. Two stones, one weight.",
  reactions: {
    waste: [
      "Chips everywhere — these stones are older than the farm.",
      "The scale knows. It always knows.",
    ],
    clean: [
      "Level on the first try. The stones approve.",
      "You held one and KNEW. That's the grounds' way.",
    ],
    clear: ["The scale rests level!", "Every weight found its other half."],
  },
  tallyNoun: "offers",
} as const;

export class P1_4_TwoSum extends BasePuzzleScene {
  private roundIndex = 0;
  private ledger: GrainLedger = emptyLedger(0);
  private groundsCleared = false;
  private exiting = false;
  private leverX = -1;
  private fieldYPx = 0;
  private resolving = false;
  private roomBounds = { x: 0, y: 0, width: 0, height: 0 };

  private room: PuzzleRoom | null = null;
  private field!: StoneField;
  private balance!: BalanceScale;
  private shell!: ChamberShell;
  private flock!: ChickenFlock;
  private cart!: CartDelivery;
  private cast!: ChamberCast;
  private rival!: GlitchPairer;
  private replay!: GroundsReplay;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_4 });
    this.puzzleId = "ap_4";
    this.puzzleName = "The Pairing Grounds";
    this.puzzleDescription =
      "The scale wants its number. Find the two stones that make it.";
  }

  preload(): void {
    super.preload();
    for (const asset of PAIRING_GROUNDS_IMAGE_ASSETS) {
      if (!this.textures.exists(asset.key))
        this.load.image(asset.key, asset.path);
    }
    for (const asset of PAIRING_GROUNDS_SHEET_ASSETS) {
      if (!this.textures.exists(asset.key))
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth ?? 16,
          frameHeight: asset.frameHeight ?? 16,
        });
    }
    PuzzleRoom.preload(this);
    PuzzleRoom.preloadKeeper(this, VISUAL_REVAMP_KEYS.TILE_WORKER);
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, "farmland", { intensity: 0.35 });

    const { width, height } = this.cameras.main;
    this.fieldYPx = Math.round((height * 0.46) / 8) * 8;

    this.shell = new ChamberShell(this, groundsPar());
    this.balance = new BalanceScale(this, width / 2, 132);
    this.field = new StoneField(this, this.fieldYPx, this.prefersReducedMotion());
    this.flock = new ChickenFlock(
      this,
      new Phaser.Geom.Rectangle(64, height - 160, width - 360, 120),
    );
    this.cart = new CartDelivery(this);
    this.cast = new ChamberCast(this, 96, this.fieldYPx - 30, GROUNDS_CAST);
    this.rival = new GlitchPairer(this, width - 250, height - 110);
    this.replay = new GroundsReplay(this);
    new BitCompanion(this, { stage: "byte", x: width - 92, y: 100, depth: 40 });

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

  private currentRound() {
    return GROUNDS_ROUNDS[this.roundIndex] ?? null;
  }

  private mountRound(): void {
    const round = this.currentRound();
    if (!round) return;
    this.field.setRound(round.values);
    this.balance.setTarget(round.target);
    this.rival.setRound(round.values);
    a11yManager.announce(
      `The scale asks for ${round.target}. ${round.values.length} stones stand in the grounds.`,
      true,
    );
  }

  private onNumberKey(event: KeyboardEvent): void {
    const round = this.currentRound();
    if (!round || !this.room) return;
    const index = numberKeyToIndex(event.key, round.values.length);
    if (index === null || this.field.isSpent(index)) return;
    const center = this.field.stoneCenter(index);
    if (!center) return;
    this.room.player.walkTo(center.x, center.y + 44, () => this.onAct());
  }

  private mountRoom(): void {
    const { width, height } = this.cameras.main;
    const floorTop = this.fieldYPx - 24;
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
        this.flock.scatterFrom(pos.x, pos.y);
        this.field.followPlayer(pos.x, pos.y);
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
    if (!this.groundsCleared || this.exiting) return;
    const { width } = this.cameras.main;
    if (Math.abs(pos.x - width / 2) < 56 && pos.y < 88) {
      this.exiting = true;
      a11yManager.announce("You step out through the open door.", true);
      this.onPuzzleComplete(starsForTrades(this.ledger.trades, groundsPar()));
    }
  }

  private onAct(): void {
    if (this.groundsCleared) {
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
    if (this.resolving) return;
    const round = this.currentRound();
    const pos = this.room?.player.getPosition();
    if (!round || !pos) return;

    const addressed = stoneIndexAt(
      pos.x,
      pos.y - 24,
      this.field.centers(),
      STONE_REACH,
    );
    const carriedIndex = this.field.carriedIndex();

    // Not carrying: act near a stone lifts it as the anchor.
    if (carriedIndex < 0) {
      if (addressed >= 0 && this.field.pickUp(addressed)) {
        const value = this.field.valueOf(addressed);
        a11yManager.announce(`You lift the ${value} stone.`, false);
      }
      return;
    }

    // Carrying, on open floor: put the anchor back down. Free.
    if (addressed < 0) {
      this.field.putDown();
      a11yManager.announce("You set the stone back down.", false);
      return;
    }

    // Carrying, near another stone: offer the pair to the scale.
    const anchorValue = this.field.valueOf(carriedIndex);
    const partnerValue = this.field.valueOf(addressed);
    if (anchorValue === null || partnerValue === null) return;
    this.resolving = true;
    this.ledger = recordTrade(this.ledger);

    void this.balance
      .offer(anchorValue, partnerValue, round.target)
      .then((settled) => {
        if (!settled) {
          const center = this.field.stoneCenter(addressed);
          if (center) {
            this.field.crackChip(center.x, center.y);
            this.emitPuzzleActionPulse(center.x, center.y, "wrong");
          }
          this.field.reboundCarried();
          this.cast.onSpillStreak();
          a11yManager.announce(
            "The scale slams sideways — chips fly. The anchor stays in your hands.",
            false,
          );
          this.resolving = false;
          return;
        }
        const { width } = this.cameras.main;
        this.field.spendPair(carriedIndex, addressed);
        JuiceSystem.correctBurst(this, width / 2, 150);
        this.cast.onCleanStretch();
        a11yManager.announce(
          "The scale settles level. The pair locks in.",
          false,
        );
        this.roundIndex++;
        void this.advance();
      });
  }

  private async advance(): Promise<void> {
    if (this.roundIndex >= GROUNDS_ROUNDS.length) {
      this.finishGrounds();
      return;
    }
    this.cast.onBloom();
    await this.cart.deliver(this.fieldYPx);
    this.mountRound();
    this.resolving = false;
  }

  private finishGrounds(): void {
    this.rival.stop();
    this.shell.unbar(() => {
      this.groundsCleared = true;
      this.openExitPath();
      this.flock.feast(this.field.chipPositions());
      this.shell.setPlaqueTally(this.ledger.trades, groundsPar());
      this.cast.tallyLine(this.ledger.trades, groundsPar());
      a11yManager.announce(
        `Grounds cleared in ${this.ledger.trades} offers; the minimum is ${groundsPar()}. ` +
          "Pull the lever by the door to watch the anchored walk, or leave through the north door.",
        true,
      );
      this.placeLever();
      this.resolving = false;
    });
  }

  private placeLever(): void {
    const { width } = this.cameras.main;
    const x = width / 2 - 128;
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
    const round = GROUNDS_ROUNDS[GROUNDS_ROUNDS.length - 1];
    const pair = round.validPairs[0];
    if (!pair) return;
    await this.replay.play(round.values, pair, this.fieldYPx - 96);
  }

  update(time: number, delta: number): void {
    this.room?.update(time, delta);
  }

  /** H-key hints — plain words, never the arithmetic. */
  protected displayHint(hintNumber: number): void {
    const messages = [
      "Hold one stone and ask what it still needs — then seek exactly that.",
      "If no stone answers what yours needs, set it down. Discarding is free.",
    ];
    this.showMessage(
      messages[Math.min(hintNumber, messages.length) - 1],
      COLORS.GOLD_ACCENT,
    );
  }

  protected getConceptName(): string {
    return "Two Sum";
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
    if (this.textures.exists(PAIRING_GROUNDS_KEYS.BACKDROP)) return null;
    return { id: "array-plains", options: { intensity: 1 } };
  }

  protected getPuzzleBackdropKey(): string | null {
    if (this.textures.exists(PAIRING_GROUNDS_KEYS.BACKDROP)) {
      return PAIRING_GROUNDS_KEYS.BACKDROP;
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
