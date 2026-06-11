/**
 * flowRoute — pure optimal-route solver for the pulse networks.
 *
 * The ghost replay SHOWS the best run (VISION §3); this module finds it.
 * `routeThrough` walks the directed glyph graph from source to sink,
 * visiting `waypoints` in order (the Litany's altars). `forkChoicesAlong`
 * reduces a route to the fork→next-node decisions the spectral pulse makes.
 * Pure functions, no Phaser, no mutation of inputs.
 */

export function routeThrough(
  outMap: ReadonlyMap<string, ReadonlyArray<string>>,
  source: string,
  sink: string,
  waypoints: ReadonlyArray<string> = [],
): string[] | null {
  const walk = (
    node: string,
    waypointIndex: number,
    seen: ReadonlySet<string>,
  ): string[] | null => {
    const nextIndex =
      waypointIndex < waypoints.length && node === waypoints[waypointIndex]
        ? waypointIndex + 1
        : waypointIndex;
    if (node === sink) {
      return nextIndex === waypoints.length ? [node] : null;
    }
    const stateKey = `${node}#${nextIndex}`;
    if (seen.has(stateKey)) return null;
    const nextSeen = new Set(seen).add(stateKey);
    for (const out of outMap.get(node) ?? []) {
      const tail = walk(out, nextIndex, nextSeen);
      if (tail) return [node, ...tail];
    }
    return null;
  };
  return walk(source, 0, new Set());
}

/** Fork→choice map for the decisions taken along `route`. */
export function forkChoicesAlong(
  route: ReadonlyArray<string>,
  forkKeys: ReadonlySet<string>,
): Map<string, string> {
  const choices = new Map<string, string>();
  for (let i = 0; i < route.length - 1; i++) {
    if (forkKeys.has(route[i]!)) choices.set(route[i]!, route[i + 1]!);
  }
  return choices;
}
