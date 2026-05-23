import Phaser from 'phaser';
import { COLORS, s } from '../../P0_1/tokens';
import { axialKey } from '../../hexLayout';
import type { FlowRound } from './types';
import { coordsOf, type FlowBoard } from './board';

/**
 * Role overlays for reactive flow:
 *  source — filled center dot inside a faint halo
 *  sink   — concentric rings (receptor)
 *  fork   — short accent arrows pointing at EACH choice (decision indicator).
 *           No pre-selection: the pulse chooses live, the player commits.
 */

export type Markers = {
  paint(round: FlowRound, board: FlowBoard): void;
  clear(): void;
};

export function createMarkers(scene: Phaser.Scene): Markers {
  const g = scene.add.graphics().setDepth(7);

  function paint(round: FlowRound, board: FlowBoard): void {
    g.clear();

    const src = coordsOf(board, board.sourceKey);
    g.lineStyle(s(1), COLORS.accent, 0.35);
    g.strokeCircle(src.x, src.y, s(12));
    g.fillStyle(COLORS.accent, 1);
    g.fillCircle(src.x, src.y, s(5.5));

    const sink = coordsOf(board, board.sinkKey);
    g.lineStyle(s(2.2), COLORS.accent, 0.85);
    g.strokeCircle(sink.x, sink.y, s(9));
    g.lineStyle(s(1), COLORS.accent, 0.35);
    g.strokeCircle(sink.x, sink.y, s(15));

    for (const f of round.forks) {
      const fk = axialKey(f.at.q, f.at.r);
      const center = coordsOf(board, fk);
      for (const choice of f.choices) {
        const tip = coordsOf(board, axialKey(choice.q, choice.r));
        drawShortArrow(g, center, tip);
      }
    }
  }

  function clear(): void {
    g.clear();
  }

  return { paint, clear };
}

function drawShortArrow(
  g: Phaser.GameObjects.Graphics,
  from: Phaser.Math.Vector2,
  toward: Phaser.Math.Vector2,
): void {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;

  const baseX = from.x + ux * s(4);
  const baseY = from.y + uy * s(4);
  const tipX = from.x + ux * s(14);
  const tipY = from.y + uy * s(14);

  g.lineStyle(s(1.8), COLORS.accent, 0.6);
  g.beginPath();
  g.moveTo(baseX, baseY);
  g.lineTo(tipX, tipY);
  g.strokePath();

  const head = s(4.4);
  const px = -uy;
  const py = ux;
  g.fillStyle(COLORS.accent, 0.8);
  g.fillTriangle(
    tipX,
    tipY,
    tipX - ux * head + px * head * 0.6,
    tipY - uy * head + py * head * 0.6,
    tipX - ux * head - px * head * 0.6,
    tipY - uy * head - py * head * 0.6,
  );
}
