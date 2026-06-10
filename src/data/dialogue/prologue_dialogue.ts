/**
 * Prologue NPC dialogue — sourced from POKEMON_STYLE_GAME_SCRIPT.md
 *
 * Voice rules (from the script):
 *   Professor Node: warm, slightly absent-minded, genuinely excited mentor
 *   Rune Keeper:    ancient, poetic — "voice like wind through crystal"
 *   Console Keeper: precise, measured, goggles-and-circuitry analytical
 *   Glitch:         quick, brash, overconfident — comic foil for brute force
 *
 * FEEL → NAME rule: algorithm names appear ONLY in post-puzzle lines.
 */

import type { DialogueTree } from '../types';

// ─── Professor Node ────────────────────────────────────────────────────────────

// Scene 0-2 from the script — the player's first real agency. Node greets
// the freshly-woken player, then hands them a genuine choice of what to ask.
// Each branch delivers DISTINCT lore (the world / the companion / the
// purpose) before converging on the same gentle "go explore" guidance, so
// the choice is real flavour, not decoration. Kept tight — one beat per
// branch — so it never becomes the 60-90s exposition wall it once was.
// The deeper payoff ("two halves of the same process") still lands later in
// professorNodePostPuzzle, where the player has earned it.
export const professorNodeDialogue: DialogueTree = {
  startNodeId: 'intro_1',
  nodes: [
    {
      id: 'intro_1',
      speaker: 'Professor Node',
      text: 'There you are! I was starting to worry. And — a Construct already at your side, born alongside you. That means you two are linked.',
      nextNodeId: 'intro_2',
    },
    {
      id: 'intro_2',
      speaker: 'Professor Node',
      text: "I'm Professor Node. Welcome to the space between thought and understanding — the Chamber of Flow. What's on your mind?",
      choices: [
        { text: 'Where am I?', nextNodeId: 'ask_where' },
        { text: "What's that little light?", nextNodeId: 'ask_bit' },
        { text: 'What do I do here?', nextNodeId: 'ask_do' },
      ],
    },
    {
      id: 'ask_where',
      speaker: 'Professor Node',
      text: [
        'The Chamber of Flow — a starting area. The first page of a very long, very exciting book.',
        'Beyond it: farmlands, rivers, mountains, forests — each one alive with puzzles and people. But first, let\'s make sure you can walk before we ask you to run.',
      ],
      nextNodeId: 'intro_guidance',
    },
    {
      id: 'ask_bit',
      speaker: 'Professor Node',
      text: [
        'A Construct — a living fragment of logic. It was born with you. Two halves of the same restoration.',
        "It's just a Spark now. But every concept you master, every puzzle you solve, your Construct absorbs. Take good care of this one.",
      ],
      nextNodeId: 'intro_guidance',
    },
    {
      id: 'ask_do',
      speaker: 'Professor Node',
      text: [
        'The best question anyone can ask! You explore. You solve puzzles. You discover how this world works.',
        "But we don't start with theory. We start with your feet. Walk, try things — the world will teach you.",
      ],
      nextNodeId: 'intro_guidance',
    },
    {
      id: 'intro_guidance',
      speaker: 'Professor Node',
      text: 'See the glowing tiles to the northwest? The floating consoles to the northeast? The Rune Keeper and the Console Keeper are waiting. Either way works — try whichever calls to you.',
      nextNodeId: 'intro_end',
    },
    {
      id: 'intro_end',
      speaker: 'Professor Node',
      text: "And keep an eye on your little friend. Constructs notice what we miss. Off you go.",
      actions: [{ type: 'set_flag', value: 'professor_node_intro_done' }],
    },
  ],
};

// Post-puzzle (fires after BOTH P0_1 and P0_2 are complete, before the
// Sentinel). This absorbs the lore that used to live in the intro — now
// the player has done the walking, so "the space between thought and
// understanding" lands as observation rather than preamble.
export const professorNodePostPuzzle: DialogueTree = {
  startNodeId: 'post_1',
  nodes: [
    {
      id: 'post_1',
      speaker: 'Professor Node',
      text: "Both shards. The sequence and the mapping. You've learned the two atoms of logic.",
      nextNodeId: 'post_2',
    },
    {
      id: 'post_2',
      speaker: 'Professor Node',
      text: [
        'A sequence followed. A pattern matched. Simple ideas — but every program ever written is built from those two, recombined.',
        "This Chamber is what scholars call the space between thought and understanding. You felt the thought. Now you can stand inside the understanding.",
      ],
      nextNodeId: 'post_3',
    },
    {
      id: 'post_3',
      speaker: 'Professor Node',
      text: [
        "Bit has changed — look. It is no longer just a spark. Every concept you master, your Construct absorbs. You and it were always two halves of the same process.",
        "Beyond this chamber is the Sentinel. Not unfriendly. Just thorough. Trust what you already know.",
      ],
    },
  ],
};

// ─── Rune Keeper ───────────────────────────────────────────────────────────────
// Voice: ancient, poetic — "wind through crystal" — sparse, not chatty

// Scene 0-4 from the script — serene, poetic. The runes teach ORDER simply
// by glowing in sequence; the player walks what they showed. No algorithm
// name leaks here (that lands in `runeKeeperPostPuzzle`). The companion line
// sets up Bit's in-puzzle role as a sequence-tracer.
export const runeKeeperDialogue: DialogueTree = {
  startNodeId: 'rk_intro_1',
  nodes: [
    {
      id: 'rk_intro_1',
      speaker: 'Rune Keeper',
      text: 'You are awake. Good. The runes remember — they remember the order of all things.',
      nextNodeId: 'rk_intro_2',
    },
    {
      id: 'rk_intro_2',
      speaker: 'Rune Keeper',
      text: 'Watch them glow. First, then second, then third. The order is the meaning.',
      nextNodeId: 'rk_intro_3',
    },
    {
      id: 'rk_intro_3',
      speaker: 'Rune Keeper',
      text: 'Walk where they show you, in the order they showed you. One step at a time. That is how all journeys begin.',
      nextNodeId: 'rk_challenge',
    },
    {
      id: 'rk_challenge',
      speaker: 'Rune Keeper',
      text: 'Are you ready to walk the pattern?',
      choices: [
        { text: "I'm ready.", nextNodeId: 'rk_start_puzzle' },
        { text: 'Tell me more.', nextNodeId: 'rk_explain' },
      ],
    },
    {
      id: 'rk_explain',
      speaker: 'Rune Keeper',
      text: [
        'Four chants. Each longer than the last. Each tests whether you remember the order.',
        'Your spark companion will drift near the next glowing rune. Trust what it shows you.',
        'When you are ready.',
      ],
      nextNodeId: 'rk_challenge',
    },
    {
      id: 'rk_start_puzzle',
      speaker: 'Rune Keeper',
      text: 'Step forward. The runes await — in order.',
      actions: [{ type: 'start_puzzle', value: 'p0_1' }],
    },
  ],
};

// Post-puzzle naming. This is the load-bearing educational beat for P0_1 —
// the moment "you walked some hexes in order" gets reframed as the
// foundational CS atom of *sequence*. Strengthened to (a) explicitly contrast
// the player vs. Glitch, (b) plant the "two atoms of logic" framing that
// P0_2's mapping puzzle will complete, and (c) make the educational payload
// land harder than the puzzle's surface mechanic suggests.
export const runeKeeperPostPuzzle: DialogueTree = {
  startNodeId: 'rk_post_1',
  nodes: [
    {
      id: 'rk_post_1',
      speaker: 'Rune Keeper',
      text: 'You heard the pattern. You walked the sequence — in order.',
      nextNodeId: 'rk_post_2',
    },
    {
      id: 'rk_post_2',
      speaker: 'Rune Keeper',
      text: [
        'Glitch hopped the same runes you did. But in the wrong order.',
        'That is the difference between you and them. Not what — but when.',
      ],
      nextNodeId: 'rk_post_3',
    },
    {
      id: 'rk_post_3',
      speaker: 'Rune Keeper',
      text: [
        'What you just did is the most fundamental act in all of logic: follow instructions in order.',
        'First this. Then that. Then the next.',
        'It has a name. SEQUENCE. The first atom of every program ever written.',
      ],
      nextNodeId: 'rk_post_4',
    },
    {
      id: 'rk_post_4',
      speaker: 'Rune Keeper',
      text: [
        'Sequence alone is not enough. A program must also choose — which path, which fork, which door.',
        'That is the second atom. SELECTION. The Console Keeper will show you.',
        'When you hold both — sequence and selection — you hold everything Glitch needs but cannot grasp.',
      ],
      nextNodeId: 'rk_post_5',
    },
    {
      id: 'rk_post_5',
      speaker: 'Rune Keeper',
      text: [
        'A shard of understanding. Take it.',
        'Seek the Console Keeper next. The chamber still has more to repair.',
      ],
    },
  ],
};

// ─── Console Keeper ────────────────────────────────────────────────────────────
// Voice: precise, measured, analytical — steampunk goggles, circuit robes

export const consoleKeeperDialogue: DialogueTree = {
  startNodeId: 'ck_intro_1',
  nodes: [
    // Scene 0-6 from the script
    {
      id: 'ck_intro_1',
      speaker: 'Console Keeper',
      text: 'Each console accepts a specific shard. Triangle with double stripes goes to red. Diamond with single stripe to blue. Circle with triple stripes to green.',
      nextNodeId: 'ck_intro_2',
    },
    {
      id: 'ck_intro_2',
      speaker: 'Console Keeper',
      text: 'This isn\'t about memorizing. It\'s about matching. Every piece has exactly one place where it belongs.',
      nextNodeId: 'ck_challenge',
    },
    {
      id: 'ck_challenge',
      speaker: 'Console Keeper',
      text: 'Your companion seems drawn to certain consoles. Worth paying attention to.',
      choices: [
        { text: 'Let\'s do it.', nextNodeId: 'ck_start_puzzle' },
        { text: 'Walk me through it.', nextNodeId: 'ck_explain' },
      ],
    },
    {
      id: 'ck_explain',
      speaker: 'Console Keeper',
      text: [
        'Three shards, three consoles. Look at the shape and stripe pattern on each shard.',
        'Find the console displaying that exact combination. Carry the shard to it.',
        'The central core lights up as connections are restored.',
      ],
      nextNodeId: 'ck_challenge',
    },
    {
      id: 'ck_start_puzzle',
      speaker: 'Console Keeper',
      text: 'The shards are scattered. Good luck.',
      actions: [{ type: 'start_puzzle', value: 'p0_2' }],
    },
  ],
};

// Post-puzzle naming for P0_2. Reconciled with the current puzzle mechanic
// (fork-routing / pulse-through-switches), which is SELECTION / control flow,
// NOT key-value mapping. Calls back explicitly to the Rune Keeper's SEQUENCE
// naming so the prologue's two-atoms-of-logic trilogy lands by the time the
// player meets the Sentinel.
export const consoleKeeperPostPuzzle: DialogueTree = {
  startNodeId: 'ck_post_1',
  nodes: [
    {
      id: 'ck_post_1',
      speaker: 'Console Keeper',
      text: 'Every fork set. Every pulse home. The signal flows again.',
      nextNodeId: 'ck_post_2',
    },
    {
      id: 'ck_post_2',
      speaker: 'Console Keeper',
      text: [
        'What you just did has a name. SELECTION.',
        'At every fork the signal could go two ways. You chose. And the choice you made for one fork constrained the next.',
        'It is the second atom of every program ever written. The Rune Keeper showed you the first — sequence. Now you have both.',
      ],
      nextNodeId: 'ck_glitch_appears',
    },
    {
      id: 'ck_glitch_appears',
      speaker: 'Glitch',
      text: 'I don\'t get it. I tried EVERY combination and it took forever. You just... KNEW?',
      nextNodeId: 'ck_player_choice',
    },
    {
      id: 'ck_player_choice',
      speaker: '...',
      text: 'How do you explain it?',
      choices: [
        { text: 'Look at the symbols. Each piece matches one console.', nextNodeId: 'ck_response_a' },
        { text: 'Your way works too — it just takes longer.', nextNodeId: 'ck_response_b' },
      ],
    },
    {
      id: 'ck_response_a',
      speaker: 'Glitch',
      text: [
        'Huh. So instead of trying every fork at random... you read each one and CHOSE.',
        'And once you chose, the next fork only had one right answer.',
        '...That\'s annoyingly smart.',
      ],
      nextNodeId: 'ck_glitch_exit',
    },
    {
      id: 'ck_response_b',
      speaker: 'Glitch',
      text: [
        'Yeah, but SMASHING every fork until something works gets you there too. Sometimes.',
        'Maybe. ...Fine. Maybe I should READ the forks before I kick them.',
      ],
      nextNodeId: 'ck_glitch_exit',
    },
    {
      id: 'ck_glitch_exit',
      speaker: 'Glitch',
      text: 'Whatever. I\'m going to check out that gate. Don\'t follow me.',
    },
  ],
};
