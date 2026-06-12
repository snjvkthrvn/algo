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
import {
  MIRROR_SERPENT_PHASES,
  reversedTarget,
  arrayEquals,
  pointerDirective,
  windowSumAt,
  bestFixedWindowStart,
} from "../../data/puzzles/twinRiversPuzzleLogic";
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

// P2_2 extracted to its own chamber-room file; re-exported here so
// gameConfig and tests keep importing from this barrel.
export { P2_2_PointerBridge } from "./P2_2_PointerBridge";

// P2_3 extracted to its own chamber-room file; re-exported here so
// gameConfig and tests keep importing from this barrel.
export { P2_3_FixedWindowDock } from "./P2_3_FixedWindowDock";

// P2_4 extracted to its own chamber-room file; re-exported here so
// gameConfig and tests keep importing from this barrel.
export { P2_4_CurrentRider } from "./P2_4_CurrentRider";

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


// ──────────────────────────────────────────────────────────────────────────
// Brute-force strategy — fed to BruteForceActor during TR-4 FEEL_IT round 1.
//
// Current Rider's brute-force foil is "check every single substring from
// scratch" — O(n³) for longest-unique. Glitch ticks the substring-checks
// counter (degenerate-row mode — no row, just the mounting cost).
