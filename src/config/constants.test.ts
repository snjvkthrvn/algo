import { describe, expect, it } from 'vitest';
import { REGION_ORDER, REGIONS, SCENE_BY_REGION, SCENE_KEYS } from './constants';

describe('region and scene keys', () => {
  it('registers Array Plains as a real scene target', () => {
    expect(REGIONS.ARRAY_PLAINS).toBe('array_plains');
    expect(SCENE_KEYS.ARRAY_PLAINS).toBe('ArrayPlainsScene');
    expect(REGIONS.TWIN_RIVERS).toBe('twin_rivers');
    expect(SCENE_KEYS.TWIN_RIVERS).toBe('TwinRiversScene');
    expect(SCENE_KEYS.HASH_HIGHLANDS).toBe('HashHighlandsScene');
    expect(SCENE_KEYS.CORE).toBe('CoreScene');
  });

  it('maps saved region ids to Phaser scene keys for Continue', () => {
    for (const region of REGION_ORDER) {
      expect(SCENE_BY_REGION[region], region).toBeDefined();
    }
    expect(SCENE_BY_REGION[REGIONS.PROLOGUE]).toBe(SCENE_KEYS.PROLOGUE);
    expect(SCENE_BY_REGION[REGIONS.CORE]).toBe(SCENE_KEYS.CORE);
  });

  it('keeps the story region order routable through the generated visual regions', () => {
    expect(REGION_ORDER).toEqual([
      REGIONS.PROLOGUE,
      REGIONS.ARRAY_PLAINS,
      REGIONS.TWIN_RIVERS,
      REGIONS.HASH_HIGHLANDS,
      REGIONS.STACK_SPIRES,
      REGIONS.QUEUE_CANALS,
      REGIONS.TREE_CANOPY,
      REGIONS.GRAPH_NEXUS,
      REGIONS.CORE,
    ]);
  });
});
