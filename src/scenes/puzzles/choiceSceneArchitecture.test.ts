import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sceneDir = dirname(fileURLToPath(import.meta.url));

const laterChoiceSceneFiles = [
  'TwinRiversChoiceScenes.ts',
  'HashHighlandsChoiceScenes.ts',
  'StackSpiresChoiceScenes.ts',
  'QueueCanalsChoiceScenes.ts',
  'TreeCanopyChoiceScenes.ts',
  'GraphNexusChoiceScenes.ts',
  'CoreChoiceScenes.ts',
];

function readScene(fileName: string): string {
  return readFileSync(resolve(sceneDir, fileName), 'utf8');
}

describe('later-region choice puzzle architecture', () => {
  it('keeps choice input, rendering, hints, scoring, and animation in ScriptedChoiceScene', () => {
    for (const fileName of laterChoiceSceneFiles) {
      const source = readScene(fileName);

      expect(source, `${fileName} should use the shared choice scene`).toContain('ScriptedChoiceScene');
      expect(source, `${fileName} should not own copied option containers`).not.toMatch(/private\s+optionContainer/);
      expect(source, `${fileName} should not copy choice UI creation`).not.toMatch(/private\s+createChoiceUi/);
      expect(source, `${fileName} should not copy round rendering`).not.toMatch(/private\s+renderRound/);
      expect(source, `${fileName} should not copy choice handling`).not.toMatch(/private\s+choose\(/);
    }
  });
});
