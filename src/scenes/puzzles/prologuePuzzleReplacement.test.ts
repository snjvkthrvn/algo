import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string): string =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("prologue puzzle replacement scenes", () => {
  it("replaces the original prologue puzzle classes with the imported puzzle implementations", () => {
    expect(readSource("src/scenes/puzzles/P0_1_FollowThePath.ts")).toContain(
      "FollowThePathScene as P0_1_FollowThePath",
    );
    expect(readSource("src/scenes/puzzles/P0_2_FlowConsoles.ts")).toContain(
      "FlowConsolesScene as P0_2_FlowConsoles",
    );
    expect(readSource("src/scenes/puzzles/Boss_Sentinel.ts")).toContain(
      "TheLitanyScene as Boss_Sentinel",
    );
  });

  it("uses the existing story scene keys and Algorithmia completion flow", () => {
    const p01 = readSource("src/arcadePrologue/puzzles/P0_1/scene.ts");
    const p02 = readSource("src/arcadePrologue/puzzles/P0_2/scene.ts");
    const boss = readSource("src/arcadePrologue/puzzles/P0_F/scene.ts");

    expect(p01).toContain("SCENE_KEYS.PUZZLE_P0_1");
    expect(p02).toContain("SCENE_KEYS.PUZZLE_P0_2");
    expect(boss).toContain("SCENE_KEYS.BOSS_SENTINEL");
    // Quote-style agnostic: the formatter hook may flip these files between
    // single and double quotes.
    expect(p01).toMatch(/puzzleId: ['"]p0_1['"]/);
    expect(p02).toMatch(/puzzleId: ['"]p0_2['"]/);
    expect(boss).toMatch(/puzzleId: ['"]boss_sentinel['"]/);
    expect(p01).toContain("puzzleComplete(): void");
    expect(p02).toContain("puzzleComplete(): void");
    expect(boss).toContain("onPuzzleComplete(stars = 3): void");
    expect(p01).toContain("KeyCodes.ESC");
    expect(p02).toContain("KeyCodes.ESC");
    expect(boss).toContain("KeyCodes.ESC");
    expect(`${p01}\n${p02}\n${boss}`).toContain("completeAlgorithmiaPuzzle");
    expect(`${p01}\n${p02}\n${boss}`).toContain("exitToReturnScene");
    expect(`${p01}\n${p02}\n${boss}`).not.toContain("ArcadeP0_");
  });

  it("keeps first contact serene — round timers and lives belong to the boss (VISION §6)", () => {
    const p01 = readSource("src/arcadePrologue/puzzles/P0_1/scene.ts");
    const p02 = readSource("src/arcadePrologue/puzzles/P0_2/scene.ts");
    const boss = readSource("src/arcadePrologue/puzzles/P0_F/scene.ts");

    // First-contact rooms run no clock at all; only the boss starts one.
    expect(p01).not.toContain("GAME.startRound");
    expect(p02).not.toContain("GAME.startRound");
    expect(p01).not.toContain("ROUND_TIMERS");
    expect(p02).not.toContain("ROUND_TIMERS");
    expect(boss).toContain("GAME.startRound(LITANY_TIMER_MS)");

    // A wrong hop replays the chant tail — it never costs a life or restarts.
    expect(p01).not.toContain("loseLife");
    expect(p01).not.toContain("scene.restart");
  });

  it("paints all three prologue rooms on the warm arena art, not the cosmic void", () => {
    const atmosphere = readSource(
      "src/arcadePrologue/puzzles/P0_1/visuals/atmosphere.ts",
    );

    expect(atmosphere).not.toContain("COSMIC_VOID");
    const arenaMappings = atmosphere.match(/PUZZLE_PROLOGUE_ACTION_ARENA_BG/g);
    // One mapping per room (P0_1 / P0_2 / Boss_Sentinel) beyond the import.
    expect(arenaMappings?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("mounts only the shared transient legend — no pinned HUD chrome", () => {
    const p01 = readSource("src/arcadePrologue/puzzles/P0_1/scene.ts");
    const p02 = readSource("src/arcadePrologue/puzzles/P0_2/scene.ts");
    const boss = readSource("src/arcadePrologue/puzzles/P0_F/scene.ts");

    for (const source of [p01, p02, boss]) {
      expect(source).toContain("mountTransientLegend");
      expect(source).not.toMatch(/buildHud|buildPrologueHud/);
    }
  });
});
