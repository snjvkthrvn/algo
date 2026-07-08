import { describe, expect, it } from 'vitest';
import {
  TWIN_RIVERS_ROUTE_RECTS,
  TWIN_RIVERS_STONES_RECT,
} from './twinRivers';
import {
  TR_DIRT_ROUTE_IDS,
  TR_DOCK_RECTS,
  TR_FEATURE_MASK_ROWS,
  TR_STONE_PADS,
  TR_TILE,
  TR_TILE_COLS,
  TR_TILE_ROWS,
  TR_TILE_SIZE,
  buildTwinRiversMaterialGrid,
  buildTwinRiversTileGrid,
  type TrMaterial,
} from './twinRiversTilemap';

const grid = buildTwinRiversMaterialGrid();
const frames = buildTwinRiversTileGrid();

const cellAt = (x: number, y: number): TrMaterial =>
  grid[Math.floor(y / TR_TILE_SIZE)][Math.floor(x / TR_TILE_SIZE)];

const materialOf = (frame: number): TrMaterial => {
  if (frame <= TR_TILE.GRASS_FLOWERS) return 'grass';
  if (frame <= TR_TILE.PATH_B) return 'path';
  if (frame <= TR_TILE.STONE_B) return 'stone';
  if (frame <= TR_TILE.PATH_INNER_SW) return 'path';
  if (frame <= TR_TILE.STONE_INNER_SW) return 'stone';
  if (frame <= TR_TILE.WATER_INNER_SW) return 'water';
  if (frame <= TR_TILE.REED_INNER_SW) return 'reed';
  if (frame <= TR_TILE.WATER_STONEPAD) return 'water';
  if (frame <= TR_TILE.DECK_STEPS) return 'deck';
  return 'dock';
};

describe('TR_FEATURE_MASK_ROWS', () => {
  it('is a 60x45 grid of known material chars', () => {
    expect(TR_FEATURE_MASK_ROWS).toHaveLength(TR_TILE_ROWS);
    for (const row of TR_FEATURE_MASK_ROWS) {
      expect(row).toHaveLength(TR_TILE_COLS);
      expect(row).toMatch(/^[GARS]+$/);
    }
  });
});

describe('buildTwinRiversMaterialGrid', () => {
  it('is deterministic and 60x45', () => {
    expect(buildTwinRiversMaterialGrid()).toEqual(grid);
    expect(grid).toHaveLength(TR_TILE_ROWS);
    for (const row of grid) expect(row).toHaveLength(TR_TILE_COLS);
  });

  it('stamps dirt lanes without ever paving over water', () => {
    for (const rect of TWIN_RIVERS_ROUTE_RECTS) {
      if (!TR_DIRT_ROUTE_IDS.has(rect.id)) continue;
      const center = cellAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
      // Lane centers are dirt unless the painting put water/deck/dock there
      // (rapids walk, boss approach, the dock village harbor).
      expect(
        ['path', 'water', 'deck', 'dock'],
        rect.id
      ).toContain(center);
    }
    // No water cell may have become path anywhere.
    const rebuilt = buildTwinRiversMaterialGrid();
    for (let ty = 0; ty < TR_TILE_ROWS; ty += 1) {
      for (let tx = 0; tx < TR_TILE_COLS; tx += 1) {
        if (TR_FEATURE_MASK_ROWS[ty][tx] === 'A') {
          expect(['water', 'deck', 'dock']).toContain(rebuilt[ty][tx]);
        }
      }
    }
  });

  it('runs the Pointer Bridge deck from the north bank to the docks', () => {
    const bridge = TWIN_RIVERS_ROUTE_RECTS.find((r) => r.id === 'bridge_walk')!;
    const cx = bridge.x + bridge.width / 2;
    for (const y of [bridge.y + 16, 640, bridge.y + bridge.height - 16]) {
      expect(cellAt(cx, y), `deck @y=${y}`).toBe('deck');
    }
  });

  it('keeps the plazas, rivers, reeds, and dock piers', () => {
    expect(cellAt(452, 248)).toBe('stone'); // mirror court plaza
    expect(cellAt(1288, 250)).toBe('stone'); // island circle pad
    expect(cellAt(700, 400)).toBe('water'); // upper river
    expect(cellAt(400, 900)).toBe('water'); // south lake
    expect(cellAt(1420, 590)).toBe('water'); // rapids basin
    expect(cellAt(1330, 1100)).toBe('reed'); // reed marsh
    for (const rect of TR_DOCK_RECTS) {
      expect(cellAt(rect.x + rect.width / 2, rect.y + rect.height / 2)).toBe('dock');
    }
  });

  it('keeps the stepping-stone pads on open water', () => {
    for (const pad of TR_STONE_PADS) {
      expect(grid[pad.ty][pad.tx], `pad @${pad.tx},${pad.ty}`).toBe('water');
      const px = pad.tx * TR_TILE_SIZE + 16;
      const py = pad.ty * TR_TILE_SIZE + 16;
      expect(
        px >= TWIN_RIVERS_STONES_RECT.x - TR_TILE_SIZE &&
          px <= TWIN_RIVERS_STONES_RECT.x + TWIN_RIVERS_STONES_RECT.width + TR_TILE_SIZE &&
          py >= TWIN_RIVERS_STONES_RECT.y - TR_TILE_SIZE &&
          py <= TWIN_RIVERS_STONES_RECT.y + TWIN_RIVERS_STONES_RECT.height + TR_TILE_SIZE,
        'pad inside the stones gate rect'
      ).toBe(true);
    }
  });

  it('keeps the west spawn approach walk-friendly', () => {
    // AP -> TR portal drops the player at (160, 624).
    expect(['path', 'grass']).toContain(cellAt(160, 624));
  });
});

describe('pickTwinRiversTile / buildTwinRiversTileGrid', () => {
  it('is deterministic and material-consistent for every cell', () => {
    expect(buildTwinRiversTileGrid()).toEqual(frames);
    for (let ty = 0; ty < TR_TILE_ROWS; ty += 1) {
      for (let tx = 0; tx < TR_TILE_COLS; tx += 1) {
        const frame = frames[ty][tx];
        expect(frame).toBeGreaterThanOrEqual(0);
        expect(frame).toBeLessThanOrEqual(TR_TILE.DOCK_POST);
        expect(materialOf(frame), `frame family @${tx},${ty}`).toBe(grid[ty][tx]);
      }
    }
  });

  it('gives every water cell adjacent to a single land side the right bank', () => {
    let checked = 0;
    const land = (m: TrMaterial): boolean => m === 'grass' || m === 'path' || m === 'stone';
    for (let ty = 1; ty < TR_TILE_ROWS - 1; ty += 1) {
      for (let tx = 1; tx < TR_TILE_COLS - 1; tx += 1) {
        if (grid[ty][tx] !== 'water') continue;
        if (TR_STONE_PADS.some((p) => p.tx === tx && p.ty === ty)) continue;
        const pattern = [
          land(grid[ty - 1][tx]),
          land(grid[ty][tx + 1]),
          land(grid[ty + 1][tx]),
          land(grid[ty][tx - 1]),
        ];
        if (pattern.filter(Boolean).length !== 1) continue;
        expect(frames[ty][tx], `water bank @${tx},${ty}`).toBe(
          TR_TILE.WATER_EDGE_N + pattern.indexOf(true)
        );
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(80);
  });

  it('rails the bridge deck on both sides and marks arrows down the middle', () => {
    const used = new Set<number>();
    for (let ty = 0; ty < TR_TILE_ROWS; ty += 1) {
      for (let tx = 0; tx < TR_TILE_COLS; tx += 1) {
        if (grid[ty][tx] === 'deck') used.add(frames[ty][tx]);
      }
    }
    expect(used.has(TR_TILE.DECK_RAIL_W)).toBe(true);
    expect(used.has(TR_TILE.DECK_RAIL_E)).toBe(true);
    expect(used.has(TR_TILE.DECK_ARROW)).toBe(true);
  });

  it('renders stepping pads, rapids, and dock edges', () => {
    const used = new Set(frames.flat());
    const required: Array<[string, number]> = [
      ['WATER_STONEPAD', TR_TILE.WATER_STONEPAD],
      ['WATER_RAPIDS_A', TR_TILE.WATER_RAPIDS_A],
      ['WATER_RAPIDS_B', TR_TILE.WATER_RAPIDS_B],
      ['DOCK_EDGE_S', TR_TILE.DOCK_EDGE_S],
      ['STONE_EDGE_N', TR_TILE.STONE_EDGE_N],
    ];
    const missing = required.filter(([, frame]) => !used.has(frame)).map(([name]) => name);
    expect(missing).toEqual([]);
    // The reed marsh must render SOME boundary art; which sides appear is
    // shape-dependent (the field's crown may be all corners).
    const reedTransitions = [];
    for (let f = TR_TILE.REED_EDGE_N; f <= TR_TILE.REED_INNER_SW; f += 1) {
      if (used.has(f)) reedTransitions.push(f);
    }
    expect(reedTransitions.length).toBeGreaterThan(2);
  });

  it('contains no cell its 12-tile transition set cannot render', () => {
    const boundaryFor: Partial<Record<TrMaterial, (m: TrMaterial) => boolean>> = {
      path: (m) => m === 'grass',
      stone: (m) => m === 'grass',
      water: (m) => m === 'grass' || m === 'path' || m === 'stone',
      reed: (m) => m === 'grass' || m === 'path' || m === 'stone',
    };
    for (let ty = 0; ty < TR_TILE_ROWS; ty += 1) {
      for (let tx = 0; tx < TR_TILE_COLS; tx += 1) {
        const m = grid[ty][tx];
        const test = boundaryFor[m];
        if (!test) continue;
        const b = (dx: number, dy: number): boolean => {
          const nx = tx + dx;
          const ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= TR_TILE_COLS || ny >= TR_TILE_ROWS) return false;
          return test(grid[ny][nx]);
        };
        const gN = b(0, -1);
        const gE = b(1, 0);
        const gS = b(0, 1);
        const gW = b(-1, 0);
        const count = Number(gN) + Number(gE) + Number(gS) + Number(gW);
        expect(count, `${m}@${tx},${ty}`).toBeLessThanOrEqual(2);
        expect(gN && gS, `${m}@${tx},${ty} 1-wide column`).toBe(false);
        expect(gE && gW, `${m}@${tx},${ty} 1-wide row`).toBe(false);
      }
    }
  });
});
