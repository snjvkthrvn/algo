import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameState } from './GameStateManager';
import { eventBus, GameEvents } from './EventBus';
import { BitStage, BitMood } from '../data/types';

describe('GameStateManager', () => {
  beforeEach(() => {
    gameState.resetState();
    eventBus.removeAllListeners();
  });

  describe('default state', () => {
    it('should have default player position', () => {
      const state = gameState.getState();
      expect(state.player.x).toBe(320);
      expect(state.player.y).toBe(400);
      expect(state.player.region).toBe('prologue');
    });

    it('should have empty puzzle results', () => {
      const state = gameState.getState();
      expect(Object.keys(state.puzzleResults)).toHaveLength(0);
    });

    it('should have empty codex entries', () => {
      const state = gameState.getState();
      expect(state.codexEntries).toHaveLength(0);
    });

    it('should have default settings', () => {
      const settings = gameState.getSettings();
      expect(settings.musicVolume).toBe(0.7);
      expect(settings.sfxVolume).toBe(0.8);
      expect(settings.textSpeed).toBe(30);
    });
  });

  describe('player position', () => {
    it('should update player position', () => {
      gameState.setPlayerPosition(100, 200);
      const state = gameState.getState();
      expect(state.player.x).toBe(100);
      expect(state.player.y).toBe(200);
    });

    it('should update player region and emit event', () => {
      const callback = vi.fn();
      eventBus.on(GameEvents.REGION_ENTER, callback);
      gameState.setPlayerRegion('array_plains');

      expect(gameState.getState().player.region).toBe('array_plains');
      expect(callback).toHaveBeenCalledWith({ regionId: 'array_plains' });
    });
  });

  describe('puzzle results', () => {
    it('should store puzzle result', () => {
      const result = { stars: 3, time: 45, attempts: 1, hintsUsed: 0 };
      gameState.setPuzzleResult('p0_1', result);

      expect(gameState.getPuzzleResult('p0_1')).toEqual(result);
      expect(gameState.isPuzzleCompleted('p0_1')).toBe(true);
    });

    it('should emit PUZZLE_COMPLETE event', () => {
      const callback = vi.fn();
      eventBus.on(GameEvents.PUZZLE_COMPLETE, callback);

      const result = { stars: 2, time: 60, attempts: 3, hintsUsed: 1 };
      gameState.setPuzzleResult('p0_2', result);

      expect(callback).toHaveBeenCalledWith({
        puzzleId: 'p0_2',
        stars: 2,
        time: 60,
        attempts: 3,
        hintsUsed: 1,
      });
    });

    it('should return undefined for uncompleted puzzle', () => {
      expect(gameState.getPuzzleResult('nonexistent')).toBeUndefined();
      expect(gameState.isPuzzleCompleted('nonexistent')).toBe(false);
    });
  });

  describe('codex entries', () => {
    it('should unlock codex entry', () => {
      gameState.unlockCodexEntry('sequential_processing');
      expect(gameState.isCodexUnlocked('sequential_processing')).toBe(true);
    });

    it('should emit CODEX_UNLOCK event', () => {
      const callback = vi.fn();
      eventBus.on(GameEvents.CODEX_UNLOCK, callback);
      gameState.unlockCodexEntry('key_value');

      expect(callback).toHaveBeenCalledWith({ entryId: 'key_value' });
    });

    it('should not duplicate codex entries', () => {
      const callback = vi.fn();
      eventBus.on(GameEvents.CODEX_UNLOCK, callback);

      gameState.unlockCodexEntry('test_entry');
      gameState.unlockCodexEntry('test_entry');

      expect(gameState.getState().codexEntries).toHaveLength(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should return false for locked entry', () => {
      expect(gameState.isCodexUnlocked('locked_entry')).toBe(false);
    });
  });

  describe('NPC states', () => {
    it('should set and get NPC state', () => {
      gameState.setNPCState('rune_keeper', 'post_puzzle');
      expect(gameState.getNPCState('rune_keeper')).toBe('post_puzzle');
    });

    it('should return idle for unknown NPC', () => {
      expect(gameState.getNPCState('unknown_npc')).toBe('idle');
    });
  });

  describe('flags', () => {
    it('should set and get flags', () => {
      gameState.setFlag('boss_gate_open', true);
      expect(gameState.getFlag('boss_gate_open')).toBe(true);
    });

    it('should default to false for unset flags', () => {
      expect(gameState.getFlag('unset_flag')).toBe(false);
    });

    it('should support setting flag to false', () => {
      gameState.setFlag('temp_flag', true);
      gameState.setFlag('temp_flag', false);
      expect(gameState.getFlag('temp_flag')).toBe(false);
    });
  });

  describe('settings', () => {
    it('should update partial settings', () => {
      gameState.updateSettings({ musicVolume: 0.5 });
      const settings = gameState.getSettings();
      expect(settings.musicVolume).toBe(0.5);
      expect(settings.sfxVolume).toBe(0.8); // unchanged
    });

    it('should emit STATE_CHANGED event on settings update', () => {
      const callback = vi.fn();
      eventBus.on(GameEvents.STATE_CHANGED, callback);
      gameState.updateSettings({ sfxVolume: 0.3 });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'settings' })
      );
    });
  });

  describe('state management', () => {
    it('should reset state to defaults', () => {
      gameState.setFlag('test', true);
      gameState.setPlayerPosition(999, 999);
      gameState.resetState();

      expect(gameState.getFlag('test')).toBe(false);
      expect(gameState.getState().player.x).toBe(320);
    });

    it('should load state from saved data', () => {
      const savedState = {
        player: { x: 200, y: 300, region: 'array_plains' },
        companion: { stage: BitStage.BYTE, mood: BitMood.EXCITED },
        rival: { encountered: true, encounterStage: 1 },
        shardsCollected: ['shard_p0_1'],
        puzzleResults: { p0_1: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 } },
        codexEntries: ['sequential_processing'],
        npcStates: { rune_keeper: 'post_puzzle' },
        flags: { boss_gate_open: true },
        settings: { musicVolume: 0.5, sfxVolume: 0.6, textSpeed: 50 },
        saveVersion: 1,
        playTime: 12000,
      };

      gameState.loadState(savedState);
      const state = gameState.getState();

      expect(state.player.x).toBe(200);
      expect(state.player.region).toBe('array_plains');
      expect(state.puzzleResults.p0_1.stars).toBe(3);
      expect(state.codexEntries).toContain('sequential_processing');
      expect(state.flags.boss_gate_open).toBe(true);
    });

    it('should return serializable state', () => {
      gameState.setFlag('test', true);
      const serialized = gameState.getSerializableState();

      expect(serialized.flags.test).toBe(true);
      expect(typeof serialized.playTime).toBe('number');
    });
  });
});
