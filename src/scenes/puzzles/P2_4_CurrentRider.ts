/**
 * P2_4_CurrentRider — "The Current Run" (TR_4).
 *
 * Chamber rollout (spec:
 * docs/superpowers/specs/2026-06-12-p2-4-current-run-design.md):
 *   • Sealed river run. Lettered floats ride the current; the player's
 *     drift-net hangs between a LEFT TIE and a RIGHT EDGE that FOLLOWS
 *     THE PLAYER'S WALK downstream.
 *   • SNAGS are the readout: two same letters inside the net snap a taut
 *     red tangle between them and the frame tints warm — no LENGTH/BEST/
 *     REPEAT text exists. Acting alongside the row pays the left tie out
 *     by one float until the snag clears.
 *   • The CLAIM POST stands past the row's east end: walk beyond the last
 *     float and act to claim the run. A clean run matching the stream's
 *     longest claims the round; anything snagged or short splashes —
 *     persistent debris (the cost economy) — and the ride continues.
 *   • Par = the canonical variable-window ride (rights + forced lefts + 1
 *     claim); claiming early when you've seen the best beats par.
 *   • Glitch re-checks every stretch from scratch at his corner. The
 *     Current Rider's scripted NAME_IT beat survives untouched.
 */

import Phaser from "phaser";
import { BasePuzzleScene } from "./BasePuzzleScene";
import { COLORS, SCENE_KEYS } from "../../config/constants";
import {
  VISUAL_REVAMP_KEYS,
  CURRENT_RUN_KEYS,
  CURRENT_RUN_IMAGE_ASSETS,
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
  RUN_ROUNDS,
  firstSnag,
  riderWalk,
  runPar,
} from "../../puzzleRooms/currentRun/runPlan";
import {
  inClaimZone,
  rightEdgeAtX,
} from "../../puzzleRooms/currentRun/runRules";
import { FloatRun } from "../../puzzleRooms/currentRun/FloatRun";
import { RunReplay } from "../../puzzleRooms/currentRun/RunReplay";
import { GlitchSplasher } from "../../puzzleRooms/mirrorCrossing/GlitchSplasher";
import { ChamberShell } from "../../puzzleRooms/chamber/ChamberShell";
import { ChamberCast } from "../../puzzleRooms/chamber/ChamberCast";
import { CartDelivery } from "../../puzzleRooms/chamber/CartDelivery";

const POST_REACH = 70;

const RUN_CAST = {
  keeperKey: VISUAL_REVAMP_KEYS.CURRENT_RIDER,
  entryLine: "Ride the current. Keep the net clean as long as you can.",
  reactions: {
    waste: [
      "Snagged — twins tangle a net every time.",
      "The river keeps what spills. Claim clean.",
    ],
    clean: [
      "Paid the tie out just enough. Smooth riding.",
      "You let go exactly what spoiled it. That's the craft.",
    ],
    clear: ["The post takes the run!", "Longest clean ride on the river."],
  },
  tallyNoun: "moves",
} as const;

export class P2_4_CurrentRider extends BasePuzzleScene {
  private roundIndex = 0;
  private ledger: GrainLedger = emptyLedger(0);
  private leftTie = 0;
  private rightEdge = 0;
  private runCleared = false;
  private exiting = false;
  private leverX = -1;
  private laneYPx = 0;
  private walkYPx = 0;
  private postXPx = 0;
  private resolving = false;
  private roomBounds = { x: 0, y: 0, width: 0, height: 0 };

  private room: PuzzleRoom | null = null;
  private run!: FloatRun;
  private shell!: ChamberShell;
  private cart!: CartDelivery;
  private cast!: ChamberCast;
  private rival!: GlitchSplasher;
  private replay!: RunReplay;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_4 });
    this.puzzleId = "tr_4";
    this.puzzleName = "The Current Run";
    this.puzzleDescription =
      "Ride the current with your net — pay out the tie when twins tangle it, and claim the longest clean run.";
  }

  preload(): void {
    super.preload();
    for (const asset of CURRENT_RUN_IMAGE_ASSETS) {
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
    PuzzleRoom.preloadKeeper(this, VISUAL_REVAMP_KEYS.CURRENT_RIDER);
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, "river", { intensity: 0.4 });

    const { width, height } = this.cameras.main;
    this.laneYPx = Math.round((height * 0.44) / 8) * 8;
    this.walkYPx = this.laneYPx + 92;
    this.postXPx = width - 120;

    this.shell = new ChamberShell(this, runPar());
    this.run = new FloatRun(
      this,
      this.laneYPx,
      this.walkYPx,
      this.prefersReducedMotion(),
    );
    this.cart = new CartDelivery(this);
    this.cast = new ChamberCast(this, 88, this.walkYPx - 16, RUN_CAST);
    this.rival = new GlitchSplasher(this, width - 250, height - 100);
    this.replay = new RunReplay(this);
    new BitCompanion(this, { stage: "byte", x: width - 92, y: 100, depth: 40 });
    this.buildPost();

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

  /** The claim post at the run's east end (procedural until art). */
  private buildPost(): void {
    if (this.textures.exists(CURRENT_RUN_KEYS.BACKDROP)) return;
    this.add
      .rectangle(this.postXPx, this.laneYPx + 30, 10, 80, 0x5a4a2e, 1)
      .setStrokeStyle(2, 0x3a2e1c, 1)
      .setDepth(14);
    this.add
      .ellipse(this.postXPx, this.laneYPx - 14, 22, 12, 0x9ff7f7, 0.25)
      .setStrokeStyle(2, 0x5ad8d8, 0.7)
      .setDepth(14);
  }

  private currentRound() {
    return RUN_ROUNDS[this.roundIndex] ?? null;
  }

  private mountRound(): void {
    const round = this.currentRound();
    if (!round) return;
    this.run.setRound(round.letters);
    this.run.resetAlphas();
    this.leftTie = 0;
    // The right edge starts under the player's feet — standing is free.
    const playerX = this.room?.player.getPosition().x;
    this.rightEdge =
      playerX === undefined
        ? 0
        : rightEdgeAtX(playerX, this.run.geometry(), this.leftTie);
    this.run.paintNet(this.leftTie, this.rightEdge);
    this.rival.setRow(Math.min(round.letters.length, 8));
    a11yManager.announce(
      `${round.letters.length} floats ride the current. Claim the longest clean run at the east post.`,
      true,
    );
  }

  private onNumberKey(event: KeyboardEvent): void {
    const round = this.currentRound();
    if (!round || !this.room || this.runCleared) return;
    const index = numberKeyToIndex(event.key, round.letters.length);
    if (index === null) return;
    this.room.player.walkTo(this.run.floatX(index), this.walkYPx, () => {});
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
      spawn: { x: 160, y: height - 96 },
      onAct: () => this.onAct(),
      onStep: (pos) => {
        this.followEdge(pos.x);
        this.checkDoorExit(pos);
      },
    });
  }

  /** The net's right edge rides the walk; each float crossed records. */
  private followEdge(playerX: number): void {
    if (this.runCleared || this.resolving || this.run.isBusy) return;
    const next = rightEdgeAtX(playerX, this.run.geometry(), this.leftTie);
    if (next === this.rightEdge) return;
    const crossed = Math.abs(next - this.rightEdge);
    this.rightEdge = next;
    for (let i = 0; i < crossed; i++) {
      this.ledger = recordTrade(this.ledger);
    }
    const snag = this.run.paintNet(this.leftTie, this.rightEdge);
    if (snag) {
      a11yManager.announce(
        `Twins tangle the net — two ${this.currentRound()?.letters[snag[0]]} floats inside.`,
        false,
      );
    }
  }

  private openExitPath(): void {
    const { height } = this.cameras.main;
    this.roomBounds.y = 56;
    this.roomBounds.height = height - 56 - 56;
  }

  private checkDoorExit(pos: { x: number; y: number }): void {
    if (!this.runCleared || this.exiting) return;
    const { width } = this.cameras.main;
    if (Math.abs(pos.x - width / 2) < 56 && pos.y < 88) {
      this.exiting = true;
      a11yManager.announce("You ride out with the river's longest run.", true);
      this.onPuzzleComplete(starsForTrades(this.ledger.trades, runPar()));
    }
  }

  private onAct(): void {
    if (this.runCleared) {
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
    if (this.run.isBusy || this.resolving) return;
    const round = this.currentRound();
    const pos = this.room?.player.getPosition();
    if (!round || !pos) return;

    // Past the last float, at the post: claim the run.
    if (inClaimZone(pos.x, this.run.geometry(), this.postXPx, POST_REACH)) {
      this.claimRun(round.letters);
      return;
    }

    // Alongside the row: pay the left tie out by one.
    if (this.leftTie >= this.rightEdge) return;
    this.ledger = recordTrade(this.ledger);
    this.run.releaseLeft(this.leftTie);
    this.leftTie++;
    const snag = this.run.paintNet(this.leftTie, this.rightEdge);
    a11yManager.announce(
      snag
        ? "The tie pays out — the tangle still holds."
        : "The tie pays out — the net runs clean.",
      false,
    );
    if (!snag) this.cast.onCleanStretch();
  }

  private claimRun(letters: ReadonlyArray<string>): void {
    this.ledger = recordTrade(this.ledger);
    const snag = firstSnag(letters, this.leftTie, this.rightEdge);
    const length = this.rightEdge - this.leftTie + 1;
    const best = riderWalk(letters).bestLength;
    const success = !snag && length === best;
    if (!success) this.cast.onSpillStreak();

    void this.run
      .claim(this.leftTie, this.rightEdge, this.postXPx, success)
      .then(() => {
        if (!success) {
          a11yManager.announce(
            snag
              ? "The post refuses a tangled net — the claim splashes."
              : "The post wants the river's longest — keep riding.",
            false,
          );
          return;
        }
        a11yManager.announce("The post takes the run!", false);
        this.cast.onCleanStretch();
        void this.onRunClaimed();
      });
  }

  private async onRunClaimed(): Promise<void> {
    this.resolving = true;
    this.cast.onBloom();
    const { width } = this.cameras.main;
    JuiceSystem.correctBurst(this, width / 2, this.laneYPx - 40);
    await new Promise((resolve) => this.time.delayedCall(800, resolve));

    if (this.roundIndex + 1 >= RUN_ROUNDS.length) {
      this.finishRun();
      return;
    }
    this.roundIndex++;
    await this.cart.deliver(this.laneYPx);
    this.mountRound();
    this.resolving = false;
  }

  private finishRun(): void {
    this.rival.stop();
    this.shell.unbar(() => {
      this.runCleared = true;
      this.openExitPath();
      this.shell.setPlaqueTally(this.ledger.trades, runPar());
      this.cast.tallyLine(this.ledger.trades, runPar());
      a11yManager.announce(
        `Run claimed in ${this.ledger.trades} moves; the minimum is ${runPar()}. ` +
          "Pull the lever by the door to watch one clean ride, or leave through the north door.",
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
    const round = RUN_ROUNDS[RUN_ROUNDS.length - 1];
    await this.replay.play(round.letters, this.laneYPx - 104);
  }

  update(time: number, delta: number): void {
    this.room?.update(time, delta);
  }

  /** H-key hints — river words, never the recurrence. */
  protected displayHint(hintNumber: number): void {
    const messages = [
      "Two of a kind tangle the net — pay out the left tie until it clears.",
      "Ride the whole stream once before you swear by a run; claim at the east post.",
    ];
    this.showMessage(
      messages[Math.min(hintNumber, messages.length) - 1],
      COLORS.GOLD_ACCENT,
    );
  }

  protected getConceptName(): string {
    return "Variable Sliding Window";
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
    if (this.textures.exists(CURRENT_RUN_KEYS.BACKDROP)) return null;
    return { id: "twin-rivers", options: { intensity: 1 } };
  }

  protected getPuzzleBackdropKey(): string | null {
    if (this.textures.exists(CURRENT_RUN_KEYS.BACKDROP)) {
      return CURRENT_RUN_KEYS.BACKDROP;
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
