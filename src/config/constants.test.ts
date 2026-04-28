import { describe, expect, it } from 'vitest';
import { REGIONS, SCENE_BY_REGION, SCENE_KEYS } from './constants';

describe('region and scene keys', () => {
  it('registers Array Plains as a real scene target', () => {
    expect(REGIONS.ARRAY_PLAINS).toBe('array_plains');
    expect(SCENE_KEYS.ARRAY_PLAINS).toBe('ArrayPlainsScene');
  });

  it('maps saved region ids to Phaser scene keys for Continue', () => {
    expect(SCENE_BY_REGION[REGIONS.PROLOGUE]).toBe(SCENE_KEYS.PROLOGUE);
    expect(SCENE_BY_REGION[REGIONS.ARRAY_PLAINS]).toBe(SCENE_KEYS.ARRAY_PLAINS);
  });
});
