/**
 * Boss_MirrorSerpent — "The Serpent's Coil" (Twin Rivers finale).
 *
 * Chamber rollout (spec:
 * docs/superpowers/specs/2026-06-12-boss-mirror-serpent-coil-design.md):
 * the serpent reprises the region's three chamber verbs with the same
 * modules the rooms taught them in, while it physically interferes — every
 * sabotage telegraphed by a surfacing coil the player can read and race.
 * No timers, no lives (VISION §6: fair boss urgency).
 *
 *   I.   Turn the River — trade mirror pairs to reverse the row (CrateRack +
 *        MirrorTwin); the serpent un-turns a pair the player already set
 *        (+1 par — the tally never blames the player for the coil's mess).
 *   II.  Lash the Bridge — walk two buoys inward to the rope's weight
 *        (PostLine); the serpent SHOVES a buoy back outward, the only force
 *        that moves a pointer the wrong way, so it must be re-walked.
 *   III. Net the Coil — slide the net to the heaviest fixed window
 *        (BasketRow + NetFrame); the serpent SWAPS two baskets so the
 *        heaviest stretch can move and the player re-scouts.
 *
 * Defeat sinks the serpent, the basin stills, the plaque flips to the
 * tally, and the player WALKS OUT through the unbarred north door.
 */

import Phaser from "phaser";
import { BasePuzzleScene } from "./BasePuzzleScene";
import { COLORS, SCENE_KEYS } from "../../config/constants";
import {
  VISUAL_REVAMP_KEYS,
  SERPENT_COIL_KEYS,
  SERPENT_COIL_IMAGE_ASSETS,
  MIRROR_CROSSING_IMAGE_ASSETS,
  MIRROR_CROSSING_SHEET_ASSETS,
  POINTER_BRIDGE_IMAGE_ASSETS,
  FISHING_DOCK_IMAGE_ASSETS,
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
import { playBossEntryBanner } from "../../ui/BossEntryBanner";
import { playBossPhaseTransition } from "../../ui/BossPhaseTransition";
import { numberKeyToIndex } from "../../input/NumberKeyCommand";
import { PuzzleRoom } from "../../puzzleRooms/PuzzleRoom";
import {
  emptyLedger,
  recordTrade,
  starsForTrades,
  type GrainLedger,
} from "../../puzzleRooms/grainChamber/grainEconomy";
import { COIL_PHASES, serpentPar } from "../../puzzleRooms/serpentCoil/coilPlan";
import { MirrorSerpent } from "../../puzzleRooms/serpentCoil/MirrorSerpent";
import { isReversed, pairResolved } from "../../puzzleRooms/mirrorCrossing/crossingPlan";
import {
  mirrorSlot,
  slotIndexAtX,
} from "../../puzzleRooms/mirrorCrossing/crossingRules";
import { CrateRack } from "../../puzzleRooms/mirrorCrossing/CrateRack";
import { MirrorTwin } from "../../puzzleRooms/mirrorCrossing/MirrorTwin";
import { bridgeZoneAt } from "../../puzzleRooms/pointerBridge/bridgeRules";
import { PostLine } from "../../puzzleRooms/pointerBridge/PostLine";
import {
  bestWindowStart,
  windowSum,
} from "../../puzzleRooms/fishingDock/dockPlan";
import { frameStartAtX } from "../../puzzleRooms/fishingDock/dockRules";
import { BasketRow, NetFrame } from "../../puzzleRooms/fishingDock/BasketRow";
import { ChamberShell } from "../../puzzleRooms/chamber/ChamberShell";

type SerpentPhase = "reverse" | "twoSum" | "fixedWindow" | "won";

const UNTRADE_EVERY_MS = 8000;
const PUSH_EVERY_MS = 9000;
const SWAP_EVERY_MS = 9000;
const ZONE_REACH = 56;
const BEAM_X = 128;

export class Boss_MirrorSerpent extends BasePuzzleScene {
  private phase: SerpentPhase = "reverse";
  private ledger: GrainLedger = emptyLedger(0);
  private untrades = 0;
  private pushes = 0;
  private swaps = 0;
  private exiting = false;
  private resolving = false;
  private boardY = 0;
  private southWalkY = 0;
  private roomBounds = { x: 0, y: 0, width: 0, height: 0 };
  private interference: Phaser.Time.TimerEvent | null = null;

  private room: PuzzleRoom | null = null;
  private shell!: ChamberShell;
  private serpent!: MirrorSerpent;

  // Phase I — Turn the River
  private rack: CrateRack | null = null;
  private twin: MirrorTwin | null = null;
  private crossingValues: number[] = [];
  private crossingStart: number[] = [];

  // Phase II — Lash the Bridge
  private line: PostLine | null = null;

  // Phase III — Net the Coil
  private row: BasketRow | null = null;
  private net: NetFrame | null = null;
  private windowValues: number[] = [];

  constructor() {
    super({ key: SCENE_KEYS.BOSS_MIRROR_SERPENT });
    this.puzzleId = "boss_mirror_serpent";
    this.puzzleName = "The Mirror Serpent";
    this.puzzleDescription =
      "Turn the river, lash the bridge, net the coil — through the serpent's mischief.";
    this.maxHints = 2;
  }

  preload(): void {
    super.preload();
    const imageLists = [
      MIRROR_CROSSING_IMAGE_ASSETS,
      POINTER_BRIDGE_IMAGE_ASSETS,
      FISHING_DOCK_IMAGE_ASSETS,
      SERPENT_COIL_IMAGE_ASSETS,
    ];
    for (const list of imageLists) {
      for (const asset of list) {
        if (!this.textures.exists(asset.key))
          this.load.image(asset.key, asset.path);
      }
    }
    for (const asset of MIRROR_CROSSING_SHEET_ASSETS) {
      if (!this.textures.exists(asset.key))
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth ?? 16,
          frameHeight: asset.frameHeight ?? 16,
        });
    }
    for (const key of [
      VISUAL_REVAMP_KEYS.TR_DOCK_CRATE,
      VISUAL_REVAMP_KEYS.TR_DOCK_NODE,
      VISUAL_REVAMP_KEYS.PROP_WATER_BUOY,
      VISUAL_REVAMP_KEYS.BOSS_MIRROR_SERPENT_FIGURE,
    ]) {
      const path = getImageAssetPath(key);
      if (path && !this.textures.exists(key)) this.load.image(key, path);
    }
    PuzzleRoom.preload(this);
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, "river", { intensity: 0.6 });

    const { width, height } = this.cameras.main;
    this.boardY = Math.round((height * 0.46) / 8) * 8;
    this.southWalkY = this.boardY + 96;

    this.shell = new ChamberShell(this, serpentPar(0, 0, 0));
    this.serpent = new MirrorSerpent(this, width / 2, 120);
    new BitCompanion(this, { stage: "byte", x: width - 92, y: 100, depth: 40 });

    this.ledger = emptyLedger(0);
    this.mountRoom();
    this.shell.seal();
    playBossEntryBanner(this, {
      bossName: "The Mirror Serpent",
      regionTag: "Twin Rivers finale",
      thesis: "The river bends three ways. Turn it, pair it, net it.",
      accentColor: 0x22d3ee,
      onComplete: () => this.startReversePhase(),
    });

    this.input.keyboard?.on("keydown", this.onNumberKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.onNumberKey, this);
      this.interference?.remove();
    });
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
        if (this.phase === "reverse" && this.rack && this.twin) {
          this.twin.update(pos.x, this.rack.centerX());
        }
        if (this.phase === "fixedWindow") this.followNet(pos.x);
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
      a11yManager.announce("You step out across the stilled river.", true);
      this.onPuzzleComplete(
        starsForTrades(
          this.ledger.trades,
          serpentPar(this.untrades, this.pushes, this.swaps),
        ),
      );
    }
  }

  // ── Phase I — Turn the River ──────────────────────────────────────────

  private startReversePhase(): void {
    this.phase = "reverse";
    this.resolving = false;
    const northWalkY = this.boardY - 88;
    this.rack = new CrateRack(
      this,
      this.boardY,
      this.southWalkY,
      this.prefersReducedMotion(),
    );
    this.twin = new MirrorTwin(this, northWalkY);
    this.crossingStart = [...COIL_PHASES.reverse.values];
    this.crossingValues = [...COIL_PHASES.reverse.values];
    this.rack.setRow(this.crossingValues);
    a11yManager.announce(
      "Phase one: the current runs the wrong way. Trade mirror pairs to turn it — the serpent will un-turn them.",
      true,
    );
    this.interference = this.time.addEvent({
      delay: UNTRADE_EVERY_MS,
      loop: true,
      callback: () => void this.bossUntrade(),
    });
  }

  private resolvedPairs(): number[] {
    const n = this.crossingValues.length;
    const out: number[] = [];
    for (let s = 0; s < Math.floor(n / 2); s++) {
      if (s === mirrorSlot(s, n)) continue;
      if (pairResolved(this.crossingValues, this.crossingStart, s)) out.push(s);
    }
    return out;
  }

  private async bossUntrade(): Promise<void> {
    const rack = this.rack;
    if (this.phase !== "reverse" || !rack || rack.isBusy || this.resolving)
      return;
    const resolved = this.resolvedPairs();
    if (resolved.length === 0) return;
    const slot = resolved[Phaser.Math.Between(0, resolved.length - 1)];
    const center = rack.crateCenter(slot);
    if (!center) return;
    await this.serpent.windUp(center.x, center.y);
    // Re-check: the player may have raced the telegraph.
    if (this.phase !== "reverse" || rack.isBusy) return;
    if (!pairResolved(this.crossingValues, this.crossingStart, slot)) return;
    const mirror = mirrorSlot(slot, this.crossingValues.length);
    const next = [...this.crossingValues];
    const tmp = next[slot];
    next[slot] = next[mirror];
    next[mirror] = tmp;
    this.crossingValues = next;
    this.untrades++;
    void rack.tradePair(slot);
    if (this.untrades % 2 === 1) this.serpent.bark();
    a11yManager.announce("The serpent's coil un-turns a pair you set!", false);
  }

  private actReverse(): void {
    const rack = this.rack;
    if (!rack || rack.isBusy || this.resolving) return;
    const pos = this.room?.player.getPosition();
    if (!pos) return;
    const slot = slotIndexAtX(pos.x, rack.geometry());
    if (slot < 0) return;
    const n = this.crossingValues.length;
    const mirror = mirrorSlot(slot, n);

    this.ledger = recordTrade(this.ledger);

    if (slot === mirror) {
      rack.splash(slot);
      a11yManager.announce(
        "The centre crate faces itself — the trade just splashes.",
        false,
      );
      return;
    }
    if (pairResolved(this.crossingValues, this.crossingStart, slot)) {
      rack.splash(slot);
      a11yManager.announce(
        "Those two already stand reversed — the river keeps the splash.",
        false,
      );
      return;
    }

    const next = [...this.crossingValues];
    const tmp = next[slot];
    next[slot] = next[mirror];
    next[mirror] = tmp;
    this.crossingValues = next;
    const center = rack.crateCenter(slot);
    if (center) this.emitPuzzleActionPulse(center.x, center.y, "correct");

    void rack.tradePair(slot).then(() => {
      if (isReversed(this.crossingValues, this.crossingStart))
        void this.finishReversePhase();
    });
  }

  private async finishReversePhase(): Promise<void> {
    this.resolving = true;
    this.interference?.remove();
    this.interference = null;
    this.rack?.flipCurrent();
    this.twin?.celebrate();
    const { width } = this.cameras.main;
    JuiceSystem.correctBurst(this, width / 2, this.boardY - 40);
    await new Promise((resolve) => this.time.delayedCall(900, resolve));
    this.rack?.teardown();
    this.rack = null;
    this.twin?.teardown();
    this.twin = null;
    playBossPhaseTransition(this, {
      phaseNumber: "II",
      phaseName: "LASH THE BRIDGE",
      patternHint: "Two buoys, one weight the river wants. Walk inward.",
      accentColor: 0x22d3ee,
      onComplete: () => this.startTwoSumPhase(),
    });
  }

  // ── Phase II — Lash the Bridge ────────────────────────────────────────

  private startTwoSumPhase(): void {
    this.phase = "twoSum";
    this.resolving = false;
    this.line = new PostLine(
      this,
      this.boardY,
      this.southWalkY,
      this.prefersReducedMotion(),
    );
    this.line.setRound(COIL_PHASES.twoSum.values, COIL_PHASES.twoSum.target);
    a11yManager.announce(
      `Phase two: the rope wants ${COIL_PHASES.twoSum.target}. Walk the buoys inward — the serpent shoves them back.`,
      true,
    );
    this.interference = this.time.addEvent({
      delay: PUSH_EVERY_MS,
      loop: true,
      callback: () => void this.bossPush(),
    });
  }

  private async bossPush(): Promise<void> {
    const line = this.line;
    if (this.phase !== "twoSum" || !line || line.isBusy || this.resolving)
      return;
    const count = COIL_PHASES.twoSum.values.length;
    const leftRoom = line.leftIndex;
    const rightRoom = count - 1 - line.rightIndex;
    if (leftRoom === 0 && rightRoom === 0) return;
    const side: "left" | "right" = leftRoom >= rightRoom ? "left" : "right";
    const x = side === "left" ? line.leftX() : line.rightX();
    await this.serpent.windUp(x, this.boardY - 30);
    if (this.phase !== "twoSum" || line.isBusy) return;
    await line.pushOutward(side);
    this.pushes++;
    if (this.pushes % 2 === 1) this.serpent.bark();
    a11yManager.announce(
      "The serpent shoves a buoy back toward its bank!",
      false,
    );
  }

  private actTwoSum(): void {
    const line = this.line;
    if (!line || line.isBusy || this.resolving) return;
    const pos = this.room?.player.getPosition();
    if (!pos) return;
    const zone = bridgeZoneAt(pos.x, line.leftX(), line.rightX(), ZONE_REACH);
    if (!zone) return;

    if (zone === "lock") {
      this.ledger = recordTrade(this.ledger);
      if (line.currentSum() === COIL_PHASES.twoSum.target) {
        this.resolving = true;
        void line.lashDown().then(() => void this.finishTwoSumPhase());
        return;
      }
      line.failLock();
      this.emitPuzzleActionPulse(pos.x, this.boardY, "wrong");
      a11yManager.announce(
        "The rope recoils — that pair is not the river's weight.",
        false,
      );
      return;
    }

    this.ledger = recordTrade(this.ledger);
    void line.step(zone).then(() => {
      this.emitPuzzleActionPulse(
        zone === "left" ? line.leftX() : line.rightX(),
        this.boardY,
        "neutral",
      );
      if (line.leftIndex >= line.rightIndex) {
        a11yManager.announce(
          "The buoys meet with nothing to hold — the rope snaps back to the banks.",
          true,
        );
        void line.snapBack();
      }
    });
  }

  private async finishTwoSumPhase(): Promise<void> {
    this.resolving = true;
    this.interference?.remove();
    this.interference = null;
    const { width } = this.cameras.main;
    JuiceSystem.correctBurst(this, width / 2, this.boardY - 40);
    await new Promise((resolve) => this.time.delayedCall(800, resolve));
    this.line?.teardown();
    this.line = null;
    playBossPhaseTransition(this, {
      phaseNumber: "III",
      phaseName: "NET THE COIL",
      patternHint: "Slide the net. Heaviest catch lashes the beam.",
      accentColor: 0xeaf6ff,
      onComplete: () => this.startWindowPhase(),
    });
  }

  // ── Phase III — Net the Coil ──────────────────────────────────────────

  private startWindowPhase(): void {
    this.phase = "fixedWindow";
    this.resolving = false;
    this.buildBeam();
    this.row = new BasketRow(
      this,
      this.boardY,
      this.southWalkY,
      this.prefersReducedMotion(),
    );
    this.net = new NetFrame(this, this.boardY, () => this.row!.geometry());
    this.windowValues = [...COIL_PHASES.window.values];
    this.row.setRound(this.windowValues, COIL_PHASES.window.windowSize);
    const playerX = this.room?.player.getPosition().x;
    this.net.reset(
      playerX === undefined ? 0 : frameStartAtX(playerX, this.row.geometry()),
    );
    a11yManager.announce(
      `Phase three: your net frames ${COIL_PHASES.window.windowSize}. Bring the beam its heaviest catch — the serpent swaps the baskets.`,
      true,
    );
    this.interference = this.time.addEvent({
      delay: SWAP_EVERY_MS,
      loop: true,
      callback: () => void this.bossSwap(),
    });
  }

  /** A procedural weigh-beam on the dock's west head. */
  private buildBeam(): void {
    this.add
      .rectangle(BEAM_X, this.boardY - 8, 10, 84, 0x5a4a2e, 1)
      .setStrokeStyle(2, 0x3a2e1c, 1)
      .setDepth(14);
    this.add
      .rectangle(BEAM_X + 22, this.boardY - 46, 54, 8, 0x6a583a, 1)
      .setStrokeStyle(2, 0x3a2e1c, 1)
      .setDepth(14);
  }

  private followNet(playerX: number): void {
    const row = this.row;
    const net = this.net;
    if (this.resolving || !row || !net || row.isBusy) return;
    const k = COIL_PHASES.window.windowSize;
    const previous = net.start;
    const next = frameStartAtX(playerX, row.geometry());
    if (!net.glideTo(next)) return;
    for (let i = 0; i < Math.abs(next - previous); i++) {
      this.ledger = recordTrade(this.ledger);
    }
    if (next > previous) {
      row.pulseEnter(next + k - 1);
      row.dimLeave(previous);
    } else {
      row.pulseEnter(next);
      row.dimLeave(previous + k - 1);
    }
  }

  private async bossSwap(): Promise<void> {
    const row = this.row;
    if (this.phase !== "fixedWindow" || !row || row.isBusy || this.resolving)
      return;
    const n = this.windowValues.length;
    const i = Phaser.Math.Between(0, n - 1);
    let j = Phaser.Math.Between(0, n - 1);
    if (i === j) j = (j + 1) % n;
    await this.serpent.windUp(row.basketX(i), this.boardY);
    if (this.phase !== "fixedWindow" || row.isBusy) return;
    const next = [...this.windowValues];
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
    this.windowValues = next;
    this.swaps++;
    void row.swap(i, j);
    if (this.swaps % 2 === 1) this.serpent.bark();
    a11yManager.announce(
      "The serpent swaps two baskets — the heaviest catch may have moved.",
      false,
    );
  }

  private actWindow(): void {
    const row = this.row;
    const net = this.net;
    if (!row || !net || row.isBusy || this.resolving) return;
    const pos = this.room?.player.getPosition();
    if (!pos) return;
    this.ledger = recordTrade(this.ledger);
    const k = COIL_PHASES.window.windowSize;
    const start = net.start;
    const framed = windowSum(this.windowValues, start, k);
    const best = windowSum(
      this.windowValues,
      bestWindowStart(this.windowValues, k),
      k,
    );
    const success = framed === best;

    void row
      .haul(start, BEAM_X + 22, this.boardY - 64, success)
      .then(() => {
        if (!success) {
          a11yManager.announce(
            "The net tears — a heavier catch waits somewhere on the dock.",
            false,
          );
          return;
        }
        a11yManager.announce("The beam holds — heaviest catch taken.", false);
        void this.winSerpent();
      });
  }

  // ── Defeat ────────────────────────────────────────────────────────────

  private async winSerpent(): Promise<void> {
    this.phase = "won";
    this.resolving = true;
    this.interference?.remove();
    this.interference = null;
    const { width } = this.cameras.main;
    JuiceSystem.correctBurst(this, width / 2, this.boardY - 20);
    await this.serpent.defeat();
    this.shell.unbar(() => {
      this.openExitPath();
      const par = serpentPar(this.untrades, this.pushes, this.swaps);
      this.shell.setPlaqueTally(this.ledger.trades, par);
      a11yManager.announce(
        `The serpent sinks and the basin stills. ${this.ledger.trades} moves against a river's best of ${par}. ` +
          "Walk out through the north door.",
        true,
      );
      this.resolving = false;
    });
  }

  // ── Shared input ──────────────────────────────────────────────────────

  private onNumberKey(event: KeyboardEvent): void {
    if (!this.room || this.phase === "won") return;
    if (this.phase === "reverse" && this.rack) {
      const slot = numberKeyToIndex(event.key, this.crossingValues.length);
      if (slot === null) return;
      const center = this.rack.crateCenter(slot);
      if (!center) return;
      this.room.player.walkTo(center.x, this.southWalkY, () => this.onAct());
      return;
    }
    if (this.phase === "twoSum" && this.line) {
      const targets: Record<string, number | undefined> = {
        "1": this.line.leftX(),
        "2": this.line.midX(),
        "3": this.line.rightX(),
      };
      const x = targets[event.key];
      if (x === undefined) return;
      this.room.player.walkTo(x, this.southWalkY, () => this.onAct());
      return;
    }
    if (this.phase === "fixedWindow" && this.row) {
      const index = numberKeyToIndex(event.key, this.windowValues.length);
      if (index === null) return;
      this.room.player.walkTo(this.row.basketX(index), this.southWalkY, () => {});
    }
  }

  private onAct(): void {
    if (this.resolving) return;
    switch (this.phase) {
      case "reverse":
        this.actReverse();
        return;
      case "twoSum":
        this.actTwoSum();
        return;
      case "fixedWindow":
        this.actWindow();
        return;
      case "won":
        return;
    }
  }

  update(time: number, delta: number): void {
    this.room?.update(time, delta);
  }

  /** H-key hints — phase-aware, the river's own language. */
  protected displayHint(hintNumber: number): void {
    const byPhase: Record<SerpentPhase, string[]> = {
      reverse: [
        "Race the coil: the ring marks the pair it will un-turn.",
        "Trade only where the two crates differ — a mirrored pair is free.",
      ],
      twoSum: [
        "The rope tells you which buoy is wrong — heavy sags, light stretches.",
        "When the coil shoves a buoy out, just walk it back inward.",
      ],
      fixedWindow: [
        "Watch what enters your net and what leaves it. The middle keeps itself.",
        "After a swap, re-read the weights — the heaviest stretch may have moved.",
      ],
      won: ["The north door is open."],
    };
    const messages = byPhase[this.phase];
    this.showMessage(
      messages[Math.min(hintNumber, messages.length) - 1] ?? messages[0],
      COLORS.GOLD_ACCENT,
    );
  }

  protected getConceptName(): string {
    return "Convergence Mastery";
  }

  protected getModuleLabel(): string {
    return "BOSS  •  RIVERSIDE";
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
    if (this.textures.exists(SERPENT_COIL_KEYS.BACKDROP)) return null;
    return { id: "twin-rivers", options: { intensity: 1 } };
  }

  protected getPuzzleBackdropKey(): string | null {
    if (this.textures.exists(SERPENT_COIL_KEYS.BACKDROP)) {
      return SERPENT_COIL_KEYS.BACKDROP;
    }
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_ACTION_ARENA_BG;
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
}
