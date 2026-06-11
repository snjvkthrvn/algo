/** Puzzle phase model — the single signal that drives gameplay gating. */

export type PuzzleState = 'idle' | 'preview' | 'turn' | 'cleared' | 'roam';

export const STATE_LABEL: Record<PuzzleState, string> = {
  idle: '',
  preview: 'Watching the chant',
  turn: 'Your turn',
  cleared: 'Solved',
  roam: 'The gate stands open',
};

export function canAcceptStep(state: PuzzleState): boolean {
  return state === 'turn';
}

/** Post-clear free movement — no chant validation, the room is yours. */
export function canRoam(state: PuzzleState): boolean {
  return state === 'roam';
}
