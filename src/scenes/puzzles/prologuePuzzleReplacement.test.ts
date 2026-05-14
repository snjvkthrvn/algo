import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('prologue puzzle replacement scenes', () => {
  it('replaces the original prologue puzzle classes with the imported puzzle implementations', () => {
    expect(readSource('src/scenes/puzzles/P0_1_FollowThePath.ts')).toContain(
      "FollowThePathScene as P0_1_FollowThePath",
    );
    expect(readSource('src/scenes/puzzles/P0_2_FlowConsoles.ts')).toContain(
      "FlowConsolesScene as P0_2_FlowConsoles",
    );
    expect(readSource('src/scenes/puzzles/Boss_Sentinel.ts')).toContain(
      "TheLitanyScene as Boss_Sentinel",
    );
  });

  it('uses the existing story scene keys and Algorithmia completion flow', () => {
    const p01 = readSource('src/arcadePrologue/puzzles/P0_1/scene.ts');
    const p02 = readSource('src/arcadePrologue/puzzles/P0_2/scene.ts');
    const boss = readSource('src/arcadePrologue/puzzles/P0_F/scene.ts');

    expect(p01).toContain('SCENE_KEYS.PUZZLE_P0_1');
    expect(p02).toContain('SCENE_KEYS.PUZZLE_P0_2');
    expect(boss).toContain('SCENE_KEYS.BOSS_SENTINEL');
    expect(p01).toContain("puzzleId: 'p0_1'");
    expect(p02).toContain("puzzleId: 'p0_2'");
    expect(boss).toContain("puzzleId: 'boss_sentinel'");
    expect(p01).toContain('puzzleComplete(): void');
    expect(p02).toContain('puzzleComplete(): void');
    expect(boss).toContain('onPuzzleComplete(stars = 3): void');
    expect(p01).toContain('KeyCodes.ESC');
    expect(p02).toContain('KeyCodes.ESC');
    expect(boss).toContain('KeyCodes.ESC');
    expect(`${p01}\n${p02}\n${boss}`).toContain('completeAlgorithmiaPuzzle');
    expect(`${p01}\n${p02}\n${boss}`).toContain('exitToReturnScene');
    expect(`${p01}\n${p02}\n${boss}`).not.toContain('ArcadeP0_');
  });
});
