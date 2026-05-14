/** Persistent preferences for P0_1. One key, one concern. */

const KEY_REDUCE_MOTION = 'p0_1_reduce_motion';

export function readReduceMotion(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY_REDUCE_MOTION) === '1';
  } catch {
    return false;
  }
}

export function writeReduceMotion(value: boolean): void {
  try {
    globalThis.localStorage?.setItem(KEY_REDUCE_MOTION, value ? '1' : '0');
  } catch {
    /* ignore storage errors */
  }
}
