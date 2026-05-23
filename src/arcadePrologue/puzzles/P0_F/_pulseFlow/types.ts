/**
 * Pulse-flow types for the Prologue Finale.
 *
 * (Originally lived under P0_2 when that puzzle was a pulse-flow puzzle. P0_2
 *  has since been re-imagined as a free-roam shard-matching puzzle, so the
 *  pulse-flow engine is now owned by P0_F where it remains in use.)
 */

export type Axial = { q: number; r: number };

export type EdgeDef = { from: Axial; to: Axial };

/** A fork's `choices` are the legal outgoing axial coordinates from `at`. */
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
