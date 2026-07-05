import { describe, expect, it } from 'vitest';
import { ACTOR_DEPTH_MAX, ACTOR_DEPTH_MIN, worldDepthForY } from './actorDepth';

describe('worldDepthForY', () => {
  it('maps the world span onto the 3..5 actor band', () => {
    expect(worldDepthForY(0, 1440)).toBe(ACTOR_DEPTH_MIN);
    expect(worldDepthForY(1440, 1440)).toBe(ACTOR_DEPTH_MAX);
    expect(worldDepthForY(720, 1440)).toBe(4);
  });

  it('is monotonic: lower on screen renders in front', () => {
    expect(worldDepthForY(900, 1440)).toBeGreaterThan(worldDepthForY(300, 1440));
  });

  it('clamps out-of-world baselines and survives a zero height', () => {
    expect(worldDepthForY(-50, 1440)).toBe(ACTOR_DEPTH_MIN);
    expect(worldDepthForY(2000, 1440)).toBe(ACTOR_DEPTH_MAX);
    expect(worldDepthForY(10, 0)).toBe(ACTOR_DEPTH_MAX);
  });
});
