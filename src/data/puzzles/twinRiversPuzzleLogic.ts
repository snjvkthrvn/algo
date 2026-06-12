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
import { PuzzlePhase } from '../types';

// ----- P2_1 Mirror Walk: in-place reverse via two converging pointers -----

export interface MirrorWalkRound {
  /** Starting values. The player must produce the reverse of this array. */
  values: ReadonlyArray<number>;
  readonly label?: RoundLabel;
  readonly lesson?: RoundLesson;
}

export const MIRROR_WALK_ROUNDS: ReadonlyArray<MirrorWalkRound> = [
  // Round 1 (FEEL_IT): 6-value row. The player should NEVER read about "two
  // pointers" or "in-place reverse" here — they discover that working from
  // both ends inward is qualitatively different from random swapping. Glitch
  // demonstrates the foil: random swaps anywhere in the row, never converges.
  // Algorithm named between this round and round 2 via the Mirror Walker.
  {
    values: [3, 8, 1, 4, 7, 2],
    label: 'TEACH',
    lesson: {
      phase: PuzzlePhase.FEEL_IT,
      title: 'The river runs backwards',
      subtitle: 'Round 1',
      bullets: [
        'The current flows the wrong way. Reverse it.',
        'You can act on either bank. Glitch is splashing at random.',
        'Find the pattern. Both feet, one mind.',
      ],
      nameItBeat: {
        speaker: 'Mirror Walker',
        line: 'Well walked. What you just did — that\'s called Two Pointers. One mind moving two hands. Not two problems — ONE problem with two tools. When the work meets in the middle, the whole river has turned in half a walk.',
      },
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
      title: 'Half the walk, all the work',
      subtitle: 'Round 3 · Master',
      bullets: [
        'You only ever trade up to the middle.',
        'Each trade costs the same as the last.',
        'No second row, no copies — the river turns where it lies.',
      ],
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
  // Round 1 (FEEL_IT): 7 sorted stones, target 19. The player should NEVER
  // read about "two pointers", "sorted two-sum", or "convergent walk" here —
  // they discover that the sortedness makes the move forced. Glitch checks
  // every pair at random; the player walks from the ends. Algorithm named
  // by the Bridge Keeper between this round and round 2.
  {
    values: [1, 3, 5, 8, 11, 14, 18],
    target: 19,
    label: 'TEACH',
    lesson: {
      phase: PuzzlePhase.FEEL_IT,
      title: 'Two stones, one sum',
      subtitle: 'Round 1',
      bullets: [
        'Find two stones that add to the target.',
        'Glitch is testing every pair at random.',
        'You stand on the banks. The stones are in order. Use it.',
      ],
      nameItBeat: {
        speaker: 'Bridge Keeper',
        line: 'You did not check every stone. You did not check every pair. You walked, and the walk DID the checking for you. That is Two-Pointer Convergence. When the river is in order, your feet become your eyes — one walk across does what a thousand guesses never could.',
      },
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
      title: 'Order is a gift',
      subtitle: 'Round 3 · Master',
      bullets: [
        'Because the stones stand in order, one walk is enough.',
        'Glitch is still guessing pairs back there.',
        'The longer the row, the bigger the gift.',
      ],
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
        'Fourteen stones, one true pair — and one crossing finds it.',
        'Guessing pairs would take all night.',
        "The walk doesn't care where the pair hides. It converges every time.",
      ],
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
  // Round 1 (FEEL_IT): 8-value row, window size 3. The player should NEVER
  // read about "sliding window" or "new sum = old sum − leaver + arrival"
  // here — they discover that only the edges of the window change between
  // slides. Glitch demonstrates the foil: recount every window from scratch.
  // Algorithm named by the Window Fisher between this round and round 2.
  {
    values: [2, 7, 1, 9, 4, 5, 3, 6],
    windowSize: 3,
    label: 'TEACH',
    lesson: {
      phase: PuzzlePhase.FEEL_IT,
      title: 'The heavy catch',
      subtitle: 'Round 1',
      bullets: [
        'Slide your net along the dock. Find the heaviest catch.',
        'Glitch is recounting every slat from scratch.',
        'Watch what enters your net and what leaves it.',
      ],
      nameItBeat: {
        speaker: 'Window Fisher',
        line: 'You saw what most people miss. When the net slides by one, most of what is inside did not change. Only the edges changed. Work on the EDGES. Let the middle keep itself. That is a Sliding Window — and that is how you move fast on a long river.',
      },
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
  // Round 1 (FEEL_IT): 8-letter stream. The player should NEVER read about
  // "variable window" or "shrink left when you see a duplicate" here — they
  // discover the expand-and-shrink rhythm by playing it. Glitch demonstrates
  // the foil: checks every possible substring from scratch. Algorithm named
  // by the Current Rider between this round and round 2.
  {
    letters: ['A', 'B', 'C', 'A', 'D', 'B', 'E', 'F'],
    label: 'TEACH',
    lesson: {
      phase: PuzzlePhase.FEEL_IT,
      title: 'The changing catch',
      subtitle: 'Round 1',
      bullets: [
        'Extend your net while the catch is good.',
        'Shrink the net from the left to drop what spoils it.',
        'Glitch is checking every possible stretch from scratch.',
      ],
      nameItBeat: {
        speaker: 'Current Rider',
        line: 'You let the river TELL you how big your window should be. Most people pick a size and hope. You listened. That is a Variable-Size Window. And that\'s the hardest part of learning — not expanding. SHRINKING. Knowing when to give something up.',
      },
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
