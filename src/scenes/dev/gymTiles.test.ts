import { describe, expect, it } from 'vitest';
import { GYM_TILE, pickGymTile, type GymTilePlan } from './gymTiles';

const plan: GymTilePlan = {
  cols: 80,
  rows: 45,
  spawn: { x: 40, y: 22 },
  blocks: [{ x0: 20, y0: 15, x1: 23, y1: 18 }],
  runway: { y: 22, x0: 50, x1: 70 },
};

describe('pickGymTile', () => {
  it('rings the room with the wall 9-slice', () => {
    expect(pickGymTile(0, 0, plan)).toBe(GYM_TILE.WALL_TL);
    expect(pickGymTile(79, 0, plan)).toBe(GYM_TILE.WALL_TR);
    expect(pickGymTile(0, 44, plan)).toBe(GYM_TILE.WALL_BL);
    expect(pickGymTile(79, 44, plan)).toBe(GYM_TILE.WALL_BR);
    expect(pickGymTile(40, 0, plan)).toBe(GYM_TILE.WALL_TOP);
    expect(pickGymTile(40, 44, plan)).toBe(GYM_TILE.WALL_BOTTOM);
    expect(pickGymTile(0, 20, plan)).toBe(GYM_TILE.WALL_LEFT);
    expect(pickGymTile(79, 20, plan)).toBe(GYM_TILE.WALL_RIGHT);
  });

  it('fills collision blocks with block tiles', () => {
    for (let ty = 15; ty <= 18; ty++) {
      for (let tx = 20; tx <= 23; tx++) {
        expect([GYM_TILE.BLOCK, GYM_TILE.BLOCK_CRACKED]).toContain(
          pickGymTile(tx, ty, plan),
        );
      }
    }
  });

  it('marks spawn and runway tiles', () => {
    expect(pickGymTile(40, 22, plan)).toBe(GYM_TILE.FLOOR_SPAWN);
    expect(pickGymTile(50, 22, plan)).toBe(GYM_TILE.RUNWAY_H);
    expect(pickGymTile(70, 22, plan)).toBe(GYM_TILE.RUNWAY_H);
    expect(pickGymTile(71, 22, plan)).not.toBe(GYM_TILE.RUNWAY_H);
  });

  it('keeps open floor within the floor tile family and is deterministic', () => {
    const floorFamily = [
      GYM_TILE.FLOOR_A,
      GYM_TILE.FLOOR_B,
      GYM_TILE.FLOOR_SCUFFED,
      GYM_TILE.FLOOR_CRACKED,
      GYM_TILE.FLOOR_GRID,
    ];
    for (let ty = 1; ty < 44; ty++) {
      for (let tx = 1; tx < 79; tx++) {
        const first = pickGymTile(tx, ty, plan);
        expect(pickGymTile(tx, ty, plan)).toBe(first);
        const inBlock = tx >= 20 && tx <= 23 && ty >= 15 && ty <= 18;
        const special =
          (tx === 40 && ty === 22) || (ty === 22 && tx >= 50 && tx <= 70);
        if (!inBlock && !special) {
          expect(floorFamily).toContain(first);
        }
      }
    }
  });
});
