import { describe, expect, it } from 'vitest';
import {
  MIRROR_WALK_ROUNDS,
  POINTER_BRIDGE_ROUNDS,
  FIXED_WINDOW_ROUNDS,
  CURRENT_RIDER_ROUNDS,
  MIRROR_SERPENT_PHASES,
  reversedTarget,
  arrayEquals,
  pointerDirective,
  windowSumAt,
  bestFixedWindowStart,
  hasDuplicateInRange,
  longestUniqueWindowLength,
} from './twinRiversPuzzleLogic';

describe('Twin Rivers puzzle logic', () => {
  it('Mirror Walk rounds reverse correctly via two-pointer convergence', () => {
    expect(MIRROR_WALK_ROUNDS.length).toBeGreaterThanOrEqual(3);
    for (const round of MIRROR_WALK_ROUNDS) {
      const reversed = reversedTarget(round.values);
      expect(reversed).toEqual([...round.values].reverse());
      expect(arrayEquals(round.values, reversed)).toBe(false);
    }
  });

  it('Pointer Bridge rounds always have a valid target pair in sorted order', () => {
    expect(POINTER_BRIDGE_ROUNDS.length).toBeGreaterThanOrEqual(3);
    for (const round of POINTER_BRIDGE_ROUNDS) {
      let l = 0;
      let r = round.values.length - 1;
      let found = false;
      while (l < r) {
        const sum = round.values[l] + round.values[r];
        if (sum === round.target) {
          found = true;
          break;
        }
        if (sum < round.target) l++;
        else r--;
      }
      expect(found).toBe(true);
    }
  });

  it('pointerDirective forces the algorithm move based on sum vs target', () => {
    expect(pointerDirective(8, 10)).toBe('advance_left');
    expect(pointerDirective(12, 10)).toBe('retreat_right');
    expect(pointerDirective(10, 10)).toBe('lock');
  });

  it('Fixed Window rounds yield correct best-start positions', () => {
    expect(FIXED_WINDOW_ROUNDS.length).toBeGreaterThanOrEqual(3);
    for (const round of FIXED_WINDOW_ROUNDS) {
      const best = bestFixedWindowStart(round.values, round.windowSize);
      const sum = windowSumAt(round.values, best, round.windowSize);
      // No other starting position beats this sum.
      for (let s = 0; s + round.windowSize <= round.values.length; s++) {
        expect(windowSumAt(round.values, s, round.windowSize)).toBeLessThanOrEqual(sum);
      }
    }
  });

  it('Current Rider rounds have at least one duplicate to make the puzzle non-trivial', () => {
    expect(CURRENT_RIDER_ROUNDS.length).toBeGreaterThanOrEqual(3);
    for (const round of CURRENT_RIDER_ROUNDS) {
      expect(hasDuplicateInRange(round.letters, 0, round.letters.length - 1)).toBe(true);
      // And the optimal answer is shorter than the full range (i.e. there's a real choice).
      expect(longestUniqueWindowLength(round.letters)).toBeLessThan(round.letters.length);
    }
  });

  it('every region puzzle ships at least 4 rounds with a MASTER+ tier', () => {
    const all = [
      MIRROR_WALK_ROUNDS,
      POINTER_BRIDGE_ROUNDS,
      FIXED_WINDOW_ROUNDS,
      CURRENT_RIDER_ROUNDS,
    ];
    for (const rounds of all) {
      expect(rounds.length).toBeGreaterThanOrEqual(4);
      const last = rounds[rounds.length - 1];
      expect(last.label).toBe('MASTER+');
      // The lesson layer is required on every round so the LessonCard surfaces
      // the algorithmic 'why' between every challenge.
      expect(last.lesson?.bullets.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('Boss Mirror Serpent defines all three phase inputs', () => {
    expect(MIRROR_SERPENT_PHASES.reverse.values.length).toBeGreaterThan(0);
    expect(MIRROR_SERPENT_PHASES.twoSum.target).toBeGreaterThan(0);
    expect(MIRROR_SERPENT_PHASES.fixedWindow.windowSize).toBeGreaterThan(0);
  });
});
