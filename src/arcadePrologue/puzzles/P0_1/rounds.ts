/**
 * Three-round teaching arc.
 *
 * R1 Trace   — pure echo of a linear sequence.
 * R2 Branch  — adjacency presents multiple legal options at a junction.
 * R3 Revisit — the same hex appears twice in the walk; sequences are not sets.
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

export const ROUNDS: Round[] = [
  {
    title: 'I. Trace',
    principle: 'A sequence is order, not a set. Two of the same steps in different positions are different programs.',
    teach: 'Watch the chant. Then echo it — one rune at a time, in the same order.',
    field: r1Path,
    walk: r1Path,
  },
  {
    title: 'II. Branch',
    principle: 'Adjacency is not order. Many moves can be legal at a junction; only one is next in the chant.',
    teach: 'When the path forks, remember which arm the chant took. Touch is not enough.',
    field: branchField,
    walk: r2Walk,
  },
  {
    title: 'III. Revisit',
    principle: 'Sequences are not sets. A rune may appear more than once in the order — same step, new position.',
    teach: 'If the chant returns to a rune, return to it too. Position in the sequence is what matters.',
    field: branchField,
    walk: r3Walk,
  },
];
