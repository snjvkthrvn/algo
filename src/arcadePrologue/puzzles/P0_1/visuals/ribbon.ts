import Phaser from 'phaser';
import { COLORS, s } from '../tokens';
import type { Board } from '../board';

/**
 * Two-layer ribbon:
 *  - ghost   dashed surface line of the full walk (low-key, persistent)
 *  - trace   solid accent stroke of the player's traced portion + midpoint ticks
 */

export type Ribbon = {
  paintGhost(board: Board): void;
  paintTrace(board: Board, throughHop: number): void;
  clear(): void;
};

export function createRibbon(scene: Phaser.Scene): Ribbon {
  const ghost = scene.add.graphics().setDepth(4);
  const trace = scene.add.graphics().setDepth(7);

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

  function paintTrace(board: Board, throughHop: number): void {
    trace.clear();
    const chain = board.walkKeys.slice(0, throughHop + 1);
    if (chain.length < 2) return;

    trace.lineStyle(s(3), COLORS.accent, 0.9);
    for (let i = 1; i < chain.length; i += 1) {
      const a = coordsOf(board, chain[i - 1]!);
      const b = coordsOf(board, chain[i]!);
      trace.beginPath();
      trace.moveTo(a.x, a.y);
      trace.lineTo(b.x, b.y);
      trace.strokePath();
    }

    for (let i = 1; i < chain.length; i += 1) {
      const a = coordsOf(board, chain[i - 1]!);
      const b = coordsOf(board, chain[i]!);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      trace.fillStyle(COLORS.accent, 1);
      trace.fillCircle(mx, my, s(2.5));
    }
  }

  function clear(): void {
    ghost.clear();
    trace.clear();
  }

  return { paintGhost, paintTrace, clear };
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
