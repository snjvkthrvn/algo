import type { ScriptedChoiceRound } from '../../scenes/puzzles/ScriptedChoiceScene';

export type QueueCanalsChoiceRound = ScriptedChoiceRound;

export const FERRY_DOCK_ROUNDS: QueueCanalsChoiceRound[] = [
  {
    title: 'Arrivals A, B, C',
    prompt: 'The ferry is ready. Which passenger boards next?',
    options: ['A', 'B', 'C'],
    correctIndex: 0,
    success: 'The oldest ticket boards first.',
  },
  {
    title: 'Loading Delay',
    prompt: 'D and E arrive while B is boarding. Where do they go?',
    options: ['front of line', 'back of line', 'between A and B'],
    correctIndex: 1,
    success: 'New arrivals join the back.',
  },
  {
    title: 'Two Ferries',
    prompt: 'Ferry Red has A, B. Ferry Blue has C, D. Red calls next.',
    options: ['A from Red', 'C from Blue', 'D from Blue'],
    correctIndex: 0,
    success: 'Each ferry owns its own queue.',
  },
];

export const RIPPLE_MAP_ROUNDS: QueueCanalsChoiceRound[] = [
  {
    title: 'Layer One',
    prompt: 'The start dock touches North and East. What does BFS explore first?',
    options: ['both neighbors', 'one deep branch', 'the far target'],
    correctIndex: 0,
    success: 'Breadth means every one-hop dock first.',
  },
  {
    title: 'Looping Canal',
    prompt: 'A visited dock appears again from another bridge. What prevents waste?',
    options: ['mark visited', 'restart search', 'erase the queue'],
    correctIndex: 0,
    success: 'Visited marks stop the loop.',
  },
  {
    title: 'Three Targets',
    prompt: 'Three docks need messages. What proves each fewest-hop route?',
    options: ['one ripple pass', 'random walking', 'deepest branch first'],
    correctIndex: 0,
    success: 'The ripple reaches all nearest targets in order.',
  },
];

export const PRIORITY_DOCK_ROUNDS: QueueCanalsChoiceRound[] = [
  {
    title: 'Urgency Call',
    prompt: 'Tickets are calm 1, urgent 5, steady 3. Who is served?',
    options: ['priority 5', 'priority 1', 'oldest calm ticket'],
    correctIndex: 0,
    success: 'The most urgent rises first.',
  },
  {
    title: 'Equal Priority',
    prompt: 'Two boats both have priority 4. How do you break the tie?',
    options: ['arrival order', 'shortest name', 'random choice'],
    correctIndex: 0,
    success: 'Priority wins, then FIFO keeps fairness.',
  },
  {
    title: 'Capacity Gate',
    prompt: 'Only one dock slot remains. Which boat enters?',
    options: ['highest need', 'newest boat', 'largest cargo'],
    correctIndex: 0,
    success: 'Limited capacity goes to highest need.',
  },
];

export const SCHEDULER_LOTTERY_ROUNDS: QueueCanalsChoiceRound[] = [
  {
    title: 'Round Robin',
    prompt: 'Five ferries need time. What happens after Red uses its slice?',
    options: ['next ferry turn', 'Red repeats', 'cancel the line'],
    correctIndex: 0,
    success: 'Turns rotate around the wheel.',
  },
  {
    title: 'Finished Early',
    prompt: 'Blue finishes before its slice ends. What should the scheduler do?',
    options: ['advance the wheel', 'force idle time', 'skip everyone'],
    correctIndex: 0,
    success: 'Finished work leaves the rotation cleanly.',
  },
  {
    title: 'No Starvation',
    prompt: 'High-priority ferries get longer slices. What must still happen?',
    options: ['everyone gets some time', 'small ferries vanish', 'urgent ferries loop forever'],
    correctIndex: 0,
    success: 'Weighted turns still protect every boat.',
  },
];

export const RECONCILER_ROUNDS: QueueCanalsChoiceRound[] = [
  {
    title: 'Phase 1: Great Queue',
    prompt: 'Hundreds arrive at once. What invariant keeps the harbor fair?',
    options: ['FIFO order', 'serve loudest', 'shuffle tickets'],
    correctIndex: 0,
    success: 'The line holds under pressure.',
  },
  {
    title: 'Phase 2: Ripple Siege',
    prompt: 'Signals must reach every dock in fewest hops.',
    options: ['BFS layers', 'deepest path', 'random ferry'],
    correctIndex: 0,
    success: 'Layered ripples cover the network.',
  },
  {
    title: 'Phase 3: Priority Crisis',
    prompt: 'Medical ferries arrive late but urgent. What structure decides next?',
    options: ['priority queue', 'plain stack', 'alphabetical list'],
    correctIndex: 0,
    success: 'Urgency rises without losing order.',
  },
  {
    title: 'Phase 4: Scheduling Storm',
    prompt: 'Every canal wants the lock. What prevents one stream from hogging it?',
    options: ['round-robin slices', 'one infinite turn', 'first stream forever'],
    correctIndex: 0,
    success: 'Turns keep the city breathing.',
  },
  {
    title: 'Phase 5: Merge',
    prompt: 'All four systems collide. What is the winning rule?',
    options: ['serve need, order, and turns', 'serve only fastest', 'drop quiet boats'],
    correctIndex: 0,
    success: 'Fairness reconciles the streams.',
  },
];

export function isCorrectQueueChoice(round: QueueCanalsChoiceRound, choiceIndex: number): boolean {
  return choiceIndex === round.correctIndex;
}
