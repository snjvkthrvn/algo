import Phaser from 'phaser';
import { COLORS, s } from '../../P0_1/tokens';
import { axialKey } from '../../hexLayout';
import type { FlowRound } from './types';
import { coordsOf, type FlowBoard } from './board';

/**
 * Static directed edges. With reactive routing, there is no "selected" edge to
 * highlight; all edges render at uniform medium intensity. The pulse itself
 * traces the live path.
 */

export type EdgeLayer = {
  paint(round: FlowRound, board: FlowBoard): void;
  clear(): void;
};

const SHORTEN = s(18);

export function createEdges(scene: Phaser.Scene): EdgeLayer {
  const g = scene.add.graphics().setDepth(4);

  function paint(round: FlowRound, board: FlowBoard): void {
    g.clear();
    for (const edge of round.edges) {
      const fk = axialKey(edge.from.q, edge.from.r);
      const tk = axialKey(edge.to.q, edge.to.r);
      const from = coordsOf(board, fk);
      const to = coordsOf(board, tk);
      drawEdge(g, from, to);
    }
  }

  function clear(): void {
    g.clear();
  }

  return { paint, clear };
}

function drawEdge(
  g: Phaser.GameObjects.Graphics,
  from: Phaser.Math.Vector2,
  to: Phaser.Math.Vector2,
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const x0 = from.x + ux * SHORTEN;
  const y0 = from.y + uy * SHORTEN;
  const x1 = to.x - ux * SHORTEN;
  const y1 = to.y - uy * SHORTEN;

  g.lineStyle(s(1.6), COLORS.surface.line, 0.55);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.strokePath();
}
