import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { SCENE_KEYS } from '../../config/constants';
import {
  FIXED_WINDOW_ROUNDS,
  MIRROR_SERPENT_ROUNDS,
  MIRROR_WALK_ROUNDS,
  POINTER_BRIDGE_ROUNDS,
  VARIABLE_WINDOW_ROUNDS,
  isCorrectChoice as isCorrectTwinRiversChoice,
  type TwinRiversChoiceRound,
} from '../../data/puzzles/twinRiversPuzzleLogic';
import { ScriptedChoiceScene, type ScriptedChoiceTheme } from './ScriptedChoiceScene';

const TWIN_RIVERS_THEME: ScriptedChoiceTheme = {
  markerLabel: 'BIT RIVER',
  panelColor: 0x28698a,
  optionStrokeColor: 0x28698a,
  accentColor: 0xf97316,
  secondaryAccentColor: 0x5ab7d4,
  wrongMessage: 'The current pulls against that move.',
  hintLead: 'Read both banks before moving. The river rewards edge awareness.',
  motif: 'river',
};

abstract class TwinRiversChoiceScene extends ScriptedChoiceScene<TwinRiversChoiceRound> {
  protected theme = TWIN_RIVERS_THEME;

  protected getPuzzleFrameFillAlpha(): number {
    return 0.025;
  }

  protected isCorrectChoice(round: TwinRiversChoiceRound, choiceIndex: number): boolean {
    return isCorrectTwinRiversChoice(round, choiceIndex);
  }
}

export class P2_1_MirrorWalk extends TwinRiversChoiceScene {
  protected rounds = MIRROR_WALK_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_1 });
    this.puzzleId = 'tr_1';
    this.puzzleName = 'Mirror Walk';
    this.puzzleDescription = 'Move two paths as one mirrored decision.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_MIRROR_WALK_BG;
  }

  protected getConceptName(): string {
    return 'Two Pointers';
  }
}

export class P2_2_PointerBridge extends TwinRiversChoiceScene {
  protected rounds = POINTER_BRIDGE_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_2 });
    this.puzzleId = 'tr_2';
    this.puzzleName = 'Pointer Bridge';
    this.puzzleDescription = 'Use sorted edges to find a target pair.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_POINTER_BRIDGE_BG;
  }

  protected getConceptName(): string {
    return 'Sorted Two Sum';
  }
}

export class P2_3_FixedWindowDock extends TwinRiversChoiceScene {
  protected rounds = FIXED_WINDOW_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_3 });
    this.puzzleId = 'tr_3';
    this.puzzleName = 'Fixed Window Dock';
    this.puzzleDescription = 'Track only what fits inside the current window.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_FIXED_WINDOW_BG;
  }

  protected getConceptName(): string {
    return 'Fixed Sliding Window';
  }
}

export class P2_4_CurrentRider extends TwinRiversChoiceScene {
  protected rounds = VARIABLE_WINDOW_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_TR_4 });
    this.puzzleId = 'tr_4';
    this.puzzleName = 'Current Rider';
    this.puzzleDescription = 'Let the river decide when the window grows or shrinks.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_VARIABLE_WINDOW_BG;
  }

  protected getConceptName(): string {
    return 'Variable Sliding Window';
  }
}

export class Boss_MirrorSerpent extends TwinRiversChoiceScene {
  protected rounds = MIRROR_SERPENT_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_MIRROR_SERPENT });
    this.puzzleId = 'boss_mirror_serpent';
    this.puzzleName = 'Mirror Serpent';
    this.puzzleDescription = 'Align both rivers and prove traversal mastery.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_MIRROR_SERPENT_BG;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.03;
  }

  protected shouldSkipConceptBridge(): boolean {
    return true;
  }

  protected getConceptName(): string {
    return 'Traversal Mastery';
  }
}
