export interface TwinRiversChoiceRound {
  title: string;
  prompt: string;
  options: readonly string[];
  correctIndex: number;
  success: string;
  education?: string;
}

export const MIRROR_WALK_ROUNDS: TwinRiversChoiceRound[] = [
  {
    title: 'Mirror Step 1',
    prompt: 'Bit splits across both banks. What keeps the halves symmetric?',
    options: ['move both inward', 'move blue only', 'move orange only'],
    correctIndex: 0,
    success: 'Both halves close the distance together.',
    education: 'This demonstrates queue symmetry: both pointers move together to maintain balance, like dual pointers in a sliding window.',
  },
  {
    title: 'Mirror Step 2',
    prompt: 'The blue bank advances. What should the orange bank do?',
    options: ['hold still', 'mirror the advance', 'jump to the middle'],
    correctIndex: 1,
    success: 'The pair stays balanced.',
  },
  {
    title: 'Mirror Step 3',
    prompt: 'The paths are about to meet. Which move finishes the mirror?',
    options: ['split farther apart', 'meet at center', 'restart at the banks'],
    correctIndex: 1,
    success: 'Two paths become one crossing.',
  },
];

export const POINTER_BRIDGE_ROUNDS: TwinRiversChoiceRound[] = [
  {
    title: '1 + 12 = 13',
    prompt: 'Target is 14. The sum is too small.',
    options: ['lock pair', 'move left pointer right', 'move right pointer left'],
    correctIndex: 1,
    success: 'Raise the low side.',
  },
  {
    title: '3 + 12 = 15',
    prompt: 'Now the sum is too large.',
    options: ['lock pair', 'move left pointer right', 'move right pointer left'],
    correctIndex: 2,
    success: 'Lower the high side.',
  },
  {
    title: '3 + 11 = 14',
    prompt: 'The two pointers meet the target.',
    options: ['lock pair', 'move left pointer right', 'move right pointer left'],
    correctIndex: 0,
    success: 'Pair found without scanning every stone.',
  },
];

export const FIXED_WINDOW_ROUNDS: TwinRiversChoiceRound[] = [
  {
    title: 'Window [2, 4, 1]',
    prompt: 'The window size is 3. What is the current sum?',
    options: ['6', '7', '9'],
    correctIndex: 1,
    success: 'Only the visible slats matter.',
  },
  {
    title: 'Slide Right',
    prompt: '4 enters, 2 leaves. Old sum was 7. New sum?',
    options: ['9', '10', '11'],
    correctIndex: 0,
    success: 'Subtract what leaves, add what enters.',
  },
  {
    title: 'Window [1, 5, 3]',
    prompt: 'Which value is inside the fixed window?',
    options: ['2', '5', '8'],
    correctIndex: 1,
    success: 'Fixed width keeps the question bounded.',
  },
];

export const VARIABLE_WINDOW_ROUNDS: TwinRiversChoiceRound[] = [
  {
    title: 'Current Limit 6',
    prompt: 'Window sum is 8, over the limit. What changes?',
    options: ['expand right', 'shrink left', 'lock answer'],
    correctIndex: 1,
    success: 'The river tells the window to shrink.',
  },
  {
    title: 'Current Limit 6',
    prompt: 'Window sum is 4, under the limit. What changes?',
    options: ['expand right', 'shrink left', 'discard all'],
    correctIndex: 0,
    success: 'There is room to grow.',
  },
  {
    title: 'Best Length So Far',
    prompt: 'A valid window gets longer than the record.',
    options: ['save its length', 'shrink anyway', 'ignore it'],
    correctIndex: 0,
    success: 'The best window is remembered.',
  },
];

export const MIRROR_SERPENT_ROUNDS: TwinRiversChoiceRound[] = [
  {
    title: 'Phase 1: Split Current',
    prompt: 'The serpent pulls both banks apart. What keeps control?',
    options: ['mirror both sides', 'follow one river only', 'random jumps'],
    correctIndex: 0,
    success: 'The split current aligns.',
  },
  {
    title: 'Phase 2: Target Stones',
    prompt: 'The pair is too small for the target.',
    options: ['move left pointer', 'move right pointer', 'lock pair'],
    correctIndex: 0,
    success: 'The low side rises.',
  },
  {
    title: 'Phase 3: Sliding Flood',
    prompt: 'One slat leaves a fixed window and one enters.',
    options: ['recount all', 'update the edge change', 'change window size'],
    correctIndex: 1,
    success: 'The flood becomes measurable.',
  },
  {
    title: 'Phase 4: Living Window',
    prompt: 'The current breaks the limit.',
    options: ['shrink until valid', 'expand forever', 'restart the river'],
    correctIndex: 0,
    success: 'The window adapts.',
  },
];

export function isCorrectChoice(round: TwinRiversChoiceRound, choiceIndex: number): boolean {
  return choiceIndex === round.correctIndex;
}
