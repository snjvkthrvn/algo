/**
 * Three rounds of console-match.
 *
 * Each shard has a `symbol` and a `tint`. Each console has the SAME pair.
 * Match a shard to the console whose symbol matches → progress.
 *
 *  ┌── R1 The First Pairing ── 3 shards / 3 consoles, all colors distinct (matches the reference screenshot).
 *  │
 *  ├── R2 The Fourth Voice ─── 4 shards / 4 consoles — adds violet.
 *  │
 *  └── R3 Tangled Lookup ───── 5 shards, 2 share a color (only the symbol distinguishes).
 *                              This forces the lesson: "lookup is by KEY, not by color."
 */

import { ARENA } from './tokens';

export type ShardSymbol = 'peak' | 'diamond' | 'lines' | 'star' | 'wave';

export type ShardTint = 'red' | 'blue' | 'green' | 'violet' | 'amber';

export type Pose = { x: number; y: number };

export type ConsoleDef = {
  id: string;
  pose: Pose;
  symbol: ShardSymbol;
  tint: ShardTint;
};

export type ShardDef = {
  id: string;
  pose: Pose;
  symbol: ShardSymbol;
  tint: ShardTint;
  /** Which console.id this shard belongs in. */
  targetId: string;
};

export type FlowRound = {
  title: string;
  principle: string;
  teach: string;
  npcLine: string;
  consoles: ConsoleDef[];
  shards: ShardDef[];
  playerSpawn: Pose;
};

// Layout helpers ─ positions are anchored to the arena ellipse.
const C = ARENA.cx;
const Y = ARENA.cy;

// ── Round 1: 3 / 3 — the screenshot ─────────────────────────────────────────
const round1: FlowRound = {
  title: 'I. The First Pairing',
  principle: 'Each shard has one true home. Look at the rune, not the color.',
  teach: 'Walk up to a shard, press E to lift it, walk to its console, press E to place.',
  npcLine: 'Each shard has one correct console. Match the symbols.',
  playerSpawn: { x: C, y: Y + 20 },
  consoles: [
    { id: 'c_red',   pose: { x: C,       y: Y - 132 }, symbol: 'peak',    tint: 'red'   },
    { id: 'c_blue',  pose: { x: C - 174, y: Y + 18  }, symbol: 'diamond', tint: 'blue'  },
    { id: 'c_green', pose: { x: C + 174, y: Y + 18  }, symbol: 'lines',   tint: 'green' },
  ],
  shards: [
    { id: 's_red',   pose: { x: C - 96, y: Y + 132 }, symbol: 'peak',    tint: 'red',   targetId: 'c_red'   },
    { id: 's_blue',  pose: { x: C,      y: Y + 132 }, symbol: 'diamond', tint: 'blue',  targetId: 'c_blue'  },
    { id: 's_green', pose: { x: C + 96, y: Y + 132 }, symbol: 'lines',   tint: 'green', targetId: 'c_green' },
  ],
};

// ── Round 2: 4 / 4 — adds violet ────────────────────────────────────────────
const round2: FlowRound = {
  title: 'II. The Fourth Voice',
  principle: 'A new voice joins the chorus. The lookup pattern is the same — match the rune.',
  teach: 'Four shards, four consoles. Find each home.',
  npcLine: 'The chamber learns. A fourth shard, a fourth socket — still one each.',
  playerSpawn: { x: C, y: Y + 20 },
  consoles: [
    { id: 'c_red',    pose: { x: C - 86,  y: Y - 132 }, symbol: 'peak',    tint: 'red'    },
    { id: 'c_violet', pose: { x: C + 86,  y: Y - 132 }, symbol: 'star',    tint: 'violet' },
    { id: 'c_blue',   pose: { x: C - 196, y: Y + 18  }, symbol: 'diamond', tint: 'blue'   },
    { id: 'c_green',  pose: { x: C + 196, y: Y + 18  }, symbol: 'lines',   tint: 'green'  },
  ],
  shards: [
    { id: 's_red',    pose: { x: C - 150, y: Y + 132 }, symbol: 'peak',    tint: 'red',    targetId: 'c_red'    },
    { id: 's_blue',   pose: { x: C - 50,  y: Y + 132 }, symbol: 'diamond', tint: 'blue',   targetId: 'c_blue'   },
    { id: 's_green',  pose: { x: C + 50,  y: Y + 132 }, symbol: 'lines',   tint: 'green',  targetId: 'c_green'  },
    { id: 's_violet', pose: { x: C + 150, y: Y + 132 }, symbol: 'star',    tint: 'violet', targetId: 'c_violet' },
  ],
};

// ── Round 3: 5 / 5 — two shards share a tint, symbol is the real key ────────
const round3: FlowRound = {
  title: 'III. Tangled Lookup',
  principle: 'Two shards look the same. The rune is the only true key.',
  teach: 'Five shards. Two share a color — the symbol decides where they go.',
  npcLine: 'Trust the rune. Two of these wear the same coat — only one shape opens each socket.',
  playerSpawn: { x: C, y: Y + 20 },
  consoles: [
    { id: 'c_red',     pose: { x: C,       y: Y - 138 }, symbol: 'peak',    tint: 'red'    },
    { id: 'c_violet',  pose: { x: C - 140, y: Y - 84  }, symbol: 'star',    tint: 'violet' },
    { id: 'c_amber',   pose: { x: C + 140, y: Y - 84  }, symbol: 'wave',    tint: 'amber'  },
    { id: 'c_blue',    pose: { x: C - 210, y: Y + 32  }, symbol: 'diamond', tint: 'blue'   },
    // Second blue console — same color, different symbol (the trick!)
    { id: 'c_blue2',   pose: { x: C + 210, y: Y + 32  }, symbol: 'lines',   tint: 'blue'   },
  ],
  shards: [
    { id: 's_red',     pose: { x: C - 192, y: Y + 132 }, symbol: 'peak',    tint: 'red',    targetId: 'c_red'    },
    { id: 's_violet',  pose: { x: C - 96,  y: Y + 132 }, symbol: 'star',    tint: 'violet', targetId: 'c_violet' },
    { id: 's_amber',   pose: { x: C,       y: Y + 132 }, symbol: 'wave',    tint: 'amber',  targetId: 'c_amber'  },
    // Two blue shards — only their symbol tells you which slot they belong in.
    { id: 's_blue_d',  pose: { x: C + 96,  y: Y + 132 }, symbol: 'diamond', tint: 'blue',   targetId: 'c_blue'   },
    { id: 's_blue_l',  pose: { x: C + 192, y: Y + 132 }, symbol: 'lines',   tint: 'blue',   targetId: 'c_blue2'  },
  ],
};

export const FLOW_ROUNDS: FlowRound[] = [round1, round2, round3];
