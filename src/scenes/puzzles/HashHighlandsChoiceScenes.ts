import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { SCENE_KEYS } from '../../config/constants';
import {
  ANAGRAM_GARDEN_ROUNDS,
  ARCHIVIST_ROUNDS,
  CACHE_CAVERN_ROUNDS,
  FREQUENCY_FORGE_ROUNDS,
  NAMEPLATE_GATE_ROUNDS,
  isCorrectHashChoice,
  type HashHighlandsChoiceRound,
} from '../../data/puzzles/hashHighlandsPuzzleLogic';
import { ScriptedChoiceScene, type ScriptedChoiceTheme } from './ScriptedChoiceScene';

const HASH_HIGHLANDS_THEME: ScriptedChoiceTheme = {
  markerLabel: 'BIT CACHE',
  panelColor: 0x4a3821,
  optionStrokeColor: 0x4a3821,
  accentColor: 0xfbbf24,
  secondaryAccentColor: 0x5ab7d4,
  wrongMessage: 'That name does not open this place.',
  hintLead: 'Use the stable name or signature instead of replaying the whole search.',
  motif: 'hash',
};

abstract class HashHighlandsChoiceScene extends ScriptedChoiceScene<HashHighlandsChoiceRound> {
  protected theme = HASH_HIGHLANDS_THEME;

  protected getPuzzleFrameFillAlpha(): number {
    return 0.03;
  }

  protected isCorrectChoice(round: HashHighlandsChoiceRound, choiceIndex: number): boolean {
    return isCorrectHashChoice(round, choiceIndex);
  }
}

export class P3_1_NameplateGates extends HashHighlandsChoiceScene {
  protected rounds = NAMEPLATE_GATE_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_HH_1 });
    this.puzzleId = 'hh_1';
    this.puzzleName = 'Nameplate Gates';
    this.puzzleDescription = 'Use a name as the fastest address.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_HASH_NAMEPLATE_GATES_BG;
  }

  protected getConceptName(): string {
    return 'Hash Map Lookup';
  }
}

export class P3_2_FrequencyForge extends HashHighlandsChoiceScene {
  protected rounds = FREQUENCY_FORGE_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_HH_2 });
    this.puzzleId = 'hh_2';
    this.puzzleName = 'Frequency Forge';
    this.puzzleDescription = 'Let bins remember the shape of a stream.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_HASH_FREQUENCY_FORGE_BG;
  }

  protected getConceptName(): string {
    return 'Frequency Counting';
  }
}

export class P3_3_AnagramGardens extends HashHighlandsChoiceScene {
  protected rounds = ANAGRAM_GARDEN_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_HH_3 });
    this.puzzleId = 'hh_3';
    this.puzzleName = 'Anagram Gardens';
    this.puzzleDescription = 'Group different blooms by the same hidden key.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_HASH_ANAGRAM_GARDENS_BG;
  }

  protected getConceptName(): string {
    return 'Canonical Keys';
  }
}

export class P3_4_CacheCavern extends HashHighlandsChoiceScene {
  protected rounds = CACHE_CAVERN_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_HH_4 });
    this.puzzleId = 'hh_4';
    this.puzzleName = 'Cache Cavern';
    this.puzzleDescription = 'Let a past answer help a future question.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_HASH_CACHE_CAVERN_BG;
  }

  protected getConceptName(): string {
    return 'Memoization';
  }
}

export class Boss_Archivist extends HashHighlandsChoiceScene {
  protected rounds = ARCHIVIST_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_ARCHIVIST });
    this.puzzleId = 'boss_archivist';
    this.puzzleName = 'The Archivist';
    this.puzzleDescription = 'Stabilize lookup, counting, grouping, and memory.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_HASH_ARCHIVIST_BG;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.035;
  }

  protected shouldSkipConceptBridge(): boolean {
    return true;
  }

  protected getConceptName(): string {
    return 'Hash Mastery';
  }
}
