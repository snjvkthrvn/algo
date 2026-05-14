/**
 * Pre-written Concept Bridge content for each puzzle.
 *
 * Narrative source of truth: narrative_design/POKEMON_STYLE_GAME_SCRIPT.md
 * Keep the teaching flow aligned to FEEL -> NAME -> USE.
 */

import type { ConceptBridgeData } from '../types';

export interface ConceptBridgeContent {
  puzzleId: string;
  sections: {
    storyRecap: string[];
    patternReveal: { title: string; explanation: string[] };
    pseudocode: { code: string; python: string; js: string; explanation: string };
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
        observe(rune)
        memorize(rune.index)

    for each memorized position:
        step_on(position)
        if wrong:
            restart()`,
        python: `def follow_pattern(runes):
    memory = []
    for rune in runes:
        memory.append(rune.index)

    for pos in memory:
        if not step_on(pos):
            restart()`,
        js: `function followPattern(runes) {
    const memory = runes.map(r => r.index);
    for (const pos of memory) {
        if (!stepOn(pos)) restart();
    }
}`,
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
    "circle-red": console_1,
    "square-green": console_3
}

function placeShard(shard):
    key = shard.shape + shard.color
    target = consoleMap[key]
    place(shard, target)`,
        python: `console_map = {
    "circle-red": console_1,
    "square-green": console_3
}

def place_shard(shard):
    key = f"{shard.shape}-{shard.color}"
    target = console_map.get(key)
    place(shard, target)`,
        js: `const consoleMap = {
    "circle-red": console_1,
    "square-green": console_3
};

function placeShard(shard) {
    const key = \`\${shard.shape}-\${shard.color}\`;
    place(shard, consoleMap[key]);
}`,
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
    if not verifySequence(user.input, expected):
        return DENIED
    if not verifyMapping(user.shards, sockets):
        return DENIED
    return AUTHORIZED`,
        python: `def authenticate(user):
    if not verify_sequence(user.input, expected):
        return "DENIED"
    if not verify_mapping(user.shards, sockets):
        return "DENIED"
    return "AUTHORIZED"`,
        js: `function authenticate(user) {
    if (!verifySequence(user.input, expected)) return "DENIED";
    if (!verifyMapping(user.shards, sockets)) return "DENIED";
    return "AUTHORIZED";
}`,
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
        python: `def bubble_sort(row):
    while True:
        swapped = False
        for i in range(len(row) - 1):
            if row[i] > row[i+1]:
                row[i], row[i+1] = row[i+1], row[i]
                swapped = True
        if not swapped:
            break`,
        js: `function bubbleSort(row) {
    let swapped;
    do {
        swapped = false;
        for (let i = 0; i < row.length - 1; i++) {
            if (row[i] > row[i+1]) {
                [row[i], row[i+1]] = [row[i+1], row[i]];
                swapped = true;
            }
        }
    } while (swapped);
}`,
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
        python: `tools = ["rake", "seed", "rope", "hammer"]
def fetch(index):
    return tools[index]`,
        js: `const tools = ["rake", "seed", "rope", "hammer"];
function fetch(index) {
    return tools[index];
}`,
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
        python: `def bucket_for(name, bucket_count):
    first = ord(name[0]) - ord('A')
    return first % bucket_count`,
        js: `function bucketFor(name, bucketCount) {
    const first = name.charCodeAt(0) - 65;
    return first % bucketCount;
}`,
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
        if need in seen: return [need, value]
        seen.add(value)`,
        python: `def two_sum(values, target):
    seen = set()
    for value in values:
        need = target - value
        if need in seen:
            return [need, value]
        seen.add(value)`,
        js: `function twoSum(values, target) {
    const seen = new Set();
    for (const value of values) {
        const need = target - value;
        if (seen.has(need)) return [need, value];
        seen.add(value);
    }
}`,
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

  tr_1: {
    puzzleId: 'tr_1',
    sections: {
      storyRecap: [
        'Mirror Walk asked you to reverse a row without guessing.',
        'You held the left and right ends at the same time, swapped them, and moved both pointers inward.',
        'The row changed because you performed the algorithm step by step.',
      ],
      patternReveal: {
        title: 'Two-Pointer Reverse',
        explanation: [
          'A reverse can be done in place with two pointers.',
          'The left pointer starts at the first value. The right pointer starts at the last value.',
          'Each swap fixes two positions, so the work is complete when the pointers meet or cross.',
        ],
      },
      pseudocode: {
        code: `function reverse(row):
    L = 0
    R = row.length - 1
    while L < R:
        swap(row[L], row[R])
        L = L + 1
        R = R - 1`,
        python: `def reverse(row):
    left = 0
    right = len(row) - 1
    while left < right:
        row[left], row[right] = row[right], row[left]
        left += 1
        right -= 1`,
        js: `function reverse(row) {
    let left = 0;
    let right = row.length - 1;
    while (left < right) {
        [row[left], row[right]] = [row[right], row[left]];
        left++;
        right--;
    }
}`,
        explanation: 'This matches the puzzle exactly: swap the two pointed values, then move both pointers toward the center.',
      },
      miniForge: {
        question: 'How many swaps does it take to reverse 7 values with two pointers?',
        options: ['2', '3', '6', '7'],
        correctIndex: 1,
        explanation: 'A reverse needs floor(n / 2) swaps. floor(7 / 2) is 3.',
      },
      codexEntryId: 'two_pointer_reverse',
    },
  },

  tr_2: {
    puzzleId: 'tr_2',
    sections: {
      storyRecap: [
        'Pointer Bridge gave you a sorted row and a target.',
        'When the sum was too small, raising the left pointer was the only useful move.',
        'When the sum was too large, lowering the right pointer was the only useful move.',
      ],
      patternReveal: {
        title: 'Sorted Two-Sum',
        explanation: [
          'Sorted values make two-sum directional.',
          'Moving the left pointer right increases the sum.',
          'Moving the right pointer left decreases the sum.',
          'That is why the algorithm can discard many impossible pairs at once.',
        ],
      },
      pseudocode: {
        code: `function twoSumSorted(row, target):
    L = 0
    R = row.length - 1
    while L < R:
        sum = row[L] + row[R]
        if sum == target: return [L, R]
        if sum < target: L = L + 1
        else: R = R - 1`,
        python: `def two_sum_sorted(row, target):
    left = 0
    right = len(row) - 1
    while left < right:
        total = row[left] + row[right]
        if total == target:
            return left, right
        if total < target:
            left += 1
        else:
            right -= 1`,
        js: `function twoSumSorted(row, target) {
    let left = 0;
    let right = row.length - 1;
    while (left < right) {
        const sum = row[left] + row[right];
        if (sum === target) return [left, right];
        if (sum < target) left++;
        else right--;
    }
}`,
        explanation: 'The sorted row turns each comparison into a forced pointer move instead of a guess.',
      },
      miniForge: {
        question: 'In a sorted two-sum row, current sum is 12 and target is 15. What should move?',
        options: ['Move L right', 'Move R left', 'Lock the pair', 'Restart'],
        correctIndex: 0,
        explanation: 'The sum is too small, so the left pointer moves right to reach a larger value.',
      },
      codexEntryId: 'sorted_two_sum',
    },
  },

  tr_3: {
    puzzleId: 'tr_3',
    sections: {
      storyRecap: [
        'Fixed Window Dock kept the window size constant.',
        'Sliding right removed one old value and added one new value.',
        'You tracked the richest slice by remembering the best sum seen so far.',
      ],
      patternReveal: {
        title: 'Fixed Sliding Window',
        explanation: [
          'A fixed sliding window keeps the same width while moving across a row.',
          'The efficient update subtracts the value that leaves and adds the value that enters.',
          'That avoids recounting the whole window every time.',
        ],
      },
      pseudocode: {
        code: `function maxFixedWindow(row, k):
    sum = total(row[0..k-1])
    best = sum
    for start from 1 to row.length - k:
        sum = sum - row[start - 1]
        sum = sum + row[start + k - 1]
        best = max(best, sum)`,
        python: `def max_fixed_window(row, k):
    total = sum(row[:k])
    best = total
    for start in range(1, len(row) - k + 1):
        total -= row[start - 1]
        total += row[start + k - 1]
        best = max(best, total)
    return best`,
        js: `function maxFixedWindow(row, k) {
    let total = row.slice(0, k).reduce((a, b) => a + b, 0);
    let best = total;
    for (let start = 1; start <= row.length - k; start++) {
        total -= row[start - 1];
        total += row[start + k - 1];
        best = Math.max(best, total);
    }
    return best;
}`,
        explanation: 'The puzzle showed the same rolling update: one value leaves, one value enters, and best remembers the maximum.',
      },
      miniForge: {
        question: 'A size-3 window has sum 10. It slides right: 2 leaves and 7 enters. What is the new sum?',
        options: ['5', '10', '15', '19'],
        correctIndex: 2,
        explanation: '10 - 2 + 7 = 15.',
      },
      codexEntryId: 'fixed_sliding_window',
    },
  },

  tr_4: {
    puzzleId: 'tr_4',
    sections: {
      storyRecap: [
        'Current Rider gave you a living window instead of a fixed width.',
        'You extended right while the window stayed unique.',
        'When a duplicate appeared, you shrank from the left until the constraint was true again.',
      ],
      patternReveal: {
        title: 'Variable Sliding Window',
        explanation: [
          'A variable sliding window grows and shrinks to preserve a rule.',
          'For longest unique substring, the rule is no repeated value inside the window.',
          'The best answer is the longest valid window ever seen.',
        ],
      },
      pseudocode: {
        code: `function longestUnique(row):
    L = 0
    best = 0
    seen = map()
    for R from 0 to row.length - 1:
        while row[R] already inside L..R:
            L = L + 1
        best = max(best, R - L + 1)`,
        python: `def longest_unique(row):
    left = 0
    best = 0
    seen = {}
    for right, value in enumerate(row):
        if value in seen and seen[value] >= left:
            left = seen[value] + 1
        seen[value] = right
        best = max(best, right - left + 1)
    return best`,
        js: `function longestUnique(row) {
    let left = 0;
    let best = 0;
    const seen = new Map();
    for (let right = 0; right < row.length; right++) {
        const value = row[right];
        if (seen.has(value) && seen.get(value) >= left) {
            left = seen.get(value) + 1;
        }
        seen.set(value, right);
        best = Math.max(best, right - left + 1);
    }
    return best;
}`,
        explanation: 'The scene used Q and E to make this visible: extend to test the rule, shrink to restore it, and remember the best valid length.',
      },
      miniForge: {
        question: 'In the window [A, B, C, A], which action restores the no-duplicates rule?',
        options: ['Shrink from the left', 'Lock immediately', 'Extend right forever', 'Sort the window'],
        correctIndex: 0,
        explanation: 'The duplicate A is inside the window, so the left side must shrink until the duplicate is gone.',
      },
      codexEntryId: 'variable_sliding_window',
    },
  },
};

export function getConceptBridgeContent(data: ConceptBridgeData): ConceptBridgeContent {
  return CONCEPT_BRIDGE_DATA[data.puzzleId] ?? buildFallbackConceptBridgeContent(data);
}

function buildFallbackConceptBridgeContent(data: ConceptBridgeData): ConceptBridgeContent {
  const puzzleName = data.puzzleName || data.puzzleId;
  const concept = data.concept || 'Algorithm Pattern';
  const codexEntryId = `concept_${toSnakeCase(concept) || toSnakeCase(puzzleName) || 'algorithm_pattern'}`;

  return {
    puzzleId: data.puzzleId,
    sections: {
      storyRecap: [
        `${puzzleName} asked you to apply ${concept} inside the region's puzzle shell.`,
        'The important part was not the answer label. It was recognizing the rule that made one move better than the others.',
        'This bridge keeps the completion path stable until this region receives a bespoke first-principles bridge.',
      ],
      patternReveal: {
        title: concept,
        explanation: [
          `${concept} is the reusable idea behind the puzzle you just cleared.`,
          'Look for the state that changes, the condition that decides the next move, and the memory the algorithm carries forward.',
          'Those three pieces are enough to turn a puzzle action into a program step.',
        ],
      },
      pseudocode: {
        code: `function solveWithPattern(state):
    while not complete(state):
        action = choose_action_from_rule(state)
        state = apply(action, state)
    return state`,
        python: `def solve_with_pattern(state):
    while not complete(state):
        action = choose_action_from_rule(state)
        state = apply(action, state)
    return state`,
        js: `function solveWithPattern(state) {
    while (!complete(state)) {
        const action = chooseActionFromRule(state);
        state = apply(action, state);
    }
    return state;
}`,
        explanation: `${concept} is the rule that chooses the next action from the current state.`,
      },
      miniForge: {
        question: `What should guide your next move in a ${concept} puzzle?`,
        options: ['The current state and rule', 'Random guessing', 'Only the art style', 'The last key pressed'],
        correctIndex: 0,
        explanation: 'Algorithms choose actions from state plus rule. Guessing is what the puzzle is teaching you to replace.',
      },
      codexEntryId,
    },
  };
}

function toSnakeCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
