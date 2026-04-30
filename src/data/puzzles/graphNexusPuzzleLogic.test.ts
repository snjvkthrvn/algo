import { describe, expect, it } from 'vitest';
import {
  BRIDGE_MAP_ROUNDS,
  COURIER_DILEMMA_ROUNDS,
  CYCLE_BAZAAR_ROUNDS,
  ECHO_ROUNDS,
  ISLAND_CENSUS_ROUNDS,
  isCorrectGraphChoice,
} from './graphNexusPuzzleLogic';

describe('Graph Nexus puzzle logic', () => {
  it('keeps every lesson encounter to three focused rounds', () => {
    for (const rounds of [
      BRIDGE_MAP_ROUNDS,
      COURIER_DILEMMA_ROUNDS,
      CYCLE_BAZAAR_ROUNDS,
      ISLAND_CENSUS_ROUNDS,
    ]) {
      expect(rounds).toHaveLength(3);
      for (const round of rounds) {
        expect(round.options).toHaveLength(3);
        expect(round.correctIndex).toBeGreaterThanOrEqual(0);
        expect(round.correctIndex).toBeLessThan(round.options.length);
      }
    }
  });

  it('builds the Echo as the five graph mastery phases', () => {
    expect(ECHO_ROUNDS.map((round) => round.title)).toEqual([
      'Phase 1: Bridge Duel',
      'Phase 2: Path Race',
      'Phase 3: Cycle Break',
      'Phase 4: Island Fracture',
      'Phase 5: Full Graph',
    ]);
  });

  it('checks choices by stable index', () => {
    const round = BRIDGE_MAP_ROUNDS[0];

    expect(isCorrectGraphChoice(round, round.correctIndex)).toBe(true);
    expect(isCorrectGraphChoice(round, (round.correctIndex + 1) % round.options.length)).toBe(false);
  });
});
