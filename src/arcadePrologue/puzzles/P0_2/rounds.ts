/**
 * Four rounds for P0_2 Forks.
 *
 * R1 The First Choice  — one fork, two exits, only one reaches the sink.
 * R2 In Series         — two forks in cascade.
 * R3 Cascade           — three forks in a row, all three must be set.
 * R4 Maze              — four forks with hidden dead ends and back-tracking
 *                        decisions. MASTER+ tier: every fork is "live", no
 *                        single choice is obvious in isolation.
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
  title: 'I. First Choice',
  // Diegetic copy \u2014 frames P0_2 as continuing the "Glitch broke the chamber"
  // arc from the cold open. The forks were left scrambled when Glitch
  // tried to brute-force the consoles.
  principle: 'Glitch slammed every fork open. The pulse cannot find its way home.',
  teach: 'Steer toward the live fork as the signal arrives. Send the pulse to the sink.',
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
  title: 'II. Two Forks in a Row',
  principle: 'The pulse must clear both forks. Each gate you set guards the next.',
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
  title: 'III. The Cascade',
  principle: 'Each fork stands between the pulse and its home. Open them all the right way and the way appears.',
  teach: 'Three forks. Each must point onward — not down — for the pulse to reach the sink.',
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

// ─────────────────────────────────────────────────────────────────────────
// Round 4 — Maze
//
// Four forks; the sink sits across a wider field. Every fork has at least
// one wrong choice that leads to a dead-end branch. Only by reasoning the
// whole chain in advance (or playing through with backtracking) can the
// player set all four correctly.
// ─────────────────────────────────────────────────────────────────────────

const A4 = { q: -3, r: 0 };
const B4 = { q: -2, r: 0 };
const C4 = { q: -1, r: 0 };
const D4 = { q: 0, r: 0 };
const E4 = { q: 1, r: 0 };
const F4 = { q: 2, r: 0 };
const G4 = { q: 3, r: 0 };
// Dead-end branches off each interior fork.
const DA4 = { q: -2, r: 1 };
const DB4 = { q: -1, r: 1 };
const DC4 = { q: 0, r: 1 };
const DD4 = { q: 1, r: 1 };

const round4: FlowRound = {
  title: 'IV. The Tangled Network',
  principle: 'A long chain of forks is still one chain. Trace it through — or play and find the way.',
  teach: 'Four forks, four dead ends. Each fork has two outgoing paths; pick the one that keeps the signal alive.',
  field: [A4, B4, C4, D4, E4, F4, G4, DA4, DB4, DC4, DD4],
  source: A4,
  sink: G4,
  edges: [
    { from: A4, to: B4 },
    { from: B4, to: C4 },
    { from: B4, to: DA4 },
    { from: C4, to: D4 },
    { from: C4, to: DB4 },
    { from: D4, to: E4 },
    { from: D4, to: DC4 },
    { from: E4, to: F4 },
    { from: E4, to: DD4 },
    { from: F4, to: G4 },
  ],
  forks: [
    { at: B4, choices: [DA4, C4] },
    { at: C4, choices: [DB4, D4] },
    { at: D4, choices: [DC4, E4] },
    { at: E4, choices: [DD4, F4] },
  ],
};

export const FLOW_ROUNDS: FlowRound[] = [round1, round2, round3, round4];
