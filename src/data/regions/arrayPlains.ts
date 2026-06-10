import type { Interactable, RegionConfig } from '../types';
import { REGIONS } from '../../config/constants';

export const ARRAY_PLAINS_WORLD_WIDTH = 1920;
export const ARRAY_PLAINS_WORLD_HEIGHT = 1440;

export interface ArrayPlainsRouteRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArrayPlainsCollisionBlocker {
  x: number;
  y: number;
  radiusTiles?: number;
}

/**
 * Walkable lanes traced over array_plains_living_v1.png (1920x1440). The
 * map is a real place now (docs/VISION.md §2): a main east-west road, a
 * north loop (Sorting Shed + Indexing Barn), a south loop (pond farmstead,
 * Grain Hopper, Pairing Grounds), a faint secret trail into the wheat
 * grove, and a broken-bridge stream crossing that sorting mastery repairs.
 */
export const ARRAY_PLAINS_ROUTE_RECTS: ArrayPlainsRouteRect[] = [
  // Main east-west road: gateway arch to the Shuffler palisade.
  { id: 'main_road', x: 48, y: 608, width: 1726, height: 112 },
  // North loop.
  { id: 'north_road', x: 700, y: 264, width: 100, height: 376 },
  { id: 'barn_yard', x: 744, y: 280, width: 392, height: 140 },
  { id: 'shed_branch', x: 328, y: 384, width: 420, height: 96 },
  { id: 'shed_yard', x: 296, y: 288, width: 330, height: 192 },
  // Secret wheat-grove trail (narrow on purpose — it should feel found).
  { id: 'grove_trail', x: 1128, y: 240, width: 216, height: 72 },
  { id: 'grove_clearing', x: 1336, y: 96, width: 312, height: 248 },
  // South loop around the pond + farmstead.
  { id: 'south_west_road', x: 616, y: 704, width: 88, height: 580 },
  { id: 'south_road', x: 616, y: 1212, width: 648, height: 92 },
  { id: 'south_east_road', x: 1180, y: 704, width: 84, height: 600 },
  { id: 'farm_yard', x: 660, y: 1096, width: 560, height: 132 },
  // Grain Hopper spur (southwest) + its work yard.
  { id: 'hopper_road', x: 212, y: 704, width: 96, height: 364 },
  { id: 'hopper_yard', x: 140, y: 912, width: 240, height: 212 },
  // Pairing Grounds spur (southeast) + the standing-stone field.
  { id: 'pairing_road', x: 1248, y: 948, width: 160, height: 84 },
  { id: 'pairing_field', x: 1376, y: 872, width: 348, height: 344 },
];

/**
 * The broken plank bridge over the hopper stream. NOT part of the route
 * rects — it becomes walkable only after the sorting-mastery repair (the
 * script's HM parallel: mastered algorithms unlock traversal).
 */
export const ARRAY_PLAINS_BRIDGE_RECT: ArrayPlainsRouteRect = {
  id: 'stream_crossing', x: 372, y: 948, width: 252, height: 104,
};

const pointInsideRect = (
  point: { x: number; y: number },
  rect: ArrayPlainsRouteRect,
  padding = 0
): boolean => (
  point.x >= rect.x - padding &&
  point.x <= rect.x + rect.width + padding &&
  point.y >= rect.y - padding &&
  point.y <= rect.y + rect.height + padding
);

export const isPointOnArrayPlainsRoute = (
  point: { x: number; y: number },
  padding = 0
): boolean => ARRAY_PLAINS_ROUTE_RECTS.some((rect) => pointInsideRect(point, rect, padding));

const movementTile = (point: { x: number; y: number }): { col: number; row: number } => ({
  col: Math.floor(point.x / 32),
  row: Math.floor(point.y / 32),
});

export const isPointBlockedByArrayPlainsCollision = (
  point: { x: number; y: number },
  blockers: ArrayPlainsCollisionBlocker[]
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

export const isArrayPlainsStepWalkable = (
  point: { x: number; y: number },
  blockers: ArrayPlainsCollisionBlocker[],
  routePadding = 10
): boolean => (
  isPointOnArrayPlainsRoute(point, routePadding) &&
  !isPointBlockedByArrayPlainsCollision(point, blockers)
);

const indexMarker = (id: string, x: number, y: number): Interactable => ({
  id,
  type: 'sign',
  position: { x, y },
  interaction: {
    prompt: '[SPACE] Inspect',
    action: 'inspect',
    outcome: { type: 'dialogue', value: id },
  },
});

export const ARRAY_PLAINS_CONFIG: RegionConfig = {
  id: REGIONS.ARRAY_PLAINS,
  name: REGIONS.ARRAY_PLAINS,
  displayName: 'Array Plains',
  description: 'A measured field where every path has an index.',
  theme: {
    primaryColor: '#88c070',
    secondaryColor: '#346856',
    accentColor: '#fbbf24',
    atmosphere: 'open, ordered, quietly arcane',
    visualStyle: 'pixel-art indexed plains',
  },
  unlockRequirements: {
    regionsCompleted: [REGIONS.PROLOGUE],
  },
  // Reuses prologue BGM until a dedicated Array Plains track is shipped (see AUDIO_ASSETS).
  backgroundMusic: 'prologue-bgm',
  spawnPoint: { x: 168, y: 664 },
  exitPoints: [
    {
      id: 'prologue_gateway',
      position: { x: 88, y: 664 },
      leadsTo: REGIONS.PROLOGUE,
      requiresUnlock: false,
    },
    {
      id: 'twin_rivers_gateway',
      position: { x: 1736, y: 664 },
      leadsTo: REGIONS.TWIN_RIVERS,
      requiresUnlock: true,
      unlockCondition: 'twin_rivers_gateway_open',
    },
  ],
  npcs: [
    { id: 'array_guide', position: { x: 836, y: 664 }, enabled: true },
  ],
  puzzles: [
    // Each trial lives at its landmark now: shed, barn, silo, stone field.
    { id: 'ap_1', position: { x: 452, y: 388 }, enabled: true },
    { id: 'ap_2', position: { x: 948, y: 372 }, enabled: true },
    { id: 'ap_3', position: { x: 268, y: 980 }, enabled: true },
    { id: 'ap_4', position: { x: 1532, y: 1020 }, enabled: true },
    { id: 'boss_shuffler', position: { x: 1672, y: 664 }, enabled: true },
  ],
  interactables: [
    indexMarker('index_marker_0', 560, 696),
    indexMarker('index_marker_1', 880, 696),
    indexMarker('index_marker_2', 1056, 696),
    indexMarker('index_marker_3', 1312, 696),
    indexMarker('index_marker_4', 1480, 696),
  ],
};
