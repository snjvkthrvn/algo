/**
 * Banded y-sorting for overworld actors and landmark props.
 *
 * The codebase's depth conventions are fixed layers: ground RT at 0, ground
 * dressing props at 1-3, labels/name tags at 5-6, UI above. Actors (player,
 * keepers) and tall landmarks (barns, trees) need to occlude each other by
 * baseline y, so they share the 3..5 band: an actor standing north of a
 * barn's base renders behind it, south renders in front. Everything outside
 * the band keeps its existing meaning.
 */

export const ACTOR_DEPTH_MIN = 3;
export const ACTOR_DEPTH_MAX = 5;

/** Depth for a world entity whose ground-contact line is at baselineY. */
export function worldDepthForY(baselineY: number, worldHeight: number): number {
  const safeHeight = worldHeight > 0 ? worldHeight : 1;
  const t = Math.min(1, Math.max(0, baselineY / safeHeight));
  return ACTOR_DEPTH_MIN + t * (ACTOR_DEPTH_MAX - ACTOR_DEPTH_MIN);
}
