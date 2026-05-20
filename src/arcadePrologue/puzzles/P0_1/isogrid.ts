import type Phaser from 'phaser';
import { getTileKey } from './visuals/runeTile';
import { TILE_W, TILE_H } from './tokens';

/**
 * Rectangular isometric-perspective grid.
 *
 * Each cell is offset slightly rightward per row (ROW_DRIFT) to fake depth.
 * Depth ordering uses `depth = BASE_DEPTH + row * 2` so lower rows render in front.
 */

export type GridPos = { row: number; col: number };

export type GridCell = {
  row: number;
  col: number;
  x: number;
  y: number;
  base: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  glowTween?: Phaser.Tweens.Tween;
};

export type IsoGrid = {
  cells: Map<string, GridCell>;
  pathKeys: string[];
  fieldKeys: string[];
  doneKeys: Set<string>;
  /**
   * When true, base tile images are invisible — the stone_arena art provides
   * the floor texture and we only render glow overlays on active tiles.
   */
  hideBase: boolean;
};

export { TILE_W, TILE_H } from './tokens';
export const GRID_ROWS = 6;
export const GRID_COLS = 8;
const BASE_DEPTH = 10;

/**
 * True isometric origin — centres the 6×8 diamond on the canvas.
 *
 * Diamond extents with TILE_W=128, TILE_H=64:
 *   x ranges: ORIGIN_X ± (max(col,row) * TILE_W/2)
 *   The grid center (avg col=3.5, avg row=2.5) maps to screen (640, 340).
 *     ORIGIN_X = 640 - (3.5 - 2.5)*64 = 640 - 64 = 576
 *     ORIGIN_Y = 340 - (3.5 + 2.5)*32 = 340 - 192 = 148
 */
const ORIGIN_X = 576;
const ORIGIN_Y = 148;

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function cellWorldPos(row: number, col: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + (col - row) * (TILE_W / 2),
    y: ORIGIN_Y + (col + row) * (TILE_H / 2),
  };
}

export function mountIsoGrid(
  scene: Phaser.Scene,
  field: GridPos[],
  path: GridPos[],
  hideBase = false,
): IsoGrid {
  const pathSet = new Set(path.map((p) => cellKey(p.row, p.col)));
  const cells = new Map<string, GridCell>();

  for (const pos of field) {
    const key = cellKey(pos.row, pos.col);
    const { x, y } = cellWorldPos(pos.row, pos.col);
    const isOnPath = pathSet.has(key);
    const depth = BASE_DEPTH + pos.row + pos.col;

    const { key: baseKey, frame: baseFrame, needsResize } = getTileKey(isOnPath ? 'on' : 'off', scene);
    const base = scene.add
      .image(x, y, baseKey, baseFrame)
      .setDepth(depth)
      .setAlpha(hideBase ? 0 : 1);
    if (!hideBase && needsResize) base.setDisplaySize(TILE_W, TILE_H);

    // Glow overlay — additive bloom that sits above the tile (or art floor).
    const glow = scene.add
      .image(x, y, 'iso_tile_glow')
      .setDepth(depth + 1)
      .setBlendMode('ADD')
      .setAlpha(0);

    let glowTween: Phaser.Tweens.Tween | undefined;
    if (isOnPath && !hideBase && !needsResize) {
      // Procedural tile: pulsing bloom until dimPathTiles stops it
      glow.setAlpha(0.45);
      glowTween = scene.tweens.add({
        targets: glow,
        alpha: { from: 0.45, to: 0.12 },
        duration: 950,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    cells.set(key, { row: pos.row, col: pos.col, x, y, base, glow, glowTween });
  }

  return {
    cells,
    pathKeys: path.map((p) => cellKey(p.row, p.col)),
    fieldKeys: field.map((p) => cellKey(p.row, p.col)),
    doneKeys: new Set<string>(),
    hideBase,
  };
}

export function unmountIsoGrid(grid: IsoGrid): void {
  for (const cell of grid.cells.values()) {
    cell.glowTween?.stop();
    cell.base.destroy();
    cell.glow.destroy();
  }
  grid.cells.clear();
  (grid as { pathKeys: string[] }).pathKeys = [];
  (grid as { fieldKeys: string[] }).fieldKeys = [];
  (grid as { hideBase: boolean }).hideBase = false;
  grid.doneKeys.clear();
}

/** Mark a tile as "stepped on" — stop its glow tween and swap to the done texture. */
export function markCellDone(grid: IsoGrid, row: number, col: number, scene: Phaser.Scene): void {
  const key = cellKey(row, col);
  grid.doneKeys.add(key);
  const cell = grid.cells.get(key);
  if (!cell) return;
  cell.glowTween?.stop();
  if (!grid.hideBase) {
    const { key: doneKey, frame: doneFrame, needsResize } = getTileKey('done', scene);
    cell.base.setTexture(doneKey, doneFrame);
    if (needsResize) cell.base.setDisplaySize(TILE_W, TILE_H);
  }
  scene.tweens.add({
    targets: cell.glow,
    alpha: grid.hideBase ? 0.55 : 0.6,
    duration: 200,
    yoyo: false,
    ease: 'Power2.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: cell.glow,
        alpha: 0.18,
        duration: 1200,
        ease: 'Sine.easeInOut',
      });
    },
  });
}

/**
 * Fade all un-stepped path tiles back to 'off' — the memory phase.
 * Already-done tiles are skipped so player progress stays visible.
 */
export function dimPathTiles(grid: IsoGrid, scene: Phaser.Scene): void {
  for (const key of grid.pathKeys) {
    if (grid.doneKeys.has(key)) continue;
    const cell = grid.cells.get(key);
    if (!cell) continue;
    cell.glowTween?.stop();
    cell.glowTween = undefined;
    if (!grid.hideBase) {
      const { key: offKey, frame: offFrame, needsResize } = getTileKey('off', scene);
      cell.base.setTexture(offKey, offFrame);
      if (needsResize) cell.base.setDisplaySize(TILE_W, TILE_H);
    }
    scene.tweens.add({
      targets: cell.glow,
      alpha: 0,
      duration: 400,
      ease: 'Power2.easeOut',
    });
  }
}

/**
 * Light a single tile to 'on' for holdMs then fade back to 'off'.
 * Used during preview to create sequential reveal — one tile at a time.
 */
export function flashTileOn(
  grid: IsoGrid,
  row: number,
  col: number,
  scene: Phaser.Scene,
  holdMs: number,
): void {
  const key = cellKey(row, col);
  if (grid.doneKeys.has(key)) return;
  const cell = grid.cells.get(key);
  if (!cell) return;

  cell.glowTween?.stop();
  if (!grid.hideBase) {
    const { key: onKey, frame: onFrame, needsResize } = getTileKey('on', scene);
    cell.base.setTexture(onKey, onFrame);
    if (needsResize) cell.base.setDisplaySize(TILE_W, TILE_H);
  }
  // Brighter flash when art floor is used — glow is the only visual indicator
  cell.glow.setAlpha(grid.hideBase ? 0.75 : 0.5);

  scene.time.delayedCall(holdMs, () => {
    if (grid.doneKeys.has(key)) return;
    if (!grid.hideBase) {
      const { key: offKey, frame: offFrame, needsResize: offResize } = getTileKey('off', scene);
      cell.base.setTexture(offKey, offFrame);
      if (offResize) cell.base.setDisplaySize(TILE_W, TILE_H);
    }
    scene.tweens.add({ targets: cell.glow, alpha: 0, duration: 200, ease: 'Power2.easeOut' });
  });
}

/** Flash a tile red briefly (wrong step). */
export function flashCellError(scene: Phaser.Scene, row: number, col: number): void {
  const { x, y } = cellWorldPos(row, col);
  const ring = scene.add
    .rectangle(x, y, TILE_W - 8, TILE_H - 8, 0xef4444, 0.55)
    .setDepth(BASE_DEPTH + row + col + 3);
  scene.tweens.add({
    targets: ring,
    alpha: 0,
    duration: 380,
    ease: 'Power2.easeIn',
    onComplete: () => ring.destroy(),
  });
}

/** 4-connected grid neighbors that exist in the field. */
export function getNeighbors(grid: IsoGrid, row: number, col: number): GridPos[] {
  return (
    [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ] as [number, number][]
  )
    .filter(([r, c]) => grid.cells.has(cellKey(r, c)))
    .map(([r, c]) => ({ row: r, col: c }));
}

/** Find the closest grid cell within `hitRadius` to a world coordinate. */
export function nearestCell(
  grid: IsoGrid,
  worldX: number,
  worldY: number,
  hitRadius: number,
): GridCell | null {
  let best: { cell: GridCell; dist: number } | null = null;
  for (const cell of grid.cells.values()) {
    const dist = distanceBetween(worldX, worldY, cell.x, cell.y);
    if (dist > hitRadius) continue;
    if (!best || dist < best.dist) best = { cell, dist };
  }
  return best?.cell ?? null;
}

function distanceBetween(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

/** Keyboard steering: pick the neighbor that best matches the direction vector. */
export function steerFrom(
  grid: IsoGrid,
  row: number,
  col: number,
  dx: number,
  dy: number,
): GridPos | null {
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
    const direct = { row, col: col + Math.sign(dx) };
    if (grid.cells.has(cellKey(direct.row, direct.col))) return direct;
  } else if (dy !== 0) {
    const direct = { row: row + Math.sign(dy), col };
    if (grid.cells.has(cellKey(direct.row, direct.col))) return direct;
  }

  const neighbors = getNeighbors(grid, row, col);
  const origin = cellWorldPos(row, col);
  let best: { pos: GridPos; score: number } | null = null;
  for (const n of neighbors) {
    const nw = cellWorldPos(n.row, n.col);
    const score = dx * (nw.x - origin.x) + dy * (nw.y - origin.y);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { pos: n, score };
  }
  return best?.pos ?? null;
}
