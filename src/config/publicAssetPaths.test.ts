import { existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { AUDIO_ASSETS, IMAGE_ASSETS, SPRITE_ASSETS, TILEMAP_ASSETS } from './assets';

const publicDir = join(process.cwd(), 'public');

describe('manifest asset paths', () => {
  const entries = [...SPRITE_ASSETS, ...IMAGE_ASSETS, ...TILEMAP_ASSETS, ...AUDIO_ASSETS];

  it('every registered file exists under public/', () => {
    for (const { key, path: rel } of entries) {
      const abs = join(publicDir, rel);
      expect(existsSync(abs), `${key} → ${rel}`).toBe(true);
    }
  });
});
