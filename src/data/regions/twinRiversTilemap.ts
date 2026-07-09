import {
  TWIN_RIVERS_ROUTE_RECTS,
  TWIN_RIVERS_WORLD_HEIGHT,
  TWIN_RIVERS_WORLD_WIDTH,
} from './twinRivers';
import {
  cellCoveredByRect,
  tileHash,
  transitionOrdinal12,
} from './tilePlan';

/**
 * twinRiversTilemap — pure 32px tile plan for the Twin Rivers overworld
 * (the gym pattern: deterministic frame picking, no RNG, unit-testable
 * without Phaser).
 *
 * The sheet (assets/visual_revamp/regions/tr_terrain_v1.png, 8x10 grid of
 * 32px tiles) is imagegen pixel art harvested from three 4x registration
 * sheets (art_sources/visual_revamp/replacements/tr_ground_*, tr_water_*,
 * tr_structures_*). Index = row * 8 + col; the slot layout below is the
 * binding contract for any regen.
 *
 * Layer model (docs/VISION.md §2):
 *   1. TR_FEATURE_MASK_ROWS — rivers/rapids (classifier-traced from the
 *      retired painting + authored basins), authored plaza ovals and the
 *      reed marsh.
 *   2. Dirt lanes stamp from TWIN_RIVERS_ROUTE_RECTS (skipping water — in
 *      Twin Rivers the water is load-bearing geography). The Pointer
 *      Bridge deck and the dock piers stamp as their own materials.
 *   3. Water/reed banks trigger against ANY land material (the stone-post
 *      bank is baked into the water edge art), so rivers keep their exact
 *      course with no grass-buffer demotion.
 */

export const TR_TILE_SIZE = 32;
export const TR_TILE_COLS = TWIN_RIVERS_WORLD_WIDTH / TR_TILE_SIZE; // 60
export const TR_TILE_ROWS = TWIN_RIVERS_WORLD_HEIGHT / TR_TILE_SIZE; // 45

export const TR_TILE = {
  GRASS_A: 0,
  GRASS_B: 1,
  GRASS_DARK: 2,
  GRASS_FLOWERS: 3,
  PATH_A: 4,
  PATH_B: 5,
  STONE_A: 6,
  STONE_B: 7,
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
  STONE_EDGE_N: 20,
  STONE_EDGE_E: 21,
  STONE_EDGE_S: 22,
  STONE_EDGE_W: 23,
  STONE_CORNER_NW: 24,
  STONE_CORNER_NE: 25,
  STONE_CORNER_SE: 26,
  STONE_CORNER_SW: 27,
  STONE_INNER_NW: 28,
  STONE_INNER_NE: 29,
  STONE_INNER_SE: 30,
  STONE_INNER_SW: 31,
  WATER_A: 32,
  WATER_GLINT: 33,
  WATER_RAPIDS_A: 34,
  WATER_RAPIDS_B: 35,
  WATER_EDGE_N: 36,
  WATER_EDGE_E: 37,
  WATER_EDGE_S: 38,
  WATER_EDGE_W: 39,
  WATER_CORNER_NW: 40,
  WATER_CORNER_NE: 41,
  WATER_CORNER_SE: 42,
  WATER_CORNER_SW: 43,
  WATER_INNER_NW: 44,
  WATER_INNER_NE: 45,
  WATER_INNER_SE: 46,
  WATER_INNER_SW: 47,
  REED_A: 48,
  REED_B: 49,
  REED_EDGE_N: 50,
  REED_EDGE_E: 51,
  REED_EDGE_S: 52,
  REED_EDGE_W: 53,
  REED_CORNER_NW: 54,
  REED_CORNER_NE: 55,
  REED_CORNER_SE: 56,
  REED_CORNER_SW: 57,
  REED_INNER_NW: 58,
  REED_INNER_NE: 59,
  REED_INNER_SE: 60,
  REED_INNER_SW: 61,
  WATER_LILY: 62,
  WATER_STONEPAD: 63,
  DECK_A: 64,
  DECK_ARROW: 65,
  DECK_RAIL_W: 66,
  DECK_RAIL_E: 67,
  /** Reserved spare — drawn in the sheet, not yet picked (landing stairs). */
  DECK_STEPS: 68,
  DOCK_A: 69,
  DOCK_B: 70,
  DOCK_EDGE_N: 71,
  DOCK_EDGE_E: 72,
  DOCK_EDGE_S: 73,
  DOCK_EDGE_W: 74,
  DOCK_CORNER_NW: 75,
  DOCK_CORNER_NE: 76,
  DOCK_CORNER_SE: 77,
  DOCK_CORNER_SW: 78,
  /** Reserved spare — drawn in the sheet, not yet picked (free-standing pier post). */
  DOCK_POST: 79,
} as const;

export type TrMaterial =
  | 'grass'
  | 'path'
  | 'stone'
  | 'water'
  | 'reed'
  | 'deck'
  | 'dock';

const MASK_CHAR_TO_MATERIAL: Record<string, TrMaterial> = {
  G: 'grass',
  A: 'water',
  R: 'reed',
  S: 'stone',
};

/**
 * Authored feature mask, 45 rows x 60 cols. G grass, A water, R reeds,
 * S plaza stone. Dirt lanes, the bridge deck, dock piers, and stepping
 * pads are stamped at build time. Traced from twin_rivers_living_v2.png.
 */
export const TR_FEATURE_MASK_ROWS: readonly string[] = [
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAGGGGGGAAGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGSSSSGGGGGGGGGGGGGGGGGAAAAGGGGGGAAAAAAGGGGGGGGGGG',
  'GGGGGGGGGGSSSSSSSSGGGGGGGAAGAAAAAAAAAAGGGGGGGAAAAAAGGGGGGGGG',
  'GGGGGGGGGSSSSSSSSSSGGGGGAAAAAAAAAAAAAAGSSSGGGGAAAAAAGGGGGGGG',
  'GGGGGGGGGSSSSSSSSSSGGGGAAAAAAAAAAAAAAASSSSGGGGAAAAAAAGGGGGGG',
  'GGGGGGGGGSSSSSSSSSSGGGAAAAAAAAGGGGGGGGSSSSGGGGAAAAAAAAAAAAGG',
  'GGGGGGGGGGSSSSSSSSSGGGAAAAAAAAGGGGGGGGGGGGGGGGAAAAAAAAAAAAGG',
  'GGGGGGGGGGGSSSSSSGGGGAAAAAAGGGGGGGGGGGGGGGGGAAAAAAAAGAAAAAGG',
  'GGGGGGGGGGGGGGGGGGGGAAAAAAAGGGGGGAAAGGGGGAAAAAAAAAAGGAAAAAGG',
  'GGGGGGGGAAAAAGGGAAAAAAAAAAAGGGGGGAAAGGGGGAAAAAAAAGGGGAAAAAGG',
  'GGGGGGGGAAAAAAAAAAAAAAAGGGGGGGGGGGGGGGGGGGAAAAAGGGGGGAAAAAGG',
  'GGGGGGAAAAAAAAAAAAAAGGGGGGGGGGGGGGGGGGGGAAAAAAAAAGGGGAAAAAGG',
  'GGGGGGAAAAAAAAAGGGGGGGGGGGGGGGGGGGGGGGGAAAAAAAAAAAGGGAAAAAGG',
  'GGGGGGAAAGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAAAAAAAAAAAAGGAAAAAGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAAAAAAAAAAAAGGAAAAAGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAAAAAAAAAAAAGGAAAAAGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAAAAAAAAAAAAGGAAAAAGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAAAAAAAAAAAAGGAAAAAGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAAAAAAAAAAGGGAAAAAGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAAAAAAAAGGGGAAAAAGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAAAAAGGGGGAAAAAGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGAAAAAAAAAAAAAAAAAAAAAAAAAGGGGGAAAGGGGGGGGGGGGGGGGG',
  'GGGGGGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGGGGGGGGGGGGGGGG',
  'GGGGGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGGGGGGGGGGGGGGGG',
  'GGGGGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGGGGGRRGGGGGGGGGGGAA',
  'GGGGGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAAGGRRGGRRRGGGGGGGGGGAA',
  'GGGGGGAAGGGAAGAAAAAAAAAAAAAAAAAAAAAGAAGGRRRGGGRRGGGGGGGGGGGA',
  'GGGGGGGGGGGAAGAAAAAAAAAAAAAAAAAAAAAGGGGRRRGGGGGRRGGGGGGGGGGG',
  'GGGGGGGGGGGAAGAAAAAAAAAAAAAAAAAAAAAGGGRRRRGGAAGRRGGGGGGGGGGG',
  'GGGGGGGGGGGGGGAAAAAAAAAAAAAAAAAAAAAGGGRRRRGGAAGRRGGGGGGGGGGG',
  'GGGGGGGGGGGGGGAAAAAAAAAAAAAAAAAAAAAGGGRRRRGAAAGRRGGGGGGGGGGG',
  'GGGGGGGGGGGGGGAAAAAAAAAAAAAAAAAAAAAGGGRRRRGAAAGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGAAAAAAAAAAAAAAAAAAAAAGGRRRRRGAAAGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGAAAGGGGGGGGGGGGGGGGRRRRRGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGAAGGGGGGGGGGGGGGGGGRRRRRGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
];

/** Route rects that read as packed dirt (the rest are plaza/grass courts). */
export const TR_DIRT_ROUTE_IDS: ReadonlySet<string> = new Set([
  'entry_arch',
  'west_path',
  'central_band',
  'north_bank',
  'west_connector',
  'east_path',
  'rapids_walk',
  'boss_approach',
  'south_west_path',
  'south_loop',
  'dock_village',
  'east_loop',
  'cove_trail',
  'fisher_cove',
]);

/** Dock pier rectangles (world px), stamped as plank decking. */
export const TR_DOCK_RECTS: ReadonlyArray<{ x: number; y: number; width: number; height: number }> = [
  { x: 544, y: 992, width: 512, height: 96 },
  { x: 608, y: 1088, width: 320, height: 96 },
  { x: 688, y: 1152, width: 144, height: 64 },
];

/**
 * Stepping-stone pads across the upper river (tile coords). Walkability
 * stays gated by tr_stones mastery; the pads themselves are always part
 * of the world (TWIN_RIVERS_STONES_RECT row).
 */
export const TR_STONE_PADS: ReadonlyArray<{ tx: number; ty: number }> = [
  { tx: 31, ty: 6 },
  { tx: 32, ty: 6 },
  { tx: 33, ty: 6 },
  { tx: 34, ty: 6 },
  { tx: 35, ty: 6 },
  { tx: 36, ty: 6 },
];

/**
 * Rock pads through the rapids basin: the rapids_walk / boss_approach
 * lanes are frozen walkable geography that crosses open whitewater, so
 * these pads give the crossing a visual affordance (the eastern half of
 * the approach rides the basin's natural land spine).
 */
export const TR_RAPIDS_PADS: ReadonlyArray<{ tx: number; ty: number }> = [
  { tx: 44, ty: 21 },
  { tx: 44, ty: 20 },
  { tx: 44, ty: 19 },
  { tx: 45, ty: 18 },
  { tx: 46, ty: 17 },
  { tx: 47, ty: 16 },
  { tx: 47, ty: 15 },
  { tx: 48, ty: 14 },
];

/** Rapids basin (world px, matches the mask's authored whitewater zone). */
const RAPIDS_ELLIPSE = { cx: 1420, cy: 590, rx: 215, ry: 170 };

type Grid = TrMaterial[][];

const materialAt = (grid: Grid, tx: number, ty: number, fallback: TrMaterial): TrMaterial => {
  if (tx < 0 || ty < 0 || tx >= TR_TILE_COLS || ty >= TR_TILE_ROWS) return fallback;
  return grid[ty][tx];
};

/**
 * Build the 60x45 material grid. Deterministic: same output every call.
 */
export const buildTwinRiversMaterialGrid = (): Grid => {
  const grid: Grid = TR_FEATURE_MASK_ROWS.map((row) =>
    row.split('').map((ch) => MASK_CHAR_TO_MATERIAL[ch] ?? 'grass')
  );

  // 1. Dirt lanes from frozen geography. Water is load-bearing in Twin
  //    Rivers, so lanes never overwrite it (crossings are deck/dock/pads).
  for (const rect of TWIN_RIVERS_ROUTE_RECTS) {
    if (!TR_DIRT_ROUTE_IDS.has(rect.id)) continue;
    for (let ty = 0; ty < TR_TILE_ROWS; ty += 1) {
      for (let tx = 0; tx < TR_TILE_COLS; tx += 1) {
        const m = grid[ty][tx];
        if (m === 'water' || m === 'stone') continue;
        if (cellCoveredByRect(tx, ty, TR_TILE_SIZE, rect)) grid[ty][tx] = 'path';
      }
    }
  }

  // 2. The Pointer Bridge deck (overrides everything it covers).
  const bridge = TWIN_RIVERS_ROUTE_RECTS.find((r) => r.id === 'bridge_walk');
  if (bridge) {
    for (let ty = 0; ty < TR_TILE_ROWS; ty += 1) {
      for (let tx = 0; tx < TR_TILE_COLS; tx += 1) {
        if (cellCoveredByRect(tx, ty, TR_TILE_SIZE, bridge)) grid[ty][tx] = 'deck';
      }
    }
  }

  // 3. Dock piers (plank decking stamped over the harbor water).
  for (const rect of TR_DOCK_RECTS) {
    for (let ty = 0; ty < TR_TILE_ROWS; ty += 1) {
      for (let tx = 0; tx < TR_TILE_COLS; tx += 1) {
        if (grid[ty][tx] === 'deck') continue;
        if (cellCoveredByRect(tx, ty, TR_TILE_SIZE, rect)) grid[ty][tx] = 'dock';
      }
    }
  }

  // 4. Erode water/reed cells the 12-tile sets cannot render. Lane stamps
  //    cut through the reed marsh (fisher's cove) and reshape shorelines,
  //    so legality must be enforced against the FINAL boundary sets.
  const boundaryFor: Partial<Record<TrMaterial, (m: TrMaterial) => boolean>> = {
    water: (m) => m === 'grass' || m === 'path' || m === 'stone',
    reed: (m) => m === 'grass' || m === 'path' || m === 'stone',
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (let ty = 0; ty < TR_TILE_ROWS; ty += 1) {
      for (let tx = 0; tx < TR_TILE_COLS; tx += 1) {
        const m = grid[ty][tx];
        const test = boundaryFor[m];
        if (!test) continue;
        const b = (dx: number, dy: number): boolean =>
          test(materialAt(grid, tx + dx, ty + dy, m));
        const gN = b(0, -1);
        const gE = b(1, 0);
        const gS = b(0, 1);
        const gW = b(-1, 0);
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

const transitionOrdinal = (
  grid: Grid,
  tx: number,
  ty: number,
  self: TrMaterial,
  isBoundary: (m: TrMaterial) => boolean
): number =>
  transitionOrdinal12((dx, dy) => isBoundary(materialAt(grid, tx + dx, ty + dy, self)));

const inRapids = (tx: number, ty: number): boolean => {
  const px = tx * TR_TILE_SIZE + TR_TILE_SIZE / 2;
  const py = ty * TR_TILE_SIZE + TR_TILE_SIZE / 2;
  const dx = (px - RAPIDS_ELLIPSE.cx) / RAPIDS_ELLIPSE.rx;
  const dy = (py - RAPIDS_ELLIPSE.cy) / RAPIDS_ELLIPSE.ry;
  return dx * dx + dy * dy <= 1;
};

const isPad = (tx: number, ty: number): boolean =>
  TR_STONE_PADS.some((p) => p.tx === tx && p.ty === ty) ||
  TR_RAPIDS_PADS.some((p) => p.tx === tx && p.ty === ty);

/** Frame index for the STATIC ground layer at (tx, ty). */
export const pickTwinRiversTile = (tx: number, ty: number, grid: Grid): number => {
  const m = grid[ty][tx];
  const h = tileHash(tx, ty);
  const isLand = (n: TrMaterial): boolean =>
    n === 'grass' || n === 'path' || n === 'stone';

  if (m === 'grass') {
    if (h < 3) return TR_TILE.GRASS_FLOWERS;
    if (h < 11) {
      // Shade clusters only deep in open grass.
      let allGrass = true;
      for (let dy = -1; dy <= 1 && allGrass; dy += 1) {
        for (let dx = -1; dx <= 1 && allGrass; dx += 1) {
          if (materialAt(grid, tx + dx, ty + dy, 'grass') !== 'grass') allGrass = false;
        }
      }
      if (allGrass) return TR_TILE.GRASS_DARK;
    }
    return (tx + ty) % 2 === 0 ? TR_TILE.GRASS_A : TR_TILE.GRASS_B;
  }

  if (m === 'path') {
    const ordinal = transitionOrdinal(grid, tx, ty, m, (n) => n === 'grass');
    if (ordinal >= 0) return TR_TILE.PATH_EDGE_N + ordinal;
    return (tx + ty) % 2 === 0 ? TR_TILE.PATH_A : TR_TILE.PATH_B;
  }

  if (m === 'stone') {
    const ordinal = transitionOrdinal(grid, tx, ty, m, (n) => n === 'grass');
    if (ordinal >= 0) return TR_TILE.STONE_EDGE_N + ordinal;
    return (tx + ty) % 2 === 0 ? TR_TILE.STONE_A : TR_TILE.STONE_B;
  }

  if (m === 'water') {
    if (isPad(tx, ty)) return TR_TILE.WATER_STONEPAD;
    const ordinal = transitionOrdinal(grid, tx, ty, m, isLand);
    if (ordinal >= 0) return TR_TILE.WATER_EDGE_N + ordinal;
    if (inRapids(tx, ty)) {
      return (tx + ty) % 2 === 0 ? TR_TILE.WATER_RAPIDS_A : TR_TILE.WATER_RAPIDS_B;
    }
    if (h < 4) return TR_TILE.WATER_LILY;
    if (h < 16) return TR_TILE.WATER_GLINT;
    return TR_TILE.WATER_A;
  }

  if (m === 'reed') {
    const ordinal = transitionOrdinal(grid, tx, ty, m, isLand);
    if (ordinal >= 0) return TR_TILE.REED_EDGE_N + ordinal;
    return (tx + ty) % 2 === 0 ? TR_TILE.REED_A : TR_TILE.REED_B;
  }

  if (m === 'deck') {
    const west = materialAt(grid, tx - 1, ty, 'deck');
    const east = materialAt(grid, tx + 1, ty, 'deck');
    if (west !== 'deck') return TR_TILE.DECK_RAIL_W;
    if (east !== 'deck') return TR_TILE.DECK_RAIL_E;
    if (h < 14) return TR_TILE.DECK_ARROW;
    return TR_TILE.DECK_A;
  }

  // dock — plank piers; edges & corners face open water only.
  const water = (n: TrMaterial): boolean => n === 'water';
  const ordinal = transitionOrdinal(grid, tx, ty, m, water);
  if (ordinal >= 0 && ordinal <= 7) return TR_TILE.DOCK_EDGE_N + ordinal; // edges + outer corners only
  return (tx + ty) % 2 === 0 ? TR_TILE.DOCK_A : TR_TILE.DOCK_B;
};

/** Full 60x45 frame grid for the RenderTexture bake. */
export const buildTwinRiversTileGrid = (): number[][] => {
  const materials = buildTwinRiversMaterialGrid();
  return materials.map((row, ty) => row.map((_, tx) => pickTwinRiversTile(tx, ty, materials)));
};
