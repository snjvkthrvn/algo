import Phaser from 'phaser';
import { axialKey, axialToPxFlatTop } from '../hexLayout';
import { HEX_RADIUS, s, STAGE } from '../P0_1/tokens';
import { placeRune } from '../P0_1/visuals/rune';
import type { FlowRound } from './rounds';

/**
 * Role-aware board mount for P0_2.
 * Reuses the cached rune texture from P0_1; role overlays are drawn by visuals/markers.
 */

export type Glyph = Phaser.GameObjects.Image;

export type Role = 'source' | 'sink' | 'fork' | 'wire';

export type FlowBoard = {
  glyphs: Map<string, Glyph>;
  roles: Map<string, Role>;
  anchor: Phaser.Math.Vector2;
  sourceKey: string;
  sinkKey: string;
  forkKeys: string[];
};

export function mountFlowBoard(scene: Phaser.Scene, round: FlowRound): FlowBoard {
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
    STAGE.height / 2 + s(16) - sumY / weight,
  );

  const sourceKey = axialKey(round.source.q, round.source.r);
  const sinkKey = axialKey(round.sink.q, round.sink.r);
  const forkSet = new Set(round.forks.map((f) => axialKey(f.at.q, f.at.r)));

  const glyphs = new Map<string, Glyph>();
  const roles = new Map<string, Role>();

  for (const a of round.field) {
    const key = axialKey(a.q, a.r);
    const off = axialToPxFlatTop(a.q, a.r, HEX_RADIUS);
    const node = placeRune(scene, anchor.x + off.x, anchor.y + off.y);
    node.setInteractive(
      new Phaser.Geom.Circle(node.width / 2, node.height / 2, HEX_RADIUS + s(8)),
      Phaser.Geom.Circle.Contains,
    );
    glyphs.set(key, node);

    let role: Role = 'wire';
    if (key === sourceKey) role = 'source';
    else if (key === sinkKey) role = 'sink';
    else if (forkSet.has(key)) role = 'fork';
    roles.set(key, role);
  }

  return {
    glyphs,
    roles,
    anchor,
    sourceKey,
    sinkKey,
    forkKeys: round.forks.map((f) => axialKey(f.at.q, f.at.r)),
  };
}

export function unmountFlowBoard(board: FlowBoard): void {
  board.glyphs.forEach((g) => {
    g.disableInteractive();
    g.removeAllListeners();
    g.destroy();
  });
  board.glyphs.clear();
}

export function coordsOf(board: FlowBoard, key: string): Phaser.Math.Vector2 {
  const node = board.glyphs.get(key)!;
  return new Phaser.Math.Vector2(node.x, node.y);
}
