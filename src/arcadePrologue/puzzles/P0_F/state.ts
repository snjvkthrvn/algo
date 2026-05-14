/**
 * P0_F phase model.
 *
 * intro       dramatic title overlay
 * preparing   pulse poised at source, pre-fire beat
 * flowing     pulse traversing the network (may pause at forks)
 * cleared     altars satisfied + sink reached
 * outro       after-celebration handoff to Win
 */

export type LitanyState = 'idle' | 'intro' | 'preparing' | 'flowing' | 'cleared' | 'outro';

export const LITANY_LABEL: Record<LitanyState, string> = {
  idle: '',
  intro: '',
  preparing: 'Ready \u2014 pulse incoming',
  flowing: 'Click a fork to steer',
  cleared: 'Heard',
  outro: '',
};

export function canCycle(state: LitanyState): boolean {
  return state === 'flowing';
}
