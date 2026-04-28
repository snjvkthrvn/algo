/**
 * Glitch encounter dialogue, indexed by encounter stage.
 * Stage 1: first taunt in the Prologue.
 * Stage 2: grudging respect after the Sentinel.
 * Stage 3+: reserved for later acts.
 */

export interface GlitchLine {
  text: string;
  duration: number;
}

export const GLITCH_DIALOGUE: Record<number, GlitchLine[]> = {
  1: [
    { text: "Oh. A Spark. How... quaint.", duration: 2200 },
    { text: "I've solved this whole region already. Brute-forced every path.", duration: 2800 },
    { text: "Enjoy your little companion. You'll need it.", duration: 2200 },
  ],
  2: [
    { text: "You beat the Sentinel too?", duration: 2200 },
    { text: "I tried every pattern, every socket, every possible order. It was a lot.", duration: 3000 },
    { text: "You just... combined the two rules and walked through.", duration: 2600 },
    { text: "Whatever. I was going to the Array Plains anyway.", duration: 2400 },
  ],
  3: [
    { text: "Your Bit looks different. It's grown.", duration: 2000 },
    { text: "Mine never does that. I keep starting over.", duration: 2400 },
    { text: "How do you get it to change? Nevermind. I figured it out myself anyway.", duration: 2800 },
    { text: "(They did not figure it out.)", duration: 1600 },
  ],
};

export const GLITCH_EXIT_LINES: string[] = [
  "Don't follow me.",
  "I'm not impressed.",
  "See you never.",
  "Whatever.",
];
