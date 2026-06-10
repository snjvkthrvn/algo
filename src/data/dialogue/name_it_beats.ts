/**
 * Name-It beats — the single FEEL→NAME moment after each puzzle solve
 * (docs/VISION.md §3). Each beat is the keeper of that puzzle naming what
 * the player just DID, in one or two lines, in their script voice
 * (docs/story/game_script.md post-puzzle scenes). No lecture: the Codex
 * carries the deep layer.
 *
 * Bosses are intentionally absent — their victory beats are staged inside
 * the boss scenes themselves.
 */

import type { NameItBeatData } from '../../ui/NameItBeat';

export const NAME_IT_BEATS: Record<string, NameItBeatData> = {
  p0_1: {
    speaker: 'Rune Keeper',
    conceptName: 'Sequences',
    lines: [
      'You hear the pattern. You walk the sequence. First this, then that, then the next.',
      'That is the most fundamental act in all of logic. The runes will remember you.',
    ],
  },
  p0_2: {
    speaker: 'Console Keeper',
    conceptName: 'Mapping',
    lines: [
      'You did not search. You matched — each key straight to its one console.',
      'That is mapping: this goes with that, instantly. Hold onto that feeling.',
    ],
  },
  ap_1: {
    speaker: 'Sorting Farmer',
    conceptName: 'Bubble Sort',
    lines: [
      'Neighbor against neighbor, swap by swap, until the whole row stood in order.',
      "Farmers call that patience. Logic calls it sorting — and you just felt how it grows.",
    ],
  },
  ap_2: {
    speaker: 'Basket Keeper',
    conceptName: 'Indexing',
    lines: [
      'You knew the number, so you walked straight to the basket. No counting, no searching.',
      'That is indexing — one step to any slot, no matter how long the row gets.',
    ],
  },
  ap_3: {
    speaker: 'Crop Sorter',
    conceptName: 'Hashing',
    lines: [
      'The formula told you where each grain belonged before you ever looked.',
      'That is a hash: a rule that turns a name into a place.',
    ],
  },
  ap_4: {
    speaker: 'Tile Worker',
    conceptName: 'Two Sum',
    lines: [
      'You never checked every pair. You remembered what you saw and asked for its partner.',
      'Knowing what you need beats searching for it — that is the heart of Two Sum.',
    ],
  },
  tr_1: {
    speaker: 'Mirror Walker',
    conceptName: 'Two Pointers',
    lines: [
      'Two walkers. Two ends. One meeting.',
      'That is two pointers — closing in from both sides at once, skipping what you do not need.',
    ],
  },
  tr_2: {
    speaker: 'Bridge Keeper',
    conceptName: 'Convergence',
    lines: [
      'You let both banks walk toward the truth, and the truth met you in the middle.',
      'On sorted ground, meeting is fast. That is convergence.',
    ],
  },
  tr_3: {
    speaker: 'Window Fisher',
    conceptName: 'Sliding Window',
    lines: [
      'One frame on the river. You slid it forward and never once looked back.',
      'That is a sliding window — carry the frame, drop what leaves, add what enters.',
    ],
  },
  tr_4: {
    speaker: 'Current Rider',
    conceptName: 'Variable Window',
    lines: [
      'You stretched the net while the current allowed it, and cut it the moment the rule broke.',
      'A window that grows and shrinks as it must — that is how you ride a changing stream.',
    ],
  },
};

export function getNameItBeat(puzzleId: string): NameItBeatData | undefined {
  return NAME_IT_BEATS[puzzleId];
}
