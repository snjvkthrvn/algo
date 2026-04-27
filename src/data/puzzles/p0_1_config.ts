/**
 * P0-1 puzzle configuration data.
 */

import type { PuzzleConfig } from '../types';
import { PuzzleType, Difficulty, AlgorithmType } from '../types';

export const P0_1_CONFIG: PuzzleConfig = {
  id: 'p0_1',
  name: 'follow_the_path',
  displayName: 'Follow the Path',
  type: PuzzleType.INTERACTIVE,
  difficulty: Difficulty.VERY_EASY,
  algorithmConcept: AlgorithmType.SEQUENTIAL_REASONING,
  description: 'Watch the rune pattern, then reproduce the sequence. Order matters.',
  location: 'Chamber of Flow - Upper Platform',
  npcId: 'rune_keeper',
  mechanics: {
    type: 'sequence_memory',
    elements: [
      { id: 'hex_1', type: 'hexagonal_tile', initialState: 'inactive', properties: { color: 0x06b6d4, position: 0 } },
      { id: 'hex_2', type: 'hexagonal_tile', initialState: 'inactive', properties: { color: 0x8b5cf6, position: 1 } },
      { id: 'hex_3', type: 'hexagonal_tile', initialState: 'inactive', properties: { color: 0x22c55e, position: 2 } },
      { id: 'hex_4', type: 'hexagonal_tile', initialState: 'inactive', properties: { color: 0xf97316, position: 3 } },
      { id: 'hex_5', type: 'hexagonal_tile', initialState: 'inactive', properties: { color: 0xef4444, position: 4 } },
      { id: 'hex_6', type: 'hexagonal_tile', initialState: 'inactive', properties: { color: 0xfbbf24, position: 5 } },
    ],
    rules: [
      'Tiles glow in a specific sequence',
      'Player must select tiles in the same order',
      'Wrong selection replays the pattern for the current round',
      'Three fixed rounds of increasing length (3, 5, and 7 steps)',
    ],
    controls: {
      input: ['mouse_click', 'number_keys_1_6'],
      actions: ['select_tile'],
      instructions: 'Click tiles or press 1-6 in the order they glowed',
    },
    victoryCriteria: {
      type: 'complete_all_rounds',
      conditions: ['all_3_rounds_completed'],
    },
  },
  solution: {
    steps: ['Memorize sequence', 'Reproduce in order', 'Complete 3 rounds'],
  },
  hints: [
    'Watch the order carefully. The first tile glows first.',
    'The first tile in the sequence gets highlighted.',
    'The sequence replays at half speed.',
  ],
  rewards: {
    codexUnlock: true,
    conceptBridgeTriggered: true,
    progressionPoints: 1,
    unlocks: ['boss_gate_partial'],
  },
  conceptBridge: {
    id: 'cb_p0_1',
    puzzleId: 'p0_1',
    sections: [],
  },
  codexEntry: {
    id: 'sequential_processing',
    algorithmName: 'Sequential Processing',
    category: AlgorithmType.SEQUENTIAL_REASONING,
    unlockedBy: 'p0_1',
    sections: [],
    relatedConcepts: ['arrays', 'iteration'],
    difficulty: Difficulty.VERY_EASY,
  },
};
