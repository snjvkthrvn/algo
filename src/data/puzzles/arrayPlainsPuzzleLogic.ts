/**
 * Array Plains puzzle logic — pure data + helpers shared by every AP scene.
 *
 * Region verb: ORGANIZE. Every sub-puzzle expresses it differently
 *   AP_1 swap neighbours   → bubble sort
 *   AP_2 jump to address   → indexing
 *   AP_3 hash → bucket     → modulo routing
 *   AP_4 complement search → two-sum
 *
 * Each puzzle ships a 4-round difficulty curve:
 *   TEACH   — introduces the rule on a small input.
 *   TWIST   — adds a wrinkle (more inversions, faster spawn, fewer hints).
 *   MASTER  — the textbook worst case.
 *   MASTER+ — an adversarial round designed to reward *understanding*
 *             rather than reflexes — near-sorted edge cases, label fades,
 *             colliding-key streams, single-pair haystacks, etc.
 *
 * Every round carries a `lesson` block that the `LessonCard` widget renders
 * between rounds — surfacing the algorithmic *why* the round exists.
 * Pure helpers stay free of Phaser so they can be unit-tested in Node.
 */

// ============================================================================
// Shared types
// ============================================================================

export type RoundLabel = 'TEACH' | 'TWIST' | 'MASTER' | 'MASTER+';

import { PuzzlePhase } from '../types';

export interface RoundLesson {
  readonly title: string;
  readonly subtitle?: string;
  readonly bullets: ReadonlyArray<string>;
  /** Optional comparison line, e.g. "O(n²) brute vs O(n) walk". */
  readonly comparison?: string;
  /**
   * Pedagogical phase for this round. Absent = USE_IT (default current
   * behavior). FEEL_IT round skips pseudocode trace, formal algorithm
   * name, and lesson-card mounting in favor of a Glitch brute-force
   * co-actor + diegetic objective only. See PuzzlePhase docs.
   */
  readonly phase?: PuzzlePhase;
  /**
   * NAME_IT dialogue beat — fired AFTER this round completes if
   * `phase === FEEL_IT`. NPC names the pattern the player just felt.
   * Should be the literal script line. Unused when phase !== FEEL_IT.
   */
  readonly nameItBeat?: {
    readonly speaker: string;
    readonly line: string;
  };
}

// ============================================================================
// AP_1 — Bubble sort (compare-and-swap neighbours)
// ============================================================================

export const BUBBLE_SORT_START = [4, 1, 3, 0, 2];

export interface BubbleRound {
  readonly label: RoundLabel;
  /** Starting permutation; the player sorts these into ascending order. */
  readonly values: ReadonlyArray<number>;
  /** Soft time budget for star rating; not a hard fail. */
  readonly targetTimeMs: number;
  /** Star-cap reference for "optimal" number of swaps (inversion count). */
  readonly optimalSwaps: number;
  readonly lesson: RoundLesson;
}

export const BUBBLE_SORT_ROUNDS: ReadonlyArray<BubbleRound> = [
  // Round 1 (FEEL_IT): 4 tiles, 3 inversions. The player should NEVER read
  // about "Bubble Sort" here — they discover that swapping adjacent
  // out-of-order pairs works, while Glitch flails with random swaps. The
  // algorithm is named between this round and round 2 via the script's
  // NAME_IT beat. The starting state needs enough chaos that random-swap
  // brute force is visibly worse than directed swaps; one-inversion inputs
  // let Glitch luck into a solve on tick 1 and collapse the contrast.
  {
    label: 'TEACH',
    values: [3, 1, 4, 2],
    targetTimeMs: 20_000,
    optimalSwaps: 3,
    lesson: {
      title: 'Fix the row',
      subtitle: 'Round 1',
      bullets: [
        'The furrows grew in the wrong order.',
        'Make them stand shortest to tallest.',
        'Glitch is trying their way. See if you can do better.',
      ],
      phase: PuzzlePhase.FEEL_IT,
      nameItBeat: {
        speaker: 'Sorting Farmer',
        line: 'What you just did — swapping neighbours over and over — that\'s called Bubble Sort. Simple, honest, reliable. The big numbers bubble up to the end, one swap at a time.',
      },
    },
  },
  // Round 2 (Twist): 6 tiles, several inversions, more passes required.
  // 8 inversions: (5,2),(5,4),(5,1),(5,3),(2,1),(4,1),(4,3),(6,3).
  {
    label: 'TWIST',
    values: [5, 2, 4, 1, 6, 3],
    targetTimeMs: 30_000,
    optimalSwaps: 8,
    lesson: {
      title: 'Pass after pass',
      subtitle: 'Round 2 · Twist',
      bullets: [
        'After one full sweep, the heaviest value lands at the end.',
        'The next sweep needs one less comparison.',
        "Don't redo work — the tail is locked.",
      ],
    },
  },
  // Round 3 (Master): 8 tiles reversed — bubble sort's worst case.
  {
    label: 'MASTER',
    values: [8, 7, 6, 5, 4, 3, 2, 1],
    targetTimeMs: 45_000,
    optimalSwaps: 28,
    lesson: {
      title: 'The long row',
      subtitle: 'Round 3 · Master',
      bullets: [
        'A fully backwards row is the hardest field there is.',
        'Every crate must trade past every other one.',
        'Feel how the work grows much faster than the row does.',
      ],
    },
  },
  // Round 4 (Master+): 10 tiles, *almost* sorted with one inversion at the end.
  // Teaches the algorithm's terminating condition — "no swap in a full pass".
  // Inversions: only (10,9) and a single swap restores sorted order, so
  // optimalSwaps = 1, but the player must *check* the whole row to know.
  {
    label: 'MASTER+',
    values: [1, 2, 3, 4, 5, 6, 7, 8, 10, 9],
    targetTimeMs: 22_000,
    optimalSwaps: 1,
    lesson: {
      title: 'Recognize the fixed point',
      subtitle: 'Round 4 · Master+',
      bullets: [
        'Bubble sort terminates when a full pass makes zero swaps.',
        "If you don't check, you keep working a sorted row.",
        'A near-sorted row is the easiest field: one pass and done.',
      ],
    },
  },
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
  readonly label: RoundLabel;
  /** How many baskets exist this round (laid out 0..basketCount-1). */
  readonly basketCount: number;
  /** Ordered list of fetch requests the player must complete. */
  readonly requests: ReadonlyArray<IndexingRequest>;
  /** Per-request time budget (seconds). */
  readonly secondsPerRequest: number;
  /** If true, basket labels fade after `obscureAfterMs` while the request stays visible. */
  readonly obscureLabels: boolean;
  readonly obscureAfterMs: number;
  readonly lesson: RoundLesson;
}

export const INDEXING_ROUNDS: ReadonlyArray<IndexingRound> = [
  // Round 1 (FEEL_IT): 1 fetch, 5 baskets. The player should NEVER read
  // about "O(1) direct address" here — they discover that knowing the
  // number lets them jump straight to the basket. Glitch demonstrates the
  // alternative: opening each basket in order until finding the item. The
  // contrast (1 tap vs N checks) IS the teaching. Algorithm named between
  // this round and round 2 via the script's NAME_IT beat.
  {
    label: 'TEACH',
    basketCount: 5,
    requests: [{ item: 'rope', index: 3 }],
    secondsPerRequest: 8,
    obscureLabels: false,
    obscureAfterMs: 0,
    lesson: {
      title: 'Find the rope',
      subtitle: 'Round 1',
      bullets: [
        'The Basket Keeper needs the rope.',
        'You can see which basket holds it. Glitch is checking them one by one.',
        'Help the Keeper before Glitch does.',
      ],
      phase: PuzzlePhase.FEEL_IT,
      nameItBeat: {
        speaker: 'Basket Keeper',
        line: 'That\'s called Indexing. You didn\'t waste time checking every basket — when you know the number, you jump straight to the answer.',
      },
    },
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
    lesson: {
      title: 'Shelf width is free',
      subtitle: 'Round 2 · Twist',
      bullets: [
        'A wider shelf changes nothing for indexed lookup.',
        '5 baskets or 80, the cost is the same: one jump.',
        'Length is the search algorithm\'s enemy, not yours.',
      ],
      comparison: 'index  O(1)   ·   linear scan  O(n)',
    },
  },
  // Round 3 (Master): 5 fetches on a 10-basket shelf; labels fade after 2s.
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
    lesson: {
      title: 'Commit to the address',
      subtitle: 'Round 3 · Master',
      bullets: [
        'The number you read once is the number you remember.',
        'Indexing relies on the address — not the label still being visible.',
        'In memory there are no labels at all. Only addresses.',
      ],
    },
  },
  // Round 4 (Master+): 7 fetches, 16-basket shelf, labels fade immediately.
  // Tests "I committed to the address" without ever showing the labels.
  {
    label: 'MASTER+',
    basketCount: 16,
    requests: [
      { item: 'rope', index: 12 },
      { item: 'gear', index: 3 },
      { item: 'seed', index: 15 },
      { item: 'hammer', index: 7 },
      { item: 'wrench', index: 11 },
      { item: 'shovel', index: 0 },
      { item: 'rake', index: 9 },
    ],
    secondsPerRequest: 3,
    obscureLabels: true,
    obscureAfterMs: 0,
    lesson: {
      title: 'Address is the data',
      subtitle: 'Round 4 · Master+',
      bullets: [
        'Labels are a player aid. The algorithm never needed them.',
        'arr[i] is a memory offset — i is the entire instruction.',
        'Glitch would scan all 16. You ask the index. One move.',
      ],
      comparison: 'index O(1)  ·  scan O(n) ⇒  ×n speedup',
    },
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
  readonly label: RoundLabel;
  readonly bucketCount: number;
  /** Ordered stream of crops that fall during the round. */
  readonly stream: ReadonlyArray<FallingCrop>;
  /** Fall duration in ms. Lower = faster = harder. */
  readonly fallMs: number;
  /** Spacing between successive crop spawns. */
  readonly spawnGapMs: number;
  /** Mark this round if multiple crops legitimately hash to the same bucket. */
  readonly hasCollisions: boolean;
  readonly lesson: RoundLesson;
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
    lesson: {
      title: 'Sort the harvest',
      subtitle: 'Round 1',
      bullets: [
        'Crops are falling. Each one has its own bucket — the Keeper marks the number on the sack.',
        'Glitch is over there tossing crops into random buckets.',
        'Land each crop where it belongs before it hits the ground.',
      ],
      phase: PuzzlePhase.FEEL_IT,
      nameItBeat: {
        speaker: 'Hash Keeper',
        line: 'That\'s HASHING! You took something complex and turned it into something simple! The really cool part? It doesn\'t matter how many crops come through. Same formula, same speed. One crop or a million.',
      },
    },
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
    lesson: {
      title: 'Buckets are independent',
      subtitle: 'Round 2 · Twist',
      bullets: [
        'Whatever is in bucket 1 is irrelevant to bucket 3.',
        'A faster stream doesn\'t change the rule.',
        'Same crop, same bucket. Forever.',
      ],
    },
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
    lesson: {
      title: 'Collisions are not bugs',
      subtitle: 'Round 3 · Master',
      bullets: [
        'Two keys can hash to the same bucket. That\'s allowed.',
        'The bucket holds a *list* of items, not a single one.',
        'Real hash tables resolve collisions with chaining or probing.',
      ],
    },
  },
  // Round 4 (Master+): 6 buckets, 16 crops, dense collisions, faster fall.
  // Teaches: changing the *modulus* changes the distribution.
  {
    label: 'MASTER+',
    bucketCount: 6,
    stream: buildStream([
      { crop: 'WHEAT', letterIndex: 22 }, // 22 % 6 = 4
      { crop: 'OAT',   letterIndex: 14 }, // 14 % 6 = 2
      { crop: 'BEAN',  letterIndex: 1  }, // 1  % 6 = 1
      { crop: 'CORN',  letterIndex: 2  }, // 2  % 6 = 2  (collide with OAT)
      { crop: 'FIG',   letterIndex: 5  }, // 5  % 6 = 5
      { crop: 'YAM',   letterIndex: 24 }, // 24 % 6 = 0
      { crop: 'RICE',  letterIndex: 17 }, // 17 % 6 = 5  (collide with FIG)
      { crop: 'PEA',   letterIndex: 15 }, // 15 % 6 = 3
      { crop: 'KALE',  letterIndex: 10 }, // 10 % 6 = 4  (collide with WHEAT)
      { crop: 'NUT',   letterIndex: 13 }, // 13 % 6 = 1  (collide with BEAN)
      { crop: 'RYE',   letterIndex: 17 }, // 17 % 6 = 5  (collide with FIG, RICE)
      { crop: 'PLUM',  letterIndex: 15 }, // 15 % 6 = 3  (collide with PEA)
      { crop: 'BEET',  letterIndex: 1  }, // 1  % 6 = 1  (collide with BEAN, NUT)
      { crop: 'HEMP',  letterIndex: 7  }, // 7  % 6 = 1
      { crop: 'FLAX',  letterIndex: 5  }, // 5  % 6 = 5
      { crop: 'SAGE',  letterIndex: 18 }, // 18 % 6 = 0
    ], 6),
    fallMs: 2_000,
    spawnGapMs: 750,
    hasCollisions: true,
    lesson: {
      title: 'The modulus is the design',
      subtitle: 'Round 4 · Master+',
      bullets: [
        'A bigger modulus = more buckets = fewer collisions per bucket.',
        'But you pay in memory. Hash table tuning is balance.',
        'For random keys, expected lookup remains O(1).',
      ],
      comparison: 'expected O(1)  ·  pathological O(n)',
    },
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
  readonly label: RoundLabel;
  readonly values: ReadonlyArray<number>;
  readonly target: number;
  /** All valid (a,b) pairs ordered with a < b for hint display. */
  readonly validPairs: ReadonlyArray<readonly [number, number]>;
  /** Total seconds for the round (Master tightens this). */
  readonly seconds: number;
  readonly lesson: RoundLesson;
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
  // Round 1 (FEEL_IT): 5 tiles, target 9. The player should NEVER read about
  // "complement" or "two sum" here — they discover that, given a target, they
  // can pick one tile and *know* what its partner must be without checking
  // every other pair. Glitch demonstrates the alternative: try every pair in
  // sequence and watch the check count explode. The architecturally novel
  // bit: NAME_IT is spoken by GLITCH (not a friendly NPC) — per the script,
  // this is Glitch's first genuine learning moment, the crack in their
  // brash attitude. They've just brute-forced 10 checks; the player did 1.
  const teach = {
    label: 'TEACH' as const,
    values: [1, 3, 5, 6, 8],
    target: 9,
    seconds: 25,
    lesson: {
      title: 'A Tile Worker waits',
      subtitle: 'Round 1',
      bullets: [
        'The Pairing Grounds demand a match.',
        'Pick a runestone, then find exactly what it needs to reach the target.',
        'Glitch is trying every pair in turn. See if you can beat them.',
      ],
      phase: PuzzlePhase.FEEL_IT,
      nameItBeat: {
        speaker: 'Glitch',
        line: 'Wait. WAIT. You just... knew what it needed? You turned it from check everything into check one thing? That\'s — that\'s the *complement*. I was checking pair after pair. You looked once. ...can you teach me that?',
      },
    },
  };
  const twist = {
    label: 'TWIST' as const,
    values: [2, 4, 6, 8, 11, 13, 7, 1],
    target: 15,
    seconds: 20,
    lesson: {
      title: 'A bigger field, same idea',
      subtitle: 'Round 2 · Twist',
      bullets: [
        'More tiles means more decoys.',
        'Your complement is still a single number.',
        'Naïve check-every-pair is n·(n−1)/2 — start counting at 8 tiles.',
      ],
    },
  };
  const master = {
    label: 'MASTER' as const,
    values: [5, 8, 12, 19, 7, 17, 1, 11, 3],
    target: 24,
    seconds: 18,
    lesson: {
      title: 'Memorize what you\'ve seen',
      subtitle: 'Round 3 · Master',
      bullets: [
        'For each new tile, ask: have I already seen target − v?',
        'A hash set turns that question into O(1).',
        'Total work: one pass. O(n). Beats every double-loop solution.',
      ],
      comparison: 'check-all-pairs O(n²)  ·  hash-set walk O(n)',
    },
  };
  // MASTER+: 9 tiles, ONE valid pair (4+27=31), 14s budget. Stays within
  // number-key reach (1–9) so keyboard control still covers every tile.
  // All other values fall in [17..27] so no other pair gets close to 31 —
  // brute force still pays the 36-check tax, while the hash-set walk
  // finishes in 9 steps.
  const masterPlus = {
    label: 'MASTER+' as const,
    values: [17, 19, 4, 26, 22, 18, 27, 24, 23],
    target: 31,
    seconds: 14,
    lesson: {
      title: 'One pair in the haystack',
      subtitle: 'Round 4 · Master+',
      bullets: [
        'Only one pair sums to 31. Find it without checking every pair.',
        'Walk once. For each value v, ask: have I seen 31 − v?',
        'Hash sets remember in O(1). That\'s the whole speedup.',
      ],
      comparison: '9·8/2 = 36 brute-force checks  ·  walk + hash = 9 checks',
    },
  };
  return [teach, twist, master, masterPlus].map((r) => ({
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

/**
 * Star rating helper shared by every Array Plains scene.
 *
 * Tightened scoring (after the difficulty overhaul):
 *   3 stars — flawless run: no mistakes, no hints.
 *   2 stars — near-clean: ≤1 mistake AND ≤1 hint, OR 0 mistakes + 2 hints.
 *   1 star  — completed but with material errors or extensive hint use.
 *
 * The scene calls `withOptimalityPenalty` separately to deduct a star when
 * the player overshoots the optimal move count (extra swaps, extra fetches).
 */
export function starsFromMistakesAndHints(mistakes: number, hintsUsed: number): 1 | 2 | 3 {
  if (mistakes === 0 && hintsUsed === 0) return 3;
  if (mistakes <= 1 && hintsUsed <= 1) return 2;
  if (mistakes === 0 && hintsUsed <= 2) return 2;
  return 1;
}

/**
 * Apply an optimality penalty: drop one star (minimum 1) if the player used
 * more moves than `optimal`. Used by Bubble Sort and Pointer-Bridge style
 * puzzles where the algorithm has a known move budget.
 */
export function withOptimalityPenalty(stars: 1 | 2 | 3, movesUsed: number, optimal: number): 1 | 2 | 3 {
  if (optimal <= 0) return stars;
  if (movesUsed <= optimal) return stars;
  return Math.max(1, stars - 1) as 1 | 2 | 3;
}
