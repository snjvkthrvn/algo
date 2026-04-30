import { describe, expect, it } from 'vitest';
import {
  BENT_BOUGH_ROUNDS,
  DEEP_ROOT_ROUNDS,
  FIRST_FORK_ROUNDS,
  PATTERN_ROUNDS,
  SORTED_GROVE_ROUNDS,
  isCorrectTreeChoice,
} from './treeCanopyPuzzleLogic';

describe('Tree Canopy puzzle logic', () => {
  it('keeps every lesson encounter to three focused rounds', () => {
    for (const rounds of [
      FIRST_FORK_ROUNDS,
      SORTED_GROVE_ROUNDS,
      DEEP_ROOT_ROUNDS,
      BENT_BOUGH_ROUNDS,
    ]) {
      expect(rounds).toHaveLength(3);
      for (const round of rounds) {
        expect(round.options).toHaveLength(3);
        expect(round.correctIndex).toBeGreaterThanOrEqual(0);
        expect(round.correctIndex).toBeLessThan(round.options.length);
      }
    }
  });

  it('builds the Pattern as the five tree confrontation phases', () => {
    expect(PATTERN_ROUNDS.map((round) => round.title)).toEqual([
      'Phase 1: Traversal Trap',
      'Phase 2: BST Siege',
      'Phase 3: Depth Gauntlet',
      'Phase 4: Balance Storm',
      'Phase 5: Mirror Match',
    ]);
  });

  it('checks choices by stable index', () => {
    const round = FIRST_FORK_ROUNDS[0];

    expect(isCorrectTreeChoice(round, round.correctIndex)).toBe(true);
    expect(isCorrectTreeChoice(round, (round.correctIndex + 1) % round.options.length)).toBe(false);
  });
});
