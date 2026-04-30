import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { SCENE_KEYS } from '../../config/constants';
import {
  BRIDGE_MAP_ROUNDS,
  COURIER_DILEMMA_ROUNDS,
  CYCLE_BAZAAR_ROUNDS,
  ECHO_ROUNDS,
  ISLAND_CENSUS_ROUNDS,
  isCorrectGraphChoice,
  type GraphNexusChoiceRound,
} from '../../data/puzzles/graphNexusPuzzleLogic';
import { ScriptedChoiceScene, type ScriptedChoiceTheme } from './ScriptedChoiceScene';

const GRAPH_THEME: ScriptedChoiceTheme = {
  markerLabel: 'BIT GRAPH',
  panelColor: 0x203457,
  optionStrokeColor: 0x203457,
  accentColor: 0xfbbf24,
  secondaryAccentColor: 0x38bdf8,
  wrongMessage: 'That edge does not connect.',
  hintLead: 'Ask whether the graph needs neighbors, cost, cycle marks, or components.',
  motif: 'graph',
};

abstract class GraphNexusChoiceScene extends ScriptedChoiceScene<GraphNexusChoiceRound> {
  protected theme = GRAPH_THEME;

  protected isCorrectChoice(round: GraphNexusChoiceRound, choiceIndex: number): boolean {
    return isCorrectGraphChoice(round, choiceIndex);
  }
}

export class P7_1_NodeLinks extends GraphNexusChoiceScene {
  protected rounds = BRIDGE_MAP_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_GN_1 });
    this.puzzleId = 'gn_1';
    this.puzzleName = 'Bridge Map';
    this.puzzleDescription = 'Read nodes, edges, and adjacency as one shape.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_BRIDGE_MAP_BG;
  }

  protected getConceptName(): string {
    return 'Graph Basics';
  }
}

export class P7_2_ShortestPath extends GraphNexusChoiceScene {
  protected rounds = COURIER_DILEMMA_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_GN_2 });
    this.puzzleId = 'gn_2';
    this.puzzleName = 'Courier Dilemma';
    this.puzzleDescription = 'Listen to edge weights, not just step counts.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_COURIER_DILEMMA_BG;
  }

  protected getConceptName(): string {
    return 'Dijkstra Shortest Path';
  }
}

export class P7_3_CycleCourt extends GraphNexusChoiceScene {
  protected rounds = CYCLE_BAZAAR_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_GN_3 });
    this.puzzleId = 'gn_3';
    this.puzzleName = 'Cycle Bazaar';
    this.puzzleDescription = 'Mark active paths so loops cannot hide.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_CYCLE_BAZAAR_BG;
  }

  protected getConceptName(): string {
    return 'Cycle Detection';
  }
}

export class P7_4_ComponentFields extends GraphNexusChoiceScene {
  protected rounds = ISLAND_CENSUS_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_GN_4 });
    this.puzzleId = 'gn_4';
    this.puzzleName = 'Island Census';
    this.puzzleDescription = 'Count each reachable world by starting over.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_ISLAND_CENSUS_BG;
  }

  protected getConceptName(): string {
    return 'Connected Components';
  }
}

export class Boss_Echo extends GraphNexusChoiceScene {
  protected rounds = ECHO_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_ECHO });
    this.puzzleId = 'boss_echo';
    this.puzzleName = 'The Echo';
    this.puzzleDescription = 'Merge optimal paths with exploratory proof.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_ECHO_BG;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.035;
  }

  protected shouldSkipConceptBridge(): boolean {
    return true;
  }

  protected getConceptName(): string {
    return 'Graph Mastery';
  }
}
