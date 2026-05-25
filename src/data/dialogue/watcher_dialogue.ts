/**
 * Watcher dialogue — the cosmic observer at the cliff above the gateway.
 *
 * The Watcher previously existed only as a fly-by sprite with no narrative
 * payoff. This file gives them a brief, mysterious presence that bookends
 * the prologue: the player meets the Watcher AFTER defeating the Sentinel,
 * just before stepping through the gateway to Array Plains. Three lines.
 * No options. The Watcher does not invite conversation; they witness.
 *
 * Voice rules (additive to the project's character voices list):
 *   Watcher — cosmic, observant, conserves words, never explains itself.
 *             Speaks of the player in third person. Hints at The Core
 *             without naming it. Leaves before the player can reply.
 *
 * The post-Sentinel encounter sets the flag `watcher_first_seen`. A second,
 * shorter encounter fires post-Mirror-Serpent (returning to the Prologue
 * via the gateway) — same Watcher, half a beat warmer.
 */

import type { DialogueTree } from '../types';

// Fires post-Sentinel, before the player walks through the gateway.
// Three lines. Auto-advances. No choices. Watcher does not stay.
export const watcherFirstSightDialogue: DialogueTree = {
  startNodeId: 'sight_1',
  nodes: [
    {
      id: 'sight_1',
      speaker: 'Watcher',
      text: 'You.',
      nextNodeId: 'sight_2',
    },
    {
      id: 'sight_2',
      speaker: 'Watcher',
      text: 'I have been counting the ones who pass the Sentinel. You are seventeen.',
      nextNodeId: 'sight_3',
    },
    {
      id: 'sight_3',
      speaker: 'Watcher',
      text: 'Sixteen turned back at the highlands. The Core does not call seventeen often. Walk gently.',
      actions: [{ type: 'set_flag', value: 'watcher_first_seen' }],
    },
  ],
};

// Fires the second time the player returns to the Prologue chamber after
// defeating the Mirror Serpent — the Watcher has been waiting on the cliff.
// Slightly warmer. Still does not invite conversation.
export const watcherSecondSightDialogue: DialogueTree = {
  startNodeId: 'sight_1',
  nodes: [
    {
      id: 'sight_1',
      speaker: 'Watcher',
      text: 'Two regions, and your Construct still recognizes you. That is rare.',
      nextNodeId: 'sight_2',
    },
    {
      id: 'sight_2',
      speaker: 'Watcher',
      text: 'There is something at the Core that recognizes Constructs back. I will see you there, or I will not.',
      actions: [{ type: 'set_flag', value: 'watcher_second_seen' }],
    },
  ],
};
