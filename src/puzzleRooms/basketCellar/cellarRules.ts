/**
 * cellarRules — pure spatial rules for the Basket Cellar.
 * No Phaser imports; everything here is unit-tested.
 */

export interface ShelfGeometry {
  /** Left edge of the first basket, in scene px. */
  readonly startX: number;
  readonly basketW: number;
  readonly gapW: number;
  readonly count: number;
}

/**
 * The basket the player is addressing: nearest basket center to the
 * player's x, within one pitch. -1 when outside the shelf.
 */
export function basketIndexAtX(playerX: number, shelf: ShelfGeometry): number {
  const pitch = shelf.basketW + shelf.gapW;
  const firstCenter = shelf.startX + shelf.basketW / 2;
  const raw = Math.round((playerX - firstCenter) / pitch);
  const clamped = Math.max(0, Math.min(shelf.count - 1, raw));
  const center = firstCenter + clamped * pitch;
  if (Math.abs(playerX - center) > pitch) return -1;
  return clamped;
}
