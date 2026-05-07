import type { RegionConfig } from '../types';
import { REGIONS } from '../../config/constants';

export const TWIN_RIVERS_WORLD_WIDTH = 1920;
export const TWIN_RIVERS_WORLD_HEIGHT = 720;

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

export const TWIN_RIVERS_ROUTE_RECTS: TwinRiversRouteRect[] = [
  { id: 'entry_bank', x: 64, y: 320, width: 416, height: 144 },
  { id: 'lower_riverbank', x: 432, y: 336, width: 1120, height: 136 },
  { id: 'upper_riverbank', x: 432, y: 160, width: 1120, height: 112 },
  { id: 'bridge_crossing', x: 760, y: 248, width: 296, height: 176 },
  { id: 'future_gate_lane', x: 1488, y: 312, width: 344, height: 152 },
  { id: 'sequence_puzzle', x: 1040, y: 440, width: 320, height: 160 },
];

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
  spawnPoint: { x: 192, y: 384 },
  exitPoints: [
    {
      id: 'array_plains_gateway',
      position: { x: 128, y: 384 },
      leadsTo: REGIONS.ARRAY_PLAINS,
      requiresUnlock: false,
    },
    {
      id: 'hash_highlands_gateway',
      position: { x: 1784, y: 384 },
      leadsTo: REGIONS.HASH_HIGHLANDS,
      requiresUnlock: false,
    },
  ],
  npcs: [
    { id: 'river_guide', position: { x: 912, y: 368 }, enabled: true },
  ],
  puzzles: [
    { id: 'tr_1', position: { x: 544, y: 384 }, enabled: true },
    { id: 'tr_2', position: { x: 912, y: 224 }, enabled: true },
    { id: 'tr_3', position: { x: 1008, y: 384 }, enabled: true },
    { id: 'tr_4', position: { x: 1328, y: 384 }, enabled: true },
    { id: 'boss_mirror_serpent', position: { x: 1696, y: 384 }, enabled: true },
  ],
  interactables: [],
};
