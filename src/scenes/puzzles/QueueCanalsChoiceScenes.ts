import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { SCENE_KEYS } from '../../config/constants';
import {
  FERRY_DOCK_ROUNDS,
  PRIORITY_DOCK_ROUNDS,
  RECONCILER_ROUNDS,
  RIPPLE_MAP_ROUNDS,
  SCHEDULER_LOTTERY_ROUNDS,
  isCorrectQueueChoice,
  type QueueCanalsChoiceRound,
} from '../../data/puzzles/queueCanalsPuzzleLogic';
import { ScriptedChoiceScene, type ScriptedChoiceTheme } from './ScriptedChoiceScene';

const QUEUE_THEME: ScriptedChoiceTheme = {
  markerLabel: 'BIT QUEUE',
  panelColor: 0x16465c,
  optionStrokeColor: 0x16465c,
  accentColor: 0xfbbf24,
  secondaryAccentColor: 0x5ab7d4,
  wrongMessage: 'That ticket breaks the line.',
  hintLead: 'Ask who arrived first, who is most urgent, or whose turn has waited too long.',
  motif: 'queue',
};

abstract class QueueCanalsChoiceScene extends ScriptedChoiceScene<QueueCanalsChoiceRound> {
  protected theme = QUEUE_THEME;

  protected isCorrectChoice(round: QueueCanalsChoiceRound, choiceIndex: number): boolean {
    return isCorrectQueueChoice(round, choiceIndex);
  }
}

export class P5_1_FerryQueue extends QueueCanalsChoiceScene {
  protected rounds = FERRY_DOCK_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_QC_1 });
    this.puzzleId = 'qc_1';
    this.puzzleName = 'Ferry Dock';
    this.puzzleDescription = 'Serve arrivals in first-in, first-out order.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_FERRY_DOCK_BG;
  }

  protected getConceptName(): string {
    return 'Queue FIFO';
  }
}

export class P5_2_BfsLocks extends QueueCanalsChoiceScene {
  protected rounds = RIPPLE_MAP_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_QC_2 });
    this.puzzleId = 'qc_2';
    this.puzzleName = 'Ripple Map';
    this.puzzleDescription = 'Spread outward by distance to prove shortest hops.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_RIPPLE_MAP_BG;
  }

  protected getConceptName(): string {
    return 'Breadth-First Search';
  }
}

export class P5_3_PriorityHarbor extends QueueCanalsChoiceScene {
  protected rounds = PRIORITY_DOCK_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_QC_3 });
    this.puzzleId = 'qc_3';
    this.puzzleName = 'Priority Dock';
    this.puzzleDescription = 'Let urgency rise without discarding fairness.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_PRIORITY_DOCK_BG;
  }

  protected getConceptName(): string {
    return 'Priority Queue';
  }
}

export class P5_4_SchedulerOffice extends QueueCanalsChoiceScene {
  protected rounds = SCHEDULER_LOTTERY_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_QC_4 });
    this.puzzleId = 'qc_4';
    this.puzzleName = 'Scheduler Lottery';
    this.puzzleDescription = 'Give every process a turn before starvation starts.';
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_SCHEDULER_LOTTERY_BG;
  }

  protected getConceptName(): string {
    return 'Round-Robin Scheduling';
  }
}

export class Boss_Reconciler extends QueueCanalsChoiceScene {
  protected rounds = RECONCILER_ROUNDS;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_RECONCILER });
    this.puzzleId = 'boss_reconciler';
    this.puzzleName = 'The Reconciler';
    this.puzzleDescription = 'Merge order, urgency, breadth, and turns.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_RECONCILER_BG;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.035;
  }

  protected shouldSkipConceptBridge(): boolean {
    return true;
  }

  protected getConceptName(): string {
    return 'Queue Mastery';
  }
}
