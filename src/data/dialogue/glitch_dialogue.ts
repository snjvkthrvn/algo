/**
 * Glitch encounter dialogue — indexed by encounterStage.
 * Stage 1: first taunt (Prologue)
 * Stage 2: grudging respect (Array Plains)
 * Stage 3: genuine curiosity (Twin Rivers)
 * Stage 4+: reserved for later acts
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
    { text: "You again? You actually finished the Arrays?" },
    { text: "...I had to try 847 combinations. You did it in — how many?" },
    { text: "Not that it matters. Speed isn't everything." },
    { text: "...right?" },
  ],
  3: [
    { text: "Your Bit looks different. It's grown." },
    { text: "Mine never does that. I keep starting over." },
    { text: "How do you get it to — nevermind. I figured it out myself anyway." },
    { text: "(They didn't figure it out.)" },
  ],
};

export const GLITCH_EXIT_LINES: string[] = [
  "Don't follow me.",
  "I'm not impressed.",
  "See you never.",
  "Whatever.",
];
