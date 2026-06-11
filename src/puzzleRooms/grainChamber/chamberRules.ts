/**
 * chamberRules — pure spatial/behavior rules for the Grain Chamber.
 * No Phaser imports; everything here is unit-tested.
 */

export interface LaneGeometry {
  /** Left edge of the first crate, in scene px. */
  readonly startX: number;
  readonly crateW: number;
  readonly gapW: number;
  readonly count: number;
}

/**
 * The gap the player is addressing: nearest gap midpoint to the player's x,
 * within one pitch. -1 when outside the lane (no pair focused).
 */
export function gapIndexAtX(playerX: number, lane: LaneGeometry): number {
  const pitch = lane.crateW + lane.gapW;
  const firstMid = lane.startX + lane.crateW + lane.gapW / 2;
  const raw = Math.round((playerX - firstMid) / pitch);
  const clamped = Math.max(0, Math.min(lane.count - 2, raw));
  const mid = firstMid + clamped * pitch;
  if (Math.abs(playerX - mid) > pitch) return -1;
  return clamped;
}

export interface ScrambleState {
  /** 0-based delivery index; the final delivery is index 2. */
  readonly deliveryIndex: number;
  readonly idleMs: number;
  readonly scrambles: number;
}

/** Glitch hops down at most once, final delivery only, after 10s of idling. */
export function shouldGlitchScramble(state: ScrambleState): boolean {
  return (
    state.deliveryIndex >= 2 && state.idleMs >= 10_000 && state.scrambles === 0
  );
}
