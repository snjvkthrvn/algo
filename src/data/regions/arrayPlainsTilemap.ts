import {
  ARRAY_PLAINS_ROUTE_RECTS,
  ARRAY_PLAINS_WORLD_HEIGHT,
  ARRAY_PLAINS_WORLD_WIDTH,
} from './arrayPlains';
import {
  cellCoveredByRect,
  tileHash,
  transitionOrdinal12,
} from './tilePlan';

/**
 * arrayPlainsTilemap — pure 32px tile plan for the Array Plains overworld
 * (the gym pattern: deterministic frame picking, no RNG, unit-testable
 * without Phaser).
 *
 * The sheet (assets/visual_revamp/regions/ap_terrain_v1.png, 8x7 grid of
 * 32px tiles) is imagegen pixel art harvested from two 4x registration
 * sheets (art_sources/visual_revamp/replacements/ap_ground_* and
 * ap_features_*). Index = row * 8 + col; the slot layout below is the
 * binding contract for any regen.
 *
 * Layer model (docs/VISION.md §2 — the overworld is a real tiled place):
 *   1. AP_FEATURE_MASK_ROWS — authored terrain features (wheat masses,
 *      pond + stream, garden beds) traced from the retired living-map
 *      painting, which is now a composition reference in art_sources.
 *   2. Dirt lanes are stamped from ARRAY_PLAINS_ROUTE_RECTS at build time,
 *      so walkable geography stays the single source of truth.
 *   3. Wheat and water keep a one-cell grass fringe everywhere (grass is
 *      the universal connector), which is what lets a single 12-tile
 *      marching-squares set per material cover every boundary. Soil is
 *      exempt: garden beds may sit flush against dirt — both are earth.
 */

export const AP_TILE_SIZE = 32;
export const AP_TILE_COLS = ARRAY_PLAINS_WORLD_WIDTH / AP_TILE_SIZE; // 60
export const AP_TILE_ROWS = ARRAY_PLAINS_WORLD_HEIGHT / AP_TILE_SIZE; // 45

export const AP_TILE = {
  GRASS_A: 0,
  GRASS_B: 1,
  GRASS_DARK: 2,
  GRASS_FLOWERS: 3,
  GRASS_PEBBLES: 4,
  GRASS_TUFT: 5,
  PATH_A: 6,
  PATH_B: 7,
  PATH_EDGE_N: 8,
  PATH_EDGE_E: 9,
  PATH_EDGE_S: 10,
  PATH_EDGE_W: 11,
  PATH_CORNER_NW: 12,
  PATH_CORNER_NE: 13,
  PATH_CORNER_SE: 14,
  PATH_CORNER_SW: 15,
  PATH_INNER_NW: 16,
  PATH_INNER_NE: 17,
  PATH_INNER_SE: 18,
  PATH_INNER_SW: 19,
  PATH_WORN: 20,
  SOIL_TILLED: 21,
  SOIL_SPROUTS: 22,
  SOIL_RIDGE: 23,
  WHEAT_A: 24,
  WHEAT_B: 25,
  WHEAT_EDGE_N: 26,
  WHEAT_EDGE_E: 27,
  WHEAT_EDGE_S: 28,
  WHEAT_EDGE_W: 29,
  WHEAT_CORNER_NW: 30,
  WHEAT_CORNER_NE: 31,
  WHEAT_CORNER_SE: 32,
  WHEAT_CORNER_SW: 33,
  WHEAT_INNER_NW: 34,
  WHEAT_INNER_NE: 35,
  WHEAT_INNER_SE: 36,
  WHEAT_INNER_SW: 37,
  /** Reserved spare — drawn in the sheet, not yet picked (walked-through wheat). */
  WHEAT_TRAMPLED: 38,
  WHEAT_POPPY: 39,
  WATER_A: 40,
  WATER_GLINT: 41,
  WATER_EDGE_N: 42,
  WATER_EDGE_E: 43,
  WATER_EDGE_S: 44,
  WATER_EDGE_W: 45,
  WATER_CORNER_NW: 46,
  WATER_CORNER_NE: 47,
  WATER_CORNER_SE: 48,
  WATER_CORNER_SW: 49,
  WATER_INNER_NW: 50,
  WATER_INNER_NE: 51,
  WATER_INNER_SE: 52,
  WATER_INNER_SW: 53,
  WATER_LILY: 54,
  WATER_REEDS: 55,
} as const;

export type ApMaterial = 'grass' | 'path' | 'wheat' | 'water' | 'soil';

const MASK_CHAR_TO_MATERIAL: Record<string, ApMaterial> = {
  G: 'grass',
  W: 'wheat',
  A: 'water',
  S: 'soil',
};

/**
 * Authored feature mask, 45 rows x 60 cols. G grass, W wheat, A water,
 * S tilled soil. Dirt lanes are NOT in the mask — they come from the
 * route rects. Traced from array_plains_living_v1.png cell by cell.
 */
export const AP_FEATURE_MASK_ROWS: readonly string[] = [
  'WWWWWWWWWWWGGWWGGGGGGGGGGGGGGGGGGGGGGWWWWWWWWWWWWWGGGGGWWWWW',
  'WWWWWWWWWWWGGWWGGGGGGGGGGGGGGGGGGGGGGWWWWWWWWWWWWWGGGGGWWWWW',
  'WWWWWWWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWWWWGGGGGGGGGGGGWWWWW',
  'WWWWWWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWWWGGGGGGGGGGGGGWWWWW',
  'WWWWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWGGGGGGGGGGGGGGGWWW',
  'WWWWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWGGGGGGGGGGGWWGGWWW',
  'WWWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWGGGGGGGGGGGWWGGWWW',
  'WWWGGGSSSSSSSGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWGGWWW',
  'WWWGGGSSSSSSSGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWW',
  'WWGGGGSSSSSSSGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWW',
  'WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW',
  'WWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWWGGGWWGGGGGGGGGWW',
  'GGGGGGSSSSGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWWGGGWWGGGGGGGGGWW',
  'GGGGGGSSSSGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
  'GGGGGGSSSSGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
  'GGGGGGSSSSGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWW',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWW',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGAAGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGAAAGGGGGGGGAAAAAAAGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGAAAGGGGGGGAAAAAAAAAAAGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGAAAGGGGGGGAAAAAAAAAAAAAGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGAAAGGGGGGGAAAAAAAAAAAAAGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGAAAGGGGGGAAAAAAAAAAAAAGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGAAAGGGGGGGAAAAAAAAAAAAGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGAAAGGGGGGAAAAAAAAAAAGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGAAAGGGGGGGGAAAAAAAAGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGAAGGGGGGGGGGAAAAGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGAAGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
  'GGGGGGGGGGGGGGGGAAGGGGGGGGGGGGGGGSSSSGGGGGGGGGGGGGGGGGGGGGGW',
  'WWGGGGGGGGGGGGGGAAGGGGGGGGGGGGGGGSSSSGGGGGGGGGGGGGGGGGGGGGGW',
  'WWGGGGGGGGGGGGGGAAGGGGGGGGGGGGGGGSSSSGGGGGGGGGGGGGGGGGGGGGGW',
  'WGGGGGGGGGGGGGGGAAGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWW',
  'WWGGGGGGGGGGGGGGAAGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWW',
  'WWWWWWGGGGGGGGGAAGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWWWWWWW',
  'WWWWWWWGGGGGGGGAAGGGGGGGGGGGGGGGGGGGGGGGGGGGWWGGGGGWWWWWWWWW',
  'WWWWWWWWWWGGWWGAAGGGGGGGGGGGGGGGGGGGGGGGGGGGWWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWAAWWWGGGGGGGGGGGGGGGGWWGWWWWWWWWWWWWWWWWWWWWW',
  'GWWWWWWWWWWWWWWAAWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWG',
];

/**
 * Route rects that read as packed dirt in the art. The remaining rects
 * (shed_yard, grove_clearing, pairing_field) are walkable grass yards —
 * collision truth and ground material are independent layers.
 */
export const AP_DIRT_ROUTE_IDS: ReadonlySet<string> = new Set([
  'main_road',
  'north_road',
  'barn_yard',
  'shed_branch',
  'grove_trail',
  'south_west_road',
  'south_road',
  'south_east_road',
  'farm_yard',
  'hopper_road',
  'hopper_yard',
  'pairing_road',
]);

type Grid = ApMaterial[][];

const materialAt = (grid: Grid, tx: number, ty: number, fallback: ApMaterial): ApMaterial => {
  if (tx < 0 || ty < 0 || tx >= AP_TILE_COLS || ty >= AP_TILE_ROWS) return fallback;
  return grid[ty][tx];
};

const NEIGHBORS_8: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

const anyNeighbor8 = (
  grid: Grid,
  tx: number,
  ty: number,
  match: (m: ApMaterial) => boolean
): boolean =>
  NEIGHBORS_8.some(([dx, dy]) => {
    const nx = tx + dx;
    const ny = ty + dy;
    if (nx < 0 || ny < 0 || nx >= AP_TILE_COLS || ny >= AP_TILE_ROWS) return false;
    return match(grid[ny][nx]);
  });

/**
 * Build the 60x45 material grid: parse the mask, stamp dirt lanes from the
 * route rects, enforce the grass fringe around wheat/water, then erode any
 * cell a 12-tile transition set cannot render (1-wide strips, 3-sided nubs).
 * Deterministic: same output every call.
 */
export const buildArrayPlainsMaterialGrid = (): Grid => {
  const grid: Grid = AP_FEATURE_MASK_ROWS.map((row) =>
    row.split('').map((ch) => MASK_CHAR_TO_MATERIAL[ch] ?? 'grass')
  );

  // 1. Dirt lanes from frozen geography. Soil beds win over the yard
  //    aprons that surround them; everything else yields to the lane.
  for (const rect of ARRAY_PLAINS_ROUTE_RECTS) {
    if (!AP_DIRT_ROUTE_IDS.has(rect.id)) continue;
    for (let ty = 0; ty < AP_TILE_ROWS; ty += 1) {
      for (let tx = 0; tx < AP_TILE_COLS; tx += 1) {
        if (grid[ty][tx] === 'soil') continue;
        if (cellCoveredByRect(tx, ty, AP_TILE_SIZE, rect)) grid[ty][tx] = 'path';
      }
    }
  }

  // 2. Grass fringe: water yields beside dirt, wheat yields beside
  //    dirt/water/soil. Computed from snapshots so order cannot matter.
  const afterStamp = grid.map((row) => row.slice());
  for (let ty = 0; ty < AP_TILE_ROWS; ty += 1) {
    for (let tx = 0; tx < AP_TILE_COLS; tx += 1) {
      if (afterStamp[ty][tx] === 'water' && anyNeighbor8(afterStamp, tx, ty, (m) => m === 'path')) {
        grid[ty][tx] = 'grass';
      }
    }
  }
  const afterWater = grid.map((row) => row.slice());
  for (let ty = 0; ty < AP_TILE_ROWS; ty += 1) {
    for (let tx = 0; tx < AP_TILE_COLS; tx += 1) {
      if (
        afterWater[ty][tx] === 'wheat' &&
        anyNeighbor8(afterWater, tx, ty, (m) => m === 'path' || m === 'water' || m === 'soil')
      ) {
        grid[ty][tx] = 'grass';
      }
    }
  }

  // 3. Erode autotile-illegal wheat/water cells to a fixpoint. Off-map
  //    neighbors count as same-material so border masses run off-screen.
  let changed = true;
  while (changed) {
    changed = false;
    for (let ty = 0; ty < AP_TILE_ROWS; ty += 1) {
      for (let tx = 0; tx < AP_TILE_COLS; tx += 1) {
        const m = grid[ty][tx];
        if (m !== 'wheat' && m !== 'water') continue;
        const gN = materialAt(grid, tx, ty - 1, m) === 'grass';
        const gE = materialAt(grid, tx + 1, ty, m) === 'grass';
        const gS = materialAt(grid, tx, ty + 1, m) === 'grass';
        const gW = materialAt(grid, tx - 1, ty, m) === 'grass';
        const count = Number(gN) + Number(gE) + Number(gS) + Number(gW);
        if (count >= 3 || (gN && gS) || (gE && gW)) {
          grid[ty][tx] = 'grass';
          changed = true;
        }
      }
    }
  }

  return grid;
};

const TRANSITION_BASE: Record<'path' | 'wheat' | 'water', number> = {
  path: AP_TILE.PATH_EDGE_N,
  wheat: AP_TILE.WHEAT_EDGE_N,
  water: AP_TILE.WATER_EDGE_N,
};

/**
 * Transition ordinal for a path/wheat/water cell, or -1 for interior.
 * Boundary means a grass neighbor: soil beside dirt stays interior (earth
 * against earth), and the fringe rule keeps every other pairing apart.
 * Opposite pairs / 3+ cannot occur in a built grid (erosion removes them).
 */
const transitionOrdinal = (grid: Grid, tx: number, ty: number, m: ApMaterial): number =>
  transitionOrdinal12(
    (dx, dy) => materialAt(grid, tx + dx, ty + dy, m) === 'grass'
  );

/** Frame index for the STATIC ground layer at (tx, ty). */
export const pickArrayPlainsTile = (tx: number, ty: number, grid: Grid): number => {
  const m = grid[ty][tx];
  const h = tileHash(tx, ty);

  if (m === 'grass') {
    if (h < 3) return AP_TILE.GRASS_FLOWERS;
    if (h < 6) return AP_TILE.GRASS_PEBBLES;
    if (h < 9) return AP_TILE.GRASS_TUFT;
    if (h < 14 && !anyNeighbor8(grid, tx, ty, (n) => n !== 'grass')) {
      return AP_TILE.GRASS_DARK;
    }
    return (tx + ty) % 2 === 0 ? AP_TILE.GRASS_A : AP_TILE.GRASS_B;
  }

  if (m === 'soil') {
    if (materialAt(grid, tx, ty - 1, 'soil') !== 'soil') return AP_TILE.SOIL_RIDGE;
    return ty % 2 === 0 ? AP_TILE.SOIL_SPROUTS : AP_TILE.SOIL_TILLED;
  }

  const ordinal = transitionOrdinal(grid, tx, ty, m);
  if (ordinal >= 0) return TRANSITION_BASE[m as 'path' | 'wheat' | 'water'] + ordinal;

  if (m === 'path') {
    if (h < 6) return AP_TILE.PATH_WORN;
    return (tx + ty) % 2 === 0 ? AP_TILE.PATH_A : AP_TILE.PATH_B;
  }
  if (m === 'wheat') {
    if (h < 3) return AP_TILE.WHEAT_POPPY;
    return (tx + ty) % 2 === 0 ? AP_TILE.WHEAT_A : AP_TILE.WHEAT_B;
  }
  // water
  if (h < 5) return AP_TILE.WATER_LILY;
  if (h < 18) return AP_TILE.WATER_GLINT;
  if (h < 23) return AP_TILE.WATER_REEDS;
  return AP_TILE.WATER_A;
};

/** Full 60x45 frame grid for the RenderTexture bake. */
export const buildArrayPlainsTileGrid = (): number[][] => {
  const materials = buildArrayPlainsMaterialGrid();
  return materials.map((row, ty) => row.map((_, tx) => pickArrayPlainsTile(tx, ty, materials)));
};
