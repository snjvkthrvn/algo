import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { SCENE_KEYS } from '../../config/constants';
import { JuiceSystem } from '../../systems/JuiceSystem';
import {
  BENT_BOUGH_ROUNDS,
  DEEP_ROOT_ROUNDS,
  FIRST_FORK_ROUNDS,
  PATTERN_ROUNDS,
  SORTED_GROVE_ROUNDS,
  isCorrectTreeChoice,
  type TreeCanopyChoiceRound,
} from '../../data/puzzles/treeCanopyPuzzleLogic';
import { ScriptedChoiceScene, type ScriptedChoiceTheme } from './ScriptedChoiceScene';

const TREE_THEME: ScriptedChoiceTheme = {
  markerLabel: 'BIT TREE',
  panelColor: 0x1f4b32,
  optionStrokeColor: 0x1f4b32,
  accentColor: 0xfbbf24,
  secondaryAccentColor: 0x22c55e,
  wrongMessage: 'That branch loses the shape.',
  hintLead: 'Ask whether this step needs order, comparison, depth, or balance.',
  motif: 'tree',
};

abstract class TreeCanopyChoiceScene extends ScriptedChoiceScene<TreeCanopyChoiceRound> {
  protected theme = TREE_THEME;

  protected isCorrectChoice(round: TreeCanopyChoiceRound, choiceIndex: number): boolean {
    return isCorrectTreeChoice(round, choiceIndex);
  }
}

export class P6_1_RootWalk extends TreeCanopyChoiceScene {
  protected rounds = FIRST_FORK_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TC_1 });
    this.puzzleId = 'tc_1';
    this.puzzleName = 'The First Fork';
    this.puzzleDescription = 'Choose the traversal order that reveals the tree.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TREE_FIRST_FORK_BG;
  }

  protected getConceptName(): string {
    return 'Tree Traversal';
  }
}

export class P6_2_BstGrove extends TreeCanopyChoiceScene {
  protected rounds = SORTED_GROVE_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TC_2 });
    this.puzzleId = 'tc_2';
    this.puzzleName = 'Sorted Grove';
    this.puzzleDescription = 'Use comparisons to cut the search space in half.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TREE_SORTED_GROVE_BG;
  }

  protected getConceptName(): string {
    return 'Binary Search Tree';
  }
}

export class P6_3_DfsBranches extends TreeCanopyChoiceScene {
  protected rounds = DEEP_ROOT_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TC_3 });
    this.puzzleId = 'tc_3';
    this.puzzleName = 'The Deep Root';
    this.puzzleDescription = 'Commit to a branch, then backtrack cleanly.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TREE_DEEP_ROOT_BG;
  }

  protected getConceptName(): string {
    return 'Depth-First Search';
  }
}

export class P6_4_BalanceCanopy extends TreeCanopyChoiceScene {
  protected rounds = BENT_BOUGH_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TC_4 });
    this.puzzleId = 'tc_4';
    this.puzzleName = 'The Bent Bough';
    this.puzzleDescription = 'Rotate a lopsided hierarchy back into a tree.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TREE_BENT_BOUGH_BG;
  }

  protected getConceptName(): string {
    return 'Tree Balancing';
  }
}

export class Boss_Pattern extends TreeCanopyChoiceScene {
  protected rounds = PATTERN_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_PATTERN });
    this.puzzleId = 'boss_pattern';
    this.puzzleName = 'The Pattern';
    this.puzzleDescription = 'Hold traversal, search, depth, and balance at once.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TREE_PATTERN_BG;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.035;
  }

  protected shouldSkipConceptBridge(): boolean {
    return true;
  }

  protected getConceptName(): string {
    return 'Tree Mastery';
  }
}
