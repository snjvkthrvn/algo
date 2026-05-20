import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TWO_SUM_ROUND_CONFIGS } from '../data/puzzles/arrayPlainsPuzzleLogic';

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function numberConst(source: string, name: string): number {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\d+)`));
  if (!match) throw new Error(`Missing numeric const ${name}`);
  return Number(match[1]);
}

describe('first three regions quality guards', () => {
  it('keeps title menu rows below the journey strip label', () => {
    const source = readSource('src/scenes/MenuScene.ts');
    const menuStartY = numberConst(source, 'MENU_START_Y');
    const stripY = numberConst(source, 'JOURNEY_STRIP_Y');

    expect(menuStartY).toBeGreaterThanOrEqual(stripY + 44);
  });

  it('cleans up Watcher state on Prologue shutdown so Bit cannot stay scared', () => {
    const source = readSource('src/scenes/prologue/PrologueScene.ts');
    const shutdownBody = source.match(/shutdown\(\): void \{(?<body>[\s\S]*?)\n  \}/)?.groups?.body ?? '';

    expect(shutdownBody).toContain('cleanupActiveWatcherFlyby');
    expect(shutdownBody).toContain('gameState.setBitMood(BitMood.NEUTRAL)');
    expect(shutdownBody).toContain('this.player?.unfreeze()');
  });

  it('locks Bubble Sort input while adjacent furrows are animating', () => {
    const source = readSource('src/scenes/puzzles/P1_1_BubbleSort.ts');

    expect(source).toContain('private actionLocked = false');
    expect(source).toContain('if (this.isResolving || this.actionLocked) return;');
    expect(source).toContain('this.actionLocked = true;');
    expect(source).toContain('this.actionLocked = false;');
  });

  it('teaches Bubble Sort by leaving already-ordered adjacent pairs in place', () => {
    const source = readSource('src/scenes/puzzles/P1_1_BubbleSort.ts');
    const noSwapIndex = source.indexOf('if (!wasUseful) {');
    const swapIndex = source.indexOf('this.values = swapAdjacent(this.values, leftIndex);');

    expect(noSwapIndex).toBeGreaterThan(-1);
    expect(swapIndex).toBeGreaterThan(noSwapIndex);
    // Inspecting a sorted pair is part of how bubble sort terminates, so we
    // give a soft confirmation rather than a penalty. The test asserts:
    //   (a) the player gets feedback that the pair is fine, and
    //   (b) the no-op path doesn't increment mistakesTotal / attempts.
    expect(source).toMatch(/Already in order[\s\S]*Move on/);
    const noSwapBlock = source.slice(noSwapIndex, swapIndex);
    expect(noSwapBlock).not.toContain('this.mistakesTotal++');
    expect(noSwapBlock).not.toContain('this.attempts++');
  });

  it('locks Two Sum input while a wrong pair is being cleared', () => {
    const source = readSource('src/scenes/puzzles/P1_4_TwoSum.ts');

    expect(source).toContain('private actionLocked = false');
    expect(source).toContain('if (this.isResolving || this.actionLocked) return;');
    expect(source).toContain('const wrongSelection = [...this.selectedIndices];');
    expect(source).toContain('this.actionLocked = true;');
    expect(source).toContain('this.actionLocked = false;');
  });

  it('keeps Two Sum rounds fully reachable by number-key controls', () => {
    for (const round of TWO_SUM_ROUND_CONFIGS) {
      expect(round.values.length).toBeLessThanOrEqual(9);
    }
  });
});
