import { beforeEach, describe, expect, it } from 'vitest';
import { eventBus, GameEvents } from '../core/EventBus';
import { gameState } from '../core/GameStateManager';
import { BitStage } from '../data/types';
import './ProgressionSystem';

describe('ProgressionSystem', () => {
  beforeEach(() => {
    gameState.resetState();
  });

  it('keeps the first Glitch encounter pending until the overworld can play it', () => {
    eventBus.emit(GameEvents.PUZZLE_COMPLETE, { puzzleId: 'p0_1' });

    expect(gameState.getFlag('puzzle_p0_1_complete')).toBe(true);
    expect(gameState.getFlag('glitch_encounter_1_pending')).toBe(true);
    expect(gameState.getFlag('glitch_encounter_1_done')).toBe(false);
  });

  it('opens the boss gate after both prologue lesson puzzles are complete', () => {
    eventBus.emit(GameEvents.PUZZLE_COMPLETE, { puzzleId: 'p0_1' });
    eventBus.emit(GameEvents.PUZZLE_COMPLETE, { puzzleId: 'p0_2' });

    expect(gameState.getFlag('boss_gate_open')).toBe(true);
  });

  it('opens the Array Plains gateway and queues the prologue return beats after the Sentinel', () => {
    eventBus.emit(GameEvents.PUZZLE_COMPLETE, { puzzleId: 'boss_sentinel' });

    expect(gameState.getFlag('gateway_open')).toBe(true);
    expect(gameState.getFlag('boss_return_cutscene_pending')).toBe(true);
    expect(gameState.getFlag('glitch_encounter_2_pending')).toBe(true);
    expect(gameState.getBitStage()).toBe(BitStage.BYTE);
    expect(gameState.isShardCollected('prologue_logic_shard')).toBe(true);
  });
});
