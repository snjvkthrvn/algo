import { describe, expect, it } from 'vitest';
import {
  ARRAY_PLAINS_CONFIG,
  ARRAY_PLAINS_ROUTE_RECTS,
  ARRAY_PLAINS_BRIDGE_RECT,
} from './arrayPlains';
import {
  AP_DIRT_ROUTE_IDS,
  AP_FEATURE_MASK_ROWS,
  AP_TILE,
  AP_TILE_COLS,
  AP_TILE_ROWS,
  AP_TILE_SIZE,
  buildArrayPlainsMaterialGrid,
  buildArrayPlainsTileGrid,
  pickArrayPlainsTile,
  type ApMaterial,
} from './arrayPlainsTilemap';

const grid = buildArrayPlainsMaterialGrid();
const frames = buildArrayPlainsTileGrid();

const cellAt = (x: number, y: number): ApMaterial =>
  grid[Math.floor(y / AP_TILE_SIZE)][Math.floor(x / AP_TILE_SIZE)];

const materialOf = (frame: number): ApMaterial => {
  if (frame <= AP_TILE.GRASS_TUFT) return 'grass';
  if (frame <= AP_TILE.PATH_WORN) return 'path';
  if (frame <= AP_TILE.SOIL_RIDGE) return 'soil';
  if (frame <= AP_TILE.WHEAT_POPPY) return 'wheat';
  return 'water';
};

describe('AP_FEATURE_MASK_ROWS', () => {
  it('is a 60x45 grid of known material chars', () => {
    expect(AP_FEATURE_MASK_ROWS).toHaveLength(AP_TILE_ROWS);
    for (const row of AP_FEATURE_MASK_ROWS) {
      expect(row).toHaveLength(AP_TILE_COLS);
      expect(row).toMatch(/^[GWAS]+$/);
    }
  });
});

describe('buildArrayPlainsMaterialGrid', () => {
  it('is deterministic', () => {
    expect(buildArrayPlainsMaterialGrid()).toEqual(grid);
  });

  it('covers the world at 60x45', () => {
    expect(grid).toHaveLength(AP_TILE_ROWS);
    for (const row of grid) expect(row).toHaveLength(AP_TILE_COLS);
  });

  it('stamps every dirt route rect as path at its center', () => {
    for (const rect of ARRAY_PLAINS_ROUTE_RECTS) {
      if (!AP_DIRT_ROUTE_IDS.has(rect.id)) continue;
      const center = cellAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
      expect(center, rect.id).toBe('path');
    }
  });

  it('keeps the walkable grass yards as grass (collision, not dirt)', () => {
    // Probe points sit inside their yard but outside every overlapping
    // dirt lane (shed_yard's center is crossed by the shed_branch lane).
    expect(cellAt(360, 320)).toBe('grass'); // shed_yard
    expect(cellAt(1492, 180)).toBe('grass'); // grove_clearing
    expect(cellAt(1550, 1100)).toBe('grass'); // pairing_field
  });

  it('keeps geography anchors on sensible ground', () => {
    const { spawnPoint, exitPoints, puzzles, npcs } = ARRAY_PLAINS_CONFIG;
    expect(cellAt(spawnPoint.x, spawnPoint.y)).toBe('path');
    for (const exit of exitPoints) {
      expect(cellAt(exit.position.x, exit.position.y)).toBe('path');
    }
    for (const puzzle of puzzles) {
      expect(['path', 'grass']).toContain(cellAt(puzzle.position.x, puzzle.position.y));
    }
    for (const npc of npcs) {
      expect(cellAt(npc.position.x, npc.position.y)).toBe('path');
    }
    // The hidden grove shrine sits in the wheat-ringed grass clearing.
    expect(cellAt(1492, 220)).toBe('grass');
  });

  it('runs water under the broken-bridge crossing', () => {
    const rect = ARRAY_PLAINS_BRIDGE_RECT;
    const rowsCovered = [rect.y + 8, rect.y + rect.height / 2, rect.y + rect.height - 8];
    for (const y of rowsCovered) {
      const ty = Math.floor(y / AP_TILE_SIZE);
      const waterInRow = grid[ty].some(
        (m, tx) =>
          m === 'water' &&
          tx * AP_TILE_SIZE >= rect.x &&
          (tx + 1) * AP_TILE_SIZE <= rect.x + rect.width
      );
      expect(waterInRow, `stream row ${ty}`).toBe(true);
    }
  });

  it('keeps the pond, wheat borders, and garden beds', () => {
    expect(cellAt(940, 928)).toBe('water'); // pond heart
    expect(cellAt(16, 144)).toBe('wheat'); // north-west border
    expect(cellAt(1848, 1424)).toBe('wheat'); // south-east border
    expect(cellAt(240, 272)).toBe('soil'); // shed upper bed
  });

  it('gives wheat and water a full grass fringe (8-neighborhood)', () => {
    for (let ty = 0; ty < AP_TILE_ROWS; ty += 1) {
      for (let tx = 0; tx < AP_TILE_COLS; tx += 1) {
        const m = grid[ty][tx];
        if (m !== 'wheat' && m !== 'water') continue;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const n = grid[ty + dy]?.[tx + dx];
            if (n === undefined) continue;
            const legal: ApMaterial[] = [m, 'grass'];
            expect(legal, `${m}@${tx},${ty} beside ${n}`).toContain(n);
          }
        }
      }
    }
  });

  it('contains no cell a 12-tile transition set cannot render', () => {
    for (let ty = 0; ty < AP_TILE_ROWS; ty += 1) {
      for (let tx = 0; tx < AP_TILE_COLS; tx += 1) {
        const m = grid[ty][tx];
        if (m !== 'wheat' && m !== 'water') continue;
        const grass = (dx: number, dy: number): boolean => {
          const n = grid[ty + dy]?.[tx + dx];
          return n !== undefined && n === 'grass';
        };
        const gN = grass(0, -1);
        const gE = grass(1, 0);
        const gS = grass(0, 1);
        const gW = grass(-1, 0);
        const count = Number(gN) + Number(gE) + Number(gS) + Number(gW);
        expect(count, `${m}@${tx},${ty}`).toBeLessThanOrEqual(2);
        expect(gN && gS, `${m}@${tx},${ty} 1-wide column`).toBe(false);
        expect(gE && gW, `${m}@${tx},${ty} 1-wide row`).toBe(false);
      }
    }
  });
});

describe('pickArrayPlainsTile / buildArrayPlainsTileGrid', () => {
  it('is deterministic and material-consistent for every cell', () => {
    expect(buildArrayPlainsTileGrid()).toEqual(frames);
    for (let ty = 0; ty < AP_TILE_ROWS; ty += 1) {
      for (let tx = 0; tx < AP_TILE_COLS; tx += 1) {
        const frame = frames[ty][tx];
        expect(frame).toBeGreaterThanOrEqual(0);
        expect(frame).toBeLessThanOrEqual(AP_TILE.WATER_REEDS);
        expect(materialOf(frame), `frame family @${tx},${ty}`).toBe(grid[ty][tx]);
      }
    }
  });

  it('autotiles boundaries: single-grass-side cells become the matching edge', () => {
    let checked = 0;
    for (let ty = 1; ty < AP_TILE_ROWS - 1; ty += 1) {
      for (let tx = 1; tx < AP_TILE_COLS - 1; tx += 1) {
        const m = grid[ty][tx];
        if (m !== 'water' && m !== 'wheat' && m !== 'path') continue;
        const g = (dx: number, dy: number): boolean => grid[ty + dy][tx + dx] === 'grass';
        const pattern = [g(0, -1), g(1, 0), g(0, 1), g(-1, 0)];
        if (pattern.filter(Boolean).length !== 1) continue;
        const side = pattern.indexOf(true); // N,E,S,W
        const base =
          m === 'path'
            ? AP_TILE.PATH_EDGE_N
            : m === 'wheat'
              ? AP_TILE.WHEAT_EDGE_N
              : AP_TILE.WATER_EDGE_N;
        expect(frames[ty][tx], `${m}@${tx},${ty}`).toBe(base + side);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(100); // the map genuinely exercises edges
  });

  it('uses the transition art broadly (edges, corners, inner corners all appear)', () => {
    const used = new Set(frames.flat());
    const expected = [
      AP_TILE.PATH_EDGE_N, AP_TILE.PATH_EDGE_E, AP_TILE.PATH_EDGE_S, AP_TILE.PATH_EDGE_W,
      AP_TILE.PATH_CORNER_NW, AP_TILE.PATH_CORNER_NE, AP_TILE.PATH_CORNER_SE, AP_TILE.PATH_CORNER_SW,
      AP_TILE.WHEAT_EDGE_N, AP_TILE.WHEAT_EDGE_S, AP_TILE.WHEAT_EDGE_E, AP_TILE.WHEAT_EDGE_W,
      AP_TILE.WATER_EDGE_N, AP_TILE.WATER_EDGE_E, AP_TILE.WATER_EDGE_S, AP_TILE.WATER_EDGE_W,
      AP_TILE.WATER_CORNER_NW, AP_TILE.WATER_CORNER_NE,
      AP_TILE.SOIL_RIDGE, AP_TILE.SOIL_TILLED, AP_TILE.SOIL_SPROUTS,
      AP_TILE.GRASS_FLOWERS, AP_TILE.PATH_WORN, AP_TILE.WATER_GLINT,
    ];
    for (const frame of expected) {
      expect(used.has(frame), `frame ${frame} unused`).toBe(true);
    }
  });

  it('caps soil beds with a ridge row and alternates furrows below', () => {
    const bedTop = { tx: 7, ty: 7 }; // shed upper bed, top row
    expect(grid[bedTop.ty][bedTop.tx]).toBe('soil');
    expect(frames[bedTop.ty][bedTop.tx]).toBe(AP_TILE.SOIL_RIDGE);
    expect(grid[bedTop.ty + 1][bedTop.tx]).toBe('soil');
    expect([AP_TILE.SOIL_TILLED, AP_TILE.SOIL_SPROUTS]).toContain(
      frames[bedTop.ty + 1][bedTop.tx]
    );
  });

  it('keeps pickArrayPlainsTile pure', () => {
    expect(pickArrayPlainsTile(30, 28, grid)).toBe(pickArrayPlainsTile(30, 28, grid));
  });
});
