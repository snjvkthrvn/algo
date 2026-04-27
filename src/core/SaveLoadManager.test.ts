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
        'algorithmia_save_v1',
        expect.any(String)
      );
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
      localStorageMock.setItem('algorithmia_save_v1', 'not-json');
      const result = saveLoadManager.load();
      expect(result).toBe(false);
    });

    it('should return false for invalid save structure', () => {
      localStorageMock.setItem('algorithmia_save_v1', JSON.stringify({ invalid: true }));
      const result = saveLoadManager.load();
      expect(result).toBe(false);
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
});
