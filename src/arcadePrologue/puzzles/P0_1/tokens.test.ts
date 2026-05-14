import { describe, expect, it } from 'vitest';
import { SCALE, STAGE } from './tokens';

describe('arcade prologue visual tokens', () => {
  it('maps the imported base layout to Algorithmia 1280x720 stage', () => {
    expect(SCALE).toBe(1280 / 960);
    expect(STAGE).toEqual({ width: 1280, height: 720 });
  });
});
