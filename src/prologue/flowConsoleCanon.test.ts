import { describe, expect, it } from 'vitest';
import { FLOW_CONSOLE_CANON } from './flowConsoleCanon';

describe('flowConsoleCanon', () => {
  it('defines exactly three entries matching the P0-2 visual design', () => {
    expect(FLOW_CONSOLE_CANON.map((e) => e.id)).toEqual([
      'triangle_red',
      'diamond_blue',
      'circle_green',
    ]);
  });

  it('each entry has the correct shape-to-color pairing', () => {
    const canon = FLOW_CONSOLE_CANON;
    expect(canon[0].shape).toBe('triangle');
    expect(canon[0].colorName).toBe('red');
    expect(canon[1].shape).toBe('diamond');
    expect(canon[1].colorName).toBe('blue');
    expect(canon[2].shape).toBe('circle');
    expect(canon[2].colorName).toBe('green');
  });

  it('colorValues are the canonical hex colors for their named colors', () => {
    expect(FLOW_CONSOLE_CANON[0].colorValue).toBe(0xef4444); // red
    expect(FLOW_CONSOLE_CANON[1].colorValue).toBe(0x3b82f6); // blue
    expect(FLOW_CONSOLE_CANON[2].colorValue).toBe(0x22c55e); // green
  });
});
