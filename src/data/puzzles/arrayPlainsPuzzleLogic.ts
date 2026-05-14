/**
 * Array Plains puzzle logic — pure data + helpers shared by every AP scene.
 *
 * Region verb: ORGANIZE. Every sub-puzzle expresses it differently
 *   AP_1 swap neighbours   → bubble sort
 *   AP_2 jump to address   → indexing
 *   AP_3 hash → bucket     → modulo routing
 *   AP_4 complement search → two-sum
 *
 * Each puzzle ships a 3-round table per the overhaul spec: Round 1 teaches
 * the rule, Round 2 introduces a twist, Round 3 raises the stakes (scale,
 * speed, hidden state, or time pressure). Pure helpers stay free of Phaser
 * so they can be unit-tested in Node.
 */

// ============================================================================
// AP_1 — Bubble sort (compare-and-swap neighbours)
// ============================================================================

export const BUBBLE_SORT_START = [4, 1, 3, 0, 2];

export interface BubbleRound {
  /** Display name shown on the round banner. */
  readonly label: 'TEACH' | 'TWIST' | 'MASTER';
  /** Starting permutation; the player sorts these into ascending order. */
  readonly values: ReadonlyArray<number>;
  /** Soft time budget for star rating; not a hard fail. */
  readonly targetTimeMs: number;
  /** Star-cap reference for "optimal" number of swaps (bubble pass count). */
  readonly optimalSwaps: number;
}

export const BUBBLE_SORT_ROUNDS: ReadonlyArray<BubbleRound> = [
  // Round 1 (Teach): 4 tiles, only one inversion. Player feels "compare → swap".
  { label: 'TEACH',  values: [1, 3, 2, 4],          targetTimeMs: 20_000, optimalSwaps: 1  },
  // Round 2 (Twist): 6 tiles, several inversions, more passes required.
  // 8 inversions: (5,2),(5,4),(5,1),(5,3),(2,1),(4,1),(4,3),(6,3).
  { label: 'TWIST',  values: [5, 2, 4, 1, 6, 3],    targetTimeMs: 30_000, optimalSwaps: 8  },
  // Round 3 (Master): 8 tiles reversed — bubble sort's worst case.
  { label: 'MASTER', values: [8, 7, 6, 5, 4, 3, 2, 1], targetTimeMs: 45_000, optimalSwaps: 28 },
];

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

/**
 * Returns the index of the first inversion (i where values[i] > values[i+1]),
 * or -1 if the array is sorted. The first inversion is the "useful swap"
 * highlight the scene draws on the compare-pair ghost.
 */
export function firstInversionIndex(values: readonly number[]): number {
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] > values[i + 1]) return i;
  }
  return -1;
}

/**
 * Minimum number of adjacent swaps required to sort `values` ascending. Used
 * for the 3-star "no wasted swap" rating. Equivalent to the inversion count
 * because bubble sort makes one swap per inversion.
 */
export function inversionCount(values: readonly number[]): number {
  let n = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] > values[j]) n++;
    }
  }
  return n;
}

// ============================================================================
// AP_2 — Indexing (jump straight to the address, never scan)
// ============================================================================

export const BASKET_ITEMS = [
  { item: 'hammer', index: 5 },
  { item: 'rope', index: 7 },
  { item: 'seed', index: 2 },
  { item: 'gear', index: 9 },
] as const;

export function basketIndexForItem(item: string): number | null {
  return BASKET_ITEMS.find((entry) => entry.item === item)?.index ?? null;
}

export interface IndexingRequest {
  readonly item: string;
  readonly index: number;
}

export interface IndexingRound {
  readonly label: 'TEACH' | 'TWIST' | 'MASTER';
  /** How many baskets exist this round (laid out 0..basketCount-1). */
  readonly basketCount: number;
  /** Ordered list of fetch requests the player must complete. */
  readonly requests: ReadonlyArray<IndexingRequest>;
  /** Per-request time budget (seconds). */
  readonly secondsPerRequest: number;
  /** If true, basket labels fade after `obscureAfterMs` while the request stays visible. */
  readonly obscureLabels: boolean;
  readonly obscureAfterMs: number;
}

export const INDEXING_ROUNDS: ReadonlyArray<IndexingRound> = [
  // Round 1 (Teach): 1 fetch, 5 baskets. Player just commits to "I see 3, I tap 3".
  {
    label: 'TEACH',
    basketCount: 5,
    requests: [{ item: 'rope', index: 3 }],
    secondsPerRequest: 8,
    obscureLabels: false,
    obscureAfterMs: 0,
  },
  // Round 2 (Twist): 3 in rapid succession on a wider shelf.
  {
    label: 'TWIST',
    basketCount: 8,
    requests: [
      { item: 'seed', index: 2 },
      { item: 'hammer', index: 5 },
      { item: 'wrench', index: 7 },
    ],
    secondsPerRequest: 5,
    obscureLabels: false,
    obscureAfterMs: 0,
  },
  // Round 3 (Master): 5 fetches on a 10-basket shelf; labels fade after 2s,
  // forcing the player to commit to the index they already perceived.
  {
    label: 'MASTER',
    basketCount: 10,
    requests: [
      { item: 'rope', index: 1 },
      { item: 'gear', index: 9 },
      { item: 'seed', index: 4 },
      { item: 'hammer', index: 6 },
      { item: 'wrench', index: 8 },
    ],
    secondsPerRequest: 4,
    obscureLabels: true,
    obscureAfterMs: 2_000,
  },
];

// ============================================================================
// AP_3 — Hash routing (apply a formula, route to bucket)
// ============================================================================

export const HASH_CROPS = [
  { crop: 'WHEAT', letterIndex: 22, bucket: 2 },
  { crop: 'BEAN', letterIndex: 1, bucket: 1 },
  { crop: 'CORN', letterIndex: 2, bucket: 2 },
  { crop: 'RICE', letterIndex: 17, bucket: 1 },
] as const;

export function hashBucket(letterIndex: number, bucketCount = 4): number {
  return letterIndex % bucketCount;
}

export interface FallingCrop {
  /** Display label (e.g. 'WHEAT'). */
  readonly crop: string;
  /** Numeric key fed through `hashBucket`. */
  readonly letterIndex: number;
  /** Pre-computed target bucket for the round's bucket count. */
  readonly bucket: number;
}

export interface HashRound {
  readonly label: 'TEACH' | 'TWIST' | 'MASTER';
  readonly bucketCount: number;
  /** Ordered stream of crops that fall during the round. */
  readonly stream: ReadonlyArray<FallingCrop>;
  /** Fall duration in ms. Lower = faster = harder. */
  readonly fallMs: number;
  /** Spacing between successive crop spawns. */
  readonly spawnGapMs: number;
  /** Mark this round if multiple crops legitimately hash to the same bucket. */
  readonly hasCollisions: boolean;
}

function buildStream(
  entries: ReadonlyArray<{ crop: string; letterIndex: number }>,
  bucketCount: number,
): ReadonlyArray<FallingCrop> {
  return entries.map((e) => ({
    crop: e.crop,
    letterIndex: e.letterIndex,
    bucket: hashBucket(e.letterIndex, bucketCount),
  }));
}

export const HASH_ROUNDS: ReadonlyArray<HashRound> = [
  {
    label: 'TEACH',
    bucketCount: 4,
    stream: buildStream([
      { crop: 'WHEAT', letterIndex: 22 }, // 22 % 4 = 2
      { crop: 'BEAN',  letterIndex: 1 },  // 1  % 4 = 1
      { crop: 'CORN',  letterIndex: 2 },  // 2  % 4 = 2  (collision but soft)
      { crop: 'RICE',  letterIndex: 17 }, // 17 % 4 = 1
    ], 4),
    fallMs: 5_000,
    spawnGapMs: 2_400,
    hasCollisions: false,
  },
  {
    label: 'TWIST',
    bucketCount: 4,
    stream: buildStream([
      { crop: 'OAT',    letterIndex: 14 }, // 2
      { crop: 'PEA',    letterIndex: 15 }, // 3
      { crop: 'KALE',   letterIndex: 10 }, // 2
      { crop: 'YAM',    letterIndex: 24 }, // 0
      { crop: 'FIG',    letterIndex: 5 },  // 1
      { crop: 'PLUM',   letterIndex: 15 }, // 3
      { crop: 'BEET',   letterIndex: 1 },  // 1
      { crop: 'NUT',    letterIndex: 13 }, // 1
    ], 4),
    fallMs: 3_800,
    spawnGapMs: 1_500,
    hasCollisions: false,
  },
  {
    label: 'MASTER',
    bucketCount: 4,
    stream: buildStream([
      { crop: 'WHEAT', letterIndex: 22 },
      { crop: 'CORN',  letterIndex: 2  },  // collides with WHEAT (both → 2)
      { crop: 'RYE',   letterIndex: 17 },
      { crop: 'BEAN',  letterIndex: 1  },  // collides with RYE (both → 1)
      { crop: 'OAT',   letterIndex: 14 },
      { crop: 'PEA',   letterIndex: 15 },
      { crop: 'KALE',  letterIndex: 10 },
      { crop: 'YAM',   letterIndex: 24 },
      { crop: 'FIG',   letterIndex: 5  },
      { crop: 'PLUM',  letterIndex: 15 },
      { crop: 'BEET',  letterIndex: 1  },
      { crop: 'NUT',   letterIndex: 13 },
    ], 4),
    fallMs: 2_600,
    spawnGapMs: 900,
    hasCollisions: true,
  },
];

// ============================================================================
// AP_4 — Two-sum (the complement technique)
// ============================================================================

export const TWO_SUM_ROUNDS = [
  { values: [3, 6, 2, 7, 4], target: 9, answer: [3, 6] },
  { values: [5, 1, 8, 4, 2], target: 10, answer: [8, 2] },
  { values: [7, 11, 6, 13, 4], target: 17, answer: [11, 6] },
] as const;

export interface TwoSumRoundConfig {
  readonly label: 'TEACH' | 'TWIST' | 'MASTER';
  readonly values: ReadonlyArray<number>;
  readonly target: number;
  /** All valid (a,b) pairs ordered with a < b for hint display. */
  readonly validPairs: ReadonlyArray<readonly [number, number]>;
  /** Total seconds for the round (Master tightens this). */
  readonly seconds: number;
}

function allValidPairs(values: ReadonlyArray<number>, target: number): ReadonlyArray<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] + values[j] === target) {
        const lo = Math.min(values[i], values[j]);
        const hi = Math.max(values[i], values[j]);
        out.push([lo, hi] as const);
      }
    }
  }
  return out;
}

export const TWO_SUM_ROUND_CONFIGS: ReadonlyArray<TwoSumRoundConfig> = (() => {
  // TEACH: target 9 satisfied by (1,8) and (3,6) — two valid pairs so a
  // single missed click still leaves a path forward.
  const teach = { label: 'TEACH' as const, values: [1, 3, 5, 6, 8],            target: 9,  seconds: 25 };
  const twist = { label: 'TWIST' as const, values: [2, 4, 6, 8, 11, 13, 7, 1], target: 15, seconds: 20 };
  const master = { label: 'MASTER' as const, values: [5, 8, 12, 19, 7, 17, 1, 11, 3], target: 24, seconds: 18 };
  return [teach, twist, master].map((r) => ({
    ...r,
    validPairs: allValidPairs(r.values, r.target),
  }));
})();

export function isTwoSumPair(values: readonly number[], target: number, selected: readonly number[]): boolean {
  if (selected.length !== 2) return false;
  if (selected[0] === selected[1]) return false;
  if (!selected.every((value) => values.includes(value))) return false;
  return selected[0] + selected[1] === target;
}

/** Complement of `value` for a given target (what the player needs to find). */
export function complementOf(value: number, target: number): number {
  return target - value;
}

// ============================================================================
// Shared
// ============================================================================

export function getSortingEducationalTooltip(): string {
  return "Compare adjacent elements and swap if out of order. Bubble sort is O(n^2) comparisons; efficient sorts use O(n log n) like merge/quick.";
}

/** Star rating helper shared by every Array Plains scene. */
export function starsFromMistakesAndHints(mistakes: number, hintsUsed: number): 1 | 2 | 3 {
  if (mistakes === 0 && hintsUsed === 0) return 3;
  if (mistakes <= 2 && hintsUsed <= 1) return 2;
  return 1;
}
