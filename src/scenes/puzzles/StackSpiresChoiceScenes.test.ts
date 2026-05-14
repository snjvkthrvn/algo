import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const scenePath = resolve(dirname(fileURLToPath(import.meta.url)), 'StackSpiresChoiceScenes.ts');

describe('stack spires puzzle architecture', () => {
  it('implements stack spires as interactive BasePuzzleScene subclasses (not scripted choice)', () => {
    const source = readFileSync(scenePath, 'utf8');

    expect(source).toContain('extends BasePuzzleScene');
    expect(source).not.toContain('ScriptedChoiceScene');
    expect(source).toContain('export class P4_1_ScrollStack');
    expect(source).toContain('export class Boss_Recursion');
  });
});
