import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TWO_SUM_ROUND_CONFIGS } from "../data/puzzles/arrayPlainsPuzzleLogic";

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function numberConst(source: string, name: string): number {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\d+)`));
  if (!match) throw new Error(`Missing numeric const ${name}`);
  return Number(match[1]);
}

describe("first three regions quality guards", () => {
  it("keeps title menu rows below the journey strip label", () => {
    const source = readSource("src/scenes/MenuScene.ts");
    const menuStartY = numberConst(source, "MENU_START_Y");
    const stripY = numberConst(source, "JOURNEY_STRIP_Y");

    expect(menuStartY).toBeGreaterThanOrEqual(stripY + 44);
  });

  it("cleans up Watcher state on Prologue shutdown so Bit cannot stay scared", () => {
    const source = readSource("src/scenes/prologue/PrologueScene.ts");
    const shutdownBody =
      source.match(/shutdown\(\): void \{(?<body>[\s\S]*?)\n  \}/)?.groups
        ?.body ?? "";

    expect(shutdownBody).toContain("cleanupActiveWatcherFlyby");
    expect(shutdownBody).toContain("gameState.setBitMood(BitMood.NEUTRAL)");
    expect(shutdownBody).toContain("this.player?.unfreeze()");
  });

  it("locks Grain Chamber input while crates animate or the row resolves", () => {
    const source = readSource("src/scenes/puzzles/P1_1_BubbleSort.ts");

    // The trade handler must bail while the lane is mid-animation or the
    // bloom/delivery sequence is resolving — same double-input guard the
    // old actionLocked flag provided, now owned by the lane + scene state.
    expect(source).toContain(
      "if (this.lane.isAnimating || this.resolvingRow) return;",
    );
    expect(source).toContain("this.resolvingRow = true;");
    expect(source).toContain("this.resolvingRow = false;");
  });

  it("Grain Chamber teaches efficiency through cost, not refusal", () => {
    const source = readSource("src/scenes/puzzles/P1_1_BubbleSort.ts");

    // Move economy (spec pillar 2-3): every trade is allowed and recorded;
    // wasteful trades cost grain instead of being blocked with a message.
    expect(source).toContain("this.ledger = recordTrade(this.ledger);");
    expect(source).toContain("this.fx.spill(");
    expect(source).not.toMatch(/Already in order/);

    // Lecture chrome stays out of the room (spec "What gets deleted").
    expect(source).not.toMatch(
      /showLessonCard|showRoundRecap|showRoundBanner/,
    );
    expect(source).not.toMatch(/ComplexityMeter|BruteForceActor/);

    // The golden arrow may only mount inside displayHint (player-summoned).
    const hintMounts = source.split("new NextMoveHint").length - 1;
    expect(hintMounts).toBe(1);
    const displayHintIndex = source.indexOf("protected displayHint");
    expect(source.indexOf("new NextMoveHint")).toBeGreaterThan(
      displayHintIndex,
    );
  });

  it("Basket Cellar teaches indexing through cost, not refusal", () => {
    const source = readSource("src/scenes/puzzles/P1_2_BasketIndexing.ts");

    // Every opening is allowed and recorded; wrong baskets tumble mess
    // instead of being blocked (chamber economy, spec pillar 2-3).
    expect(source).toContain("this.ledger = recordTrade(this.ledger);");
    expect(source).toContain("openBasket(index, correct)");

    // Lecture chrome stays out of the room.
    expect(source).not.toMatch(
      /showLessonCard|showRoundRecap|showRoundBanner/,
    );
    expect(source).not.toMatch(/BruteForceScanner|secondsPerRequest/);
    // The cellar has no auto-aim arrow at all.
    expect(source).not.toMatch(/NextMoveHint/);
    // Orders speak plain words, never "index N".
    expect(source).toContain("ordinalWords(order.index)");
  });

  it("Sorting Mill teaches hashing through cost, not refusal or pressure", () => {
    const source = readSource("src/scenes/puzzles/P1_3_HashHopper.ts");

    // Every toss is allowed and recorded; wrong bins spit back and bruise
    // instead of blocking (chamber economy).
    expect(source).toContain("this.ledger = recordTrade(this.ledger);");
    expect(source).toContain("toss(index, correct, arrival.crop");

    // No falling-crop pressure, no lecture chrome, no formulas on screen.
    expect(source).not.toMatch(/fallMs|spawnGapMs/);
    expect(source).not.toMatch(
      /showLessonCard|showRoundRecap|showRoundBanner/,
    );
    expect(source).not.toMatch(/BruteForceActor|NextMoveHint/);
    expect(source).not.toMatch(/% bucket|key %/);
  });

  it("Pairing Grounds teaches the complement through cost, not labels", () => {
    const source = readSource("src/scenes/puzzles/P1_4_TwoSum.ts");

    // Every offer is allowed and recorded; false pairs crack chips and the
    // anchor survives (chamber economy). Input locks during resolution.
    expect(source).toContain("this.ledger = recordTrade(this.ledger);");
    expect(source).toContain("if (this.resolving) return;");
    expect(source).toContain("this.field.crackChip(");

    // The complement is computed in the player's head, never printed.
    expect(source).not.toMatch(/Need:/);
    // No lecture chrome, no panels, no soft timer, no auto-aim.
    expect(source).not.toMatch(
      /showLessonCard|showRoundRecap|showRoundBanner/,
    );
    expect(source).not.toMatch(/ComplexityMeter|GlitchCorner|drawPanel/);
    expect(source).not.toMatch(/NextMoveHint/);
    expect(source).not.toMatch(/\bseconds\b/);
  });

  it("Prologue rune walk teaches through cost, not chrome", () => {
    const source = readSource("src/arcadePrologue/puzzles/P0_1/scene.ts");

    // Chamber economy: every hop is recorded; wrong hops crack the floor
    // instead of costing points, and the player walks out to complete.
    expect(source).toContain("recordTrade(this.ledger)");
    expect(source).toContain("crackAt(");
    expect(source).toContain("walkOut");
    expect(source).toContain("starsForTrades");

    // Arcade/lecture chrome stays out of the room.
    expect(source).not.toMatch(
      /buildPrologueHud|createSequencePanel|scorePopup|comboMilestone/,
    );
    expect(source).not.toMatch(
      /GAME\.addScore|GAME\.losePoints|GAME\.bumpCombo/,
    );
  });

  it("Prologue flow consoles teach through cost, not chrome", () => {
    const source = readSource("src/arcadePrologue/puzzles/P0_2/scene.ts");

    expect(source).toContain("recordTrade(this.ledger)");
    expect(source).toContain("scorchAt(");
    expect(source).toContain("launchHomewardPulse");
    expect(source).toContain("starsForTrades");

    expect(source).not.toMatch(
      /buildHud|GlitchCorner|scorePopup|comboMilestone/,
    );
    expect(source).not.toMatch(/The pulse slipped by/);
    expect(source).not.toMatch(
      /GAME\.addScore|GAME\.losePoints|GAME\.bumpCombo/,
    );
  });

  it("Boss Sentinel keeps urgency but loses the lecture", () => {
    const source = readSource("src/arcadePrologue/puzzles/P0_F/scene.ts");
    const rounds = readSource("src/arcadePrologue/puzzles/P0_F/rounds.ts");

    // Bosses own urgency: the litany clock stays; arcade chrome does not.
    expect(source).toContain("GAME.startRound(LITANY_TIMER_MS)");
    expect(source).toContain("recordTrade(this.ledger)");
    expect(source).toContain("launchHomewardPulse");
    expect(source).not.toMatch(
      /buildHud|scorePopup|comboMilestone|intro\.show|loseLife/,
    );

    // The thesis speaks stakes, never lecture (VISION §3).
    expect(source).not.toMatch(/Sequence and selection/);
    expect(rounds).not.toMatch(/Sequence and selection/);
  });

  it("Echo Causeway trial teaches through cost, not chrome", () => {
    const source = readSource(
      "src/scenes/prologueTrial/PrologueTrialScene.ts",
    );

    // The gym pattern: generated tileset baked once, pure plan logic.
    expect(source).toContain("batchDrawFrame");
    expect(source).toContain("pickTrialTile");
    // Chamber economy: steps graded purely, stars from par, walk-out exit.
    expect(source).toContain("gradeStep");
    expect(source).toContain("starsForTrades");
    expect(source).toContain("completeAlgorithmiaPuzzle");
    expect(source).not.toMatch(
      /buildHud|buildPrologueHud|scorePopup|comboMilestone|GlitchCorner/,
    );
  });

  it("keeps Two Sum rounds fully reachable by number-key controls", () => {
    for (const round of TWO_SUM_ROUND_CONFIGS) {
      expect(round.values.length).toBeLessThanOrEqual(9);
    }
  });

  it("keeps row-based first-three puzzles directly playable from the board", () => {
    const riverRow = readSource("src/ui/RiverRow.ts");
    const twinRivers = readSource(
      "src/scenes/puzzles/TwinRiversChoiceScenes.ts",
    );
    const shuffler = readSource("src/scenes/puzzles/Boss_Shuffler.ts");

    expect(riverRow).toContain("onTilePress?:");
    // Quote-style agnostic: the formatter hook may flip this file between
    // single and double quotes.
    expect(riverRow).toMatch(
      /box\.setData\(['"]puzzleCursorIgnore['"], true\)/,
    );
    expect(riverRow).toContain("emitTilePressPulse");
    expect(riverRow).toContain("emitPuzzleActionPulse");

    // P2_1 extracted to its chamber-room file (Mirror Crossing); the barrel
    // keeps re-exporting it. The remaining choice scenes still own their
    // board-step handlers until their own chamber rollouts land.
    expect(twinRivers).toContain(
      'export { P2_1_MirrorWalk } from "./P2_1_MirrorWalk";',
    );
    expect(twinRivers).toContain(
      'export { P2_2_PointerBridge } from "./P2_2_PointerBridge";',
    );
    expect(twinRivers).toContain(
      'export { P2_3_FixedWindowDock } from "./P2_3_FixedWindowDock";',
    );
    expect(twinRivers).toContain(
      'export { P2_4_CurrentRider } from "./P2_4_CurrentRider";',
    );
    expect(twinRivers).toContain(
      'export { Boss_MirrorSerpent } from "./Boss_MirrorSerpent";',
    );

    // Threshing Floor rebuild: the boss is played with the same embodied
    // verbs as the rooms (walk + act via PuzzleRoom), not a tile cursor.
    expect(shuffler).toContain("new PuzzleRoom(this");
    expect(shuffler).toContain("private actBubble");
    expect(shuffler).toContain("private actHash");
    expect(shuffler).toContain("private actPair");
    expect(shuffler).toContain("this.room.player.walkTo");
  });

  it("Mirror Serpent reprises the three river verbs with honest par", () => {
    const source = readSource("src/scenes/puzzles/Boss_MirrorSerpent.ts");

    // Embodied like the rooms: PuzzleRoom walk + act, one ledger, walk-out.
    expect(source).toContain("new PuzzleRoom(this");
    expect(source).toContain("this.ledger = recordTrade(this.ledger);");
    expect(source).toContain("this.room.player.walkTo");
    expect(source).toContain("private checkDoorExit");

    // The finale reuses the rooms' own kits — never a fresh mechanic.
    expect(source).toContain("CrateRack");
    expect(source).toContain("PostLine");
    expect(source).toContain("BasketRow");

    // Telegraphed sabotage, scored honestly: each kind raises par 1:1.
    expect(source).toContain("this.serpent.windUp");
    expect(source).toContain("serpentPar(this.untrades, this.pushes, this.swaps)");

    // The triple-tell chrome and the tile-cursor row are gone for good.
    expect(source).not.toMatch(/serpentBanner|statusText|detailText/);
    expect(source).not.toMatch(/RiverRow|NextMoveHint/);
  });

  it("Rope Bridge reads through the rope, not arithmetic text", () => {
    const source = readSource("src/scenes/puzzles/P2_2_PointerBridge.ts");

    // Every step and lock is recorded; dead ends snap back instead of
    // failing; wrong locks splash (chamber economy).
    expect(source).toContain("this.ledger = recordTrade(this.ledger);");
    expect(source).toContain("this.line.snapBack()");
    expect(source).toContain("this.line.failLock();");

    // The sum lives in the rope's sag — the old sumText arithmetic readout
    // and target status line must never come back. (Matched on the exact
    // template-literal forms the old scene rendered, so prose comments
    // about arithmetic don't trip the gate.)
    expect(source).not.toMatch(/sumText|setText\(\s*`.*\$\{sum\}/);
    expect(source).not.toMatch(/`BRIDGE \$\{|target = \$\{/);
    expect(source).not.toMatch(
      /showLessonCard|showRoundRecap|showRoundBanner/,
    );
    expect(source).not.toMatch(/NextMoveHint|RiverRow/);
  });

  it("Fishing Dock shows the edges, never the running sums", () => {
    const source = readSource("src/scenes/puzzles/P2_3_FixedWindowDock.ts");

    // Slides record only on real frame movement; hauls record always;
    // wrong hauls tear and splash (cost, not refusal).
    expect(source).toContain("this.ledger = recordTrade(this.ledger);");
    expect(source).toContain("frameStartAtX(playerX, this.row.geometry())");
    expect(source).toContain("pulseEnter(");
    expect(source).toContain("dimLeave(");

    // The old SUM/BEST/window-size readouts must never come back.
    expect(source).not.toMatch(/SUM = |BEST = |window size = /);
    expect(source).not.toMatch(
      /showLessonCard|showRoundRecap|showRoundBanner/,
    );
    expect(source).not.toMatch(/NextMoveHint|RiverRow|ComplexityMeter/);
  });

  it("Current Run snags visibly instead of printing metrics", () => {
    const source = readSource("src/scenes/puzzles/P2_4_CurrentRider.ts");

    // Edge rides + tie releases + claims all record; snags render through
    // firstSnag, never as text metrics.
    expect(source).toContain("this.ledger = recordTrade(this.ledger);");
    expect(source).toContain("firstSnag(letters, this.leftTie, this.rightEdge)");
    expect(source).toContain("rightEdgeAtX(playerX, this.run.geometry()");

    expect(source).not.toMatch(/LENGTH = |BEST = |REPEAT!/);
    expect(source).not.toMatch(
      /showLessonCard|showRoundRecap|showRoundBanner/,
    );
    expect(source).not.toMatch(/NextMoveHint|RiverRow|ComplexityMeter/);
  });

  it("Threshing Floor pressures through telegraphed interference, not chrome", () => {
    const source = readSource("src/scenes/puzzles/Boss_Shuffler.ts");

    // Every action records to the ledger; the boss's sabotage is windUp-
    // telegraphed and raises par honestly instead of punishing stars.
    expect(source).toContain("this.ledger = recordTrade(this.ledger);");
    expect(source).toContain("await this.boss.windUp(");
    expect(source).toContain("bossPar(this.scrambles)");

    // The triple banner/status/detail tell is gone; transitions carry one
    // line each and the boss BARKS instead of narrating.
    expect(source).not.toMatch(/statusText|detailText/);
    expect(source).not.toMatch(/showLessonCard|NextMoveHint|RiverRow/);
    // No timers-as-failure: urgency is the boss, not a countdown.
    expect(source).not.toMatch(/timeLeft|countdown/i);
  });

  it("keeps first-three puzzle actions tied into the shared kinetic arena layer", () => {
    const basePuzzle = readSource("src/scenes/puzzles/BasePuzzleScene.ts");
    const kinetics = readSource("src/ui/PuzzleKinetics.ts");
    const juice = readSource("src/systems/JuiceSystem.ts");
    const cursor = readSource("src/ui/PuzzleCursor.ts");

    expect(basePuzzle).toContain("new PuzzleKinetics");
    expect(basePuzzle).toContain("emitPuzzleActionPulse");
    expect(basePuzzle).toContain("PUZZLE_ARRAY_ACTION_ARENA_BG");
    expect(basePuzzle).toContain("PUZZLE_TWIN_ACTION_ARENA_BG");
    expect(kinetics).toContain("spawnSignalBolt");
    expect(kinetics).toContain("pulseCore");
    expect(juice).toContain("emitPuzzlePulse");
    expect(cursor).toContain("emitPuzzleActionPulse");
  });
});
