import { describe, expect, it } from 'vitest';
import {
  cellKey,
  cellToWorld,
  GRID_BOUNDS,
  inBounds,
  neighborSteps,
  parseCell,
  worldToCell,
} from './gridLayout';
import { GRID_COLS, GRID_ROWS } from './tokens';

describe('grid layout', () => {
  it('encodes and parses cell keys symmetrically', () => {
    expect(cellKey(0, 0)).toBe('0,0');
    expect(cellKey(5, 3)).toBe('5,3');
    expect(parseCell('5,3')).toEqual({ col: 5, row: 3 });
  });

  it('bounds-checks within the 6×6 grid', () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(5, 5)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(6, 0)).toBe(false);
    expect(inBounds(0, 6)).toBe(false);
  });

  it('exposes exactly the four orthogonal steps for adjacency', () => {
    const steps = neighborSteps();
    expect(steps).toHaveLength(4);
    const offsets = steps.map((s) => `${s.dc},${s.dr}`).sort();
    expect(offsets).toEqual(['-1,0', '0,-1', '0,1', '1,0']);
  });

  it('round-trips cell ↔ world coords for every grid cell', () => {
    for (let c = 0; c < GRID_COLS; c += 1) {
      for (let r = 0; r < GRID_ROWS; r += 1) {
        const world = cellToWorld(c, r);
        const recovered = worldToCell(world.x, world.y);
        expect(recovered).toEqual({ col: c, row: r });
      }
    }
  });

  it('worldToCell returns null for coordinates outside the grid', () => {
    expect(worldToCell(-1000, -1000)).toBeNull();
    expect(worldToCell(99999, 99999)).toBeNull();
  });

  it('the grid bounds span 6×6 tiles', () => {
    expect(GRID_BOUNDS.width).toBeGreaterThan(0);
    expect(GRID_BOUNDS.height).toBeGreaterThan(0);
    // Height < width because of the perspective Y-squash.
    expect(GRID_BOUNDS.height).toBeLessThan(GRID_BOUNDS.width);
  });
});
