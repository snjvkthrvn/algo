/**
 * Array Plains NPC dialogue — restored to honor the FEEL_IT → NAME_IT contract.
 *
 * Pre-puzzle (FEEL_IT): describes the GOAL and the WORLD, never the technique.
 *   The player is meant to discover the mechanic in the puzzle itself.
 *   No algorithm names, no "swap adjacent neighbors", no "complement = T - X".
 *
 * Post-puzzle (NAME_IT): the keeper hands the player the algorithm name and
 *   complexity in *their own voice* — flavored, characterful, not a Wikipedia
 *   paragraph. Each keeper has a quirk: the Sorting Farmer is dry and rural,
 *   the Basket Keeper is fussy-precise, the Crop Sorter loves ratios and
 *   numbers, the Tile Worker sees patterns everywhere.
 *
 * Choice trees are 2 options (start / learn more) — the previous third
 * "Maybe later" option was dead weight that ended the dialogue with zero
 * narrative consequence and forced the player to walk back and re-engage.
 * If the player wants to walk away, they can already do that by closing
 * the dialogue with Esc.
 */

import type { DialogueTree } from '../types';

// ─── Sorting Farmer ───────────────────────────────────────────────────────────
// Voice: rural, matter-of-fact, slight dry humor. Has been doing this
// for decades and is unimpressed by anything new but quietly proud of
// the work.

export const sortingFarmerDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Sorting Farmer',
      text: 'Look at these furrows. Should be a clean ramp — shortest at the front, tallest at the back. Right now it looks like a child drew the field.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Sorting Farmer',
      text: 'Carts come through at sundown expecting it tidy. I have been at this since dawn and gave up an hour ago. Maybe a fresh pair of hands sees something I missed.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Sorting Farmer',
      text: 'Care to try?',
      choices: [
        { text: 'I will give it a try.', nextNodeId: 'start_puzzle' },
        { text: 'Any advice before I start?', nextNodeId: 'learn_more' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Sorting Farmer',
      text: 'Advice? If I had advice I would have finished by now. Walk the row. Trust your eye. The field will tell you what it wants.',
      nextNodeId: 'choice',
    },
    {
      id: 'start_puzzle',
      speaker: 'Sorting Farmer',
      text: 'Shed door is open. Mind the loose plank.',
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
      text: 'Well, would you look at that. Clean ramp. Carts will think I hired a magician.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Sorting Farmer',
      text: 'Folks from the city came through once. Saw me doing it. Got out a notebook. Said the city has a name for it — "bubble sort," because the small ones rise to the top, like in a kettle. Sounded fancy when they said it. Out here we just call it doing the rows.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Sorting Farmer',
      text: 'They said it gets slow when the field is huge — used a word, "en-squared," which I think means "a lot, fast." For ten thousand rows you would want a different way. For our field, it works fine. And now you know it too.',
    },
  ],
};

// ─── Basket Keeper ────────────────────────────────────────────────────────────
// Voice: fussy-precise. Takes pride in the system. Slightly proud, slightly
// defensive, the kind of person who color-codes their kitchen.

export const basketKeeperDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Basket Keeper',
      text: 'Welcome to the indexing barn. Every basket has a number painted on it. Every number means a tool lives in there. That is the entire system.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Basket Keeper',
      text: 'I would like to test a few. Customers walk up, ask for the tool in slot four, and I walk to slot four. Not slot two, then three, then four — straight to four. The whole point is the painted number.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Basket Keeper',
      text: 'Would you give it a turn at the counter?',
      choices: [
        { text: 'I will work the counter.', nextNodeId: 'start_puzzle' },
        { text: 'Why is the painted number the whole point?', nextNodeId: 'learn_more' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Basket Keeper',
      text: 'Because if you have to lift the lid of every basket to check, what was the point of the paint? The paint is the promise. The paint says "you know where to look without looking." Try it. You will see what I mean.',
      nextNodeId: 'choice',
    },
    {
      id: 'start_puzzle',
      speaker: 'Basket Keeper',
      text: 'Behind the counter, then. Customers should be lining up soon.',
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
      text: 'Every retrieval was instant. The system holds. I knew it would.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Basket Keeper',
      text: 'A scholar told me there is a name for what we just demonstrated. "Array indexing." She said it is the bedrock of how the city stores things — you give the address, the machine hands you back the value. No searching. Just the address. She seemed surprised I had not heard of it. I told her the painted numbers came first.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Basket Keeper',
      text: 'She used a phrase — "constant time" — meaning the basket does not care if there are four of them or four million. The address is the address. The reach is the reach. I think that is what she meant. It rang true.',
    },
  ],
};

// ─── Crop Sorter ──────────────────────────────────────────────────────────────
// Voice: numbers-obsessed, slightly manic. Sees the world as ratios and
// remainders. Genuinely delighted when the formula works.

export const cropSorterDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Crop Sorter',
      text: 'Hundreds of crops, four bins. The trick is that the SAME crop always goes to the SAME bin — predictable, repeatable, every time. Otherwise we lose track.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Crop Sorter',
      text: 'A wheat bundle and another wheat bundle — same bin. Always. If we put one in bin three on Monday and bin two on Tuesday, we cannot find anything later. So I needed a rule that the crop itself decides.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Crop Sorter',
      text: 'Want to run the hopper?',
      choices: [
        { text: 'Show me the hopper.', nextNodeId: 'start_puzzle' },
        { text: 'A rule the crop decides — what does that mean?', nextNodeId: 'learn_more' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Crop Sorter',
      text: 'It means the bin number comes OUT of the crop, not IN to it. The crop is the input, the bin is the output, and the rule between them is the same rule every time. You will see when the hopper runs. It is satisfying.',
      nextNodeId: 'choice',
    },
    {
      id: 'start_puzzle',
      speaker: 'Crop Sorter',
      text: 'Step to the hopper. I have wanted to watch someone else run it for once.',
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
      text: 'Hah! Every crop in its bin and not one out of place. THAT is what a good rule does.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Crop Sorter',
      text: 'A travelling merchant once told me the city calls this "hashing." The rule has a city name too — "hash function." Sounds violent for what it is. The function takes the crop, makes a number, the number picks the bin. Predictable. Repeatable. Beautiful.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Crop Sorter',
      text: 'The merchant warned me — sometimes two different crops will land in the same bin. They call it a "collision." Not a disaster, but you need a plan. A second basket inside the bin, maybe. We will worry about that when we have ten thousand crops. For now, four bins, four rules, no fuss.',
    },
  ],
};

// ─── Tile Worker ──────────────────────────────────────────────────────────────
// Voice: methodical, sees patterns everywhere. Speaks like a craftsperson
// describing a process. Gentle, observational.

export const tileWorkerDialogue: DialogueTree = {
  startNodeId: 'start',
  nodes: [
    {
      id: 'start',
      speaker: 'Tile Worker',
      text: 'These tiles need to be laid in pairs. Each pair must weigh exactly the same as the target stone — see, the carved number on the courtyard wall.',
      nextNodeId: 'explain',
    },
    {
      id: 'explain',
      speaker: 'Tile Worker',
      text: 'I have stacks of tiles, each marked with its weight. Two tiles together must match the carved number. I have been laying them slow because checking every combination takes the whole afternoon, and I usually pick wrong twice before getting it right.',
      nextNodeId: 'choice',
    },
    {
      id: 'choice',
      speaker: 'Tile Worker',
      text: 'A second eye would help. Will you walk the grounds with me?',
      choices: [
        { text: 'Walk me through.', nextNodeId: 'start_puzzle' },
        { text: 'Is there a faster way than checking every combination?', nextNodeId: 'learn_more' },
      ],
    },
    {
      id: 'learn_more',
      speaker: 'Tile Worker',
      text: 'There must be. I have started thinking about it like this — once I pick up a tile, I know exactly what its partner weighs. Target minus what is in my hand. So really I am looking for ONE specific weight, not ANY pair. That feels like it should be faster, but I keep getting tangled trying to remember what I have already seen.',
      nextNodeId: 'choice',
    },
    {
      id: 'start_puzzle',
      speaker: 'Tile Worker',
      text: 'The pairing grounds are this way. Mind the chalk lines.',
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
      text: 'Every pair matches the target. Look at the courtyard. It is the cleanest grid we have ever laid.',
      nextNodeId: 'name_it',
    },
    {
      id: 'name_it',
      speaker: 'Tile Worker',
      text: 'There is a name for that trick — keeping a memory of what you have already seen, so each new tile only needs ONE check instead of comparing against everything. A scholar passing through called it "two sum." Said it is one of the first puzzles they teach apprentices in the city.',
      nextNodeId: 'explain_more',
    },
    {
      id: 'explain_more',
      speaker: 'Tile Worker',
      text: 'The trick is the memory. Without it you compare every pair — slow, the kind of slow that fills a whole day. With the memory you walk the row once. The scholar called it "linear" instead of "squared." I just call it "tidier."',
    },
  ],
};
