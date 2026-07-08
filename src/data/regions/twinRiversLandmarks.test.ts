import { describe, expect, it } from 'vitest';
import { TR_LANDMARK_KEYS } from '../../config/assets';
import { TR_LANDMARKS } from './twinRiversLandmarks';
import {
  TR_TILE_COLS,
  TR_TILE_ROWS,
  TR_TILE_SIZE,
  buildTwinRiversMaterialGrid,
} from './twinRiversTilemap';

const grid = buildTwinRiversMaterialGrid();

describe('TR_LANDMARKS', () => {
  it('places every landmark base on legal ground for its kind', () => {
    for (const p of TR_LANDMARKS) {
      const tx = Math.floor(p.x / TR_TILE_SIZE);
      const ty = Math.floor((p.baseY - 1) / TR_TILE_SIZE);
      expect(tx).toBeGreaterThanOrEqual(0);
      expect(tx).toBeLessThan(TR_TILE_COLS);
      expect(ty).toBeGreaterThanOrEqual(0);
      expect(ty).toBeLessThan(TR_TILE_ROWS);
      const material = grid[ty][tx];
      const legalByKey: Record<string, string[]> = {
        [TR_LANDMARK_KEYS.TREE_LARGE]: ['grass'],
        [TR_LANDMARK_KEYS.TREE_SMALL]: ['grass'],
        [TR_LANDMARK_KEYS.BUSH]: ['grass'],
        [TR_LANDMARK_KEYS.LANTERN]: ['grass', 'stone'],
        [TR_LANDMARK_KEYS.PILLAR]: ['grass', 'stone'],
        [TR_LANDMARK_KEYS.BRIDGE_TOWER_NORTH]: ['deck', 'path', 'grass'],
        [TR_LANDMARK_KEYS.BRIDGE_TOWER_SOUTH]: ['deck', 'path', 'grass', 'dock'],
        [TR_LANDMARK_KEYS.SERPENT_GATE]: ['water', 'grass', 'path'],
        [TR_LANDMARK_KEYS.CRANE]: ['dock'],
        [TR_LANDMARK_KEYS.DOCKHUT]: ['dock'],
        [TR_LANDMARK_KEYS.BOAT]: ['water'],
        [TR_LANDMARK_KEYS.BOAT2]: ['water'],
        [TR_LANDMARK_KEYS.NETRACK]: ['dock', 'water'],
      };
      const legal = legalByKey[p.key] ?? ['grass'];
      expect(legal, `${p.key} base @${tx},${ty} on ${material}`).toContain(material);
    }
  });

  it('rings the plaza with lanterns and the island with pillars', () => {
    const lanterns = TR_LANDMARKS.filter((p) => p.key === TR_LANDMARK_KEYS.LANTERN);
    const pillars = TR_LANDMARKS.filter((p) => p.key === TR_LANDMARK_KEYS.PILLAR);
    expect(lanterns.length).toBeGreaterThanOrEqual(4);
    expect(pillars.length).toBeGreaterThanOrEqual(4);
    for (const l of lanterns) {
      expect(l.x).toBeGreaterThan(280);
      expect(l.x).toBeLessThan(640);
      expect(l.baseY).toBeLessThan(380);
    }
    for (const p of pillars) {
      expect(p.x).toBeGreaterThan(1140);
      expect(p.x).toBeLessThan(1460);
      expect(p.baseY).toBeLessThan(360);
    }
  });
});
