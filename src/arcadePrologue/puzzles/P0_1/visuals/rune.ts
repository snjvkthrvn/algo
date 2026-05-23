import Phaser from 'phaser';
import { PERSPECTIVE_Y, TILE_SIZE, s } from '../tokens';
import { VISUAL_REVAMP_KEYS } from '../../../../config/assets';

/**
 * Rune-tile rendering — both DIM and LIT use generated cosmic stone tile
 * assets (P0_1_COSMIC_TILE_DIM / P0_1_COSMIC_TILE_LIT). The LIT variant was
 * deterministically derived from the DIM source so silhouettes overlay 1:1.
 *
 * Glyphs are painted on top of the stone with Phaser text so each tile reads
 * as a unique rune carving even though the base texture is shared.
 */

const RUNE_DIM_KEY = VISUAL_REVAMP_KEYS.P0_1_COSMIC_TILE_DIM;
const RUNE_LIT_KEY = VISUAL_REVAMP_KEYS.P0_1_COSMIC_TILE_LIT;

const GLYPHS = ['◇', '◆', '◈', '✦', '✧', '⟁', '⟡', '⟢', '◉', '✺'];

export function ensureRuneTexture(_scene: Phaser.Scene): string {
  // Both DIM and LIT are now generated assets preloaded by BootScene; no
  // procedural fallback is needed. Function kept for symmetry with the
  // scene.create() call sequence.
  return RUNE_DIM_KEY;
}

export function placeRune(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Image {
  const image = scene.add.image(x, y, RUNE_DIM_KEY).setDepth(6);
  // The generated cosmic_tile asset is 256x220 px; fit it into the in-engine
  // tile slot which is TILE_SIZE wide × TILE_SIZE*PERSPECTIVE_Y tall.
  image.setDisplaySize(TILE_SIZE + s(6) * 2, TILE_SIZE * PERSPECTIVE_Y + s(6) * 2);
  // Stamp a glyph on top so each tile reads as "a rune-engraved stone, not just a square."
  const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
  const glyphText = scene.add
    .text(x, y, glyph, {
      fontFamily: '"Cinzel", Georgia, serif',
      fontSize: `${Math.round(TILE_SIZE * 0.45)}px`,
      color: '#6a5a9a',
    })
    .setOrigin(0.5)
    .setDepth(6.5)
    .setAlpha(0.7);
  image.setData('glyphText', glyphText);
  image.setData('lit', false);
  return image;
}

export function setRuneLit(image: Phaser.GameObjects.Image, lit: boolean): void {
  if (image.getData('lit') === lit) return;
  image.setTexture(lit ? RUNE_LIT_KEY : RUNE_DIM_KEY);
  image.setData('lit', lit);
  const glyphText = image.getData('glyphText') as Phaser.GameObjects.Text | undefined;
  if (glyphText) {
    glyphText.setColor(lit ? '#e0f8ff' : '#6a5a9a');
    glyphText.setAlpha(lit ? 1 : 0.7);
  }
}

