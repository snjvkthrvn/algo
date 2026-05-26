import {
  complementOf,
  firstInversionIndex,
  hashBucket,
  isSortedAscending,
  isTwoSumPair,
  swapAdjacent,
  type IndexingRequest,
} from './arrayPlainsPuzzleLogic';
import {
  hasDuplicateInRange,
  pointerDirective,
  windowSumAt,
} from './twinRiversPuzzleLogic';

export interface PuzzlePreviewModel {
  readonly state: string[];
  readonly next: string;
}

type PreviewValue = string | number;

function formatSequence(values: ReadonlyArray<PreviewValue>): string {
  return `[${values.join(', ')}]`;
}

function valueAt(values: ReadonlyArray<PreviewValue>, index: number): PreviewValue {
  return values[index] ?? '-';
}

export function keyForIndex(index: number): string {
  return index === 9 ? '0' : String(index + 1);
}

export interface BubbleSortPreviewInput {
  readonly values: ReadonlyArray<number>;
  readonly compareIndex?: number;
  readonly swaps: number;
  readonly optimalSwaps: number;
  readonly lastAction?: string;
}

export function buildBubbleSortPreview(input: BubbleSortPreviewInput): PuzzlePreviewModel {
  const compareIndex = input.compareIndex ?? firstInversionIndex(input.values);
  const compareLabel = compareIndex >= 0 && compareIndex < input.values.length - 1
    ? `${compareIndex} (${input.values[compareIndex]} > ${input.values[compareIndex + 1]})`
    : 'none';
  const state = [
    `arr   = ${formatSequence(input.values)}`,
    `i     = ${compareLabel}`,
    `swaps = ${input.swaps} / ${input.optimalSwaps}`,
    `last  = ${input.lastAction ?? 'none'}`,
  ];

  if (isSortedAscending(input.values)) {
    return { state, next: 'No inversion.\nRound complete.' };
  }

  if (compareIndex < 0 || compareIndex >= input.values.length - 1) {
    return { state, next: 'Choose an adjacent pair to compare.' };
  }

  if (input.values[compareIndex] <= input.values[compareIndex + 1]) {
    return {
      state,
      next: `KEY ${keyForIndex(compareIndex)} -> no swap this pair\narr stays ${formatSequence(input.values)}`,
    };
  }

  return {
    state,
    next: `KEY ${keyForIndex(compareIndex)} -> arr = ${formatSequence(swapAdjacent(input.values, compareIndex))}`,
  };
}

export interface IndexingPreviewInput {
  readonly basketCount: number;
  readonly request: IndexingRequest | null;
  readonly requestNumber: number;
  readonly totalRequests: number;
}

export function buildIndexingPreview(input: IndexingPreviewInput): PuzzlePreviewModel {
  const tools = Array.from({ length: input.basketCount }, (_, index) => index);
  if (!input.request) {
    return {
      state: [
        `tools = ${formatSequence(tools)}`,
        'target slot = none',
        `request = ${input.requestNumber}/${input.totalRequests}`,
      ],
      next: 'Round complete.',
    };
  }

  return {
    state: [
      `tools = ${formatSequence(tools)}`,
      `target slot = ${input.request.index}`,
      `item  = ${input.request.item.toUpperCase()}`,
      `request = ${input.requestNumber}/${input.totalRequests}`,
    ],
    next: `KEY ${keyForIndex(input.request.index)} -> tools[${input.request.index}] = ${input.request.item.toUpperCase()}`,
  };
}

interface HashCropPreview {
  readonly crop: string;
  readonly letterIndex: number;
}

export interface HashRoutingPreviewInput {
  readonly crop: HashCropPreview | null;
  readonly bucketCount: number;
  readonly routed: number;
  readonly missed: number;
  readonly total: number;
}

export function buildHashRoutingPreview(input: HashRoutingPreviewInput): PuzzlePreviewModel {
  if (!input.crop) {
    return {
      state: [
        'crop  = waiting',
        `k     = ${input.bucketCount}`,
        `done  = ${input.routed + input.missed}/${input.total}`,
      ],
      next: 'Next crop will reveal key % k.',
    };
  }

  const bucket = hashBucket(input.crop.letterIndex, input.bucketCount);
  return {
    state: [
      `crop  = ${input.crop.crop}`,
      `key   = ${input.crop.letterIndex}`,
      `k     = ${input.bucketCount}`,
      `bucket = ${input.crop.letterIndex} % ${input.bucketCount}`,
      `done  = ${input.routed + input.missed}/${input.total}`,
    ],
    next: `KEY ${keyForIndex(bucket)} -> bucket #${bucket}`,
  };
}

export interface TwoSumPreviewInput {
  readonly values: ReadonlyArray<number>;
  readonly target: number;
  readonly selectedValues: ReadonlyArray<number>;
}

function hasAvailableComplement(
  values: ReadonlyArray<number>,
  selectedValues: ReadonlyArray<number>,
  need: number,
): boolean {
  const selectedCounts = new Map<number, number>();
  for (const value of selectedValues) {
    selectedCounts.set(value, (selectedCounts.get(value) ?? 0) + 1);
  }
  const totalMatches = values.filter((value) => value === need).length;
  return totalMatches > (selectedCounts.get(need) ?? 0);
}

export function buildTwoSumPreview(input: TwoSumPreviewInput): PuzzlePreviewModel {
  const selected = input.selectedValues.slice(0, 2);
  const state = [
    `arr   = ${formatSequence(input.values)}`,
    `target = ${input.target}`,
    `seen  = {${selected.join(', ')}}`,
    `value = ${selected[0] ?? 'pick one'}`,
  ];

  if (selected.length === 0) {
    return {
      state,
      next: 'Pick a tile.\nPreview will show target - value.',
    };
  }

  if (selected.length === 1) {
    const value = selected[0];
    const need = complementOf(value, input.target);
    const found = hasAvailableComplement(input.values, selected, need);
    return {
      state,
      next: `target - ${value} = ${need}\n${found ? `Found ${need}: pick it to lock` : `${need} not visible yet`}`,
    };
  }

  const sum = selected[0] + selected[1];
  const ok = isTwoSumPair(input.values, input.target, selected);
  return {
    state,
    next: `${selected[0]} + ${selected[1]} = ${sum}\n${ok ? 'Pair locks.' : 'Not target; selection resets.'}`,
  };
}

export interface PointerBridgePreviewInput {
  readonly values: ReadonlyArray<number>;
  readonly target: number;
  readonly left: number;
  readonly right: number;
}

export function buildPointerBridgePreview(input: PointerBridgePreviewInput): PuzzlePreviewModel {
  const leftValue = input.values[input.left] ?? 0;
  const rightValue = input.values[input.right] ?? 0;
  const sum = leftValue + rightValue;
  const directive = pointerDirective(sum, input.target);
  const state = [
    `arr   = ${formatSequence(input.values)}`,
    `target = ${input.target}`,
    `L = ${input.left} -> ${leftValue}`,
    `R = ${input.right} -> ${rightValue}`,
    `sum   = ${leftValue} + ${rightValue} = ${sum}`,
  ];

  if (directive === 'lock') {
    return { state, next: `ENTER -> lock pair (${leftValue} + ${rightValue})` };
  }
  if (directive === 'advance_left') {
    const nextLeft = Math.min(input.left + 1, input.right);
    return { state, next: `D -> L = ${nextLeft} (value: ${valueAt(input.values, nextLeft)})` };
  }
  const nextRight = Math.max(input.right - 1, input.left);
  return { state, next: `J -> R = ${nextRight} (value: ${valueAt(input.values, nextRight)})` };
}

export interface FixedWindowPreviewInput {
  readonly values: ReadonlyArray<number>;
  readonly windowSize: number;
  readonly start: number;
  readonly bestSeen: number;
}

export function buildFixedWindowPreview(input: FixedWindowPreviewInput): PuzzlePreviewModel {
  const end = input.start + input.windowSize;
  const window = input.values.slice(input.start, end);
  const sum = windowSumAt(input.values, input.start, input.windowSize);
  const state = [
    `window = ${formatSequence(window)}`,
    `start = ${input.start}`,
    `sum   = ${sum}`,
    `best  = ${input.bestSeen}`,
  ];

  const nextStart = input.start + 1;
  if (nextStart + input.windowSize <= input.values.length) {
    const nextWindow = input.values.slice(nextStart, nextStart + input.windowSize);
    const nextSum = windowSumAt(input.values, nextStart, input.windowSize);
    return { state, next: `RIGHT -> window = ${formatSequence(nextWindow)}, sum = ${nextSum}` };
  }

  return { state, next: `SPACE -> lock current window (sum = ${sum})` };
}

export interface CurrentRiderPreviewInput {
  readonly letters: ReadonlyArray<string>;
  readonly left: number;
  readonly right: number;
  readonly bestLength: number;
}

export function buildCurrentRiderPreview(input: CurrentRiderPreviewInput): PuzzlePreviewModel {
  const window = input.letters.slice(input.left, input.right + 1);
  const hasDuplicate = hasDuplicateInRange(input.letters, input.left, input.right);
  const state = [
    `window = ${formatSequence(window)}`,
    `L/R   = ${input.left}/${input.right}`,
    `duplicate = ${hasDuplicate ? 'yes' : 'no'}`,
    `best  = ${input.bestLength}`,
  ];

  if (hasDuplicate) {
    const nextLeft = Math.min(input.left + 1, input.right);
    return {
      state,
      next: `Q -> L = ${nextLeft}\nwindow = ${formatSequence(input.letters.slice(nextLeft, input.right + 1))}`,
    };
  }

  const nextRight = input.right + 1;
  if (nextRight < input.letters.length) {
    return {
      state,
      next: `E -> R = ${nextRight}\nwindow = ${formatSequence(input.letters.slice(input.left, nextRight + 1))}`,
    };
  }

  return { state, next: `SPACE -> submit best = ${input.bestLength}` };
}

export type ShufflerPreviewInput =
  | {
    readonly phase: 'bubble';
    readonly values: ReadonlyArray<number>;
    readonly nextChaosIn: number;
    readonly swaps: number;
  }
  | {
    readonly phase: 'hash';
    readonly crop: HashCropPreview | null;
    readonly bucketCount: number;
    readonly roundNumber: number;
    readonly totalRounds: number;
  }
  | {
    readonly phase: 'pair';
    readonly values: ReadonlyArray<number>;
    readonly target: number;
    readonly selectedValues: ReadonlyArray<number>;
    readonly roundNumber: number;
    readonly totalRounds: number;
  }
  | { readonly phase: 'won' };

export function buildShufflerPreview(input: ShufflerPreviewInput): PuzzlePreviewModel {
  if (input.phase === 'won') {
    return { state: ['phase = won'], next: 'Boss clear.' };
  }
  if (input.phase === 'bubble') {
    const focus = firstInversionIndex(input.values);
    const state = [
      'phase = bubble',
      `arr   = ${formatSequence(input.values)}`,
      `i     = ${focus >= 0 ? focus : 'none'}`,
      `swaps = ${input.swaps}`,
      `shuffle = ${input.nextChaosIn}s`,
    ];
    if (isSortedAscending(input.values)) {
      return { state, next: 'Row sorted.\nPhase clears.' };
    }
    const next = focus >= 0
      ? `KEY ${keyForIndex(focus)} -> arr = ${formatSequence(swapAdjacent(input.values, focus))}`
      : 'Choose an adjacent pair.';
    return {
      state,
      next,
    };
  }
  if (input.phase === 'hash') {
    const hash = buildHashRoutingPreview({
      crop: input.crop,
      bucketCount: input.bucketCount,
      routed: input.roundNumber - 1,
      missed: 0,
      total: input.totalRounds,
    });
    return {
      state: [`phase = hash`, ...hash.state],
      next: hash.next,
    };
  }
  const twoSum = buildTwoSumPreview({
    values: input.values,
    target: input.target,
    selectedValues: input.selectedValues,
  });
  return {
    state: [`phase = pair`, `round = ${input.roundNumber}/${input.totalRounds}`, ...twoSum.state],
    next: twoSum.next,
  };
}

export type MirrorSerpentPreviewInput =
  | {
    readonly phase: 'reverse';
    readonly values: ReadonlyArray<number>;
    readonly target: ReadonlyArray<number>;
    readonly left: number;
    readonly right: number;
  }
  | {
    readonly phase: 'twoSum';
    readonly values: ReadonlyArray<number>;
    readonly target: number;
    readonly left: number;
    readonly right: number;
  }
  | {
    readonly phase: 'fixedWindow';
    readonly values: ReadonlyArray<number>;
    readonly windowSize: number;
    readonly start: number;
    readonly optimalStart: number;
    readonly optimalSum: number;
  }
  | { readonly phase: 'won' };

export function buildMirrorSerpentPreview(input: MirrorSerpentPreviewInput): PuzzlePreviewModel {
  if (input.phase === 'won') {
    return { state: ['phase = won'], next: 'Serpent defeated.' };
  }
  if (input.phase === 'reverse') {
    const state = [
      'phase = reverse',
      `arr   = ${formatSequence(input.values)}`,
      `goal  = ${formatSequence(input.target)}`,
      `L = ${input.left} -> ${valueAt(input.values, input.left)}`,
      `R = ${input.right} -> ${valueAt(input.values, input.right)}`,
    ];
    if (input.left >= input.right) {
      return { state, next: 'SPACE -> phase II' };
    }
    const predicted = [...input.values];
    [predicted[input.left], predicted[input.right]] = [predicted[input.right], predicted[input.left]];
    return {
      state,
      next: `SPACE -> arr = ${formatSequence(predicted)}\nL = ${input.left + 1}, R = ${input.right - 1}`,
    };
  }
  if (input.phase === 'twoSum') {
    const pointer = buildPointerBridgePreview(input);
    return { state: ['phase = two-sum', ...pointer.state.slice(1)], next: pointer.next };
  }

  const currentSum = windowSumAt(input.values, input.start, input.windowSize);
  const currentWindow = input.values.slice(input.start, input.start + input.windowSize);
  const state = [
    'phase = fixed-window',
    `window = ${formatSequence(currentWindow)}`,
    `sum   = ${currentSum}`,
    `max   = ${input.optimalSum}`,
    `target start = ${input.optimalStart}`,
  ];
  if (currentSum === input.optimalSum) {
    return { state, next: 'SPACE -> lock heaviest window' };
  }
  if (input.start < input.optimalStart) {
    return { state, next: `RIGHT -> start = ${input.start + 1}` };
  }
  return { state, next: `LEFT -> start = ${Math.max(0, input.start - 1)}` };
}

export interface SentinelPreviewInput {
  readonly phase: string;
  readonly altars: ReadonlyArray<string>;
  readonly currentFork: string | null;
  readonly choices: ReadonlyArray<string>;
}

/**
 * Translate Sentinel altar coordinate strings (like "-1,0") into the
 * human-readable position labels the player sees on the hex board.
 * Cardinal positions sit at the four compass points; diagonal positions
 * fall back to the coord notation only if the layout adds new altars
 * the table doesn't cover yet.
 */
const SENTINEL_ALTAR_LABELS: Record<string, string> = {
  '-1,0': 'left altar',
  '1,0':  'right altar',
  '0,-1': 'upper altar',
  '0,1':  'lower altar',
};
const labelAltar = (coord: string): string =>
  SENTINEL_ALTAR_LABELS[coord] ?? coord;

export function buildSentinelPreview(input: SentinelPreviewInput): PuzzlePreviewModel {
  // Phase 15 — softened the preview's voice from engineering trace
  // (`altars = -1,0 -> 1,0`) to plain English (`left altar then right
  // altar`). The Sentinel scene's poetic register (Sequence and selection
  // compose…) was clashing with code-style coords on the same screen —
  // the audit flagged this as "mystic vs technical copy clash".
  const altarPhrase = input.altars.length === 0
    ? 'none yet'
    : input.altars.map(labelAltar).join(' then ');
  const state = [
    `flow:    ${input.phase}`,
    `route:   visit altars in order`,
    `target:  ${altarPhrase}`,
    `fork:    ${input.currentFork ? labelAltar(input.currentFork) : 'none open'}`,
  ];
  if (input.currentFork && input.choices.length > 0) {
    return {
      state,
      next: `Pick ${input.choices.join(' or ')}\nRule fires: route pulse.`,
    };
  }
  if (input.phase === 'flowing') {
    return { state, next: 'Pulse follows forced edges.\nNext fork opens a timed choice.' };
  }
  if (input.phase === 'cleared') {
    return { state, next: 'All altar rules satisfied.' };
  }
  return { state, next: 'Prepare for the next pulse rule.' };
}
