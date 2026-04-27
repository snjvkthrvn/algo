export type PrologueBeat =
  | 'opening_scene'
  | 'node_intro'
  | 'watcher_warning'
  | 'glitch_intro'
  | 'boss_gate_cutscene'
  | 'boss_return_cutscene'
  | 'free_explore';

export interface PrologueStoryFlags {
  openingSceneDone: boolean;
  professorNodeIntroDone: boolean;
  watcherWarningDone: boolean;
  glitchIntroDone: boolean;
  bossGateCutsceneDone: boolean;
  bossReturnCutsceneDone: boolean;
  puzzleP01Complete: boolean;
  puzzleP02Complete: boolean;
  puzzleBossSentinelComplete: boolean;
}

export function createPrologueStoryFlags(
  overrides: Partial<PrologueStoryFlags> = {},
): PrologueStoryFlags {
  return {
    openingSceneDone: false,
    professorNodeIntroDone: false,
    watcherWarningDone: false,
    glitchIntroDone: false,
    bossGateCutsceneDone: false,
    bossReturnCutsceneDone: false,
    puzzleP01Complete: false,
    puzzleP02Complete: false,
    puzzleBossSentinelComplete: false,
    ...overrides,
  };
}

export function getPendingPrologueBeat(flags: PrologueStoryFlags): PrologueBeat {
  if (!flags.openingSceneDone) return 'opening_scene';
  if (!flags.professorNodeIntroDone) return 'node_intro';
  if (!flags.watcherWarningDone) return 'watcher_warning';
  if (flags.puzzleP01Complete && !flags.glitchIntroDone) return 'glitch_intro';
  if (flags.puzzleP01Complete && flags.puzzleP02Complete && !flags.bossGateCutsceneDone) {
    return 'boss_gate_cutscene';
  }
  if (flags.puzzleBossSentinelComplete && !flags.bossReturnCutsceneDone) {
    return 'boss_return_cutscene';
  }
  return 'free_explore';
}

export function shouldTriggerWatcherAtPosition(
  flags: PrologueStoryFlags,
  position: { x: number; y: number },
): boolean {
  if (!flags.professorNodeIntroDone || flags.watcherWarningDone) return false;
  const onPuzzleLane = position.x >= 730 && (position.y <= 360 || position.y >= 450);
  return onPuzzleLane;
}
