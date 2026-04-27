/**
 * Glitch encounter dialogue — indexed by encounterStage.
 * Stage 1: first taunt (Prologue)
 * Stage 2: grudging respect (Array Plains)
 * Stage 3: genuine curiosity (Twin Rivers)
 * Stage 4+: reserved for later acts
 */

export interface GlitchLine {
  text: string;
  duration: number; // ms to display before auto-dismiss
}

export const GLITCH_DIALOGUE: Record<number, GlitchLine[]> = {
  1: [
    { text: "Oh. A Spark. How... quaint.", duration: 2200 },
    { text: "I've solved this whole region already. Brute-forced every path.", duration: 2800 },
    { text: "Enjoy your little companion. You'll need it.", duration: 2200 },
  ],
  2: [
    { text: "You again? You actually finished the Arrays?", duration: 2200 },
    { text: "...I had to try 847 combinations. You did it in — how many?", duration: 2800 },
    { text: "Not that it matters. Speed isn't everything.", duration: 2000 },
    { text: "...right?", duration: 1400 },
  ],
  3: [
    { text: "Your Bit looks different. It's grown.", duration: 2000 },
    { text: "Mine never does that. I keep starting over.", duration: 2400 },
    { text: "How do you get it to — nevermind. I figured it out myself anyway.", duration: 2800 },
    { text: "(They didn't figure it out.)", duration: 1600 },
  ],
};

export const GLITCH_EXIT_LINES: string[] = [
  "Don't follow me.",
  "I'm not impressed.",
  "See you never.",
  "Whatever.",
];
