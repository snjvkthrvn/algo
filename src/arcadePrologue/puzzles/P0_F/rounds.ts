import type { FlowRound, Axial } from '../P0_2/rounds';

/**
 * A LitanyRound extends a FlowRound with ordered altars the pulse must visit
 * (in order) before reaching the sink for the round to clear.
 *
 * Harder topology: each fork's dead-end branch points a DIFFERENT direction.
 * B's dead-end is below, D's is above, F's is below. The player can't pattern
 * match "always rotate the same way" — each fork demands its own decision.
 */
export type LitanyRound = FlowRound & { altars: Axial[] };

const A = { q: -3, r: 0 };
const B = { q: -2, r: 0 };
const C = { q: -1, r: 0 };
const D = { q: 0, r: 0 };
const E = { q: 1, r: 0 };
const F = { q: 2, r: 0 };
const S = { q: 3, r: 0 };
const X1 = { q: -2, r: 1 };
const X2 = { q: 0, r: -1 };
const X3 = { q: 2, r: 1 };

export const LITANY_ROUND: LitanyRound = {
  title: 'The Litany',
  principle:
    'Sequence and selection compose. Order is decided by choices; choices are tested by the order they produce.',
  teach:
    'Each fork hides its dead-end somewhere different \u2014 look carefully, then route through both altars to the sink.',
  field: [A, B, C, D, E, F, S, X1, X2, X3],
  source: A,
  sink: S,
  edges: [
    { from: A, to: B },
    { from: B, to: C },
    { from: B, to: X1 },
    { from: C, to: D },
    { from: D, to: E },
    { from: D, to: X2 },
    { from: E, to: F },
    { from: F, to: S },
    { from: F, to: X3 },
  ],
  forks: [
    { at: B, choices: [X1, C] },
    { at: D, choices: [X2, E] },
    { at: F, choices: [X3, S] },
  ],
  altars: [C, E],
};
