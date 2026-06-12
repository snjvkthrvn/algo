/**
 * runRules — pure spatial rules for the Current Run.
 * No Phaser imports; everything here is unit-tested.
 */

export interface RunGeometry {
  /** Center x of the first float, in scene px. */
  readonly startX: number;
  readonly pitch: number;
  readonly count: number;
}

/**
 * The net's right edge follows the player's walk: nearest float index,
 * never left of the current left tie, never past the last float.
 */
export function rightEdgeAtX(
  playerX: number,
  geo: RunGeometry,
  leftTie: number,
): number {
  const raw = Math.round((playerX - geo.startX) / geo.pitch);
  return Math.max(leftTie, Math.min(geo.count - 1, raw));
}

/** The claim strip: past the last float, within reach of the post. */
export function inClaimZone(
  playerX: number,
  geo: RunGeometry,
  postX: number,
  reach: number,
): boolean {
  const lastFloatX = geo.startX + (geo.count - 1) * geo.pitch;
  return playerX > lastFloatX + geo.pitch / 2 && Math.abs(playerX - postX) <= reach;
}
