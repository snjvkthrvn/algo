import Phaser from 'phaser';
import { COLORS, s } from '../tokens';
import type { Board } from '../board';
import { placeRuneLit } from './rune';

/**
 * Path visuals layered:
 *  - ghost     dashed line of the full walk (low-key, persistent)
 *  - trace     soft outer glow + bright cyan stroke connecting walked tiles
 *  - lit tiles full-tile cyan rune overlays stamped on each walked step,
 *              so the path reads as "tiles you've lit" instead of a thin line
 */

export type Ribbon = {
  paintGhost(board: Board): void;
  paintTrace(board: Board, throughHop: number): void;
  clear(): void;
};

export function createRibbon(scene: Phaser.Scene): Ribbon {
  const ghost = scene.add.graphics().setDepth(4);
  const trace = scene.add.graphics().setDepth(7);
  let litTiles: Phaser.GameObjects.Image[] = [];

  function paintGhost(board: Board): void {
    ghost.clear();
    if (board.walkKeys.length < 2) return;
    ghost.lineStyle(s(1.5), COLORS.surface.line, 0.55);
    for (let i = 1; i < board.walkKeys.length; i += 1) {
      const a = coordsOf(board, board.walkKeys[i - 1]!);
      const b = coordsOf(board, board.walkKeys[i]!);
      strokeDashed(ghost, a, b, s(5), s(9));
    }
  }

  function clearLitTiles(): void {
    for (const img of litTiles) img.destroy();
    litTiles = [];
  }

  function paintTrace(board: Board, throughHop: number): void {
    trace.clear();
    clearLitTiles();
    const chain = board.walkKeys.slice(0, throughHop + 1);
    if (chain.length < 1) return;

    for (const key of chain) {
      const p = coordsOf(board, key);
      litTiles.push(placeRuneLit(scene, p.x, p.y));
    }

    if (chain.length < 2) return;

    trace.lineStyle(s(8), COLORS.accent, 0.22);
    drawChainPath(trace, board, chain);
    trace.lineStyle(s(3.5), COLORS.accent, 0.95);
    drawChainPath(trace, board, chain);
  }

  function clear(): void {
    ghost.clear();
    trace.clear();
    clearLitTiles();
  }

  return { paintGhost, paintTrace, clear };
}

function drawChainPath(
  g: Phaser.GameObjects.Graphics,
  board: Board,
  chain: string[],
): void {
  for (let i = 1; i < chain.length; i += 1) {
    const a = coordsOf(board, chain[i - 1]!);
    const b = coordsOf(board, chain[i]!);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.strokePath();
  }
}

function coordsOf(board: Board, key: string): Phaser.Math.Vector2 {
  const node = board.glyphs.get(key)!;
  return new Phaser.Math.Vector2(node.x, node.y);
}

function strokeDashed(
  g: Phaser.GameObjects.Graphics,
  a: Phaser.Math.Vector2,
  b: Phaser.Math.Vector2,
  dash: number,
  gap: number,
): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;
  const ux = dx / len;
  const uy = dy / len;
  let t = 0;
  let on = true;
  while (t < len) {
    const seg = on ? dash : gap;
    const next = Math.min(t + seg, len);
    if (on) {
      g.beginPath();
      g.moveTo(a.x + ux * t, a.y + uy * t);
      g.lineTo(a.x + ux * next, a.y + uy * next);
      g.strokePath();
    }
    t = next;
    on = !on;
  }
}
