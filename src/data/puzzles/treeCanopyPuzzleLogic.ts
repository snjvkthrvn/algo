import type { ScriptedChoiceRound } from '../../scenes/puzzles/ScriptedChoiceScene';

export type TreeCanopyChoiceRound = ScriptedChoiceRound;

export const FIRST_FORK_ROUNDS: TreeCanopyChoiceRound[] = [
  {
    title: 'Pre-order',
    prompt: 'Which visit order starts with the root platform?',
    options: ['root, left, right', 'left, root, right', 'left, right, root'],
    correctIndex: 0,
    success: 'Pre-order names the root before its children.',
  },
  {
    title: 'In-order',
    prompt: 'Which walk reveals a sorted BST?',
    options: ['left, root, right', 'root, right, left', 'right, root, left'],
    correctIndex: 0,
    success: 'In-order reads the tree in sorted order.',
  },
  {
    title: 'Post-order',
    prompt: 'A branch must clean children before parent. Which order fits?',
    options: ['left, right, root', 'root, left, right', 'root only'],
    correctIndex: 0,
    success: 'Post-order resolves children before the root.',
  },
];

export const SORTED_GROVE_ROUNDS: TreeCanopyChoiceRound[] = [
  {
    title: 'Find 12',
    prompt: 'At node 20, the target is 12. Which branch disappears?',
    options: ['right branch', 'left branch', 'both branches'],
    correctIndex: 0,
    success: 'Values larger than 20 cannot contain 12.',
  },
  {
    title: 'Insert 17',
    prompt: '17 is less than 20 but greater than 12. Where does it settle?',
    options: ['right of 12', 'left of 12', 'above 20'],
    correctIndex: 0,
    success: 'Comparisons place the new node.',
  },
  {
    title: 'Remove Node',
    prompt: 'A removed node has two children. What can replace it?',
    options: ['in-order successor', 'random leaf', 'old root always'],
    correctIndex: 0,
    success: 'The successor preserves sorted shape.',
  },
];

export const DEEP_ROOT_ROUNDS: TreeCanopyChoiceRound[] = [
  {
    title: 'Target Leaf',
    prompt: 'DFS enters a branch. What happens before checking siblings?',
    options: ['go deep', 'scan all neighbors', 'return immediately'],
    correctIndex: 0,
    success: 'DFS commits to one branch first.',
  },
  {
    title: 'Deepest Leaf',
    prompt: 'How do you know which leaf is deepest?',
    options: ['visit all paths', 'stop at first leaf', 'count root only'],
    correctIndex: 0,
    success: 'Depth is only proven after every branch.',
  },
  {
    title: 'Path Sum',
    prompt: 'A root-to-leaf sum fails. What should the walker do?',
    options: ['backtrack to sibling', 'change old values', 'ignore the target'],
    correctIndex: 0,
    success: 'Backtracking opens the next branch.',
  },
];

export const BENT_BOUGH_ROUNDS: TreeCanopyChoiceRound[] = [
  {
    title: 'Right-heavy',
    prompt: 'A tree leans right-right after insertion. What fixes it?',
    options: ['left rotation', 'right rotation', 'no rotation'],
    correctIndex: 0,
    success: 'The long side rotates back into balance.',
  },
  {
    title: 'Left-right Bend',
    prompt: 'The bend changes direction before the root. What is needed?',
    options: ['double rotation', 'delete the root', 'linear scan'],
    correctIndex: 0,
    success: 'A zig-zag needs two pivots.',
  },
  {
    title: 'Keep Balance',
    prompt: 'New nodes keep arriving. What should be checked after each insert?',
    options: ['height difference', 'arrival ticket', 'water level'],
    correctIndex: 0,
    success: 'Balance is maintained locally.',
  },
];

export const PATTERN_ROUNDS: TreeCanopyChoiceRound[] = [
  {
    title: 'Phase 1: Traversal Trap',
    prompt: 'The Pattern asks for root first, then children.',
    options: ['pre-order', 'in-order', 'post-order'],
    correctIndex: 0,
    success: 'The traversal name breaks the trap.',
  },
  {
    title: 'Phase 2: BST Siege',
    prompt: 'Every comparison can discard half the tree.',
    options: ['descend by value', 'walk every node', 'choose by color'],
    correctIndex: 0,
    success: 'The sorted grove holds.',
  },
  {
    title: 'Phase 3: Depth Gauntlet',
    prompt: 'The target hides far below one branch.',
    options: ['DFS with backtracking', 'BFS only', 'priority by age'],
    correctIndex: 0,
    success: 'Depth finds the hidden leaf.',
  },
  {
    title: 'Phase 4: Balance Storm',
    prompt: 'The Pattern turns the tree into a line.',
    options: ['rotate and rebalance', 'accept linear search', 'erase all leaves'],
    correctIndex: 0,
    success: 'The hierarchy stays logarithmic.',
  },
  {
    title: 'Phase 5: Mirror Match',
    prompt: 'The Pattern copied your choices. What wins?',
    options: ['correct order for each shape', 'one trick forever', 'stop growing'],
    correctIndex: 0,
    success: 'The Pattern fragments into a smaller proof.',
  },
];

export function isCorrectTreeChoice(round: TreeCanopyChoiceRound, choiceIndex: number): boolean {
  return choiceIndex === round.correctIndex;
}
