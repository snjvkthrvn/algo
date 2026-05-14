import Phaser from 'phaser';
import { COLORS, HEX_RADIUS, s } from '../../P0_1/tokens';
import { MOTION } from '../../P0_1/motion';
import { axialKey } from '../../hexLayout';
import { coordsOf, type FlowBoard } from '../../P0_2/board';
import type { LitanyRound } from '../rounds';

/**
 * Altar markers — a warn-colored cross with a center bead.
 * Distinct from source (filled dot) and sink (concentric ring) so the player
 * recognizes a checkpoint at a glance.
 */

export type Altars = {
  paint(round: LitanyRound, board: FlowBoard): void;
  chime(board: FlowBoard, key: string): void;
  shimmerMissed(board: FlowBoard, keys: string[]): void;
  clear(): void;
};

export function createAltars(scene: Phaser.Scene): Altars {
  const g = scene.add.graphics().setDepth(8);

  function paint(round: LitanyRound, board: FlowBoard): void {
    g.clear();
    for (const a of round.altars) {
      const at = coordsOf(board, axialKey(a.q, a.r));
      drawAltar(g, at.x, at.y);
    }
  }

  function chime(board: FlowBoard, key: string): void {
    const at = coordsOf(board, key);
    const ring = scene.add
      .circle(at.x, at.y, s(14), 0, 0)
      .setStrokeStyle(s(2), COLORS.warn, 0.85)
      .setDepth(13);
    scene.tweens.add({
      targets: ring,
      scale: 1.7,
      alpha: 0,
      duration: 480,
      ease: MOTION.win.ease,
      onComplete: () => ring.destroy(),
    });
  }

  function shimmerMissed(board: FlowBoard, keys: string[]): void {
    keys.forEach((k) => {
      const at = coordsOf(board, k);
      const ring = scene.add
        .circle(at.x, at.y, HEX_RADIUS + s(2), 0, 0)
        .setStrokeStyle(s(1.6), COLORS.warn, 0.7)
        .setDepth(12);
      scene.tweens.add({
        targets: ring,
        scale: 1.16,
        alpha: 0,
        duration: 460,
        ease: MOTION.mistake.ease,
        onComplete: () => ring.destroy(),
      });
    });
  }

  function clear(): void {
    g.clear();
  }

  return { paint, chime, shimmerMissed, clear };
}

function drawAltar(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(s(2.2), COLORS.warn, 0.95);
  g.beginPath();
  g.moveTo(x - s(8), y);
  g.lineTo(x + s(8), y);
  g.strokePath();
  g.beginPath();
  g.moveTo(x, y - s(8));
  g.lineTo(x, y + s(8));
  g.strokePath();
  g.fillStyle(COLORS.warn, 1);
  g.fillCircle(x, y, s(2.6));
}
