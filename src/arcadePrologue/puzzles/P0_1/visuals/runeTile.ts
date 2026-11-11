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
 * Three states (each generated in seeded per-tile variants, keyed
 * `iso_tile_<state>_v<n>` and picked by grid coordinate):
 *   iso_tile_off  — dark stone; non-path field cells
 *   iso_tile_on   — cyan; path cells player must follow (shown during preview)
 *   iso_tile_done — teal; cells player has already stepped on
 *   iso_tile_glow — additive bloom overlay (single texture, no variants)
 */

const KEYS = {
  off:  'iso_tile_off',
  on:   'iso_tile_on',
  done: 'iso_tile_done',
  glow: 'iso_tile_glow',
} as const;

export type TileState = 'off' | 'on' | 'done';
const RUNE_FRAME: Record<TileState, number> = { off: 0, on: 1, done: 2 };

// Seeded texture variants per state so the lattice doesn't read as one
// stamped tile repeated 48 times (2026-07 audit P2). The variant for a
// cell is a pure function of its grid coordinate — deterministic across
// boots for the visual tests, and stable across state swaps so a tile
// keeps its identity when it lights up or completes.
const VARIANTS = 3;

/** Coordinate hash, not a linear form — avoids same-variant diagonals. */
function variantAt(row: number, col: number): number {
  return ((row * 73856093) ^ (col * 19349663)) % VARIANTS;
}

// rune_tiles.png is a SQUARE tile sheet — it does not tessellate at the 2:1
// diamond spacing, which is why the floor used to be hidden. The procedural
// diamond textures below share edges exactly and keep the logical grid
// legible. Flip to true only if a diamond-shaped tile sheet replaces it.
const USE_RUNE_TILE_ART = false;

export function getTileKey(
  state: TileState,
  scene: Phaser.Scene,
  row = 0,
  col = 0,
): { key: string; frame?: number; needsResize: boolean } {
  if (USE_RUNE_TILE_ART && scene.textures.exists(P0_1_PUZZLE_KEYS.RUNE_TILES)) {
    return { key: P0_1_PUZZLE_KEYS.RUNE_TILES, frame: RUNE_FRAME[state], needsResize: true };
  }
  return { key: `${KEYS[state]}_v${variantAt(row, col)}`, needsResize: false };
}

export function ensureTileTextures(scene: Phaser.Scene): void {
  // Brighter edges than before so the un-lit lattice itself reads as a grid of
  // steppable cells; vivid on/done so the reveal and the player's trail pop.
  const STATES: Record<TileState, [number, number, number, number, number, number]> = {
    off:  [0x0e1a33, 0.90, 0x37598f, 0.78, 0x2a4a7e, 0.42],
    on:   [0x0a3550, 0.96, 0x3ce6ff, 1.0,  0x9af4ff, 1.0],
    done: [0x0c3a3c, 0.96, 0x34d399, 0.92, 0x8affd8, 0.82],
  };
  // Subtle tone jitter on the resting lattice only; lit states keep one
  // tone per state so the revealed path reads as a single signal.
  const OFF_TONE = [0, 0.05, -0.045];
  (Object.keys(STATES) as TileState[]).forEach((state) => {
    const [fill, fillA, stroke, strokeA, rune, runeA] = STATES[state];
    for (let v = 0; v < VARIANTS; v++) {
      const key = `${KEYS[state]}_v${v}`;
      if (scene.textures.exists(key)) continue;
      const tone = state === 'off' ? OFF_TONE[v] : 0;
      const face = tone > 0 ? lighten(fill, tone) : tone < 0 ? darken(fill, -tone) : fill;
      drawTile(scene, key, face, fillA, stroke, strokeA, rune, runeA);
    }
  });
  if (!scene.textures.exists(KEYS.glow)) drawGlow(scene);
}

// ─── Diamond drawing ──────────────────────────────────────────────────────────

// ── Pixel-material helpers ────────────────────────────────────────────────────
// The 2026-07 audit scored the old flat-fill diamonds as "untextured UI
// widgets floating over the painted room". These helpers turn the same
// procedural pipeline into deliberate pixel material — dithered stone,
// hairline cracks, inset bevels — while keeping the exact diamond footprint
// that makes the lattice tessellate (the reason rune_tiles.png stays off).

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic LCG so tiles render identically every boot (visual tests). */
function makeRng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function mix(c: number, toward: number, f: number): number {
  const r = Math.round((c >> 16 & 255) * (1 - f) + (toward >> 16 & 255) * f);
  const g = Math.round((c >> 8 & 255) * (1 - f) + (toward >> 8 & 255) * f);
  const b = Math.round((c & 255) * (1 - f) + (toward & 255) * f);
  return (r << 16) | (g << 8) | b;
}

const darken = (c: number, f: number): number => mix(c, 0x000000, f);
const lighten = (c: number, f: number): number => mix(c, 0xffffff, f);

/** Normalized diamond test with a pixel margin, for clipping speckle/cracks. */
function insideDiamond(x: number, y: number, hw: number, hh: number, m: number): boolean {
  return Math.abs(x - hw) / (hw - m) + Math.abs(y - hh) / (hh - m) <= 1;
}

/**
 * Draw a pixel-art stone diamond tile as a texture.
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
  const rng = makeRng(hashSeed(key));

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

  // ── Top-left face highlight (lit from above-left) ────────────────────────
  g.fillStyle(0xffffff, 0.06);
  g.beginPath();
  g.moveTo(hw, 0);
  g.lineTo(hw, H);
  g.lineTo(0,  hh);
  g.closePath();
  g.fillPath();

  // ── Stone speckle: seeded 2px flecks in two darker + one lighter tone ────
  const darkFleck = darken(fillColor, 0.35);
  const deepFleck = darken(fillColor, 0.55);
  const liteFleck = lighten(fillColor, 0.16);
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(rng() * W);
    const y = Math.floor(rng() * H);
    if (!insideDiamond(x + 1, y + 1, hw, hh, 4)) continue;
    const roll = rng();
    if (roll < 0.42) g.fillStyle(darkFleck, 0.55);
    else if (roll < 0.62) g.fillStyle(deepFleck, 0.5);
    else g.fillStyle(liteFleck, 0.38);
    g.fillRect(x, y, 2, 2);
  }

  // ── Hairline cracks: 2 short seeded polylines in the deep tone ───────────
  for (let c = 0; c < 2; c++) {
    let x = hw + (rng() - 0.5) * hw * 0.9;
    let y = hh + (rng() - 0.5) * hh * 0.9;
    g.lineStyle(1, deepFleck, 0.6);
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 3; s++) {
      const nx = x + (rng() - 0.5) * 18;
      const ny = y + (rng() - 0.5) * 9;
      if (!insideDiamond(nx, ny, hw, hh, 5)) break;
      g.lineTo(nx, ny);
      x = nx;
      y = ny;
    }
    g.strokePath();
  }

  // ── Inset bevel: light on the two lit edges, dark on the shaded pair ─────
  const bevelIn = 3;
  g.lineStyle(2, lighten(strokeColor, 0.25), Math.min(1, strokeAlpha * 0.8));
  g.beginPath();
  g.moveTo(hw, bevelIn);
  g.lineTo(bevelIn + hw * (bevelIn / H), hh); // toward left vertex, inset
  g.strokePath();
  g.beginPath();
  g.moveTo(hw, bevelIn);
  g.lineTo(W - bevelIn - hw * (bevelIn / H), hh); // toward right vertex, inset
  g.strokePath();
  g.lineStyle(2, darken(fillColor, 0.5), 0.75);
  g.beginPath();
  g.moveTo(bevelIn + hw * (bevelIn / H), hh);
  g.lineTo(hw, H - bevelIn);
  g.lineTo(W - bevelIn - hw * (bevelIn / H), hh);
  g.strokePath();

  // ── Edge border ──────────────────────────────────────────────────────────
  g.lineStyle(1, strokeColor, strokeAlpha);
  g.beginPath();
  g.moveTo(hw, 0);
  g.lineTo(W,  hh);
  g.lineTo(hw, H);
  g.lineTo(0,  hh);
  g.closePath();
  g.strokePath();

  // ── Carved rune: dark under-shadow first, then the glyph on top ──────────
  const cx = hw;
  const cy = hh;
  const arm = Math.round(H * 0.22);
  const dia = Math.round(H * 0.3);

  const drawGlyph = (ox: number, oy: number, color: number, alpha: number) => {
    g.lineStyle(2, color, alpha);
    g.beginPath();
    g.moveTo(cx - arm + ox, cy + oy); g.lineTo(cx + arm + ox, cy + oy);
    g.moveTo(cx + ox, cy - arm + oy); g.lineTo(cx + ox, cy + arm + oy);
    g.strokePath();
    g.beginPath();
    g.moveTo(cx + ox,       cy - dia + oy);
    g.lineTo(cx + dia + ox, cy + oy);
    g.lineTo(cx + ox,       cy + dia + oy);
    g.lineTo(cx - dia + ox, cy + oy);
    g.closePath();
    g.strokePath();
  };
  drawGlyph(0, 1, deepFleck, Math.min(1, runeAlpha * 0.7)); // carved shadow
  drawGlyph(0, 0, runeColor, runeAlpha);

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
