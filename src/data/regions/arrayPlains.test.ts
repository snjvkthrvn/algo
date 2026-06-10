import { describe, expect, it } from 'vitest';
import {
  ARRAY_PLAINS_BRIDGE_RECT,
  ARRAY_PLAINS_CONFIG,
  ARRAY_PLAINS_ROUTE_RECTS,
  isArrayPlainsStepWalkable,
  isPointOnArrayPlainsRoute,
} from './arrayPlains';

describe('ARRAY_PLAINS_CONFIG', () => {
  it('defines a playable starter region reached from the prologue gateway', () => {
    expect(ARRAY_PLAINS_CONFIG).toMatchObject({
      id: 'array_plains',
      displayName: 'Array Plains',
      backgroundMusic: 'prologue-bgm',
      spawnPoint: { x: 168, y: 664 },
    });

    expect(ARRAY_PLAINS_CONFIG.exitPoints).toEqual([
      expect.objectContaining({
        id: 'prologue_gateway',
        leadsTo: 'prologue',
        position: { x: 88, y: 664 },
      }),
      expect.objectContaining({
        id: 'twin_rivers_gateway',
        leadsTo: 'twin_rivers',
        position: { x: 1736, y: 664 },
        unlockCondition: 'twin_rivers_gateway_open',
      }),
    ]);

    expect(ARRAY_PLAINS_CONFIG.puzzles.map((puzzle) => puzzle.id)).toEqual([
      'ap_1',
      'ap_2',
      'ap_3',
      'ap_4',
      'boss_shuffler',
    ]);
  });

  it('keeps the spawn, exits, NPCs, markers, and puzzle stops on walkable route', () => {
    expect(isPointOnArrayPlainsRoute(ARRAY_PLAINS_CONFIG.spawnPoint), 'spawn').toBe(true);

    for (const exit of ARRAY_PLAINS_CONFIG.exitPoints) {
      expect(isPointOnArrayPlainsRoute(exit.position), exit.id).toBe(true);
    }

    for (const npc of ARRAY_PLAINS_CONFIG.npcs) {
      expect(isPointOnArrayPlainsRoute(npc.position), npc.id).toBe(true);
    }

    for (const interactable of ARRAY_PLAINS_CONFIG.interactables) {
      expect(isPointOnArrayPlainsRoute(interactable.position), interactable.id).toBe(true);
    }

    for (const puzzle of ARRAY_PLAINS_CONFIG.puzzles) {
      expect(isPointOnArrayPlainsRoute(puzzle.position), puzzle.id).toBe(true);
    }
  });
});

describe('Array Plains route helpers', () => {
  it('exposes the living-map lanes: main road, both loops, spurs, and the secret grove', () => {
    expect(ARRAY_PLAINS_ROUTE_RECTS.map((rect) => rect.id)).toEqual([
      'main_road',
      'north_road',
      'barn_yard',
      'shed_branch',
      'shed_yard',
      'grove_trail',
      'grove_clearing',
      'south_west_road',
      'south_road',
      'south_east_road',
      'farm_yard',
      'hopper_road',
      'hopper_yard',
      'pairing_road',
      'pairing_field',
    ]);

    // On-route: the main road, the barn yard, the hopper yard, the grove.
    expect(isPointOnArrayPlainsRoute({ x: 512, y: 664 })).toBe(true);
    expect(isPointOnArrayPlainsRoute({ x: 948, y: 372 })).toBe(true);
    expect(isPointOnArrayPlainsRoute({ x: 268, y: 980 })).toBe(true);
    expect(isPointOnArrayPlainsRoute({ x: 1492, y: 220 })).toBe(true);

    // Off-route: open wheat, the pond water, and the far corner.
    expect(isPointOnArrayPlainsRoute({ x: 512, y: 96 })).toBe(false);
    expect(isPointOnArrayPlainsRoute({ x: 960, y: 960 })).toBe(false);
    expect(isPointOnArrayPlainsRoute({ x: 60, y: 1380 })).toBe(false);
  });

  it('keeps the broken-bridge crossing OFF the default route (mastery unlocks it)', () => {
    const center = {
      x: ARRAY_PLAINS_BRIDGE_RECT.x + ARRAY_PLAINS_BRIDGE_RECT.width / 2,
      y: ARRAY_PLAINS_BRIDGE_RECT.y + ARRAY_PLAINS_BRIDGE_RECT.height / 2,
    };
    expect(isPointOnArrayPlainsRoute(center)).toBe(false);
  });

  it('blocks movement into registered object positions', () => {
    expect(isArrayPlainsStepWalkable(
      { x: 192, y: 664 },
      [{ x: 160, y: 664 }]
    )).toBe(true);

    expect(isArrayPlainsStepWalkable(
      { x: 640, y: 664 },
      [{ x: 640, y: 664 }]
    )).toBe(false);

    expect(isArrayPlainsStepWalkable(
      { x: 672, y: 664 },
      [{ x: 640, y: 664 }]
    )).toBe(true);
  });
});
