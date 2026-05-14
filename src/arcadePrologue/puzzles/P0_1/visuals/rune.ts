import Phaser from 'phaser';
import { COLORS, HEX_RADIUS, s } from '../tokens';

/**
 * Cached rune sprite.
 *
 * Four layers — shadow, stone, inner facet, accent rim — baked once into a single
 * texture. Every glyph on the board is a cheap Image referencing it.
 */

const RUNE_KEY = 'p0_1_rune';

export function ensureRuneTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(RUNE_KEY)) return RUNE_KEY;

  const pad = s(14);
  const size = (HEX_RADIUS + pad) * 2;
  const cx = size / 2;
  const cy = size / 2;

  const g = scene.make.graphics(undefined, false);

  const corners = (radius: number, dx = 0, dy = 0): Phaser.Math.Vector2[] =>
    Array.from({ length: 6 }, (_, i) => {
      const a = Phaser.Math.DegToRad(60 * i - 90);
      return new Phaser.Math.Vector2(cx + dx + Math.cos(a) * radius, cy + dy + Math.sin(a) * radius);
    });

  g.fillStyle(0x000000, 0.32);
  g.fillPoints(corners(HEX_RADIUS - s(2), s(1), s(5)), true);

  g.fillStyle(COLORS.surface.glass, 1);
  g.fillPoints(corners(HEX_RADIUS - s(2)), true);

  g.lineStyle(s(1), COLORS.surface.line, 0.55);
  g.strokePoints(corners(HEX_RADIUS - s(10)), true);

  g.lineStyle(s(1.5), COLORS.accent, 0.4);
  g.strokePoints(corners(HEX_RADIUS - s(2)), true);

  g.generateTexture(RUNE_KEY, size, size);
  g.destroy();

  return RUNE_KEY;
}

export function placeRune(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Image {
  return scene.add.image(x, y, RUNE_KEY).setDepth(6);
}
