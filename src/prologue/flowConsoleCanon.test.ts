import { describe, expect, it } from 'vitest';
import {
  FLOW_CONSOLE_CANON,
  getFlowConsoleKey,
  isCorrectFlowConsoleMatch,
} from './flowConsoleCanon';

describe('flowConsoleCanon', () => {
  it('uses the exact script mapping for P0-2', () => {
    expect(FLOW_CONSOLE_CANON.map((entry) => entry.id)).toEqual([
      'triangle_double_red',
      'diamond_single_blue',
      'circle_triple_green',
    ]);
  });

  it('builds keys from shape and stripe count, not the old solid-striped-dotted model', () => {
    expect(getFlowConsoleKey({ shape: 'triangle', stripes: 'double' })).toBe('triangle_double');
    expect(getFlowConsoleKey({ shape: 'diamond', stripes: 'single' })).toBe('diamond_single');
  });

  it('accepts only exact shape and stripe matches', () => {
    expect(
      isCorrectFlowConsoleMatch(
        { shape: 'circle', stripes: 'triple' },
        FLOW_CONSOLE_CANON[2],
      ),
    ).toBe(true);

    expect(
      isCorrectFlowConsoleMatch(
        { shape: 'circle', stripes: 'single' },
        FLOW_CONSOLE_CANON[2],
      ),
    ).toBe(false);
  });
});
