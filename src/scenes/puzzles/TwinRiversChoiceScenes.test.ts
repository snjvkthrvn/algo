import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const scenePath = resolve(dirname(fileURLToPath(import.meta.url)), 'TwinRiversChoiceScenes.ts');

describe('Mirror Walk controls', () => {
  it('requires explicit swap, left advance, and right retreat actions', () => {
    const source = readFileSync(scenePath, 'utf8');

    expect(source).toContain('[SPACE] swap  -  [D] move L  -  [J] move R');
    expect(source).toContain('private swappedThisPair = false;');
    expect(source).toContain('private leftAdvancedThisPair = false;');
    expect(source).toContain('private rightRetreatedThisPair = false;');
    expect(source).toContain('private roundCompleting = false;');
    expect(source).toContain('private readonly onSwap');
    expect(source).toContain('private tryMoveLeft(): void');
    expect(source).toContain('private tryMoveRight(): void');
    expect(source).toContain('Swap the mirrored values first.');
    expect(source).toContain("needsRightRetreat ? 'J: R = R - 1'");
    expect(source).toContain("this.flashWrong('Retreat R before checking the loop again.')");
    expect(source).not.toContain('private async tryStep()');
    expect(source).not.toContain('Just press SPACE.');
  });
});

describe('Mirror Serpent controls', () => {
  it('maps the displayed D/J two-sum controls to the forced pointer moves', () => {
    const source = readFileSync(scenePath, 'utf8');

    expect(source).toMatch(/private handleD\(\): void \{[\s\S]*this\.advanceTwoSumLeft\(1\)/);
    expect(source).toMatch(/private handleJ\(\): void \{[\s\S]*this\.retreatTwoSumRight\(-1\)/);
    expect(source).toContain("const tip = sum < target ? 'Sum too small - press D.'");
    expect(source).toContain('private reverseCompleting = false;');
    expect(source).toContain("if (this.reverseCompleting || this.phase !== 'reverse') return;");
  });
});
