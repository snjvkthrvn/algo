/**
 * P0_2 layout & motion tokens.
 *
 * Free-roam arena: the player walks anywhere inside the stone-arena ellipse,
 * picks up shards from pedestals, and places them on matching consoles.
 *
 * COLORS/TYPE/SPACING/STAGE/s/px come from P0_1 — they are the prologue look.
 */

export { COLORS, TYPE, SPACING, STAGE, SCALE, s, px } from '../P0_1/tokens';

// ── Arena ──────────────────────────────────────────────────────────────────
// Matches the elliptical floor in stone_arena.png. Player movement is clamped
// to a slightly inset ellipse so the sprite never visually steps off the edge.
export const ARENA = {
  cx: 640,
  cy: 360,
  rx: 320, // play-area radius (sprite feet stay inside)
  ry: 175,
} as const;

// ── Movement ───────────────────────────────────────────────────────────────
export const MOVE = {
  /** Pixels-per-second the player walks at when a direction key is held. */
  speed: 230,
  /** How close the player has to be (in px) to an entity to interact. */
  pickupRadius: 60,
  /** Radius in which interactable highlights light up. */
  highlightRadius: 90,
} as const;

// ── Visual scale ───────────────────────────────────────────────────────────
// Player at 256 * 0.52 = ~133px tall — about 2/3 the height of a console (200h).
export const PLAYER_SCALE = 0.52;
export const CONSOLE_SIZE = { w: 96, h: 110 };
export const SHARD_SIZE = { w: 38, h: 56 };
