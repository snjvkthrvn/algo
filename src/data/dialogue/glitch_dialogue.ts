/**
 * Glitch encounter dialogue, indexed by encounter stage.
 * Stage 1: first taunt in the Prologue.
 * Stage 2: grudging respect after the Sentinel.
 * Stage 3+: reserved for later acts.
 */

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
