/**
 * millRules — pure spatial rules for the Sorting Mill.
 * No Phaser imports; everything here is unit-tested.
 */

export interface BinRowGeometry {
  /** Left edge of the first bin, in scene px. */
  readonly startX: number;
  readonly binW: number;
  readonly gapW: number;
  readonly count: number;
}

/**
 * The bin the player is addressing: nearest bin center to the player's x,
 * within one pitch. -1 when outside the row.
 */
export function binIndexAtX(playerX: number, row: BinRowGeometry): number {
  const pitch = row.binW + row.gapW;
  const firstCenter = row.startX + row.binW / 2;
  const raw = Math.round((playerX - firstCenter) / pitch);
  const clamped = Math.max(0, Math.min(row.count - 1, raw));
  const center = firstCenter + clamped * pitch;
  if (Math.abs(playerX - center) > pitch) return -1;
  return clamped;
}

/**
 * Where a crop's pace-count lands when walked bin to bin, wrapping at the
 * row's end. This is the room's whole secret: the wrapping walk is modulo.
 */
export function paceTarget(weight: number, binCount: number): number {
  return ((weight % binCount) + binCount) % binCount;
}
