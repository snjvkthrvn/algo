import type { RegionConfig } from '../types';
import { REGIONS } from '../../config/constants';

export const TWIN_RIVERS_WORLD_WIDTH = 1920;
export const TWIN_RIVERS_WORLD_HEIGHT = 1440;

export const TWIN_RIVERS_PARTICLE_CONFIG = {
  density: 24,
  speed: 1.2,
  color: '#7dd3fc',
  size: 2,
  flowDirection: 'horizontal' as const,
};

export interface TwinRiversRouteRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TwinRiversCollisionBlocker {
  x: number;
  y: number;
  radiusTiles?: number;
}

/**
 * Walkable lanes traced over twin_rivers_living_v1.png (1920x1440). Two
 * rivers cross the valley; the grand Pointer Bridge stitches three bank
 * bands together. Real loops, a dock village, a reed-hidden fisher's
 * cove, and a stone-circle island reachable only by the stepping stones
 * that two-pointer mastery unlocks (docs/VISION.md §2).
 */
export const TWIN_RIVERS_ROUTE_RECTS: TwinRiversRouteRect[] = [
  // West entry: the mossy gateway arch from Array Plains.
  { id: 'entry_arch', x: 26, y: 560, width: 150, height: 128 },
  { id: 'west_path', x: 128, y: 592, width: 360, height: 96 },
  // Central band between the rivers, reaching the bridge's mid landing.
  { id: 'central_band', x: 480, y: 576, width: 480, height: 128 },
  // The grand Pointer Bridge: one continuous walk from the north bank to
  // the dock village, crossing both rivers.
  { id: 'bridge_walk', x: 912, y: 96, width: 88, height: 1040 },
  // North bank along the upper river + the Mirror Walk court.
  { id: 'north_bank', x: 192, y: 88, width: 1184, height: 112 },
  { id: 'mirror_court', x: 304, y: 144, width: 272, height: 210 },
  { id: 'west_connector', x: 192, y: 200, width: 96, height: 400 },
  // The stone-circle island: ON the route list, but physically reachable
  // only across the stepping stones (gated separately below).
  { id: 'island_court', x: 1152, y: 176, width: 272, height: 150 },
  // East: the rapids walk + the Mirror Serpent's misty gate.
  { id: 'east_path', x: 960, y: 624, width: 440, height: 104 },
  { id: 'rapids_walk', x: 1390, y: 520, width: 160, height: 208 },
  { id: 'boss_approach', x: 1540, y: 416, width: 260, height: 240 },
  // South: the dock village and the big southern loop.
  { id: 'south_west_path', x: 128, y: 688, width: 112, height: 480 },
  { id: 'south_loop', x: 128, y: 1136, width: 1660, height: 132 },
  { id: 'dock_village', x: 512, y: 928, width: 560, height: 320 },
  { id: 'east_loop', x: 1700, y: 656, width: 110, height: 500 },
  // The fisher's cove secret, behind the reeds off the south loop.
  { id: 'cove_trail', x: 1430, y: 1080, width: 80, height: 130 },
  { id: 'fisher_cove', x: 1340, y: 980, width: 240, height: 140 },
];

/**
 * The stepping stones to the stone-circle island. Walkable only after
 * two-pointer mastery (tr_1) — your feet learned to walk both ends, the
 * stones answer in kind.
 */
export const TWIN_RIVERS_STONES_RECT: TwinRiversRouteRect = {
  id: 'stepping_stones', x: 992, y: 176, width: 168, height: 72,
};

const pointInsideRect = (
  point: { x: number; y: number },
  rect: TwinRiversRouteRect,
  padding = 0
): boolean => (
  point.x >= rect.x - padding &&
  point.x <= rect.x + rect.width + padding &&
  point.y >= rect.y - padding &&
  point.y <= rect.y + rect.height + padding
);

export const isPointOnTwinRiversRoute = (
  point: { x: number; y: number },
  padding = 0
): boolean => TWIN_RIVERS_ROUTE_RECTS.some((rect) => pointInsideRect(point, rect, padding));

const movementTile = (point: { x: number; y: number }): { col: number; row: number } => ({
  col: Math.floor(point.x / 32),
  row: Math.floor(point.y / 32),
});

export const isPointBlockedByTwinRiversCollision = (
  point: { x: number; y: number },
  blockers: TwinRiversCollisionBlocker[]
): boolean => {
  const target = movementTile(point);

  return blockers.some((blocker) => {
    const origin = movementTile(blocker);
    const radiusTiles = blocker.radiusTiles ?? 0;

    return (
      Math.abs(target.col - origin.col) <= radiusTiles &&
      Math.abs(target.row - origin.row) <= radiusTiles
    );
  });
};

export const isTwinRiversStepWalkable = (
  point: { x: number; y: number },
  blockers: TwinRiversCollisionBlocker[],
  routePadding = 0
): boolean => (
  isPointOnTwinRiversRoute(point, routePadding) &&
  !isPointBlockedByTwinRiversCollision(point, blockers)
);

export const TWIN_RIVERS_CONFIG: RegionConfig = {
  id: REGIONS.TWIN_RIVERS,
  name: REGIONS.TWIN_RIVERS,
  displayName: 'Twin Rivers',
  description: 'A split water-road where two pointers learn to move together.',
  theme: {
    primaryColor: '#5ab7d4',
    secondaryColor: '#28698a',
    accentColor: '#fbbf24',
    atmosphere: 'bright, flowing, reflective',
    visualStyle: 'pixel-art river valley',
  },
  unlockRequirements: {
    specificPuzzles: ['boss_shuffler'],
  },
  backgroundMusic: 'prologue-bgm',
  spawnPoint: { x: 160, y: 624 },
  exitPoints: [
    {
      id: 'array_plains_gateway',
      position: { x: 88, y: 624 },
      leadsTo: REGIONS.ARRAY_PLAINS,
      requiresUnlock: false,
    },
    {
      id: 'hash_highlands_gateway',
      position: { x: 1760, y: 470 },
      leadsTo: REGIONS.HASH_HIGHLANDS,
      requiresUnlock: false,
    },
  ],
  npcs: [
    { id: 'river_guide', position: { x: 700, y: 640 }, enabled: true },
  ],
  puzzles: [
    // Each trial lives at its landmark: the mirrored court, the bridge's
    // mid landing, the dock village, the rapids, the misty twin pillars.
    { id: 'tr_1', position: { x: 440, y: 264 }, enabled: true },
    { id: 'tr_2', position: { x: 952, y: 648 }, enabled: true },
    { id: 'tr_3', position: { x: 760, y: 1052 }, enabled: true },
    { id: 'tr_4', position: { x: 1452, y: 620 }, enabled: true },
    { id: 'boss_mirror_serpent', position: { x: 1668, y: 520 }, enabled: true },
  ],
  interactables: [],
};
