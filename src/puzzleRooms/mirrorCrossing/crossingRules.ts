/**
 * crossingRules — pure spatial rules for the Mirror Crossing.
 * No Phaser imports; everything here is unit-tested.
 */

export interface RackGeometry {
  /** Left edge of the first crate, in scene px. */
  readonly startX: number;
  readonly crateW: number;
  readonly gapW: number;
  readonly count: number;
}

/**
 * The crate slot the player is addressing from the boardwalk: nearest
 * center to the player's x, within one pitch. -1 outside the rack.
 */
export function slotIndexAtX(playerX: number, rack: RackGeometry): number {
  const pitch = rack.crateW + rack.gapW;
  const firstCenter = rack.startX + rack.crateW / 2;
  const raw = Math.round((playerX - firstCenter) / pitch);
  const clamped = Math.max(0, Math.min(rack.count - 1, raw));
  const center = firstCenter + clamped * pitch;
  if (Math.abs(playerX - center) > pitch) return -1;
  return clamped;
}

/** Where the mirror twin stands: the slot reflected across the center. */
export function mirrorSlot(slot: number, count: number): number {
  return count - 1 - slot;
}
