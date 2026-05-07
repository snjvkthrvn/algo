export type ArrayPuzzleState = {
  array: any[];
  feedback: string;
};

export function createInitialArray(): string[] {
  return ['rune-1', 'rune-2', 'rune-3', 'rune-4'];
}

export function accessByIndex(state: ArrayPuzzleState, index: number) {
  const value = state.array[index];
  const hint = 'Remember: indices start at 0';
  const feedback = index >= 0 ? 'Access successful - order matters in sequences' : '';
  return { value, hint, feedback };
}

export function reorderArray(state: ArrayPuzzleState, newOrder: number[]): ArrayPuzzleState {
  const newArr = newOrder.map(i => state.array[i]);
  return {
    array: newArr,
    feedback: 'Reordered: arrays hold sequences of data flowing through algorithms',
  };
}

export function sequentialAccess(state: ArrayPuzzleState) {
  return {
    visited: [...state.array],
    flowHint: 'Sequential access: simple flow of data step-by-step',
  };
}

export function getFloatingHint(topic: string): string {
  if (topic === 'index') return 'Floating hint: indices start at 0';
  if (topic === 'order') return 'Floating hint: order matters';
  if (topic === 'sequence') return 'Floating hint: arrays hold sequences';
  return 'Hint: explore the array flow';
}

export function mutateAndFeedback(state: ArrayPuzzleState, op: string, i: number, j: number): ArrayPuzzleState {
  const arr = [...state.array];
  if (op === 'swap') {
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return {
    array: arr,
    feedback: 'Visual mutation complete - immediate feedback on array change',
  };
}
