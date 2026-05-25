/**
 * Twin Rivers NPC dialogue — restored to honor the FEEL_IT → NAME_IT contract.
 *
 * Pre-puzzle (FEEL_IT): describes the river world and the GOAL, never the
 *   technique. No "two pointers", no "sliding window", no "complement".
 * Post-puzzle (NAME_IT): the keeper hands the city name + complexity in
 *   their own voice — each shaped by their relationship to the river.
 *
 * Voices:
 *   Mirror Walker  — contemplative, sees doubles and symmetries everywhere
 *   Bridge Keeper  — pragmatic, focused on what the load can bear
 *   Window Fisher  — patient, philosophical, talks to herself
 *   Current Rider  — bold, river-as-instructor, comfortable with risk
 *   River Guide    — wry, has seen this all before, conserves words
 *
 * The "Maybe later" decline option that lived here previously is removed
 * (Esc closes the dialogue if the player wants to walk away — a polite
 * NPC saying "okay" and standing in the same spot was not real agency).
 */

import type { DialogueTree } from '../types';

// ─── Mirror Walker ────────────────────────────────────────────────────────────

export const mirrorWalkerDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Mirror Walker',
      text: 'These shores are twinned, did you notice? Look across. Every cove on the left has a sibling on the right.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Mirror Walker',
      text: 'I am looking for the spot where their heights match. The river drew this map a long time ago, and somewhere across, a left elevation and a right elevation agree. I have walked one bank, then the other. It takes all day and I lose my place.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Mirror Walker',
      text: 'Would you walk the shore with me?',
      choices: [
        { text: 'Let us walk together.', nextNodeId: 'start_puzzle' },
        { text: 'Why would the two banks know each other?', nextNodeId: 'learn_more' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Mirror Walker',
      text: 'Because the river made both. What carved one carved the other. So the answer is somewhere in the relationship between them — not on either side alone. I think you have to look at both at once to see it.',
      nextNodeId: 'choice',
    },
    {
      id: 'start_puzzle',
      speaker: 'Mirror Walker',
      text: 'Step onto the bank. Watch the far shore as you walk. The river will show us the meeting.',
      actions: [{ type: 'start_puzzle', value: 'tr_1' }],
    },
  ],
};

export const mirrorWalkerPostDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Mirror Walker',
      text: 'There. The shores met. They knew each other the whole time. We just had to learn to read them.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Mirror Walker',
      text: 'A pilgrim from the city told me they have a phrase for what we just did. "Two pointers." Two fingers on a map, walking toward each other, talking as they meet. The river already does this. The pilgrim was excited to find it. I was not.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Mirror Walker',
      text: 'Pilgrim said the trick saves you from walking the map twice. "Linear" she called it — one pass, both eyes open. I would call it learning to see what was always there. The result is the same.',
    },
  ],
};

// ─── Bridge Keeper ────────────────────────────────────────────────────────────

export const bridgeKeeperDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Bridge Keeper',
      text: 'The bridge is down. I have a pile of stone segments on the left, another on the right, and a span to fill. The span has a fixed length.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Bridge Keeper',
      text: 'A segment from each side, joined end-to-end, must add up exactly. Too short, the gap stays. Too long, the bridge buckles. I tried every pile-versus-pile combination yesterday and the sun set before I finished.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Bridge Keeper',
      text: 'Will you help me reach the span?',
      choices: [
        { text: 'Let us build it.', nextNodeId: 'start_puzzle' },
        { text: 'Why was every-versus-every so slow?', nextNodeId: 'learn_more' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Bridge Keeper',
      text: 'Because each pile has dozens of segments, and I would lift one, walk it across, try every other one, walk it back. The grouping itself was the slowness. I have a feeling there is a better dance — start with the smallest and the largest, and adjust from there. Less lifting, more thinking.',
      nextNodeId: 'choice',
    },
    {
      id: 'start_puzzle',
      speaker: 'Bridge Keeper',
      text: 'To the spans, then. Mind the wet planks.',
      actions: [{ type: 'start_puzzle', value: 'tr_2' }],
    },
  ],
};

export const bridgeKeeperPostDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Bridge Keeper',
      text: 'Span filled. The bridge will hold. Try the lift. Solid.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Bridge Keeper',
      text: 'The pilgrims call this the same thing as the Mirror Walker — "two pointers" — but the city teachers say there are two flavors. Hers is "meet in the middle." Mine is "match the sum." Same hands, different question. They both lean on the piles being sorted before you start.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Bridge Keeper',
      text: 'The lesson, I think, is this: when the piles are already in order, the order does the work for you. Each move you make tells you which way to go next. No wasted lifting. The river taught the city this trick. The city forgot, then re-learned it, and now they teach apprentices.',
    },
  ],
};

// ─── Window Fisher ────────────────────────────────────────────────────────────

export const windowFisherDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Window Fisher',
      text: 'My net is a fixed size. Always K slots across, no more, no less. The river decides where the fish are. I decide where to stand.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Window Fisher',
      text: 'I want to stand in the spot where the most fish are passing through my net at one moment. The river is long. Counting from scratch every time I shift my feet is exhausting. By dusk I have only checked half the river.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Window Fisher',
      text: 'Will you try a few casts with me?',
      choices: [
        { text: 'Lower the net.', nextNodeId: 'start_puzzle' },
        { text: 'Why is counting from scratch so slow?', nextNodeId: 'learn_more' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Window Fisher',
      text: 'Because most of the fish do not leave when I shift my feet. The middle of the net stays. Only the edges change. I have a feeling I should be paying attention to what enters and what leaves, not what stays. That would save a lot of counting.',
      nextNodeId: 'choice',
    },
    {
      id: 'start_puzzle',
      speaker: 'Window Fisher',
      text: 'Down to the dock. The river does the rest.',
      actions: [{ type: 'start_puzzle', value: 'tr_3' }],
    },
  ],
};

export const windowFisherPostDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Window Fisher',
      text: 'Look at that haul. Did not have to count once after the first cast. The river practically counted for us.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Window Fisher',
      text: 'The pilgrims have a phrase for this — "fixed sliding window." Because the net is a window, and you slide it. They love their plain names. The trick is what I felt: do not recount the middle, only adjust the edges.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Window Fisher',
      text: 'They say without this trick the work is K times longer, because you would count every slot every time you stand somewhere new. With it, it stays "linear" — one pass down the river, however wide the net is. I think the river was trying to teach me this for years and I was too busy counting.',
    },
  ],
};

// ─── Current Rider ────────────────────────────────────────────────────────────

export const currentRiderDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Current Rider',
      text: 'Currents are not gentle today. I want to ride the LONGEST stretch I can without the force overwhelming my raft. Limit is up to me — past it, the raft comes apart.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Current Rider',
      text: 'Unlike the Fisher, my window is not fixed. I let it grow when the river is calm, shrink it when the force gets near my limit. The trick is doing that without losing the rhythm.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Current Rider',
      text: 'Want to ride alongside?',
      choices: [
        { text: 'I will take a raft.', nextNodeId: 'start_puzzle' },
        { text: 'Grow when calm, shrink when rough — that is the whole strategy?', nextNodeId: 'learn_more' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Current Rider',
      text: 'It is the only strategy that works. The river does not stop for you to plan. You feel the force build, you bring the front of the raft in. You feel it drop, you let the back of the raft drag farther. The window breathes with the river. That is the whole secret.',
      nextNodeId: 'choice',
    },
    {
      id: 'start_puzzle',
      speaker: 'Current Rider',
      text: 'Onto the rider platforms. The currents wait for no one — but if you read them, they cooperate.',
      actions: [{ type: 'start_puzzle', value: 'tr_4' }],
    },
  ],
};

export const currentRiderPostDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Current Rider',
      text: 'You rode the longest stretch I have ever seen anyone ride. The river respected you. That does not happen often.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Current Rider',
      text: 'The Fisher and I share a name with the pilgrims — "sliding window" — but her flavor is "fixed" and mine is "variable." Both feet of the window walk forward, but each foot chooses its own moment. That choice is the difference.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Current Rider',
      text: 'The pilgrims say it stays "linear" because each foot only walks forward once across the whole river, and they walk together. The forward-only rule is what keeps it fast. The river already knew. The pilgrims just wrote it down.',
    },
  ],
};

// ─── River Guide ──────────────────────────────────────────────────────────────
// Voice: wry, has seen this all before, conserves words. The guide knows the
// keepers and gently routes the player toward them without lecturing.

export const riverGuideIntroDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'River Guide',
      text: 'Twin Rivers. Two banks, one current, four keepers. They will each ask you for help. The river teaches whoever helps.',
      nextNodeId: 'hint',
    },
    {
      id: 'hint',
      speaker: 'River Guide',
      text: 'Start with the Mirror Walker by the entrance bank. She is the patient one. The others come naturally after.',
    },
  ],
};

export const riverGuideMidDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'River Guide',
      text: 'You are about halfway through what the river has to teach.',
      nextNodeId: 'hint',
    },
    {
      id: 'hint',
      speaker: 'River Guide',
      text: 'The Mirror Serpent waits at the eastern shore. It is older than the keepers. It will ask you to use everything they showed you, at once, while it watches.',
    },
  ],
};

export const riverGuideCompleteDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'River Guide',
      text: 'The Serpent is quiet. The gate to the highlands is open. Good. The river will remember you.',
    },
  ],
};
