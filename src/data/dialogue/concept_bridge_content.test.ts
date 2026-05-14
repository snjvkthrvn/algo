import { describe, expect, it } from 'vitest';
import { getConceptBridgeContent } from './concept_bridge_content';
import type { ConceptBridgeData } from '../types';

function bridgeData(overrides: Partial<ConceptBridgeData>): ConceptBridgeData {
  return {
    puzzleName: 'Test Puzzle',
    puzzleId: 'test_puzzle',
    concept: 'Test Concept',
    returnScene: 'TestScene',
    attempts: 0,
    timeSpent: 12,
    hintsUsed: 0,
    stars: 3,
    ...overrides,
  };
}

describe('Concept Bridge content lookup', () => {
  it('provides authored content for rebuilt Twin Rivers puzzles', () => {
    const content = getConceptBridgeContent(bridgeData({
      puzzleId: 'tr_1',
      puzzleName: 'Mirror Walk',
      concept: 'Two-Pointer Reverse',
    }));

    expect(content.puzzleId).toBe('tr_1');
    expect(content.sections.patternReveal.title).toContain('Two-Pointer Reverse');
    expect(content.sections.pseudocode.code).toContain('while L < R');
  });

  it('builds safe fallback content for later-region puzzles without authored bridge data', () => {
    const content = getConceptBridgeContent(bridgeData({
      puzzleId: 'hh_1',
      puzzleName: 'Nameplate Gates',
      concept: 'Hash Map Lookup',
    }));

    expect(content.puzzleId).toBe('hh_1');
    expect(content.sections.storyRecap.join(' ')).toContain('Nameplate Gates');
    expect(content.sections.patternReveal.title).toContain('Hash Map Lookup');
    expect(content.sections.pseudocode.explanation).toContain('Hash Map Lookup');
    expect(content.sections.codexEntryId).toBe('concept_hash_map_lookup');
  });
});
