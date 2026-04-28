import { describe, expect, it } from 'vitest';
import { REGIONS, SCENE_KEYS } from './constants';

describe('region and scene keys', () => {
  it('registers Array Plains as a real scene target', () => {
    expect(REGIONS.ARRAY_PLAINS).toBe('array_plains');
    expect(SCENE_KEYS.ARRAY_PLAINS).toBe('ArrayPlainsScene');
  });
});
