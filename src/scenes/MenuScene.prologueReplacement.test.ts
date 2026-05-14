import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sceneDir = dirname(fileURLToPath(import.meta.url));

function readMenuSceneSource(): string {
  return readFileSync(resolve(sceneDir, 'MenuScene.ts'), 'utf8');
}

describe('MenuScene prologue puzzle replacement', () => {
  it('does not expose the imported puzzles as a separate arcade mode', () => {
    const source = readMenuSceneSource();

    expect(source).not.toContain("text: 'ARCADE PUZZLES'");
    expect(source).not.toContain('startArcadePrologue');
    expect(source).not.toContain('SCENE_KEYS.ARCADE_PROLOGUE_TITLE');
  });
});
