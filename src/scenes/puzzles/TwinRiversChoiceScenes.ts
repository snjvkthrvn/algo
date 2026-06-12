/**
 * Twin Rivers - first-principles two-pointer / sliding-window puzzles.
 *
 * Every puzzle here is interactive: the player physically operates pointers and
 * windows on a row of values, performing the algorithm by hand. No pseudocode
 * or state panels mount during play (docs/VISION.md §3-4) — the deep layer
 * lives in the Codex.
 *
 * Filename retained from the previous (multiple-choice) implementation so that
 * gameConfig scene registration and FutureRegionScene wiring remain unchanged.
 */

import Phaser from "phaser";
import { BasePuzzleScene } from "./BasePuzzleScene";
import { COLORS, FONTS, SCENE_KEYS } from "../../config/constants";
import { VISUAL_REVAMP_KEYS, getImageAssetPath } from "../../config/assets";
import { audioManager } from "../../core/AudioManager";
import { JuiceSystem } from "../../systems/JuiceSystem";
import { RiverRow } from "../../ui/RiverRow";
import { PuzzleAmbience } from "../../ui/PuzzleAmbience";
import { BitCompanion } from "../../ui/BitCompanion";
import { GlitchCorner } from "../../ui/GlitchCorner";
import { ComplexityMeter } from "../../ui/ComplexityMeter";
import { TWIN_RIVERS_PUZZLE_THEME, type PuzzleTheme } from "./puzzleTheme";
import type {
  RegionBackdropId,
  RegionBackdropOptions,
} from "../../ui/RegionBackdrop";
import { showLessonCard } from "../../ui/LessonCard";
import {
  POINTER_BRIDGE_ROUNDS,
  FIXED_WINDOW_ROUNDS,
  CURRENT_RIDER_ROUNDS,
  MIRROR_SERPENT_PHASES,
  reversedTarget,
  arrayEquals,
  pointerDirective,
  windowSumAt,
  bestFixedWindowStart,
  longestUniqueWindowLength,
  type FixedWindowRound,
  type PointerBridgeRound,
} from "../../data/puzzles/twinRiversPuzzleLogic";
import {
  BruteForceActor,
  type BruteForceStrategy,
} from "../../entities/BruteForceActor";
import { GLITCH_BANTER } from "../../data/dialogue/glitch_dialogue";
import { PuzzlePhase } from "../../data/types";
import { playBossPhaseTransition } from "../../ui/BossPhaseTransition";
import { playBossEntryBanner } from "../../ui/BossEntryBanner";
import { GamepadActionBridge } from "../../input/GamepadActionBridge";
import { mountTransientLegend } from "../../ui/transientLegend";

const BLUE_BANK = 0x5ab7d4;
const ORANGE_BANK = 0xf97316;
const GOLD = 0xfbbf24;

/**
 * Guard-preload the dock-crate sprite RiverRow uses as its physical tile
 * body. BasePuzzleScene.preload only loads the backdrop + frame; without
 * this opt-in (P1_1 pattern) a direct scene start would silently fall back
 * to the flat-slab tile path.
 */
function preloadRiverRowProps(scene: BasePuzzleScene): void {
  const key = VISUAL_REVAMP_KEYS.TR_DOCK_CRATE;
  const path = getImageAssetPath(key);
  if (path && !scene.textures.exists(key)) {
    scene.load.image(key, path);
  }
}

// ============================================================================
// P2_1 - Mirror Walk: in-place reverse via two converging pointers
// ============================================================================

// P2_1 extracted to its own chamber-room file; re-exported here so
// gameConfig and tests keep importing from this barrel.
export { P2_1_MirrorWalk } from "./P2_1_MirrorWalk";

export class P2_2_PointerBridge extends BasePuzzleScene {
  private round!: PointerBridgeRound;
  private roundIndex = 0;
  private mistakes = 0;
  private leftIndex = 0;
  private rightIndex = 0;
  private row!: RiverRow;
  private sumText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private useItCornerMounted = false;
  private actionLocked = false;
  /** Pair-checks (brute) vs walk steps (algo). */
  private complexity: ComplexityMeter | null = null;
  /** Walk steps consumed this round — every pointer move counts. */
  private walkSteps = 0;
  /** Glitch as visible co-actor during FEEL_IT round 1. Null in USE_IT rounds. */
  private bruteForce: BruteForceActor | null = null;
  /** True between FEEL_IT round completion and USE_IT round mount. Guards
   *  against re-firing the NAME_IT beat on restart. */
  private namedYet = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_2 });
    this.puzzleId = "tr_2";
    this.puzzleName = "Pointer Bridge";
    this.puzzleDescription =
      "On a sorted row, raise the low side or lower the high side until the pair sums match.";
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_ACTION_ARENA_BG;
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
    // Pointer Bridge crosses the converged river — one wide blue ribbon flowing
    // downstream, so the bridge becomes the natural stage spine.
    return {
      id: "twin-rivers",
      options: { riverMode: "converged", intensity: 0.9 },
    };
  }
  protected getConceptName(): string {
    return "Sorted Two-Sum";
  }

  preload(): void {
    super.preload();
    preloadRiverRowProps(this);
  }

  create(): void {
    // FEEL_IT first-principles guard: strip "sorted row, raise the low side"
    // from the title subtitle. The player should derive that the sortedness
    // makes one direction always correct.
    if (POINTER_BRIDGE_ROUNDS[0]?.lesson?.phase === PuzzlePhase.FEEL_IT) {
      this.puzzleDescription =
        "Find two stones whose values sum to the target. The Bridge Keeper watches.";
    }
    super.create();
    new PuzzleAmbience(this, "river", { intensity: 0.35 });
    const { width, height } = this.cameras.main;
    new BitCompanion(this, {
      stage: "frame",
      frameMode: "split",
      x: width - 108,
      y: 100,
      depth: 40,
    });
    // GlitchCorner and ComplexityMeter mount via mountUseItPanels — the
    // round-1 FEEL_IT mount has only the brute-force counter, no
    // algorithm-named chrome.

    this.statusText = this.createStatusReadout(width / 2, 174);

    this.sumText = this.add
      .text(width / 2, 218, "", {
        fontSize: "18px",
        fontFamily: FONTS.RETRO,
        color: "#fbbf24",
        stroke: "#081820",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(20);

    mountTransientLegend(
      this,
      height - 92,
      "[A]/[D] move left avatar  -  [J]/[L] move right avatar  -  [ENTER] lock pair",
    );

    this.input.keyboard?.on("keydown-A", () => this.tryMoveLeft(-1));
    this.input.keyboard?.on("keydown-D", () => this.tryMoveLeft(1));
    this.input.keyboard?.on("keydown-J", () => this.tryMoveRight(-1));
    this.input.keyboard?.on("keydown-L", () => this.tryMoveRight(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.tryLock());
    this.input.keyboard?.on("keydown-SPACE", () => this.tryLock());
    new GamepadActionBridge(this, {
      left: () => this.tryMoveLeft(-1),
      right: () => this.tryMoveLeft(1),
      up: () => this.tryMoveRight(-1),
      down: () => this.tryMoveRight(1),
      secondaryLeft: () => this.tryMoveRight(-1),
      secondaryRight: () => this.tryMoveRight(1),
      action: () => this.tryLock(),
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bruteForce?.destroy();
      this.bruteForce = null;
    });

    void this.beginRound(0);
  }

  // ──────────────────────────────────────────────────────────────────
  // Phase gating (FEEL_IT vs USE_IT)
  // ──────────────────────────────────────────────────────────────────

  private isFeelItRound(): boolean {
    return (
      POINTER_BRIDGE_ROUNDS[this.roundIndex]?.lesson?.phase ===
      PuzzlePhase.FEEL_IT
    );
  }

  /** FEEL_IT mounts: only the brute-force pair-check counter — no complexity
   *  meter or other algorithm-named chrome. The two-pointer technique should
   *  be the player's discovery, not the screen's announcement. */
  private mountFeelItPanels(): void {
    if (this.bruteForce) return;
    const { height } = this.cameras.main;
    this.bruteForce = new BruteForceActor(this, {
      x: 152,
      y: height - 92,
      strategy: makeSortedPairsBruteStrategy(),
      heading: "⚠ GLITCH'S APPROACH",
      subtitle: "(checking every pair at random...)",
      notDoneLabel: "still flailing",
      doneLabel: "gave up",
      verbLabel: "pair checks",
      banter: GLITCH_BANTER.tr_2,
      depth: 40,
    });
  }

  /** USE_IT mounts: the friendly GlitchCorner and the pair-checks-vs-walk-
   *  steps complexity meter. No pseudocode or state panels — the playable
   *  game never shows code (docs/VISION.md §3-4); the deep layer lives in
   *  the Codex. */
  private mountUseItPanels(): void {
    const { width, height } = this.cameras.main;
    if (!this.useItCornerMounted) {
      this.useItCornerMounted = true;
      new GlitchCorner(this, {
        x: 152,
        y: height - 92,
        width: 240,
        height: 74,
        variant: "riverside",
        heading: "Glitch's Approach",
        body: "checks every pair, one by one. You just walk inward.",
        depth: 40,
      });
    }
    if (!this.complexity) {
      this.complexity = new ComplexityMeter(this, {
        x: width / 2,
        y: 246,
        width: 320,
        bruteLabel: "pair checks",
        bruteCost: pairCount(
          POINTER_BRIDGE_ROUNDS[this.roundIndex].values.length,
        ),
        algoLabel: "walk steps",
        algoCost: 0,
        variant: "riverside",
        depth: 40,
      });
    }
  }

  private async beginRound(index: number): Promise<void> {
    this.actionLocked = true;
    const lesson = POINTER_BRIDGE_ROUNDS[index]?.lesson;
    if (lesson)
      await showLessonCard(this, lesson, "riverside", { dockPosition: "top" });
    this.startRound(index);
  }

  private startRound(index: number): void {
    this.roundIndex = index;
    this.round = POINTER_BRIDGE_ROUNDS[index];
    this.leftIndex = 0;
    this.rightIndex = this.round.values.length - 1;
    this.walkSteps = 0;

    if (this.row) this.row.destroy();
    this.row = new RiverRow(this, {
      values: this.round.values,
      centerX: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2 + 36,
      tileSize: 54,
      gap: 8,
      onTilePress: () => this.performPointerBridgeBoardStep(),
    });
    this.row.setCursor("L", {
      label: "L",
      color: BLUE_BANK,
      index: this.leftIndex,
      side: "top",
    });
    this.row.setCursor("R", {
      label: "R",
      color: ORANGE_BANK,
      index: this.rightIndex,
      side: "top",
    });

    if (this.isFeelItRound()) {
      this.mountFeelItPanels();
    } else {
      this.mountUseItPanels();
      // Coming from FEEL_IT into USE_IT — fade Glitch out of focus instead of
      // destroying. Keeps the contrast visible after the player has the technique.
      this.bruteForce?.fadeTo(0.32);
    }

    this.complexity?.reset({
      bruteCost: pairCount(this.round.values.length),
      algoCost: 0,
      bruteLabel: "pair checks",
      algoLabel: "walk steps",
    });

    this.refreshDisplay();
  }

  private currentSum(): number {
    return (
      this.round.values[this.leftIndex] + this.round.values[this.rightIndex]
    );
  }

  private refreshDisplay(): void {
    const stage = this.roundIndex + 1;
    const total = POINTER_BRIDGE_ROUNDS.length;
    this.statusText.setText(
      `BRIDGE ${stage}/${total}   -   target = ${this.round.target}`,
    );

    const sum = this.currentSum();
    const diff = sum - this.round.target;
    const sign = diff === 0 ? "=" : diff > 0 ? ">" : "<";
    this.sumText.setText(
      `${this.round.values[this.leftIndex]} + ${this.round.values[this.rightIndex]} = ${sum}  ${sign}  ${this.round.target}`,
    );
    this.sumText.setColor(diff === 0 ? "#88c070" : "#fbbf24");
  }

  private tryMoveLeft(direction: -1 | 1): void {
    if (this.actionLocked) return;
    const directive = pointerDirective(this.currentSum(), this.round.target);
    if (direction !== 1 || directive !== "advance_left") {
      this.flashWrong("The algorithm forces a different move. Read the sum.");
      return;
    }
    if (this.leftIndex + 1 >= this.rightIndex) return;
    this.leftIndex++;
    this.walkSteps++;
    this.complexity?.setAlgoCost(this.walkSteps);
    this.row.moveCursor("L", this.leftIndex);
    audioManager.playTone(420, 60, "sine");
    this.refreshDisplay();
  }

  private tryMoveRight(direction: -1 | 1): void {
    if (this.actionLocked) return;
    const directive = pointerDirective(this.currentSum(), this.round.target);
    if (direction !== -1 || directive !== "retreat_right") {
      this.flashWrong("The algorithm forces a different move. Read the sum.");
      return;
    }
    if (this.rightIndex - 1 <= this.leftIndex) return;
    this.rightIndex--;
    this.walkSteps++;
    this.complexity?.setAlgoCost(this.walkSteps);
    this.row.moveCursor("R", this.rightIndex);
    audioManager.playTone(360, 60, "sine");
    this.refreshDisplay();
  }

  private tryLock(): void {
    if (this.actionLocked) return;
    if (this.currentSum() !== this.round.target) {
      this.flashWrong("That pair does not match the target.");
      return;
    }
    this.actionLocked = true;
    this.complexity?.celebrate();
    audioManager.playCorrectTone();
    this.row.pulseTile(this.leftIndex, COLORS.SUCCESS);
    this.row.pulseTile(this.rightIndex, COLORS.SUCCESS);
    JuiceSystem.correctBurst(
      this,
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
    );

    // FEEL_IT completion → fire the Bridge Keeper's NAME_IT beat once before
    // round 2 starts. Freezing Glitch's pair-check counter lands the
    // "you won the contrast" moment as the Keeper speaks.
    this.time.delayedCall(800, async () => {
      this.actionLocked = false;
      if (this.roundIndex + 1 >= POINTER_BRIDGE_ROUNDS.length) {
        this.completePuzzle();
        return;
      }
      const finishedRound = POINTER_BRIDGE_ROUNDS[this.roundIndex];
      if (
        finishedRound?.lesson?.phase === PuzzlePhase.FEEL_IT &&
        finishedRound.lesson.nameItBeat &&
        !this.namedYet
      ) {
        this.namedYet = true;
        this.bruteForce?.freeze();
        await this.showNameItBeat(finishedRound.lesson.nameItBeat);
      }
      void this.beginRound(this.roundIndex + 1);
    });
  }

  private performPointerBridgeBoardStep(): void {
    if (this.actionLocked) return;
    const directive = pointerDirective(this.currentSum(), this.round.target);
    if (directive === "lock") {
      this.tryLock();
    } else if (directive === "advance_left") {
      this.tryMoveLeft(1);
    } else {
      this.tryMoveRight(-1);
    }
  }

  private flashWrong(message: string): void {
    this.mistakes++;
    JuiceSystem.cameraShake(this, 80, 0.002);
    this.showMessage(message, COLORS.WARNING);
    audioManager.playWrongTone();
  }

  private completePuzzle(): void {
    // Tightened scoring: 3 stars only for flawless; 2 stars allows one mistake
    // and one hint.
    const stars =
      this.mistakes === 0 && this.hintsUsed === 0
        ? 3
        : this.mistakes <= 1 && this.hintsUsed <= 1
          ? 2
          : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    // FEEL_IT hints stay diegetic — no "pointer" vocabulary. The riverbed
    // framing carries the same affordance.
    const hints = this.isFeelItRound()
      ? [
          "Sum too small? Move the left avatar higher (D). Sum too big? Move the right avatar lower (J).",
          "The stones are in order. The sum tells you which way to step — you never have to guess.",
          "Watch Glitch test every pair. Walking from the ends is much faster.",
        ]
      : [
          "Sum too small? Raise the left pointer (D). Sum too big? Lower the right pointer (J).",
          "A sorted row makes the right move forced — only one direction can fix the gap.",
          "The sum readout tells you the only legal move — compare it to the target.",
        ];
    this.showMessage(hints[hintNumber - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P2_3 - Fixed Window Dock: max-sum sliding window
// ============================================================================

export class P2_3_FixedWindowDock extends BasePuzzleScene {
  private round!: FixedWindowRound;
  private roundIndex = 0;
  private mistakes = 0;
  private windowStart = 0;
  private bestSeenSum = 0;
  private row!: RiverRow;
  private statusText!: Phaser.GameObjects.Text;
  private sumText!: Phaser.GameObjects.Text;
  private useItCornerMounted = false;
  private actionLocked = false;
  /** Brute (recompute every window: (n-k+1)·k) vs algo (n-k+1 slides). */
  private complexity: ComplexityMeter | null = null;
  /** Number of slide operations the player has performed this round. */
  private slideCount = 0;
  /** Glitch as visible co-actor during FEEL_IT round 1. */
  private bruteForce: BruteForceActor | null = null;
  /** True between FEEL_IT round completion and USE_IT round mount. */
  private namedYet = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_3 });
    this.puzzleId = "tr_3";
    this.puzzleName = "Fixed Window Dock";
    this.puzzleDescription =
      "Slide a fixed window along the dock. Find the heaviest catch.";
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_ACTION_ARENA_BG;
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
    return {
      id: "twin-rivers",
      options: { riverMode: "converged", intensity: 0.9 },
    };
  }
  protected getConceptName(): string {
    return "Fixed Sliding Window";
  }

  preload(): void {
    super.preload();
    preloadRiverRowProps(this);
  }

  // ──────────────────────────────────────────────────────────────────
  // Phase gating (FEEL_IT vs USE_IT)
  // ──────────────────────────────────────────────────────────────────

  private isFeelItRound(): boolean {
    return (
      FIXED_WINDOW_ROUNDS[this.roundIndex]?.lesson?.phase ===
      PuzzlePhase.FEEL_IT
    );
  }

  /** FEEL_IT mounts: only the brute-force window-rescan counter — no
   *  complexity meter or other algorithm-named chrome. The sliding-window
   *  technique should be the player's discovery from watching the EDGES,
   *  not the screen's announcement. */
  private mountFeelItPanels(): void {
    if (this.bruteForce) return;
    const { height } = this.cameras.main;
    this.bruteForce = new BruteForceActor(this, {
      x: 152,
      y: height - 92,
      strategy: makeWindowSlideBruteStrategy(),
      heading: "⚠ GLITCH'S APPROACH",
      subtitle: "(recounting every slat from scratch...)",
      notDoneLabel: "still counting",
      doneLabel: "gave up",
      verbLabel: "window rescans",
      banter: GLITCH_BANTER.tr_3,
      depth: 40,
    });
  }

  /** USE_IT mounts: the friendly GlitchCorner and the recompute-vs-slide
   *  complexity meter. No pseudocode or state panels — the playable game
   *  never shows code (docs/VISION.md §3-4); the deep layer lives in the
   *  Codex. */
  private mountUseItPanels(): void {
    const { width, height } = this.cameras.main;
    if (!this.useItCornerMounted) {
      this.useItCornerMounted = true;
      new GlitchCorner(this, {
        x: 152,
        y: height - 92,
        width: 240,
        height: 74,
        variant: "riverside",
        heading: "Glitch Re-Adds Each Window",
        body: "recounts the whole net every step. You only trade the edges.",
        depth: 40,
      });
    }
    if (!this.complexity) {
      const r0 = FIXED_WINDOW_ROUNDS[this.roundIndex];
      this.complexity = new ComplexityMeter(this, {
        x: width / 2,
        y: 246,
        width: 320,
        bruteLabel: "recompute cost",
        bruteCost: bruteWindowCost(r0.values.length, r0.windowSize),
        algoLabel: "your slides",
        algoCost: 0,
        variant: "riverside",
        depth: 40,
      });
    }
  }

  create(): void {
    // FEEL_IT first-principles guard: strip "slide a fixed window" from the
    // title subtitle. The player should derive the window-edge insight from
    // watching what enters and leaves the net.
    if (FIXED_WINDOW_ROUNDS[0]?.lesson?.phase === PuzzlePhase.FEEL_IT) {
      this.puzzleDescription =
        "Slide your net along the dock. Find the heaviest catch.";
    }
    super.create();
    new PuzzleAmbience(this, "river", { intensity: 0.35 });
    const { width, height } = this.cameras.main;
    // Frame mode (not split) — Bit's frame BECOMES the sliding window.
    new BitCompanion(this, {
      stage: "frame",
      frameMode: "frame",
      x: width - 108,
      y: 100,
      depth: 40,
    });
    // GlitchCorner and ComplexityMeter mount via mountUseItPanels — FEEL_IT
    // round 1 carries only the BruteForceActor counter, no algorithm-named
    // chrome.

    this.statusText = this.createStatusReadout(width / 2, 174);

    this.sumText = this.add
      .text(width / 2, 218, "", {
        fontSize: "16px",
        fontFamily: FONTS.RETRO,
        color: "#fbbf24",
        stroke: "#081820",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(20);

    // Keyboard hint switches "window" → "net" in FEEL_IT to stay diegetic.
    const keyboardHint =
      FIXED_WINDOW_ROUNDS[0]?.lesson?.phase === PuzzlePhase.FEEL_IT
        ? "[<-]/[->] slide net  -  [SPACE] lock at current position"
        : "[<-]/[->] slide window  -  [SPACE] lock at current position";
    mountTransientLegend(this, height - 92, keyboardHint);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bruteForce?.destroy();
      this.bruteForce = null;
    });

    this.input.keyboard?.on("keydown-LEFT", () => this.slide(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.slide(1));
    this.input.keyboard?.on("keydown-A", () => this.slide(-1));
    this.input.keyboard?.on("keydown-D", () => this.slide(1));
    this.input.keyboard?.on("keydown-SPACE", () => this.tryLock());
    this.input.keyboard?.on("keydown-ENTER", () => this.tryLock());
    new GamepadActionBridge(this, {
      left: () => this.slide(-1),
      right: () => this.slide(1),
      action: () => this.tryLock(),
    });

    void this.beginRound(0);
  }

  private async beginRound(index: number): Promise<void> {
    this.actionLocked = true;
    const lesson = FIXED_WINDOW_ROUNDS[index]?.lesson;
    if (lesson)
      await showLessonCard(this, lesson, "riverside", { dockPosition: "top" });
    this.startRound(index);
  }

  private startRound(index: number): void {
    this.roundIndex = index;
    this.round = FIXED_WINDOW_ROUNDS[index];
    this.windowStart = 0;
    this.bestSeenSum = windowSumAt(this.round.values, 0, this.round.windowSize);
    this.slideCount = 0;

    if (this.row) this.row.destroy();
    this.row = new RiverRow(this, {
      values: this.round.values,
      centerX: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2 + 36,
      tileSize: 50,
      gap: 6,
      onTilePress: (index) => this.performFixedWindowBoardStep(index),
    });

    if (this.isFeelItRound()) {
      this.mountFeelItPanels();
    } else {
      this.mountUseItPanels();
      // Coming from FEEL_IT into USE_IT — fade Glitch out of focus instead of
      // destroying. Keeps the rescan-count contrast visible.
      this.bruteForce?.fadeTo(0.32);
    }

    this.complexity?.reset({
      bruteCost: bruteWindowCost(
        this.round.values.length,
        this.round.windowSize,
      ),
      algoCost: 0,
      bruteLabel: "recompute cost",
      algoLabel: "your slides",
    });

    this.refreshDisplay();
  }

  private refreshDisplay(): void {
    const stage = this.roundIndex + 1;
    const total = FIXED_WINDOW_ROUNDS.length;
    const k = this.round.windowSize;
    this.statusText.setText(
      `DOCK ${stage}/${total}   -   window size = ${k}   -   slide to the heaviest catch`,
    );

    const left = this.windowStart;
    const right = this.windowStart + k - 1;
    this.row.setWindow(left, right, GOLD);

    const sum = windowSumAt(this.round.values, left, k);
    if (sum > this.bestSeenSum) {
      this.bestSeenSum = sum;
    }
    this.sumText.setText(`SUM = ${sum}   -   BEST SEEN = ${this.bestSeenSum}`);
  }

  private slide(direction: -1 | 1): void {
    if (this.actionLocked) return;
    const next = this.windowStart + direction;
    if (next < 0 || next + this.round.windowSize > this.round.values.length)
      return;
    this.windowStart = next;
    this.slideCount++;
    this.complexity?.setAlgoCost(this.slideCount);
    audioManager.playTone(direction === 1 ? 540 : 420, 50, "sine");
    this.refreshDisplay();
  }

  private tryLock(): void {
    if (this.actionLocked) return;
    const k = this.round.windowSize;
    const optimal = bestFixedWindowStart(this.round.values, k);
    const optimalSum = windowSumAt(this.round.values, optimal, k);
    const here = windowSumAt(this.round.values, this.windowStart, k);

    if (here !== optimalSum) {
      this.mistakes++;
      JuiceSystem.cameraShake(this, 80, 0.002);
      audioManager.playWrongTone();
      this.showMessage(
        `Sum here is ${here}; the maximum is higher. Keep sliding.`,
        COLORS.WARNING,
      );
      return;
    }

    this.actionLocked = true;
    this.complexity?.celebrate();
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(
      this,
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
    );
    for (let i = this.windowStart; i < this.windowStart + k; i++) {
      this.row.pulseTile(i, COLORS.SUCCESS);
    }

    // FEEL_IT completion → fire the Window Fisher's NAME_IT beat once before
    // round 2 starts. Freezing Glitch's rescan counter lands the contrast.
    this.time.delayedCall(900, async () => {
      this.actionLocked = false;
      if (this.roundIndex + 1 >= FIXED_WINDOW_ROUNDS.length) {
        this.completePuzzle();
        return;
      }
      const finishedRound = FIXED_WINDOW_ROUNDS[this.roundIndex];
      if (
        finishedRound?.lesson?.phase === PuzzlePhase.FEEL_IT &&
        finishedRound.lesson.nameItBeat &&
        !this.namedYet
      ) {
        this.namedYet = true;
        this.bruteForce?.freeze();
        await this.showNameItBeat(finishedRound.lesson.nameItBeat);
      }
      void this.beginRound(this.roundIndex + 1);
    });
  }

  private performFixedWindowBoardStep(index: number): void {
    if (this.actionLocked) return;
    const left = this.windowStart;
    const right = this.windowStart + this.round.windowSize - 1;
    if (index < left) {
      this.slide(-1);
    } else if (index > right) {
      this.slide(1);
    } else {
      this.tryLock();
    }
  }

  private completePuzzle(): void {
    // Tightened scoring: 3 stars only for a flawless run, and the optimal
    // window must be reached on the first lock per round (mistakes counts
    // every wrong lock).
    const stars =
      this.mistakes === 0 && this.hintsUsed === 0
        ? 3
        : this.mistakes <= 1 && this.hintsUsed <= 1
          ? 2
          : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    // FEEL_IT hints stay diegetic — no "sum", "slide", "index" as technique
    // vocabulary. The dock + net + catch framing carries the same affordance.
    const hints = this.isFeelItRound()
      ? [
          "Watch what enters your net and what leaves it. The middle stays the same.",
          "Keep track of the heaviest catch you have seen so far.",
          `The best spot starts at slat ${bestFixedWindowStart(this.round.values, this.round.windowSize)}.`,
        ]
      : [
          "Each step changes the sum by only two values: one enters on the right, one leaves on the left.",
          "BEST SEEN updates whenever you slide past a richer slice — keep an eye on it.",
          `The maximum window starts at index ${bestFixedWindowStart(this.round.values, this.round.windowSize)}.`,
        ];
    this.showMessage(hints[hintNumber - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// P2_4 - Current Rider: longest substring without repeats (variable window)
// ============================================================================

export class P2_4_CurrentRider extends BasePuzzleScene {
  private round!: { letters: ReadonlyArray<string> };
  private roundIndex = 0;
  private mistakes = 0;
  private leftIndex = 0;
  private rightIndex = 0;
  private bestLength = 0;
  private optimal = 0;
  private row!: RiverRow;
  private statusText!: Phaser.GameObjects.Text;
  private metricsText!: Phaser.GameObjects.Text;
  private useItCornerMounted = false;
  private actionLocked = false;
  /** Glitch as visible co-actor during FEEL_IT round 1. */
  private bruteForce: BruteForceActor | null = null;
  /** True between FEEL_IT round completion and USE_IT round mount. */
  private namedYet = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_4 });
    this.puzzleId = "tr_4";
    this.puzzleName = "Current Rider";
    this.puzzleDescription =
      "Stretch the window when safe. Shrink it when the river repeats.";
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_ACTION_ARENA_BG;
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
    return {
      id: "twin-rivers",
      options: { riverMode: "converged", intensity: 0.9 },
    };
  }
  protected getConceptName(): string {
    return "Variable Sliding Window";
  }

  preload(): void {
    super.preload();
    preloadRiverRowProps(this);
  }

  // ──────────────────────────────────────────────────────────────────
  // Phase gating (FEEL_IT vs USE_IT)
  // ──────────────────────────────────────────────────────────────────

  private isFeelItRound(): boolean {
    return (
      CURRENT_RIDER_ROUNDS[this.roundIndex]?.lesson?.phase ===
      PuzzlePhase.FEEL_IT
    );
  }

  /** FEEL_IT mounts: only the brute-force substring-checks counter — no
   *  algorithm-named chrome. The expand-and-shrink rhythm should be the
   *  player's discovery from listening to the river, not the screen's
   *  announcement. */
  private mountFeelItPanels(): void {
    if (this.bruteForce) return;
    const { height } = this.cameras.main;
    this.bruteForce = new BruteForceActor(this, {
      x: 152,
      y: height - 92,
      strategy: makeVariableWindowBruteStrategy(),
      heading: "⚠ GLITCH'S APPROACH",
      subtitle: "(trying every single substring...)",
      notDoneLabel: "still checking",
      doneLabel: "gave up",
      verbLabel: "substring checks",
      banter: GLITCH_BANTER.tr_4,
      depth: 40,
    });
  }

  /** USE_IT mounts: the friendly GlitchCorner only. No pseudocode or state
   *  panels — the playable game never shows code (docs/VISION.md §3-4); the
   *  deep layer lives in the Codex. */
  private mountUseItPanels(): void {
    const { height } = this.cameras.main;
    if (!this.useItCornerMounted) {
      this.useItCornerMounted = true;
      new GlitchCorner(this, {
        x: 152,
        y: height - 92,
        width: 240,
        height: 74,
        variant: "riverside",
        heading: "Glitch Rechecks Every Substring",
        body: "rereads the whole current each step. You only move the ends.",
        depth: 40,
      });
    }
  }

  create(): void {
    // FEEL_IT first-principles guard: strip "stretch right, shrink left" from
    // the title subtitle. The player should derive the listen-to-the-river
    // rhythm from the catch quality, not a written rule.
    if (CURRENT_RIDER_ROUNDS[0]?.lesson?.phase === PuzzlePhase.FEEL_IT) {
      this.puzzleDescription =
        "Keep the good. Kick out the bad. Make the net whatever size it needs to be.";
    }
    super.create();
    new PuzzleAmbience(this, "river", { intensity: 0.35 });
    const { width, height } = this.cameras.main;
    new BitCompanion(this, {
      stage: "frame",
      frameMode: "frame",
      x: width - 108,
      y: 100,
      depth: 40,
    });
    // GlitchCorner mounts via mountUseItPanels — FEEL_IT round 1 carries
    // only the brute-force counter.

    this.statusText = this.createStatusReadout(width / 2, 174);

    this.metricsText = this.add
      .text(width / 2, 218, "", {
        fontSize: "16px",
        fontFamily: FONTS.RETRO,
        color: "#fbbf24",
        stroke: "#081820",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(20);

    // Keyboard hint switches "R++" / "L++" / "BEST" to plain action verbs
    // in FEEL_IT to stay diegetic.
    const keyboardHint =
      CURRENT_RIDER_ROUNDS[0]?.lesson?.phase === PuzzlePhase.FEEL_IT
        ? "[E] extend net  -  [Q] shrink net  -  [SPACE] submit best catch"
        : "[E] extend right (R++)  -  [Q] shrink left (L++)  -  [SPACE] submit when BEST is correct";
    mountTransientLegend(this, height - 92, keyboardHint);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bruteForce?.destroy();
      this.bruteForce = null;
    });

    this.input.keyboard?.on("keydown-E", () => this.extendRight());
    this.input.keyboard?.on("keydown-Q", () => this.shrinkLeft());
    this.input.keyboard?.on("keydown-D", () => this.extendRight());
    this.input.keyboard?.on("keydown-A", () => this.shrinkLeft());
    // Arrow-key aliases — matches the player's intuition that the window
    // grows rightward (RIGHT extends) and shrinks from the left (LEFT shrinks).
    this.input.keyboard?.on("keydown-RIGHT", () => this.extendRight());
    this.input.keyboard?.on("keydown-LEFT", () => this.shrinkLeft());
    this.input.keyboard?.on("keydown-SPACE", () => this.trySubmit());
    this.input.keyboard?.on("keydown-ENTER", () => this.trySubmit());
    new GamepadActionBridge(this, {
      left: () => this.shrinkLeft(),
      right: () => this.extendRight(),
      secondaryLeft: () => this.shrinkLeft(),
      secondaryRight: () => this.extendRight(),
      action: () => this.trySubmit(),
    });

    void this.beginRound(0);
  }

  private async beginRound(index: number): Promise<void> {
    this.actionLocked = true;
    const lesson = CURRENT_RIDER_ROUNDS[index]?.lesson;
    if (lesson)
      await showLessonCard(this, lesson, "riverside", { dockPosition: "top" });
    this.startRound(index);
  }

  private startRound(index: number): void {
    this.roundIndex = index;
    this.round = CURRENT_RIDER_ROUNDS[index];
    this.leftIndex = 0;
    this.rightIndex = 0;
    this.bestLength = 1;
    this.optimal = longestUniqueWindowLength(this.round.letters);

    if (this.row) this.row.destroy();
    this.row = new RiverRow(this, {
      values: this.round.letters,
      centerX: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2 + 36,
      tileSize: 48,
      gap: 6,
      onTilePress: () => this.performCurrentRiderBoardStep(),
    });
    this.row.setCursor("L", {
      label: "L",
      color: BLUE_BANK,
      index: 0,
      side: "top",
    });
    this.row.setCursor("R", {
      label: "R",
      color: ORANGE_BANK,
      index: 0,
      side: "bottom",
    });

    if (this.isFeelItRound()) {
      this.mountFeelItPanels();
    } else {
      this.mountUseItPanels();
      // Coming from FEEL_IT into USE_IT — fade Glitch out of focus instead of
      // destroying. Keeps the substring-check contrast visible.
      this.bruteForce?.fadeTo(0.32);
    }

    this.refreshDisplay();
  }

  private refreshDisplay(): void {
    const stage = this.roundIndex + 1;
    const total = CURRENT_RIDER_ROUNDS.length;
    this.statusText.setText(
      `CURRENT ${stage}/${total}   -   find the longest run with no repeats`,
    );

    this.row.setWindow(this.leftIndex, this.rightIndex, COLORS.CYAN_GLOW);
    const hasDup = this.row.markDuplicatesInWindow(
      this.leftIndex,
      this.rightIndex,
    );
    if (!hasDup) {
      const len = this.rightIndex - this.leftIndex + 1;
      if (len > this.bestLength) this.bestLength = len;
    }

    const length = this.rightIndex - this.leftIndex + 1;
    this.metricsText.setText(
      `LENGTH = ${length}${hasDup ? "  REPEAT!" : ""}   -   BEST = ${this.bestLength}`,
    );
    this.metricsText.setColor(hasDup ? "#ef4444" : "#fbbf24");
  }

  private extendRight(): void {
    if (this.actionLocked) return;
    if (this.rightIndex + 1 >= this.round.letters.length) return;
    if (this.row.markDuplicatesInWindow(this.leftIndex, this.rightIndex)) {
      this.mistakes++;
      JuiceSystem.cameraShake(this, 80, 0.002);
      audioManager.playWrongTone();
      this.showMessage(
        "Shrink left before extending a window with repeats.",
        COLORS.WARNING,
      );
      return;
    }
    this.rightIndex++;
    this.row.moveCursor("R", this.rightIndex);
    audioManager.playTone(540, 50, "sine");
    this.refreshDisplay();
  }

  private shrinkLeft(): void {
    if (this.actionLocked) return;
    if (this.leftIndex + 1 > this.rightIndex) return;
    this.leftIndex++;
    this.row.moveCursor("L", this.leftIndex);
    audioManager.playTone(420, 50, "sine");
    this.refreshDisplay();
  }

  private trySubmit(): void {
    if (this.actionLocked) return;
    if (this.bestLength !== this.optimal) {
      this.mistakes++;
      JuiceSystem.cameraShake(this, 80, 0.002);
      audioManager.playWrongTone();
      this.showMessage(
        `Best so far is ${this.bestLength}. Keep exploring.`,
        COLORS.WARNING,
      );
      return;
    }

    this.actionLocked = true;
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(
      this,
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
    );

    // FEEL_IT completion → fire the Current Rider's NAME_IT beat once before
    // round 2 starts. Freezing Glitch's substring-checks counter lands the
    // "you let the river tell you" contrast.
    this.time.delayedCall(900, async () => {
      this.actionLocked = false;
      if (this.roundIndex + 1 >= CURRENT_RIDER_ROUNDS.length) {
        this.completePuzzle();
        return;
      }
      const finishedRound = CURRENT_RIDER_ROUNDS[this.roundIndex];
      if (
        finishedRound?.lesson?.phase === PuzzlePhase.FEEL_IT &&
        finishedRound.lesson.nameItBeat &&
        !this.namedYet
      ) {
        this.namedYet = true;
        this.bruteForce?.freeze();
        await this.showNameItBeat(finishedRound.lesson.nameItBeat);
      }
      void this.beginRound(this.roundIndex + 1);
    });
  }

  private performCurrentRiderBoardStep(): void {
    if (this.actionLocked) return;
    if (this.row.markDuplicatesInWindow(this.leftIndex, this.rightIndex)) {
      this.shrinkLeft();
    } else if (this.rightIndex + 1 < this.round.letters.length) {
      this.extendRight();
    } else {
      this.trySubmit();
    }
  }

  private completePuzzle(): void {
    // Tightened scoring: 3 stars requires a flawless run.
    const stars =
      this.mistakes === 0 && this.hintsUsed === 0
        ? 3
        : this.mistakes <= 1 && this.hintsUsed <= 1
          ? 2
          : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    // FEEL_IT hints stay diegetic — no "window", "L/R", "unique" as technique
    // vocab; use net/catch framing.
    const hints = this.isFeelItRound()
      ? [
          "Push the right stake further while the catch is good.",
          "When you catch something twice, pull the left stake in until the catch is clear again.",
          `For this river the best catch is ${this.optimal} wide. Keep adjusting the net.`,
        ]
      : [
          "Extend right whenever the window is still unique. Shrink left only when you spot a duplicate.",
          "BEST tracks the longest unique window you have ever held. It only goes up.",
          `For this river the optimal length is ${this.optimal}. Walk the cursors to find it.`,
        ];
    this.showMessage(hints[hintNumber - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }
}

// ============================================================================
// Boss_MirrorSerpent - three phases: reverse, two-sum, fixed window
// ============================================================================

type SerpentPhase = "reverse" | "twoSum" | "fixedWindow" | "won";

export class Boss_MirrorSerpent extends BasePuzzleScene {
  private phase: SerpentPhase = "reverse";
  private mistakes = 0;
  private row!: RiverRow;
  private statusText!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private serpentBanner!: Phaser.GameObjects.Text;
  private actionLocked = false;
  private reverseCompleting = false;

  // Reverse phase state
  private reverseValues: number[] = [];
  private reverseTarget: number[] = [];
  private reverseLeft = 0;
  private reverseRight = 0;

  // Two-sum phase state
  private twoSumLeft = 0;
  private twoSumRight = 0;

  // Fixed-window phase state
  private windowStart = 0;
  private windowOptimalSum = 0;
  private windowOptimalStart = 0;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_MIRROR_SERPENT });
    this.puzzleId = "boss_mirror_serpent";
    this.puzzleName = "Mirror Serpent";
    this.puzzleDescription =
      "Three currents. One serpent. Reverse, pair, slide.";
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_ACTION_ARENA_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0.03;
  }
  protected getConceptName(): string {
    return "Two-Pointer Mastery";
  }
  // Pairs with the entry banner to maintain "this is the boss" for the
  // whole encounter, not just the 2.6s reveal.
  protected getModuleLabel(): string {
    return "BOSS  •  RIVERSIDE";
  }

  // Preload the coiled-serpent figure (Phase 16). BasePuzzleScene only
  // loads the puzzle backdrop + chamber frame; without this override the
  // figure renders as a missing-texture and the audit's "make the serpent
  // visible" fix silently fails.
  preload(): void {
    super.preload();
    const key = VISUAL_REVAMP_KEYS.BOSS_MIRROR_SERPENT_FIGURE;
    const path = getImageAssetPath(key);
    if (path && !this.textures.exists(key)) {
      this.load.image(key, path);
    }
    preloadRiverRowProps(this);
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, "river", { intensity: 1.1 });
    const { width, height } = this.cameras.main;
    this.instructionText.setVisible(false);

    // Boss entry banner — teal accent matches the river/water palette and
    // the Mirror Walker's mirrored-shore visual register. Fires immediately;
    // the Serpent's 3-phase mechanic (reverse → twoSum → fixedWindow) mounts
    // underneath and is ready by the time the banner clears.
    playBossEntryBanner(this, {
      bossName: "Mirror Serpent",
      regionTag: "Twin Rivers finale",
      thesis: "The river bends three ways. Read it all at once.",
      accentColor: 0x22d3ee,
      onComplete: () => {},
    });

    // Visible boss figure (Phase 16) — coiled serpent body looms above the
    // play area. The 3-segment S-curve mirrors the boss's own 3-phase
    // structure (reverse → twoSum → fixedWindow). Slow vertical hover +
    // very-slow horizontal drift simulates the serpent breathing.
    const serpentFigure = this.add
      .image(width / 2, 128, VISUAL_REVAMP_KEYS.BOSS_MIRROR_SERPENT_FIGURE)
      .setOrigin(0.5, 0.5)
      .setScale(0.5)
      .setAlpha(0.72)
      .setDepth(4)
      .setScrollFactor(0);
    this.tweens.add({
      targets: serpentFigure,
      y: 120,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: serpentFigure,
      x: width / 2 + 14,
      duration: 5400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.serpentBanner = this.add
      .text(width / 2, 160, "", {
        fontSize: "13px",
        fontFamily: FONTS.RETRO,
        color: "#e0f8d0",
        backgroundColor: "#081820",
        padding: { x: 10, y: 6 },
        stroke: "#06b6d4",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(21);

    this.statusText = this.createStatusReadout(width / 2, 190, {
      fontSize: 11,
    });

    this.detailText = this.add
      .text(width / 2, 224, "", {
        fontSize: "11px",
        fontFamily: FONTS.RETRO,
        color: "#fbbf24",
        stroke: "#081820",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(20);

    mountTransientLegend(this, height - 76, this.controlsHelpText());

    this.input.keyboard?.on("keydown-SPACE", () => this.handleSpace());
    this.input.keyboard?.on("keydown-ENTER", () => this.handleSpace());
    this.input.keyboard?.on("keydown-A", () => this.handleA());
    this.input.keyboard?.on("keydown-D", () => this.handleD());
    this.input.keyboard?.on("keydown-J", () => this.handleJ());
    this.input.keyboard?.on("keydown-L", () => this.handleL());
    this.input.keyboard?.on("keydown-LEFT", () => this.handleA());
    this.input.keyboard?.on("keydown-RIGHT", () => this.handleD());
    new GamepadActionBridge(this, {
      left: () => this.handleA(),
      right: () => this.handleD(),
      up: () => this.handleJ(),
      down: () => this.handleL(),
      secondaryLeft: () => this.handleJ(),
      secondaryRight: () => this.handleL(),
      action: () => this.handleSpace(),
    });

    this.startReversePhase();
  }

  private controlsHelpText(): string {
    return "SPACE/ENTER act   A/D move L   J/L move R   arrows slide";
  }

  // ---- Phase 1: reverse ----

  private startReversePhase(): void {
    this.phase = "reverse";
    this.actionLocked = false;
    this.reverseCompleting = false;
    this.reverseValues = [...MIRROR_SERPENT_PHASES.reverse.values];
    this.reverseTarget = reversedTarget(MIRROR_SERPENT_PHASES.reverse.values);
    this.reverseLeft = 0;
    this.reverseRight = this.reverseValues.length - 1;

    this.serpentBanner.setText("PHASE I  -  REVERSE");
    this.statusText.setText("Run the river backward.");
    this.detailText.setText("swap the ends, then converge");
    this.cycleRow(this.reverseValues);
    this.row.setCursor("L", {
      label: "L",
      color: BLUE_BANK,
      index: 0,
      side: "top",
    });
    this.row.setCursor("R", {
      label: "R",
      color: ORANGE_BANK,
      index: this.reverseRight,
      side: "top",
    });
  }

  // ---- Phase 2: two-sum ----

  private startTwoSumPhase(): void {
    this.phase = "twoSum";
    this.actionLocked = false;
    this.reverseCompleting = false;
    this.twoSumLeft = 0;
    this.twoSumRight = MIRROR_SERPENT_PHASES.twoSum.values.length - 1;

    this.serpentBanner.setText("PHASE II  -  PAIR");
    this.statusText.setText(
      `Find a pair that sums to ${MIRROR_SERPENT_PHASES.twoSum.target}.`,
    );
    this.cycleRow(MIRROR_SERPENT_PHASES.twoSum.values);
    this.row.setCursor("L", {
      label: "L",
      color: BLUE_BANK,
      index: 0,
      side: "top",
    });
    this.row.setCursor("R", {
      label: "R",
      color: ORANGE_BANK,
      index: this.twoSumRight,
      side: "top",
    });
    this.refreshTwoSumDetail();
  }

  // ---- Phase 3: fixed window ----

  private startFixedWindowPhase(): void {
    this.phase = "fixedWindow";
    const round = MIRROR_SERPENT_PHASES.fixedWindow;
    this.windowStart = 0;
    this.windowOptimalStart = bestFixedWindowStart(
      round.values,
      round.windowSize,
    );
    this.windowOptimalSum = windowSumAt(
      round.values,
      this.windowOptimalStart,
      round.windowSize,
    );

    this.serpentBanner.setText("PHASE III  -  WINDOW");
    this.statusText.setText(
      `Lock the window of size ${round.windowSize} on its heaviest catch.`,
    );
    this.cycleRow(round.values);
    this.refreshFixedWindowDetail();
  }

  private cycleRow(values: ReadonlyArray<string | number>): void {
    if (this.row) {
      this.cameras.main.flash(220, 6, 182, 212);
      this.row.destroy();
    }
    this.row = new RiverRow(this, {
      values,
      centerX: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2 + 64,
      tileSize: 50,
      gap: 8,
      onTilePress: (index) => this.handleSerpentRowPress(index),
    });
  }

  // ---- Inputs ----

  private handleSerpentRowPress(index: number): void {
    if (this.actionLocked) return;

    if (this.phase === "reverse") {
      void this.reverseStep();
      return;
    }

    if (this.phase === "twoSum") {
      const directive = pointerDirective(
        this.currentTwoSum(),
        MIRROR_SERPENT_PHASES.twoSum.target,
      );
      if (directive === "lock") this.tryLockTwoSum();
      else if (directive === "advance_left") this.advanceTwoSumLeft(1);
      else this.retreatTwoSumRight(-1);
      return;
    }

    if (this.phase === "fixedWindow") {
      const round = MIRROR_SERPENT_PHASES.fixedWindow;
      const left = this.windowStart;
      const right = left + round.windowSize - 1;
      if (index < left) this.slideWindow(-1);
      else if (index > right) this.slideWindow(1);
      else this.tryLockFixedWindow();
    }
  }

  private handleSpace(): void {
    if (this.actionLocked) return;
    if (this.phase === "reverse") void this.reverseStep();
    else if (this.phase === "twoSum") this.tryLockTwoSum();
    else if (this.phase === "fixedWindow") this.tryLockFixedWindow();
  }

  private handleA(): void {
    if (this.actionLocked) return;
    if (this.phase === "twoSum") this.advanceTwoSumLeft(-1);
    else if (this.phase === "fixedWindow") this.slideWindow(-1);
  }

  private handleD(): void {
    if (this.actionLocked) return;
    if (this.phase === "fixedWindow") this.slideWindow(1);
    else if (this.phase === "twoSum") this.advanceTwoSumLeft(1);
  }

  private handleJ(): void {
    if (this.actionLocked) return;
    if (this.phase === "twoSum") this.retreatTwoSumRight(-1);
  }

  private handleL(): void {
    if (this.actionLocked) return;
    if (this.phase === "twoSum") this.retreatTwoSumRight(1);
  }

  // ---- Reverse phase logic ----

  private async reverseStep(): Promise<void> {
    if (this.actionLocked || this.reverseCompleting) return;
    if (this.reverseLeft >= this.reverseRight) {
      this.completeReversePhase();
      return;
    }
    this.actionLocked = true;
    audioManager.playTone(440, 90, "sine");
    await this.row.animateSwap(this.reverseLeft, this.reverseRight);
    [
      this.reverseValues[this.reverseLeft],
      this.reverseValues[this.reverseRight],
    ] = [
      this.reverseValues[this.reverseRight],
      this.reverseValues[this.reverseLeft],
    ];
    this.reverseLeft++;
    this.reverseRight--;
    this.row.moveCursor("L", this.reverseLeft);
    this.row.moveCursor("R", this.reverseRight);
    this.time.delayedCall(160, () => {
      if (this.reverseLeft >= this.reverseRight) {
        this.completeReversePhase();
        return;
      }
      this.actionLocked = false;
    });
  }

  private completeReversePhase(): void {
    if (this.reverseCompleting || this.phase !== "reverse") return;
    if (!arrayEquals(this.reverseValues, this.reverseTarget)) return;
    this.reverseCompleting = true;
    this.actionLocked = true;
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(
      this,
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 64,
    );
    // Phase transition — the Serpent shifts from reversal to pair-finding.
    // Teal accent foreshadows the converging-pointers UI from the Bridge.
    playBossPhaseTransition(this, {
      phaseNumber: "II",
      phaseName: "PAIR THE SHORES",
      patternHint: "Two stones, one target weight. Walk inward.",
      accentColor: 0x22d3ee,
      onComplete: () => this.startTwoSumPhase(),
    });
  }

  // ---- Two-sum phase logic ----

  private currentTwoSum(): number {
    const v = MIRROR_SERPENT_PHASES.twoSum.values;
    return v[this.twoSumLeft] + v[this.twoSumRight];
  }

  private refreshTwoSumDetail(): void {
    const v = MIRROR_SERPENT_PHASES.twoSum.values;
    const sum = this.currentTwoSum();
    const target = MIRROR_SERPENT_PHASES.twoSum.target;
    const sign = sum === target ? "=" : sum < target ? "<" : ">";
    this.detailText.setText(
      `${v[this.twoSumLeft]} + ${v[this.twoSumRight]} = ${sum}  ${sign}  ${target}`,
    );
    this.detailText.setColor(sum === target ? "#88c070" : "#fbbf24");
  }

  private advanceTwoSumLeft(direction: -1 | 1): void {
    const directive = pointerDirective(
      this.currentTwoSum(),
      MIRROR_SERPENT_PHASES.twoSum.target,
    );
    if (direction !== 1 || directive !== "advance_left") {
      this.flashWrong("The sum forces a different move.");
      return;
    }
    if (this.twoSumLeft + 1 >= this.twoSumRight) return;
    this.twoSumLeft++;
    this.row.moveCursor("L", this.twoSumLeft);
    audioManager.playTone(420, 50, "sine");
    this.refreshTwoSumDetail();
  }

  private retreatTwoSumRight(direction: -1 | 1): void {
    const directive = pointerDirective(
      this.currentTwoSum(),
      MIRROR_SERPENT_PHASES.twoSum.target,
    );
    if (direction !== -1 || directive !== "retreat_right") {
      this.flashWrong("The sum forces a different move.");
      return;
    }
    if (this.twoSumRight - 1 <= this.twoSumLeft) return;
    this.twoSumRight--;
    this.row.moveCursor("R", this.twoSumRight);
    audioManager.playTone(360, 50, "sine");
    this.refreshTwoSumDetail();
  }

  private tryLockTwoSum(): void {
    if (this.currentTwoSum() !== MIRROR_SERPENT_PHASES.twoSum.target) {
      this.flashWrong("The pair does not sum to the target.");
      return;
    }
    this.actionLocked = true;
    audioManager.playCorrectTone();
    this.row.pulseTile(this.twoSumLeft, COLORS.SUCCESS);
    this.row.pulseTile(this.twoSumRight, COLORS.SUCCESS);
    JuiceSystem.correctBurst(
      this,
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 64,
    );
    // Final phase shift — the sliding-window mechanic. Pale-gold accent
    // matches the "sun on water" shimmer used in the Window Fisher puzzle.
    playBossPhaseTransition(this, {
      phaseNumber: "III",
      phaseName: "RIDE THE CURRENT",
      patternHint: "Slide the window. Heaviest catch wins.",
      accentColor: 0xeaf6ff,
      onComplete: () => {
        this.actionLocked = false;
        this.startFixedWindowPhase();
      },
    });
  }

  // ---- Fixed-window phase logic ----

  private refreshFixedWindowDetail(): void {
    const round = MIRROR_SERPENT_PHASES.fixedWindow;
    const left = this.windowStart;
    const right = left + round.windowSize - 1;
    this.row.setWindow(left, right, GOLD);
    const sum = windowSumAt(round.values, left, round.windowSize);
    this.detailText.setText(
      `SUM = ${sum}   -   TARGET = ${this.windowOptimalSum} (heaviest)`,
    );
    this.detailText.setColor(
      sum === this.windowOptimalSum ? "#88c070" : "#fbbf24",
    );
  }

  private slideWindow(direction: -1 | 1): void {
    const round = MIRROR_SERPENT_PHASES.fixedWindow;
    const next = this.windowStart + direction;
    if (next < 0 || next + round.windowSize > round.values.length) return;
    this.windowStart = next;
    audioManager.playTone(direction === 1 ? 540 : 420, 50, "sine");
    this.refreshFixedWindowDetail();
  }

  private tryLockFixedWindow(): void {
    const round = MIRROR_SERPENT_PHASES.fixedWindow;
    const sum = windowSumAt(round.values, this.windowStart, round.windowSize);
    if (sum !== this.windowOptimalSum) {
      this.flashWrong("Not the heaviest catch yet.");
      return;
    }
    this.actionLocked = true;
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(
      this,
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 64,
    );
    for (
      let i = this.windowStart;
      i < this.windowStart + round.windowSize;
      i++
    ) {
      this.row.pulseTile(i, COLORS.SUCCESS);
    }
    this.time.delayedCall(1100, () => {
      this.phase = "won";
      this.completeBoss();
    });
  }

  private flashWrong(message: string): void {
    this.mistakes++;
    JuiceSystem.cameraShake(this, 100, 0.0028);
    audioManager.playWrongTone();
    this.showMessage(message, COLORS.WARNING);
  }

  private completeBoss(): void {
    const stars = this.mistakes <= 1 ? 3 : this.mistakes <= 4 ? 2 : 1;
    this.cameras.main.flash(420, 224, 248, 208);
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    if (this.phase === "reverse") {
      this.showMessage(
        "Press SPACE to swap-and-step. Run the river backward.",
        COLORS.GOLD_ACCENT,
      );
      return;
    }
    if (this.phase === "twoSum") {
      const sum = this.currentTwoSum();
      const target = MIRROR_SERPENT_PHASES.twoSum.target;
      const tip =
        sum < target
          ? "Sum too small - press D."
          : sum > target
            ? "Sum too big - press J."
            : "On target. Press ENTER.";
      this.showMessage(`Hint ${hintNumber}: ${tip}`, COLORS.GOLD_ACCENT);
      return;
    }
    if (this.phase === "fixedWindow") {
      this.showMessage(
        `Hint ${hintNumber}: lock at index ${this.windowOptimalStart}.`,
        COLORS.GOLD_ACCENT,
      );
    }
  }
}

/** Pair count helper — n(n-1)/2, the brute-force cost for "check every pair". */
function pairCount(n: number): number {
  return Math.max(1, (n * (n - 1)) / 2);
}

/**
 * Fixed-window brute-force cost: recompute the window sum from scratch at
 * every starting position. (n - k + 1) windows × k additions each.
 * The sliding-window algorithm is (n - k + 1) operations — that's the
 * comparison.
 */
function bruteWindowCost(n: number, k: number): number {
  const windows = Math.max(1, n - k + 1);
  return windows * k;
}


// ──────────────────────────────────────────────────────────────────────────
// Brute-force strategy — fed to BruteForceActor during TR-2 FEEL_IT round 1.
//
// Pointer Bridge's brute-force foil is "check every (i, j) pair at random",
// the n(n−1)/2 alternative to the two-pointer walk. Degenerate-row mode:
// no tile row, just a ticking pair-check counter that never converges to a
// matching pair (Glitch ignores the sortedness).
// ──────────────────────────────────────────────────────────────────────────

function makeSortedPairsBruteStrategy(): BruteForceStrategy {
  return {
    initialValues: [],
    nextMove: (vals) => vals,
    isSolved: () => false,
    tickIntervalMs: 800,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Brute-force strategy — fed to BruteForceActor during TR-3 FEEL_IT round 1.
//
// Fixed Window's brute-force foil is "recompute the window sum from scratch
// on every slide" — k additions per window, n-k+1 windows = O(n·k). The
// sliding alternative pays one add + one subtract per slide, O(n). Glitch
// ticks the rescan counter (degenerate-row mode — no tile row, just a
// counter that mounts visibly faster than the player's slide count).
// ──────────────────────────────────────────────────────────────────────────

function makeWindowSlideBruteStrategy(): BruteForceStrategy {
  return {
    initialValues: [],
    nextMove: (vals) => vals,
    isSolved: () => false,
    tickIntervalMs: 800,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Brute-force strategy — fed to BruteForceActor during TR-4 FEEL_IT round 1.
//
// Current Rider's brute-force foil is "check every single substring from
// scratch" — O(n³) for longest-unique. Glitch ticks the substring-checks
// counter (degenerate-row mode — no row, just the mounting cost).
// ──────────────────────────────────────────────────────────────────────────

function makeVariableWindowBruteStrategy(): BruteForceStrategy {
  return {
    initialValues: [],
    nextMove: (vals) => vals,
    isSolved: () => false,
    tickIntervalMs: 800,
  };
}
