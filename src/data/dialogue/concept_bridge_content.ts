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
};
