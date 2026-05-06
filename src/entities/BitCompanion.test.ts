import { describe, expect, it } from 'vitest';
import { BitStage } from '../data/types';
import { normalizeBitStage } from './BitCompanion';

describe('normalizeBitStage', () => {
  it('keeps known Bit stages unchanged', () => {
    expect(normalizeBitStage(BitStage.SPARK)).toBe(BitStage.SPARK);
    expect(normalizeBitStage(BitStage.CORE)).toBe(BitStage.CORE);
  });

  it('falls back safely for unknown saved stages', () => {
    expect(normalizeBitStage('queue')).toBe(BitStage.GRAPH);
    expect(normalizeBitStage(undefined)).toBe(BitStage.GRAPH);
  });
});
