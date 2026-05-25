/**
 * Twin Rivers NPC dialogue — implementing the FEEL IT → NAME IT pedagogical arc.
 *
 * Pre-puzzle: Focuses on physical descriptions/mechanics without algorithm names.
 * Post-puzzle: Names the algorithm (Two Pointers, Sliding Window) and explains the computer science concepts behind them.
 */

import type { DialogueTree } from '../types';

export const mirrorWalkerDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Mirror Walker',
      text: 'Greetings. The river banks are long and winding. I need to scan these two opposite shores to see where their path elevations align.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Mirror Walker',
      text: 'Instead of starting from the beginning and scanning the whole map twice, I stand at the left shore and my reflection stands at the far right. We both walk inward toward the middle, checking elements together.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Mirror Walker',
      text: 'Would you like to try walking from both banks inward?',
      choices: [
        { text: 'Let us start walking.', nextNodeId: 'start_puzzle' },
        { text: 'Why walk inward?', nextNodeId: 'learn_more' },
        { text: 'Maybe later.', nextNodeId: 'decline' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Mirror Walker',
      text: 'By starting at opposite ends and moving inward based on comparison, we can scan sorted data in a single pass. It is much faster than checking every combination!',
      nextNodeId: 'choice',
    },
    {
      id: 'decline',
      speaker: 'Mirror Walker',
      text: 'Fair enough. I will keep scanning the banks.',
    },
    {
      id: 'start_puzzle',
      speaker: 'Mirror Walker',
      text: 'Let us step onto the bank and mirror our movements.',
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
      text: 'Incredible! We met exactly where the elevations matched.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Mirror Walker',
      text: 'This technique of using two pointers moving toward each other is called Two Pointers. It is highly efficient for searching sorted arrays.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Mirror Walker',
      text: 'Instead of an O(N²) nested loop search, Two Pointers allows us to find pairs or scan sequences in O(N) linear time. A powerful optimization for many structures!',
    },
  ],
};

export const bridgeKeeperDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Bridge Keeper',
      text: 'The bridge is down. To rebuild it, we must match segment blocks from the left bank and right bank that add up exactly to our bridge span target.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Bridge Keeper',
      text: 'We place pointers on the smallest segment (left) and the largest segment (right). If their sum is too small, we move the left pointer to a larger block. If it is too large, we move the right pointer to a smaller block.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Bridge Keeper',
      text: 'Would you like to try matching the segments to rebuild the bridge?',
      choices: [
        { text: 'Let us build it.', nextNodeId: 'start_puzzle' },
        { text: 'How do we adjust pointers?', nextNodeId: 'learn_more' },
        { text: 'Not right now.', nextNodeId: 'decline' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Bridge Keeper',
      text: 'Since the blocks are sorted by size, summing the extremes tells us which way to move. If sum < target, increment left. If sum > target, decrement right. We never test useless pairings!',
      nextNodeId: 'choice',
    },
    {
      id: 'decline',
      speaker: 'Bridge Keeper',
      text: 'Okay. The river remains uncrossed.',
    },
    {
      id: 'start_puzzle',
      speaker: 'Bridge Keeper',
      text: 'Excellent. Let us align the segments on the bridge grounds.',
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
      text: 'Fantastic! The segments match perfectly and the bridge is restored.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Bridge Keeper',
      text: 'This is the pointer convergence pattern of Two Pointers. It solves the pair matching problem in sorted arrays without extra memory.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Bridge Keeper',
      text: 'It operates in O(N) time complexity by leveraging the sorted order of the segments to prune the search space. A beautiful application of sorted logic!',
    },
  ],
};

export const windowFisherDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Window Fisher',
      text: 'Look at all these schools of fish passing by. I want to catch the highest concentration of fish, but my net has a fixed width of exactly K slots.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Window Fisher',
      text: 'Instead of pulling the net out and counting all over again for every spot, I can slide the net down one slot. I just subtract the fish that left behind and add the new fish that entered the net.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Window Fisher',
      text: 'Would you like to try sliding the net to catch the most fish?',
      choices: [
        { text: 'Let us cast the net.', nextNodeId: 'start_puzzle' },
        { text: 'Why slide the net?', nextNodeId: 'learn_more' },
        { text: 'Maybe later.', nextNodeId: 'decline' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Window Fisher',
      text: 'By sliding the net, we reuse the sum of the middle slots. We only need to adjust the boundaries: subtract the exiting item from the left, and add the entering item to the right. It is extremely fast!',
      nextNodeId: 'choice',
    },
    {
      id: 'decline',
      speaker: 'Window Fisher',
      text: 'Understandable. The fish swim on.',
    },
    {
      id: 'start_puzzle',
      speaker: 'Window Fisher',
      text: 'Splendid! Let us go to the docks and set the window.',
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
      text: 'Incredible catch! We maximized the haul easily.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Window Fisher',
      text: 'This is called the Fixed Sliding Window pattern. We maintain a contiguous subarray of size K and slide it across the main array.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Window Fisher',
      text: 'It avoids recalculating the sub-elements, transforming an O(N * K) brute-force recalculation into a simple O(N) linear time operation. Highly optimal for stream processing!',
    },
  ],
};

export const currentRiderDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Current Rider',
      text: 'The river currents are wild. I need to capture a segment of the current where the sum of forces is within my limits, but I want to make the net as wide as possible.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Current Rider',
      text: 'I expand my net to the right to catch more currents. If the force gets too high, I shrink the net from the left until the force is safe again. The net size grows and shrinks dynamically.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Current Rider',
      text: 'Would you like to try riding these variable currents?',
      choices: [
        { text: 'Let us ride.', nextNodeId: 'start_puzzle' },
        { text: 'How does it resize?', nextNodeId: 'learn_more' },
        { text: 'No, thank you.', nextNodeId: 'decline' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Current Rider',
      text: 'We expand the right pointer to ingest new elements. If the total violates our constraint, we increment the left pointer to shrink the window, updating the running sum until the constraint is met again.',
      nextNodeId: 'choice',
    },
    {
      id: 'decline',
      speaker: 'Current Rider',
      text: 'Stay on the dry shore then. The currents wait for no one.',
    },
    {
      id: 'start_puzzle',
      speaker: 'Current Rider',
      text: 'Perfect! Step onto the rider platforms and adjust the net.',
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
      text: 'Splendid! We navigated the currents and maximized our coverage.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Current Rider',
      text: 'This is the Variable Sliding Window pattern. The window boundaries adjust independently based on state conditions.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Current Rider',
      text: 'It resolves optimal subarray questions under constraint rules in O(N) time complexity, since both left and right pointers only move forward across the array once.',
    },
  ],
};

export const riverGuideIntroDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'River Guide',
      text: 'Welcome to Twin Rivers. Here, logic flows like water. The paths branch, but the underlying patterns are connected.',
      nextNodeId: 'hint',
    },
    {
      id: 'hint',
      speaker: 'River Guide',
      text: 'Look closely at the shores and platforms. If you feel stuck, try talking to the Mirror Walker near the entrance bank. They will show you how to walk two paths at once.',
    },
  ],
};

export const riverGuideMidDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'River Guide',
      text: 'You are making good progress. The bridge is halfway up, and the fish are sliding into the docks.',
      nextNodeId: 'hint',
    },
    {
      id: 'hint',
      speaker: 'River Guide',
      text: 'If you want to cross to the highlands, you must first challenge the Mirror Serpent at the far east. Make sure you understand how both pointers and sliding windows control sizes!',
    },
  ],
};

export const riverGuideCompleteDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'River Guide',
      text: 'You have mastered the flow of Twin Rivers! The Mirror Serpent has been overcome, and the gate to the Hash Highlands is open.',
    },
  ],
};
