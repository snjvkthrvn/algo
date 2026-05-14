/**
 * Twin Rivers puzzle logic — first-principles round data.
 *
 * Each puzzle is interactive: the player operates pointers/windows on a row of
 * values and *performs* the algorithm. This module encodes the round inputs
 * (starting array, target, window size) and provides pure functions that the
 * scene uses to validate state and detect completion.
 */

// ----- P2_1 Mirror Walk: in-place reverse via two converging pointers -----

export interface MirrorWalkRound {
  /** Starting values. The player must produce the reverse of this array. */
  values: ReadonlyArray<number>;
}

export const MIRROR_WALK_ROUNDS: ReadonlyArray<MirrorWalkRound> = [
  { values: [3, 8, 1, 4, 7, 2] },
  { values: [9, 1, 5, 3, 6, 4, 7] },
  { values: [4, 7, 2, 8, 6, 1, 5, 9] },
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
}

export const POINTER_BRIDGE_ROUNDS: ReadonlyArray<PointerBridgeRound> = [
  { values: [1, 3, 5, 8, 11, 14, 18], target: 19 },
  { values: [2, 4, 6, 9, 12, 15, 20, 23], target: 21 },
  { values: [1, 2, 5, 7, 10, 13, 17, 21, 26], target: 28 },
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
}

export const FIXED_WINDOW_ROUNDS: ReadonlyArray<FixedWindowRound> = [
  { values: [2, 7, 1, 9, 4, 5, 3, 6], windowSize: 3 },
  { values: [5, 2, 8, 1, 4, 7, 3, 9, 6, 2], windowSize: 4 },
  { values: [1, 1, 1, 8, 2, 1, 1, 9, 1, 1, 1], windowSize: 3 },
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
}

export const CURRENT_RIDER_ROUNDS: ReadonlyArray<CurrentRiderRound> = [
  { letters: ['A', 'B', 'C', 'A', 'D', 'B', 'E', 'F'] },
  { letters: ['R', 'I', 'V', 'E', 'R', 'B', 'A', 'N', 'K'] },
  { letters: ['M', 'I', 'R', 'R', 'O', 'R', 'W', 'A', 'T', 'E', 'R'] },
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
