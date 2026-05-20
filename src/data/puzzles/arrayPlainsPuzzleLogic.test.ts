import { describe, expect, it } from 'vitest';
import {
  BUBBLE_SORT_ROUNDS,
  HASH_ROUNDS,
  INDEXING_ROUNDS,
  TWO_SUM_ROUND_CONFIGS,
  basketIndexForItem,
  complementOf,
  firstInversionIndex,
  getSortingEducationalTooltip,
  hashBucket,
  inversionCount,
  isSortedAscending,
  isTwoSumPair,
  starsFromMistakesAndHints,
  swapAdjacent,
  withOptimalityPenalty,
} from './arrayPlainsPuzzleLogic';

describe('arrayPlainsPuzzleLogic', () => {
  it('swaps only adjacent values', () => {
    expect(swapAdjacent([4, 1, 3], 0)).toEqual([1, 4, 3]);
    expect(swapAdjacent([4, 1, 3], 3)).toEqual([4, 1, 3]);
  });

  it('recognizes sorted rows', () => {
    expect(isSortedAscending([0, 1, 2, 3])).toBe(true);
    expect(isSortedAscending([0, 2, 1, 3])).toBe(false);
  });

  it('looks up basket indices by item name', () => {
    expect(basketIndexForItem('hammer')).toBe(5);
    expect(basketIndexForItem('missing')).toBeNull();
  });

  it('maps letter indexes to hash buckets', () => {
    expect(hashBucket(22, 4)).toBe(2);
    expect(hashBucket(17, 4)).toBe(1);
  });

  it('validates two-sum complements', () => {
    expect(isTwoSumPair([3, 6, 2, 7], 9, [3, 6])).toBe(true);
    expect(isTwoSumPair([3, 6, 2, 7], 9, [2, 7])).toBe(true);
    expect(isTwoSumPair([3, 6, 2, 7], 9, [3, 2])).toBe(false);
  });

  it('provides educational sorting tooltip mentioning O(n log n) and comparisons', () => {
    const tip = getSortingEducationalTooltip();
    expect(tip).toContain('O(n log n)');
    expect(tip).toContain('comparison');
  });

  // ──────────────────────────────────────────────────────────────────
  // New helpers powering the AP_1..AP_4 overhauls
  // ──────────────────────────────────────────────────────────────────

  describe('firstInversionIndex', () => {
    it('returns -1 when the row is already sorted', () => {
      expect(firstInversionIndex([1, 2, 3, 4])).toBe(-1);
    });
    it('returns the leftmost inversion index', () => {
      expect(firstInversionIndex([1, 3, 2, 4])).toBe(1);
      expect(firstInversionIndex([5, 4, 3, 2, 1])).toBe(0);
    });
  });

  describe('inversionCount', () => {
    it('counts zero for a sorted row', () => {
      expect(inversionCount([1, 2, 3, 4, 5])).toBe(0);
    });
    it('counts each pair exactly once', () => {
      expect(inversionCount([2, 1])).toBe(1);
      expect(inversionCount([3, 1, 2])).toBe(2);
      // 8,7,6,5,4,3,2,1: every pair is an inversion → 28
      expect(inversionCount([8, 7, 6, 5, 4, 3, 2, 1])).toBe(28);
    });
    it('matches BUBBLE_SORT_ROUNDS.optimalSwaps', () => {
      for (const round of BUBBLE_SORT_ROUNDS) {
        expect(inversionCount(round.values)).toBe(round.optimalSwaps);
      }
    });
  });

  describe('complementOf', () => {
    it('returns target minus value', () => {
      expect(complementOf(3, 9)).toBe(6);
      expect(complementOf(7, 10)).toBe(3);
      expect(complementOf(0, 5)).toBe(5);
    });
  });

  describe('starsFromMistakesAndHints', () => {
    it('grants 3 stars only for a clean run', () => {
      expect(starsFromMistakesAndHints(0, 0)).toBe(3);
    });
    it('grants 2 stars for a near-clean run', () => {
      // Tightened: 2 mistakes used to be 2 stars; now only ≤1 mistake earns 2.
      expect(starsFromMistakesAndHints(1, 0)).toBe(2);
      expect(starsFromMistakesAndHints(1, 1)).toBe(2);
      expect(starsFromMistakesAndHints(0, 2)).toBe(2);
    });
    it('grants 1 star when mistakes or hints are high', () => {
      expect(starsFromMistakesAndHints(2, 0)).toBe(1);
      expect(starsFromMistakesAndHints(3, 0)).toBe(1);
      expect(starsFromMistakesAndHints(0, 3)).toBe(1);
    });
  });

  describe('withOptimalityPenalty', () => {
    it('does not penalize when moves match the optimum', () => {
      expect(withOptimalityPenalty(3, 8, 8)).toBe(3);
    });
    it('drops one star when the player overshoots', () => {
      expect(withOptimalityPenalty(3, 12, 8)).toBe(2);
      expect(withOptimalityPenalty(2, 12, 8)).toBe(1);
    });
    it('never falls below 1 star', () => {
      expect(withOptimalityPenalty(1, 99, 8)).toBe(1);
    });
    it('treats optimal = 0 as "not measured"', () => {
      expect(withOptimalityPenalty(3, 5, 0)).toBe(3);
    });
  });

  describe('round data shape', () => {
    // Each puzzle ships a 4-round MASTER+ difficulty curve after the overhaul.
    it('ships 4 bubble-sort rounds with strictly named labels', () => {
      expect(BUBBLE_SORT_ROUNDS.map((r) => r.label)).toEqual(['TEACH', 'TWIST', 'MASTER', 'MASTER+']);
      expect(BUBBLE_SORT_ROUNDS[0].values.length).toBeLessThan(BUBBLE_SORT_ROUNDS[2].values.length);
    });
    it('MASTER+ bubble-sort round is near-sorted (tests early-exit understanding)', () => {
      const masterPlus = BUBBLE_SORT_ROUNDS[3];
      expect(masterPlus.label).toBe('MASTER+');
      expect(masterPlus.optimalSwaps).toBe(1);
      expect(masterPlus.values.length).toBeGreaterThan(BUBBLE_SORT_ROUNDS[2].values.length);
    });
    it('ships 4 indexing rounds; MASTER+ hides labels instantly', () => {
      expect(INDEXING_ROUNDS).toHaveLength(4);
      expect(INDEXING_ROUNDS[0].obscureLabels).toBe(false);
      expect(INDEXING_ROUNDS[1].obscureLabels).toBe(false);
      expect(INDEXING_ROUNDS[2].obscureLabels).toBe(true);
      expect(INDEXING_ROUNDS[3].obscureLabels).toBe(true);
      expect(INDEXING_ROUNDS[3].obscureAfterMs).toBe(0);
    });
    it('ships 4 hash rounds with monotonically faster falls', () => {
      expect(HASH_ROUNDS).toHaveLength(4);
      for (let i = 1; i < HASH_ROUNDS.length; i++) {
        expect(HASH_ROUNDS[i].fallMs).toBeLessThan(HASH_ROUNDS[i - 1].fallMs);
      }
    });
    it('MASTER+ hash round changes the modulus to teach distribution tuning', () => {
      expect(HASH_ROUNDS[3].bucketCount).not.toBe(HASH_ROUNDS[2].bucketCount);
    });
    it('precomputes each crop bucket = letterIndex % bucketCount', () => {
      for (const round of HASH_ROUNDS) {
        for (const c of round.stream) {
          expect(c.bucket).toBe(hashBucket(c.letterIndex, round.bucketCount));
        }
      }
    });
    it('ships 4 two-sum rounds and every one has at least one valid pair', () => {
      expect(TWO_SUM_ROUND_CONFIGS).toHaveLength(4);
      for (const round of TWO_SUM_ROUND_CONFIGS) {
        expect(round.validPairs.length).toBeGreaterThan(0);
        for (const [a, b] of round.validPairs) {
          expect(a + b).toBe(round.target);
        }
      }
    });
    it('MASTER+ two-sum has exactly one valid pair (no shortcuts)', () => {
      expect(TWO_SUM_ROUND_CONFIGS[3].validPairs).toHaveLength(1);
    });
    it('every round carries a non-empty lesson with at least one bullet', () => {
      const all = [
        ...BUBBLE_SORT_ROUNDS,
        ...INDEXING_ROUNDS,
        ...HASH_ROUNDS,
        ...TWO_SUM_ROUND_CONFIGS,
      ];
      for (const r of all) {
        expect(r.lesson.title.length).toBeGreaterThan(0);
        expect(r.lesson.bullets.length).toBeGreaterThan(0);
      }
    });
  });
});
