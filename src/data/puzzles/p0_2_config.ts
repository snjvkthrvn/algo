/**
 * P0-2 puzzle configuration data.
 */

import type { PuzzleConfig } from '../types';
import { PuzzleType, Difficulty, AlgorithmType } from '../types';

export const P0_2_CONFIG: PuzzleConfig = {
  id: 'p0_2',
  name: 'flow_consoles',
  displayName: 'Flow Consoles',
  type: PuzzleType.INTERACTIVE,
  difficulty: Difficulty.EASY,
  algorithmConcept: AlgorithmType.SPATIAL_MAPPING,
  description: 'Match each shard (triangle, diamond, circle) to the console color that accepts it.',
  location: 'Chamber of Flow - Lower Platform',
  npcId: 'console_keeper',
  mechanics: {
    type: 'key_value_mapping',
    elements: [
      { id: 'console_red', type: 'console', initialState: 'empty', properties: { accepts: 'triangle' } },
      { id: 'console_blue', type: 'console', initialState: 'empty', properties: { accepts: 'diamond' } },
      { id: 'console_green', type: 'console', initialState: 'empty', properties: { accepts: 'circle' } },
      { id: 'shard_triangle', type: 'shard', initialState: 'loose', properties: { mapsTo: 'red' } },
      { id: 'shard_diamond', type: 'shard', initialState: 'loose', properties: { mapsTo: 'blue' } },
      { id: 'shard_circle', type: 'shard', initialState: 'loose', properties: { mapsTo: 'green' } },
    ],
    rules: [
      'Triangle maps to the red console, diamond to blue, circle to green',
      'Each console shows the shape it accepts',
      'Select a shard, then place it on the matching console',
      'Wrong match returns the shard',
    ],
    controls: {
      input: ['mouse_click', 'number_keys_1_3', 'E_key', 'Enter_key', 'Space_key'],
      actions: ['pickup_shard', 'place_shard'],
      instructions: 'Click or press 1-3 to pick a shard, then press 1-3 to place it on a console',
    },
    victoryCriteria: {
      type: 'all_shards_placed',
      conditions: ['all_3_consoles_filled'],
    },
  },
  solution: {
    steps: ['Place triangle on red', 'Place diamond on blue', 'Place circle on green'],
  },
  hints: [
    'Each console shows what it needs. Match the shapes.',
    'A matching pair is highlighted.',
    'One shard is placed automatically.',
  ],
  rewards: {
    codexUnlock: true,
    conceptBridgeTriggered: true,
    progressionPoints: 1,
    unlocks: ['boss_gate_partial'],
  },
  conceptBridge: {
    id: 'cb_p0_2',
    puzzleId: 'p0_2',
    sections: [],
  },
  codexEntry: {
    id: 'key_value_mapping',
    algorithmName: 'Key-Value Mapping',
    category: AlgorithmType.SPATIAL_MAPPING,
    unlockedBy: 'p0_2',
    sections: [],
    relatedConcepts: ['hash-maps', 'dictionaries'],
    difficulty: Difficulty.EASY,
  },
};
