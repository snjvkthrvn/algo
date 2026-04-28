import { describe, expect, it } from 'vitest';
import {
  SEQUENCE_ROUNDS,
  runeIdToTileIndex,
  getShardTarget,
} from './prologuePuzzleLogic';

describe('prologuePuzzleLogic', () => {
  describe('SEQUENCE_ROUNDS', () => {
    it('has exactly three rounds with increasing length', () => {
      expect(SEQUENCE_ROUNDS.length).toBe(3);
      expect(SEQUENCE_ROUNDS[0].length).toBe(3);
      expect(SEQUENCE_ROUNDS[1].length).toBe(5);
      expect(SEQUENCE_ROUNDS[2].length).toBe(7);
    });

    it('all rune IDs are in the rune-1..rune-6 range', () => {
      for (const round of SEQUENCE_ROUNDS) {
        for (const id of round) {
          expect(id).toMatch(/^rune-[1-6]$/);
        }
      }
    });
  });

  describe('runeIdToTileIndex', () => {
    it('converts rune-1 through rune-6 to zero-based tile indices', () => {
      expect(runeIdToTileIndex('rune-1')).toBe(0);
      expect(runeIdToTileIndex('rune-2')).toBe(1);
      expect(runeIdToTileIndex('rune-3')).toBe(2);
      expect(runeIdToTileIndex('rune-4')).toBe(3);
      expect(runeIdToTileIndex('rune-5')).toBe(4);
      expect(runeIdToTileIndex('rune-6')).toBe(5);
    });

    it('clamps out-of-range values to 0..5', () => {
      expect(runeIdToTileIndex('rune-0')).toBe(0);
      expect(runeIdToTileIndex('rune-7')).toBe(5);
    });

    it('returns 0 for malformed ids', () => {
      expect(runeIdToTileIndex('rune')).toBe(0);
      expect(runeIdToTileIndex('')).toBe(0);
      expect(runeIdToTileIndex('tile-1')).toBe(0);
    });
  });

  describe('getShardTarget', () => {
    it('maps each shard shape to the matching console color', () => {
      expect(getShardTarget('triangle')).toBe('red');
      expect(getShardTarget('diamond')).toBe('blue');
      expect(getShardTarget('circle')).toBe('green');
    });

    it('returns null for unknown shard ids', () => {
      expect(getShardTarget('square')).toBeNull();
      expect(getShardTarget('')).toBeNull();
    });
  });
});
