/**
 * dockRules — pure spatial rules for the Fishing Dock.
 * No Phaser imports; everything here is unit-tested.
 */

export interface DockGeometry {
  /** Center x of the first basket, in scene px. */
  readonly startX: number;
  readonly pitch: number;
  readonly count: number;
  readonly windowSize: number;
}

/**
 * The net frame follows the player: their x maps to the nearest valid
 * window start, clamped to the dock (the frame never hangs off the end).
 */
export function frameStartAtX(playerX: number, geo: DockGeometry): number {
  const raw = Math.round((playerX - geo.startX) / geo.pitch);
  return Math.max(0, Math.min(geo.count - geo.windowSize, raw));
}
