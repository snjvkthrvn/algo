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

  it("locks Two Sum input while a wrong pair is being cleared", () => {
    const source = readSource("src/scenes/puzzles/P1_4_TwoSum.ts");

    expect(source).toContain("private actionLocked = false");
    expect(source).toContain(
      "if (this.isResolving || this.actionLocked) return;",
    );
    expect(source).toContain(
      "const wrongSelection = [...this.selectedIndices];",
    );
    expect(source).toContain("this.actionLocked = true;");
    expect(source).toContain("this.actionLocked = false;");
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

    expect(twinRivers).toContain("performMirrorWalkBoardStep");
    expect(twinRivers).toContain("performPointerBridgeBoardStep");
    expect(twinRivers).toContain("performFixedWindowBoardStep");
    expect(twinRivers).toContain("performCurrentRiderBoardStep");
    expect(twinRivers).toContain("handleSerpentRowPress");

    expect(shuffler).toContain("moveBossFocus");
    expect(shuffler).toContain("activateBossFocus");
    expect(shuffler).toContain("onTilePress");
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
