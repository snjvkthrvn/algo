import type Phaser from 'phaser';
import { TR_LANDMARK_KEYS } from '../../config/assets';
import { worldDepthForY } from '../../utils/actorDepth';
import { TWIN_RIVERS_WORLD_HEIGHT } from './twinRivers';

/**
 * Individually placed Twin Rivers landmarks (docs/VISION.md §2): flora at
 * terrain density (TR-palette recolors of the AP set), plaza lanterns, and
 * the island's standing pillars. The big structures — Pointer Bridge
 * towers, the Mirror Serpent gate, dock crane/huts/boats — join this list
 * as their imagegen sprites land; positions were traced from the retired
 * painting (art_sources/.../twin_rivers_living_v2_reference.png).
 *
 * Every base cell is validated against the tile plan by
 * twinRiversLandmarks.test.ts. Landmarks y-sort with the player through
 * the shared 3..5 actor band.
 */

export interface TrLandmarkPlacement {
  key: string;
  x: number;
  /** Ground-contact line (sprite renders with origin 0.5, 1). */
  baseY: number;
}

export const TR_LANDMARKS: ReadonlyArray<TrLandmarkPlacement> = [
  // North treeline (above the north bank walk).
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 168, baseY: 88 },
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 680, baseY: 80 },
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 1560, baseY: 88 },
  // Mid-valley clusters.
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 320, baseY: 536 },
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 760, baseY: 560 },
  { key: TR_LANDMARK_KEYS.TREE_SMALL, x: 616, baseY: 328 },
  { key: TR_LANDMARK_KEYS.TREE_SMALL, x: 1232, baseY: 760 },
  // East + south fringes.
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 1656, baseY: 856 },
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 96, baseY: 960 },
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 280, baseY: 1336 },
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 960, baseY: 1328 },
  { key: TR_LANDMARK_KEYS.TREE_SMALL, x: 1808, baseY: 1336 },
  { key: TR_LANDMARK_KEYS.BUSH, x: 328, baseY: 376 },
  { key: TR_LANDMARK_KEYS.BUSH, x: 1128, baseY: 336 },
  { key: TR_LANDMARK_KEYS.BUSH, x: 1656, baseY: 1000 },
  // Mirror-court plaza lanterns (on the flagstones, like the painting).
  { key: TR_LANDMARK_KEYS.LANTERN, x: 328, baseY: 176 },
  { key: TR_LANDMARK_KEYS.LANTERN, x: 568, baseY: 176 },
  { key: TR_LANDMARK_KEYS.LANTERN, x: 320, baseY: 288 },
  { key: TR_LANDMARK_KEYS.LANTERN, x: 592, baseY: 288 },
  // Stone-circle island pillars ringing the central pad.
  { key: TR_LANDMARK_KEYS.PILLAR, x: 1176, baseY: 272 },
  { key: TR_LANDMARK_KEYS.PILLAR, x: 1416, baseY: 240 },
  { key: TR_LANDMARK_KEYS.PILLAR, x: 1208, baseY: 296 },
  { key: TR_LANDMARK_KEYS.PILLAR, x: 1368, baseY: 320 },
  // The grand Pointer Bridge gatehouses (open passages align with the
  // deck) and the Mirror Serpent gate astride the east river.
  { key: TR_LANDMARK_KEYS.BRIDGE_TOWER_NORTH, x: 944, baseY: 560 },
  { key: TR_LANDMARK_KEYS.BRIDGE_TOWER_SOUTH, x: 944, baseY: 1016 },
  { key: TR_LANDMARK_KEYS.SERPENT_GATE, x: 1760, baseY: 736 },
  // Dock village dressing.
  { key: TR_LANDMARK_KEYS.CRANE, x: 616, baseY: 1016 },
  { key: TR_LANDMARK_KEYS.DOCKHUT, x: 776, baseY: 1064 },
  { key: TR_LANDMARK_KEYS.BOAT, x: 496, baseY: 1168 },
  { key: TR_LANDMARK_KEYS.BOAT2, x: 888, baseY: 1200 },
  { key: TR_LANDMARK_KEYS.NETRACK, x: 1000, baseY: 1080 },
];

/** Place all Twin Rivers landmark sprites. Call after the ground bake. */
export const placeTwinRiversLandmarks = (scene: Phaser.Scene): void => {
  for (const placement of TR_LANDMARKS) {
    if (!scene.textures.exists(placement.key)) continue;
    scene.add
      .image(placement.x, placement.baseY, placement.key)
      .setOrigin(0.5, 1)
      .setDepth(worldDepthForY(placement.baseY, TWIN_RIVERS_WORLD_HEIGHT));
  }
};
