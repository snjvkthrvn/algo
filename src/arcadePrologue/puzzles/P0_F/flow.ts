import { axialKey } from '../hexLayout';
import type { LitanyRound } from './rounds';

/**
 * Altar accounting for the Litany.
 *
 * The Litany clears only when the pulse has visited every altar — in the order
 * they appear in `round.altars` — and reached the sink. The reactive pulse
 * returns its full `visited` sequence; these helpers grade it.
 */

export function altarKeys(round: LitanyRound): string[] {
  return round.altars.map((a) => axialKey(a.q, a.r));
}

export function altarsSatisfied(round: LitanyRound, visited: string[]): boolean {
  const altars = altarKeys(round);
  if (altars.length === 0) return true;
  let i = 0;
  for (const v of visited) {
    if (v === altars[i]) {
      i += 1;
      if (i === altars.length) return true;
    }
  }
  return i === altars.length;
}

export function missedAltarKeys(round: LitanyRound, visited: string[]): string[] {
  const altars = altarKeys(round);
  const visitedSet = new Set(visited);
  return altars.filter((k) => !visitedSet.has(k));
}
