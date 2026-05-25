/**
 * Hash Highlands NPC dialogue — Region 4.
 *
 * Each puzzle has a dedicated keeper whose pre-puzzle voice describes the
 * trial in overworld-physical terms (a wall of nameplates, a forge that
 * counts strikes, a garden of word-stones, a cavern that forgets old echoes)
 * and whose post-puzzle voice names the algorithm the player just performed
 * (Direct-Address Hash, Frequency Map, Canonical-Key Grouping, LRU Cache).
 *
 * FEEL → NAME rule: algorithm names appear ONLY in post-puzzle lines.
 *
 * Voice cribsheet:
 *   Cartographer of Keys:  warm regional guide, surveyor's calm — frames every
 *                          climb as "the key already knows its bucket"
 *   Nameplate Warden:      precise gatekeeper, slightly formal — "addresses, not
 *                          searches"
 *   Forge Tallyer:         tradesperson, counts in their head — "I just notch
 *                          the stone each time"
 *   Garden Anagramist:     poet-archivist, sees rearrangements as families
 *   Cavern Echo:           rueful keeper of forgetting — "the cave only
 *                          remembers what you visited last"
 */

import type { DialogueTree } from '../types';

// ─── Cartographer of Keys (Regional Guide) ─────────────────────────────────────

export const cartographerDialogue: DialogueTree = {
  startNodeId: 'cart_intro_1',
  nodes: [
    {
      id: 'cart_intro_1',
      speaker: 'Cartographer of Keys',
      text: 'Welcome to the Highlands. Up here, every climber carries a name — and every name already knows its bucket.',
      nextNodeId: 'cart_intro_2',
    },
    {
      id: 'cart_intro_2',
      speaker: 'Cartographer of Keys',
      text: [
        'Down in the Plains you walked rows. Across the Rivers you paired pointers.',
        'Here the rule is different: do not search. Calculate the destination, then arrive there.',
      ],
      nextNodeId: 'cart_intro_3',
    },
    {
      id: 'cart_intro_3',
      speaker: 'Cartographer of Keys',
      text: [
        'Four trials line the ridges. The Nameplate Warden, the Forge Tallyer, the Garden Anagramist, the Cavern Echo.',
        'When all four lessons settle, the Archivist will open the high gate.',
      ],
    },
  ],
};

// ─── HH-1 Nameplate Warden ─────────────────────────────────────────────────────
// Trial: Direct-Address Hashing. The player matches climbers to bucket gates by
// the rule "your nameplate IS your address". Pre-puzzle never mentions "hash".

export const nameplateWardenDialogue: DialogueTree = {
  startNodeId: 'np_intro_1',
  nodes: [
    {
      id: 'np_intro_1',
      speaker: 'Nameplate Warden',
      text: 'Each climber here wears a nameplate. Each gate wears the same. The rule is simple — your plate IS your gate.',
      nextNodeId: 'np_intro_2',
    },
    {
      id: 'np_intro_2',
      speaker: 'Nameplate Warden',
      text: [
        'Most travellers walk the line of gates and read each plate. Wasted breath.',
        'A climber with a nameplate does not search. They go directly to the gate that matches.',
      ],
      nextNodeId: 'np_challenge',
    },
    {
      id: 'np_challenge',
      speaker: 'Nameplate Warden',
      text: 'Send each climber to the right gate in one step. No wandering.',
      choices: [
        { text: 'I will route them.', nextNodeId: 'np_start_puzzle' },
        { text: 'Tell me more.', nextNodeId: 'np_explain' },
      ],
    },
    {
      id: 'np_explain',
      speaker: 'Nameplate Warden',
      text: [
        'A plate carries a key. A gate listens for that key.',
        'When the climber holds a key the gate already knows, the gate is found, not searched.',
      ],
      nextNodeId: 'np_challenge',
    },
    {
      id: 'np_start_puzzle',
      speaker: 'Nameplate Warden',
      text: 'Begin. Address the gate — do not seek it.',
      actions: [{ type: 'start_puzzle', value: 'hh_1' }],
    },
  ],
};

export const nameplateWardenPostPuzzle: DialogueTree = {
  startNodeId: 'np_post_1',
  nodes: [
    {
      id: 'np_post_1',
      speaker: 'Nameplate Warden',
      text: 'Every climber arrived at their gate without a single wrong step.',
      nextNodeId: 'np_post_2',
    },
    {
      id: 'np_post_2',
      speaker: 'Nameplate Warden',
      text: [
        'What you just performed is named in the Codex: DIRECT-ADDRESS HASHING.',
        'A key is computed into an index. The index IS the bucket. No traversal, no comparison loop.',
      ],
      nextNodeId: 'np_post_3',
    },
    {
      id: 'np_post_3',
      speaker: 'Nameplate Warden',
      text: [
        'In the Plains you walked a row — O(n). Here, you arrived — O(1).',
        'The cost of asking "where is it?" collapsed to the cost of computing "where IS it?".',
      ],
    },
  ],
};

// ─── HH-2 Forge Tallyer ────────────────────────────────────────────────────────
// Trial: Frequency Map. The player notches a count for each visitor kind.
// Pre-puzzle never mentions "frequency map" or "dictionary".

export const forgeTallyerDialogue: DialogueTree = {
  startNodeId: 'ft_intro_1',
  nodes: [
    {
      id: 'ft_intro_1',
      speaker: 'Forge Tallyer',
      text: 'I am no good with lists. They get long and I forget what came twice.',
      nextNodeId: 'ft_intro_2',
    },
    {
      id: 'ft_intro_2',
      speaker: 'Forge Tallyer',
      text: [
        'So I cut a tally-stone for each kind of visitor. Every time one returns, I notch their stone — one mark deeper.',
        'When the day is done, I look at the stones. The deepest notch is the most-seen visitor.',
      ],
      nextNodeId: 'ft_challenge',
    },
    {
      id: 'ft_challenge',
      speaker: 'Forge Tallyer',
      text: 'The forge runs hot today. Tally each strike so I know which pattern came most.',
      choices: [
        { text: 'I will keep the tally.', nextNodeId: 'ft_start_puzzle' },
        { text: 'How are the stones cut?', nextNodeId: 'ft_explain' },
      ],
    },
    {
      id: 'ft_explain',
      speaker: 'Forge Tallyer',
      text: [
        'One stone per kind. The stone never moves. I find it by its name.',
        'When a strike of that kind lands, I notch up. I never re-count the whole forge.',
      ],
      nextNodeId: 'ft_challenge',
    },
    {
      id: 'ft_start_puzzle',
      speaker: 'Forge Tallyer',
      text: 'Mind the heat. Notch as you see them.',
      actions: [{ type: 'start_puzzle', value: 'hh_2' }],
    },
  ],
};

export const forgeTallyerPostPuzzle: DialogueTree = {
  startNodeId: 'ft_post_1',
  nodes: [
    {
      id: 'ft_post_1',
      speaker: 'Forge Tallyer',
      text: 'The stones do not lie. You found the heaviest pattern without re-walking the whole forge.',
      nextNodeId: 'ft_post_2',
    },
    {
      id: 'ft_post_2',
      speaker: 'Forge Tallyer',
      text: [
        'The Codex calls this a FREQUENCY MAP.',
        'A key for every kind. A counter that climbs. The answer is read off the map at the end — never recomputed.',
      ],
      nextNodeId: 'ft_post_3',
    },
    {
      id: 'ft_post_3',
      speaker: 'Forge Tallyer',
      text: [
        'A list would force me to sort and scan — O(n log n) at best, O(n²) at worst.',
        'A tally-map turns the whole job into O(n) — one pass, one notch per strike.',
      ],
    },
  ],
};

// ─── HH-3 Garden Anagramist ────────────────────────────────────────────────────
// Trial: Group anagrams by canonical key (sorted letters). Pre-puzzle never
// mentions "anagram grouping" by name or "canonical key".

export const gardenAnagramistDialogue: DialogueTree = {
  startNodeId: 'ga_intro_1',
  nodes: [
    {
      id: 'ga_intro_1',
      speaker: 'Garden Anagramist',
      text: 'Look at these stones. Each carries a word. Different words — but some are secretly the same family.',
      nextNodeId: 'ga_intro_2',
    },
    {
      id: 'ga_intro_2',
      speaker: 'Garden Anagramist',
      text: [
        '"LISTEN" and "SILENT" — same letters, rearranged. Cousins.',
        'I cannot match cousins by reading their faces. The faces lie. I need to ask the same question of every stone: what letters do you hold, in order?',
      ],
      nextNodeId: 'ga_challenge',
    },
    {
      id: 'ga_challenge',
      speaker: 'Garden Anagramist',
      text: 'Group every stone by its true family — by the answer they ALL share.',
      choices: [
        { text: 'Let me sort the families.', nextNodeId: 'ga_start_puzzle' },
        { text: 'Why must they share an answer?', nextNodeId: 'ga_explain' },
      ],
    },
    {
      id: 'ga_explain',
      speaker: 'Garden Anagramist',
      text: [
        'A family must have ONE shared name — a label every member produces the same way.',
        'Sort each stone\'s letters. Two stones with the same sorted letters belong to the same family. Always.',
      ],
      nextNodeId: 'ga_challenge',
    },
    {
      id: 'ga_start_puzzle',
      speaker: 'Garden Anagramist',
      text: 'Begin. Find the shared answer. The family will follow.',
      actions: [{ type: 'start_puzzle', value: 'hh_3' }],
    },
  ],
};

export const gardenAnagramistPostPuzzle: DialogueTree = {
  startNodeId: 'ga_post_1',
  nodes: [
    {
      id: 'ga_post_1',
      speaker: 'Garden Anagramist',
      text: 'Every stone found its family. Every family answered to the same name.',
      nextNodeId: 'ga_post_2',
    },
    {
      id: 'ga_post_2',
      speaker: 'Garden Anagramist',
      text: [
        'The Codex names this CANONICAL-KEY GROUPING — anagrams solved by hashing on a CANONICAL FORM.',
        'You did not compare every stone to every other. You computed each stone\'s true name once, then dropped it into the bucket that name belonged to.',
      ],
      nextNodeId: 'ga_post_3',
    },
    {
      id: 'ga_post_3',
      speaker: 'Garden Anagramist',
      text: [
        'Pair-wise comparison would have cost O(n² · k). Canonical hashing cost O(n · k log k).',
        'When you find the right key, the work collapses around it.',
      ],
    },
  ],
};

// ─── HH-4 Cavern Echo ──────────────────────────────────────────────────────────
// Trial: LRU Cache. The cave only remembers what you visited recently — old
// echoes evict to make room. Pre-puzzle never says "cache" or "LRU".

export const cavernEchoDialogue: DialogueTree = {
  startNodeId: 'ce_intro_1',
  nodes: [
    {
      id: 'ce_intro_1',
      speaker: 'Cavern Echo',
      text: 'This cavern has a shallow memory. It holds only a handful of echoes at once.',
      nextNodeId: 'ce_intro_2',
    },
    {
      id: 'ce_intro_2',
      speaker: 'Cavern Echo',
      text: [
        'Shout a name the cave already remembers, and the answer comes back instantly — and that name becomes the freshest in its memory.',
        'Shout a new name, and the cave must drop its oldest echo to make room for yours.',
      ],
      nextNodeId: 'ce_challenge',
    },
    {
      id: 'ce_challenge',
      speaker: 'Cavern Echo',
      text: 'The cave forgets what you stopped asking about. Keep what matters fresh.',
      choices: [
        { text: 'I will manage the memory.', nextNodeId: 'ce_start_puzzle' },
        { text: 'How does it choose what to drop?', nextNodeId: 'ce_explain' },
      ],
    },
    {
      id: 'ce_explain',
      speaker: 'Cavern Echo',
      text: [
        'The cave drops the echo it has gone longest without hearing.',
        'Recency is mercy. The least-recently-used voice is the first to be lost.',
      ],
      nextNodeId: 'ce_challenge',
    },
    {
      id: 'ce_start_puzzle',
      speaker: 'Cavern Echo',
      text: 'Begin shouting. The cavern listens — for a while.',
      actions: [{ type: 'start_puzzle', value: 'hh_4' }],
    },
  ],
};

export const cavernEchoPostPuzzle: DialogueTree = {
  startNodeId: 'ce_post_1',
  nodes: [
    {
      id: 'ce_post_1',
      speaker: 'Cavern Echo',
      text: 'You kept the right voices alive. The cave thanks you for asking after them.',
      nextNodeId: 'ce_post_2',
    },
    {
      id: 'ce_post_2',
      speaker: 'Cavern Echo',
      text: [
        'The Codex names this an LRU CACHE — a Least-Recently-Used eviction policy.',
        'A hash map gives you the echo in O(1). A doubly-linked list keeps "freshest" and "oldest" at your fingertips.',
      ],
      nextNodeId: 'ce_post_3',
    },
    {
      id: 'ce_post_3',
      speaker: 'Cavern Echo',
      text: [
        'Together — map + list — every shout, every drop, every refresh runs in constant time.',
        'Memory is finite. The pattern decides what survives.',
      ],
    },
  ],
};

// ─── Hash Highlands Glitch milestone cameos ────────────────────────────────────
// Two beats matched to ArrayPlains / TwinRivers cadence: HH-1 (player just
// proved direct addressing) and HH-3 (mid-region peak after anagram grouping).
// Glitch arrives, brags about brute force, then trails off.

export const HASH_HIGHLANDS_GLITCH_DIALOGUE: Record<string, { speaker?: string; text: string }[]> = {
  // Fires after HH-1 completes. Glitch is mad they had to check every gate.
  hh_1: [
    { text: 'You DIDN\'T check every gate? You just... knew which one?' },
    { text: 'I tried every nameplate at every gate. Some gates I tried THREE times because I forgot.' },
    { text: 'Whatever. I was about to figure out the "addresses go directly" thing.' },
    { speaker: 'Narrator', text: '(They were not.)' },
  ],
  // Fires after HH-3 completes. Anagrams broke Glitch's brute-force pride.
  hh_3: [
    { text: 'WORD STONES? I tried matching every stone to every OTHER stone.' },
    { text: 'I did 144 comparisons and got two families wrong.' },
    { text: 'You just... computed one name per stone? And dropped them in piles?' },
    { text: 'I don\'t want to talk about it. I\'m going to the cavern. ALONE.' },
  ],
};

export const HASH_HIGHLANDS_GLITCH_EXIT_LINES: string[] = [
  'I MEANT to do it the slow way!',
  'Don\'t look at me like that.',
  'I figured it out. Eventually. PROBABLY.',
];
