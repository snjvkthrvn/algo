/**
 * Glitch encounter dialogue, indexed by encounter stage.
 * Stage 1: first taunt in the Prologue.
 * Stage 2: grudging respect after the Sentinel.
 * Stage 3+: reserved for later acts.
 */

import type { DialogueTree } from '../types';

export interface GlitchLine {
  /** Optional speaker override — used to attribute narrator asides without breaking voice. */
  speaker?: string;
  text: string;
}

export const GLITCH_DIALOGUE: Record<number, GlitchLine[]> = {
  // Scene 0-5: Glitch is caught failing at the consoles after the player has
  // already earned the rune shard. Surprise + brute-force confession + dash off.
  1: [
    { text: "Wha— don't look at me like that. The shapes are confusing." },
    { text: "Wait. You got a SHARD already? From the tile thing?" },
    { text: "Took me FOREVER. I just kept trying every tile until one stuck." },
    { text: "Whatever. I had a strategy here too — try every shard in every console, eventually one fits." },
    { text: "Bet I beat you to the gate." },
  ],
  2: [
    { text: "You beat the Sentinel too?" },
    { text: "I tried every pattern, every socket, every possible order. It was a lot." },
    { text: "You just... combined the two rules and walked through." },
    { text: "Whatever. I was going to the Array Plains anyway." },
  ],
  3: [
    { text: "Your Bit looks different. It's grown." },
    { text: "Mine never does that. I keep starting over." },
    { text: "How do you get it to change? Never mind. I figured it out myself anyway." },
    { speaker: 'Narrator', text: "(They did not figure it out.)" },
  ],
};

export const GLITCH_EXIT_LINES: string[] = [
  "I MEANT to do that!",
  "Don't follow me.",
  "I'm not impressed.",
  "Whatever.",
];

// --- Cameo Dialogue Trees ---

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
      text: 'I could swap tiles all day, faster than you! I just swap until it looks good.',
      nextNodeId: 'next_2',
    },
    {
      id: 'next_2',
      speaker: 'Glitch',
      text: 'You think you are clever just because the field is sorted? Pff. I am heading to the deeper fields.',
    },
  ],
};

export const glitchAP4Dialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Glitch',
      text: 'Complements? Targets? Sounds like you are overcomplicating simple arithmetic!',
      nextNodeId: 'next_1',
    },
    {
      id: 'next_1',
      speaker: 'Glitch',
      text: 'I just guess numbers until they add up. It is way more organic.',
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
      text: 'You are trying to meet in the middle? I walk wherever I want, anyway.',
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
      text: 'I just throw a massive net over the whole river! Who cares about constant size?',
      nextNodeId: 'next_2',
    },
    {
      id: 'next_2',
      speaker: 'Glitch',
      text: 'This river is too small for me anyway. I am heading upstream!',
    },
  ],
};

