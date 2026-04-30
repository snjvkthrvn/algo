import type { ScriptedChoiceRound } from '../../scenes/puzzles/ScriptedChoiceScene';

export type CoreChoiceRound = ScriptedChoiceRound;

export const ECHO_CHAMBER_ROUNDS: CoreChoiceRound[] = [
  {
    title: 'Repeated Question',
    prompt: 'F(10) asks F(8) many times. What avoids repeating it?',
    options: ['cache the answer', 'delete the base case', 'search deeper'],
    correctIndex: 0,
    success: 'Memoization remembers the small answer.',
  },
  {
    title: 'Cache Hit',
    prompt: 'A sub-answer is already stored. What should happen?',
    options: ['reuse it instantly', 'recompute the whole tree', 'ignore it'],
    correctIndex: 0,
    success: 'The echo goes quiet.',
  },
  {
    title: 'Large Number',
    prompt: 'F(40) is too large naively. Which approach still finishes?',
    options: ['top-down memoization', 'pure recursion', 'random sampling'],
    correctIndex: 0,
    success: 'Remembering turns explosion into a walk.',
  },
];

export const WEIGHTED_STAIRCASE_ROUNDS: CoreChoiceRound[] = [
  {
    title: 'Build Up',
    prompt: 'The answer for step 5 depends on earlier steps. What order works?',
    options: ['bottom-up table', 'start at final only', 'forget prior cells'],
    correctIndex: 0,
    success: 'Earlier cells feed later cells.',
  },
  {
    title: 'No Adjacent Gems',
    prompt: 'Adjacent picks are forbidden. Which previous state matters?',
    options: ['best excluding neighbor', 'only newest gem', 'all skipped cells'],
    correctIndex: 0,
    success: 'The recurrence carries the constraint.',
  },
  {
    title: 'Coin Target',
    prompt: 'Minimum coins to reach a target uses what kind of table?',
    options: ['best value per amount', 'oldest coin queue', 'one branch tree'],
    correctIndex: 0,
    success: 'Each amount becomes a solved subproblem.',
  },
];

export const GRAND_ARCHIVE_ROUNDS: CoreChoiceRound[] = [
  {
    title: 'Grid Paths',
    prompt: 'A cell can be reached from top or left. What fills it?',
    options: ['sum of prior ways', 'largest label', 'queue front only'],
    correctIndex: 0,
    success: 'Neighbors become the count.',
  },
  {
    title: 'Minimum Cost',
    prompt: 'A grid cell has a cost. What should be stored there?',
    options: ['cheapest cost to arrive', 'all route names', 'random parent'],
    correctIndex: 0,
    success: 'Every cell stores the best known prefix.',
  },
  {
    title: 'Two Strings',
    prompt: 'A subsequence table compares two directions. What does each cell hold?',
    options: ['best overlap so far', 'shortest bridge', 'first passenger'],
    correctIndex: 0,
    success: 'The table tracks shared structure.',
  },
];

export const HALL_OF_PATTERNS_ROUNDS: CoreChoiceRound[] = [
  {
    title: 'Hashed Grid',
    prompt: 'Grid costs come from repeated tokens. Which tool prices the cells?',
    options: ['frequency hash map', 'plain stack only', 'tree rotation'],
    correctIndex: 0,
    success: 'Hash memory feeds the DP grid.',
  },
  {
    title: 'Weighted Graph',
    prompt: 'Edge weights depend on subsequences. What two tools combine?',
    options: ['Dijkstra plus DP', 'FIFO plus pop', 'pre-order only'],
    correctIndex: 0,
    success: 'The graph listens to dynamic weights.',
  },
  {
    title: 'Priority Knapsack',
    prompt: 'Items arrive by urgency, but capacity is limited. What matters?',
    options: ['priority plus table', 'arrival only', 'random branch'],
    correctIndex: 0,
    success: 'The final skill is choosing the right tool.',
  },
];

export const PROTOCOL_OMEGA_ROUNDS: CoreChoiceRound[] = [
  {
    title: 'Phase 1: Prologue',
    prompt: 'The first sequence returns under pressure. What proves it?',
    options: ['recognize the pattern', 'skip the base lesson', 'shuffle tiles'],
    correctIndex: 0,
    success: 'The beginning still holds.',
  },
  {
    title: 'Phase 2: Plains and Rivers',
    prompt: 'Sorting, indexing, pairs, and windows collide. What is needed?',
    options: ['choose per subproblem', 'one blind loop', 'ignore pointers'],
    correctIndex: 0,
    success: 'Local shapes call local tools.',
  },
  {
    title: 'Phase 3: Highlands and Spires',
    prompt: 'Memory and backtracking overlap. What keeps the search sane?',
    options: ['cache and return', 'forget and recurse forever', 'sort the names only'],
    correctIndex: 0,
    success: 'Remembering and returning fit together.',
  },
  {
    title: 'Phase 4: Canals and Canopy',
    prompt: 'Fair turns meet branching choices. What prevents collapse?',
    options: ['schedule and balance', 'serve one branch forever', 'drop all queues'],
    correctIndex: 0,
    success: 'Order and hierarchy cooperate.',
  },
  {
    title: 'Phase 5: Nexus and Core',
    prompt: 'The final graph contains DP states. What guides the path?',
    options: ['weighted composition', 'unmarked cycles', 'oldest node only'],
    correctIndex: 0,
    success: 'The whole journey becomes one structure.',
  },
  {
    title: 'Phase 6: The Question',
    prompt: 'Omega asks what the final answer is.',
    options: ['know which algorithm to use', 'reset all growth', 'one algorithm forever'],
    correctIndex: 0,
    success: 'Growth is the update.',
  },
];

export function isCorrectCoreChoice(round: CoreChoiceRound, choiceIndex: number): boolean {
  return choiceIndex === round.correctIndex;
}
