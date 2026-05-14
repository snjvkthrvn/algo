/**
 * Three rounds for P0_2 Forks.
 *
 * R1 The First Choice  — one fork, two exits, only one reaches the sink.
 * R2 In Series         — two forks in cascade.
 * R3 Cascade           — three forks in a row, all three must be set.
 */

export type Axial = { q: number; r: number };

export type EdgeDef = { from: Axial; to: Axial };

/**
 * A fork's `choices` are the legal outgoing axial coordinates from `at`.
 * They MUST match outgoing edges of `at` in the round's edge list.
 */
export type ForkDef = { at: Axial; choices: Axial[] };

export type FlowRound = {
  title: string;
  principle: string;
  teach: string;
  field: Axial[];
  source: Axial;
  sink: Axial;
  edges: EdgeDef[];
  forks: ForkDef[];
};

const A1 = { q: -2, r: 0 };
const B1 = { q: -1, r: 0 };
const C1 = { q: 0, r: 0 };
const D1 = { q: 1, r: 0 };
const E1 = { q: -1, r: 1 };

const round1: FlowRound = {
  title: 'I. The First Choice',
  principle: 'A program\u2019s path depends on its choices. One decision can change the destination.',
  teach: 'Click the fork rune to rotate where the signal flows. Reach the sink.',
  field: [A1, B1, C1, D1, E1],
  source: A1,
  sink: D1,
  edges: [
    { from: A1, to: B1 },
    { from: B1, to: C1 },
    { from: B1, to: E1 },
    { from: C1, to: D1 },
  ],
  // Initial choice index 0 = E (dead-end) — player must rotate to C.
  forks: [{ at: B1, choices: [E1, C1] }],
};

const A2 = { q: -2, r: 0 };
const B2 = { q: -1, r: 0 };
const C2 = { q: 0, r: 0 };
const D2 = { q: 1, r: 0 };
const E2 = { q: 2, r: 0 };
const F2 = { q: -1, r: 1 };
const G2 = { q: 1, r: 1 };

const round2: FlowRound = {
  title: 'II. In Series',
  principle: 'Decisions compose. A program is a sequence of choices, each constraining the next.',
  teach: 'Two forks in series — the signal must pass both. Set each one correctly.',
  field: [A2, B2, C2, D2, E2, F2, G2],
  source: A2,
  sink: E2,
  edges: [
    { from: A2, to: B2 },
    { from: B2, to: C2 },
    { from: B2, to: F2 },
    { from: C2, to: D2 },
    { from: D2, to: E2 },
    { from: D2, to: G2 },
  ],
  forks: [
    { at: B2, choices: [F2, C2] },
    { at: D2, choices: [G2, E2] },
  ],
};

const A3 = { q: -2, r: 0 };
const B3 = { q: -1, r: 0 };
const C3 = { q: 0, r: 0 };
const D3 = { q: 1, r: 0 };
const S3 = { q: 2, r: 0 };
const X3 = { q: -1, r: 1 };
const Y3 = { q: 0, r: 1 };
const Z3 = { q: 1, r: 1 };

const round3: FlowRound = {
  title: 'III. Cascade',
  principle: 'A cascade of choices forms a path. Set each fork; the signal will find its way.',
  teach: 'Three forks in a row. Each must point onward — not down — for the pulse to reach the sink.',
  field: [A3, B3, C3, D3, S3, X3, Y3, Z3],
  source: A3,
  sink: S3,
  edges: [
    { from: A3, to: B3 },
    { from: B3, to: C3 },
    { from: B3, to: X3 },
    { from: C3, to: D3 },
    { from: C3, to: Y3 },
    { from: D3, to: S3 },
    { from: D3, to: Z3 },
  ],
  forks: [
    { at: B3, choices: [X3, C3] },
    { at: C3, choices: [Y3, D3] },
    { at: D3, choices: [Z3, S3] },
  ],
};

export const FLOW_ROUNDS: FlowRound[] = [round1, round2, round3];
