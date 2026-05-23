import Phaser from 'phaser';
import { COLORS, s } from '../tokens';
import { GRID_BOUNDS, gridOrigin } from '../gridLayout';
import { setRuneLit } from './rune';
import { VISUAL_REVAMP_KEYS } from '../../../../config/assets';
import type { Board } from '../board';

/**
 * Cosmic-rune board renderer.
 *
 * Three responsibilities:
 *  1. Paint the circular stone platform that holds the tile grid.
 *  2. Highlight which tiles are part of the current path (paintGhost).
 *  3. Light up tiles walked so far and draw the connecting cyan trail (paintTrace).
 *
 * The "Ribbon" name survives from the previous horizontal-ribbon design — it
 * still describes the connecting trail between consecutive walked tiles.
 */

export type Ribbon = {
  paintGhost(board: Board): void;
  paintTrace(board: Board, throughHop: number): void;
  clear(): void;
};

export function createRibbon(scene: Phaser.Scene): Ribbon {
  paintPlatform(scene);

  const trail = scene.add.graphics().setDepth(7);

  function paintGhost(board: Board): void {
    // All path tiles glow softly throughout the round so the player can see
    // the route. The "chant" preview pulses individual tiles in sequence;
    // paintTrace then re-paints to brighten walked + next-expected tiles.
    const path = new Set(board.walkKeys);
    board.glyphs.forEach((g, k) => {
      setRuneLit(g, path.has(k));
      g.setAlpha(path.has(k) ? 0.55 : 0.6);
    });
  }

  function paintTrace(board: Board, throughHop: number): void {
    trail.clear();
    const chain = board.walkKeys.slice(0, throughHop + 1);
    const walked = new Set(chain);
    const nextExpected = board.walkKeys[throughHop + 1];
    const path = new Set(board.walkKeys);

    board.glyphs.forEach((g, k) => {
      const onPath = path.has(k);
      setRuneLit(g, onPath);
      if (walked.has(k) || k === nextExpected) g.setAlpha(1);
      else if (onPath) g.setAlpha(0.5);
      else g.setAlpha(0.85);
    });

    if (chain.length < 2) return;
    trail.lineStyle(s(3), COLORS.tile.lit, 0.9);
    for (let i = 1; i < chain.length; i += 1) {
      const a = coordsOf(board, chain[i - 1]!);
      const b = coordsOf(board, chain[i]!);
      trail.beginPath();
      trail.moveTo(a.x, a.y);
      trail.lineTo(b.x, b.y);
      trail.strokePath();
    }
  }

  function clear(): void {
    trail.clear();
  }

  return { paintGhost, paintTrace, clear };
}

function coordsOf(board: Board, key: string): Phaser.Math.Vector2 {
  const node = board.glyphs.get(key)!;
  return new Phaser.Math.Vector2(node.x, node.y);
}

/**
 * Place the circular stone platform asset behind the tile grid.
 * The asset is a 1000×700 pre-rendered pixel-art sprite; we display-size it
 * so the grid fits cleanly inside the platform's inner glowing ring.
 */
function paintPlatform(scene: Phaser.Scene): void {
  const origin = gridOrigin();
  const cx = origin.x + GRID_BOUNDS.width / 2;
  const cy = origin.y + GRID_BOUNDS.height / 2;
  // Size the platform so the grid (with some breathing room) fits within the
  // inner glowing ring of the asset, while the rune-inscribed rim extends well
  // beyond the grid edge for the marketing-grade silhouette.
  const platformWidth = GRID_BOUNDS.width * 2.0 + s(80);
  const platformHeight = GRID_BOUNDS.height * 2.4 + s(60);
  scene.add
    .image(cx, cy, VISUAL_REVAMP_KEYS.P0_1_COSMIC_PLATFORM)
    .setOrigin(0.5)
    .setDepth(3)
    .setDisplaySize(platformWidth, platformHeight);
  // Hint to keep the COLORS import used by paintGhost/paintTrace from being
  // flagged as unused — the platform itself is now an asset, no procedural draw.
  void COLORS;
}
