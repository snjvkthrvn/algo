/**
 * Prologue region configuration: Chamber of Flow.
 */

import type { RegionConfig } from '../types';
import { PROLOGUE_REWORK_KEYS } from '../../config/assets';
import {
  isNearPrologueTileRoute,
  isPointOnPrologueTileRoute,
} from './prologueTilemap';
import { PROLOGUE_ANCHORS } from './prologueAnchors';

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

// Player-relevant anchors come from PROLOGUE_ANCHORS so the walkable mask,
// NPC placement, and proximity script triggers share one definition.
// courtyardOrigin is a pure landmark-art position — it sits east of the
// boss gate so the courtyard frames the gate without overlapping it.
const spawnOrigin = PROLOGUE_ANCHORS.spawn.position;
const hubOrigin = PROLOGUE_ANCHORS.centralHub.position;
const northOrigin = PROLOGUE_ANCHORS.runeKeeper.position;
const southOrigin = PROLOGUE_ANCHORS.consoleKeeper.position;
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
      id: PROLOGUE_ANCHORS.bossGate.id,
      position: PROLOGUE_ANCHORS.bossGate.position,
      leadsTo: 'boss_sentinel',
      requiresUnlock: true,
      unlockCondition: 'boss_gate_open',
    },
    {
      id: PROLOGUE_ANCHORS.arrayGateway.id,
      position: PROLOGUE_ANCHORS.arrayGateway.position,
      leadsTo: 'array_plains',
      requiresUnlock: true,
      unlockCondition: 'gateway_open',
    },
  ],
  npcs: [
    { id: PROLOGUE_ANCHORS.professorNode.id, position: PROLOGUE_ANCHORS.professorNode.position, enabled: true },
    { id: PROLOGUE_ANCHORS.runeKeeper.id, position: PROLOGUE_ANCHORS.runeKeeper.position, enabled: true },
    { id: PROLOGUE_ANCHORS.consoleKeeper.id, position: PROLOGUE_ANCHORS.consoleKeeper.position, enabled: true },
  ],
  puzzles: [
    { id: PROLOGUE_ANCHORS.p0_1Trigger.id, position: PROLOGUE_ANCHORS.p0_1Trigger.position, enabled: true },
    { id: PROLOGUE_ANCHORS.p0_2Trigger.id, position: PROLOGUE_ANCHORS.p0_2Trigger.position, enabled: true },
  ],
  interactables: [],
};
