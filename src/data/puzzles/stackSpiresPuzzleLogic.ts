export interface StackSpiresChoiceRound {
  title: string;
  prompt: string;
  options: readonly string[];
  correctIndex: number;
  success: string;
}

export const SCROLL_STACK_ROUNDS: StackSpiresChoiceRound[] = [
  {
    title: 'PUSH A, PUSH B, POP',
    prompt: 'Which scroll leaves the stack?',
    options: ['A', 'B', 'both scrolls'],
    correctIndex: 1,
    success: 'The top scroll leaves first.',
  },
  {
    title: 'Open, Open, Close',
    prompt: 'A closing mark arrives. What must be on top?',
    options: ['an open mark', 'an old answer', 'nothing'],
    correctIndex: 0,
    success: 'Nesting is checked from the top.',
  },
  {
    title: 'Undo History',
    prompt: 'The player presses undo. Which action disappears?',
    options: ['oldest action', 'newest action', 'random action'],
    correctIndex: 1,
    success: 'Undo pops the most recent action.',
  },
];

export const MIRROR_STAIRCASE_ROUNDS: StackSpiresChoiceRound[] = [
  {
    title: 'Steps 1..4',
    prompt: 'The smaller staircase returns 6. What does floor 4 add?',
    options: ['4', '6', '10'],
    correctIndex: 0,
    success: 'One visible step combines with the smaller answer.',
  },
  {
    title: 'Reverse REST',
    prompt: 'To reverse CODE, what smaller question is trusted first?',
    options: ['reverse ODE', 'sort CODE', 'drop every letter'],
    correctIndex: 0,
    success: 'The smaller copy does most of the work.',
  },
  {
    title: 'Base Landing',
    prompt: 'The staircase has no smaller door. What case is this?',
    options: ['base case', 'overflow', 'forked case'],
    correctIndex: 0,
    success: 'The descent stops cleanly.',
  },
];

export const MAZE_OF_FORKS_ROUNDS: StackSpiresChoiceRound[] = [
  {
    title: 'Dead End',
    prompt: 'A chosen bridge ends in a wall. What should the pathfinder do?',
    options: ['backtrack', 'retry forever', 'erase the map'],
    correctIndex: 0,
    success: 'Retreat returns to the last choice.',
  },
  {
    title: 'Marked Branch',
    prompt: 'A failed branch is marked dim. What does that prevent?',
    options: ['re-walking it', 'finding the exit', 'using a stack'],
    correctIndex: 0,
    success: 'A dead end becomes useful information.',
  },
  {
    title: 'All Paths',
    prompt: 'There may be more than one valid route. What must be explored?',
    options: ['every viable branch', 'only first branch', 'no branches'],
    correctIndex: 0,
    success: 'Backtracking can enumerate every solution.',
  },
];

export const TOWER_OF_MEMORY_ROUNDS: StackSpiresChoiceRound[] = [
  {
    title: 'Depth 10, Gems 20',
    prompt: 'Can the tower be climbed safely?',
    options: ['yes', 'no', 'only by guessing'],
    correctIndex: 0,
    success: 'The stack has enough space.',
  },
  {
    title: 'Hidden Depth',
    prompt: 'A recursive climb runs out of gems. What avoids overflow?',
    options: ['walk with explicit stack', 'go deeper', 'forget returns'],
    correctIndex: 0,
    success: 'State can be carried in the open.',
  },
  {
    title: 'Tail Step',
    prompt: 'The last action is only the next call. What can be reused?',
    options: ['one frame', 'every old frame', 'no memory'],
    correctIndex: 0,
    success: 'Some depth can flatten into a walk.',
  },
];

export const RECURSION_ROUNDS: StackSpiresChoiceRound[] = [
  {
    title: 'Phase 1: Descent',
    prompt: 'The door contains a smaller version of the same platform.',
    options: ['enter smaller problem', 'ignore base case', 'shuffle stack'],
    correctIndex: 0,
    success: 'The same rule applies one level down.',
  },
  {
    title: 'Phase 2: Base Case',
    prompt: 'A platform has no smaller door. What is found?',
    options: ['true base', 'infinite door', 'dead branch'],
    correctIndex: 0,
    success: 'The recursion finally stops.',
  },
  {
    title: 'Phase 3: Ascent',
    prompt: 'The inner result is true. What must each level do?',
    options: ['combine and return', 'descend forever', 'drop breadcrumbs'],
    correctIndex: 0,
    success: 'Every descent gets a return.',
  },
  {
    title: 'Phase 4: Collapse',
    prompt: 'The top level receives true. What happens to the infinite door?',
    options: ['becomes one platform', 'duplicates forever', 'erases Bit'],
    correctIndex: 0,
    success: 'The regress resolves into one answer.',
  },
];

export function isCorrectStackChoice(round: StackSpiresChoiceRound, choiceIndex: number): boolean {
  return choiceIndex === round.correctIndex;
}
