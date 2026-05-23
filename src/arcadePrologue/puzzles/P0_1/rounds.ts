/**
 * Three-round teaching arc on the 6×6 cosmic-rune grid.
 *
 * R1 Trace   — pure echo of a linear sequence (straight line).
 * R2 Branch  — adjacency presents multiple legal options at a junction.
 * R3 Revisit — the same tile appears twice in the walk; sequences are not sets.
 *
 * All cells live on a 6×6 grid (col 0..5, row 0..5). The `field` is the set of
 * tiles that participate in the round (light up dimly during preview); `walk`
 * is the sequence the player must trace. The first cell in `walk` is the
 * player's starting tile.
 */

export type Cell = { col: number; row: number };

export type Round = {
  title: string;
  principle: string;
  teach: string;
  field: Cell[];
  walk: Cell[];
};

// R1 — A straight horizontal sequence across the middle of the grid.
const r1Walk: Cell[] = [
  { col: 1, row: 3 },
  { col: 2, row: 3 },
  { col: 3, row: 3 },
  { col: 4, row: 3 },
];

// R2 — A path that requires picking the correct arm at a junction.
//      Layout (X = field tile, * = walk start, ↓ etc. = walk direction):
//        . . . . . .
//        . . X X . .
//        . X * X X .
//        . . X . . .
//        . . . . . .
//        . . . . . .
const r2Field: Cell[] = [
  { col: 2, row: 1 },
  { col: 3, row: 1 },
  { col: 1, row: 2 },
  { col: 2, row: 2 },
  { col: 3, row: 2 },
  { col: 4, row: 2 },
  { col: 2, row: 3 },
];

const r2Walk: Cell[] = [
  { col: 1, row: 2 },
  { col: 2, row: 2 },
  { col: 2, row: 1 },
  { col: 3, row: 1 },
  { col: 3, row: 2 },
  { col: 4, row: 2 },
];

// R3 — Same field as R2 but the walk revisits a tile.
const r3Walk: Cell[] = [
  { col: 1, row: 2 },
  { col: 2, row: 2 },
  { col: 3, row: 2 },
  { col: 2, row: 2 },
  { col: 2, row: 1 },
  { col: 3, row: 1 },
];

export const ROUNDS: Round[] = [
  {
    title: 'I. Trace',
    principle: 'A sequence is order, not a set. Two of the same steps in different positions are different programs.',
    teach: 'Follow the glowing path in order — one tile at a time.',
    field: r1Walk,
    walk: r1Walk,
  },
  {
    title: 'II. Branch',
    principle: 'Adjacency is not order. Many moves can be legal at a junction; only one is next in the chant.',
    teach: 'When the path forks, remember which arm the chant took. Touch is not enough.',
    field: r2Field,
    walk: r2Walk,
  },
  {
    title: 'III. Revisit',
    principle: 'Sequences are not sets. A rune may appear more than once in the order — same step, new position.',
    teach: 'If the chant returns to a rune, return to it too. Position in the sequence is what matters.',
    field: r2Field,
    walk: r3Walk,
  },
];
