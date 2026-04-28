import { describe, expect, it } from 'vitest';
import {
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
      spawnPoint: { x: 192, y: 448 },
    });

    expect(ARRAY_PLAINS_CONFIG.exitPoints).toEqual([
      expect.objectContaining({
        id: 'prologue_gateway',
        leadsTo: 'prologue',
        position: { x: 112, y: 448 },
      }),
    ]);
  });

  it('keeps the spawn, return gateway, guide, and first marker on walkable route', () => {
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
  });
});

describe('Array Plains route helpers', () => {
  it('exposes a bounded route with off-route plains still blocked', () => {
    expect(ARRAY_PLAINS_ROUTE_RECTS.map((rect) => rect.id)).toEqual([
      'entry_lane',
      'index_walk',
      'guide_clearing',
      'return_lane',
    ]);

    expect(isPointOnArrayPlainsRoute({ x: 512, y: 448 })).toBe(true);
    expect(isPointOnArrayPlainsRoute({ x: 512, y: 96 })).toBe(false);
  });

  it('blocks movement into registered object positions', () => {
    expect(isArrayPlainsStepWalkable(
      { x: 128, y: 448 },
      [{ x: 112, y: 448 }]
    )).toBe(true);

    expect(isArrayPlainsStepWalkable(
      { x: 608, y: 416 },
      [{ x: 608, y: 416 }]
    )).toBe(false);

    expect(isArrayPlainsStepWalkable(
      { x: 640, y: 416 },
      [{ x: 608, y: 416 }]
    )).toBe(true);
  });
});
