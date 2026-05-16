/**
 * Twin Rivers puzzle logic — first-principles round data.
 *
 * Each puzzle is interactive: the player operates pointers/windows on a row of
 * values and *performs* the algorithm. This module encodes the round inputs
 * (starting array, target, window size) and provides pure functions that the
 * scene uses to validate state and detect completion.
 *
 * 4-round difficulty curve mirrors Array Plains:
 *   TEACH   — small input, the rule is forgiving.
 *   TWIST   — extra length, hint pressure.
 *   MASTER  — textbook hard case for the pattern.
 *   MASTER+ — adversarial input that rewards understanding the *invariant*
 *             behind the pattern (sorted-ness, monotonicity, repeating chars).
 *
 * Every round carries a `lesson` block consumed by the `LessonCard` widget.
 */

import type { RoundLabel, RoundLesson } from './arrayPlainsPuzzleLogic';

// ----- P2_1 Mirror Walk: in-place reverse via two converging pointers -----

export interface MirrorWalkRound {
  /** Starting values. The player must produce the reverse of this array. */
  values: ReadonlyArray<number>;
  readonly label?: RoundLabel;
  readonly lesson?: RoundLesson;
}

export const MIRROR_WALK_ROUNDS: ReadonlyArray<MirrorWalkRound> = [
  {
    values: [3, 8, 1, 4, 7, 2],
    label: 'TEACH',
    lesson: {
      title: 'Two pointers, walking inward',
      subtitle: 'Round 1 · Teach',
      bullets: [
        'Place L at the start, R at the end.',
        'Swap arr[L] with arr[R], then step both inward.',
        'When L meets R, the row is reversed.',
      ],
    },
  },
  {
    values: [9, 1, 5, 3, 6, 4, 7],
    label: 'TWIST',
    lesson: {
      title: 'Odd length has a fixed centre',
      subtitle: 'Round 2 · Twist',
      bullets: [
        'When the row length is odd, the middle element doesn\'t move.',
        'L and R cross instead of meeting — that\'s your stop condition.',
        'No extra storage. The reverse happens in place.',
      ],
    },
  },
  {
    values: [4, 7, 2, 8, 6, 1, 5, 9],
    label: 'MASTER',
    lesson: {
      title: '⌊n/2⌋ swaps · O(n) total',
      subtitle: 'Round 3 · Master',
      bullets: [
        'You make exactly floor(n/2) swaps.',
        'Each swap is a constant-time operation.',
        'In-place reverse is O(n) time, O(1) space.',
      ],
      comparison: 'in-place O(1) space  ·  copy-then-reverse O(n) space',
    },
  },
  // MASTER+: 12 elements with deliberate repeats. The reverse algorithm
  // doesn't care about value collisions — but the player might second-guess
  // it. Teaches: the algorithm is positional, not value-based.
  {
    values: [3, 7, 3, 1, 4, 7, 2, 4, 8, 1, 6, 3],
    label: 'MASTER+',
    lesson: {
      title: 'Reverse doesn\'t look at values',
      subtitle: 'Round 4 · Master+',
      bullets: [
        'Repeated values change nothing — reverse is positional.',
        'L and R swap whatever is under them. The values are opaque.',
        "If you can swap by index, you can reverse anything: numbers, runes, sound samples.",
      ],
    },
  },
];

export function reversedTarget(values: ReadonlyArray<number>): number[] {
  return [...values].reverse();
}

export function arrayEquals(a: ReadonlyArray<number>, b: ReadonlyArray<number>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// ----- P2_2 Pointer Bridge: sorted two-sum -----

export interface PointerBridgeRound {
  /** Sorted ascending. */
  values: ReadonlyArray<number>;
  target: number;
  readonly label?: RoundLabel;
  readonly lesson?: RoundLesson;
}

export const POINTER_BRIDGE_ROUNDS: ReadonlyArray<PointerBridgeRound> = [
  {
    values: [1, 3, 5, 8, 11, 14, 18],
    target: 19,
    label: 'TEACH',
    lesson: {
      title: 'Sorted unlocks convergent walk',
      subtitle: 'Round 1 · Teach',
      bullets: [
        'Stand at both ends. Sum the two stones.',
        'If too small, advance the west foot east (larger).',
        'If too big, retreat the east foot west (smaller).',
      ],
    },
  },
  {
    values: [2, 4, 6, 9, 12, 15, 20, 23],
    target: 21,
    label: 'TWIST',
    lesson: {
      title: 'The move is forced',
      subtitle: 'Round 2 · Twist',
      bullets: [
        'Only one pointer can ever improve the sum.',
        "Pushing the wrong pointer can't help — there are no smaller values left of left, no larger right of right.",
        'Every step trims a whole swath of pairs you don\'t have to check.',
      ],
    },
  },
  {
    values: [1, 2, 5, 7, 10, 13, 17, 21, 26],
    target: 28,
    label: 'MASTER',
    lesson: {
      title: 'O(n) on sorted ⇒ huge speedup',
      subtitle: 'Round 3 · Master',
      bullets: [
        "Pointer bridge is O(n) on a sorted row.",
        'Check-all-pairs is O(n²).',
        "At n = 9, that's 9 steps vs 36. At n = 1000, it's a million.",
      ],
      comparison: 'sorted two-sum  O(n)  ·  unsorted check-all-pairs  O(n²)',
    },
  },
  // MASTER+: 14 sorted values, target placed near the middle so the walk
  // must traverse most of the row. Designed to make the linear-walk feel
  // earned — short-circuit cheating doesn't work.
  {
    values: [1, 2, 4, 5, 7, 9, 11, 13, 16, 19, 22, 26, 30, 35],
    target: 27,
    label: 'MASTER+',
    lesson: {
      title: 'No matter where the answer hides…',
      subtitle: 'Round 4 · Master+',
      bullets: [
        '14 stones, one valid sum — and you find it in ≤14 moves.',
        'Brute force would check 91 pairs.',
        "The sorted-walk doesn't care *where* the pair is. The walk converges every time.",
      ],
      comparison: '14·13/2 = 91 pair-checks  vs.  ≤ 14 walk steps',
    },
  },
];

/** Direction the algorithm forces given current pointer sum vs target. */
export type PointerDirective = 'lock' | 'advance_left' | 'retreat_right';

export function pointerDirective(
  sum: number,
  target: number
): PointerDirective {
  if (sum === target) return 'lock';
  return sum < target ? 'advance_left' : 'retreat_right';
}

// ----- P2_3 Fixed Window Dock: max-sum sliding window -----

export interface FixedWindowRound {
  values: ReadonlyArray<number>;
  windowSize: number;
  readonly label?: RoundLabel;
  readonly lesson?: RoundLesson;
}

export const FIXED_WINDOW_ROUNDS: ReadonlyArray<FixedWindowRound> = [
  {
    values: [2, 7, 1, 9, 4, 5, 3, 6],
    windowSize: 3,
    label: 'TEACH',
    lesson: {
      title: 'Slide, don\'t restart',
      subtitle: 'Round 1 · Teach',
      bullets: [
        'Each slide drops one number off the left and adds one on the right.',
        "Don't re-add the middle — it didn't change.",
        'New sum = old sum − leaver + arrival.',
      ],
    },
  },
  {
    values: [5, 2, 8, 1, 4, 7, 3, 9, 6, 2],
    windowSize: 4,
    label: 'TWIST',
    lesson: {
      title: 'Bigger windows pay off more',
      subtitle: 'Round 2 · Twist',
      bullets: [
        'With window size k, recomputing every step is O(k) per slide.',
        'Sliding is O(1) per slide regardless of k.',
        "At k = 4 you're already 4× faster than the naïve approach.",
      ],
    },
  },
  {
    values: [1, 1, 1, 8, 2, 1, 1, 9, 1, 1, 1],
    windowSize: 3,
    label: 'MASTER',
    lesson: {
      title: 'Track the best as you go',
      subtitle: 'Round 3 · Master',
      bullets: [
        'Maintain a `best` while sliding — don\'t scan at the end.',
        'O(n) total, even when most windows are dull.',
        "The expensive part is bookkeeping, not searching.",
      ],
      comparison: 'recompute each window  O(n·k)  ·  slide  O(n)',
    },
  },
  // MASTER+: 14 slats, window 5, with a *fake-best* prefix. Looks rich early
  // (9+8+...), then dips, then the real best lies hidden mid-stream.
  // Teaches: don't lock in `best` until you've slid the whole way.
  {
    values: [9, 8, 1, 1, 1, 6, 2, 9, 7, 8, 3, 1, 1, 1],
    windowSize: 5,
    label: 'MASTER+',
    lesson: {
      title: 'The early high is a decoy',
      subtitle: 'Round 4 · Master+',
      bullets: [
        "First five slats sum 20 — looks great, but you haven't slid yet.",
        "Sliding past the dip uncovers a 32-sum window.",
        "The window doesn't know what's coming. You must slide all the way.",
      ],
    },
  },
];

export function windowSumAt(
  values: ReadonlyArray<number>,
  start: number,
  size: number
): number {
  let sum = 0;
  for (let i = start; i < start + size && i < values.length; i++) sum += values[i];
  return sum;
}

export function bestFixedWindowStart(
  values: ReadonlyArray<number>,
  size: number
): number {
  let bestStart = 0;
  let bestSum = windowSumAt(values, 0, size);
  for (let start = 1; start + size <= values.length; start++) {
    const s = windowSumAt(values, start, size);
    if (s > bestSum) {
      bestSum = s;
      bestStart = start;
    }
  }
  return bestStart;
}

// ----- P2_4 Current Rider: longest substring without repeats -----

export interface CurrentRiderRound {
  letters: ReadonlyArray<string>;
  readonly label?: RoundLabel;
  readonly lesson?: RoundLesson;
}

export const CURRENT_RIDER_ROUNDS: ReadonlyArray<CurrentRiderRound> = [
  {
    letters: ['A', 'B', 'C', 'A', 'D', 'B', 'E', 'F'],
    label: 'TEACH',
    lesson: {
      title: 'Stretch right, shrink left',
      subtitle: 'Round 1 · Teach',
      bullets: [
        'Extend R while the window stays unique.',
        'If R duplicates something in the window, slide L past the duplicate.',
        'Best length seen is your answer.',
      ],
    },
  },
  {
    letters: ['R', 'I', 'V', 'E', 'R', 'B', 'A', 'N', 'K'],
    label: 'TWIST',
    lesson: {
      title: 'The window adapts',
      subtitle: 'Round 2 · Twist',
      bullets: [
        "L never goes backwards — once a position is left behind, it stays behind.",
        'That\'s why it\'s O(n): each pointer crosses each letter at most once.',
        'No restarts. No double-checks.',
      ],
    },
  },
  {
    letters: ['M', 'I', 'R', 'R', 'O', 'R', 'W', 'A', 'T', 'E', 'R'],
    label: 'MASTER',
    lesson: {
      title: 'Index lookup ⇒ O(1) shrink',
      subtitle: 'Round 3 · Master',
      bullets: [
        'When R sees a duplicate, you can jump L past the previous occurrence.',
        'A hash map of letter → last-index makes that jump O(1).',
        'Total time: still O(n), even with the jumps.',
      ],
      comparison: 'check-all-substrings O(n³)  ·  sliding window O(n)',
    },
  },
  // MASTER+: 16 letters with three runs of duplicates that force L to jump
  // far. The longest-unique substring is at the very end — you have to
  // play the algorithm through to confirm.
  {
    letters: ['A', 'L', 'G', 'O', 'R', 'I', 'T', 'H', 'M', 'I', 'A', 'P', 'L', 'A', 'N', 'S'],
    label: 'MASTER+',
    lesson: {
      title: 'The answer can hide at the end',
      subtitle: 'Round 4 · Master+',
      bullets: [
        '"ALGORITHM" looks like the answer (9 letters, all unique) — until you hit "I".',
        'Then L jumps. Then "M". Then "A". Then "L". The window keeps adapting.',
        'You can\'t guess the best length from the first scan — you slide through.',
      ],
    },
  },
];

export function hasDuplicateInRange(
  letters: ReadonlyArray<string>,
  left: number,
  right: number
): boolean {
  const seen = new Set<string>();
  for (let i = left; i <= right; i++) {
    if (seen.has(letters[i])) return true;
    seen.add(letters[i]);
  }
  return false;
}

export function longestUniqueWindowLength(letters: ReadonlyArray<string>): number {
  let best = 0;
  let left = 0;
  const seen = new Map<string, number>();
  for (let right = 0; right < letters.length; right++) {
    const ch = letters[right];
    const prev = seen.get(ch);
    if (prev !== undefined && prev >= left) left = prev + 1;
    seen.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}

// ----- Boss Mirror Serpent: three-phase combination -----

export interface MirrorSerpentPhases {
  reverse: MirrorWalkRound;
  twoSum: PointerBridgeRound;
  fixedWindow: FixedWindowRound;
}

export const MIRROR_SERPENT_PHASES: MirrorSerpentPhases = {
  reverse: { values: [5, 2, 8, 4, 7, 1, 6, 3] },
  twoSum: { values: [1, 4, 6, 7, 9, 12, 16, 21], target: 23 },
  fixedWindow: { values: [3, 1, 8, 5, 2, 9, 4, 6, 7, 3], windowSize: 4 },
};
