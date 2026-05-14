import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveLoadManager } from './SaveLoadManager';
import { gameState } from './GameStateManager';
import { eventBus } from './EventBus';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((_i: number) => null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('SaveLoadManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    gameState.resetState();
    eventBus.removeAllListeners();
  });

  describe('save', () => {
    it('should save game state to localStorage', () => {
      gameState.setFlag('test_flag', true);
      const result = saveLoadManager.save();

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'algorithmia_save_v2',
        expect.any(String)
      );
    });

    it('should write the current save schema version', () => {
      saveLoadManager.save();

      const savedJson = localStorageMock.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedJson);
      expect(parsed.saveVersion).toBe(2);
    });

    it('should serialize state as JSON', () => {
      gameState.setPlayerPosition(100, 200);
      saveLoadManager.save();

      const savedJson = localStorageMock.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedJson);
      expect(parsed.player.x).toBe(100);
      expect(parsed.player.y).toBe(200);
    });
  });

  describe('load', () => {
    it('should load state from localStorage', () => {
      // Save first
      gameState.setFlag('loaded_flag', true);
      gameState.setPlayerPosition(300, 400);
      saveLoadManager.save();

      // Reset state
      gameState.resetState();
      expect(gameState.getFlag('loaded_flag')).toBe(false);

      // Load
      const result = saveLoadManager.load();
      expect(result).toBe(true);
      expect(gameState.getFlag('loaded_flag')).toBe(true);
      expect(gameState.getState().player.x).toBe(300);
    });

    it('should return false when no save exists', () => {
      const result = saveLoadManager.load();
      expect(result).toBe(false);
    });

    it('should return false for invalid JSON', () => {
      localStorageMock.setItem('algorithmia_save_v2', 'not-json');
      const result = saveLoadManager.load();
      expect(result).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('algorithmia_save_v2');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('algorithmia_save_v1');
      expect(saveLoadManager.consumeRecoveryNotice()).toBe('CORRUPT SAVE CLEARED');
      expect(saveLoadManager.consumeRecoveryNotice()).toBeNull();
    });

    it('should return false for invalid save structure', () => {
      localStorageMock.setItem('algorithmia_save_v2', JSON.stringify({ invalid: true }));
      const result = saveLoadManager.load();
      expect(result).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('algorithmia_save_v2');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('algorithmia_save_v1');
    });

    it('should upgrade a legacy v1 save into the current schema', () => {
      localStorageMock.setItem('algorithmia_save_v1', JSON.stringify({
        player: { x: 512, y: 384, region: 'twin_rivers' },
        puzzleResults: {
          tr_1: { stars: 3, time: 18, attempts: 0, hintsUsed: 0 },
        },
        codexEntries: ['two_pointer_reverse'],
        settings: { musicVolume: 0.2, sfxVolume: 0.4, textSpeed: 30 },
        saveVersion: 1,
        playTime: 100,
      }));

      const result = saveLoadManager.load();

      expect(result).toBe(true);
      const state = gameState.getState();
      expect(state.saveVersion).toBe(2);
      expect(state.player.region).toBe('twin_rivers');
      expect(state.companion.stage).toBe('spark');
      expect(state.rival.encountered).toBe(false);
      expect(state.shardsCollected).toEqual([]);
      expect(state.flags).toEqual({});
      expect(state.npcStates).toEqual({});
      expect(state.codexEntries).toContain('two_pointer_reverse');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('algorithmia_save_v2', expect.any(String));
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('algorithmia_save_v1');
    });

    it('should backfill missing puzzle counters in old saves', () => {
      localStorageMock.setItem('algorithmia_save_v1', JSON.stringify({
        player: { x: 512, y: 384, region: 'array_plains' },
        puzzleResults: {
          ap_1: { stars: 3, time: 24 },
        },
        codexEntries: [],
        settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 45 },
        saveVersion: 1,
        playTime: 100,
      }));

      const result = saveLoadManager.load();

      expect(result).toBe(true);
      expect(gameState.getState().puzzleResults.ap_1).toEqual({
        stars: 3,
        time: 24,
        attempts: 0,
        hintsUsed: 0,
      });
    });

    it('should drop one malformed puzzle result instead of deleting the whole save', () => {
      localStorageMock.setItem('algorithmia_save_v1', JSON.stringify({
        player: { x: 512, y: 384, region: 'array_plains' },
        puzzleResults: {
          ap_1: { stars: 3, time: 24, attempts: 0, hintsUsed: 0 },
          ap_2: { stars: 2 },
        },
        codexEntries: ['bubble_sort'],
        flags: { beta_warning_seen: true },
        settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 45 },
        saveVersion: 1,
        playTime: 100,
      }));

      const result = saveLoadManager.load();

      expect(result).toBe(true);
      const state = gameState.getState();
      expect(state.puzzleResults.ap_1.stars).toBe(3);
      expect(state.puzzleResults.ap_2).toBeUndefined();
      expect(state.codexEntries).toContain('bubble_sort');
      expect(state.flags.beta_warning_seen).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('algorithmia_save_v1');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('algorithmia_save_v2', expect.any(String));
    });
  });

  describe('hasSave', () => {
    it('should return false when no save exists', () => {
      expect(saveLoadManager.hasSave()).toBe(false);
    });

    it('should return true after saving', () => {
      saveLoadManager.save();
      expect(saveLoadManager.hasSave()).toBe(true);
    });

    it('should return false for corrupt save data', () => {
      localStorageMock.setItem('algorithmia_save_v2', 'not-json');
      expect(saveLoadManager.hasSave()).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('algorithmia_save_v2');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('algorithmia_save_v1');
    });
  });

  describe('getSavedState', () => {
    it('should preview a valid save without loading it into active state', () => {
      gameState.setPlayerRegion('hash_highlands');
      gameState.setPlayerPosition(300, 400);
      saveLoadManager.save();

      gameState.resetState();

      const savedState = saveLoadManager.getSavedState();
      expect(savedState?.player.region).toBe('hash_highlands');
      expect(savedState?.player.x).toBe(300);
      expect(gameState.getState().player.region).toBe('prologue');
    });

    it('should return null for invalid save shapes', () => {
      localStorageMock.setItem('algorithmia_save_v1', JSON.stringify({ invalid: true }));
      expect(saveLoadManager.getSavedState()).toBeNull();
    });

    it('should backfill later-region gates from puzzle results in older saves', () => {
      const oldSave = {
        player: { x: 300, y: 400, region: 'twin_rivers' },
        companion: { stage: 'byte', mood: 'neutral' },
        rival: { encountered: true, encounterStage: 2 },
        shardsCollected: [],
        puzzleResults: {
          tr_1: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
          tr_2: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
          tr_3: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
          tr_4: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
          boss_mirror_serpent: { stars: 3, time: 60, attempts: 0, hintsUsed: 0 },
        },
        codexEntries: [],
        npcStates: {},
        flags: {},
        settings: { musicVolume: 0.5, sfxVolume: 0.5, textSpeed: 30 },
        saveVersion: 1,
        playTime: 0,
      };

      localStorageMock.setItem('algorithmia_save_v1', JSON.stringify(oldSave));

      const savedState = saveLoadManager.getSavedState();

      expect(savedState?.flags.mirror_serpent_gate_open).toBe(true);
      expect(savedState?.flags.hash_highlands_gateway_open).toBe(true);
    });

    it('should backfill Prologue gates from older save puzzle results', () => {
      const oldSave = {
        player: { x: 320, y: 400, region: 'prologue' },
        companion: { stage: 'spark', mood: 'neutral' },
        rival: { encountered: false, encounterStage: 0 },
        shardsCollected: [],
        puzzleResults: {
          p0_1: { stars: 3, time: 20, attempts: 0, hintsUsed: 0 },
          p0_2: { stars: 3, time: 20, attempts: 0, hintsUsed: 0 },
          boss_sentinel: { stars: 3, time: 45, attempts: 0, hintsUsed: 0 },
        },
        codexEntries: [],
        npcStates: {},
        flags: {},
        settings: { musicVolume: 0.5, sfxVolume: 0.5, textSpeed: 30 },
        saveVersion: 1,
        playTime: 0,
      };

      localStorageMock.setItem('algorithmia_save_v1', JSON.stringify(oldSave));

      const savedState = saveLoadManager.getSavedState();

      expect(savedState?.flags.boss_gate_open).toBe(true);
      expect(savedState?.flags.gateway_open).toBe(true);
    });

    it('should backfill Array Plains gates from older save puzzle results', () => {
      const oldSave = {
        player: { x: 560, y: 384, region: 'array_plains' },
        companion: { stage: 'byte', mood: 'neutral' },
        rival: { encountered: true, encounterStage: 2 },
        shardsCollected: [],
        puzzleResults: {
          ap_1: { stars: 3, time: 20, attempts: 0, hintsUsed: 0 },
          ap_2: { stars: 3, time: 20, attempts: 0, hintsUsed: 0 },
          ap_3: { stars: 3, time: 20, attempts: 0, hintsUsed: 0 },
          ap_4: { stars: 3, time: 20, attempts: 0, hintsUsed: 0 },
          boss_shuffler: { stars: 3, time: 60, attempts: 0, hintsUsed: 0 },
        },
        codexEntries: [],
        npcStates: {},
        flags: {},
        settings: { musicVolume: 0.5, sfxVolume: 0.5, textSpeed: 30 },
        saveVersion: 1,
        playTime: 0,
      };

      localStorageMock.setItem('algorithmia_save_v1', JSON.stringify(oldSave));

      const savedState = saveLoadManager.getSavedState();

      expect(savedState?.flags.shuffler_gate_open).toBe(true);
      expect(savedState?.flags.twin_rivers_gateway_open).toBe(true);
    });
  });

  describe('deleteSave', () => {
    it('should remove save from localStorage', () => {
      saveLoadManager.save();
      expect(saveLoadManager.hasSave()).toBe(true);

      saveLoadManager.deleteSave();
      expect(saveLoadManager.hasSave()).toBe(false);
    });
  });

  describe('round-trip', () => {
    it('should preserve full game state through save/load cycle', () => {
      // Set up complex state
      gameState.setPlayerPosition(500, 600);
      gameState.setPlayerRegion('array_plains');
      gameState.setPuzzleResult('p0_1', { stars: 3, time: 42, attempts: 0, hintsUsed: 0 });
      gameState.setPuzzleResult('p0_2', { stars: 2, time: 90, attempts: 2, hintsUsed: 1 });
      gameState.unlockCodexEntry('sequential_processing');
      gameState.unlockCodexEntry('key_value_mapping');
      gameState.setNPCState('rune_keeper', 'post_puzzle');
      gameState.setFlag('boss_gate_open', true);
      gameState.updateSettings({ musicVolume: 0.3, textSpeed: 60 });

      // Save
      saveLoadManager.save();

      // Reset
      gameState.resetState();

      // Load
      eventBus.removeAllListeners();
      saveLoadManager.load();

      // Verify
      const state = gameState.getState();
      expect(state.player.x).toBe(500);
      expect(state.player.y).toBe(600);
      expect(state.player.region).toBe('array_plains');
      expect(state.puzzleResults.p0_1.stars).toBe(3);
      expect(state.puzzleResults.p0_2.stars).toBe(2);
      expect(state.codexEntries).toContain('sequential_processing');
      expect(state.codexEntries).toContain('key_value_mapping');
      expect(state.npcStates.rune_keeper).toBe('post_puzzle');
      expect(state.flags.boss_gate_open).toBe(true);
      expect(state.settings.musicVolume).toBe(0.3);
      expect(state.settings.textSpeed).toBe(60);
    });
  });

  describe('autosave hooks', () => {
    it('should persist state-only changes like the beta gate warning flag', async () => {
      saveLoadManager.registerAutoSave();
      gameState.setPlayerLocation('twin_rivers', 192, 448);
      await Promise.resolve();
      localStorageMock.setItem.mockClear();

      gameState.setFlag('beta_warning_seen', true);
      await Promise.resolve();

      const lastSetItemCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1];
      const savedJson = lastSetItemCall?.[1];
      expect(savedJson).toBeDefined();
      const parsed = JSON.parse(savedJson as string);
      expect(parsed.player.region).toBe('twin_rivers');
      expect(parsed.flags.beta_warning_seen).toBe(true);
    });

    it('should save after puzzle-complete side effects finish', async () => {
      saveLoadManager.registerAutoSave();
      eventBus.on('puzzle:complete', () => {
        gameState.setFlag('progression_side_effect_done', true);
        gameState.unlockCodexEntry('side_effect_codex');
      });

      gameState.setPuzzleResult('tr_1', { stars: 3, time: 22, attempts: 0, hintsUsed: 0 });
      await Promise.resolve();

      const lastSetItemCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1];
      const savedJson = lastSetItemCall?.[1];
      expect(savedJson).toBeDefined();
      const parsed = JSON.parse(savedJson as string);
      expect(parsed.puzzleResults.tr_1.stars).toBe(3);
      expect(parsed.flags.progression_side_effect_done).toBe(true);
      expect(parsed.codexEntries).toContain('side_effect_codex');
    });
  });
});
