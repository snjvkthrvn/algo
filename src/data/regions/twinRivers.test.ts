import { describe, expect, it } from 'vitest';
import {
  TWIN_RIVERS_CONFIG,
  TWIN_RIVERS_ROUTE_RECTS,
  isTwinRiversStepWalkable,
  isPointOnTwinRiversRoute,
} from './twinRivers';

describe('TWIN_RIVERS_CONFIG', () => {
  it('defines a routed future region reached from Array Plains', () => {
    expect(TWIN_RIVERS_CONFIG).toMatchObject({
      id: 'twin_rivers',
      displayName: 'Twin Rivers',
      backgroundMusic: 'prologue-bgm',
      spawnPoint: { x: 192, y: 384 },
    });

    expect(TWIN_RIVERS_CONFIG.exitPoints).toEqual([
      expect.objectContaining({
        id: 'array_plains_gateway',
        leadsTo: 'array_plains',
        position: { x: 128, y: 384 },
      }),
      expect.objectContaining({
        id: 'hash_highlands_gateway',
        leadsTo: 'hash_highlands',
        position: { x: 1784, y: 384 },
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
  it('exposes two banks plus a bridge crossing', () => {
    expect(TWIN_RIVERS_ROUTE_RECTS.map((rect) => rect.id)).toEqual([
      'entry_bank',
      'lower_riverbank',
      'upper_riverbank',
      'bridge_crossing',
      'future_gate_lane',
      'sequence_puzzle',
    ]);

    expect(isPointOnTwinRiversRoute({ x: 900, y: 384 })).toBe(true);
    expect(isPointOnTwinRiversRoute({ x: 900, y: 224 })).toBe(true);
    expect(isPointOnTwinRiversRoute({ x: 900, y: 120 })).toBe(false);
  });

  it('blocks object footprints while preserving adjacent interaction tiles', () => {
    expect(isTwinRiversStepWalkable(
      { x: 544, y: 384 },
      [{ x: 544, y: 384 }]
    )).toBe(false);

    expect(isTwinRiversStepWalkable(
      { x: 576, y: 384 },
      [{ x: 544, y: 384 }]
    )).toBe(true);
  });
});
