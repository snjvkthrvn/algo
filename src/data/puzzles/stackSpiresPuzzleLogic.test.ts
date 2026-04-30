import { describe, expect, it } from 'vitest';
import {
  MAZE_OF_FORKS_ROUNDS,
  MIRROR_STAIRCASE_ROUNDS,
  RECURSION_ROUNDS,
  SCROLL_STACK_ROUNDS,
  TOWER_OF_MEMORY_ROUNDS,
  isCorrectStackChoice,
} from './stackSpiresPuzzleLogic';

describe('Stack Spires puzzle logic', () => {
  it('keeps the four lesson encounters to three readable rounds', () => {
    for (const rounds of [
      SCROLL_STACK_ROUNDS,
      MIRROR_STAIRCASE_ROUNDS,
      MAZE_OF_FORKS_ROUNDS,
      TOWER_OF_MEMORY_ROUNDS,
    ]) {
      expect(rounds).toHaveLength(3);
      for (const round of rounds) {
        expect(round.options).toHaveLength(3);
        expect(round.correctIndex).toBeGreaterThanOrEqual(0);
        expect(round.correctIndex).toBeLessThan(round.options.length);
      }
    }
  });

  it('builds Recursion as descent, base case, ascent, and collapse', () => {
    expect(RECURSION_ROUNDS.map((round) => round.title)).toEqual([
      'Phase 1: Descent',
      'Phase 2: Base Case',
      'Phase 3: Ascent',
      'Phase 4: Collapse',
    ]);
  });

  it('checks choices by stable index', () => {
    const round = SCROLL_STACK_ROUNDS[0];

    expect(isCorrectStackChoice(round, round.correctIndex)).toBe(true);
    expect(isCorrectStackChoice(round, (round.correctIndex + 1) % round.options.length)).toBe(false);
  });
});
