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

export const SEQUENCE_ROUNDS: string[][] = [
  ['hex_1', 'hex_2', 'hex_3'],
  ['hex_1', 'hex_3', 'hex_2', 'hex_4', 'hex_5'],
  ['hex_2', 'hex_4', 'hex_1', 'hex_6', 'hex_3', 'hex_5', 'hex_2'],
];

export function runeIdToTileIndex(id: string): number {
  const match = id.match(/hex_(\d+)/);
  return match ? parseInt(match[1], 10) - 1 : 0;
}

export type VisitInstruction = {
  op: 'visit';
  tileIndex: number;
  label: string;
};

export type VisitExecutionResult = {
  correct: boolean;
  pc: number;
  complete: boolean;
  expectedTileIndex: number | null;
};

export function createVisitProgram(runeIds: readonly string[]): VisitInstruction[] {
  return runeIds.map((id) => {
    const tileIndex = runeIdToTileIndex(id);
    return {
      op: 'visit',
      tileIndex,
      label: `visit(${tileIndex + 1})`,
    };
  });
}

export function getCurrentVisitInstruction(program: readonly VisitInstruction[], pc: number): VisitInstruction | null {
  if (pc < 0 || pc >= program.length) return null;
  return program[pc];
}

export function executeVisitInstruction(
  program: readonly VisitInstruction[],
  pc: number,
  tileIndex: number
): VisitExecutionResult {
  const current = getCurrentVisitInstruction(program, pc);
  if (!current) {
    return {
      correct: false,
      pc,
      complete: pc >= program.length,
      expectedTileIndex: null,
    };
  }

  if (tileIndex !== current.tileIndex) {
    return {
      correct: false,
      pc,
      complete: false,
      expectedTileIndex: current.tileIndex,
    };
  }

  const nextPc = pc + 1;
  return {
    correct: true,
    pc: nextPc,
    complete: nextPc >= program.length,
    expectedTileIndex: current.tileIndex,
  };
}

export function getProgramTraceLines(program: readonly VisitInstruction[]): string[] {
  return [
    'pc = 0',
    'while pc < program.length:',
    ...program.map((instruction, index) => `  [${index}] ${instruction.label}`),
    'done',
  ];
}

export function getProgramTraceLineIndex(pc: number, programLength: number): number {
  if (pc >= programLength) return programLength + 2;
  return Math.max(0, pc) + 2;
}

export type ShardKind = 'triangle' | 'diamond' | 'circle';
export type ConsoleKind = 'red' | 'blue' | 'green';

const SHARD_TARGETS: Record<ShardKind, ConsoleKind> = {
  triangle: 'red',
  diamond: 'blue',
  circle: 'green',
};

export function getShardTarget(id: ShardKind): ConsoleKind {
  return SHARD_TARGETS[id];
}

export type ShardLookupEntry = {
  shard: ShardKind;
  console: ConsoleKind;
  traceLine: string;
};

export function getShardLookupEntries(): ShardLookupEntry[] {
  return (Object.keys(SHARD_TARGETS) as ShardKind[]).map((shard) => {
    const target = SHARD_TARGETS[shard];
    return {
      shard,
      console: target,
      traceLine: `target[${shard}] -> ${target}`,
    };
  });
}
