/** Puzzle phase model — the single signal that drives HUD and gameplay gating. */

export type PuzzleState = 'idle' | 'preview' | 'turn' | 'cleared';

export const STATE_LABEL: Record<PuzzleState, string> = {
  idle: '',
  preview: 'Watching the chant',
  turn: 'Your turn',
  cleared: 'Solved',
};

export function canAcceptStep(state: PuzzleState): boolean {
  return state === 'turn';
}
