import { describe, expect, it } from 'vitest';
import {
  createPrologueStoryFlags,
  getPendingPrologueBeat,
  shouldTriggerNodeIntroAtPosition,
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

  it('arms the Node intro only when the player walks into hub proximity, after the opening cinematic', () => {
    const node = { x: 900, y: 395 };
    const radius = 96;

    // Before the opening cinematic completes, Node intro must not fire even if the player is at the hub.
    expect(
      shouldTriggerNodeIntroAtPosition(createPrologueStoryFlags(), node, node, radius),
    ).toBe(false);

    const opened = createPrologueStoryFlags({ openingSceneDone: true });

    // Player far from the hub: not yet armed.
    expect(
      shouldTriggerNodeIntroAtPosition(opened, { x: 320, y: 400 }, node, radius),
    ).toBe(false);

    // Player just outside the radius.
    expect(
      shouldTriggerNodeIntroAtPosition(opened, { x: node.x - radius - 1, y: node.y }, node, radius),
    ).toBe(false);

    // Player inside the radius: armed.
    expect(
      shouldTriggerNodeIntroAtPosition(opened, { x: node.x - radius + 4, y: node.y }, node, radius),
    ).toBe(true);

    // Once Node intro is done, proximity no longer arms it.
    expect(
      shouldTriggerNodeIntroAtPosition(
        createPrologueStoryFlags({ openingSceneDone: true, professorNodeIntroDone: true }),
        node,
        node,
        radius,
      ),
    ).toBe(false);
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

    // On the northern approach y band, but still inside Professor Node proximity:
    // must NOT arm yet (same-frame overlap after dialogue felt like a freeze).
    expect(
      shouldTriggerWatcherAtPosition(flags, { x: 900, y: 340 }),
    ).toBe(false);

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
