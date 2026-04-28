import { describe, expect, it } from 'vitest';
import { PROLOGUE_REWORK_KEYS } from '../../config/assets';
import {
  isNearPrologueTileRoute,
  isPointOnPrologueTileRoute,
} from './prologueTilemap';
import * as prologueRegion from './prologue';
import {
  PROLOGUE_CONFIG,
  PROLOGUE_ROUTE_LANDMARKS,
  isNearPrologueRoute,
  isPointOnPrologueRoute,
} from './prologue';

const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 720;
describe('module surface', () => {
  it('does not export legacy duplicate spatial models', () => {
    expect(prologueRegion).not.toHaveProperty('PROLOGUE_CLUSTERS');
    expect(prologueRegion).not.toHaveProperty('PROLOGUE_PLATFORMS');
    expect(prologueRegion).not.toHaveProperty('PROLOGUE_ROUTE_FOOTPRINTS');
  });
});

describe('PROLOGUE_CONFIG', () => {
  it('does not include dead tilemap metadata', () => {
    expect(PROLOGUE_CONFIG).not.toHaveProperty('tilemapKey');
  });

  it('places spawn, NPCs, puzzles, and exits on the authoritative tilemap route', () => {
    expect(isPointOnPrologueTileRoute(PROLOGUE_CONFIG.spawnPoint), 'spawn').toBe(true);

    for (const npc of PROLOGUE_CONFIG.npcs) {
      expect(isPointOnPrologueTileRoute(npc.position), npc.id).toBe(true);
    }

    for (const puzzle of PROLOGUE_CONFIG.puzzles) {
      expect(isPointOnPrologueTileRoute(puzzle.position), puzzle.id).toBe(true);
    }

    for (const exit of PROLOGUE_CONFIG.exitPoints) {
      expect(isPointOnPrologueTileRoute(exit.position), exit.id).toBe(true);
    }
  });
});

describe('PROLOGUE_ROUTE_LANDMARKS', () => {
  it('contains only the five hero landmarks in route order', () => {
    expect(PROLOGUE_ROUTE_LANDMARKS.map((landmark) => landmark.id)).toEqual([
      'spawn_shrine',
      'central_hub_shrine',
      'rune_landmark',
      'console_landmark',
      'gate_landmark',
    ]);
  });

  it('maps each hero landmark to the current hero environment art', () => {
    expect(
      Object.fromEntries(
        PROLOGUE_ROUTE_LANDMARKS.map((landmark) => [landmark.id, landmark.imageKey])
      )
    ).toEqual({
      spawn_shrine: PROLOGUE_REWORK_KEYS.SPAWN_SHRINE,
      central_hub_shrine: PROLOGUE_REWORK_KEYS.CENTRAL_HUB_SHRINE,
      rune_landmark: PROLOGUE_REWORK_KEYS.RUNE_BRANCH,
      console_landmark: PROLOGUE_REWORK_KEYS.CONSOLE_BRANCH,
      gate_landmark: PROLOGUE_REWORK_KEYS.GATE_COURTYARD,
    });
  });

  it('keeps every visible landmark inside the world bounds', () => {
    for (const landmark of PROLOGUE_ROUTE_LANDMARKS) {
      const left = landmark.x - landmark.displayWidth / 2;
      const right = landmark.x + landmark.displayWidth / 2;
      const top = landmark.y - landmark.displayHeight / 2;
      const bottom = landmark.y + landmark.displayHeight / 2;

      expect(left, `${landmark.id} left`).toBeGreaterThanOrEqual(0);
      expect(right, `${landmark.id} right`).toBeLessThanOrEqual(WORLD_WIDTH);
      expect(top, `${landmark.id} top`).toBeGreaterThanOrEqual(0);
      expect(bottom, `${landmark.id} bottom`).toBeLessThanOrEqual(WORLD_HEIGHT);
    }
  });

  it('keeps every hero landmark centered on the tilemap route', () => {
    for (const landmark of PROLOGUE_ROUTE_LANDMARKS) {
      expect(isPointOnPrologueTileRoute({ x: landmark.x, y: landmark.y }), landmark.id).toBe(true);
    }
  });
});

describe('prologue route helpers', () => {
  it('stay aligned with the authoritative tilemap route helpers', () => {
    for (const point of [
      { x: 320, y: 400 },
      { x: 900, y: 395 },
      { x: 40, y: 40 },
      { x: 2002, y: 31 },
    ]) {
      expect(isPointOnPrologueRoute(point), `${point.x},${point.y} on-route`).toBe(
        isPointOnPrologueTileRoute(point)
      );
      expect(isNearPrologueRoute(point), `${point.x},${point.y} near-route`).toBe(
        isNearPrologueTileRoute(point, 96)
      );
    }
  });

  it('distinguishes route positions from far void positions', () => {
    expect(isPointOnPrologueRoute({ x: 320, y: 400 })).toBe(true);
    expect(isPointOnPrologueRoute({ x: 40, y: 40 })).toBe(false);
    expect(isNearPrologueRoute({ x: 350, y: 310 })).toBe(true);
    expect(isNearPrologueRoute({ x: 40, y: 40 })).toBe(false);
    expect(isNearPrologueRoute({ x: 2002, y: 31 })).toBe(false);
  });
});

describe('Array Plains return spawn', () => {
  it('return point (1968, 395) is on the Prologue route', () => {
    expect(isPointOnPrologueTileRoute({ x: 1968, y: 395 })).toBe(true);
  });
});
