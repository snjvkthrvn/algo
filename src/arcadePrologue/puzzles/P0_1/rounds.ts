/**
 * Four-round teaching arc.
 *
 * R1 Trace    — pure echo of a linear sequence.
 * R2 Branch   — adjacency presents multiple legal options at a junction.
 * R3 Revisit  — the same hex appears twice in the walk; sequences are not sets.
 * R4 Long Walk — extended sequence with multiple revisits and branches;
 *                tests that the player has *encoded* the chant, not memorised
 *                a path. This is the puzzle's MASTER+ tier.
 */

export type Axial = { q: number; r: number };

export type Round = {
  title: string;
  principle: string;
  teach: string;
  field: Axial[];
  walk: Axial[];
};

const r1Path: Axial[] = [
  { q: -1, r: 0 },
  { q: 0, r: 0 },
  { q: 1, r: 0 },
];

const branchField: Axial[] = [
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: -1, r: 0 },
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const r2Walk: Axial[] = [
  { q: -1, r: 0 },
  { q: 0, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: 1, r: 0 },
];

const r3Walk: Axial[] = [
  { q: -1, r: 0 },
  { q: 0, r: 0 },
  { q: 1, r: -1 },
  { q: 1, r: 0 },
  { q: 0, r: 0 },
  { q: 0, r: 1 },
];

/**
 * Round 4 field — wider and taller for the longer chant. Adds two extra
 * outer hexes so the walk can fork and re-converge.
 */
const longField: Axial[] = [
  { q: -2, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: -1, r: 0 },
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 2, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
  { q: 1, r: 1 },
];

/**
 * 9-step chant: revisits the centre twice, hits both outer extremes, and
 * sandwiches the branches between revisits so a "remember the path"
 * strategy fails. Only encoding the order works.
 */
const r4Walk: Axial[] = [
  { q: -2, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 0 },
  { q: 1, r: -1 },
  { q: 1, r: 0 },
  { q: 0, r: 0 },
  { q: 0, r: 1 },
  { q: 1, r: 1 },
  { q: 2, r: 0 },
];

// Diegetic copy overhaul: P0_1 is now framed as "repair the sequence Glitch
// scrambled in the cold open." Per the Brute Force Wakeup contract the
// player should NEVER read words like "function from index to action" in
// round 1 — the chant/rune/bridge framing carries the same pedagogy without
// pre-naming the technique. The depth (sequence ≠ set, position matters,
// encode-don't-memorise) survives; the CS-textbook vocabulary doesn't.
export const ROUNDS: Round[] = [
  {
    title: 'I. Repair the Chant',
    principle: 'Glitch hopped at random and broke the order. The runes remember what came first.',
    teach: 'Watch the chant. Then echo it — one rune at a time, in the order it was meant.',
    field: r1Path,
    walk: r1Path,
  },
  {
    title: 'II. The Forked Path',
    principle: 'Many roads stand open. Only one belongs to the chant.',
    teach: 'When the path forks, remember which arm the chant chose. Touch is not enough.',
    field: branchField,
    walk: r2Walk,
  },
  {
    title: 'III. The Returning Rune',
    principle: 'A rune the chant has touched is not done with you. It may be the next step too.',
    teach: 'If the chant returns to a rune, return to it too. Where you stand matters less than when.',
    field: branchField,
    walk: r3Walk,
  },
  {
    title: 'IV. The Long Chant',
    principle: 'Nine steps. The chant crosses itself. The picture cannot help — only the order.',
    teach: 'Hold the sequence in your mind, not in the runes. Their light is not the answer; the order they wake in is.',
    field: longField,
    walk: r4Walk,
  },
];
