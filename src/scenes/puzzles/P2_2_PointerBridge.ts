/**
 * P2_2_PointerBridge — "The Rope Bridge" (TR_2).
 *
 * Chamber rollout (spec:
 * docs/superpowers/specs/2026-06-12-p2-2-rope-bridge-design.md):
 *   • Sealed river arena. Sorted stone pilings cross the water; two buoys
 *     ride the current outermost pair, tied by a ROPE whose sag is the
 *     entire readout — heavy sags deep and warm, light stretches taut and
 *     pale, EQUAL levels bright and hums. No `a + b = c` text anywhere.
 *   • The player walks the south boardwalk. Acting near either buoy steps
 *     it one piling inward — their free choice, unprompted (the old
 *     forced-move status line and arrow are gone). Acting at the rope's
 *     midpoint attempts the LOCK: right → the pair lashes down; wrong →
 *     recoil + persistent splash debris (the cost economy).
 *   • Dead ends are real: buoys that meet without the target SNAP BACK to
 *     the ends with a splash — no fail state, but the wasted walk stays on
 *     the ledger. Par = the canonical convergent walk + one lock per round.
 *   • Glitch tests random pairs at his corner mini-dais (GlitchPairer).
 *     The Bridge Keeper's scripted NAME_IT beat survives untouched.
 */

import Phaser from "phaser";
import { BasePuzzleScene } from "./BasePuzzleScene";
import { COLORS, SCENE_KEYS } from "../../config/constants";
import {
  VISUAL_REVAMP_KEYS,
  POINTER_BRIDGE_KEYS,
  POINTER_BRIDGE_IMAGE_ASSETS,
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
import { PuzzleRoom } from "../../puzzleRooms/PuzzleRoom";
import {
  emptyLedger,
  recordTrade,
  starsForTrades,
  type GrainLedger,
} from "../../puzzleRooms/grainChamber/grainEconomy";
import {
  BRIDGE_ROUNDS,
  bridgePar,
} from "../../puzzleRooms/pointerBridge/bridgePlan";
import { bridgeZoneAt } from "../../puzzleRooms/pointerBridge/bridgeRules";
import { PostLine } from "../../puzzleRooms/pointerBridge/PostLine";
import { BridgeReplay } from "../../puzzleRooms/pointerBridge/BridgeReplay";
import { GlitchPairer } from "../../puzzleRooms/pairingGrounds/GlitchPairer";
import { ChamberShell } from "../../puzzleRooms/chamber/ChamberShell";
import { ChamberCast } from "../../puzzleRooms/chamber/ChamberCast";
import { CartDelivery } from "../../puzzleRooms/chamber/CartDelivery";

const ZONE_REACH = 56;

const BRIDGE_CAST = {
  keeperKey: VISUAL_REVAMP_KEYS.BRIDGE_KEEPER,
  entryLine: "The rope knows the weight it wants. Walk the banks and listen.",
  reactions: {
    waste: [
      "The rope said no. It always says so first.",
      "Splash. The river collects its toll.",
    ],
    clean: [
      "You read the sag before you stepped. Good.",
      "The rope barely moved. That's how it should sound.",
    ],
    clear: ["Level and lashed!", "The bridge holds its weight."],
  },
  tallyNoun: "moves",
} as const;

export class P2_2_PointerBridge extends BasePuzzleScene {
  private roundIndex = 0;
  private ledger: GrainLedger = emptyLedger(0);
  private bridgeCleared = false;
  private exiting = false;
  private leverX = -1;
  private lineYPx = 0;
  private southWalkY = 0;
  private resolving = false;
  private roomBounds = { x: 0, y: 0, width: 0, height: 0 };

  private room: PuzzleRoom | null = null;
  private line!: PostLine;
  private shell!: ChamberShell;
  private cart!: CartDelivery;
  private cast!: ChamberCast;
  private rival!: GlitchPairer;
  private replay!: BridgeReplay;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_2 });
    this.puzzleId = "tr_2";
    this.puzzleName = "The Rope Bridge";
    this.puzzleDescription =
      "Two buoys, one rope, one weight the river wants. Read the sag.";
  }

  preload(): void {
    super.preload();
    for (const asset of POINTER_BRIDGE_IMAGE_ASSETS) {
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
    for (const key of [
      VISUAL_REVAMP_KEYS.TR_DOCK_NODE,
      VISUAL_REVAMP_KEYS.PROP_WATER_BUOY,
    ]) {
      const path = getImageAssetPath(key);
      if (path && !this.textures.exists(key)) this.load.image(key, path);
    }
    PuzzleRoom.preload(this);
    PuzzleRoom.preloadKeeper(this, VISUAL_REVAMP_KEYS.BRIDGE_KEEPER);
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, "river", { intensity: 0.4 });

    const { width, height } = this.cameras.main;
    this.lineYPx = Math.round((height * 0.42) / 8) * 8;
    this.southWalkY = this.lineYPx + 96;

    this.shell = new ChamberShell(this, bridgePar());
    this.line = new PostLine(
      this,
      this.lineYPx,
      this.southWalkY,
      this.prefersReducedMotion(),
    );
    this.cart = new CartDelivery(this);
    this.cast = new ChamberCast(this, 88, this.southWalkY - 16, BRIDGE_CAST);
    this.rival = new GlitchPairer(this, width - 250, height - 100);
    this.replay = new BridgeReplay(this);
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

  private mountRound(): void {
    const round = BRIDGE_ROUNDS[this.roundIndex];
    if (!round) return;
    this.line.setRound(round.values, round.target);
    this.rival.setRound(round.values);
    a11yManager.announce(
      `${round.values.length} pilings cross the river. The rope wants ${round.target}.`,
      true,
    );
  }

  /** 1 = left buoy, 2 = the rope's midpoint (lock), 3 = right buoy. */
  private onNumberKey(event: KeyboardEvent): void {
    if (!this.room || this.bridgeCleared) return;
    const targets: Record<string, number> = {
      "1": this.line.leftX(),
      "2": this.line.midX(),
      "3": this.line.rightX(),
    };
    const x = targets[event.key];
    if (x === undefined) return;
    this.room.player.walkTo(x, this.southWalkY, () => this.onAct());
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
      onStep: (pos) => this.checkDoorExit(pos),
    });
  }

  private openExitPath(): void {
    const { height } = this.cameras.main;
    this.roomBounds.y = 56;
    this.roomBounds.height = height - 56 - 56;
  }

  private checkDoorExit(pos: { x: number; y: number }): void {
    if (!this.bridgeCleared || this.exiting) return;
    const { width } = this.cameras.main;
    if (Math.abs(pos.x - width / 2) < 56 && pos.y < 88) {
      this.exiting = true;
      a11yManager.announce("You cross the lashed bridge and step out.", true);
      this.onPuzzleComplete(starsForTrades(this.ledger.trades, bridgePar()));
    }
  }

  private onAct(): void {
    if (this.bridgeCleared) {
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
    if (this.line.isBusy || this.resolving) return;
    const round = BRIDGE_ROUNDS[this.roundIndex];
    const pos = this.room?.player.getPosition();
    if (!round || !pos) return;

    const zone = bridgeZoneAt(
      pos.x,
      this.line.leftX(),
      this.line.rightX(),
      ZONE_REACH,
    );
    if (!zone) return;

    if (zone === "lock") {
      this.ledger = recordTrade(this.ledger);
      const sum = this.line.currentSum();
      if (sum === round.target) {
        this.resolving = true;
        void this.line.lashDown().then(() => void this.onRoundLocked());
        return;
      }
      this.line.failLock();
      this.cast.onSpillStreak();
      this.emitPuzzleActionPulse(pos.x, this.lineYPx, "wrong");
      a11yManager.announce(
        "The rope recoils — that pair is not the bridge's weight.",
        false,
      );
      return;
    }

    // A buoy step: free choice, honest cost.
    this.ledger = recordTrade(this.ledger);
    void this.line.step(zone).then(() => {
      this.emitPuzzleActionPulse(
        zone === "left" ? this.line.leftX() : this.line.rightX(),
        this.lineYPx,
        "neutral",
      );
      a11yManager.announce(
        `The ${zone} buoy steps inward. The rope ${
          this.line.currentSum() === round.target
            ? "levels and hums"
            : this.line.currentSum() > round.target
              ? "sags heavy"
              : "stretches light"
        }.`,
        false,
      );
      if (this.line.leftIndex >= this.line.rightIndex) {
        // Dead end: met without the weight. The rope snaps back.
        this.cast.onSpillStreak();
        a11yManager.announce(
          "The buoys meet with nothing to hold — the rope snaps back to the banks.",
          true,
        );
        void this.line.snapBack();
      }
    });
  }

  private async onRoundLocked(): Promise<void> {
    this.cast.onBloom();
    const { width } = this.cameras.main;
    JuiceSystem.correctBurst(this, width / 2, this.lineYPx - 40);
    await new Promise((resolve) => this.time.delayedCall(800, resolve));

    if (this.roundIndex + 1 >= BRIDGE_ROUNDS.length) {
      this.finishBridge();
      return;
    }
    this.roundIndex++;
    await this.cart.deliver(this.lineYPx);
    this.mountRound();
    this.resolving = false;
  }

  private finishBridge(): void {
    this.rival.stop();
    this.shell.unbar(() => {
      this.bridgeCleared = true;
      this.openExitPath();
      this.shell.setPlaqueTally(this.ledger.trades, bridgePar());
      this.cast.tallyLine(this.ledger.trades, bridgePar());
      a11yManager.announce(
        `Bridge lashed in ${this.ledger.trades} moves; the minimum is ${bridgePar()}. ` +
          "Pull the lever by the door to watch the rope steer the walk, or leave through the north door.",
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
    const round = BRIDGE_ROUNDS[BRIDGE_ROUNDS.length - 1];
    await this.replay.play(round.values, round.target, this.lineYPx - 110);
  }

  update(time: number, delta: number): void {
    this.room?.update(time, delta);
  }

  /** H-key hints — the rope's language, never arithmetic. */
  protected displayHint(hintNumber: number): void {
    const messages = [
      "The rope tells you which buoy is wrong — heavy sags, light stretches.",
      "Only one buoy can ever fix the rope. Step that one, and lock when it levels.",
    ];
    this.showMessage(
      messages[Math.min(hintNumber, messages.length) - 1],
      COLORS.GOLD_ACCENT,
    );
  }

  protected getConceptName(): string {
    return "Two-Pointer Convergence";
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
    if (this.textures.exists(POINTER_BRIDGE_KEYS.BACKDROP)) return null;
    return { id: "twin-rivers", options: { intensity: 1 } };
  }

  protected getPuzzleBackdropKey(): string | null {
    if (this.textures.exists(POINTER_BRIDGE_KEYS.BACKDROP)) {
      return POINTER_BRIDGE_KEYS.BACKDROP;
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
