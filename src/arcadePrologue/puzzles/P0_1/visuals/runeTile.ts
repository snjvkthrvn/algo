import Phaser from 'phaser';
import { P0_1_PUZZLE_KEYS } from '../../../../config/assets';
import { TILE_W, TILE_H } from '../tokens';

/**
 * Isometric diamond tile textures — drawn to exactly TILE_W × TILE_H so that
 * adjacent tiles share their edge vertex with zero gap.
 *
 * Diamond points:
 *   top    = (TILE_W/2,  0)
 *   right  = (TILE_W,    TILE_H/2)
 *   bottom = (TILE_W/2,  TILE_H)
 *   left   = (0,         TILE_H/2)
 *
 * Three states:
 *   iso_tile_off  — dark stone; non-path field cells
 *   iso_tile_on   — cyan; path cells player must follow (shown during preview)
 *   iso_tile_done — teal; cells player has already stepped on
 *   iso_tile_glow — additive bloom overlay
 */

const KEYS = {
  off:  'iso_tile_off',
  on:   'iso_tile_on',
  done: 'iso_tile_done',
  glow: 'iso_tile_glow',
} as const;

export type TileState = 'off' | 'on' | 'done';
const RUNE_FRAME: Record<TileState, number> = { off: 0, on: 1, done: 2 };

export function getTileKey(
  state: TileState,
  scene: Phaser.Scene,
): { key: string; frame?: number; needsResize: boolean } {
  if (scene.textures.exists(P0_1_PUZZLE_KEYS.RUNE_TILES)) {
    return { key: P0_1_PUZZLE_KEYS.RUNE_TILES, frame: RUNE_FRAME[state], needsResize: true };
  }
  return { key: KEYS[state], needsResize: false };
}

export function ensureTileTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(KEYS.off))  drawTile(scene, KEYS.off,  0x0c1830, 0.96, 0x1e3558, 0.45, 0x1a3060, 0.32);
  if (!scene.textures.exists(KEYS.on))   drawTile(scene, KEYS.on,   0x071e36, 0.96, 0x06b6d4, 0.9,  0x06b6d4, 0.88);
  if (!scene.textures.exists(KEYS.done)) drawTile(scene, KEYS.done,  0x0d2540, 0.96, 0x3d8fa0, 0.55, 0x06b6d4, 0.42);
  if (!scene.textures.exists(KEYS.glow)) drawGlow(scene);
}

// ─── Diamond drawing ──────────────────────────────────────────────────────────

/**
 * Draw a filled isometric diamond tile as a texture.
 *
 * @param fillColor    Main surface colour
 * @param strokeColor  Border/edge colour
 * @param runeColor    Inner rune symbol colour
 */
function drawTile(
  scene: Phaser.Scene,
  key: string,
  fillColor: number,
  fillAlpha: number,
  strokeColor: number,
  strokeAlpha: number,
  runeColor: number,
  runeAlpha: number,
): void {
  const W = TILE_W;
  const H = TILE_H;
  const hw = W / 2;
  const hh = H / 2;

  const g = scene.make.graphics(undefined, false);

  // ── Diamond face ──────────────────────────────────────────────────────────
  g.fillStyle(fillColor, fillAlpha);
  g.beginPath();
  g.moveTo(hw, 0);
  g.lineTo(W,  hh);
  g.lineTo(hw, H);
  g.lineTo(0,  hh);
  g.closePath();
  g.fillPath();

  // ── Top-left face highlight (simulates top surface lit from above-left) ──
  g.fillStyle(0xffffff, 0.055);
  g.beginPath();
  g.moveTo(hw, 0);
  g.lineTo(hw, H);
  g.lineTo(0,  hh);
  g.closePath();
  g.fillPath();

  // ── Edge border ──────────────────────────────────────────────────────────
  g.lineStyle(1, strokeColor, strokeAlpha);
  g.beginPath();
  g.moveTo(hw, 0);
  g.lineTo(W,  hh);
  g.lineTo(hw, H);
  g.lineTo(0,  hh);
  g.closePath();
  g.strokePath();

  // ── Rune symbol (scaled to tile) ─────────────────────────────────────────
  const cx = hw;
  const cy = hh;
  const arm = Math.round(H * 0.22);   // arm length scales with tile height
  const dia = Math.round(H * 0.3);    // diamond frame size

  g.lineStyle(1, runeColor, runeAlpha);
  // Cross
  g.beginPath();
  g.moveTo(cx - arm, cy); g.lineTo(cx + arm, cy);
  g.moveTo(cx, cy - arm); g.lineTo(cx, cy + arm);
  g.strokePath();
  // Diamond frame around cross
  g.beginPath();
  g.moveTo(cx,       cy - dia);
  g.lineTo(cx + dia, cy);
  g.lineTo(cx,       cy + dia);
  g.lineTo(cx - dia, cy);
  g.closePath();
  g.strokePath();

  g.generateTexture(key, W, H);
  g.destroy();
}

// ─── Additive bloom layer ─────────────────────────────────────────────────────

function drawGlow(scene: Phaser.Scene): void {
  const W = TILE_W;
  const H = TILE_H;
  const g = scene.make.graphics(undefined, false);

  // Stacked ellipses fading outward — keeps the same diamond footprint
  for (let i = 6; i >= 1; i--) {
    g.fillStyle(0x06b6d4, 0.045);
    g.fillEllipse(W / 2, H / 2, W * 0.7 + i * 4, H * 0.7 + i * 2);
  }

  g.generateTexture(KEYS.glow, W, H);
  g.destroy();
}
