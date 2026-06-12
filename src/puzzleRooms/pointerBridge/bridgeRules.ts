/**
 * bridgeRules — pure spatial rules for the Rope Bridge.
 * No Phaser imports; everything here is unit-tested.
 */

export type BridgeZone = "left" | "right" | "lock";

/**
 * Which bridge zone the player is addressing: the left buoy, the right
 * buoy, or the rope's midpoint (the lock). Nearest wins within `reach`;
 * the lock zone only exists while the buoys stand clearly apart (when
 * they're nearly adjacent the midzone would overlap them both).
 */
export function bridgeZoneAt(
  playerX: number,
  leftX: number,
  rightX: number,
  reach: number,
): BridgeZone | null {
  const midX = (leftX + rightX) / 2;
  // The lock midzone only exists when it clears both buoys' reach circles.
  const lockEnabled = rightX - leftX > reach * 4;
  const candidates: Array<{ zone: BridgeZone; x: number; enabled: boolean }> =
    [
      { zone: "left", x: leftX, enabled: true },
      { zone: "right", x: rightX, enabled: true },
      { zone: "lock", x: midX, enabled: lockEnabled },
    ];
  let best: BridgeZone | null = null;
  let bestDist = reach;
  for (const candidate of candidates) {
    if (!candidate.enabled) continue;
    const dist = Math.abs(playerX - candidate.x);
    if (dist <= bestDist) {
      bestDist = dist;
      best = candidate.zone;
    }
  }
  return best;
}
