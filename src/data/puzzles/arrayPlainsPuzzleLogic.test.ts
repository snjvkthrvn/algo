import { describe, expect, it } from 'vitest';
import {
  basketIndexForItem,
  hashBucket,
  isSortedAscending,
  isTwoSumPair,
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
});
