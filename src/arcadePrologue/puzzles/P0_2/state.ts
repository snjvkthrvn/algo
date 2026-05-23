/**
 * Game-state machine for P0_2 Flow Consoles.
 *
 *   idle       — scene mounting, no input
 *   instruct   — Console Keeper has opened with the round brief
 *   playing    — player roaming and matching shards
 *   cleared    — last shard placed; win cascade running
 */

export type FlowState = 'idle' | 'instruct' | 'playing' | 'cleared';

// In-panel state chip removed; FLOW_LABEL is kept on the public API for any
// debug overlays but doesn't paint into the HUD anymore.
export const FLOW_LABEL: Record<FlowState, string> = {
  idle: '',
  instruct: '',
  playing: '',
  cleared: '',
};

export const canInteract = (s: FlowState): boolean => s === 'playing';
