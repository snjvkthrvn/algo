import { describe, expect, it } from 'vitest';
import {
  ECHO_CHAMBER_ROUNDS,
  GRAND_ARCHIVE_ROUNDS,
  HALL_OF_PATTERNS_ROUNDS,
  PROTOCOL_OMEGA_ROUNDS,
  WEIGHTED_STAIRCASE_ROUNDS,
  isCorrectCoreChoice,
} from './corePuzzleLogic';

describe('The Core puzzle logic', () => {
  it('keeps every lesson encounter to three focused rounds', () => {
    for (const rounds of [
      ECHO_CHAMBER_ROUNDS,
      WEIGHTED_STAIRCASE_ROUNDS,
      GRAND_ARCHIVE_ROUNDS,
      HALL_OF_PATTERNS_ROUNDS,
    ]) {
      expect(rounds).toHaveLength(3);
      for (const round of rounds) {
        expect(round.options).toHaveLength(3);
        expect(round.correctIndex).toBeGreaterThanOrEqual(0);
        expect(round.correctIndex).toBeLessThan(round.options.length);
      }
    }
  });

  it('builds Protocol Omega as the six final synthesis phases', () => {
    expect(PROTOCOL_OMEGA_ROUNDS.map((round) => round.title)).toEqual([
      'Phase 1: Prologue',
      'Phase 2: Plains and Rivers',
      'Phase 3: Highlands and Spires',
      'Phase 4: Canals and Canopy',
      'Phase 5: Nexus and Core',
      'Phase 6: The Question',
    ]);
  });

  it('checks choices by stable index', () => {
    const round = ECHO_CHAMBER_ROUNDS[0];

    expect(isCorrectCoreChoice(round, round.correctIndex)).toBe(true);
    expect(isCorrectCoreChoice(round, (round.correctIndex + 1) % round.options.length)).toBe(false);
  });
});
