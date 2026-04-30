import { describe, expect, it } from 'vitest';
import {
  FERRY_DOCK_ROUNDS,
  PRIORITY_DOCK_ROUNDS,
  RECONCILER_ROUNDS,
  RIPPLE_MAP_ROUNDS,
  SCHEDULER_LOTTERY_ROUNDS,
  isCorrectQueueChoice,
} from './queueCanalsPuzzleLogic';

describe('Queue Canals puzzle logic', () => {
  it('keeps every lesson encounter to three focused rounds', () => {
    for (const rounds of [
      FERRY_DOCK_ROUNDS,
      RIPPLE_MAP_ROUNDS,
      PRIORITY_DOCK_ROUNDS,
      SCHEDULER_LOTTERY_ROUNDS,
    ]) {
      expect(rounds).toHaveLength(3);
      for (const round of rounds) {
        expect(round.options).toHaveLength(3);
        expect(round.correctIndex).toBeGreaterThanOrEqual(0);
        expect(round.correctIndex).toBeLessThan(round.options.length);
      }
    }
  });

  it('builds the Reconciler as the five queue mastery phases', () => {
    expect(RECONCILER_ROUNDS.map((round) => round.title)).toEqual([
      'Phase 1: Great Queue',
      'Phase 2: Ripple Siege',
      'Phase 3: Priority Crisis',
      'Phase 4: Scheduling Storm',
      'Phase 5: Merge',
    ]);
  });

  it('checks choices by stable index', () => {
    const round = FERRY_DOCK_ROUNDS[0];

    expect(isCorrectQueueChoice(round, round.correctIndex)).toBe(true);
    expect(isCorrectQueueChoice(round, (round.correctIndex + 1) % round.options.length)).toBe(false);
  });
});
