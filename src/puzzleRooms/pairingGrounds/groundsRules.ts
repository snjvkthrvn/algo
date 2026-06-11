/**
 * groundsRules — pure spatial rules for the Pairing Grounds.
 * Stones stand in two rows, so addressing is 2-D nearest-within-radius
 * rather than the single-row pitch math of the other chambers.
 * No Phaser imports; everything here is unit-tested.
 */

export interface StoneCenter {
  readonly x: number;
  readonly y: number;
}

/**
 * The stone the player is addressing: nearest center within `radius`,
 * ties to the lowest index. -1 when nothing is in reach.
 */
export function stoneIndexAt(
  playerX: number,
  playerY: number,
  centers: ReadonlyArray<StoneCenter>,
  radius: number,
): number {
  let best = -1;
  let bestDistSq = radius * radius;
  centers.forEach((center, i) => {
    const dx = playerX - center.x;
    const dy = playerY - center.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq || (distSq === bestDistSq && best === -1)) {
      best = i;
      bestDistSq = distSq;
    }
  });
  return best;
}
