import { describe, expect, it } from 'vitest';
import {
  cellKey,
  cellWorldPos,
  getNeighbors,
  GRID_COLS,
  GRID_ROWS,
  steerFrom,
  type IsoGrid,
} from './isogrid';

function gridFor(cells: Array<{ row: number; col: number }>): IsoGrid {
  const map = new Map<string, any>();
  for (const cell of cells) {
    const world = cellWorldPos(cell.row, cell.col);
    map.set(cellKey(cell.row, cell.col), {
      ...cell,
      ...world,
      base: { destroy() {}, setTexture() { return this; }, setDisplaySize() { return this; }, setAlpha() { return this; } },
      glow: { destroy() {}, setAlpha() { return this; } },
    });
  }

  return {
    cells: map,
    pathKeys: [],
    fieldKeys: cells.map((cell) => cellKey(cell.row, cell.col)),
    doneKeys: new Set<string>(),
    hideBase: false,
  } as IsoGrid;
}

describe('P0-1 isometric grid', () => {
  it('projects row and column into a true 2:1 isometric diamond', () => {
    const origin = cellWorldPos(0, 0);
    expect(cellWorldPos(0, 1)).toEqual({ x: origin.x + 64, y: origin.y + 32 });
    expect(cellWorldPos(1, 0)).toEqual({ x: origin.x - 64, y: origin.y + 32 });
  });

  it('uses an 8 by 6 arena grid', () => {
    expect(GRID_COLS).toBe(8);
    expect(GRID_ROWS).toBe(6);
  });

  it('returns only four-connected neighbors that exist in the field', () => {
    const grid = gridFor([
      { row: 2, col: 2 },
      { row: 1, col: 2 },
      { row: 2, col: 3 },
      { row: 4, col: 4 },
    ]);

    expect(getNeighbors(grid, 2, 2)).toEqual([
      { row: 1, col: 2 },
      { row: 2, col: 3 },
    ]);
  });

  it('steers toward the neighbor most aligned to the input vector', () => {
    const grid = gridFor([
      { row: 2, col: 2 },
      { row: 1, col: 2 },
      { row: 3, col: 2 },
      { row: 2, col: 1 },
      { row: 2, col: 3 },
    ]);

    expect(steerFrom(grid, 2, 2, 1, 0)).toEqual({ row: 2, col: 3 });
    expect(steerFrom(grid, 2, 2, -1, 0)).toEqual({ row: 2, col: 1 });
  });
});
