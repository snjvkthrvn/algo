/**
 * Codex entries for the Prologue region.
 */

import type { CodexEntry } from '../types';
import { AlgorithmType, Difficulty } from '../types';

export const CODEX_ENTRIES: CodexEntry[] = [
  {
    id: 'sequential_processing',
    algorithmName: 'Sequences — The Foundation of Everything',
    category: AlgorithmType.SEQUENTIAL_REASONING,
    unlockedBy: 'p0_1',
    difficulty: Difficulty.VERY_EASY,
    relatedConcepts: ['arrays', 'iteration', 'for-loops'],
    sections: [
      {
        type: 'what_you_felt',
        title: 'What You Felt',
        content: [
          'The runes glowed one at a time. First, second, third. You watched. You remembered. You walked that exact path.',
          'Your Bit hovered near each tile in order — helping you hold the sequence in your head.',
          'When you finished, something clicked. Not just "I did it" — but "I understand why order matters."',
          'That click? That\'s what sequential processing feels like from the inside.',
        ],
      },
      {
        type: 'plain_explanation',
        title: 'Plain Explanation',
        content: [
          'Sequential processing means handling items one at a time, in a specific order.',
          'Think of following a recipe: step 1, then step 2, then step 3. Skip a step and the result is wrong.',
          'Computers do this billions of times per second when they iterate through arrays -- the simplest and most common data structure.',
        ],
      },
      {
        type: 'pattern_steps',
        title: 'The Pattern',
        content: [
          '1. Start at the first element (index 0)',
          '2. Process the current element',
          '3. Move to the next element (index + 1)',
          '4. If there are more elements, go to step 2',
          '5. Done! You\'ve visited every element exactly once.',
        ],
      },
      {
        type: 'real_world',
        title: 'In the Real World',
        content: [
          'Reading characters in a string to check spelling',
          'Processing each pixel in an image to apply a filter',
          'Scanning each item at a grocery checkout',
          'Every playlist that plays songs in order',
        ],
      },
      {
        type: 'unlocked_ability',
        title: 'Unlocked Ability',
        content: 'Pattern Sight — You can now perceive the sequential order underlying the world\'s processes. Sequences that once seemed random now reveal their logic. Your Bit has grown — watch it arrange its particles into a line.',
      },
    ],
  },
  {
    id: 'key_value_mapping',
    algorithmName: 'Mapping — Every Key Has a Value',
    category: AlgorithmType.SPATIAL_MAPPING,
    unlockedBy: 'p0_2',
    difficulty: Difficulty.EASY,
    relatedConcepts: ['hash-maps', 'dictionaries', 'direct-addressing'],
    sections: [
      {
        type: 'what_you_felt',
        title: 'What You Felt',
        content: [
          'Three shards. Three consoles. Each shard had a shape and a stripe count. Each console showed exactly what it wanted.',
          'You looked at the shard. You looked at the consoles. You walked straight to the right one.',
          'Meanwhile, someone nearby tried every slot until something fit. It took them much, much longer.',
          'You felt the difference between searching and knowing. That\'s what mapping gives you.',
        ],
      },
      {
        type: 'plain_explanation',
        title: 'Plain Explanation',
        content: [
          'A key-value map stores data as pairs: a unique key and the value it points to.',
          'Think of a phone book: you know the name (key), you find the number (value) instantly. No need to read every entry.',
          'This is one of the most powerful data structures in computing because it makes lookups instant.',
        ],
      },
      {
        type: 'pattern_steps',
        title: 'The Pattern',
        content: [
          '1. Each item has a unique identifier (the key)',
          '2. Each key maps to exactly one value',
          '3. To find a value, use its key -- no searching needed',
          '4. Adding a new pair: store key -> value',
          '5. Looking up: give key, get value instantly (O(1) time)',
        ],
      },
      {
        type: 'real_world',
        title: 'In the Real World',
        content: [
          'DNS servers: domain name (key) -> IP address (value)',
          'Your contacts app: name -> phone number',
          'Student IDs: ID number -> student record',
          'Every database index ever built',
        ],
      },
      {
        type: 'unlocked_ability',
        title: 'Unlocked Ability',
        content: 'Flow Sense — You can now perceive the connections between keys and values in the world. Locked doors reveal what key they need. Broken mappings become visible. When both shards are yours, the gate opens.',
      },
    ],
  },
  {
    id: 'pattern_recognition',
    algorithmName: 'Pattern Recognition & Authentication',
    category: AlgorithmType.PATTERN_MATCHING,
    unlockedBy: 'boss_sentinel',
    difficulty: Difficulty.MEDIUM,
    relatedConcepts: ['authentication', 'multi-factor', 'access-control'],
    sections: [
      {
        type: 'what_you_felt',
        title: 'What You Felt',
        content: [
          'The Sentinel was overwhelming -- patterns flying at you while dodging orbs, matching shards under pressure.',
          'But you broke it down: one phase at a time. One pattern at a time. One match at a time.',
          'The key wasn\'t speed -- it was decomposition. Breaking the impossible into the manageable.',
        ],
      },
      {
        type: 'plain_explanation',
        title: 'Plain Explanation',
        content: [
          'The Sentinel was an authentication system -- it needed to verify you had the right to pass.',
          'Multi-factor authentication checks multiple things: something you know (the pattern) AND something you have (the shard).',
          'Each phase was one "factor" in the verification process. All factors must pass for access to be granted.',
        ],
      },
      {
        type: 'pattern_steps',
        title: 'The Pattern',
        content: [
          '1. Check Factor 1: Does the user know the secret? (pattern sequence)',
          '2. Check Factor 2: Does the user possess the key? (shard matching)',
          '3. Check Factor 3: Can the user perform under pressure? (combined challenge)',
          '4. ALL factors must pass -- failing any one means DENIED',
          '5. This is why security uses layers, not just one check',
        ],
      },
      {
        type: 'real_world',
        title: 'In the Real World',
        content: [
          'Logging into your bank: password (know) + SMS code (have)',
          'Airport security: ID (identity) + boarding pass (authorization) + screening (integrity)',
          'API authentication: API key + request signature + rate limiting',
          'Every "Verify it\'s you" prompt on your phone',
        ],
      },
      {
        type: 'unlocked_ability',
        title: 'Unlocked Ability',
        content: 'Sentinel\'s Insight -- You can now see the authentication requirements of any barrier in Algorithmia. Security systems reveal their verification factors to you.',
      },
    ],
  },
];
