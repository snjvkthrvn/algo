/**
 * Glitch encounter dialogue, indexed by encounter stage.
 * Stage 1: first taunt in the Prologue.
 * Stage 2: grudging respect after the Sentinel.
 * Stage 3+: reserved for later acts.
 */

export interface GlitchLine {
  text: string;
}

export const GLITCH_DIALOGUE: Record<number, GlitchLine[]> = {
  1: [
    { text: "Oh. A Spark. How... quaint." },
    { text: "I've solved this whole region already. Brute-forced every path." },
    { text: "Enjoy your little companion. You'll need it." },
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
    { text: "How do you get it to change? Nevermind. I figured it out myself anyway." },
    { text: "(They did not figure it out.)" },
  ],
};

export const GLITCH_EXIT_LINES: string[] = [
  "Don't follow me.",
  "I'm not impressed.",
  "See you never.",
  "Whatever.",
];
