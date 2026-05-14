/**
 * Pre-written Concept Bridge content for each puzzle.
 *
 * Narrative source of truth: narrative_design/POKEMON_STYLE_GAME_SCRIPT.md
 * Keep the teaching flow aligned to FEEL -> NAME -> USE -> APPLY.
 *
 * Each entry has six sections:
 *   1. storyRecap     — narrate the felt experience of the puzzle
 *   2. patternReveal  — name the pattern, complexity, analogue, variations
 *   3. pseudocode     — inline-commented code in three flavors (pseudo/python/js)
 *   4. miniForge      — one concept-level multiple choice with pedagogical explanation
 *   5. realWorld      — 3 production scenarios where the pattern actually shows up
 *   6. codexEntryId   — unlock key for the in-game codex
 */

import type { ConceptBridgeData } from '../types';

export interface ConceptBridgeContent {
  puzzleId: string;
  sections: {
    storyRecap: string[];
    patternReveal: { title: string; explanation: string[] };
    pseudocode: { code: string; python: string; js: string; explanation: string };
    miniForge: { question: string; options: string[]; correctIndex: number; explanation: string };
    /**
     * Concrete production scenarios where this pattern appears. Each entry is a one-line
     * bullet shown after the Mini-Forge section so players can connect the puzzle to
     * software they already use. Aim for 3 distinct domains (web, games, OS, ML, etc.).
     */
    realWorld: string[];
    codexEntryId: string;
  };
}

export const CONCEPT_BRIDGE_DATA: Record<string, ConceptBridgeContent> = {
  p0_1: {
    puzzleId: 'p0_1',
    sections: {
      storyRecap: [
        'The Rune Keeper showed you a pattern, and Bit hovered beside each glowing tile as if urging you forward.',
        'You felt the rule in your feet: first this, then that, then the next. Order was not a lecture — it was the puzzle itself.',
        'Now that you have lived it, we can give that feeling its name.',
      ],
      patternReveal: {
        title: 'Sequential Iteration: One Step At A Time',
        explanation: [
          'What you just felt is called sequential processing — visiting items in order, one at a time.',
          'When the items live in a line, the line is called an array, and the walk is called iteration.',
          'Iteration over N items takes O(N) time — the work grows in lock-step with the row.',
          'Real-world analogue: reading a book page-by-page, or a checkout queue serving one customer at a time.',
          'Variants you will meet later: skip every other item, walk backwards, walk two pointers from opposite ends inward.',
        ],
      },
      pseudocode: {
        code: `function followPattern(runes):
    # Phase 1: observe the pattern in order
    for each rune in runes:
        memorize(rune.index)

    # Phase 2: replay the memorized sequence
    for each index in memory:
        step_on(index)
        if wrong:
            restart()`,
        python: `def follow_pattern(runes):
    memory = [rune.index for rune in runes]   # observe in order
    for pos in memory:                         # then replay in order
        if not step_on(pos):
            restart()`,
        js: `function followPattern(runes) {
    const memory = runes.map(r => r.index);    // observe in order
    for (const pos of memory) {                // then replay in order
        if (!stepOn(pos)) restart();
    }
}`,
        explanation: 'Two loops, one rule: visit each item exactly once, in the order it appears. The whole walk runs in O(N) time and uses O(N) extra memory.',
      },
      miniForge: {
        question: 'How long does sequential iteration take to visit every item in a row of N items?',
        options: ['O(1) — constant', 'O(log N) — logarithmic', 'O(N) — linear', 'O(N²) — quadratic'],
        correctIndex: 2,
        explanation: 'Each item is visited exactly once, so total work scales with N. This is O(N) — linear time. It is the baseline against which faster algorithms are measured.',
      },
      realWorld: [
        'Web: a Node.js server iterating each row of a SQL query result before sending JSON to the browser.',
        'Games: a turn-based game like XCOM processing each enemy unit one at a time during the AI phase.',
        'Operating systems: the Linux kernel scheduler walking the ready-queue to pick the next process to run.',
      ],
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
        title: 'Hash Maps: Every Key Points To One Value',
        explanation: [
          'What you just felt is called mapping — every input (key) has a direct line to one output (value).',
          'In code this is a hash map. Other names for the same idea: dictionary, object, associative array, lookup table.',
          'Lookups, inserts, and deletes are O(1) on average — they do not depend on how many entries exist.',
          'Real-world analogue: a phone book — knowing the name jumps you to the number without scanning every page.',
          'Cost: hash maps need memory proportional to the number of keys, plus a strategy for collisions when two keys land in the same slot.',
        ],
      },
      pseudocode: {
        code: `consoleMap = {
    "circle-red": console_red,
    "diamond-blue": console_blue,
    "triangle-green": console_green,
}

function placeShard(shard):
    key = shard.shape + "-" + shard.color
    target = consoleMap[key]      # O(1) lookup — no search loop
    place(shard, target)`,
        python: `console_map = {
    "circle-red": console_red,
    "diamond-blue": console_blue,
    "triangle-green": console_green,
}

def place_shard(shard):
    key = f"{shard.shape}-{shard.color}"
    target = console_map.get(key)     # one direct lookup
    place(shard, target)`,
        js: `const consoleMap = {
    "circle-red": consoleRed,
    "diamond-blue": consoleBlue,
    "triangle-green": consoleGreen,
};

function placeShard(shard) {
    const key = \`\${shard.shape}-\${shard.color}\`;
    place(shard, consoleMap[key]);    // jump straight to the destination
}`,
        explanation: 'Compose the identifying details into a key, then lean on the hash map to deliver the answer in a single step instead of scanning every console.',
      },
      miniForge: {
        question: 'You have a hash map with 1,000,000 entries. Roughly how many comparisons does a single lookup need on average?',
        options: ['About 1,000,000', 'About 1,000', 'About 20', 'About 1'],
        correctIndex: 3,
        explanation: 'Hash map lookups are O(1) on average — one hash computation and (typically) one comparison, regardless of how many entries exist. That is what makes them the go-to data structure for "have I seen this before?" questions.',
      },
      realWorld: [
        'Caching: Redis, Memcached, and your browser cache all use hash tables to look up cached values instantly by URL or key.',
        'Compilers: symbol tables map every variable name to its type and memory location during compilation — one lookup per identifier.',
        "Authentication: a session store maps the user's session token to their profile, so every request can re-identify them in O(1).",
      ],
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
        title: 'Layered Verification: Many Rules, One Decision',
        explanation: [
          'The Sentinel modeled a layered check — a single decision built from multiple independent rules, each of which must pass.',
          'In code this is the AND-composition of predicates: result = check1() AND check2() AND check3().',
          'Each layer is usually fast and short-circuits on the first failure — no work is wasted past a miss.',
          'Real-world analogue: a vault door with three locks. Any one open lock is not enough; all three keys must turn.',
          'Security strength is bounded by the weakest layer — which is exactly why authentication piles independent factors.',
        ],
      },
      pseudocode: {
        code: `function authenticate(user):
    # Each layer is independent — short-circuit on first failure
    if not verifySequence(user.input, expected): return DENIED
    if not verifyMapping(user.shards, sockets): return DENIED
    if not verifyTiming(user.timestamp):         return DENIED
    return AUTHORIZED`,
        python: `def authenticate(user):
    if not verify_sequence(user.input, expected): return "DENIED"
    if not verify_mapping(user.shards, sockets):  return "DENIED"
    if not verify_timing(user.timestamp):         return "DENIED"
    return "AUTHORIZED"`,
        js: `function authenticate(user) {
    if (!verifySequence(user.input, expected)) return "DENIED";
    if (!verifyMapping(user.shards, sockets))  return "DENIED";
    if (!verifyTiming(user.timestamp))         return "DENIED";
    return "AUTHORIZED";
}`,
        explanation: 'The composition is AND, not OR — every layer must succeed. Order checks by cost (cheapest first) so most denials cost almost nothing.',
      },
      miniForge: {
        question: 'A login system requires password + 2FA + biometric. If 2FA breaks (silently accepts any code), what happens to security?',
        options: ['Security stays the same', 'Security drops to ~password + biometric only', 'Security improves', 'Login becomes impossible'],
        correctIndex: 1,
        explanation: 'Layered checks are AND-composed: when one layer fails open, the system reduces to whatever protection the surviving layers provide. Security is roughly bounded by the weakest currently-active layer.',
      },
      realWorld: [
        'Authentication: password + TOTP code + biometric — every modern bank login is an AND-chain of independent checks.',
        'TLS handshake: certificate must validate + key exchange must succeed + cipher must agree, or the connection fails before any HTTP byte flows.',
        'Code deploy gates: tests pass + reviewer approves + CI green — short-circuiting any one blocks merge to main.',
      ],
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
          'Bubble sort compares adjacent values and swaps them when the left is larger than the right.',
          'After pass k, the last k items are guaranteed to be in final position — the largest values "bubble" to the end.',
          'Worst and average: O(N²) — every pair of items can be compared. Best case: O(N) when the row is already sorted (one clean pass exits).',
          'Real-world analogue: librarians shelving books and swapping any two neighbors that are out of order each pass.',
          'It is almost never used in production but is invaluable as a teaching tool — every step is visible and the invariant is easy to prove.',
        ],
      },
      pseudocode: {
        code: `function bubbleSort(row):
    repeat:
        swapped = false
        # invariant: after pass k, the last k items are in final position
        for i from 0 to row.length - 2:
            if row[i] > row[i + 1]:
                swap(row[i], row[i + 1])
                swapped = true
    until swapped == false`,
        python: `def bubble_sort(row):
    while True:
        swapped = False
        for i in range(len(row) - 1):
            if row[i] > row[i + 1]:
                row[i], row[i + 1] = row[i + 1], row[i]
                swapped = True
        if not swapped:
            break   # one clean pass = sorted`,
        js: `function bubbleSort(row) {
    let swapped;
    do {
        swapped = false;
        for (let i = 0; i < row.length - 1; i++) {
            if (row[i] > row[i + 1]) {
                [row[i], row[i + 1]] = [row[i + 1], row[i]];
                swapped = true;
            }
        }
    } while (swapped);   // clean pass = sorted
}`,
        explanation: 'The loop keeps sweeping over neighbor pairs. When a full pass needs no swaps, the row is provably sorted. Worst case O(N²), best O(N).',
      },
      miniForge: {
        question: 'What is the worst-case time complexity of bubble sort on a row of N items?',
        options: ['O(N)', 'O(N log N)', 'O(N²)', 'O(2^N)'],
        correctIndex: 2,
        explanation: 'Worst case (reverse-sorted input) requires N passes of N comparisons each — that is O(N²). This is why bubble sort is reserved for teaching; quicksort and mergesort hit O(N log N) and dominate at any meaningful scale.',
      },
      realWorld: [
        'Education: bubble sort is the canonical first sort taught in CS curricula because every swap is visually traceable.',
        'Tiny lists (<10 elements): simple sorts can beat asymptotically-better algorithms because the constant factor is lower.',
        'Adaptive sortedness check: a single clean pass detects whether an already-sorted stream has been disturbed — cheap monitoring tool.',
      ],
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
        title: 'Array Indexing: Go Straight To The Slot',
        explanation: [
          'Array indexing returns the value at a known position in one step.',
          'Cost is O(1) — independent of array size — because the address is computed directly: base + index × element_size.',
          'Contrast: a linked list takes O(N) to reach the Nth item because each node only knows the next pointer.',
          'Real-world analogue: numbered mailboxes on a wall — knowing the number lets you walk straight to the slot.',
          'Trade-off: arrays need contiguous memory; inserting in the middle is O(N) because everything to the right has to shift.',
        ],
      },
      pseudocode: {
        code: `tools = ["rake", "seed", "rope", "hammer"]

function fetch(index):
    return tools[index]    # O(1) — address arithmetic, no loop`,
        python: `tools = ["rake", "seed", "rope", "hammer"]

def fetch(index):
    return tools[index]    # O(1) — direct address lookup`,
        js: `const tools = ["rake", "seed", "rope", "hammer"];

function fetch(index) {
    return tools[index];   // O(1) — direct address lookup
}`,
        explanation: 'The index points directly to one slot — no loop is needed when the address is known. CPUs implement this in a single machine instruction.',
      },
      miniForge: {
        question: 'Which data structure gives O(1) access to its 1,000,000th element?',
        options: ['Singly linked list', 'Array', 'Binary tree', 'Stack'],
        correctIndex: 1,
        explanation: 'Arrays use computed addresses (base + index × size) so any slot is one step away, regardless of position. Linked lists need O(N) walking because each node only knows its neighbor. Trees and stacks have their own access patterns.',
      },
      realWorld: [
        'RAM access by memory address — the original O(1) lookup, baked into CPU hardware.',
        'Database primary-key lookup when the index uses an array structure (e.g., array-based bucket in a hash index).',
        "Game state: tile maps where world[x][y] returns the tile at coordinate (x, y) in one address calculation.",
      ],
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
          'A hash function takes any input and returns a bucket number (or a fixed-size code).',
          'Same input → same output, always. Different inputs may land in the same bucket — that is called a collision.',
          'Good hash functions distribute inputs evenly across buckets; bad ones cause clustering and degrade lookups toward O(N).',
          'Real-world analogue: dividing students into groups by birth-month — same month always lands in the same group.',
          'A hash function plus a collision strategy (chaining or open addressing) is what gives hash maps their O(1) average lookups.',
        ],
      },
      pseudocode: {
        code: `function bucketFor(name, bucketCount):
    # Convert first letter to a number, then fold into the bucket range
    first = alphabetIndex(name[0])
    return first % bucketCount    # modulo keeps result in [0, bucketCount)`,
        python: `def bucket_for(name, bucket_count):
    first = ord(name[0]) - ord('A')   # 'A' = 0, 'B' = 1, ...
    return first % bucket_count       # fold into valid range`,
        js: `function bucketFor(name, bucketCount) {
    const first = name.charCodeAt(0) - 65;   // 'A' = 0, 'B' = 1, ...
    return first % bucketCount;              // fold into valid range
}`,
        explanation: 'Modulo keeps the hash output inside the valid bucket range. Real hash functions also mix bits aggressively so similar inputs ("Alice" and "Alex") spread to different buckets.',
      },
      miniForge: {
        question: 'If a hash function always returns 0, what happens to hash-map lookup performance?',
        options: ['Stays O(1)', 'Improves to O(log N)', 'Degrades to O(N) — all entries collide into one bucket', 'Becomes O(N²)'],
        correctIndex: 2,
        explanation: 'When every key hashes to the same bucket, the lookup must scan every entry in that bucket linearly — O(N). The whole point of a hash function is to spread keys evenly so each bucket holds only a few entries.',
      },
      realWorld: [
        'Git: every commit and file gets a SHA-1 hash — that is how Git deduplicates content and verifies integrity across the entire history.',
        'HTTP caching: URLs are hashed to compute cache keys, so the CDN can fetch the cached response in one lookup.',
        'Load balancers: hash the user session ID to consistently route the same user to the same backend server (sticky sessions).',
      ],
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
        title: 'Two Sum: Find The Complement',
        explanation: [
          'Two-Sum: given a row of values and a target, find two values that add up to the target.',
          'Brute force: check every pair → O(N²) comparisons.',
          'With a hash set: for each value, compute target - value and check if the complement has been seen → O(N) time, O(N) space.',
          'The trick is reframing "find a pair" as "for each value, ask if its complement has been seen". The hash set turns a pair-search into a complement-check.',
          'This complement-via-hash idea generalizes to Three-Sum (O(N²)), K-Sum, and many "find pairs satisfying constraint" problems.',
        ],
      },
      pseudocode: {
        code: `function twoSum(values, target):
    seen = empty set
    for value in values:
        need = target - value            # what would complete the pair?
        if need in seen:                 # already seen the complement?
            return [need, value]
        seen.add(value)                  # remember this value for future checks`,
        python: `def two_sum(values, target):
    seen = set()
    for value in values:
        need = target - value
        if need in seen:                 # O(1) check
            return [need, value]
        seen.add(value)`,
        js: `function twoSum(values, target) {
    const seen = new Set();
    for (const value of values) {
        const need = target - value;
        if (seen.has(need)) return [need, value];   // O(1) check
        seen.add(value);
    }
}`,
        explanation: 'The set remembers everything seen so far, so each new value asks one O(1) question instead of scanning the rest of the row. Total: O(N) time, O(N) space — the classic space-for-time trade.',
      },
      miniForge: {
        question: 'Brute-force two-sum is O(N²). Using a hash set drops it to O(N). What is the cost of that speedup?',
        options: ['You lose access to the input values', 'You use O(N) extra memory for the set', 'The result is only approximate', 'The algorithm becomes harder to parallelize'],
        correctIndex: 1,
        explanation: "The hash set holds up to N values, so memory grows linearly. This is the canonical space-for-time trade — and it is why two-sum is the most popular early problem on LeetCode: it teaches the trade-off in one example.",
      },
      realWorld: [
        'Fraud detection: find paired transactions whose amounts net to a flagged sum (transaction-washing patterns).',
        'Recommender systems: pair items so their combined cost fits the user budget — the same complement-check.',
        'Coding interviews: Two-Sum is the single most asked phone-screen problem, present in some form at most tech companies.',
      ],
      codexEntryId: 'two_sum',
    },
  },

  boss_shuffler: {
    puzzleId: 'boss_shuffler',
    sections: {
      storyRecap: [
        'The Shuffler scattered tiles, broke index labels, and corrupted hash buckets all at once.',
        'You sorted what you could, jumped by index where labels survived, hashed names back into buckets, and paired complementary tiles to finish.',
        'That is what an algorithm engineer does in the wild — recognize which tool fits which corner of the mess.',
      ],
      patternReveal: {
        title: 'Pattern Composition: The Right Tool At The Right Step',
        explanation: [
          'Real software almost never uses one algorithm in isolation; it composes many at different stages of a pipeline.',
          'An ETL job often runs: parse rows (iteration) → group by key (hashing) → sort within groups → join matching pairs (two-pointer).',
          'The skill being tested is not memorizing each pattern — it is recognizing which one solves the current step.',
          'Pipeline complexity is the sum of stages; the slowest stage dominates the total runtime.',
          'Mastering composition is the proof that you understand the patterns: only someone who has seen each in isolation can compose them deliberately.',
        ],
      },
      pseudocode: {
        code: `function shufflerCounter(tiles, target):
    # Stage 1: sort what survived to enable directional moves
    sorted_tiles = bubbleSort(tiles)

    # Stage 2: index the labelled ones for O(1) lookup
    by_index = arrayIndex(sorted_tiles)

    # Stage 3: hash the named ones into buckets
    by_name = hashByName(sorted_tiles)

    # Stage 4: pair complements that sum to target
    return twoSum(sorted_tiles, target)`,
        python: `def shuffler_counter(tiles, target):
    sorted_tiles = bubble_sort(tiles)        # sort
    by_index = list(sorted_tiles)             # index
    by_name = {t.name: t for t in sorted_tiles}  # hash
    return two_sum(sorted_tiles, target)      # pair`,
        js: `function shufflerCounter(tiles, target) {
    const sorted = bubbleSort(tiles);                          // sort
    const byIndex = [...sorted];                                // index
    const byName = Object.fromEntries(sorted.map(t => [t.name, t])); // hash
    return twoSum(sorted, target);                              // pair
}`,
        explanation: 'Four patterns from Array Plains composed into one solution — each stage hands its output to the next, and total cost is the sum of stages dominated by the O(N²) sort.',
      },
      miniForge: {
        question: 'A data pipeline does: parse → sort → group → join. The slowest stage is the sort at O(N log N); the rest are O(N). What is the pipeline\'s total time complexity?',
        options: ['O(N)', 'O(N log N)', 'O(N²)', 'O(N × log N × log N)'],
        correctIndex: 1,
        explanation: 'Stages are additive — total is O(N log N + N + N + N) which simplifies to O(N log N). The slowest stage dominates total complexity. This is why optimizing the slowest stage in a pipeline gives the biggest wins.',
      },
      realWorld: [
        'ETL pipelines: every modern data pipeline (Airflow, dbt, Spark) is a composition of parse + dedupe + sort + group + join stages.',
        'Database query planners: they decide which patterns (hash join, sort-merge join, index scan) to apply for each stage of a SQL query.',
        "Game engines: combat resolution is a pipeline — sort by initiative (sort) + group by team (hash) + apply per-team effects (iteration).",
      ],
      codexEntryId: 'pattern_composition',
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
          'Two-pointer reverse swaps elements from opposite ends, moving both pointers toward the center.',
          'Each iteration fixes two positions, so total work is ⌊N/2⌋ swaps → O(N) time, O(1) extra space.',
          'The "in place" property is key: no new array is allocated; the original is rewritten.',
          'Real-world analogue: reversing a deck of cards by swapping top with bottom, then second-from-top with second-from-bottom.',
          'This pattern underlies "reverse a string", "palindrome check", and countless interview problems — it is the canonical two-pointer warm-up.',
        ],
      },
      pseudocode: {
        code: `function reverse(row):
    L = 0
    R = row.length - 1
    # invariant: after swap, positions L and R are in final position
    while L < R:
        swap(row[L], row[R])
        L = L + 1
        R = R - 1`,
        python: `def reverse(row):
    left, right = 0, len(row) - 1
    while left < right:                            # stop when pointers meet
        row[left], row[right] = row[right], row[left]
        left += 1
        right -= 1`,
        js: `function reverse(row) {
    let left = 0;
    let right = row.length - 1;
    while (left < right) {                          // stop when pointers meet
        [row[left], row[right]] = [row[right], row[left]];
        left++;
        right--;
    }
}`,
        explanation: 'Two pointers start at the ends and walk inward, swapping as they go. Total work is N/2 swaps → O(N) time, O(1) extra memory.',
      },
      miniForge: {
        question: 'How many swaps does it take to reverse a row of 7 values with the two-pointer algorithm?',
        options: ['2', '3', '6', '7'],
        correctIndex: 1,
        explanation: 'A reverse needs ⌊N/2⌋ swaps. ⌊7/2⌋ = 3. The middle element does not need to swap with itself, which is why N/2 (not N) is the swap count.',
      },
      realWorld: [
        "Text editors: reversing a selection or a word in place (Vim's `g?` and reverse-word operators).",
        'Image processing: horizontal flips swap left and right columns row by row — the same two-pointer pattern applied per row.',
        'Networking: byte-order reversal (endianness conversion) on packed structures and integer fields.',
      ],
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
        title: 'Sorted Two-Sum: Directional Pointers',
        explanation: [
          'Sorted Two-Sum exploits the order: each comparison forces one specific pointer move — no guesswork.',
          'Too small → move left pointer right to gain a larger value. Too big → move right pointer left to gain a smaller value.',
          'This turns a pair search from O(N²) (try every pair) into O(N) (each pointer moves at most N times).',
          'Caveat: the sort itself is O(N log N); the total still beats brute force whenever the data fits or arrives pre-sorted.',
          'Generalization: the two-pointer pattern works any time the search space is monotonic — comparison results in a forced direction.',
        ],
      },
      pseudocode: {
        code: `function twoSumSorted(row, target):
    L = 0
    R = row.length - 1
    while L < R:
        sum = row[L] + row[R]
        if sum == target: return [L, R]
        # sortedness forces a deterministic move:
        if sum < target: L = L + 1     # need a bigger value
        else:            R = R - 1     # need a smaller value`,
        python: `def two_sum_sorted(row, target):
    left, right = 0, len(row) - 1
    while left < right:
        total = row[left] + row[right]
        if total == target:
            return left, right
        if total < target: left += 1    # need bigger
        else:              right -= 1   # need smaller`,
        js: `function twoSumSorted(row, target) {
    let left = 0;
    let right = row.length - 1;
    while (left < right) {
        const sum = row[left] + row[right];
        if (sum === target) return [left, right];
        if (sum < target) left++;       // need bigger
        else              right--;      // need smaller
    }
}`,
        explanation: 'The sorted row turns each comparison into a forced pointer move. Total work: O(N) — each pointer moves at most N times before they meet.',
      },
      miniForge: {
        question: 'In sorted two-sum, current sum is 12 and target is 15. The values are sorted ascending. Which pointer should move?',
        options: ['Move LEFT pointer right (need larger sum)', 'Move RIGHT pointer left (need smaller sum)', 'Either works', 'Restart the algorithm'],
        correctIndex: 0,
        explanation: 'Sum is too small, so we need a larger value somewhere. Moving the left pointer right replaces the smallest current value with a larger one — that is the only useful move. Moving the right pointer left would only shrink the sum further.',
      },
      realWorld: [
        'Database joins: sort-merge join uses two pointers on pre-sorted tables for O(N+M) join performance.',
        "Time-series correlation: finding events in two sorted logs whose timestamps sum to a target window.",
        "MergeSort's merge step itself: classic two-pointer walk of two sorted halves combining into one sorted whole.",
      ],
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
        title: 'Fixed Sliding Window: The Rolling Update',
        explanation: [
          'A fixed sliding window keeps the same width while moving across an array.',
          'The rolling-update trick: subtract the value leaving the window, add the value entering — no recomputation of the whole window.',
          'Without the trick: O(N × K) for window size K. With the trick: O(N) — independent of K.',
          'Real-world analogue: a moving average over the last K days, updated each day by dropping yesterday and adding today.',
          'The pattern works for "decomposable" aggregates: sum, count, average — and (with a deque) for max and min.',
        ],
      },
      pseudocode: {
        code: `function maxFixedWindow(row, k):
    sum = total(row[0..k-1])             # prime the first window
    best = sum
    for start from 1 to row.length - k:
        # rolling update: O(1) per slide instead of O(k)
        sum = sum - row[start - 1]        # value leaving
        sum = sum + row[start + k - 1]    # value entering
        best = max(best, sum)
    return best`,
        python: `def max_fixed_window(row, k):
    total = sum(row[:k])                  # prime the first window
    best = total
    for start in range(1, len(row) - k + 1):
        total -= row[start - 1]            # value leaving
        total += row[start + k - 1]        # value entering
        best = max(best, total)
    return best`,
        js: `function maxFixedWindow(row, k) {
    let total = row.slice(0, k).reduce((a, b) => a + b, 0);  // prime
    let best = total;
    for (let start = 1; start <= row.length - k; start++) {
        total -= row[start - 1];             // value leaving
        total += row[start + k - 1];         // value entering
        best = Math.max(best, total);
    }
    return best;
}`,
        explanation: 'One value leaves, one value enters per slide — the rolling update is O(1) per step. Total cost is O(N) regardless of window size K.',
      },
      miniForge: {
        question: 'A size-3 window has sum 10. It slides right: 2 leaves the window and 7 enters. What is the new sum?',
        options: ['5', '10', '15', '19'],
        correctIndex: 2,
        explanation: '10 - 2 + 7 = 15. The rolling update only touches the two changing values, never the unchanged middle. This is what makes the algorithm O(N) instead of O(N×K).',
      },
      realWorld: [
        "Networking: TCP congestion control uses rolling-average bandwidth over the last N seconds to decide whether to grow the window.",
        'Stock and crypto: K-day moving averages for trend detection are computed exactly this way on streaming price feeds.',
        'Game engines: rolling FPS counters show the average frame time over the last 60 frames using the same rolling sum.',
      ],
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
        title: 'Variable Sliding Window: Grow And Shrink',
        explanation: [
          'A variable sliding window grows the right pointer and shrinks the left pointer to maintain an invariant.',
          'For "longest unique substring" the invariant is: no duplicate values inside [left, right].',
          'Each pointer moves only forward, never backwards, so total work is O(N) — not O(N²) despite the nested-looking shape.',
          'Real-world analogue: filling a glass while keeping the water under a line — pour until the line, drain until below.',
          'This is the single highest-leverage pattern in technical interviews — many medium-difficulty array problems collapse to a variable-window walk.',
        ],
      },
      pseudocode: {
        code: `function longestUnique(row):
    L = 0
    best = 0
    seen = empty map
    for R from 0 to row.length - 1:
        # If row[R] is already inside [L, R], shrink from L
        if row[R] in seen and seen[row[R]] >= L:
            L = seen[row[R]] + 1
        seen[row[R]] = R               # remember most recent position
        best = max(best, R - L + 1)`,
        python: `def longest_unique(row):
    left = 0
    best = 0
    seen = {}
    for right, value in enumerate(row):
        if value in seen and seen[value] >= left:
            left = seen[value] + 1     # shrink past the duplicate
        seen[value] = right            # remember most recent position
        best = max(best, right - left + 1)
    return best`,
        js: `function longestUnique(row) {
    let left = 0;
    let best = 0;
    const seen = new Map();
    for (let right = 0; right < row.length; right++) {
        const value = row[right];
        if (seen.has(value) && seen.get(value) >= left) {
            left = seen.get(value) + 1;   // shrink past the duplicate
        }
        seen.set(value, right);            // remember most recent position
        best = Math.max(best, right - left + 1);
    }
    return best;
}`,
        explanation: 'Extend right to test the invariant; shrink left to restore it. Each pointer moves at most N times, so the algorithm is O(N) despite the inner-loop appearance.',
      },
      miniForge: {
        question: 'A variable sliding window has two nested-looking loops (an outer right pointer and an inner left shrink). Why is it still O(N), not O(N²)?',
        options: ['Because hash maps are O(1)', 'Because each pointer moves at most N times — left never goes backwards', 'Because most inputs are small', 'Because modern CPUs parallelize loops'],
        correctIndex: 1,
        explanation: "Even though the code reads like nested loops, the left pointer only moves forward and can advance at most N times total across the whole run. Right also moves at most N times. Combined: ≤2N pointer movements → O(N). This is called amortized analysis.",
      },
      realWorld: [
        'Rate limiting: longest streak of requests within a quota — old requests slide out of the window as new ones enter.',
        'Bioinformatics: longest DNA substring with at most K distinct nucleotides — the exact same shrink-on-violation pattern.',
        "Editor features: 'find unique words in viewport' that highlight non-repeating tokens as the user scrolls.",
      ],
      codexEntryId: 'variable_sliding_window',
    },
  },

  boss_mirror_serpent: {
    puzzleId: 'boss_mirror_serpent',
    sections: {
      storyRecap: [
        'The Mirror Serpent did not test one pattern. It demanded that you carry two pointers AND a sliding window AND a complement search at once.',
        'Each move had to serve every constraint simultaneously, like steering a boat while balancing a tray.',
        'When the serpent fell, it was because you had stopped switching between patterns — you were running them all together.',
      ],
      patternReveal: {
        title: 'Pointer Composition: Multi-Pass In One Pass',
        explanation: [
          'Real software often combines pointer patterns in a single walk — the result is still O(N) because each pointer only moves forward.',
          'This is the "linear-time multi-pass" idea: one walk through the array can compute several invariants at once.',
          'The hard part is not the code; it is keeping each invariant separately correct while they share the same loop.',
          'Real-world analogue: editing a video while tracking dialogue timing and music beats simultaneously — three concerns, one timeline.',
          'This is the signature of expert algorithm engineers: composing simple patterns into one pass instead of running multiple O(N) passes back-to-back.',
        ],
      },
      pseudocode: {
        code: `function mirrorSerpent(row, target):
    L = 0
    R = row.length - 1
    seen = empty map        # for complement-search invariant
    best = 0
    while L < R:
        # Two-pointer narrowing toward target sum
        sum = row[L] + row[R]

        # Sliding-window invariant: track unique seen
        seen[row[L]] = (seen.get(row[L], 0)) + 1
        best = max(best, R - L + 1)

        # Complement-search piggyback
        if (target - row[L]) in seen: record_pair()

        if sum < target: L = L + 1
        else:            R = R - 1`,
        python: `def mirror_serpent(row, target):
    left, right = 0, len(row) - 1
    seen = {}
    best = 0
    while left < right:
        total = row[left] + row[right]
        seen[row[left]] = seen.get(row[left], 0) + 1
        best = max(best, right - left + 1)
        if (target - row[left]) in seen: record_pair()
        if total < target: left += 1
        else:              right -= 1
    return best`,
        js: `function mirrorSerpent(row, target) {
    let left = 0, right = row.length - 1, best = 0;
    const seen = new Map();
    while (left < right) {
        const sum = row[left] + row[right];
        seen.set(row[left], (seen.get(row[left]) ?? 0) + 1);
        best = Math.max(best, right - left + 1);
        if (seen.has(target - row[left])) recordPair();
        if (sum < target) left++;
        else              right--;
    }
    return best;
}`,
        explanation: 'Each pointer moves at most N times; the hash map stays O(N) extra space. Three patterns share one loop and the total cost stays linear — that is the win composition buys.',
      },
      miniForge: {
        question: 'You combine three O(N) patterns into a single loop. What is the worst-case time complexity of the combined algorithm?',
        options: ['O(N) — pointers still each move at most N times', 'O(N²) — three patterns multiplied', 'O(3N) — three patterns combined', 'O(N³) — three patterns cubed'],
        correctIndex: 0,
        explanation: 'Combining patterns inside one loop preserves linear time as long as each pointer only moves forward and each step is O(1) work. Three independent O(1) operations per step still total O(1). This is amortized linear time — a key trick in expert-level algorithms.',
      },
      realWorld: [
        'Compilers: lexer + parser + symbol-table-builder running together in a single pass over the AST.',
        "Editors: real-time 'find unique words + spellcheck + highlight syntax' all running on each keystroke in one pass.",
        'Audio apps: real-time pitch detection + beat detection + chord recognition combined into a single pass over the audio stream.',
      ],
      codexEntryId: 'pointer_composition',
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
      realWorld: [
        `${concept} appears across many systems whenever the same state-plus-rule shape recurs.`,
        'This bridge will be replaced with bespoke production examples once this region exits beta.',
        'For now, look for the pattern in code you already read — it is more common than the puzzle alone suggests.',
      ],
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
