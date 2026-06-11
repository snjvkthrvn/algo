import type { GridPos } from "./isogrid";

export type PathRound = {
  title: string;
  principle: string;
  teach: string;
  npcLine: string;
  field: GridPos[];
  path: GridPos[];
};

const ARENA_FIELD: GridPos[] = Array.from({ length: 6 }, (_, row) =>
  Array.from({ length: 8 }, (_, col) => ({ row, col })),
).flat();

const r1Path: GridPos[] = [
  { row: 4, col: 3 },
  { row: 3, col: 3 },
  { row: 2, col: 3 },
];

const r2Path: GridPos[] = [
  { row: 4, col: 2 },
  { row: 3, col: 2 },
  { row: 2, col: 2 },
  { row: 2, col: 3 },
  { row: 2, col: 4 },
];

const r3Path: GridPos[] = [
  { row: 4, col: 4 },
  { row: 3, col: 4 },
  { row: 2, col: 4 },
  { row: 2, col: 3 },
  { row: 2, col: 4 },
  { row: 1, col: 4 },
  { row: 0, col: 4 },
];

const r4Path: GridPos[] = [
  { row: 5, col: 1 },
  { row: 4, col: 1 },
  { row: 3, col: 1 },
  { row: 3, col: 2 },
  { row: 3, col: 3 },
  { row: 3, col: 2 },
  { row: 2, col: 2 },
  { row: 2, col: 3 },
  { row: 2, col: 4 },
];

export const PATH_ROUNDS: PathRound[] = [
  {
    title: "I. Trace",
    // FEEL→NAME (docs/VISION.md §3): principles speak in chant language, not
    // concept-lecture language — the player names "sequence" after feeling it.
    principle: "The runes remember what came first.",
    teach: "Watch the rune path, then echo it - one step at a time.",
    npcLine: "Follow the glowing path in order.",
    field: ARENA_FIELD,
    path: r1Path,
  },
  {
    title: "II. Branch",
    principle: "Many runes sit close. Only one is next in the chant.",
    teach: "When the path forks, remember which arm was lit.",
    npcLine: "Some runes lead astray. Only the sequence knows the way.",
    field: ARENA_FIELD,
    path: r2Path,
  },
  {
    title: "III. Revisit",
    principle: "A rune the chant has touched may call you back again.",
    teach: "If the chant returns to a rune, return to it too.",
    npcLine: "The path may cross itself. Trust the sequence, not the tile.",
    field: ARENA_FIELD,
    path: r3Path,
  },
  {
    title: "IV. Long Walk",
    principle:
      "The chant crosses itself. The picture cannot help - only the order.",
    teach: "Hold the sequence in your mind, not in the runes.",
    npcLine: "Longer chants are still only one step after another.",
    field: ARENA_FIELD,
    path: r4Path,
  },
];
