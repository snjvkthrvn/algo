import Phaser from 'phaser';
import { GRID_COLS, GRID_ROWS, TILE_SIZE, PERSPECTIVE_Y, s } from './tokens';
import { placeRune } from './visuals/rune';
import { GRID_BOUNDS, cellKey, cellToWorld, gridOrigin, inBounds, neighborSteps } from './gridLayout';
import type { Round } from './rounds';

/**
 * 6×6 grid board for one round.
 *
 * Owns the glyph map (one Image per cell of the round's field), neighbor
 * adjacency (4-directional), the walk-key sequence, and an anchor used by
 * other modules for centered effects.
 *
 * Rendering decisions live in visuals/rune.ts and visuals/grid.ts.
 */

export type Glyph = Phaser.GameObjects.Image;

export type Board = {
  glyphs: Map<string, Glyph>;
  neighbors: Map<string, Set<string>>;
  walkKeys: string[];
  anchor: Phaser.Math.Vector2;
  decorativeTiles: Phaser.GameObjects.Image[];
};

export function mountBoard(scene: Phaser.Scene, round: Round): Board {
  const field = new Set(round.field.map((c) => cellKey(c.col, c.row)));
  const neighbors = buildNeighborMap(field);

  const origin = gridOrigin();
  const anchor = new Phaser.Math.Vector2(
    origin.x + GRID_BOUNDS.width / 2,
    origin.y + GRID_BOUNDS.height / 2,
  );

  const glyphs = new Map<string, Glyph>();
  const decorativeTiles: Phaser.GameObjects.Image[] = [];
  // Render the full 6×6 grid as the visible board. Field tiles (path candidates)
  // get full opacity; non-field tiles render at low alpha to show the rest of
  // the platform without offering interaction.
  for (let r = 0; r < GRID_ROWS; r += 1) {
    for (let c = 0; c < GRID_COLS; c += 1) {
      const pos = cellToWorld(c, r);
      const node = placeRune(scene, pos.x, pos.y);
      const key = cellKey(c, r);
      const inField = field.has(key);
      if (inField) {
        const hitW = TILE_SIZE + s(6);
        const hitH = TILE_SIZE * PERSPECTIVE_Y + s(6);
        node.setInteractive(
          new Phaser.Geom.Rectangle(
            node.width / 2 - hitW / 2,
            node.height / 2 - hitH / 2,
            hitW,
            hitH,
          ),
          Phaser.Geom.Rectangle.Contains,
        );
        glyphs.set(key, node);
      } else {
        // Decorative-only tile — render dim, no glyph interaction.
        node.setAlpha(0.35);
        const glyphText = node.getData('glyphText') as Phaser.GameObjects.Text | undefined;
        glyphText?.setAlpha(0.18);
        decorativeTiles.push(node);
      }
    }
  }

  return {
    glyphs,
    neighbors,
    walkKeys: round.walk.map((c) => cellKey(c.col, c.row)),
    anchor,
    decorativeTiles,
  };
}

export function unmountBoard(board: Board): void {
  for (const node of board.glyphs.values()) {
    node.disableInteractive();
    const glyphText = node.getData('glyphText') as Phaser.GameObjects.Text | undefined;
    glyphText?.destroy();
    node.destroy();
  }
  for (const node of board.decorativeTiles) {
    const glyphText = node.getData('glyphText') as Phaser.GameObjects.Text | undefined;
    glyphText?.destroy();
    node.destroy();
  }
  board.glyphs.clear();
  board.decorativeTiles.length = 0;
  board.neighbors.clear();
  board.walkKeys.length = 0;
}

export function coordsOf(board: Board, key: string): Phaser.Math.Vector2 {
  const node = board.glyphs.get(key)!;
  return new Phaser.Math.Vector2(node.x, node.y);
}

export function nearestLegal(
  board: Board,
  currentKey: string,
  worldX: number,
  worldY: number,
  hitRadius: number,
  snapBias: number,
): { key: string; distance: number } | null {
  const legal = board.neighbors.get(currentKey);
  let best: { key: string; distance: number } | null = null;
  board.glyphs.forEach((node, key) => {
    let d = Phaser.Math.Distance.Between(worldX, worldY, node.x, node.y);
    if (legal?.has(key)) d -= snapBias;
    if (d > hitRadius) return;
    if (!best || d < best.distance) best = { key, distance: d };
  });
  return best;
}

export function bestSteer(
  board: Board,
  currentKey: string,
  dx: number,
  dy: number,
): string | null {
  const options = [...(board.neighbors.get(currentKey) ?? [])];
  if (!options.length) return null;
  const origin = coordsOf(board, currentKey);
  let bestKey = options[0]!;
  let projection = Number.NEGATIVE_INFINITY;
  for (const k of options) {
    const p = coordsOf(board, k);
    const score = dx * (p.x - origin.x) + dy * (p.y - origin.y);
    if (score > projection) {
      projection = score;
      bestKey = k;
    }
  }
  return projection < s(8) ? null : bestKey;
}

function buildNeighborMap(field: Set<string>): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  field.forEach((k) => map.set(k, new Set()));
  field.forEach((k) => {
    const [c, r] = k.split(',').map(Number);
    neighborSteps().forEach((step) => {
      const nc = c! + step.dc;
      const nr = r! + step.dr;
      if (!inBounds(nc, nr)) return;
      const sibling = cellKey(nc, nr);
      if (field.has(sibling)) map.get(k)!.add(sibling);
    });
  });
  return map;
}
