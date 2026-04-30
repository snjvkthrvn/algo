import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { SCENE_KEYS } from '../../config/constants';
import {
  ECHO_CHAMBER_ROUNDS,
  GRAND_ARCHIVE_ROUNDS,
  HALL_OF_PATTERNS_ROUNDS,
  PROTOCOL_OMEGA_ROUNDS,
  WEIGHTED_STAIRCASE_ROUNDS,
  isCorrectCoreChoice,
  type CoreChoiceRound,
} from '../../data/puzzles/corePuzzleLogic';
import { ScriptedChoiceScene, type ScriptedChoiceTheme } from './ScriptedChoiceScene';

const CORE_THEME: ScriptedChoiceTheme = {
  markerLabel: 'BIT CORE',
  panelColor: 0x3b2520,
  optionStrokeColor: 0x3b2520,
  accentColor: 0xf97316,
  secondaryAccentColor: 0x38bdf8,
  wrongMessage: 'That subproblem does not resolve.',
  hintLead: 'Ask what should be remembered, filled, combined, or selected.',
  motif: 'core',
};

abstract class CoreChoiceScene extends ScriptedChoiceScene<CoreChoiceRound> {
  protected theme = CORE_THEME;

  protected isCorrectChoice(round: CoreChoiceRound, choiceIndex: number): boolean {
    return isCorrectCoreChoice(round, choiceIndex);
  }
}

export class P8_1_EchoChamber extends CoreChoiceScene {
  protected rounds = ECHO_CHAMBER_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_CORE_1 });
    this.puzzleId = 'core_1';
    this.puzzleName = 'Echo Chamber';
    this.puzzleDescription = 'Cache repeated subanswers before the echoes multiply.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_CORE_ECHO_CHAMBER_BG;
  }

  protected getConceptName(): string {
    return 'Memoization';
  }
}

export class P8_2_WeightedStaircase extends CoreChoiceScene {
  protected rounds = WEIGHTED_STAIRCASE_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_CORE_2 });
    this.puzzleId = 'core_2';
    this.puzzleName = 'Weighted Staircase';
    this.puzzleDescription = 'Build the table from solved smaller steps.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_CORE_WEIGHTED_STAIRCASE_BG;
  }

  protected getConceptName(): string {
    return 'Tabulation';
  }
}

export class P8_3_GrandArchive extends CoreChoiceScene {
  protected rounds = GRAND_ARCHIVE_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_CORE_3 });
    this.puzzleId = 'core_3';
    this.puzzleName = 'Grand Archive';
    this.puzzleDescription = 'Let every grid cell answer a smaller question.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_CORE_GRAND_ARCHIVE_BG;
  }

  protected getConceptName(): string {
    return '2D Dynamic Programming';
  }
}

export class P8_4_HallOfPatterns extends CoreChoiceScene {
  protected rounds = HALL_OF_PATTERNS_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_CORE_4 });
    this.puzzleId = 'core_4';
    this.puzzleName = 'Hall of Patterns';
    this.puzzleDescription = 'Recognize each subproblem and invoke the right tool.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_CORE_HALL_OF_PATTERNS_BG;
  }

  protected getConceptName(): string {
    return 'Algorithm Composition';
  }
}

export class Boss_ProtocolOmega extends CoreChoiceScene {
  protected rounds = PROTOCOL_OMEGA_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_PROTOCOL_OMEGA });
    this.puzzleId = 'boss_protocol_omega';
    this.puzzleName = 'Protocol Omega';
    this.puzzleDescription = 'Compress the whole journey into one final answer.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_CORE_PROTOCOL_OMEGA_BG;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.035;
  }

  protected shouldSkipConceptBridge(): boolean {
    return true;
  }

  protected getConceptName(): string {
    return 'Dynamic Programming Mastery';
  }
}
