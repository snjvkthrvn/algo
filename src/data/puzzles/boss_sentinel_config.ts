/**
 * Boss Sentinel configuration data.
 */

import type { BossConfig } from '../types';
import { PuzzleType, Difficulty, AlgorithmType } from '../types';

export const BOSS_SENTINEL_CONFIG: BossConfig = {
  id: 'boss_sentinel',
  name: 'fractured_sentinel',
  displayName: 'The Fractured Sentinel',
  type: PuzzleType.BOSS,
  difficulty: Difficulty.MEDIUM,
  algorithmConcept: AlgorithmType.PATTERN_MATCHING,
  description: 'Prove your mastery of both sequential processing and key-value mapping.',
  location: 'Chamber of Flow - Sentinel Arena',
  mechanics: {
    type: 'multi_phase_boss',
    elements: [],
    rules: [
      'Phase 1: Reproduce 6-tile sequences (2 required)',
      'Phase 2: Place 6 shards in matching sockets while dodging orbs',
      'Phase 3: Combined pattern + shard challenge (4 rounds)',
    ],
    controls: {
      input: ['mouse_click'],
      actions: ['select_tile', 'pickup_shard', 'place_shard', 'dodge'],
      instructions: 'Click arena tiles for patterns, click shards/sockets for placement',
    },
    victoryCriteria: {
      type: 'complete_all_phases',
      conditions: ['phase_1_complete', 'phase_2_complete', 'phase_3_complete'],
    },
  },
  solution: {
    steps: ['Complete 2 pattern sequences', 'Place all 6 shards', 'Complete 4 fusion rounds'],
  },
  hints: [
    'Watch carefully. The sequence repeats the same tiles.',
    'The first tile in the sequence is highlighted.',
  ],
  rewards: {
    codexUnlock: true,
    conceptBridgeTriggered: true,
    progressionPoints: 3,
    unlocks: ['array_plains_gateway'],
  },
  conceptBridge: {
    id: 'cb_boss_sentinel',
    puzzleId: 'boss_sentinel',
    sections: [],
  },
  codexEntry: {
    id: 'pattern_recognition',
    algorithmName: 'Pattern Recognition & Authentication',
    category: AlgorithmType.PATTERN_MATCHING,
    unlockedBy: 'boss_sentinel',
    sections: [],
    relatedConcepts: ['authentication', 'multi-factor'],
    difficulty: Difficulty.MEDIUM,
  },
  phases: [
    {
      phaseNumber: 1,
      name: 'Pattern Echo',
      mechanics: {
        type: 'sequence_memory',
        elements: [],
        rules: ['6-tile sequences', '10s response window', '2 sequences to complete'],
        controls: { input: ['mouse_click'], actions: ['select_tile'], instructions: 'Click tiles in pattern order' },
        victoryCriteria: { type: 'complete_sequences', conditions: ['2_sequences_correct'] },
      },
      timeLimit: 10,
      difficulty: Difficulty.EASY,
    },
    {
      phaseNumber: 2,
      name: 'Fragment Storm',
      mechanics: {
        type: 'key_value_with_hazards',
        elements: [],
        rules: ['6 shards to 6 sockets', 'Energy orbs every 3s', 'Orb hit = 1s stun'],
        controls: { input: ['mouse_click'], actions: ['pickup_shard', 'place_shard'], instructions: 'Match shards to sockets' },
        victoryCriteria: { type: 'all_shards_placed', conditions: ['6_correct_placements'] },
      },
      difficulty: Difficulty.MEDIUM,
    },
    {
      phaseNumber: 3,
      name: 'Chaos Fusion',
      mechanics: {
        type: 'combined_challenge',
        elements: [],
        rules: ['Pattern + shard + timed socket', '4 escalating rounds'],
        controls: { input: ['mouse_click'], actions: ['select_tile', 'pickup_shard', 'place_shard'], instructions: 'Complete combined challenges' },
        victoryCriteria: { type: 'complete_all_rounds', conditions: ['4_rounds_complete'] },
      },
      difficulty: Difficulty.HARD,
    },
  ],
  healthBarVisible: true,
  defeatDialogue: [
    'Authorization... accepted.',
    'Legacy credentials... valid.',
    'The path beyond... is open.',
  ],
  victoryRewards: {
    codexEntries: ['pattern_recognition'],
    unlockedRegions: ['array_plains'],
    progressionPoints: 5,
  },
};
