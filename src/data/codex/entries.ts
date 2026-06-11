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
  {
    id: 'bubble_sort',
    algorithmName: 'Sorting - Bubble Sort',
    category: AlgorithmType.SORTING,
    unlockedBy: 'ap_1',
    difficulty: Difficulty.EASY,
    relatedConcepts: ['sorting', 'adjacent-swaps', 'passes'],
    sections: [
      {
        type: 'what_you_felt',
        title: 'What You Felt',
        content: [
          'The row was scrambled, but you could only touch neighbors.',
          'Each useful swap fixed one local mistake. Over time, the larger values drifted right.',
        ],
      },
      {
        type: 'plain_explanation',
        title: 'Plain Explanation',
        content: [
          'Bubble sort repeatedly compares adjacent values and swaps them if they are out of order.',
          'It is simple and visual, but it can take many passes for large lists.',
        ],
      },
      {
        type: 'pattern_steps',
        title: 'The Pattern',
        content: [
          '1. Compare two neighboring values',
          '2. Swap them if the left one is larger',
          '3. Move to the next pair',
          '4. Repeat passes until no swaps happen',
        ],
      },
      {
        type: 'plain_explanation',
        title: 'The Cost',
        content: [
          'A reversed row is the textbook worst case: every pair is an inversion, so 8 crates need 8·7/2 = 28 swaps.',
          'That n(n−1)/2 growth is why bubble sort is called O(n²) — and why faster sorts were invented.',
          'Compare: O(n²) bubble vs O(n log n) merge / quick. Best case is a nearly-sorted row: one clean pass, O(n) with the early exit.',
        ],
      },
      {
        type: 'real_world',
        title: 'In the Real World',
        content: ['Teaching sorting basics', 'Small ordered lists', 'Understanding why better sorting algorithms matter'],
      },
      {
        type: 'unlocked_ability',
        title: 'Unlocked Ability',
        content: 'Order Sense - Local disorder now stands out. Neighbor pairs reveal whether a row is settling or drifting.',
      },
    ],
  },
  {
    id: 'array_indexing',
    algorithmName: 'Indexing - O(1) Direct Access',
    category: AlgorithmType.ARRAY_INDEXING,
    unlockedBy: 'ap_2',
    difficulty: Difficulty.EASY,
    relatedConcepts: ['arrays', 'indices', 'constant-time-access'],
    sections: [
      {
        type: 'what_you_felt',
        title: 'What You Felt',
        content: [
          'A request named an item and its basket number.',
          'You did not search the barn. You used the number and went directly to the slot.',
        ],
      },
      {
        type: 'plain_explanation',
        title: 'Plain Explanation',
        content: [
          'Array indexing retrieves a value by position.',
          'Because the position is known, the lookup stays constant time even when the array grows.',
        ],
      },
      {
        type: 'pattern_steps',
        title: 'The Pattern',
        content: ['1. Know the index', '2. Jump to that slot', '3. Read or write the value'],
      },
      {
        type: 'plain_explanation',
        title: 'The Cost',
        content: [
          'Indexed access is O(1): 5 baskets or 80, the lookup is one jump — arr[i] is a memory offset, and i is the entire instruction.',
          'Scanning for an item without its index is O(n): the scanner checks every basket on the way, and a shelf twice as long costs twice the work.',
          'Compare: index O(1) · linear scan O(n) ⇒ ×n speedup. That contrast is why arrays are the bedrock of fast lookups.',
        ],
      },
      {
        type: 'real_world',
        title: 'In the Real World',
        content: ['Seat numbers', 'Spreadsheet cells', 'Memory addresses', 'Playlist track positions'],
      },
      {
        type: 'unlocked_ability',
        title: 'Unlocked Ability',
        content: 'Index Sight - Numbered rows now reveal their direct addresses.',
      },
    ],
  },
  {
    id: 'hash_functions',
    algorithmName: 'Hash Functions - Mapping Inputs To Buckets',
    category: AlgorithmType.HASHING,
    unlockedBy: 'ap_3',
    difficulty: Difficulty.MEDIUM,
    relatedConcepts: ['hashing', 'modulo', 'collisions'],
    sections: [
      {
        type: 'what_you_felt',
        title: 'What You Felt',
        content: [
          'Each crop name became a number, and each number became a bucket.',
          'The formula was small, but it gave the same answer every time.',
        ],
      },
      {
        type: 'plain_explanation',
        title: 'Plain Explanation',
        content: [
          'A hash function converts an input into an address-like value.',
          'Modulo is often used to keep that value inside a fixed bucket range.',
        ],
      },
      {
        type: 'pattern_steps',
        title: 'The Pattern',
        content: [
          '1. Convert the input into a number',
          '2. Compress the number into a bucket range',
          '3. Store or find the item in that bucket',
          '4. Handle collisions when multiple inputs land together',
        ],
      },
      {
        type: 'plain_explanation',
        title: 'The Cost',
        content: [
          'The wrapping walk you paced in the mill is the modulo operation: bucket = key % bucketCount. Same key, same bucket, every time.',
          'Expected lookup is O(1) — one toss, no matter how many crops exist. The pathological case is O(n): every key colliding into one bucket, which real tables avoid with good hash functions and chaining or probing.',
          'When the fifth bin arrived and every home moved, that was a RESIZE: changing the modulus rehashes every key. Tables grow rarely and re-place everything when they do.',
        ],
      },
      {
        type: 'real_world',
        title: 'In the Real World',
        content: ['Hash tables', 'Password hashing', 'Cache keys', 'Load distribution'],
      },
      {
        type: 'unlocked_ability',
        title: 'Unlocked Ability',
        content: 'Hash Trace - Formula-driven destinations become visible before the item lands.',
      },
    ],
  },
  {
    id: 'two_sum',
    algorithmName: 'Two Sum - The Complement Technique',
    category: AlgorithmType.TWO_SUM,
    unlockedBy: 'ap_4',
    difficulty: Difficulty.MEDIUM,
    relatedConcepts: ['complements', 'sets', 'lookup'],
    sections: [
      {
        type: 'what_you_felt',
        title: 'What You Felt',
        content: [
          'A target number changed the whole field.',
          'Every chosen tile told you exactly which partner it needed.',
        ],
      },
      {
        type: 'plain_explanation',
        title: 'Plain Explanation',
        content: [
          'Two Sum asks for two values that add to a target.',
          'The complement of value x is target - x. Fast lookup makes that complement check powerful.',
        ],
      },
      {
        type: 'pattern_steps',
        title: 'The Pattern',
        content: [
          '1. Pick or scan a value',
          '2. Compute target - value',
          '3. Check whether that complement exists',
          '4. Return the pair when it does',
        ],
      },
      {
        type: 'plain_explanation',
        title: 'The Cost',
        content: [
          'Holding a stone, its partner is fixed: complement = target − value. That is the entire insight.',
          'Checking every pair costs n·(n−1)/2 comparisons — O(n²); 9 stones already means 36 checks, which is what Glitch was grinding through.',
          'Remembering values you have passed in a hash set answers "have I seen target − v?" in O(1), so one pass — O(n) — finds the pair. Memory is the speedup.',
        ],
      },
      {
        type: 'real_world',
        title: 'In the Real World',
        content: ['Budget pairs', 'Matching inventory counts', 'Finding complementary constraints', 'Interview problem foundations'],
      },
      {
        type: 'unlocked_ability',
        title: 'Unlocked Ability',
        content: 'Complement Sense - One number now reveals the exact partner needed to complete a target.',
      },
    ],
  },
  {
    id: 'collection_mastery',
    algorithmName: 'Collection Mastery - Sort, Index, Hash, Pair',
    category: AlgorithmType.HYBRID,
    unlockedBy: 'boss_shuffler',
    difficulty: Difficulty.MEDIUM,
    relatedConcepts: ['arrays', 'sorting', 'hashing', 'two-sum'],
    sections: [
      {
        type: 'what_you_felt',
        title: 'What You Felt',
        content: [
          'The Shuffler tried to make every lesson happen at once.',
          'You answered chaos with reusable rules instead of random retries.',
        ],
      },
      {
        type: 'plain_explanation',
        title: 'Plain Explanation',
        content: [
          'Collection problems often combine multiple tools.',
          'Sorting, indexing, hashing, and complements are separate ideas, but real problems mix them.',
        ],
      },
      {
        type: 'pattern_steps',
        title: 'The Pattern',
        content: ['1. Identify the data shape', '2. Choose the useful operation', '3. Apply the rule consistently', '4. Combine rules only when needed'],
      },
      {
        type: 'real_world',
        title: 'In the Real World',
        content: ['Search features', 'Data cleanup', 'Inventory systems', 'Recommendation filters'],
      },
      {
        type: 'unlocked_ability',
        title: 'Unlocked Ability',
        content: 'Collection Mastery - Array Plains settles. The way forward opens toward Twin Rivers.',
      },
    ],
  },
];
