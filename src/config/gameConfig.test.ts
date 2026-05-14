import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
const configDir = dirname(fileURLToPath(import.meta.url));

function readGameConfigSource(): string {
  return readFileSync(resolve(configDir, 'gameConfig.ts'), 'utf8');
}

describe('gameConfig prologue puzzle replacement', () => {
  it('keeps the supported 1280x720 game stage and existing prologue scene slots', () => {
    const source = readGameConfigSource();

    expect(source).not.toContain("import { STAGE } from '../arcadePrologue/puzzles/P0_1/tokens'");
    expect(source).toContain('const BASE_WIDTH = 1280');
    expect(source).toContain('const BASE_HEIGHT = 720');
    expect(source).toContain('width: BASE_WIDTH');
    expect(source).toContain('height: BASE_HEIGHT');
    expect(source).not.toContain('resolution:');
    expect(source).toContain('P0_1_FollowThePath');
    expect(source).toContain('P0_2_FlowConsoles');
    expect(source).toContain('Boss_Sentinel');
    expect(source).not.toContain('ArcadePrologueTitleScene');
    expect(source).not.toContain('ArcadeFollowThePathScene');
    expect(source).not.toContain('ArcadeLitanyScene');
  });
});
