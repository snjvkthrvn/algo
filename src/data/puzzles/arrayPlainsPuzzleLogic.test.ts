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
      expect(starsFromMistakesAndHints(1, 0)).toBe(2);
      expect(starsFromMistakesAndHints(2, 1)).toBe(2);
    });
    it('grants 1 star when mistakes or hints are high', () => {
      expect(starsFromMistakesAndHints(3, 0)).toBe(1);
      expect(starsFromMistakesAndHints(0, 2)).toBe(1);
    });
  });

  describe('round data shape', () => {
    it('ships 3 bubble-sort rounds in difficulty order', () => {
      expect(BUBBLE_SORT_ROUNDS.map((r) => r.label)).toEqual(['TEACH', 'TWIST', 'MASTER']);
      expect(BUBBLE_SORT_ROUNDS[0].values.length).toBeLessThan(BUBBLE_SORT_ROUNDS[2].values.length);
    });
    it('ships 3 indexing rounds; only MASTER obscures labels', () => {
      expect(INDEXING_ROUNDS).toHaveLength(3);
      expect(INDEXING_ROUNDS[0].obscureLabels).toBe(false);
      expect(INDEXING_ROUNDS[1].obscureLabels).toBe(false);
      expect(INDEXING_ROUNDS[2].obscureLabels).toBe(true);
    });
    it('ships 3 hash rounds with descending fall time', () => {
      expect(HASH_ROUNDS).toHaveLength(3);
      expect(HASH_ROUNDS[0].fallMs).toBeGreaterThan(HASH_ROUNDS[1].fallMs);
      expect(HASH_ROUNDS[1].fallMs).toBeGreaterThan(HASH_ROUNDS[2].fallMs);
    });
    it('precomputes each crop bucket = letterIndex % bucketCount', () => {
      for (const round of HASH_ROUNDS) {
        for (const c of round.stream) {
          expect(c.bucket).toBe(hashBucket(c.letterIndex, round.bucketCount));
        }
      }
    });
    it('every two-sum round has at least one valid pair', () => {
      for (const round of TWO_SUM_ROUND_CONFIGS) {
        expect(round.validPairs.length).toBeGreaterThan(0);
        for (const [a, b] of round.validPairs) {
          expect(a + b).toBe(round.target);
        }
      }
    });
  });
});
