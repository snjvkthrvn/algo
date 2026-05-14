/**
 * P0_2 phase model for reactive flow.
 *
 * preparing  pulse poised at source, brief pre-fire beat
 * flowing    pulse in motion (may pause at forks awaiting click)
 * cleared    pulse reached the sink
 */

export type FlowState = 'idle' | 'preparing' | 'flowing' | 'cleared';

export const FLOW_LABEL: Record<FlowState, string> = {
  idle: '',
  preparing: 'Ready \u2014 pulse incoming',
  flowing: 'Click a fork to steer',
  cleared: 'Solved',
};

export function isLive(state: FlowState): boolean {
  return state === 'flowing';
}
