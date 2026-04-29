import type { Interactable, RegionConfig } from '../types';
import { REGIONS } from '../../config/constants';

export const ARRAY_PLAINS_WORLD_WIDTH = 1920;
export const ARRAY_PLAINS_WORLD_HEIGHT = 720;

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

export const ARRAY_PLAINS_ROUTE_RECTS: ArrayPlainsRouteRect[] = [
  { id: 'entry_lane', x: 80, y: 392, width: 336, height: 112 },
  { id: 'index_walk', x: 384, y: 360, width: 1144, height: 160 },
  { id: 'guide_clearing', x: 760, y: 264, width: 416, height: 128 },
  { id: 'return_lane', x: 80, y: 296, width: 160, height: 128 },
  { id: 'sorting_shed', x: 448, y: 248, width: 224, height: 144 },
  { id: 'indexing_barn', x: 656, y: 504, width: 224, height: 120 },
  { id: 'grain_hopper', x: 1096, y: 248, width: 224, height: 144 },
  { id: 'pairing_grounds', x: 1184, y: 504, width: 224, height: 120 },
  { id: 'shuffler_lane', x: 1456, y: 360, width: 344, height: 160 },
];

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
  spawnPoint: { x: 192, y: 448 },
  exitPoints: [
    {
      id: 'prologue_gateway',
      position: { x: 112, y: 448 },
      leadsTo: REGIONS.PROLOGUE,
      requiresUnlock: false,
    },
    {
      id: 'twin_rivers_gateway',
      position: { x: 1784, y: 416 },
      leadsTo: REGIONS.TWIN_RIVERS,
      requiresUnlock: true,
      unlockCondition: 'twin_rivers_gateway_open',
    },
  ],
  npcs: [
    { id: 'array_guide', position: { x: 912, y: 336 }, enabled: true },
  ],
  puzzles: [
    { id: 'ap_1', position: { x: 560, y: 320 }, enabled: true },
    { id: 'ap_2', position: { x: 768, y: 560 }, enabled: true },
    { id: 'ap_3', position: { x: 1208, y: 320 }, enabled: true },
    { id: 'ap_4', position: { x: 1296, y: 560 }, enabled: true },
    { id: 'boss_shuffler', position: { x: 1608, y: 416 }, enabled: true },
  ],
  interactables: [
    indexMarker('index_marker_0', 608, 416),
    indexMarker('index_marker_1', 736, 416),
    indexMarker('index_marker_2', 864, 416),
    indexMarker('index_marker_3', 992, 416),
    indexMarker('index_marker_4', 1120, 416),
  ],
};
