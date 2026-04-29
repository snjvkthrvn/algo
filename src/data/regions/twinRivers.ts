import type { RegionConfig } from '../types';
import { REGIONS } from '../../config/constants';

export const TWIN_RIVERS_WORLD_WIDTH = 1920;
export const TWIN_RIVERS_WORLD_HEIGHT = 720;

export interface TwinRiversRouteRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const TWIN_RIVERS_ROUTE_RECTS: TwinRiversRouteRect[] = [
  { id: 'entry_bank', x: 80, y: 392, width: 360, height: 112 },
  { id: 'lower_riverbank', x: 400, y: 424, width: 1120, height: 96 },
  { id: 'upper_riverbank', x: 400, y: 248, width: 1120, height: 96 },
  { id: 'bridge_crossing', x: 792, y: 320, width: 224, height: 128 },
  { id: 'future_gate_lane', x: 1488, y: 352, width: 312, height: 144 },
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
  spawnPoint: { x: 192, y: 448 },
  exitPoints: [
    {
      id: 'array_plains_gateway',
      position: { x: 112, y: 448 },
      leadsTo: REGIONS.ARRAY_PLAINS,
      requiresUnlock: false,
    },
    {
      id: 'hash_highlands_gateway',
      position: { x: 1784, y: 416 },
      leadsTo: REGIONS.HASH_HIGHLANDS,
      requiresUnlock: false,
    },
  ],
  npcs: [
    { id: 'river_guide', position: { x: 904, y: 320 }, enabled: true },
  ],
  puzzles: [],
  interactables: [],
};
