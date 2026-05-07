export const BUBBLE_SORT_START = [4, 1, 3, 0, 2];

export function swapAdjacent(values: readonly number[], leftIndex: number): number[] {
  if (leftIndex < 0 || leftIndex >= values.length - 1) return [...values];

  const next = [...values];
  const right = leftIndex + 1;
  const tmp = next[leftIndex];
  next[leftIndex] = next[right];
  next[right] = tmp;
  return next;
}

export function isSortedAscending(values: readonly number[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1] <= value);
}

export const BASKET_ITEMS = [
  { item: 'hammer', index: 5 },
  { item: 'rope', index: 7 },
  { item: 'seed', index: 2 },
  { item: 'gear', index: 9 },
] as const;

export function basketIndexForItem(item: string): number | null {
  return BASKET_ITEMS.find((entry) => entry.item === item)?.index ?? null;
}

export const HASH_CROPS = [
  { crop: 'WHEAT', letterIndex: 22, bucket: 2 },
  { crop: 'BEAN', letterIndex: 1, bucket: 1 },
  { crop: 'CORN', letterIndex: 2, bucket: 2 },
  { crop: 'RICE', letterIndex: 17, bucket: 1 },
] as const;

export function hashBucket(letterIndex: number, bucketCount = 4): number {
  return letterIndex % bucketCount;
}

export const TWO_SUM_ROUNDS = [
  { values: [3, 6, 2, 7, 4], target: 9, answer: [3, 6] },
  { values: [5, 1, 8, 4, 2], target: 10, answer: [8, 2] },
  { values: [7, 11, 6, 13, 4], target: 17, answer: [11, 6] },
] as const;

export function isTwoSumPair(values: readonly number[], target: number, selected: readonly number[]): boolean {
  if (selected.length !== 2) return false;
  if (selected[0] === selected[1]) return false;
  if (!selected.every((value) => values.includes(value))) return false;
  return selected[0] + selected[1] === target;
}

export function getSortingEducationalTooltip(): string {
  return "Compare adjacent elements and swap if out of order. Bubble sort is O(n^2) comparisons; efficient sorts use O(n log n) like merge/quick.";
}
