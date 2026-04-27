/**
 * Prologue region configuration: Chamber of Flow.
 */

import type { RegionConfig } from '../types';
import { PROLOGUE_REWORK_KEYS } from '../../config/assets';
import {
  isNearPrologueTileRoute,
  isPointOnPrologueTileRoute,
} from './prologueTilemap';

export interface PlatformTile {
  dx: number;
  dy: number;
  frame: number;
}

export interface PlatformCluster {
  id: string;
  label: string;
  origin: { x: number; y: number };
  tiles: PlatformTile[];
  footprint: { x: number; y: number; width: number; height: number };
}

export interface PrologueRouteLandmark {
  id: string;
  label: string;
  imageKey: string;
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  depth: number;
  rotation?: number;
}

const spawnOrigin = { x: 320, y: 400 };
const hubOrigin = { x: 900, y: 395 };
const northOrigin = { x: 900, y: 165 };
const southOrigin = { x: 900, y: 625 };
const courtyardOrigin = { x: 1900, y: 395 };

export const PROLOGUE_ROUTE_LANDMARKS: PrologueRouteLandmark[] = [
  {
    id: 'spawn_shrine',
    label: 'Spawn Shrine',
    imageKey: PROLOGUE_REWORK_KEYS.SPAWN_SHRINE,
    x: spawnOrigin.x,
    y: spawnOrigin.y,
    displayWidth: 196,
    displayHeight: 110,
    depth: 2,
  },
  {
    id: 'central_hub_shrine',
    label: 'Central Hub Shrine',
    imageKey: PROLOGUE_REWORK_KEYS.CENTRAL_HUB_SHRINE,
    x: hubOrigin.x,
    y: hubOrigin.y,
    displayWidth: 240,
    displayHeight: 173,
    depth: 2,
  },
  {
    id: 'rune_landmark',
    label: 'Rune Landmark',
    imageKey: PROLOGUE_REWORK_KEYS.RUNE_BRANCH,
    x: northOrigin.x,
    y: northOrigin.y,
    displayWidth: 220,
    displayHeight: 252,
    depth: 2,
  },
  {
    id: 'console_landmark',
    label: 'Console Landmark',
    imageKey: PROLOGUE_REWORK_KEYS.CONSOLE_BRANCH,
    x: southOrigin.x,
    y: southOrigin.y,
    displayWidth: 268,
    displayHeight: 190,
    depth: 2,
  },
  {
    id: 'gate_landmark',
    label: 'Gate Landmark',
    imageKey: PROLOGUE_REWORK_KEYS.GATE_COURTYARD,
    x: courtyardOrigin.x,
    y: courtyardOrigin.y,
    displayWidth: 420,
    displayHeight: 328,
    depth: 2,
  },
];

export const isPointOnPrologueRoute = (
  point: { x: number; y: number },
  padding = 0
): boolean => isPointOnPrologueTileRoute(point, padding);

export const isNearPrologueRoute = (
  point: { x: number; y: number },
  padding = 96
): boolean => isNearPrologueTileRoute(point, padding);

export const PROLOGUE_CONFIG: RegionConfig = {
  id: 'prologue',
  name: 'prologue',
  displayName: 'Chamber of Flow',
  description: 'A crystalline void-space where ancient algorithms once flowed freely.',
  theme: {
    primaryColor: '#06b6d4',
    secondaryColor: '#8b5cf6',
    accentColor: '#fbbf24',
    atmosphere: 'mysterious, contemplative, cosmic',
    visualStyle: 'floating pixel-art platforms over void',
  },
  unlockRequirements: {},
  backgroundMusic: 'prologue-bgm',
  spawnPoint: spawnOrigin,
  exitPoints: [
    {
      id: 'boss_gate',
      position: { x: 1830, y: 395 },
      leadsTo: 'boss_sentinel',
      requiresUnlock: true,
      unlockCondition: 'boss_gate_open',
    },
    {
      id: 'array_plains_gateway',
      position: { x: 2000, y: 395 },
      leadsTo: 'array_plains',
      requiresUnlock: true,
      unlockCondition: 'gateway_open',
    },
  ],
  npcs: [
    { id: 'professor_node', position: hubOrigin, enabled: true },
    { id: 'rune_keeper', position: northOrigin, enabled: true },
    { id: 'console_keeper', position: southOrigin, enabled: true },
  ],
  puzzles: [
    { id: 'p0_1', position: { x: 900, y: 135 }, enabled: true },
    { id: 'p0_2', position: { x: 900, y: 650 }, enabled: true },
  ],
  interactables: [],
};
