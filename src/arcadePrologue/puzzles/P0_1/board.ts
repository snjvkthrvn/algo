import Phaser from 'phaser';
import { axialKey, axialToPxFlatTop, buildAxialNeighbors, parseAxial } from '../hexLayout';
import { HEX_RADIUS, s, STAGE } from './tokens';
import { placeRune } from './visuals/rune';
import type { Round } from './rounds';

/**
 * Hex-grid board for one round.
 *
 * Owns the glyph map, neighbor adjacency, anchor offset, and walk keys.
 * No rendering decisions — visuals come from rune.ts/ribbon.ts.
 */

export type Glyph = Phaser.GameObjects.Image;

export type Board = {
  glyphs: Map<string, Glyph>;
  neighbors: Map<string, Set<string>>;
  walkKeys: string[];
  anchor: Phaser.Math.Vector2;
};

export function mountBoard(scene: Phaser.Scene, round: Round): Board {
  const field = new Set(round.field.map((s) => axialKey(s.q, s.r)));
  const neighbors = buildNeighborMap(field);

  let sumX = 0;
  let sumY = 0;
  const weight = Math.max(round.field.length, 1);
  for (const a of round.field) {
    const p = axialToPxFlatTop(a.q, a.r, HEX_RADIUS);
    sumX += p.x;
    sumY += p.y;
  }
  const anchor = new Phaser.Math.Vector2(
    STAGE.width / 2 - sumX / weight,
    STAGE.height / 2 + s(12) - sumY / weight,
  );

  const glyphs = new Map<string, Glyph>();
  for (const a of round.field) {
    const off = axialToPxFlatTop(a.q, a.r, HEX_RADIUS);
    const node = placeRune(scene, anchor.x + off.x, anchor.y + off.y);
    node.setInteractive(
      new Phaser.Geom.Circle(node.width / 2, node.height / 2, HEX_RADIUS + s(8)),
      Phaser.Geom.Circle.Contains,
    );
    glyphs.set(axialKey(a.q, a.r), node);
  }

  return {
    glyphs,
    neighbors,
    walkKeys: round.walk.map((s) => axialKey(s.q, s.r)),
    anchor,
  };
}

export function unmountBoard(board: Board): void {
  for (const node of board.glyphs.values()) {
    node.disableInteractive();
    node.destroy();
  }
  board.glyphs.clear();
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
  return projection < s(16) ? null : bestKey;
}

function buildNeighborMap(field: Set<string>): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  field.forEach((k) => map.set(k, new Set()));
  field.forEach((k) => {
    const a = parseAxial(k);
    buildAxialNeighbors().forEach((step) => {
      const sibling = axialKey(a.q + step.dq, a.r + step.dr);
      if (field.has(sibling)) map.get(k)!.add(sibling);
    });
  });
  return map;
}
