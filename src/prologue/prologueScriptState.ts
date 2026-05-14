import { PROLOGUE_ANCHORS, isWithinAnchorProximity } from '../data/regions/prologueAnchors';

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
  // The Rune/Console approach bands (y ≤ 360 or y ≥ 450) overlap the Node intro
  // proximity disk near the central hub. Without this guard, closing the
  // Professor dialogue immediately called `playWatcherWarning`, which freezes
  // the player for a ~5s silent flyby — felt like a hard lock.
  if (isWithinAnchorProximity(PROLOGUE_ANCHORS.professorNode, position)) return false;
  const onPuzzleLane = position.x >= 730 && (position.y <= 360 || position.y >= 450);
  return onPuzzleLane;
}

/**
 * The Node intro fires when the player has chosen to walk close to the
 * central hub — never via a forced cinematic walk. The opening cinematic
 * must complete first so movement instructions are read; after that, the
 * player has full control until proximity arms the beat.
 */
export function shouldTriggerNodeIntroAtPosition(
  flags: PrologueStoryFlags,
  position: { x: number; y: number },
  nodeAnchor: { x: number; y: number },
  proximityRadiusPx: number,
): boolean {
  if (!flags.openingSceneDone) return false;
  if (flags.professorNodeIntroDone) return false;
  const dx = position.x - nodeAnchor.x;
  const dy = position.y - nodeAnchor.y;
  return dx * dx + dy * dy <= proximityRadiusPx * proximityRadiusPx;
}
