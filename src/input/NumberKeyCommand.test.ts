import { describe, expect, it } from 'vitest';
import { numberKeyToIndex } from './NumberKeyCommand';

describe('number key commands', () => {
  it('maps number keys to zero-based command indices', () => {
    expect(numberKeyToIndex('1', 6)).toBe(0);
    expect(numberKeyToIndex('6', 6)).toBe(5);
  });

  it('ignores non-number and out-of-range keys', () => {
    expect(numberKeyToIndex('0', 6)).toBeNull();
    expect(numberKeyToIndex('7', 6)).toBeNull();
    expect(numberKeyToIndex('ArrowRight', 6)).toBeNull();
  });
});
