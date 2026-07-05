import { describe, expect, it } from 'vitest';
import { AP_LANDMARK_KEYS } from '../../config/assets';
import {
  AP_FENCE_RUNS,
  AP_LANDMARKS,
  fenceRunCells,
} from './arrayPlainsLandmarks';
import {
  AP_TILE_COLS,
  AP_TILE_ROWS,
  AP_TILE_SIZE,
  buildArrayPlainsMaterialGrid,
} from './arrayPlainsTilemap';

const grid = buildArrayPlainsMaterialGrid();

describe('AP_LANDMARKS', () => {
  it('places every landmark base on dry, sensible ground', () => {
    for (const p of AP_LANDMARKS) {
      const tx = Math.floor(p.x / AP_TILE_SIZE);
      const ty = Math.floor((p.baseY - 1) / AP_TILE_SIZE);
      expect(tx).toBeGreaterThanOrEqual(0);
      expect(tx).toBeLessThan(AP_TILE_COLS);
      expect(ty).toBeGreaterThanOrEqual(0);
      expect(ty).toBeLessThan(AP_TILE_ROWS);
      const material = grid[ty][tx];
      expect(
        ['grass', 'path'],
        `${p.key} base @${tx},${ty} on ${material}`
      ).toContain(material);
    }
  });

  it('keeps trees and bushes off the walk lanes', () => {
    for (const p of AP_LANDMARKS) {
      if (
        p.key !== AP_LANDMARK_KEYS.TREE_LARGE &&
        p.key !== AP_LANDMARK_KEYS.TREE_SMALL &&
        p.key !== AP_LANDMARK_KEYS.BUSH
      ) {
        continue;
      }
      const tx = Math.floor(p.x / AP_TILE_SIZE);
      const ty = Math.floor((p.baseY - 1) / AP_TILE_SIZE);
      expect(grid[ty][tx], `${p.key} @${tx},${ty}`).toBe('grass');
    }
  });

  it('anchors the four buildings at the painting coordinates', () => {
    const byKey = new Map(AP_LANDMARKS.map((p) => [p.key, p]));
    expect(byKey.get(AP_LANDMARK_KEYS.SHED)).toMatchObject({ x: 448, baseY: 336 });
    expect(byKey.get(AP_LANDMARK_KEYS.BARN)).toMatchObject({ x: 960, baseY: 320 });
    expect(byKey.get(AP_LANDMARK_KEYS.SILO)).toMatchObject({ x: 264, baseY: 1152 });
    expect(byKey.get(AP_LANDMARK_KEYS.FARMHOUSE)).toMatchObject({ x: 1000, baseY: 1152 });
  });
});

describe('AP_FENCE_RUNS', () => {
  it('keeps every fence cell in bounds and off water/soil/wheat', () => {
    for (const run of AP_FENCE_RUNS) {
      for (const cell of fenceRunCells(run)) {
        expect(cell.tx).toBeGreaterThanOrEqual(0);
        expect(cell.tx).toBeLessThan(AP_TILE_COLS);
        expect(cell.ty).toBeGreaterThanOrEqual(0);
        expect(cell.ty).toBeLessThan(AP_TILE_ROWS);
        const material = grid[cell.ty][cell.tx];
        expect(
          ['grass', 'path'],
          `fence @${cell.tx},${cell.ty} on ${material}`
        ).toContain(material);
      }
    }
  });

  it('appends exactly one end-cap per run', () => {
    for (const run of AP_FENCE_RUNS) {
      expect(fenceRunCells(run)).toHaveLength(run.length + 1);
    }
  });
});
