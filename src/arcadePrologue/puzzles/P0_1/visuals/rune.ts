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
): void {
  const radius = HEX_RADIUS - s(2);

  g.fillStyle(STONE_SHADOW, 0.55);
  g.fillPoints(hexCorners(cx, cy, radius, s(1), s(5)), true);

  g.fillStyle(lit ? LIT_FILL : STONE_FILL, 1);
  g.fillPoints(hexCorners(cx, cy, radius), true);

  if (lit) {
    g.fillStyle(LIT_GLOW, 0.18);
    g.fillPoints(hexCorners(cx, cy, radius - s(4)), true);
  }

  g.lineStyle(s(1), lit ? LIT_GLOW : STONE_HIGH, 0.85);
  g.strokePoints(hexCorners(cx, cy, radius - s(7)), true);

  g.lineStyle(s(1.5), lit ? LIT_RIM : STONE_RIM, lit ? 1 : 0.8);
  g.strokePoints(hexCorners(cx, cy, radius), true);

  drawGlyph(g, cx, cy, lit ? LIT_GLYPH : GLYPH_DIM, lit ? 1 : 0.85);
}

function bakeTexture(scene: Phaser.Scene, key: string, lit: boolean): void {
  if (scene.textures.exists(key)) return;
  const pad = s(14);
  const size = (HEX_RADIUS + pad) * 2;
  const g = scene.make.graphics(undefined, false);
  paintRune(g, size / 2, size / 2, lit);
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
