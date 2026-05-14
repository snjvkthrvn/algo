import { axialKey } from '../hexLayout';
import type { FlowRound } from './rounds';

/**
 * Routing helpers for the reactive flow.
 *
 * buildOutMap — outgoing-edge map keyed by axial key.
 * forkKeySet  — set of fork-node keys for fast lookup.
 */

export function buildOutMap(round: FlowRound): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const edge of round.edges) {
    const fk = axialKey(edge.from.q, edge.from.r);
    const tk = axialKey(edge.to.q, edge.to.r);
    if (!out.has(fk)) out.set(fk, []);
    out.get(fk)!.push(tk);
  }
  return out;
}

export function forkKeySet(round: FlowRound): Set<string> {
  return new Set(round.forks.map((f) => axialKey(f.at.q, f.at.r)));
}
