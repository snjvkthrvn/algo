/**
 * Glitch encounter dialogue — a full character arc, not just a recurring joke.
 *
 * The previous version had three stunted stages plus a comment ("Stage 3+:
 * reserved for later acts") that signaled the writer had run out of ideas.
 * Glitch is the comic foil for brute-force thinking, but a foil who never
 * changes is just a stock joke; the player will tune them out by encounter
 * three. This file gives Glitch a real arc across the first three regions:
 *
 *   Stage 1: First taunt in the Prologue (post P0_1)
 *   Stage 2: Grudging respect after the Sentinel
 *   Stage 3: Array Plains entry — first notices Bit has grown
 *   Stage 4: Mid Array Plains — jealous, accuses you of "knowing tricks"
 *   Stage 5: Twin Rivers entry — tries to imitate, botches it
 *   Stage 6: Mid Twin Rivers — frustrated, drops the bravado for one beat
 *   Stage 7: Post Mirror Serpent — quiet acknowledgment, leaves a thread
 *
 * Each stage runs 3-5 lines. Exit-line pool is expanded from 4 to 16 so
 * cameos do not repeat the same sign-off. Failure taunts are added so the
 * world reacts when the player fails a puzzle (Glitch heckles in good fun;
 * the previous silence on failure was its own problem).
 */

import type { DialogueTree } from '../types';

export interface GlitchLine {
  /** Optional speaker override — used to attribute narrator asides without breaking voice. */
  speaker?: string;
  text: string;
}

export const GLITCH_DIALOGUE: Record<number, GlitchLine[]> = {
  // Stage 1 — Prologue, after the player solves P0_1.
  // Glitch is caught failing at the consoles, brags about brute force, dashes off.
  1: [
    { text: "Wha— don't look at me like that. The shapes are confusing." },
    { text: "Wait. You got a SHARD already? From the tile thing?" },
    { text: "Took me FOREVER. I just kept trying every tile until one stuck." },
    { text: "Whatever. I had a strategy here too — try every shard in every console, eventually one fits." },
    { text: "Bet I beat you to the gate." },
  ],

  // Stage 2 — Post-Sentinel. Surprised by composition.
  2: [
    { text: "You beat the Sentinel too?" },
    { text: "I tried every pattern, every socket, every possible order. It was a LOT." },
    { text: "You just… combined the two rules and walked through." },
    { text: "Combined them. Like they were one thing. I do not get how you DID that." },
    { text: "Whatever. I was going to the Array Plains anyway." },
  ],

  // Stage 3 — Array Plains entry. First time Glitch notices Bit has changed.
  // Bit went SPARK → BYTE after the Sentinel — visible to Glitch, who pretends not to care.
  3: [
    { text: "Your Bit looks different. It's grown." },
    { text: "Mine never does that. I keep starting over." },
    { text: "How do you get it to change? Never mind. I figured it out myself anyway." },
    { speaker: 'Narrator', text: '(They did not figure it out.)' },
  ],

  // Stage 4 — Mid Array Plains. The jealous accusation stage.
  // Glitch has been failing the same farm puzzles you're breezing through.
  4: [
    { text: "Okay. I have been WATCHING you." },
    { text: "You are not even rushing. You walk up, look, and the answer is already in your head." },
    { text: "There is a trick. There is DEFINITELY a trick and the farmers are showing it to you." },
    { text: "They never show ME. I asked. They just hand me a rake and walk off." },
    { text: "I am going ahead to the rivers. I will figure it out myself before you get there." },
  ],

  // Stage 5 — Twin Rivers entry. Glitch has tried to imitate patterns and botched.
  // First crack in the bravado — admits the bravado is the bravado.
  5: [
    { text: "Oh good. You. Yeah, hi. Listen." },
    { text: "I tried doing the 'walk from both ends' thing the Mirror Walker does." },
    { text: "I ended up at one end. Then the other end. Then back at the first end." },
    { text: "I think I was supposed to do them at the same time? With two of me?" },
    { text: "You know what, never mind. I am sliding a net somewhere. It will be fine." },
  ],

  // Stage 6 — Mid Twin Rivers. The brief honest beat.
  // Glitch admits they're tired. Drops the routine for a moment.
  // This is the only stage where Glitch is not posturing. Use sparingly.
  6: [
    { text: "Hey." },
    { text: "Do not say anything about this conversation. To anyone." },
    { text: "I have been running every puzzle ten, twenty times. I get them eventually." },
    { text: "But you get them once. Every time. And your Bit keeps changing." },
    { text: "I am not asking for help. I am just — saying. The way you do it. It works." },
    { text: "…ANYWAY. The Serpent is up ahead. I will be the one who beats it first." },
  ],

  // Stage 7 — Post Mirror Serpent. The thread for later acts.
  // Glitch is quiet for the first time. No brag, no bravado.
  // Foreshadows return in the Hash Highlands or beyond.
  7: [
    { text: "You beat the Serpent." },
    { text: "I did not." },
    { text: "I will. Not today." },
    { text: "There is something in the highlands. A keeper who only takes one student at a time." },
    { text: "Maybe I will let you go ahead. For now." },
    { speaker: 'Narrator', text: "(Glitch does not leave. They watch you walk through the gate, then sit down on the cliff's edge.)" },
  ],
};

/**
 * Expanded exit-line pool — 16 entries for 7+ cameos means each sign-off
 * is unlikely to repeat in a single playthrough. Maintain the voice:
 * brash, dismissive, occasionally betraying that they're paying attention.
 */
export const GLITCH_EXIT_LINES: string[] = [
  "I MEANT to do that!",
  "Don't follow me.",
  "I'm not impressed.",
  "Whatever.",
  "You got lucky.",
  "This place is rigged.",
  "I had it. I HAD it.",
  "Save it.",
  "Tell Bit it's lopsided.",
  "I knew that.",
  "Pfff. Easy.",
  "I let you have that one.",
  "Lucky guess.",
  "I'm not even trying.",
  "Tell anyone and I'll deny it.",
  "Catch up.",
];

/**
 * Failure taunts — fire when the player fails a puzzle attempt while Glitch
 * is the active cameo in that region. Keeps the world from going silent on
 * failure (the audit flagged that as a meaningful problem). Each taunt is
 * one line; the player should be able to dismiss with a single tap.
 *
 * Tone: heckling-but-fond. Glitch is not cruel, just smug. The point is
 * for the player to notice the world reacted, not to feel punished.
 */
export const GLITCH_FAILURE_TAUNTS: string[] = [
  "Ha! Bet you didn't see that one.",
  "Try guessing. It works for me.",
  "Maybe slow down. Or speed up. I forget which.",
  "Welcome to MY world.",
  "Bit looks embarrassed for you.",
  "Want me to take over? No? Okay.",
  "I was rooting for you. Genuinely.",
  "Closer than I would have got, honestly.",
];

/**
 * In-puzzle Glitch banter — the live voice of the brute-force rival WHILE you
 * play, fed to BruteForceActor so each puzzle's foil heckles in character.
 *
 * Hard rule (FEEL_IT contract): lines brag about Glitch's brute-force approach
 * and NEVER teach the technique. Each set is themed to its keeper's world
 * (furrows, baskets, bins, tiles, river) so the rival ties into the lore.
 *
 *   opening — fires once as play begins.
 *   brags   — Glitch crows about flailing through it; cycled on a slow timer.
 *   defeat  — fires when you out-solve them and the actor freezes.
 */
export interface GlitchBanterConfig {
  readonly opening?: string;
  readonly brags?: ReadonlyArray<string>;
  readonly defeat?: ReadonlyArray<string>;
}

export const GLITCH_BANTER: Record<string, GlitchBanterConfig> = {
  // Array Plains — Sorting Shed (swap furrows). Glitch grabs rows at random.
  ap_1: {
    opening: "Swapping neighbors? That's your big plan?",
    brags: [
      "I could swap furrows all day. Faster than you, even.",
      "I just grab rows till it looks right. Way more natural.",
      "Order is for people who can't handle a little chaos.",
    ],
    defeat: GLITCH_EXIT_LINES,
  },
  // Indexing Barn (go straight to slot N). Glitch lifts every lid.
  ap_2: {
    opening: "Painted numbers? I just open every lid till I find it.",
    brags: [
      "Slot four, slot two — who cares, I'll check them all.",
      "Lids are MEANT to be opened. All of them.",
      "Why remember where things are? Searching builds character.",
    ],
    defeat: GLITCH_EXIT_LINES,
  },
  // Grain Hopper (a rule decides the bin). Glitch tosses crops anywhere.
  ap_3: {
    opening: "A rule for which bin? Nah. I just toss crops till they land.",
    brags: [
      "Same crop, different bin every time. Keeps it exciting.",
      "Sorting by a formula sounds like a LOT of thinking.",
      "I lose track of half of them. That's the fun part.",
    ],
    defeat: GLITCH_EXIT_LINES,
  },
  // Pairing Grounds (complement = target − x). Glitch guesses pairs.
  ap_4: {
    opening: "Complements? Targets? I just guess numbers till they add up.",
    brags: [
      "Check every pair, every time. Thorough, that's me.",
      "You're overcomplicating arithmetic, you know that?",
      "I'll try all of them. Eventually one works.",
    ],
    defeat: GLITCH_EXIT_LINES,
  },
  // Twin Rivers — Mirror Walk (two pointers). Glitch walks one way at a time.
  tr_1: {
    opening: "Walk from both ends at once? Why not just walk normally?",
    brags: [
      "I'll reach the middle eventually. From one side. Like a NORMAL person.",
      "Two of me? There's barely room for the one.",
      "Back, then forth, then back. Basically the same thing.",
    ],
    defeat: GLITCH_EXIT_LINES,
  },
  // Pointer Bridge (converge). Glitch crosses wherever, twice.
  tr_2: {
    opening: "Meet in the middle? I just cross wherever I want.",
    brags: [
      "I'll check every plank. Some of them twice.",
      "Bridges are more of a suggestion, really.",
      "Why aim for the middle? I'll stumble onto it.",
    ],
    defeat: GLITCH_EXIT_LINES,
  },
  // Fixed Window (constant-size net). Glitch nets the whole river.
  tr_3: {
    opening: "A sliding net? I just throw a giant one over the whole river.",
    brags: [
      "Constant size? My net is constant-ENORMOUS.",
      "Re-counting every fish, every time. Very rigorous.",
      "Who needs a window when you can have the whole river?",
    ],
    defeat: GLITCH_EXIT_LINES,
  },
  // Current Rider (variable window on the stream). Glitch thrashes downstream.
  tr_4: {
    opening: "Riding the current? I just thrash around till I'm downstream.",
    brags: [
      "I'll re-check the whole stretch. Twice, for safety.",
      "Windows, currents — I go fast and hope.",
      "Eventually the river does the work for me.",
    ],
    defeat: GLITCH_EXIT_LINES,
  },
};

// ─── Cameo Dialogue Trees ─────────────────────────────────────────────────────
// Sparse on purpose: Glitch shouldn't appear after every puzzle (that would
// devalue them). The cameos fire at AP_1, AP_4, TR_1, TR_3 — bookending each
// region's first and last puzzle.

export const glitchAP1Dialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Glitch',
      text: 'Swapping neighbors? That is what you call a strategy?',
      nextNodeId: 'next_1',
    },
    {
      id: 'next_1',
      speaker: 'Glitch',
      text: 'I could swap tiles all day, faster than you. I just swap until it looks right.',
      nextNodeId: 'next_2',
    },
    {
      id: 'next_2',
      speaker: 'Glitch',
      text: 'You think you are clever because the field is sorted? Pfff. I am heading to the deeper fields.',
    },
  ],
};

export const glitchAP4Dialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Glitch',
      text: 'Complements? Targets? Sounds like you are overcomplicating arithmetic.',
      nextNodeId: 'next_1',
    },
    {
      id: 'next_1',
      speaker: 'Glitch',
      text: 'I just guess numbers until they add up. Way more natural.',
      nextNodeId: 'next_2',
    },
    {
      id: 'next_2',
      speaker: 'Glitch',
      text: 'Whatever. The gate to Twin Rivers is unlocked. I am going to find some real challenges.',
    },
  ],
};

export const glitchTR1Dialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Glitch',
      text: 'Walking from both ends at the same time? Why not just walk normally?',
      nextNodeId: 'next_1',
    },
    {
      id: 'next_1',
      speaker: 'Glitch',
      text: 'You are trying to meet in the middle? I walk wherever I want.',
      nextNodeId: 'next_2',
    },
    {
      id: 'next_2',
      speaker: 'Glitch',
      text: 'There is a bridge ahead. I bet I cross it before you even figure out where to step.',
    },
  ],
};

export const glitchTR3Dialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Glitch',
      text: 'A sliding net? You are trapping fish by keeping the size constant?',
      nextNodeId: 'next_1',
    },
    {
      id: 'next_1',
      speaker: 'Glitch',
      text: 'I just throw a massive net over the whole river. Who cares about constant size?',
      nextNodeId: 'next_2',
    },
    {
      id: 'next_2',
      speaker: 'Glitch',
      text: 'This river is too small for me anyway. I am heading upstream.',
    },
  ],
};
