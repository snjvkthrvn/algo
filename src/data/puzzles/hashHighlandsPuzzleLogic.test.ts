import { describe, expect, it } from 'vitest';
import {
  ANAGRAM_GARDEN_ROUNDS,
  ARCHIVIST_ROUNDS,
  CACHE_CAVERN_ROUNDS,
  FREQUENCY_FORGE_ROUNDS,
  NAMEPLATE_GATE_ROUNDS,
  isCorrectHashChoice,
} from './hashHighlandsPuzzleLogic';

describe('Hash Highlands puzzle logic', () => {
  it('keeps every non-boss encounter to three focused teaching rounds', () => {
    for (const rounds of [
      NAMEPLATE_GATE_ROUNDS,
      FREQUENCY_FORGE_ROUNDS,
      ANAGRAM_GARDEN_ROUNDS,
      CACHE_CAVERN_ROUNDS,
    ]) {
      expect(rounds).toHaveLength(3);
      for (const round of rounds) {
        expect(round.options).toHaveLength(3);
        expect(round.correctIndex).toBeGreaterThanOrEqual(0);
        expect(round.correctIndex).toBeLessThan(round.options.length);
      }
    }
  });

  it('builds the Archivist as a four-phase synthesis boss', () => {
    expect(ARCHIVIST_ROUNDS.map((round) => round.title)).toEqual([
      'Phase 1: Name Query',
      'Phase 2: Count Storm',
      'Phase 3: Scrambled Bloom',
      'Phase 4: Deep Cache',
    ]);
  });

  it('checks choices by index without leaking the answer through text matching', () => {
    const round = NAMEPLATE_GATE_ROUNDS[0];

    expect(isCorrectHashChoice(round, round.correctIndex)).toBe(true);
    expect(isCorrectHashChoice(round, (round.correctIndex + 1) % round.options.length)).toBe(false);
  });
});
