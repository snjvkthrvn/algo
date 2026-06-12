import { describe, expect, it } from 'vitest';
import { SCENE_KEYS } from '../../config/constants';
import { resolveSceneWarp, WARP_SCENE_KEYS } from './sceneWarp';

describe('resolveSceneWarp', () => {
  it('returns a whitelisted scene key in dev builds', () => {
    expect(resolveSceneWarp(`?scene=${SCENE_KEYS.MOVEMENT_GYM}`, true)).toBe(
      SCENE_KEYS.MOVEMENT_GYM,
    );
  });

  it('returns null in production builds even for whitelisted keys', () => {
    expect(resolveSceneWarp(`?scene=${SCENE_KEYS.MOVEMENT_GYM}`, false)).toBeNull();
  });

  it('returns null when no scene param is present', () => {
    expect(resolveSceneWarp('', true)).toBeNull();
    expect(resolveSceneWarp('?foo=bar', true)).toBeNull();
  });

  it('returns null for non-whitelisted scene keys', () => {
    expect(resolveSceneWarp('?scene=ArrayPlainsScene', true)).toBeNull();
    expect(resolveSceneWarp('?scene=<script>', true)).toBeNull();
  });

  it('whitelists only dev-facing scenes', () => {
    expect(WARP_SCENE_KEYS).toContain(SCENE_KEYS.MOVEMENT_GYM);
    expect(WARP_SCENE_KEYS).toContain(SCENE_KEYS.PROLOGUE_TRIAL);
    expect(WARP_SCENE_KEYS).toContain(SCENE_KEYS.DEBUG_SELECT);
    expect(WARP_SCENE_KEYS).toHaveLength(3);
  });
});
