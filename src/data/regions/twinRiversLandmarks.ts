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
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 320, baseY: 540 },
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 760, baseY: 560 },
  { key: TR_LANDMARK_KEYS.TREE_SMALL, x: 620, baseY: 330 },
  { key: TR_LANDMARK_KEYS.TREE_SMALL, x: 1230, baseY: 760 },
  // East + south fringes.
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 1660, baseY: 860 },
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 96, baseY: 960 },
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 280, baseY: 1340 },
  { key: TR_LANDMARK_KEYS.TREE_LARGE, x: 960, baseY: 1330 },
  { key: TR_LANDMARK_KEYS.TREE_SMALL, x: 1810, baseY: 1340 },
  { key: TR_LANDMARK_KEYS.BUSH, x: 330, baseY: 376 },
  { key: TR_LANDMARK_KEYS.BUSH, x: 1130, baseY: 340 },
  { key: TR_LANDMARK_KEYS.BUSH, x: 1660, baseY: 1000 },
  // Mirror-court plaza lanterns (on the flagstones, like the painting).
  { key: TR_LANDMARK_KEYS.LANTERN, x: 330, baseY: 180 },
  { key: TR_LANDMARK_KEYS.LANTERN, x: 570, baseY: 180 },
  { key: TR_LANDMARK_KEYS.LANTERN, x: 320, baseY: 290 },
  { key: TR_LANDMARK_KEYS.LANTERN, x: 590, baseY: 290 },
  // Stone-circle island pillars ringing the central pad.
  { key: TR_LANDMARK_KEYS.PILLAR, x: 1180, baseY: 270 },
  { key: TR_LANDMARK_KEYS.PILLAR, x: 1420, baseY: 240 },
  { key: TR_LANDMARK_KEYS.PILLAR, x: 1210, baseY: 300 },
  { key: TR_LANDMARK_KEYS.PILLAR, x: 1370, baseY: 320 },
  // The grand Pointer Bridge gatehouses (open passages align with the
  // deck) and the Mirror Serpent gate astride the east river.
  { key: TR_LANDMARK_KEYS.BRIDGE_TOWER_NORTH, x: 956, baseY: 560 },
  { key: TR_LANDMARK_KEYS.BRIDGE_TOWER_SOUTH, x: 956, baseY: 1020 },
  { key: TR_LANDMARK_KEYS.SERPENT_GATE, x: 1760, baseY: 736 },
  // Dock village dressing.
  { key: TR_LANDMARK_KEYS.CRANE, x: 620, baseY: 1020 },
  { key: TR_LANDMARK_KEYS.DOCKHUT, x: 780, baseY: 1068 },
  { key: TR_LANDMARK_KEYS.BOAT, x: 500, baseY: 1170 },
  { key: TR_LANDMARK_KEYS.BOAT2, x: 890, baseY: 1200 },
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
