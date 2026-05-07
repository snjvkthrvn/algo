import { describe, expect, it } from 'vitest';
import {
  FIXED_WINDOW_ROUNDS,
  MIRROR_SERPENT_ROUNDS,
  MIRROR_WALK_ROUNDS,
  POINTER_BRIDGE_ROUNDS,
  VARIABLE_WINDOW_ROUNDS,
  isCorrectChoice,
} from './twinRiversPuzzleLogic';

describe('Twin Rivers puzzle logic', () => {
  it('defines playable rounds for every Twin Rivers lesson and boss', () => {
    for (const rounds of [
      MIRROR_WALK_ROUNDS,
      POINTER_BRIDGE_ROUNDS,
      FIXED_WINDOW_ROUNDS,
      VARIABLE_WINDOW_ROUNDS,
      MIRROR_SERPENT_ROUNDS,
    ]) {
      expect(rounds.length).toBeGreaterThanOrEqual(3);
      for (const round of rounds) {
        expect(round.options[round.correctIndex]).toBeDefined();
      }
    }
  });

  it('checks selected options against the round answer', () => {
    const round = POINTER_BRIDGE_ROUNDS[0];

    expect(isCorrectChoice(round, round.correctIndex)).toBe(true);
    expect(isCorrectChoice(round, (round.correctIndex + 1) % round.options.length)).toBe(false);
  });

  it('provides educational explanations for queue/flow concepts', () => {
    const round = MIRROR_WALK_ROUNDS[0];
    expect(round.education).toBeDefined();
    expect(round.education).toContain('queue');
  });
});
