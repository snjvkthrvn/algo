import { describe, expect, it } from 'vitest';
import { moveMenuSelection } from './MenuNavigation';

describe('menu keyboard navigation', () => {
  it('wraps selection when moving past either end', () => {
    expect(moveMenuSelection(0, -1, 3)).toBe(2);
    expect(moveMenuSelection(2, 1, 3)).toBe(0);
  });

  it('keeps selection at zero when no menu items exist', () => {
    expect(moveMenuSelection(0, 1, 0)).toBe(0);
  });
});
