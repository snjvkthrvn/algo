/**
 * Motion vocabulary — every tween in this puzzle sources its duration and ease from here.
 * Adding a new motion type? Name it. Don't paste magic numbers into call sites.
 */

export const MOTION = {
  enter: { duration: 320, ease: 'Cubic.easeOut' },
  settle: { duration: 240, ease: 'Cubic.easeOut' },
  chant: { duration: 360, ease: 'Sine.easeInOut' },
  mistake: { duration: 220, ease: 'Quad.easeOut' },
  win: { duration: 480, ease: 'Back.easeOut' },
} as const;

export const TIMING = {
  /** Beat between chant glyphs during preview. */
  chantStep: 620,
  /** Breath before a segment replay kicks in after a mistake. */
  segmentReplayPause: 260,
  /** Time between glyphs in the win cascade. */
  winStaggerStep: 70,
  /** Pause after the win cascade before continuing. */
  winHold: 420,
} as const;
