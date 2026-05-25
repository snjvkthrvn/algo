/**
 * Array Plains NPC dialogue — implementing the FEEL IT → NAME IT pedagogical arc.
 *
 * Pre-puzzle: Focuses on physical descriptions/mechanics without algorithm names.
 * Post-puzzle: Names the algorithm (Bubble Sort, Array Indexing, Hashing, Two Sum) and explains the computer science concepts behind them.
 */

import type { DialogueTree } from '../types';

export const sortingFarmerDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Sorting Farmer',
      text: 'Look at these furrows. The crops are all mixed up. We need them ordered by height from shortest to tallest.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Sorting Farmer',
      text: 'I usually go down the line. I look at two neighboring furrows. If the left one is taller than the right, I swap them. Then I move to the next pair and do the same.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Sorting Farmer',
      text: 'Would you like to try swapping the neighbors to order the row?',
      choices: [
        { text: 'I can help with that.', nextNodeId: 'start_puzzle' },
        { text: 'How does swapping neighbors help?', nextNodeId: 'learn_more' },
        { text: 'Not right now.', nextNodeId: 'decline' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Sorting Farmer',
      text: 'Every time I go through the whole row swapping adjacent furrows that are out of order, the tallest remaining furrow settles at the end. After enough passes, the entire field is aligned.',
      nextNodeId: 'choice',
    },
    {
      id: 'decline',
      speaker: 'Sorting Farmer',
      text: 'Alright. The tangled rows will be waiting here.',
    },
    {
      id: 'start_puzzle',
      speaker: 'Sorting Farmer',
      text: 'Thank you! Step into the shed and let us get these rows aligned.',
      actions: [{ type: 'start_puzzle', value: 'ap_1' }],
    },
  ],
};

export const sortingFarmerPostDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Sorting Farmer',
      text: 'Unbelievable! Every furrow is in perfect order now.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Sorting Farmer',
      text: 'What you just did is called Bubble Sort. It is a fundamental sorting algorithm where you repeatedly step through the list, compare adjacent elements, and swap them if they are in the wrong order.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Sorting Farmer',
      text: 'It is named "Bubble" because smaller elements gradually "bubble" to the top of the list while larger elements sink to the bottom. Though simple to understand, its time complexity is O(N²), making it slow for very large fields!',
    },
  ],
};

export const basketKeeperDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Basket Keeper',
      text: 'I have a big problem. I have a long row of numbered baskets containing all my farming tools, but I spend half my day rummaging through them one by one to find what I need.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Basket Keeper',
      text: 'If I just knew the exact basket number—its slot address—I could walk straight to it and retrieve the tool instantly. No scanning, no searching. Just direct, instant access.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Basket Keeper',
      text: 'Would you like to try locating the tools directly by their basket number?',
      choices: [
        { text: 'I will find them.', nextNodeId: 'start_puzzle' },
        { text: 'Why is a slot number so fast?', nextNodeId: 'learn_more' },
        { text: 'Maybe later.', nextNodeId: 'decline' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Basket Keeper',
      text: 'When items are stored side-by-side in memory, knowing the slot number allows you to calculate the exact physical location instantly. You do not have to inspect any other slots!',
      nextNodeId: 'choice',
    },
    {
      id: 'decline',
      speaker: 'Basket Keeper',
      text: 'Very well. I will keep rummaging for now.',
    },
    {
      id: 'start_puzzle',
      speaker: 'Basket Keeper',
      text: 'Great! Let us go inside and organize these tools by their addresses.',
      actions: [{ type: 'start_puzzle', value: 'ap_2' }],
    },
  ],
};

export const basketKeeperPostDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Basket Keeper',
      text: 'Ah, wonderful! Every tool was retrieved in the blink of an eye.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Basket Keeper',
      text: 'This system of direct access is called Array Indexing. Because an array stores elements contiguously, we can access any element in O(1) constant time if we know its index.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Basket Keeper',
      text: 'No matter if there are four baskets or four billion, retrieving a value by its index takes the same instant step. It is the bedrock of modern storage structures!',
    },
  ],
};

export const cropSorterDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Crop Sorter',
      text: 'I have hundreds of harvested crops coming in, but I only have four storage bins. I need a consistent rule that decides exactly which bin each crop belongs in.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Crop Sorter',
      text: 'If I use a mathematical formula on the crop name to determine the bin number, the same crop will always map to the exact same bin. Then I never have to search all the bins to find it later!',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Crop Sorter',
      text: 'Would you like to try routing these crops using a formula?',
      choices: [
        { text: 'Let us route them.', nextNodeId: 'start_puzzle' },
        { text: 'How does a formula help?', nextNodeId: 'learn_more' },
        { text: 'No, thank you.', nextNodeId: 'decline' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Crop Sorter',
      text: 'We can convert the letters of a crop name to numbers, add them up, and use the remainder of division by four. This guarantees a bin index between 0 and 3, sending each crop to a predictable bin!',
      nextNodeId: 'choice',
    },
    {
      id: 'decline',
      speaker: 'Crop Sorter',
      text: 'Okay. The harvest is piling up, though.',
    },
    {
      id: 'start_puzzle',
      speaker: 'Crop Sorter',
      text: 'Let us go. The hopper is ready to distribute the harvest.',
      actions: [{ type: 'start_puzzle', value: 'ap_3' }],
    },
  ],
};

export const cropSorterPostDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Crop Sorter',
      text: 'Superb! The crops are perfectly divided among the bins.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Crop Sorter',
      text: 'This method of using a mathematical formula to map data to a specific index is called Hashing. The formula itself is a hash function, which maps key inputs to array buckets.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Crop Sorter',
      text: 'It allows us to lookup items in O(1) average time! If two different crops end up in the same bin, that is called a collision, and we must resolve it to keep retrieval fast.',
    },
  ],
};

export const tileWorkerDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Tile Worker',
      text: 'My task is to lay tile pairs that sum up to a specific target weight. For instance, if the target is 10, a tile of weight 4 must pair with a tile of weight 6.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Tile Worker',
      text: 'Instead of comparing every tile against every other tile, I can calculate the complement—target minus current tile weight. If I keep track of what I have already seen, I can pair them instantly.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Tile Worker',
      text: 'Would you like to try matching these target pairs?',
      choices: [
        { text: 'I will find the pairs.', nextNodeId: 'start_puzzle' },
        { text: 'What is a complement?', nextNodeId: 'learn_more' },
        { text: 'Not right now.', nextNodeId: 'decline' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Tile Worker',
      text: 'If the target is T and your current tile is X, the complement is C = T - X. If you store seen tiles in a fast-lookup set, you can check if C exists in a single look, rather than scanning the field.',
      nextNodeId: 'choice',
    },
    {
      id: 'decline',
      speaker: 'Tile Worker',
      text: 'Alright. The tiles remain unbalanced.',
    },
    {
      id: 'start_puzzle',
      speaker: 'Tile Worker',
      text: 'Excellent! Let us step onto the pairing grounds.',
      actions: [{ type: 'start_puzzle', value: 'ap_4' }],
    },
  ],
};

export const tileWorkerPostDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Tile Worker',
      text: 'Magnificent! All target weight pairs are matched and laid.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Tile Worker',
      text: 'This classic coding challenge is called the Two Sum problem. By utilizing a hash set or dictionary to record previously seen numbers, we can find the pair in a single O(N) linear scan.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Tile Worker',
      text: 'This is vastly superior to the brute-force O(N²) approach of checking every combination. Recognizing complements is a powerful trick in algorithm design!',
    },
  ],
};
