import { describe, expect, it } from 'vitest';
import {
  createPrologueStoryFlags,
  getPendingPrologueBeat,
  shouldTriggerWatcherAtPosition,
} from './prologueScriptState';

describe('prologueScriptState', () => {
  it('orders the remaining beats to match the Pokemon-style script', () => {
    expect(getPendingPrologueBeat(createPrologueStoryFlags())).toBe('opening_scene');

    expect(
      getPendingPrologueBeat(
        createPrologueStoryFlags({ openingSceneDone: true }),
      ),
    ).toBe('node_intro');

    expect(
      getPendingPrologueBeat(
        createPrologueStoryFlags({
          openingSceneDone: true,
          professorNodeIntroDone: true,
        }),
      ),
    ).toBe('watcher_warning');

    expect(
      getPendingPrologueBeat(
        createPrologueStoryFlags({
          openingSceneDone: true,
          professorNodeIntroDone: true,
          watcherWarningDone: true,
          puzzleP01Complete: true,
        }),
      ),
    ).toBe('glitch_intro');

    expect(
      getPendingPrologueBeat(
        createPrologueStoryFlags({
          openingSceneDone: true,
          professorNodeIntroDone: true,
          watcherWarningDone: true,
          puzzleP01Complete: true,
          glitchIntroDone: true,
          puzzleP02Complete: true,
        }),
      ),
    ).toBe('boss_gate_cutscene');

    expect(
      getPendingPrologueBeat(
        createPrologueStoryFlags({
          openingSceneDone: true,
          professorNodeIntroDone: true,
          watcherWarningDone: true,
          puzzleP01Complete: true,
          glitchIntroDone: true,
          puzzleP02Complete: true,
          bossGateCutsceneDone: true,
          puzzleBossSentinelComplete: true,
        }),
      ),
    ).toBe('boss_return_cutscene');
  });

  it('arms the watcher only after Node and only on the puzzle approach lanes', () => {
    const flags = createPrologueStoryFlags({
      openingSceneDone: true,
      professorNodeIntroDone: true,
    });

    expect(
      shouldTriggerWatcherAtPosition(flags, { x: 640, y: 400 }),
    ).toBe(false);

    expect(
      shouldTriggerWatcherAtPosition(flags, { x: 760, y: 300 }),
    ).toBe(true);

    expect(
      shouldTriggerWatcherAtPosition(
        createPrologueStoryFlags({
          openingSceneDone: true,
          professorNodeIntroDone: true,
          watcherWarningDone: true,
        }),
        { x: 760, y: 300 },
      ),
    ).toBe(false);
  });
});
