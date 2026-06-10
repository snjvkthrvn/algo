import { describe, expect, it } from 'vitest';
import {
  TWIN_RIVERS_CONFIG,
  TWIN_RIVERS_ROUTE_RECTS,
  TWIN_RIVERS_STONES_RECT,
  isTwinRiversStepWalkable,
  isPointOnTwinRiversRoute,
  TWIN_RIVERS_PARTICLE_CONFIG,
} from './twinRivers';

describe('TWIN_RIVERS_CONFIG', () => {
  it('defines a routed region reached from Array Plains', () => {
    expect(TWIN_RIVERS_CONFIG).toMatchObject({
      id: 'twin_rivers',
      displayName: 'Twin Rivers',
      backgroundMusic: 'prologue-bgm',
      spawnPoint: { x: 160, y: 624 },
    });

    expect(TWIN_RIVERS_CONFIG.exitPoints).toEqual([
      expect.objectContaining({
        id: 'array_plains_gateway',
        leadsTo: 'array_plains',
        position: { x: 88, y: 624 },
      }),
      expect.objectContaining({
        id: 'hash_highlands_gateway',
        leadsTo: 'hash_highlands',
        position: { x: 1760, y: 470 },
      }),
    ]);
  });

  it('keeps spawn, exits, guide, and puzzle stops on the route', () => {
    expect(isPointOnTwinRiversRoute(TWIN_RIVERS_CONFIG.spawnPoint), 'spawn').toBe(true);

    for (const exit of TWIN_RIVERS_CONFIG.exitPoints) {
      expect(isPointOnTwinRiversRoute(exit.position), exit.id).toBe(true);
    }

    for (const npc of TWIN_RIVERS_CONFIG.npcs) {
      expect(isPointOnTwinRiversRoute(npc.position), npc.id).toBe(true);
    }

    for (const puzzle of TWIN_RIVERS_CONFIG.puzzles) {
      expect(isPointOnTwinRiversRoute(puzzle.position), puzzle.id).toBe(true);
    }
  });
});

describe('Twin Rivers route helpers', () => {
  it('exposes the living-map lanes: three bands, the bridge, loops, and the cove', () => {
    expect(TWIN_RIVERS_ROUTE_RECTS.map((rect) => rect.id)).toEqual([
      'entry_arch',
      'west_path',
      'central_band',
      'bridge_walk',
      'north_bank',
      'mirror_court',
      'west_connector',
      'island_court',
      'east_path',
      'rapids_walk',
      'boss_approach',
      'south_west_path',
      'south_loop',
      'dock_village',
      'east_loop',
      'cove_trail',
      'fisher_cove',
    ]);

    // On-route: bridge walk, mirror court, dock village, south loop.
    expect(isPointOnTwinRiversRoute({ x: 950, y: 400 })).toBe(true);
    expect(isPointOnTwinRiversRoute({ x: 440, y: 250 })).toBe(true);
    expect(isPointOnTwinRiversRoute({ x: 760, y: 1052 })).toBe(true);
    expect(isPointOnTwinRiversRoute({ x: 1500, y: 1200 })).toBe(true);

    // Off-route: open water on both rivers and the far corner.
    expect(isPointOnTwinRiversRoute({ x: 600, y: 450 })).toBe(false);
    expect(isPointOnTwinRiversRoute({ x: 1250, y: 880 })).toBe(false);
    expect(isPointOnTwinRiversRoute({ x: 40, y: 1400 })).toBe(false);
  });

  it('keeps the stepping stones OFF the default route (two-pointer mastery unlocks them)', () => {
    const center = {
      x: TWIN_RIVERS_STONES_RECT.x + TWIN_RIVERS_STONES_RECT.width / 2,
      y: TWIN_RIVERS_STONES_RECT.y + TWIN_RIVERS_STONES_RECT.height / 2,
    };
    expect(isPointOnTwinRiversRoute(center)).toBe(false);
  });

  it('blocks object footprints while preserving adjacent interaction tiles', () => {
    expect(isTwinRiversStepWalkable(
      { x: 544, y: 640 },
      [{ x: 544, y: 640 }]
    )).toBe(false);

    expect(isTwinRiversStepWalkable(
      { x: 576, y: 640 },
      [{ x: 544, y: 640 }]
    )).toBe(true);
  });
});

describe('Twin Rivers particles', () => {
  it('exports river flow particle configuration', () => {
    expect(TWIN_RIVERS_PARTICLE_CONFIG).toMatchObject({
      density: expect.any(Number),
      speed: expect.any(Number),
      color: expect.any(String),
    });
  });
});
