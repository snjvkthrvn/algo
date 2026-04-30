import type { ScriptedChoiceRound } from '../../scenes/puzzles/ScriptedChoiceScene';

export type GraphNexusChoiceRound = ScriptedChoiceRound;

export const BRIDGE_MAP_ROUNDS: GraphNexusChoiceRound[] = [
  {
    title: 'Node and Edge',
    prompt: 'A platform connected by a bridge is best described as what?',
    options: ['node and edge', 'stack and pop', 'key and bucket'],
    correctIndex: 0,
    success: 'Graphs are points plus connections.',
  },
  {
    title: 'Neighbors',
    prompt: 'The map lists C connected to A, D, and F. What are those platforms?',
    options: ['neighbors of C', 'parents only', 'unreachable islands'],
    correctIndex: 0,
    success: 'Adjacency means direct neighbors.',
  },
  {
    title: 'Same Graph',
    prompt: 'A list and a matrix show identical connections. What changed?',
    options: ['representation', 'the graph itself', 'the route cost'],
    correctIndex: 0,
    success: 'The shape can wear different forms.',
  },
];

export const COURIER_DILEMMA_ROUNDS: GraphNexusChoiceRound[] = [
  {
    title: 'Weighted Bridge',
    prompt: 'Path A has 2 + 7. Path B has 4 + 3. Which is cheaper?',
    options: ['Path B', 'Path A', 'same cost'],
    correctIndex: 0,
    success: 'The lowest total weight wins.',
  },
  {
    title: 'Next Cheapest',
    prompt: 'Dijkstra has frontier costs 4, 9, 6. Which node is explored?',
    options: ['cost 4', 'cost 9', 'cost 6'],
    correctIndex: 0,
    success: 'The priority queue picks the cheapest known node.',
  },
  {
    title: 'Traffic Shift',
    prompt: 'A bridge becomes expensive mid-route. What must update?',
    options: ['running costs', 'node names', 'visited colors only'],
    correctIndex: 0,
    success: 'Weights can change the best path.',
  },
];

export const CYCLE_BAZAAR_ROUNDS: GraphNexusChoiceRound[] = [
  {
    title: 'Return Edge',
    prompt: 'DFS reaches a node already in the active path. What did it find?',
    options: ['cycle', 'component', 'leaf'],
    correctIndex: 0,
    success: 'An active return edge reveals a loop.',
  },
  {
    title: 'Three Colors',
    prompt: 'Which mark means a node is being explored right now?',
    options: ['active mark', 'finished mark', 'unseen mark'],
    correctIndex: 0,
    success: 'The active mark catches cycles.',
  },
  {
    title: 'Break Loop',
    prompt: 'A graph must become acyclic. What should be removed?',
    options: ['fewest cycle edges', 'all bridges', 'all nodes'],
    correctIndex: 0,
    success: 'Breaking the right edges stops the loop.',
  },
];

export const ISLAND_CENSUS_ROUNDS: GraphNexusChoiceRound[] = [
  {
    title: 'Start Over',
    prompt: 'A search finishes, but unvisited platforms remain. What is that?',
    options: ['another component', 'same path', 'a queue error'],
    correctIndex: 0,
    success: 'Starting over counts a new island.',
  },
  {
    title: 'Largest City',
    prompt: 'Components have sizes 2, 7, and 4. Which is largest?',
    options: ['size 7', 'size 4', 'size 2'],
    correctIndex: 0,
    success: 'A component is every node reachable together.',
  },
  {
    title: 'One Bridge',
    prompt: 'You may connect two islands. Which bridge covers the most nodes?',
    options: ['largest combined components', 'smallest island only', 'already connected nodes'],
    correctIndex: 0,
    success: 'The best bridge merges the largest useful worlds.',
  },
];

export const ECHO_ROUNDS: GraphNexusChoiceRound[] = [
  {
    title: 'Phase 1: Bridge Duel',
    prompt: 'The Echo knows the obvious path. What must you inspect?',
    options: ['an alternate connection', 'no connection', 'oldest ticket'],
    correctIndex: 0,
    success: 'Curiosity opens a path the Echo cached away.',
  },
  {
    title: 'Phase 2: Path Race',
    prompt: 'The graph is weighted and large. What guides exploration?',
    options: ['lowest running cost', 'fewest letters', 'left branch only'],
    correctIndex: 0,
    success: 'Weighted paths beat straight guesses.',
  },
  {
    title: 'Phase 3: Cycle Break',
    prompt: 'The Echo traps you in loops. What reveals the trap?',
    options: ['active visit marks', 'empty stack', 'arrival ticket'],
    correctIndex: 0,
    success: 'The loop is visible once marked.',
  },
  {
    title: 'Phase 4: Island Fracture',
    prompt: 'The Nexus shatters. What question matters first?',
    options: ['which nodes can reach together', 'which node is oldest', 'which edge is prettiest'],
    correctIndex: 0,
    success: 'Components show the broken worlds.',
  },
  {
    title: 'Phase 5: Full Graph',
    prompt: 'The winning move is not defeat. What joins the solution?',
    options: ['efficiency and curiosity', 'only cached routes', 'only random exploration'],
    correctIndex: 0,
    success: 'The Echo merges into the longer, wiser path.',
  },
];

export function isCorrectGraphChoice(round: GraphNexusChoiceRound, choiceIndex: number): boolean {
  return choiceIndex === round.correctIndex;
}
