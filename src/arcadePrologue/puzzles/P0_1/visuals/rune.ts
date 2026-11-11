import Phaser from 'phaser';
import { COLORS, HEX_RADIUS, s } from '../tokens';

/**
 * Two cached rune textures:
 *  - RUNE_KEY      stone tile + dim engraved glyph (default state)
 *  - RUNE_LIT_KEY  bright cyan stone + glowing glyph (overlaid on walked path tiles by ribbon.ts)
 *
 * Every glyph on the board is a cheap Image referencing the stone texture; the
 * ribbon stamps a lit Image on top of each walked step so the path reads as
 * "tiles you've lit up" instead of a thin stroke between tiles.
 */

const RUNE_KEY = 'p0_1_rune';
const RUNE_LIT_KEY = 'p0_1_rune_lit';

const STONE_FILL = 0x12193a;
const STONE_HIGH = 0x2f3d72;
const STONE_RIM = 0x4a5c9e;
const STONE_SHADOW = 0x05070f;
const GLYPH_DIM = 0x6f80c0;
const LIT_FILL = 0x0e3a52;
const LIT_GLOW = 0x22d3ee;
const LIT_RIM = 0xa5f3fc;
const LIT_GLYPH = 0xecfeff;

function hexCorners(
  cx: number,
  cy: number,
  radius: number,
  dx = 0,
  dy = 0,
): Phaser.Math.Vector2[] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = Phaser.Math.DegToRad(60 * i - 90);
    return new Phaser.Math.Vector2(
      cx + dx + Math.cos(a) * radius,
      cy + dy + Math.sin(a) * radius,
    );
  });
}

// ── Pixel-material helpers (2026-07 audit: flat hex fills read as vector
// widgets over the painted chamber; same treatment as runeTile.ts) ──────────

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic LCG so textures render identically every boot. */
function makeRng(seed: number): () => number {
  let v = seed || 1;
  return () => {
    v = (Math.imul(v, 1664525) + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

function mixColor(c: number, toward: number, f: number): number {
  const r = Math.round((c >> 16 & 255) * (1 - f) + (toward >> 16 & 255) * f);
  const g = Math.round((c >> 8 & 255) * (1 - f) + (toward >> 8 & 255) * f);
  const b = Math.round((c & 255) * (1 - f) + (toward & 255) * f);
  return (r << 16) | (g << 8) | b;
}

const darkenColor = (c: number, f: number): number => mixColor(c, 0x000000, f);
const lightenColor = (c: number, f: number): number => mixColor(c, 0xffffff, f);

function drawGlyph(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  color: number,
  alpha: number,
): void {
  const d = s(11);
  g.lineStyle(s(1.6), color, alpha);
  g.beginPath();
  g.moveTo(cx, cy - d);
  g.lineTo(cx + d, cy);
  g.lineTo(cx, cy + d);
  g.lineTo(cx - d, cy);
  g.closePath();
  g.strokePath();
  g.lineStyle(s(1), color, alpha * 0.7);
  g.beginPath();
  g.moveTo(cx - d * 0.55, cy);
  g.lineTo(cx + d * 0.55, cy);
  g.moveTo(cx, cy - d * 0.55);
  g.lineTo(cx, cy + d * 0.55);
  g.strokePath();
  g.fillStyle(color, alpha);
  g.fillCircle(cx, cy, s(2));
}

function paintRune(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  lit: boolean,
  seedKey: string,
): void {
  const radius = HEX_RADIUS - s(2);
  const base = lit ? LIT_FILL : STONE_FILL;
  const rng = makeRng(hashSeed(seedKey));

  g.fillStyle(STONE_SHADOW, 0.55);
  g.fillPoints(hexCorners(cx, cy, radius, s(1), s(5)), true);

  g.fillStyle(base, 1);
  g.fillPoints(hexCorners(cx, cy, radius), true);

  // Top-light wash across the upper half (lit from above-left, matching the
  // chamber's shafts) — corners: 0 top, then clockwise.
  const cs = hexCorners(cx, cy, radius);
  g.fillStyle(0xffffff, 0.05);
  g.fillPoints(
    [cs[4], cs[5], cs[0], cs[1], new Phaser.Math.Vector2(cx, cy)],
    true,
  );

  if (lit) {
    g.fillStyle(LIT_GLOW, 0.18);
    g.fillPoints(hexCorners(cx, cy, radius - s(4)), true);
  }

  // Stone speckle: seeded 2px flecks in two darker tones + one lighter.
  const dark1 = darkenColor(base, 0.38);
  const dark2 = darkenColor(base, 0.58);
  const lite = lightenColor(base, lit ? 0.24 : 0.14);
  for (let i = 0; i < 120; i++) {
    const ang = rng() * Math.PI * 2;
    const rr = Math.sqrt(rng()) * (radius - s(6));
    const px = cx + Math.cos(ang) * rr;
    const py = cy + Math.sin(ang) * rr;
    const roll = rng();
    if (roll < 0.42) g.fillStyle(dark1, 0.5);
    else if (roll < 0.62) g.fillStyle(dark2, 0.45);
    else g.fillStyle(lite, 0.35);
    g.fillRect(px, py, 2, 2);
  }

  // Hairline cracks: two short seeded polylines.
  for (let c = 0; c < 2; c++) {
    let px = cx + (rng() - 0.5) * radius;
    let py = cy + (rng() - 0.5) * radius * 0.8;
    g.lineStyle(1, dark2, 0.55);
    g.beginPath();
    g.moveTo(px, py);
    for (let seg = 0; seg < 3; seg++) {
      const nx = px + (rng() - 0.5) * s(14);
      const ny = py + (rng() - 0.5) * s(9);
      if (Math.hypot(nx - cx, ny - cy) > radius - s(7)) break;
      g.lineTo(nx, ny);
      px = nx;
      py = ny;
    }
    g.strokePath();
  }

  // Directional bevel: lit edges up-left, shaded edges down-right.
  const bev = hexCorners(cx, cy, radius - s(3));
  g.lineStyle(s(1.5), lightenColor(lit ? LIT_RIM : STONE_RIM, 0.15), lit ? 0.9 : 0.6);
  g.beginPath();
  g.moveTo(bev[4].x, bev[4].y);
  g.lineTo(bev[5].x, bev[5].y);
  g.lineTo(bev[0].x, bev[0].y);
  g.lineTo(bev[1].x, bev[1].y);
  g.strokePath();
  g.lineStyle(s(1.5), darkenColor(base, 0.5), 0.7);
  g.beginPath();
  g.moveTo(bev[1].x, bev[1].y);
  g.lineTo(bev[2].x, bev[2].y);
  g.lineTo(bev[3].x, bev[3].y);
  g.lineTo(bev[4].x, bev[4].y);
  g.strokePath();

  g.lineStyle(s(1), lit ? LIT_GLOW : STONE_HIGH, 0.85);
  g.strokePoints(hexCorners(cx, cy, radius - s(7)), true);

  g.lineStyle(s(1.5), lit ? LIT_RIM : STONE_RIM, lit ? 1 : 0.8);
  g.strokePoints(hexCorners(cx, cy, radius), true);

  // Carved glyph: dark under-shadow a pixel below, then the glyph on top.
  drawGlyph(g, cx, cy + 1, dark2, lit ? 0.6 : 0.55);
  drawGlyph(g, cx, cy, lit ? LIT_GLYPH : GLYPH_DIM, lit ? 1 : 0.85);
}

function bakeTexture(scene: Phaser.Scene, key: string, lit: boolean): void {
  if (scene.textures.exists(key)) return;
  const pad = s(14);
  const size = (HEX_RADIUS + pad) * 2;
  const g = scene.make.graphics(undefined, false);
  paintRune(g, size / 2, size / 2, lit, key);
  g.generateTexture(key, size, size);
  g.destroy();
}

export function ensureRuneTexture(scene: Phaser.Scene): string {
  bakeTexture(scene, RUNE_KEY, false);
  bakeTexture(scene, RUNE_LIT_KEY, true);
  // Silence unused-import lint: COLORS is still useful for future variants.
  void COLORS;
  return RUNE_KEY;
}

export function placeRune(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Image {
  return scene.add.image(x, y, RUNE_KEY).setDepth(6);
}

export function placeRuneLit(
  scene: Phaser.Scene,
  x: number,
  y: number,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, RUNE_LIT_KEY).setDepth(6.5);
}
