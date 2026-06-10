/**
 * Dev-only URL scene warp: `?scene=<key>` on boot jumps straight to a
 * whitelisted scene. Gated on the build flag so production bundles can
 * never warp, and whitelisted so arbitrary scene keys are ignored.
 */

import { SCENE_KEYS } from '../../config/constants';

export const WARP_SCENE_KEYS: ReadonlyArray<string> = [
  SCENE_KEYS.MOVEMENT_GYM,
  SCENE_KEYS.DEBUG_SELECT,
];

export function resolveSceneWarp(
  search: string,
  isDev: boolean,
  whitelist: ReadonlyArray<string> = WARP_SCENE_KEYS,
): string | null {
  if (!isDev) return null;
  const requested = new URLSearchParams(search).get('scene');
  if (!requested) return null;
  return whitelist.includes(requested) ? requested : null;
}
