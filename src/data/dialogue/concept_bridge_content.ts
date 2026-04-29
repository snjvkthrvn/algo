/**
 * Pre-written Concept Bridge content for each puzzle.
 *
 * Narrative source of truth: narrative_design/POKEMON_STYLE_GAME_SCRIPT.md
 * Keep the teaching flow aligned to FEEL -> NAME -> USE.
 */

export interface ConceptBridgeContent {
  puzzleId: string;
  sections: {
    storyRecap: string[];
    patternReveal: { title: string; explanation: string[] };
    pseudocode: { code: string; explanation: string };
    miniForge: { question: string; options: string[]; correctIndex: number; explanation: string };
    codexEntryId: string;
  };
}

export const CONCEPT_BRIDGE_DATA: Record<string, ConceptBridgeContent> = {
  p0_1: {
    puzzleId: 'p0_1',
    sections: {
      storyRecap: [
        'The Rune Keeper showed you a pattern, and Bit hovered beside each glowing tile as if urging you forward.',
        'You felt the rule in your feet: first this, then that, then the next. Order was not a lecture. It was the puzzle itself.',
        'Now that you have lived it, we can give that feeling its name.',
      ],
      patternReveal: {
        title: 'Sequences: First This, Then That',
        explanation: [
          'What you just felt has a computer-science name: sequential processing.',
          'A program often solves work one step at a time, in order, the same way you walked the runes.',
          'When those steps are stored in a line, we often call that line an array.',
          'Iteration is simply the formal name for moving through that line from one position to the next.',
        ],
      },
      pseudocode: {
        code: `function followPattern(runes):
    for each rune in sequence:
        observe(rune)        // Watch which tile glows
        memorize(rune.index) // Remember its position

    for each memorized position:
        step_on(position)    // Reproduce the sequence
        if wrong:
            restart()        // Try again from beginning`,
        explanation: 'This is the same rule in code form: move through the pattern in order, one step at a time, and restart if the sequence breaks.',
      },
      miniForge: {
        question: 'What is the output of this code?\n\narr = [10, 20, 30, 40]\nfor i in range(len(arr)):\n    print(arr[i])',
        options: ['40 30 20 10', '10 20 30 40', '10 40', 'Error'],
        correctIndex: 1,
        explanation: 'The loop iterates through indices 0, 1, 2, 3 in order, printing each element sequentially: 10, 20, 30, 40.',
      },
      codexEntryId: 'sequential_processing',
    },
  },

  p0_2: {
    puzzleId: 'p0_2',
    sections: {
      storyRecap: [
        'Each shard told you where it belonged. Shape, pattern, and color were enough to point to one exact console.',
        'Bit warmed near the right destination. Nearby, Glitch kept forcing random fits and learned the hard way how slow guessing can be.',
        'You felt the difference between searching blindly and matching by rule.',
      ],
      patternReveal: {
        title: 'Mapping: Every Key Has a Value',
        explanation: [
          'What you just felt has a name: mapping.',
          'Given the right identifying details, you can go straight to the correct destination instead of checking every possibility.',
          'In code, one common tool for this is a hash map, also called a dictionary or object.',
          'The key points to the answer. That is why good mappings make lookups feel instant.',
        ],
      },
      pseudocode: {
        code: `consoleMap = {
    "circle-solid-red": console_1,
    "triangle-striped-blue": console_2,
    "square-dotted-green": console_3
}

function placeShard(shard):
    key = shard.shape + shard.pattern + shard.color
    target = consoleMap[key]  // Instant lookup!
    place(shard, target)`,
        explanation: 'The map stores each console under a descriptive key. Once the key is known, the destination is a direct lookup instead of a search.',
      },
      miniForge: {
        question: 'You have a dictionary: d = {"apple": 1, "banana": 2, "cherry": 3}\nWhat does d["banana"] return?',
        options: ['1', '2', '3', '"banana"'],
        correctIndex: 1,
        explanation: '"banana" is the key, and 2 is its value. Hash map lookups use the key to instantly retrieve the associated value.',
      },
      codexEntryId: 'key_value_mapping',
    },
  },

  boss_sentinel: {
    puzzleId: 'boss_sentinel',
    sections: {
      storyRecap: [
        'The Sentinel did not ask for a brand-new trick. It asked whether you could combine what you had already earned.',
        'First came order. Then matching. Then both at once while the pressure rose.',
        'That is what mastery feels like: simple ideas held steady together.',
      ],
      patternReveal: {
        title: 'Using Two Ideas at Once',
        explanation: [
          'The Sentinel behaved like a gatekeeper checking whether you truly understood both lessons from the Chamber of Flow.',
          'Good systems often verify more than one thing before they let you pass: know the pattern, carry the right key, stay correct under pressure.',
          'In computing, this is the logic behind layered checks and authentication.',
          'Real understanding is not memorizing one move. It is combining simple rules at the right moment.',
        ],
      },
      pseudocode: {
        code: `function authenticate(user):
    // Step 1: Verify pattern knowledge
    if not verifySequence(user.input, expected):
        return DENIED

    // Step 2: Verify key possession
    if not verifyMapping(user.shards, sockets):
        return DENIED

    // Step 3: Combined verification
    if not verifyCombined(user):
        return DENIED

    return AUTHORIZED  // Access granted!`,
        explanation: 'The Sentinel fight modeled layered verification: pass one check, then the next, then prove you can coordinate both together.',
      },
      miniForge: {
        question: 'A function checks 3 conditions. If any fails, access is denied. What is this pattern called?',
        options: ['Recursion', 'Multi-factor authentication', 'Sorting', 'Caching'],
        correctIndex: 1,
        explanation: 'Multi-factor authentication requires passing ALL checks to gain access. Failing any single check results in denial -- just like the Sentinel\'s phases.',
      },
      codexEntryId: 'pattern_recognition',
    },
  },

  ap_1: {
    puzzleId: 'ap_1',
    sections: {
      storyRecap: [
        'The Sorting Farmer gave you a scrambled row and one strict rule: only swap neighbors.',
        'You watched large values drift right one comparison at a time until the row finally settled.',
        'That feeling of repeated local cleanup has a name.',
      ],
      patternReveal: {
        title: 'Bubble Sort: Order From Neighbor Swaps',
        explanation: [
          'Bubble sort compares adjacent values and swaps them when the left one is larger.',
          'Each pass moves larger values toward the end of the row.',
          'It is not the fastest sort, but it makes the mechanics of sorting visible.',
        ],
      },
      pseudocode: {
        code: `function bubbleSort(row):
    repeat:
        swapped = false
        for i from 0 to row.length - 2:
            if row[i] > row[i + 1]:
                swap(row[i], row[i + 1])
                swapped = true
    until swapped == false`,
        explanation: 'The loop keeps sweeping over neighbor pairs. When a full pass needs no swaps, the row is sorted.',
      },
      miniForge: {
        question: 'In bubble sort, what happens when row[i] > row[i + 1]?',
        options: ['Swap the neighbors', 'Delete row[i]', 'Jump to the end', 'Stop immediately'],
        correctIndex: 0,
        explanation: 'Bubble sort fixes local disorder by swapping adjacent values that are out of order.',
      },
      codexEntryId: 'bubble_sort',
    },
  },

  ap_2: {
    puzzleId: 'ap_2',
    sections: {
      storyRecap: [
        'The Basket Keeper did not ask you to rummage. She gave you the index.',
        'When the hammer was in basket 5, you could go straight to basket 5.',
        'That is the promise arrays make when you know the address.',
      ],
      patternReveal: {
        title: 'Indexing: Go Straight To The Slot',
        explanation: [
          'Array indexing retrieves an item by position.',
          'If you already know the index, lookup does not depend on how many other items exist.',
          'That is why direct access is described as O(1), or constant time.',
        ],
      },
      pseudocode: {
        code: `tools = ["rake", "seed", "rope", "hammer"]

function fetch(index):
    return tools[index]`,
        explanation: 'The index points directly to one slot. No loop is needed when the address is known.',
      },
      miniForge: {
        question: 'arr = [4, 8, 15, 16]\nWhat does arr[2] return?',
        options: ['4', '8', '15', '16'],
        correctIndex: 2,
        explanation: 'Arrays start at index 0, so index 2 is the third value: 15.',
      },
      codexEntryId: 'array_indexing',
    },
  },

  ap_3: {
    puzzleId: 'ap_3',
    sections: {
      storyRecap: [
        'The Crop Sorter turned names into bucket numbers with a small formula.',
        'You did not memorize every crop. You applied the same rule each time.',
        'That stable rule is the heart of hashing.',
      ],
      patternReveal: {
        title: 'Hash Functions: Inputs Become Addresses',
        explanation: [
          'A hash function maps an input to a bucket or address.',
          'The same input should produce the same output every time.',
          'Different inputs can land in the same bucket, which is called a collision.',
        ],
      },
      pseudocode: {
        code: `function bucketFor(name):
    first = alphabetIndex(name[0])
    return first % bucketCount`,
        explanation: 'Modulo keeps the hash output inside the valid bucket range.',
      },
      miniForge: {
        question: 'If bucket = 14 % 4, which bucket is chosen?',
        options: ['0', '1', '2', '4'],
        correctIndex: 2,
        explanation: '14 divided by 4 leaves remainder 2, so the item maps to bucket 2.',
      },
      codexEntryId: 'hash_functions',
    },
  },

  ap_4: {
    puzzleId: 'ap_4',
    sections: {
      storyRecap: [
        'The Tile Worker gave you a target and a field of numbers.',
        'Instead of checking every possible pair, you learned to ask for the missing complement.',
        'One number turned the search into a question with an exact answer.',
      ],
      patternReveal: {
        title: 'Two Sum: Look For The Complement',
        explanation: [
          'Two Sum asks for two values that add to a target.',
          'For any chosen value x, the only partner that works is target - x.',
          'With fast lookup, this changes a slow pair search into a direct complement check.',
        ],
      },
      pseudocode: {
        code: `function twoSum(values, target):
    seen = set()
    for value in values:
        need = target - value
        if need in seen:
            return [need, value]
        seen.add(value)`,
        explanation: 'The set remembers values already seen, so each new value can check for its complement directly.',
      },
      miniForge: {
        question: 'Target is 9. You choose 4. What complement do you need?',
        options: ['3', '4', '5', '13'],
        correctIndex: 2,
        explanation: '9 - 4 = 5, so the complement is 5.',
      },
      codexEntryId: 'two_sum',
    },
  },
};
