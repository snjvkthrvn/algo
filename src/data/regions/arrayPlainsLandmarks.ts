import type Phaser from 'phaser';
import { AP_FENCE_KEYS, AP_LANDMARK_KEYS } from '../../config/assets';
import { worldDepthForY } from '../../utils/actorDepth';
import { ARRAY_PLAINS_WORLD_HEIGHT } from './arrayPlains';
import { AP_TILE_SIZE } from './arrayPlainsTilemap';

/**
 * Individually placed Array Plains landmarks (docs/VISION.md §2): the
 * scenery that used to be baked into the living-map painting, now real
 * sprites at terrain density. Positions were traced from the retired
 * painting (art_sources/.../array_plains_living_v1_reference.png) so the
 * world keeps its exact geography; every base cell is validated against
 * the tile plan by arrayPlainsLandmarks.test.ts.
 *
 * Landmarks y-sort with the player through the shared 3..5 actor band
 * (worldDepthForY) using their ground-contact line (baseY).
 */

export interface ApLandmarkPlacement {
  key: string;
  /** Sprite center x, world px. */
  x: number;
  /** Ground-contact line, world px (sprite renders with origin 0.5, 1). */
  baseY: number;
}

export const AP_LANDMARKS: ReadonlyArray<ApLandmarkPlacement> = [
  // The four landmark buildings, at the painting's coordinates.
  { key: AP_LANDMARK_KEYS.SHED, x: 448, baseY: 336 },
  { key: AP_LANDMARK_KEYS.BARN, x: 960, baseY: 320 },
  { key: AP_LANDMARK_KEYS.SILO, x: 264, baseY: 1152 },
  { key: AP_LANDMARK_KEYS.FARMHOUSE, x: 1000, baseY: 1152 },
  // Stone gateway arch straddling the west exit; the void portal sits in
  // its walkable gap. Grove shrine stones ring the hidden-clearing beat.
  { key: AP_LANDMARK_KEYS.ARCH, x: 88, baseY: 752 },
  { key: AP_LANDMARK_KEYS.GROVE_STONE, x: 1488, baseY: 248 },
  // Trees + bushes on grass, echoing the painting's clusters.
  { key: AP_LANDMARK_KEYS.TREE_LARGE, x: 216, baseY: 592 },
  { key: AP_LANDMARK_KEYS.TREE_LARGE, x: 688, baseY: 560 },
  { key: AP_LANDMARK_KEYS.TREE_LARGE, x: 1240, baseY: 216 },
  { key: AP_LANDMARK_KEYS.TREE_LARGE, x: 1616, baseY: 784 },
  { key: AP_LANDMARK_KEYS.TREE_LARGE, x: 872, baseY: 1344 },
  { key: AP_LANDMARK_KEYS.TREE_LARGE, x: 120, baseY: 448 },
  { key: AP_LANDMARK_KEYS.TREE_SMALL, x: 560, baseY: 528 },
  { key: AP_LANDMARK_KEYS.TREE_SMALL, x: 1320, baseY: 560 },
  { key: AP_LANDMARK_KEYS.TREE_SMALL, x: 1544, baseY: 352 },
  { key: AP_LANDMARK_KEYS.TREE_SMALL, x: 1608, baseY: 1288 },
  { key: AP_LANDMARK_KEYS.TREE_SMALL, x: 248, baseY: 168 },
  { key: AP_LANDMARK_KEYS.BUSH, x: 352, baseY: 592 },
  { key: AP_LANDMARK_KEYS.BUSH, x: 1088, baseY: 464 },
  { key: AP_LANDMARK_KEYS.BUSH, x: 584, baseY: 1112 },
  { key: AP_LANDMARK_KEYS.BUSH, x: 1360, baseY: 936 },
];

/** Fence-kit frame indices (assets/visual_revamp/props/ap_fence_kit_v1.png). */
export const AP_FENCE_FRAME = {
  H_SEG: 0,
  H_END_L: 1,
  H_END_R: 2,
  V_SEG: 3,
  V_TOP: 4,
  V_BOTTOM: 5,
} as const;

export interface ApFenceRun {
  orient: 'h' | 'v';
  /** First cell of the run, tile coords. */
  tx: number;
  ty: number;
  /** Number of segment cells; an end-cap cell is appended after the run. */
  length: number;
}

export const AP_FENCE_RUNS: ReadonlyArray<ApFenceRun> = [
  // Pairing Grounds ring (west gap = the pairing_road entrance).
  { orient: 'h', tx: 43, ty: 27, length: 10 },
  { orient: 'h', tx: 43, ty: 38, length: 10 },
  { orient: 'v', tx: 43, ty: 28, length: 1 },
  { orient: 'v', tx: 43, ty: 33, length: 4 },
  { orient: 'v', tx: 53, ty: 28, length: 9 },
  // Farmstead yard (gap in the middle = the door path).
  { orient: 'h', tx: 21, ty: 33, length: 5 },
  { orient: 'h', tx: 31, ty: 33, length: 5 },
  { orient: 'v', tx: 20, ty: 34, length: 3 },
  { orient: 'v', tx: 38, ty: 34, length: 3 },
  // Grain Hopper work yard.
  { orient: 'v', tx: 4, ty: 29, length: 5 },
  { orient: 'h', tx: 4, ty: 35, length: 6 },
  // Indexing Barn east yard edge.
  { orient: 'v', tx: 36, ty: 9, length: 4 },
  // Sorting Shed garden edge.
  { orient: 'h', tx: 5, ty: 6, length: 8 },
];

/** Cells a fence run occupies, including its end-cap cell. */
export const fenceRunCells = (run: ApFenceRun): Array<{ tx: number; ty: number; frame: number }> => {
  const cells: Array<{ tx: number; ty: number; frame: number }> = [];
  for (let i = 0; i < run.length; i += 1) {
    cells.push({
      tx: run.orient === 'h' ? run.tx + i : run.tx,
      ty: run.orient === 'h' ? run.ty : run.ty + i,
      frame: run.orient === 'h' ? AP_FENCE_FRAME.H_SEG : AP_FENCE_FRAME.V_SEG,
    });
  }
  cells.push({
    tx: run.orient === 'h' ? run.tx + run.length : run.tx,
    ty: run.orient === 'h' ? run.ty : run.ty + run.length,
    frame: run.orient === 'h' ? AP_FENCE_FRAME.H_END_R : AP_FENCE_FRAME.V_BOTTOM,
  });
  return cells;
};

/** Place all landmark sprites + fence runs. Call after the ground bake. */
export const placeArrayPlainsLandmarks = (scene: Phaser.Scene): void => {
  for (const placement of AP_LANDMARKS) {
    if (!scene.textures.exists(placement.key)) continue;
    scene.add
      .image(placement.x, placement.baseY, placement.key)
      .setOrigin(0.5, 1)
      .setDepth(worldDepthForY(placement.baseY, ARRAY_PLAINS_WORLD_HEIGHT));
  }

  if (!scene.textures.exists(AP_FENCE_KEYS.KIT)) return;
  for (const run of AP_FENCE_RUNS) {
    for (const cell of fenceRunCells(run)) {
      const baseY = (cell.ty + 1) * AP_TILE_SIZE;
      scene.add
        .image(cell.tx * AP_TILE_SIZE + AP_TILE_SIZE / 2, baseY, AP_FENCE_KEYS.KIT, cell.frame)
        .setOrigin(0.5, 1)
        .setDepth(worldDepthForY(baseY - AP_TILE_SIZE / 2, ARRAY_PLAINS_WORLD_HEIGHT));
    }
  }
};
