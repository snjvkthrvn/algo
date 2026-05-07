import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { SCENE_KEYS } from '../../config/constants';
import {
  MAZE_OF_FORKS_ROUNDS,
  MIRROR_STAIRCASE_ROUNDS,
  RECURSION_ROUNDS,
  SCROLL_STACK_ROUNDS,
  TOWER_OF_MEMORY_ROUNDS,
  isCorrectStackChoice,
  type StackSpiresChoiceRound,
} from '../../data/puzzles/stackSpiresPuzzleLogic';
import { ScriptedChoiceScene, type ScriptedChoiceTheme } from './ScriptedChoiceScene';

const STACK_SPIRES_THEME: ScriptedChoiceTheme = {
  markerLabel: 'BIT STACK',
  panelColor: 0x263247,
  optionStrokeColor: 0x263247,
  accentColor: 0xf97316,
  secondaryAccentColor: 0x9be8ff,
  wrongMessage: 'That path loses the return.',
  hintLead: 'Ask what is on top, what returns, or what branch can be crossed off.',
  motif: 'stack',
};

abstract class StackSpiresChoiceScene extends ScriptedChoiceScene<StackSpiresChoiceRound> {
  protected theme = STACK_SPIRES_THEME;

  protected getPuzzleFrameFillAlpha(): number {
    return 0.028;
  }

  protected isCorrectChoice(round: StackSpiresChoiceRound, choiceIndex: number): boolean {
    return isCorrectStackChoice(round, choiceIndex);
  }
}

export class P4_1_ScrollStack extends StackSpiresChoiceScene {
  protected rounds = SCROLL_STACK_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_SS_1 });
    this.puzzleId = 'ss_1';
    this.puzzleName = 'Scroll Stack';
    this.puzzleDescription = 'Only the top scroll can leave first.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_STACK_SCROLL_STACK_BG;
  }

  protected getConceptName(): string {
    return 'Stack LIFO';
  }
}

export class P4_2_MirrorStaircase extends StackSpiresChoiceScene {
  protected rounds = MIRROR_STAIRCASE_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_SS_2 });
    this.puzzleId = 'ss_2';
    this.puzzleName = 'Mirror Staircase';
    this.puzzleDescription = 'Trust the smaller staircase and return.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_STACK_MIRROR_STAIRCASE_BG;
  }

  protected getConceptName(): string {
    return 'Recursion';
  }
}

export class P4_3_MazeOfForks extends StackSpiresChoiceScene {
  protected rounds = MAZE_OF_FORKS_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_SS_3 });
    this.puzzleId = 'ss_3';
    this.puzzleName = 'Maze of Forks';
    this.puzzleDescription = 'Retreat from dead ends and try the next branch.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_STACK_MAZE_OF_FORKS_BG;
  }

  protected getConceptName(): string {
    return 'Backtracking';
  }
}

export class P4_4_TowerOfMemory extends StackSpiresChoiceScene {
  protected rounds = TOWER_OF_MEMORY_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_SS_4 });
    this.puzzleId = 'ss_4';
    this.puzzleName = 'Tower of Memory';
    this.puzzleDescription = 'Depth has a cost, and memory has a floor.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_STACK_TOWER_OF_MEMORY_BG;
  }

  protected getConceptName(): string {
    return 'Call Stack Depth';
  }
}

export class Boss_Recursion extends StackSpiresChoiceScene {
  protected rounds = RECURSION_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_RECURSION });
    this.puzzleId = 'boss_recursion';
    this.puzzleName = 'The Recursion';
    this.puzzleDescription = 'Descend, find the base case, and return.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_STACK_RECURSION_BG;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.032;
  }

  protected shouldSkipConceptBridge(): boolean {
    return true;
  }

  protected getConceptName(): string {
    return 'Recursion Mastery';
  }
}
